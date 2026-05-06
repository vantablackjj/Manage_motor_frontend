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
  Statistic,
  Badge,
  Tooltip
} from 'antd';
import { Search, MapPin, Box, Layers, RotateCcw, AlertCircle, CheckCircle2, LayoutGrid, Download, FileStack } from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';
import ImportExcelModal from '../../components/ImportExcelModal';

const { Text, Title } = Typography;

const PartLocationPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    warehouse_id: null,
    search: '',
    status: 'all' // 'all', 'empty', 'filled'
  });
  
  const [warehouses, setWarehouses] = useState([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isPowerUser = user.role === 'ADMIN' || user.role === 'MANAGER';

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id;
      if (filters.search && filters.search.trim()) params.search = filters.search.trim();

      const [invRes, whRes] = await Promise.all([
        api.get('/part-inventory', { params }),
        api.get('/warehouses')
      ]);
      
      let filteredData = invRes.data;
      if (filters.status === 'empty') {
          filteredData = filteredData.filter(i => !i.location || i.location.trim() === '');
      } else if (filters.status === 'filled') {
          filteredData = filteredData.filter(i => i.location && i.location.trim() !== '');
      }

      setData(filteredData);
      setWarehouses(whRes.data);
    } catch (error) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters.warehouse_id, filters.status]);

  const handleSearch = () => fetchData();

  const handleUpdateLocation = async (id, location) => {
    try {
        await api.put(`/part-inventory/${id}`, { location });
        message.success('Đã cập nhật vị trí');
        // Update local state to reflect change without full reload if possible, 
        // but for simplicity and correctness with filters, we can just fetch again or update locally.
        setData(prev => prev.map(item => item.id === id ? { ...item, location } : item));
    } catch (error) {
        message.error('Lỗi cập nhật: ' + error.message);
    }
  };

  const columns = [
    { 
        title: 'Phụ tùng', 
        key: 'part',
        width: '30%',
        render: (_, record) => (
            <Space direction="vertical" size={0}>
                <Text strong>{record.Part?.code}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>{record.Part?.name}</Text>
                <Tag color="blue" style={{ fontSize: '10px', marginTop: 4 }}>{record.Part?.unit}</Tag>
            </Space>
        )
    },
    { 
        title: 'Kho', 
        dataIndex: ['Warehouse', 'warehouse_name'], 
        key: 'warehouse',
        width: '15%'
    },
    { 
        title: 'Tồn kho', 
        dataIndex: 'quantity', 
        key: 'quantity',
        width: '10%',
        render: (v) => <Text strong>{Number(v).toLocaleString()}</Text>
    },
    { 
        title: 'Vị trí hiện tại', 
        dataIndex: 'location', 
        key: 'location',
        render: (text, record) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Input 
                    defaultValue={text} 
                    onBlur={(e) => {
                        if (e.target.value !== text) {
                            handleUpdateLocation(record.id, e.target.value);
                        }
                    }}
                    onPressEnter={(e) => {
                        if (e.target.value !== text) {
                            handleUpdateLocation(record.id, e.target.value);
                            e.target.blur();
                        }
                    }}
                    placeholder="Nhập vị trí (VD: Kệ A-1)"
                    prefix={<MapPin size={14} style={{ color: text ? 'var(--primary-color)' : '#94a3b8' }} />}
                    style={{ 
                        borderRadius: '6px',
                        border: text ? '1px solid var(--primary-color)' : '1px solid #d1d5db',
                        background: text ? 'rgba(79, 70, 229, 0.02)' : '#fff'
                    }}
                />
                {!text && (
                    <Tooltip title="Chưa có vị trí">
                        <AlertCircle size={16} color="#ef4444" />
                    </Tooltip>
                )}
                {text && (
                    <CheckCircle2 size={16} color="#10b981" />
                )}
            </div>
        )
    },
  ];

  const emptyCount = data.filter(i => !i.location || i.location.trim() === '').length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} className="gradient-text" style={{ margin: 0 }}>SƠ ĐỒ VỊ TRÍ PHỤ TÙNG</Title>
          <p style={{ color: 'var(--text-secondary)' }}>Quản lý và tối ưu hóa vị trí sắp xếp linh kiện trong kho.</p>
        </div>
        <Space>
            <Button 
                type="primary" 
                icon={<FileStack size={16} />} 
                onClick={() => setIsImportModalOpen(true)}
                style={{ background: 'linear-gradient(90deg, #3b82f6, #6366f1)', border: 'none' }}
            >
                Nhập từ Excel
            </Button>
            <Button icon={<RotateCcw size={16} />} onClick={fetchData}>Làm mới</Button>
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
            <Card className="glass-card" bodyStyle={{ padding: 16 }} onClick={() => setFilters({...filters, status: 'all'})} style={{ cursor: 'pointer', border: filters.status === 'all' ? '2px solid var(--primary-color)' : '1px solid transparent' }}>
                <Statistic 
                    title="Tổng số mặt hàng" 
                    value={data.length} 
                    prefix={<LayoutGrid size={20} style={{ marginRight: 8, color: 'var(--primary-color)' }} />} 
                />
            </Card>
        </Col>
        <Col xs={24} sm={8}>
            <Card className="glass-card" bodyStyle={{ padding: 16 }} onClick={() => setFilters({...filters, status: 'empty'})} style={{ cursor: 'pointer', border: filters.status === 'empty' ? '2px solid #ef4444' : '1px solid transparent' }}>
                <Statistic 
                    title="Chưa xếp vị trí" 
                    value={emptyCount} 
                    valueStyle={{ color: '#ef4444' }}
                    prefix={<AlertCircle size={20} style={{ marginRight: 8 }} />} 
                />
            </Card>
        </Col>
        <Col xs={24} sm={8}>
            <Card className="glass-card" bodyStyle={{ padding: 16 }} onClick={() => setFilters({...filters, status: 'filled'})} style={{ cursor: 'pointer', border: filters.status === 'filled' ? '2px solid #10b981' : '1px solid transparent' }}>
                <Statistic 
                    title="Đã có vị trí" 
                    value={data.length - emptyCount} 
                    valueStyle={{ color: '#10b981' }}
                    prefix={<CheckCircle2 size={20} style={{ marginRight: 8 }} />} 
                />
            </Card>
        </Col>
      </Row>

      <div className="glass-card" style={{ padding: 20, marginBottom: 24 }}>
        <Row gutter={16} align="bottom">
            <Col xs={24} md={10}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Tìm kiếm linh kiện:</Text>
                <Input 
                    placeholder="Gõ mã hoặc tên phụ tùng..." 
                    prefix={<Search size={16} />} 
                    size="large"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    onPressEnter={handleSearch}
                />
            </Col>
            <Col xs={24} md={6}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Lọc theo kho:</Text>
                <Select 
                    placeholder="Tất cả các kho" 
                    style={{ width: '100%' }} 
                    size="large"
                    allowClear={true}
                    value={filters.warehouse_id}
                    onChange={(v) => setFilters({...filters, warehouse_id: v})}
                >
                    {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                </Select>
            </Col>
            <Col xs={24} md={4}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Trạng thái:</Text>
                <Select 
                    style={{ width: '100%' }} 
                    size="large"
                    value={filters.status}
                    onChange={(v) => setFilters({...filters, status: v})}
                >
                    <Select.Option value="all">Tất cả</Select.Option>
                    <Select.Option value="empty">Chưa có vị trí</Select.Option>
                    <Select.Option value="filled">Đã có vị trí</Select.Option>
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
        dataSource={data} 
        columns={columns} 
        rowKey="id" 
        loading={loading}
        className="modern-table"
        pagination={{ pageSize: 15 }}
      />

      <ImportExcelModal 
        visible={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onSuccess={() => {
            fetchData();
            setIsImportModalOpen(false);
        }}
        type="part_locations"
        title="Nhập vị trí phụ tùng từ Excel"
      />
    </div>
  );
};

export default PartLocationPage;
