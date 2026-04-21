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
import { Users, Trash2, Edit, Save, RotateCcw, FileSpreadsheet, Download } from 'lucide-react';
import api from '../../utils/api';
import { capitalizeName } from '../../utils/stringHelper';
import ImportExcelModal from '../../components/ImportExcelModal';
import { exportToExcel } from '../../utils/excelExport';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

const WholesaleCustomerPage = () => {
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
      const response = await api.get('/wholesale-customers?type=VEHICLE');
      setData(response.data);
    } catch (error) {
      message.error('Lỗi tải danh mục khách buôn xe máy: ' + error.message);
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

    const exportData = data.map(c => ({
      'Mã khách': c.customer_code,
      'Họ tên': c.name,
      'Địa chỉ': c.address,
      'Kiểu thanh toán': c.payment_type,
      'Phân loại': c.customer_type === 'VEHICLE' ? 'Xe máy' : (c.customer_type === 'PART' ? 'Phụ tùng' : 'Cả hai')
    }));

    exportToExcel(exportData, `DanhSachKhachBuon_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const onFinish = async (values) => {
    try {
      if (editingId) {
        await api.put(`/wholesale-customers/${editingId}`, values);
        message.success('Cập nhật thông tin khách buôn thành công!');
        setEditingId(null);
      } else {
        await api.post('/wholesale-customers', values);
        message.success('Thêm khách buôn mới thành công!');
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
      await api.delete(`/wholesale-customers/${id}`);
      message.success('Đã xóa khách buôn');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + error.message);
    }
  };

  const columns = [
    { title: 'Mã khách', dataIndex: 'customer_code', key: 'customer_code' },
    { title: 'Họ tên', dataIndex: 'name', key: 'name' },
    { title: 'Số điện thoại', dataIndex: 'phone', key: 'phone' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    { 
      title: 'Phân loại', 
      dataIndex: 'customer_type', 
      key: 'customer_type',
      render: (val) => (
        <Tag color={val === 'VEHICLE' ? 'blue' : (val === 'PART' ? 'purple' : 'gold')}>
          {val === 'VEHICLE' ? 'Xe máy' : (val === 'PART' ? 'Phụ tùng' : 'Cả hai')}
        </Tag>
      )
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
          <Popconfirm title="Xóa thông tin?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 className="gradient-text" style={{ fontSize: 24, margin: 0 }}>NHẬP MÃ KHÁCH BUÔN</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Quản lý dữ liệu đối tác khách hàng mua sỉ.</p>
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
        onSuccess={fetchData}
        type="customers"
        extraData={{ customer_type: 'VEHICLE' }}
        title="Nhập danh sách khách hàng buôn xe máy"
      />

      {canManageMaster && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 32, border: '1px dashed var(--border-color)' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ payment_type: 'Trả gộp', customer_type: 'VEHICLE' }}
          >
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item label="Mã khách" name="customer_code" rules={[{ required: true }]}>
                  <Input placeholder="KB001" disabled={!!editingId} />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item label="Họ tên" name="name" rules={[{ required: true }]}>
                  <Input 
                    placeholder="Ví dụ: Đại lý A" 
                    onBlur={(e) => form.setFieldsValue({ name: capitalizeName(e.target.value) })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item label="Số điện thoại" name="phone">
                  <Input placeholder="09xxx" />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item label="Kiểu thanh toán" name="payment_type" rules={[{ required: true }]}>
                  <Select>
                    <Option value="Trả gộp">Trả gộp</Option>
                    <Option value="Trả theo lô">Trả theo lô</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item label="Đối tượng sỉ" name="customer_type" rules={[{ required: true }]}>
                  <Select>
                    <Option value="VEHICLE">Xe máy</Option>
                    <Option value="PART">Phụ tùng</Option>
                    <Option value="BOTH">Cả hai</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Địa chỉ" name="address">
                  <Input 
                    placeholder="Nhập địa chỉ" 
                    onBlur={(e) => form.setFieldsValue({ address: capitalizeName(e.target.value) })}
                  />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button icon={<RotateCcw size={16} />} ghost onClick={editingId ? handleCancelEdit : () => form.resetFields()}>
                {editingId ? 'Hủy bỏ sửa' : 'Làm mới'}
              </Button>
              <Button 
                  icon={<Save size={16} />} 
                  type="primary" 
                  onClick={() => form.submit()} 
                  style={{ background: editingId ? '#10b981' : 'var(--primary-color)' }}
              >
                  {editingId ? 'Cập nhật khách buôn' : 'Lưu khách buôn'}
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
      />
    </div>
  );
};

export default WholesaleCustomerPage;
