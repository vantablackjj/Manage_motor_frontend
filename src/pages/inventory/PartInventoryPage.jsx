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
import { Search, Box, Layers, Download, RotateCcw, FileStack, DollarSign, Package } from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { exportToExcel } from '../../utils/excelExport';
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
  const [isPurchaseImportOpen, setIsPurchaseImportOpen] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isPowerUser = user.role === 'ADMIN' || user.role === 'MANAGER';
  const allowedWarehouseIds = [
    user.warehouse_id,
    ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])
  ].filter(Boolean);

  const totalQuantity = data.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalValue = data.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.Part?.purchase_price || 0)), 0);

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

  const handleExport = () => {
    if (!data || data.length === 0) return message.warning('Không có dữ liệu để xuất!');
    const exportData = data.map(item => {
      const row = {
        'Mã phụ tùng (SKU)': item.Part?.code,
        'Loại': item.Part?.code_type === 'HONDA' ? 'Honda' : 'Tự tạo',
        'Tên phụ tùng': item.Part?.name,
        'Đơn vị lẻ': item.Part?.unit,
        'Kho': item.Warehouse?.warehouse_name || 'N/A',
        'Vị trí': item.location || '',
        'Hạn mức cảnh báo': item.warning_limit !== undefined && item.warning_limit !== null ? Number(item.warning_limit) : 5,
        'Số lượng tồn': Number(item.quantity)
      };
      if (isPowerUser) {
        row['Giá nhập (đ)'] = Number(item.Part?.purchase_price || 0);
        row['Thành tiền (đ)'] = Number(item.quantity || 0) * Number(item.Part?.purchase_price || 0);
      }
      return row;
    });
    exportToExcel(exportData, `TonKhoPhuTung_${dayjs().format('YYYYMMDD')}`);
  };

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
        render: (text, record) => {
            const canEdit = isPowerUser || allowedWarehouseIds.includes(record.warehouse_id);
            return (
                <Input 
                    defaultValue={text} 
                    onBlur={(e) => {
                        if (e.target.value !== text) {
                            handleUpdateLocation(record.id, e.target.value);
                        }
                    }}
                    placeholder={canEdit ? "VD: Kệ A hàng 3" : "Không có quyền sửa"}
                    style={{ width: '150px' }}
                    disabled={!canEdit}
                />
            );
        }
    },
    { 
        title: 'SL cảnh báo', 
        dataIndex: 'warning_limit', 
        key: 'warning_limit',
        render: (text, record) => {
            const canEdit = isPowerUser || allowedWarehouseIds.includes(record.warehouse_id);
            const val = text !== undefined && text !== null ? Number(text) : 5;
            return (
                <Input 
                    type="number"
                    defaultValue={val} 
                    onBlur={(e) => {
                        const newVal = e.target.value === '' ? 5 : Number(e.target.value);
                        if (newVal !== val) {
                            handleUpdateWarningLimit(record.id, newVal);
                        }
                    }}
                    placeholder={canEdit ? "VD: 5" : "Không có quyền sửa"}
                    style={{ width: '100px' }}
                    disabled={!canEdit}
                />
            );
        }
    },
    { 
        title: 'Số lượng tồn (Lẻ)', 
        dataIndex: 'quantity', 
        key: 'quantity',
        render: (v, record) => {
            const threshold = record.warning_limit !== undefined && record.warning_limit !== null ? Number(record.warning_limit) : 5;
            return (
                <Text strong style={{ color: Number(v) <= threshold ? '#ef4444' : '#10b981', fontSize: 16 }}>
                    {Number(v).toLocaleString()}
                </Text>
            );
        }
    },
    ...(isPowerUser ? [
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
        }
    ] : [])
  ];

  const handleUpdateLocation = async (id, location) => {
      try {
          await api.put(`/part-inventory/${id}`, { location });
          message.success('Cập nhật vị trí thành công');
          setData(prev => prev.map(item => item.id === id ? { ...item, location } : item));
      } catch (error) {
          message.error('Lỗi cập nhật vị trí: ' + (error.response?.data?.message || error.message));
      }
  };

  const handleUpdateWarningLimit = async (id, warning_limit) => {
      try {
          await api.put(`/part-inventory/${id}`, { warning_limit });
          message.success('Cập nhật hạn mức cảnh báo thành công');
          setData(prev => prev.map(item => item.id === id ? { ...item, warning_limit } : item));
      } catch (error) {
          message.error('Lỗi cập nhật hạn mức cảnh báo: ' + (error.response?.data?.message || error.message));
      }
  };

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
                Cân đối tồn kho
            </Button>
            <Button 
                type="primary"
                icon={<FileStack size={16} />} 
                onClick={() => setIsPurchaseImportOpen(true)}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    background: 'linear-gradient(90deg, #10b981, #059669)',
                    border: 'none'
                }}
            >
                Nhập kho (Hóa đơn HVN)
            </Button>
            <Button icon={<Download size={16} />} ghost type="primary" onClick={handleExport}>Xuất báo cáo</Button>
            <Button icon={<RotateCcw size={16} />} onClick={fetchData}>Làm mới</Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={isPowerUser ? 6 : 8}>
            <Card className="glass-card" bodyStyle={{ padding: 16 }}>
                <Statistic 
                    title="Tổng số mặt hàng" 
                    value={data.length} 
                    prefix={<Box size={18} style={{ marginRight: 8, color: 'var(--primary-color)' }} />} 
                />
            </Card>
        </Col>
        <Col xs={24} sm={12} md={isPowerUser ? 6 : 8}>
            <Card className="glass-card" bodyStyle={{ padding: 16 }}>
                <Statistic 
                    title="Hết hàng / Sắp hết" 
                    value={data.filter(i => {
                        const threshold = i.warning_limit !== undefined && i.warning_limit !== null ? Number(i.warning_limit) : 5;
                        return Number(i.quantity) <= threshold;
                    }).length} 
                    valueStyle={{ color: '#ef4444' }}
                    prefix={<Layers size={18} style={{ marginRight: 8 }} />} 
                />
            </Card>
        </Col>
        <Col xs={24} sm={12} md={isPowerUser ? 6 : 8}>
            <Card className="glass-card" bodyStyle={{ padding: 16 }}>
                <Statistic 
                    title="Tổng số lượng tồn" 
                    value={totalQuantity} 
                    prefix={<Package size={18} style={{ marginRight: 8, color: '#10b981' }} />} 
                />
            </Card>
        </Col>
        {isPowerUser && (
          <Col xs={24} sm={12} md={6}>
              <Card className="glass-card" bodyStyle={{ padding: 16 }}>
                  <Statistic 
                      title="Tổng giá trị tồn kho" 
                      value={totalValue} 
                      suffix="đ"
                      formatter={v => Number(v).toLocaleString()}
                      prefix={<DollarSign size={18} style={{ marginRight: 8, color: '#f59e0b' }} />} 
                  />
              </Card>
          </Col>
        )}
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
                    placeholder="Chọn kho để xem tồn" 
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
      <ImportExcelModal 
        visible={isPurchaseImportOpen}
        onCancel={() => setIsPurchaseImportOpen(false)}
        onSuccess={() => {
            fetchData();
            setIsPurchaseImportOpen(false);
        }}
        type="part_purchases"
        title="Nhập kho phụ tùng từ Hóa đơn HVN"
      />
    </div>
  );
};

export default PartInventoryPage;
