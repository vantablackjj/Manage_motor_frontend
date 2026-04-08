import React, { useState, useEffect } from 'react';
import { Table, Tag, Typography, message, Button, Space, Input } from 'antd';
import { Search, FileText, Eye, Clock } from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const MaintenanceHistoryPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/maintenance-orders');
      setData(res.data);
    } catch (error) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const columns = [
    { 
        title: 'Ngày', 
        dataIndex: 'maintenance_date', 
        key: 'date',
        render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
    },
    { 
        title: 'Biển số', 
        dataIndex: 'license_plate', 
        key: 'plate',
        render: (text) => <Text strong>{text || 'N/A'}</Text>
    },
    { 
        title: 'Khách hàng', 
        dataIndex: 'customer_name', 
        key: 'customer' 
    },
    { 
        title: 'Loại xe', 
        dataIndex: 'model_name', 
        key: 'model' 
    },
    { 
        title: 'Loại hình', 
        dataIndex: 'service_type', 
        key: 'type',
        render: (type) => <Tag color="purple">{type}</Tag>
    },
    { 
        title: 'Tổng tiền', 
        dataIndex: 'total_amount', 
        key: 'total',
        render: (v) => <Text strong>{Number(v).toLocaleString()} đ</Text>
    },
    { 
        title: 'Trạng thái', 
        dataIndex: 'is_internal_vehicle', 
        key: 'internal',
        render: (internal) => internal ? <Tag color="green">Xe nội bộ</Tag> : <Tag color="orange">Xe ngoài</Tag>
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button icon={<Eye size={16} />} type="text">Chi tiết</Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 32 }}>
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>LỊCH SỬ BẢO TRÌ & DỊCH VỤ</Title>
        <p style={{ color: 'var(--text-secondary)' }}>Danh sách các phiếu sửa chữa và bảo dưỡng đã thực hiện.</p>
      </div>

      <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
        <Input 
            placeholder="Tìm theo Biển số, Tên khách, Số máy..." 
            prefix={<Search size={16} />} 
            size="large"
            onChange={e => setSearchText(e.target.value)}
        />
      </div>

      <Table 
        dataSource={data.filter(i => 
            (i.license_plate?.toLowerCase().includes(searchText.toLowerCase())) ||
            (i.customer_name?.toLowerCase().includes(searchText.toLowerCase())) ||
            (i.engine_no?.toLowerCase().includes(searchText.toLowerCase()))
        )} 
        columns={columns} 
        rowKey="id" 
        loading={loading}
        className="modern-table"
      />
    </div>
  );
};

export default MaintenanceHistoryPage;
