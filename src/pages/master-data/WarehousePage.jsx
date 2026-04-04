import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Table, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Popconfirm, 
  message,
  Modal
} from 'antd';
import { Warehouse as WarehouseIcon, Trash2, Edit, Save, Plus, Download } from 'lucide-react';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/excelExport';
import dayjs from 'dayjs';

const { Text } = Typography;

const WarehousePage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/warehouses');
      setData(response.data);
    } catch (error) {
      message.error('Không thể tải danh sách kho: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data || data.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = data.map(w => ({
      'Tên kho': w.warehouse_name,
      'Địa điểm': w.location
    }));

    exportToExcel(exportData, `DanhSachKho_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const showModal = (record = null) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await api.put(`/warehouses/${editingId}`, values);
        message.success('Cập nhật kho thành công!');
      } else {
        await api.post('/warehouses', values);
        message.success('Thêm kho mới thành công!');
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (error) {
      if (error.errorFields) return;
      message.error('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/warehouses/${id}`);
      message.success('Đã xóa kho');
      fetchWarehouses();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
    }
  };

  const columns = [
    { 
      title: 'Tên kho', 
      dataIndex: 'warehouse_name', 
      key: 'warehouse_name',
      render: (text) => <Text strong style={{ color: 'var(--primary-color)' }}>{text}</Text>
    },
    { 
      title: 'Địa điểm', 
      dataIndex: 'location', 
      key: 'location' 
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: '120px',
      hidden: !isAdmin,
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<Edit size={16} />} 
            onClick={() => showModal(record)}
            style={{ color: '#10b981' }} 
          />
          <Popconfirm title="Xóa kho này? Các dữ liệu liên quan có thể bị ảnh hưởng." onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h2 className="gradient-text" style={{ fontSize: 24, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <WarehouseIcon size={28} /> QUẢN LÝ KHO
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Danh sách các kho hàng trong hệ thống.</p>
        </div>
        <Space>
          <Button 
            icon={<Download size={18} />} 
            onClick={handleExport}
            ghost
            type="primary"
            style={{ height: 40, borderRadius: 8 }}
          >
            Xuất Excel
          </Button>
          {isAdmin && (
            <Button 
              type="primary" 
              icon={<Plus size={18} />} 
              onClick={() => showModal()}
              style={{ background: 'var(--primary-color)', height: 40, borderRadius: 8 }}
            >
              Thêm kho mới
            </Button>
          )}
        </Space>
      </div>

      <Table 
        dataSource={data} 
        columns={columns.filter(c => !c.hidden)} 
        rowKey="id"
        className="modern-table"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={editingId ? "Cập nhật kho" : "Thêm kho mới"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Lưu lại"
        cancelText="Hủy"
        centered
        styles={{ body: { paddingTop: 20 } }}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item label="Tên kho" name="warehouse_name" rules={[{ required: true, message: 'Vui lòng nhập tên kho' }]}>
            <Input placeholder="Ví dụ: Kho Chính, Kho Phụ..." />
          </Form.Item>
          <Form.Item label="Địa điểm" name="location">
            <Input placeholder="Nhập địa chỉ hoặc vị trí kho" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default WarehousePage;
