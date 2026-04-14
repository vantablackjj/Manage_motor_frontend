import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  InputNumber, 
  Row, 
  Col, 
  Table, 
  Typography, 
  message, 
  Space,
  Popconfirm,
  Select,
  Tag
} from 'antd';
import { Wallet, Save, RotateCcw, Trash2, Search, Download } from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/excelExport';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ExpensePage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/expenses');
      setData(response.data);
      
      const vRes = await api.get('/vehicles?status=In Stock');
      setVehicles(vRes.data);

      const wRes = await api.get('/warehouses');
      setWarehouses(wRes.data);
    } catch (error) {
      message.error('Lỗi tải dữ liệu');
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

    const exportData = data.map(e => ({
      'Ngày chi': dayjs(e.expense_date).format('DD/MM/YYYY'),
      'Xe liên quan': e.related_vehicle ? e.related_vehicle.engine_no : 'Toàn hệ thống/Chung',
      'Cửa hàng/Kho': e.Warehouse?.warehouse_name || 'N/A',
      'Số tiền': Number(e.amount),
      'Nội dung chi': e.content
    }));

    exportToExcel(exportData, `DanhSachChiPhi_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const onFinish = async (values) => {
// ... existing onFinish ...
    try {
      const payload = {
        ...values,
        expense_date: values.expense_date.toISOString()
      }
      await api.post('/expenses', payload);
      message.success('Ghi nhận chi tiêu thành công!');
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error('Lỗi khi lưu chi tiêu: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      message.success('Đã xóa chi tiêu');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + error.message);
    }
  };

  const expenseColumns = [
    { title: 'Ngày chi', dataIndex: 'expense_date', key: 'date', width: '130px', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { 
      title: 'Xe liên quan', 
      key: 'vehicle', 
      width: '180px',
      render: (_, r) => r.related_vehicle ? (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 12 }}>{r.related_vehicle.engine_no}</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>SM: {r.related_vehicle.chassis_no}</Text>
        </Space>
      ) : <Tag>Chung (Mặt bằng...)</Tag>
    },
    { 
      title: 'Cửa hàng/Kho', 
      dataIndex: 'Warehouse', 
      key: 'warehouse', 
      width: '150px', 
      render: (w) => w?.warehouse_name || <Tag color="orange">Toàn hệ thống</Tag> 
    },
    { title: 'Số tiền (VNĐ)', dataIndex: 'amount', key: 'amount', width: '150px', render: (val) => `${Number(val).toLocaleString()} đ` },
    { title: 'Nội dung chi', dataIndex: 'content', key: 'content' },
    { 
      title: 'Tác vụ', 
      key: 'action', 
      width: '80px',
      align: 'center',
      hidden: !isAdmin && !user.can_delete,
      render: (_, r) => (isAdmin || user.can_delete) ? (
        <Popconfirm title="Xóa khoản chi này?" onConfirm={() => handleDelete(r.id)}>
          <Button type="text" danger icon={<Trash2 size={16} />} />
        </Popconfirm>
      ) : null
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{ marginBottom: 32 }}>
        <h2 className="gradient-text" style={{ fontSize: 24, margin: 0 }}>GHI NHẬN CHI TIÊU LINH HOẠT</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Theo dõi mọi chi phí từ mặt bằng đến sửa chữa xe lẻ.</p>
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 40, border: '1px dashed var(--border-color)' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            expense_date: dayjs()
          }}
        >
          <Row gutter={16}>
             <Col xs={24} md={6}>
              <Form.Item label="Chi cho xe (không bắt buộc)" name="vehicle_id">
                <Select 
                    showSearch 
                    allowClear
                    placeholder="Chọn xe nếu chi riêng cho xe"
                    optionFilterProp="children"
                >
                    {vehicles
                      .filter(v => isAdmin || !v.warehouse_id || (user.expense_warehouses?.split(',').includes(v.warehouse_id)))
                      .map(v => (
                        <Option key={v.id} value={v.id}>
                          {`${v.engine_no} (${v.VehicleType?.name || 'N/A'})`}
                        </Option>
                      ))
                    }
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Cửa hàng / Kho" name="warehouse_id">
                <Select placeholder="Chọn cửa hàng" allowClear>
                    {warehouses.filter(w => isAdmin || (user.expense_warehouses?.split(',').includes(w.id))).map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item label="Ngày chi" name="expense_date" rules={[{ required: true }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Số tiền thanh toán" name="amount" rules={[{ required: true }]}>
                <InputNumber 
                  style={{ width: '100%' }} 
                  placeholder="VND"
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item label="Mô tả nội dung chi" name="content" rules={[{ required: true }]}>
                <TextArea rows={2} placeholder="Sửa chữa phanh, đổ xăng, hay tiền điện..." />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button icon={<RotateCcw size={16} />} ghost onClick={() => form.resetFields()}>Làm lại</Button>
            <Button 
                icon={<Save size={16} />} 
                type="primary" 
                onClick={() => form.submit()}
                disabled={!isAdmin && !user.can_manage_expenses}
            >
                {isAdmin || user.can_manage_expenses ? "Ghi nhận ngay" : "CHẾ ĐỘ XEM CHỈ ĐỌC"}
            </Button>
          </div>
        </Form>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={20} color="var(--primary-color)" />
            <Text strong style={{ color: 'var(--text-primary)', fontSize: 16 }}>LỊCH SỬ CHI PHÍ ĐÃ GHI</Text>
        </div>
        <Button 
            icon={<Download size={16} />} 
            onClick={handleExport}
            ghost
            type="primary"
        >
            Xuất Excel
        </Button>
      </div>
      <Table 
        dataSource={data} 
        columns={expenseColumns} 
        rowKey="id"
        loading={loading}
        className="modern-table"
        pagination={{ pageSize: 10 }}
        size="small"
      />
    </div>
  );
};

export default ExpensePage;
