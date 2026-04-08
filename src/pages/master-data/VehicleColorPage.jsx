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
  message 
} from 'antd';
import { Palette, Trash2, Edit, Save, RotateCcw, Loader2, FileSpreadsheet, Download } from 'lucide-react';
import api from '../../utils/api';
import ImportExcelModal from '../../components/ImportExcelModal';
import { exportToExcel } from '../../utils/excelExport';
import dayjs from 'dayjs';

const { Text } = Typography;

const VehicleColorPage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const canManageMaster = isAdmin || user.can_manage_master_data === true || user.can_manage_master_data === 1;

  // Fetch initial data
  const fetchColors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/colors');
      setData(response.data);
    } catch (error) {
      message.error('Không thể tải danh sách màu xe: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchColors();
  }, []);

  const handleExport = () => {
    if (!data || data.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = data.map(c => ({
      'Tên màu xe': c.color_name
    }));

    exportToExcel(exportData, `DanhMucMauXe_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const onFinish = async (values) => {
    try {
      if (editingId) {
        await api.put(`/colors/${editingId}`, values);
        message.success('Cập nhật màu xe thành công!');
        setEditingId(null);
      } else {
        await api.post('/colors', values);
        message.success('Thêm màu xe mới thành công!');
      }
      form.resetFields();
      fetchColors(); 
    } catch (error) {
      message.error('Lỗi khi lưu màu xe: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    form.resetFields();
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/colors/${id}`);
      message.success('Đã xóa màu xe');
      fetchColors();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + error.message);
    }
  };

  const columns = [
    { 
      title: 'Tên màu xe', 
      dataIndex: 'color_name', 
      key: 'color_name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: '120px',
      hidden: !canManageMaster,
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<Edit size={16} />} 
            style={{ color: 'var(--primary-color)' }} 
            onClick={() => handleEdit(record)}
          />
          <Popconfirm title="Xóa màu này?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 className="gradient-text" style={{ fontSize: 24, margin: 0 }}>ĐĂNG KÝ MÀU XE</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Quản lý danh mục màu sắc của các dòng xe máy.</p>
        </div>
        <Space>
          <Button 
            icon={<Download size={16} />} 
            ghost 
            type="primary" 
            onClick={handleExport}
          >
            Xuất Excel
          </Button>
          {canManageMaster && (
            <Button 
              icon={<FileSpreadsheet size={16} />} 
              ghost 
              type="primary" 
              onClick={() => setImportVisible(true)}
            >
              Nhập từ Excel
            </Button>
          )}
        </Space>
      </div>

      <ImportExcelModal 
        visible={importVisible}
        onCancel={() => setImportVisible(false)}
        onSuccess={fetchColors}
        type="colors"
        title="Nhập danh sách màu xe"
      />

      {canManageMaster && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 32, border: '1px dashed var(--border-color)' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
          >
            <Row gutter={16} align="bottom">
              <Col xs={24} md={14}>
                <Form.Item label="Tên màu xe" name="color_name" rules={[{ required: true }]}>
                  <Input placeholder="Ví dụ: Đỏ Đen Nhám, Xanh GP..." />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <Button ghost icon={<RotateCcw size={16} />} onClick={editingId ? handleCancelEdit : () => form.resetFields()}>
                    {editingId ? 'Hủy' : 'Làm mới'}
                  </Button>
                  <Button flex={1} icon={<Save size={16} />} type="primary" onClick={() => form.submit()} style={{ background: editingId ? '#10b981' : 'var(--primary-color)', flex: 1 }}>
                    {editingId ? 'Cập nhật' : 'Lưu màu'}
                  </Button>
                </div>
              </Col>
            </Row>
          </Form>
        </div>
      )}

      <Table 
        dataSource={data} 
        columns={columns.filter(c => !c.hidden)} 
        rowKey="id"
        className="modern-table"
        loading={loading}
        pagination={{ pageSize: 12 }}
      />
    </div>
  );
};

export default VehicleColorPage;
