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
  Select,
  Tag
} from 'antd';
import { Users, Trash2, Edit, Save, RotateCcw, FileSpreadsheet, Download, Truck } from 'lucide-react';
import api from '../../utils/api';
import { capitalizeName } from '../../utils/stringHelper';
import ImportExcelModal from '../../components/ImportExcelModal';
import { exportToExcel } from '../../utils/excelExport';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const SupplierPage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const canManageMaster = isAdmin || user.can_manage_master_data === true || user.can_manage_master_data === 1;

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/suppliers');
      setData(response.data);
    } catch (error) {
      message.error('Lỗi tải danh mục nhà cung cấp: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = () => {
    if (!data || data.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = data.map(s => ({
      'Tên nhà cung cấp': s.name,
      'Địa chỉ': s.address,
      'Kiểu thanh toán': s.payment_type,
      'Ghi chú': s.notes || ''
    }));

    exportToExcel(exportData, `DanhSachNhaCungCap_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const onFinish = async (values) => {
    try {
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, values);
        message.success('Cập nhật thông tin nhà cung cấp thành công!');
        setEditingId(null);
      } else {
        await api.post('/suppliers', values);
        message.success('Thêm nhà cung cấp mới thành công!');
      }
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('Lỗi khi lưu: ' + (error.response?.data?.message || error.message));
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
      await api.delete(`/suppliers/${id}`);
      message.success('Đã xóa nhà cung cấp');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + error.message);
    }
  };

  const columns = [
    { title: 'Tên nhà cung cấp', dataIndex: 'name', key: 'name' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    { 
      title: 'Kiểu thanh toán', 
      dataIndex: 'payment_type', 
      key: 'payment_type',
      render: (val) => (
        <Tag color={val === 'Trả gộp' ? 'blue' : 'purple'}>
          {val}
        </Tag>
      )
    },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes' },
    {
      title: 'Thao tác',
      key: 'action',
      width: '120px',
      hidden: !canManageMaster,
      render: (_, record) => (isAdmin || canManageMaster) ? (
        <Space>
          <Button 
            type="text" 
            icon={<Edit size={16} />} 
            style={{ color: 'var(--primary-color)' }} 
            onClick={() => handleEdit(record)}
          />
          <Popconfirm title="Xóa thông tin?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      ) : null,
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <Title level={2} className="gradient-text" style={{ margin: 0 }}>NHẬP CHỦ HÀNG (NCC)</Title>
          <Text type="secondary">Quản lý dữ liệu đối tác cung cấp xe máy & hàng hóa.</Text>
        </div>
        <Space wrap className="mobile-stack">
          <Button 
            icon={<Download size={16} />} 
            ghost 
            type="primary" 
            onClick={handleExport}
            block={window.innerWidth < 768}
          >
            Xuất Excel
          </Button>
          {canManageMaster && (
            <Button 
              icon={<FileSpreadsheet size={16} />} 
              ghost 
              type="primary" 
              onClick={() => setImportVisible(true)}
              block={window.innerWidth < 768}
            >
              Nhập từ Excel
            </Button>
          )}
        </Space>
      </div>

      <ImportExcelModal 
        visible={importVisible}
        onCancel={() => setImportVisible(false)}
        onSuccess={fetchData}
        type="suppliers"
        title="Nhập danh sách nhà cung cấp"
      />

      {canManageMaster && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 32, border: '1px dashed var(--border-color)' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ payment_type: 'Trả gộp' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={10}>
                <Form.Item label="Tên nhà cung cấp" name="name" rules={[{ required: true }]}>
                  <Input 
                    placeholder="Ví dụ: Công ty Honda Việt Nam" 
                    size="large"
                    onBlur={(e) => form.setFieldsValue({ name: capitalizeName(e.target.value) })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Địa chỉ" name="address">
                  <Input 
                    placeholder="Vĩnh Phúc, Hà Nội..." 
                    size="large"
                    onBlur={(e) => form.setFieldsValue({ address: capitalizeName(e.target.value) })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={6}>
                <Form.Item label="Kiểu thanh toán" name="payment_type" rules={[{ required: true }]}>
                  <Select size="large">
                    <Option value="Trả gộp">Trả gộp</Option>
                    <Option value="Trả theo lô">Trả theo lô</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Ghi chú" name="notes">
                  <TextArea rows={2} placeholder="Thông tin liên hệ, ghi chú nợ..." />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <Button 
                icon={<RotateCcw size={16} />} 
                ghost 
                onClick={editingId ? handleCancelEdit : () => form.resetFields()}
                block={window.innerWidth < 768}
              >
                {editingId ? 'Hủy bỏ sửa' : 'Làm mới'}
              </Button>
              <Button 
                icon={<Save size={16} />} 
                type="primary" 
                onClick={() => form.submit()} 
                style={{ background: editingId ? '#10b981' : 'var(--primary-color)' }}
                block={window.innerWidth < 768}
              >
                {editingId ? 'Cập nhật NCC' : 'Lưu nhà cung cấp'}
              </Button>
            </div>
          </Form>
        </div>
      )}

      <Table 
        dataSource={data} 
        columns={columns.filter(c => !c.hidden)} 
        rowKey="id"
        className="modern-table"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size={window.innerWidth < 768 ? 'small' : 'middle'}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
};

export default SupplierPage;
