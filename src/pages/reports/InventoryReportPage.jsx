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
  AlertCircle
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

  const columns = [
    { title: 'Tên Kho', dataIndex: ['Warehouse', 'warehouse_name'], key: 'warehouse', render: v => <Tag color="blue">{v || 'N/A'}</Tag>, responsive: ['md'] },
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
        <Button 
          icon={<Download size={18} />} 
          type="primary" 
          ghost
          onClick={handleExport}
        >
          Xuất Excel
        </Button>
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
