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
  Input,
  message
} from 'antd';
import { 
  Package, 
  DollarSign, 
  Warehouse, 
  Search, 
  Download, 
  Filter,
  BarChart3,
  Printer
} from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text } = Typography;
const { Option } = Select;

const PartInventoryReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({ summary: {}, inventory: [] });
  const [filters, setFilters] = useState({
    warehouse_id: undefined,
    query: ''
  });
  
  const [warehouses, setWarehouses] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const isManager = user.role === 'MANAGER';
  const isPowerUser = isAdmin || isManager;

  useEffect(() => {
    fetchWarehouses();
    fetchReport();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const response = await api.get('/reports/parts/inventory', { params: currentFilters });
      setReportData(response.data);
    } catch (error) {
      message.error('Không thể tải báo cáo tồn kho phụ tùng');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    if (key === 'warehouse_id') {
        fetchReport(newFilters);
    }
  };

  const onSearch = () => {
    fetchReport();
  };

  const handleExport = () => {
    if (!reportData.inventory || reportData.inventory.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = reportData.inventory.map(item => ({
      'Mã phụ tùng': item.Part?.code,
      'Tên phụ tùng': item.Part?.name,
      'Đơn vị': item.Part?.unit || 'Cái',
      'Số lượng tồn': Number(item.quantity),
      'Giá nhập (đ)': Number(item.Part?.purchase_price || 0),
      'Thành tiền (đ)': Number(item.quantity) * Number(item.Part?.purchase_price || 0),
      'Kho': item.Warehouse?.warehouse_name || 'N/A',
      'Vị trí': item.location || ''
    }));

    exportToExcel(exportData, `BaoCaoTonKhoPhuTung_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const columns = [
    { title: 'Mã Phụ Tùng', dataIndex: ['Part', 'code'], key: 'code', render: v => <Text strong>{v}</Text> },
    { title: 'Tên Phụ Tùng', dataIndex: ['Part', 'name'], key: 'name' },
    { title: 'ĐVT', dataIndex: ['Part', 'unit'], key: 'unit', render: v => <Tag>{v || 'Cái'}</Tag> },
    { 
        title: 'SL Tồn', 
        dataIndex: 'quantity', 
        key: 'quantity', 
        align: 'right',
        render: v => <Text strong style={{ color: Number(v) <= 5 ? '#ef4444' : 'inherit' }}>{Number(v).toLocaleString()}</Text>
    },
    { 
        title: 'Giá Nhập (đ)', 
        dataIndex: ['Part', 'purchase_price'], 
        key: 'price', 
        align: 'right',
        render: v => <Text>{Number(v || 0).toLocaleString()}</Text>
    },
    { 
        title: 'Thành Tiền', 
        key: 'total', 
        align: 'right',
        render: (_, r) => <Text strong>{(Number(r.quantity) * Number(r.Part?.purchase_price || 0)).toLocaleString()} đ</Text>
    },
    { title: 'Kho', dataIndex: ['Warehouse', 'warehouse_name'], key: 'warehouse' },
    { title: 'Vị trí', dataIndex: 'location', key: 'location' }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="gradient-text">BÁO CÁO TỒN KHO PHỤ TÙNG</Title>
        <Space>
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

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <Statistic 
              title="Tổng số mã linh kiện"
              value={reportData.summary.total_items || 0}
              prefix={<Package size={20} style={{ opacity: 0.5, marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
            <Statistic 
              title="Tổng số lượng tồn"
              value={reportData.summary.total_quantity || 0}
              prefix={<BarChart3 size={20} style={{ opacity: 0.5, marginRight: 8 }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <Statistic 
              title="Tổng giá trị tồn kho"
              value={reportData.summary.total_value || 0}
              suffix="đ"
              formatter={v => Number(v).toLocaleString()}
              prefix={<DollarSign size={20} style={{ opacity: 0.5, marginRight: 8 }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="glass-card" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Select 
              allowClear={true}
              style={{ width: '100%' }} 
              placeholder="Chọn kho để xem tồn"
              size="large"
              value={filters.warehouse_id}
              onChange={v => handleFilterChange('warehouse_id', v)}
            >
              {warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={12}>
            <Input 
              placeholder="Tìm theo Mã hoặc Tên phụ tùng..." 
              size="large"
              prefix={<Search size={18} style={{ opacity: 0.5 }} />}
              value={filters.query}
              onChange={e => handleFilterChange('query', e.target.value)}
              onPressEnter={onSearch}
            />
          </Col>
          <Col xs={24} md={4}>
            <Button type="primary" size="large" block icon={<Search size={18} />} onClick={onSearch}>
              Tìm kiếm
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="glass-card">
        <Table 
          dataSource={reportData.inventory} 
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default PartInventoryReportPage;
