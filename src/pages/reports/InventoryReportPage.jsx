import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Select, 
  Space, 
  Typography, 
  Button, 
  Tag,
  Divider,
  Spin,
  message
} from 'antd';
import { 
  Package, 
  DollarSign, 
  Truck, 
  Warehouse, 
  Search, 
  Download, 
  Filter,
  BarChart3,
  Calendar,
  AlertCircle,
  Printer
} from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text } = Typography;
const { Option } = Select;

const InventoryReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({ summary: {}, vehicles: [] });
  const [filters, setFilters] = useState({
    warehouse_id: undefined,
    type_id: undefined,
    color_id: undefined
  });
  
  const [options, setOptions] = useState({ warehouses: [], types: [], colors: [] });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    fetchOptions();
    fetchReport();
  }, []);

  const fetchOptions = async () => {
    try {
      const [wRes, tRes, cRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/vehicle-types'),
        api.get('/colors')
      ]);
      setOptions({
        warehouses: wRes.data,
        types: tRes.data,
        colors: cRes.data
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const response = await api.get('/reports/inventory', { params: currentFilters });
      setReportData(response.data);
    } catch (error) {
      message.error('Không thể tải báo cáo tồn kho');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchReport(newFilters);
  };

  const handleExport = () => {
    if (!reportData.vehicles || reportData.vehicles.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = reportData.vehicles.map(v => ({
      'Kho': v.Warehouse?.warehouse_name || 'N/A',
      'Chủ hàng': v.Purchase?.Supplier?.name || 'N/A',
      'Loại xe': v.VehicleType?.name || 'N/A',
      'Màu xe': v.VehicleColor?.color_name || 'N/A',
      'Số máy': v.engine_no,
      'Số khung': v.chassis_no,
      'Giá nhập': Number(v.price_vnd),
      'Trạng thái': v.status === 'In Stock' ? 'Sẵn sàng' : 'Đang chuyển',
      'Đang khóa': v.is_locked ? 'Có' : 'Không',
      'Ngày nhập': dayjs(v.createdAt).format('DD/MM/YYYY')
    }));

    exportToExcel(exportData, `BaoCaoTonKho_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const handlePrint = () => {
    if (!reportData.vehicles || reportData.vehicles.length === 0) {
        return message.warning('Không có dữ liệu để in!');
    }

    const warehouseName = filters.warehouse_id ? options.warehouses.find(w => w.id === filters.warehouse_id)?.warehouse_name : 'Tất cả các kho';

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Báo cáo tồn kho</title>
    <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.4; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .company-name { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
        .report-title { font-size: 22pt; font-weight: bold; margin: 15px 0; color: #000; }
        .report-subtitle { font-size: 12pt; font-style: italic; }
        .summary-box { display: flex; justify-content: space-around; margin-bottom: 25px; background: #f9f9f9; padding: 15px; border: 1px solid #ddd; }
        .summary-item { text-align: center; }
        .summary-label { font-size: 9pt; color: #666; margin-bottom: 5px; }
        .summary-value { font-size: 12pt; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; }
        th { background-color: #eee; font-weight: bold; text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
        .signature-box { width: 250px; }
        .signature-title { font-weight: bold; margin-bottom: 60px; }
        @media print {
            @page { margin: 15mm; size: A4 portrait; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">HỆ THỐNG CỬA HÀNG XE MÁY THANH HẢI</div>
        <div class="report-title">BÁO CÁO TỒN KHO CHI TIẾT</div>
        <div class="report-subtitle">Ngày lập: ${dayjs().format('DD/MM/YYYY HH:mm')} | Kho: ${warehouseName}</div>
    </div>

    <div class="summary-box">
        <div class="summary-item">
            <div class="summary-label">TỔNG SỐ LƯỢNG</div>
            <div class="summary-value">${reportData.summary.total_count} chiếc</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">TỔNG GIÁ TRỊ VỐN</div>
            <div class="summary-value">${Number(reportData.summary.total_value).toLocaleString()} đ</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">SẴN SÀNG</div>
            <div class="summary-value">${reportData.summary.available_count} xe</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">ĐANG CHUYỂN</div>
            <div class="summary-value">${reportData.summary.transferring_count} xe</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 40px;">STT</th>
                <th>Kho</th>
                <th>Chủ hàng</th>
                <th>Loại xe</th>
                <th>Màu xe</th>
                <th>Số máy</th>
                <th>Số khung</th>
                <th>Giá nhập</th>
                <th>Ngày nhập</th>
            </tr>
        </thead>
        <tbody>
            ${reportData.vehicles.map((v, index) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${v.Warehouse?.warehouse_name || 'N/A'}</td>
                    <td>${v.Purchase?.Supplier?.name || 'N/A'}</td>
                    <td>${v.VehicleType?.name || 'N/A'}</td>
                    <td>${v.VehicleColor?.color_name || 'N/A'}</td>
                    <td>${v.engine_no}</td>
                    <td>${v.chassis_no}</td>
                    <td class="text-right">${Number(v.price_vnd).toLocaleString()}</td>
                    <td class="text-center">${dayjs(v.createdAt).format('DD/MM/YYYY')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer" style="margin-top: 50px;">
        <div class="signature-box">
            <div class="signature-title">Người lập báo cáo</div>
            <div>(Ký và ghi rõ họ tên)</div>
        </div>
        <div class="signature-box">
            <div class="signature-title">Thủ kho</div>
            <div>(Ký và ghi rõ họ tên)</div>
        </div>
        <div class="signature-box">
            <div>Ngày ....... tháng ....... năm .......</div>
            <div class="signature-title">Xác nhận của Giám đốc</div>
            <div>(Ký tên và đóng dấu)</div>
        </div>
    </div>

    <script>
        window.onload = function() { window.print(); };
        window.onafterprint = function() { window.close(); };
    </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    } else {
        message.warning('Vui lòng cho phép pop-up để in báo cáo.');
    }
  };

  const columns = [
    { title: 'Tên Kho', dataIndex: ['Warehouse', 'warehouse_name'], key: 'warehouse', render: v => <Tag color="blue">{v || 'N/A'}</Tag>, responsive: ['md'] },
    { title: 'Chủ Hàng', dataIndex: ['Purchase', 'Supplier', 'name'], key: 'supplier', render: v => <Text type="secondary">{v || 'N/A'}</Text> },
    { title: 'Loại Xe', dataIndex: ['VehicleType', 'name'], key: 'type', render: v => <Text strong>{v}</Text> },
    { title: 'Màu Xe', dataIndex: ['VehicleColor', 'color_name'], key: 'color' },
    { title: 'Số Máy', dataIndex: 'engine_no', key: 'engine', render: v => <Text code>{v}</Text> },
    { title: 'Số Khung', dataIndex: 'chassis_no', key: 'chassis', render: v => <Text code>{v}</Text> },
    { 
        title: 'Giá Nhập (đ)', 
        dataIndex: 'price_vnd', 
        key: 'price', 
        align: 'right',
        render: v => <Text strong color="#10b981">{Number(v || 0).toLocaleString()} đ</Text>,
        responsive: ['lg']
    },
    { 
        title: 'Trạng thái', 
        dataIndex: 'status', 
        key: 'status',
        render: (v, r) => (
            <Space>
                <Tag color={v === 'In Stock' ? 'success' : 'processing'}>{v === 'In Stock' ? 'Sẵn sàng' : 'Đang chuyển'}</Tag>
                {r.is_locked && <Tag color="error">ĐANG KHÓA</Tag>}
            </Space>
        )
    },
    { 
        title: 'Thời gian nhập', 
        dataIndex: 'createdAt', 
        key: 'age',
        render: d => {
            const days = dayjs().diff(dayjs(d), 'day');
            return <div style={{ fontSize: 12, opacity: 0.7 }}>{dayjs(d).format('DD/MM/YYYY')} <br/> ({days} ngày)</div>;
        },
        responsive: ['xl']
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="gradient-text">BÁO CÁO TỒN KHO</Title>
        <Space>
          <Button 
            icon={<Printer size={16} />} 
            onClick={handlePrint}
            type="dashed"
          >
            In báo cáo
          </Button>
          <Button 
            icon={<Download size={18} />} 
            type="primary" 
            ghost
            onClick={handleExport}
          >
            Xuất Excel
          </Button>
        </Space>
      </div>

      {/* DASHBOARDS */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <Statistic 
              title={<Space><Package size={16} /> Tổng số lượng xe</Space>}
              value={reportData.summary.total_count || 0}
              suffix="chiếc"
              prefix={<BarChart3 size={24} style={{ marginRight: 8, opacity: 0.5 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
            <Statistic 
              title={<Space><DollarSign size={16} /> Tổng giá trị vốn</Space>}
              value={reportData.summary.total_value || 0}
              suffix="đ"
              formatter={v => Number(v).toLocaleString()}
              prefix={<DollarSign size={24} style={{ marginRight: 8, opacity: 0.5 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <Statistic 
              title={<Space><Warehouse size={16} /> Đang có tại kho</Space>}
              value={reportData.summary.available_count || 0}
              suffix="xe"
              valueStyle={{ color: '#10b981' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <Statistic 
              title={<Space><Truck size={16} /> Đang chuyển chi nhánh</Space>}
              value={reportData.summary.transferring_count || 0}
              suffix="xe"
              valueStyle={{ color: '#3b82f6' }}
            />
          </Card>
        </Col>
      </Row>

      {/* FILTERS */}
      <Card className="glass-card" style={{ marginBottom: 24 }} styles={{ body: { padding: '16px' } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={1}>
             <Filter size={20} opacity={0.5} />
          </Col>
          <Col xs={24} md={7}>
            <Select 
              allowClear 
              style={{ width: '100%' }} 
              placeholder="--- Tất cả các kho ---" 
              size="large"
              defaultValue={isAdmin ? undefined : user.warehouse_id}
              onChange={v => handleFilterChange('warehouse_id', v)}
            >
              {options.warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={isAdmin ? 8 : 11}>
            <Select 
              allowClear 
              showSearch 
              style={{ width: '100%' }} 
              placeholder="--- Tất cả loại xe ---" 
              size="large"
              onChange={v => handleFilterChange('type_id', v)}
            >
                {options.types.map(t => <Option key={t.id} value={t.id}>{t.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={isAdmin ? 8 : 12}>
            <Select 
              allowClear 
              showSearch 
              style={{ width: '100%' }} 
              placeholder="--- Tất cả màu xe ---" 
              size="large"
              onChange={v => handleFilterChange('color_id', v)}
            >
                {options.colors.map(c => <Option key={c.id} value={c.id}>{c.color_name}</Option>)}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* LIST TABLE */}
      <Card className="glass-card">
        <Table 
          dataSource={reportData.vehicles} 
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          size="middle"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <style>{`
        .stat-card .ant-statistic-title {
            font-size: 11px !important;
            margin-bottom: 4px !important;
            opacity: 0.8;
        }
        .stat-card .ant-statistic-content-value {
            font-size: 20px !important;
            font-weight: 800 !important;
        }
        @media (max-width: 768px) {
            .stat-card {
                margin-bottom: 0 !important;
            }
        }
      `}</style>
    </div>
  );
};

export default InventoryReportPage;
