import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Select, 
  InputNumber, 
  Row, 
  Col, 
  Table, 
  Space, 
  Typography, 
  message, 
  Card,
  Popconfirm,
  Badge,
  Alert,
  Tag,
  Collapse,
  Checkbox
} from 'antd';

const { Panel } = Collapse;

import { ShoppingBag, Save, Trash2, Car, AlertTriangle, User, UserPlus, Smartphone, MapPin, FileSpreadsheet, Download } from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../utils/api';
import ImportExcelModal from '../../components/ImportExcelModal';
import { exportToExcel } from '../../utils/excelExport';

const { Text, Title } = Typography;
const { Option } = Select;

const RetailSalePage = () => {
  const [form] = Form.useForm();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  
  const [salesHistory, setSalesHistory] = useState([]);
  const [availableStock, setAvailableStock] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(user.warehouse_id);
  const [importVisible, setImportVisible] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async (warehouseId = selectedWarehouseId) => {
    try {
      const [salesRes, stockRes, whRes, empRes] = await Promise.all([
        api.get('/retail-sales'),
        api.get(`/inventory/available${warehouseId ? `?warehouse_id=${warehouseId}` : ''}`),
        isAdmin ? api.get('/warehouses') : Promise.resolve({ data: [] }),
        api.get('/auth/users')
      ]);
      setSalesHistory(salesRes.data);
      setAvailableStock(stockRes.data);
      if (isAdmin) setWarehouses(whRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
    }
  };

  const handleWarehouseChange = (val) => {
    setSelectedWarehouseId(val);
    form.resetFields(['engine_no', 'chassis_no']);
    setSelectedVehicle(null);
    fetchInitialData(val);
  };

  const handleVehicleSelect = (id) => {
    const vehicle = availableStock.find(v => v.id === id);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      form.setFieldsValue({ 
        engine_no: vehicle.engine_no,
        chassis_no: vehicle.chassis_no 
      });
      setShowPriceWarning(false);
    }
  };

  const handlePriceChange = (value) => {
    if (selectedVehicle && selectedVehicle.price_vnd) {
      if (Number(value) < Number(selectedVehicle.price_vnd)) {
        setShowPriceWarning(true);
      } else {
        setShowPriceWarning(false);
      }
    }
    // Tự động gợi ý trả đủ
    if (!form.getFieldValue('paid_amount')) {
        form.setFieldValue('paid_amount', value);
    }
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      await api.post('/retail-sales', {
        ...values,
        vehicle_id: selectedVehicle ? selectedVehicle.id : null,
        warehouse_id: selectedWarehouseId, 
        sale_date: values.sale_date.toISOString(),
        guarantee: values.guarantee ? 'Có' : 'Không'
      });
      message.success('Đã bán lẻ xe thành công!');
      form.resetFields();
      setSelectedVehicle(null);
      setShowPriceWarning(false);
      fetchInitialData();
    } catch (error) {
      message.error('Lỗi: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/retail-sales/${id}`);
      message.success('Đã xóa đơn bán và khôi phục trạng thái xe.');
      fetchInitialData();
    } catch (error) {
      message.error('Lỗi xóa: ' + error.message);
    }
  };

  const columns = [
    { title: 'Ngày bán', dataIndex: 'sale_date', key: 'date', render: d => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Số Máy', dataIndex: 'engine_no', key: 'engine_no' },
    { title: 'Tên Khách', dataIndex: 'customer_name', key: 'customer' },
    { title: 'Giá bán', dataIndex: 'sale_price', render: v => <b>{Number(v).toLocaleString()}</b> },
    { title: 'Đã trả', dataIndex: 'paid_amount', render: v => <Text type="success">{Number(v).toLocaleString()}</Text> },
    { 
      title: 'Tác vụ', 
      key: 'action', 
      hidden: !isAdmin,
      render: (_, r) => isAdmin ? (
        <Popconfirm title="Xóa đơn bán này?" onConfirm={() => handleDelete(r.id)}>
          <Button type="text" danger icon={<Trash2 size={16} />} />
        </Popconfirm>
      ) : null
    },
  ];

  const handleExport = () => {
    if (salesHistory.length === 0) return message.warning('Không có lịch sử để xuất!');
    const exportData = salesHistory.map(s => ({
        'Ngày bán': dayjs(s.sale_date).format('DD/MM/YYYY'),
        'Số Máy': s.engine_no,
        'Số Khung': s.chassis_no,
        'Tên Khách': s.customer_name,
        'SĐT': s.phone,
        'Giá bán': Number(s.sale_price || s.total_price),
        'Đã trả': Number(s.paid_amount),
        'NV Bán': s.seller?.full_name || 'N/A'
    }));
    exportToExcel(exportData, `LichSuBanLe_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>BÁN LẺ XE MÁY TRỰC TIẾP</Title>
        <Badge count={availableStock.length} color="#10b981" title="Xe đang có trong kho">
           <Button icon={<Car size={18} />} ghost>Xe tồn kho</Button>
        </Badge>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={11}>
          <Card 
            title={<Space><ShoppingBag size={18} /> Hóa đơn bán lẻ</Space>} 
            className="glass-card"
            extra={selectedVehicle && (
              <div style={{ textAlign: 'right' }}>
                <Tag color="blue">{selectedVehicle.VehicleType?.name}</Tag>
                <Tag color="purple">{selectedVehicle.VehicleColor?.color_name}</Tag>
              </div>
            )}
          >
            <Form 
              form={form} 
              layout="vertical" 
              onFinish={onFinish} 
              initialValues={{ 
                sale_type: 'Hồ sơ xe', 
                guarantee: false,
                seller_id: user.id
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12} md={isAdmin ? 8 : 12}>
                  <Form.Item label="Ngày bán hàng" name="sale_date" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={12} md={isAdmin ? 8 : 12}>
                  <Form.Item label="Người bán" name="seller_id" rules={[{ required: true }]}>
                    <Select size="large" placeholder="Chọn nhân viên bán..." disabled={!isAdmin}>
                        {employees.map(e => <Option key={e.id} value={e.id}>{e.full_name}</Option>)}
                    </Select>
                  </Form.Item>

                </Col>
                {isAdmin && (
                  <Col xs={24} md={8}>
                    <Form.Item label="Kho xuất bán" required>
                       <Select size="large" value={selectedWarehouseId} onChange={handleWarehouseChange} placeholder="Chọn kho...">
                          {warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
                       </Select>
                    </Form.Item>
                  </Col>
                )}
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item label="Số Máy (Tìm xe)" name="engine_no" rules={[{ required: true }]}>
                    <Select showSearch size="large" placeholder="Chọn số máy..." onChange={handleVehicleSelect}>
                        {availableStock.map(v => <Option key={v.id} value={v.id}>{v.engine_no}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Số Khung (Tìm xe)" name="chassis_no" rules={[{ required: true }]}>
                    <Select showSearch size="large" placeholder="Chọn số khung..." onChange={handleVehicleSelect}>
                        {availableStock.map(v => <Option key={v.id} value={v.id}>{v.chassis_no}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Form.Item label="Tên khách mua" name="customer_name" rules={[{ required: true }]}>
                        <Input size="large" placeholder="Họ và tên khách hàng..." prefix={<User size={16} />} />
                    </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item label="Số điện thoại" name="phone">
                    <Input size="large" placeholder="09xxx..." prefix={<Smartphone size={16} />} />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item label="Số CCCD" name="id_card">
                    <Input size="large" placeholder="CCCD..." />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={16} md={18}>
                  <Form.Item label="Địa chỉ" name="address">
                    <Input size="large" placeholder="Tỉnh, Huyện, Xã..." prefix={<MapPin size={16} />} />
                  </Form.Item>
                </Col>
                <Col xs={8} md={6}>
                  <Form.Item label="Giới tính" name="gender">
                    <Select size="large">
                      <Option value="Trai">Nam</Option>
                      <Option value="Gái">Nữ</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={12} md={8}>
                  <Form.Item label="Giá bán" name="sale_price" rules={[{ required: true }]}>
                    <InputNumber 
                        size="large" 
                        style={{ width: '100%' }} 
                        onChange={handlePriceChange}
                        formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={8}>
                  <Form.Item label="Tiền thực thu" name="paid_amount" rules={[{ required: true }]}>
                    <InputNumber 
                        size="large" 
                        style={{ width: '100%' }}
                        placeholder="Số tiền khách trả..."
                        formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Loại bán" name="sale_type">
                    <Select size="large">
                      <Option value="Hồ sơ xe">Giao hồ sơ</Option>
                      <Option value="Làm đăng kí">Làm đăng ký</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {showPriceWarning && (
                <Alert message="Giá bán thấp hơn giá nhập!" type="warning" showIcon style={{ marginBottom: 16 }} />
              )}

              <Collapse ghost size="small">
                <Panel header={<Text type="secondary" style={{ fontSize: 12 }}>Thông tin bảo lãnh & bảo hành</Text>} key="1">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Người bảo lãnh" name="guarantor_name">
                        <Input size="large" placeholder="Tên..." prefix={<UserPlus size={16} />} />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                      <Form.Item label="SĐT bảo lãnh" name="guarantor_phone">
                        <Input size="large" placeholder="SĐT..." />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                        <Form.Item name="guarantee" valuePropName="checked" noStyle>
                            <Checkbox>Phát sổ bảo hành</Checkbox>
                        </Form.Item>
                    </Col>
                  </Row>
                </Panel>
              </Collapse>
              <Form.Item label="Ghi chú thêm" name="notes" style={{ marginTop: 16 }}>
                <Input.TextArea rows={2} placeholder="Các quà tặng đi kèm..." />
              </Form.Item>

              <Button 
                block 
                type="primary" 
                size="large" 
                htmlType="submit" 
                loading={loading} 
                style={{ height: 48, fontWeight: 'bold' }}
              >
                XÁC NHẬN XUẤT HÓA ĐƠN
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={13}>
          <Card 
            title="Lịch sử giao dịch gần đây" 
            className="glass-card"
            extra={
                <Space>
                    <Button 
                        icon={<Download size={16} />} 
                        onClick={handleExport}
                        size="small"
                        ghost
                    >
                        Xuất lịch sử
                    </Button>
                    <Button 
                        icon={<FileSpreadsheet size={16} />} 
                        type="primary" 
                        ghost 
                        size="small"
                        onClick={() => setImportVisible(true)}
                        disabled={!isAdmin}
                    >
                        Nhập từ Excel
                    </Button>
                </Space>
            }
          >
            <Table dataSource={salesHistory} columns={columns} rowKey="id" pagination={{ pageSize: 12 }} size="small" />
          </Card>
          
          <ImportExcelModal 
            visible={importVisible}
            onCancel={() => setImportVisible(false)}
            onSuccess={fetchInitialData}
            type="retail_sales"
            title="Nhập danh sách bán lẻ từ Excel"
          />
        </Col>
      </Row>
    </div>
  );
};

export default RetailSalePage;
