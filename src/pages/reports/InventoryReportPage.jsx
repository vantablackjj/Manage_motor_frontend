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
  message,
  Tabs,
  Badge
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
const { TabPane } = Tabs;

const InventoryReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({ summary: {}, vehicles: [] });
  const [filters, setFilters] = useState({
    warehouse_id: undefined,
    type_id: undefined,
    color_id: undefined
  });
  
  const [options, setOptions] = useState({ warehouses: [], types: [], colors: [] });
  const [activeTab, setActiveTab] = useState('summary');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const isManager = user.role === 'MANAGER';
  const isPowerUser = isAdmin || isManager;
  const allowedWarehouseIds = [user.warehouse_id, ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])].filter(Boolean);

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
      const filteredWH = wRes.data;
      setOptions({
        warehouses: filteredWH,
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
      'Ngày nhập': dayjs(v.Purchase?.purchase_date || v.createdAt).format('DD/MM/YYYY')
    }));

    exportToExcel(exportData, `BaoCaoTonKho_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const handlePrint = () => {
    let dataToPrint = reportData.vehicles;
    let reportTitle = "BÁO CÁO TỒN KHO CHI TIẾT";
    let isWarningReport = activeTab === 'warning';

    if (isWarningReport) {
        dataToPrint = warningVehicles;
        reportTitle = "BÁO CÁO CẢNH BÁO TỒN KHO (LÂU NGÀY)";
    }

    if (!dataToPrint || dataToPrint.length === 0) {
        return message.warning('Không có dữ liệu để in!');
    }

    const warehouseName = filters.warehouse_id ? options.warehouses.find(w => w.id === filters.warehouse_id)?.warehouse_name : 'Tất cả các kho';

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${reportTitle}</title>
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
        .urgent-text { color: #ef4444; font-weight: bold; }
        .warning-text { color: #f59e0b; font-weight: bold; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
        .signature-box { width: 250px; }
        .signature-title { font-weight: bold; margin-bottom: 60px; }
        @media print {
            @page { margin: 10mm; size: A4 landscape; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">HỆ THỐNG CỬA HÀNG XE MÁY THANH HẢI</div>
        <div class="report-title">${reportTitle}</div>
        <div class="report-subtitle">Ngày lập: ${dayjs().format('DD/MM/YYYY HH:mm')} | Kho: ${warehouseName}</div>
    </div>

    <div class="summary-box">
        <div class="summary-item">
            <div class="summary-label">SỐ LƯỢNG XE TRONG DANH SÁCH</div>
            <div class="summary-value">${dataToPrint.length} chiếc</div>
        </div>
        ${!isWarningReport ? `
        <div class="summary-item">
            <div class="summary-label">TỔNG GIÁ TRỊ VỐN</div>
            <div class="summary-value">${Number(dataToPrint.reduce((s,v) => s + Number(v.price_vnd || 0), 0)).toLocaleString()} đ</div>
        </div>
        ` : ''}
        <div class="summary-item">
            <div class="summary-label">TRẠNG THÁI</div>
            <div class="summary-value">${isWarningReport ? 'CẢNH BÁO TỒN LÂU' : 'TỒN KHO CHI TIẾT'}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 30px;">STT</th>
                <th>Kho</th>
                <th>Loại xe</th>
                <th>Màu xe</th>
                <th style="width: 80px;">Số máy</th>
                <th style="width: 100px;">Số khung</th>
                ${isWarningReport ? '<th>Số ngày tồn</th>' : ''}
                <th>Giá nhập</th>
                <th>Ngày nhập</th>
            </tr>
        </thead>
        <tbody>
            ${dataToPrint.map((v, index) => {
                const date = v.Purchase?.purchase_date || v.createdAt;
                const days = isWarningReport ? v.inventoryDays : 0;
                const dayClass = days >= 120 ? 'urgent-text' : (days >= 40 ? 'warning-text' : '');
                
                return `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>${v.Warehouse?.warehouse_name || 'N/A'}</td>
                    <td>${v.VehicleType?.name || 'N/A'}</td>
                    <td>${v.VehicleColor?.color_name || 'N/A'}</td>
                    <td><b>${v.engine_no}</b></td>
                    <td><b>${v.chassis_no}</b></td>
                    ${isWarningReport ? `<td class="text-center ${dayClass}">${days} ngày</td>` : ''}
                    <td class="text-right">${Number(v.price_vnd).toLocaleString()}</td>
                    <td class="text-center">${dayjs(date).format('DD/MM/YYYY')}</td>
                </tr>
                `;
            }).join('')}
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
        render: (_, v) => {
            const date = v.Purchase?.purchase_date || v.createdAt;
            const dayjsDate = dayjs(date);
            
            // Check for invalid dates or epoch fallbacks (1970)
            if (!date || !dayjsDate.isValid() || dayjsDate.year() < 2010) {
                return (
                    <div style={{ fontSize: 12, opacity: 0.5 }}>
                        <Tag color="default">Chưa cập nhật</Tag>
                    </div>
                );
            }

            const diff = dayjs().startOf('day').diff(dayjsDate.startOf('day'), 'day');
            return (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {dayjsDate.format('DD/MM/YYYY')} 
                    <br/> 
                    <span style={{ color: diff < 0 ? '#ef4444' : 'inherit' }}>
                        ({diff >= 0 ? `${diff} ngày` : 'Ngày ở tương lai'})
                    </span>
                </div>
            );
        },
        responsive: ['xl']
    }
  ];

  const typeColumns = [
    { 
        title: 'Loại Xe', 
        dataIndex: 'name', 
        key: 'name', 
        render: v => <Text strong>{v}</Text>,
        sorter: (a, b) => a.name.localeCompare(b.name)
    },
    { 
        title: 'Số lượng tồn', 
        dataIndex: 'count', 
        key: 'count', 
        align: 'center',
        sorter: (a, b) => a.count - b.count,
        render: v => <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>{v} xe</Tag>
    },
    { 
        title: 'Tổng giá trị vốn (đ)', 
        dataIndex: 'value', 
        key: 'value', 
        align: 'right',
        sorter: (a, b) => a.value - b.value,
        render: v => <Text strong>{Number(v).toLocaleString()} đ</Text>
    },
    { 
        title: 'Giá vốn bình quân', 
        key: 'avg', 
        align: 'right',
        render: (_, r) => <Text type="secondary">{(r.value / r.count).toLocaleString()} đ</Text>
    }
  ];

  const warningVehicles = reportData.vehicles
    .map(v => {
        const date = v.Purchase?.purchase_date || v.createdAt;
        const dayjsDate = dayjs(date);
        const diff = dayjsDate.isValid() && dayjsDate.year() >= 2010 
            ? dayjs().startOf('day').diff(dayjsDate.startOf('day'), 'day') 
            : 0;
        return { ...v, inventoryDays: diff };
    })
    .filter(v => v.inventoryDays >= 40 && v.status === 'In Stock')
    .sort((a, b) => b.inventoryDays - a.inventoryDays);

  const warningColumns = [
    ...columns.filter(c => c.key !== 'status' && c.key !== 'age'),
    {
        title: 'Số ngày tồn',
        dataIndex: 'inventoryDays',
        key: 'inventoryDays',
        sorter: (a, b) => a.inventoryDays - b.inventoryDays,
        render: (days) => (
            <Space direction="vertical" size={0}>
                <Text strong style={{ color: days >= 120 ? '#ef4444' : '#f59e0b', fontSize: 16 }}>
                    {days} ngày
                </Text>
                <Tag color={days >= 120 ? 'error' : 'warning'}>
                    {days >= 120 ? 'XỬ LÝ NGAY' : 'CẢNH BÁO'}
                </Tag>
            </Space>
        )
    },
    {
        title: 'Ngày nhập',
        key: 'entryDate',
        render: (_, v) => {
            const date = v.Purchase?.purchase_date || v.createdAt;
            return dayjs(date).format('DD/MM/YYYY');
        }
    }
  ];

  const summarizedData = Object.values(
    reportData.vehicles.reduce((acc, v) => {
        const typeName = v.VehicleType?.name || 'N/A';
        if (!acc[typeName]) acc[typeName] = { key: typeName, name: typeName, count: 0, value: 0 };
        acc[typeName].count++;
        acc[typeName].value += Number(v.price_vnd || 0);
        return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

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
              allowClear={true} 
              style={{ width: '100%' }} 
              placeholder="Chọn kho để xem tồn" 
              size="large"
              value={filters.warehouse_id}
              onChange={v => handleFilterChange('warehouse_id', v)}
            >
              {options.warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={isPowerUser ? 8 : 11}>
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
          <Col xs={24} md={isPowerUser ? 8 : 12}>
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
      <Card className="glass-card" styles={{ body: { padding: '0px' } }}>
        <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            className="inventory-tabs"
            style={{ padding: '0 16px' }}
        >
            <TabPane 
                tab={
                    <Space>
                        <BarChart3 size={16} style={{ marginBottom: -3 }} /> 
                        Tổng hợp theo loại xe
                        <Badge count={summarizedData.length} overflowCount={999} style={{ backgroundColor: '#3b82f6' }} />
                    </Space>
                } 
                key="summary"
            >
                <div style={{ padding: '16px 0' }}>
                    <Table 
                        dataSource={summarizedData} 
                        columns={typeColumns} 
                        rowKey="key" 
                        loading={loading}
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                        size="middle"
                        summary={pageData => {
                            let totalCount = 0;
                            let totalValue = 0;
                            pageData.forEach(({ count, value }) => {
                                totalCount += count;
                                totalValue += value;
                            });
                            return (
                                <Table.Summary fixed>
                                    <Table.Summary.Row style={{ background: '#fafafa', fontWeight: 'bold' }}>
                                        <Table.Summary.Cell index={0}>TỔNG CỘNG</Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="center">
                                            <Text type="danger">{totalCount} xe</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={2} align="right">
                                            <Text type="danger">{totalValue.toLocaleString()} đ</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={3} />
                                    </Table.Summary.Row>
                                </Table.Summary>
                            );
                        }}
                    />
                </div>
            </TabPane>
            <TabPane 
                tab={
                    <Space>
                        <Package size={16} style={{ marginBottom: -3 }} /> 
                        Chi tiết từng xe
                        <Badge count={reportData.vehicles.length} overflowCount={9999} showZero color="#10b981" />
                    </Space>
                } 
                key="detailed"
            >
                <div style={{ padding: '16px 0' }}>
                    <Table 
                        dataSource={reportData.vehicles} 
                        columns={columns} 
                        rowKey="id" 
                        loading={loading}
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </TabPane>
            <TabPane 
                tab={
                    <Space>
                        <AlertCircle size={16} style={{ marginBottom: -3 }} color={warningVehicles.length > 0 ? "#ef4444" : "inherit"} /> 
                        Cảnh báo tồn kho
                        <Badge count={warningVehicles.length} overflowCount={99} style={{ backgroundColor: '#ef4444' }} />
                    </Space>
                } 
                key="warning"
            >
                <div style={{ padding: '16px 0' }}>
                    <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8 }}>
                        <Space>
                            <AlertCircle size={20} color="#e53e3e" />
                            <Text strong style={{ color: '#c53030' }}>
                                Danh sách xe tồn kho trên 40 ngày. Ưu tiên giải phóng xe tồn trên 120 ngày (đỏ).
                            </Text>
                        </Space>
                    </div>
                    <Table 
                        dataSource={warningVehicles} 
                        columns={warningColumns} 
                        rowKey="id" 
                        loading={loading}
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                        size="middle"
                        scroll={{ x: 'max-content' }}
                        rowClassName={(record) => record.inventoryDays >= 120 ? 'urgent-row' : ''}
                    />
                </div>
            </TabPane>
        </Tabs>
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
        .inventory-tabs .ant-tabs-nav {
            margin-bottom: 0 !important;
        }
        .inventory-tabs .ant-tabs-tab {
            padding: 12px 16px !important;
        }
        .urgent-row {
            background-color: #fff5f5;
        }
        .urgent-row:hover td {
            background-color: #fed7d7 !important;
        }
      `}</style>
    </div>
  );
};

export default InventoryReportPage;
