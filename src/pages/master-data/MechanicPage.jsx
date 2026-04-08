import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Form, Input, Space, Typography, message, Tag, Switch } from 'antd';
import { UserPlus, Edit, Trash2, Search, Smartphone, UserCheck, UserX } from 'lucide-react';
import api from '../../utils/api';

const { Title, Text } = Typography;

const MechanicPage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/mechanics');
      setData(res.data);
    } catch (e) {
      message.error('Lỗi tải dữ liệu thợ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (record = null) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const onFinish = async (values) => {
    try {
      if (editingId) {
        await api.put(`/mechanics/${editingId}`, values);
        message.success('Cập nhật thành công');
      } else {
        await api.post('/mechanics', values);
        message.success('Thêm thợ mới thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e) {
      message.error('Lỗi: ' + e.message);
    }
  };

  const columns = [
    {
      title: 'Tên thợ',
      dataIndex: 'mechanic_name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Điện thoại',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'status',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'} icon={active ? <UserCheck size={12} /> : <UserX size={12} />}>
          {active ? 'Đang làm việc' : 'Đã nghỉ'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button icon={<Edit size={16} />} type="text" onClick={() => handleOpenModal(record)} />
          <Button icon={<Trash2 size={16} />} type="text" danger onClick={async () => {
            await api.delete(`/mechanics/${record.id}`);
            message.success('Đã xóa');
            fetchData();
          }} />
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} className="gradient-text" style={{ margin: 0 }}>QUẢN LÝ DANH SÁCH THỢ</Title>
          <Text type="secondary">Quản lý nhân viên kỹ thuật (không cần tài khoản hệ thống)</Text>
        </div>
        <Button type="primary" size="large" icon={<UserPlus size={20} />} onClick={() => handleOpenModal()}>
          THÊM THỢ MỚI
        </Button>
      </div>

      <Card className="glass-card">
        <div style={{ marginBottom: 16 }}>
          <Input 
            placeholder="Tìm theo tên hoặc số điện thoại..." 
            prefix={<Search size={18} />} 
            size="large"
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
        <Table 
          columns={columns} 
          dataSource={data.filter(i => 
            i.mechanic_name.toLowerCase().includes(searchText.toLowerCase()) || 
            (i.phone && i.phone.includes(searchText))
          )} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingId ? "Cập nhật thông tin thợ" : "Thêm thợ mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ is_active: true }}>
          <Form.Item label="Họ và tên" name="mechanic_name" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
            <Input size="large" />
          </Form.Item>
          <Form.Item label="Số điện thoại" name="phone">
            <Input size="large" prefix={<Smartphone size={16} />} />
          </Form.Item>
          <Form.Item label="Đang làm việc" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MechanicPage;
