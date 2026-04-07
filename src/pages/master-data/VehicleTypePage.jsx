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
  InputNumber
} from 'antd';
import { PlusCircle, Search, Trash2, Edit, Save, RotateCcw, FileSpreadsheet, Download } from 'lucide-react';
import api from '../../utils/api';
import ImportExcelModal from '../../components/ImportExcelModal';
import { exportToExcel } from '../../utils/excelExport';
import dayjs from 'dayjs';

const { Text } = Typography;

const VehicleTypePage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/vehicle-types');
      setData(response.data);
    } catch (error) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
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

    const exportData = data.map(t => ({
      'Tên xe': t.name,
      'Loại xe': t.type,
      'Tiền tố khung': t.chassis_prefix,
      'Tiền tố máy': t.engine_prefix,
      'Giá gợi ý': Number(t.suggested_price || 0)
    }));

    exportToExcel(exportData, `DanhMucLoaiXe_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const onFinish = async (values) => {
    try {
      if (editingId) {
        await api.put(`/vehicle-types/${editingId}`, values);
        message.success('Cập nhật loại xe thành công!');
        setEditingId(null);
      } else {
        await api.post('/vehicle-types', values);
        message.success('Thêm loại xe mới thành công!');
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
      await api.delete(`/vehicle-types/${id}`);
      message.success('Đã xóa loại xe');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + error.message);
    }
  };

  const columns = [
    { title: 'Tên xe', dataIndex: 'name', key: 'name' },
    { title: 'Loại xe', dataIndex: 'type', key: 'type' },
    { title: 'Tiền tố khung', dataIndex: 'chassis_prefix', key: 'chassis_prefix' },
    { title: 'Tiền tố máy', dataIndex: 'engine_prefix', key: 'engine_prefix' },
    { 
      title: 'Giá gợi ý', 
      dataIndex: 'suggested_price', 
      key: 'suggested_price',
      hidden: true, // Hidden per user request to only show in Purchase
      render: (v) => <Text strong style={{ color: '#10b981' }}>{Number(v || 0).toLocaleString()} đ</Text>
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: '120px',
      hidden: !isAdmin,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<Edit size={16} />} style={{ color: 'var(--primary-color)' }} onClick={() => handleEdit(record)} />
          <Popconfirm 
            title="Xóa loại xe này?" 
            description="Lưu ý: Bạn không thể xóa nếu đã có xe trong kho thuộc loại này."
            onConfirm={() => handleDelete(record.id)}
            okText="Xác nhận xóa"
            cancelText="Bỏ qua"
          >
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
          <h2 className="gradient-text" style={{ fontSize: 24, margin: 0 }}>ĐĂNG KÝ LOẠI XE</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Quản lý danh sách các dòng xe và quy tắc mã khung/máy.</p>
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
        type="types"
        title="Nhập danh sách loại xe"
      />

      {isAdmin && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 32, border: '1px dashed var(--border-color)' }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item label="Tên xe (Brand/Model)" name="name" rules={[{ required: true }]}>
                  <Input placeholder="Ví dụ: Vision 2024" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Phân loại (Loại xe)" name="type" rules={[{ required: true }]}>
                  <Input placeholder="Ví dụ: Xe ga, Xe số, Côn tay" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Mã khung (Ký hiệu đầu)" name="chassis_prefix">
                  <Input placeholder="Ví dụ: RLH..." />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Mã máy (Ký hiệu đầu)" name="engine_prefix">
                  <Input placeholder="Ví dụ: JF62..." />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label="Giá gợi ý (đ)" name="suggested_price">
                  <InputNumber 
                    style={{ width: '100%' }}
                    size="large"
                    placeholder="Ví dụ: 35.000.000"
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                    parser={(v) => v.replace(/\$\s?|(\.*)/g, "")}
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
                {editingId ? 'Cập nhật danh mục' : 'Lưu danh mục'}
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

export default VehicleTypePage;
