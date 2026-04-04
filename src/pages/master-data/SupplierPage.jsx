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
  Select 
} from 'antd';
import { UserPlus, Trash2, Edit, Save, RotateCcw, FileSpreadsheet, Download } from 'lucide-react';
import api from '../../utils/api';
import ImportExcelModal from '../../components/ImportExcelModal';
import { exportToExcel } from '../../utils/excelExport';
import dayjs from 'dayjs';

const { Text } = Typography;
const { Option } = Select;

const SupplierPage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/suppliers');
      setData(response.data);
    } catch (error) {
      message.error('Lỗi tải danh mục chủ hàng: ' + error.message);
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
      'Họ tên': s.name,
      'Địa chỉ': s.address,
      'Ghi chú': s.notes,
      'Kiểu thanh toán': s.payment_type
    }));

    exportToExcel(exportData, `DanhSachChuHang_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const onFinish = async (values) => {
    try {
      await api.post('/suppliers', values);
      message.success('Thêm chủ hàng mới thành công!');
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('Lỗi khi lưu: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/suppliers/${id}`);
      message.success('Đã xóa chủ hàng');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + error.message);
    }
  };

  const columns = [
    { title: 'Họ tên', dataIndex: 'name', key: 'name' },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address' },
    { title: 'Ghi chú', dataIndex: 'notes', key: 'notes' },
    { 
      title: 'Kiểu thanh toán', 
      dataIndex: 'payment_type', 
      key: 'payment_type',
      render: (val) => (
        <span style={{ color: val === 'Trả gộp' ? '#3b82f6' : '#10b981' }}>{val}</span>
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: '120px',
      hidden: !isAdmin,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<Edit size={16} />} style={{ color: 'var(--primary-color)' }} />
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
          <h2 className="gradient-text" style={{ fontSize: 24, margin: 0 }}>NHẬP CHỦ HÀNG</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Quản lý danh sách các đối tác cung cấp xe máy.</p>
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
          {isAdmin && (
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
        type="suppliers"
        title="Nhập danh sách chủ hàng"
      />

      {isAdmin && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 32, border: '1px dashed var(--border-color)' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ payment_type: 'Trả gộp' }}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Họ tên chủ hàng" name="name" rules={[{ required: true }]}>
                  <Input placeholder="Nhập tên" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Kiểu thanh toán" name="payment_type" rules={[{ required: true }]}>
                  <Select>
                    <Option value="Trả gộp">Trả gộp</Option>
                    <Option value="Trả theo lô">Trả theo lô</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Địa chỉ" name="address">
                  <Input placeholder="Nhập địa chỉ của chủ hàng" />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item label="Ghi chú" name="notes">
                  <Input placeholder="Thông tin liên lạc hoặc ghi chú thêm" />
                </Form.Item>
              </Col>
            </Row>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button icon={<RotateCcw size={16} />} ghost onClick={() => form.resetFields()}>Làm mới</Button>
              <Button 
                  icon={<Save size={16} />} 
                  type="primary" 
                  onClick={() => form.submit()} 
                  style={{ background: 'var(--primary-color)' }}
              >
                  Lưu chủ hàng
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

export default SupplierPage;
