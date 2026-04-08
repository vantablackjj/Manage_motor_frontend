import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Input, 
  Select, 
  Row, 
  Col, 
  Typography, 
  message,
  Tag,
  Space,
  Button,
  Card,
  Statistic
} from 'antd';
import { Search, Box, Layers, Download, RotateCcw, FileStack } from 'lucide-react';
import api from '../../utils/api';
import ImportExcelModal from '../../components/ImportExcelModal';

const { Text, Title } = Typography;

const PartInventoryPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    warehouse_id: null,
    search: ''
  });
  
  const [warehouses, setWarehouses] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, whRes] = await Promise.all([
        api.get('/part-inventory', { params: filters }),
        api.get('/warehouses')
      ]);
      setData(invRes.data);
      setWarehouses(whRes.data);
    } catch (error) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.warehouse_id]);

  const handleSearch = () => fetchData();

  const columns = [
    { 
        title: 'Mã PT (SKU)', 
        dataIndex: ['Part', 'code'], 
        key: 'code',
        render: (text, record) => (
            <Space direction="vertical" size={0}>
                <Text strong>{text}</Text>
                <Tag color={record.Part.code_type === 'HONDA' ? 'orange' : 'cyan'} style={{ fontSize: '10px' }}>
                    {record.Part.code_type === 'HONDA' ? 'Honda' : 'Tự tạo'}
                </Tag>
            </Space>
        )
    },
    { 
        title: 'Tên phụ tùng', 
        dataIndex: ['Part', 'name'], 
        key: 'name' 
    },
    { 
        title: 'Đơn vị lẻ', 
        dataIndex: ['Part', 'unit'], 
        key: 'unit' 
    },
    { 
        title: 'Kho', 
        dataIndex: ['Warehouse', 'warehouse_name'], 
        key: 'warehouse' 
    },
    { 
        title: 'Vị trí', 
        dataIndex: 'location', 
        key: 'location',
        render: (text) => text || <Text type="secondary" italic>Chờ cập nhật</Text>
    },
    { 
        title: 'Số lượng tồn (Lẻ)', 
        dataIndex: 'quantity', 
        key: 'quantity',
        render: (v) => (
            <Text strong style={{ color: Number(v) <= 5 ? '#ef4444' : '#10b981', fontSize: 16 }}>
                {Number(v).toLocaleString()}
            </Text>
        )
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} className="gradient-text" style={{ margin: 0 }}>TỒN KHO PHỤ TÙNG</Title>
          <p style={{ color: 'var(--text-secondary)' }}>Theo dõi số lượng linh kiện thực tế tại các kho.</p>
        </div>
        <Space>
            <Button 
                icon={<FileStack size={16} />} 
                onClick={() => setIsImportModalOpen(true)}
                style={{ display: 'flex', alignItems: 'center' }}
            >
                Nhập tồn từ Excel
            </Button>
            <Button icon={<Download size={16} />} ghost type="primary">Xuất báo cáo</Button>
            <Button icon={<RotateCcw size={16} />} onClick={fetchData}>Làm mới</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
            <Card className="glass-card" bodyStyle={{ padding: 16 }}>
                <Statistic 
                    title="Tổng số mặt hàng" 
                    value={data.length} 
                    prefix={<Box size={18} style={{ marginRight: 8, color: 'var(--primary-color)' }} />} 
                />
            </Card>
        </Col>
        <Col span={6}>
            <Card className="glass-card" bodyStyle={{ padding: 16 }}>
                <Statistic 
                    title="Hết hàng / Sắp hết" 
                    value={data.filter(i => i.quantity <= 5).length} 
                    valueStyle={{ color: '#ef4444' }}
                    prefix={<Layers size={18} style={{ marginRight: 8 }} />} 
                />
            </Card>
        </Col>
      </Row>

      <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
        <Row gutter={16}>
            <Col xs={24} md={12}>
                <Input 
                    placeholder="Tìm theo Mã hoặc Tên phụ tùng..." 
                    prefix={<Search size={16} />} 
                    size="large"
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    onPressEnter={handleSearch}
                />
            </Col>
            <Col xs={24} md={8}>
                <Select 
                    placeholder="Lọc theo kho" 
                    style={{ width: '100%' }} 
                    size="large"
                    allowClear
                    onChange={(v) => setFilters({...filters, warehouse_id: v})}
                >
                    {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                </Select>
            </Col>
            <Col xs={24} md={4}>
                <Button type="primary" size="large" block icon={<Search size={16} />} onClick={handleSearch}>
                    Tìm kiếm
                </Button>
            </Col>
        </Row>
      </div>

      <Table 
        dataSource={data.filter(i => 
            i.Part.code.toLowerCase().includes(filters.search.toLowerCase()) || 
            i.Part.name.toLowerCase().includes(filters.search.toLowerCase())
        )} 
        columns={columns} 
        rowKey="id" 
        loading={loading}
        className="modern-table"
        pagination={{ pageSize: 12 }}
      />

      <ImportExcelModal 
        visible={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onSuccess={() => {
            fetchData();
            setIsImportModalOpen(false);
        }}
        type="part_inventory"
        title="Nhập số lượng tồn kho phụ tùng"
      />
    </div>
  );
};

export default PartInventoryPage;
