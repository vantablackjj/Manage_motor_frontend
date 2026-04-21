import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
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
  InputNumber,
  Select,
  DatePicker,
  Divider,
  AutoComplete,
  Tag,
  Badge
} from 'antd';
import { 
    Search, Trash2, Save, RotateCcw, Wrench, User, 
    Smartphone, Calendar, CreditCard, ChevronRight,
    Bike, ShieldCheck, HelpCircle, FileText, PlusCircle, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import api from '../../utils/api';
import { capitalizeName } from '../../utils/stringHelper';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;

const RepairServicePage = () => {
  const [form] = Form.useForm();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const isEditing = !!id;
  const selectedWarehouse = Form.useWatch('warehouse_id', form);
  
  // Master Data
  const [warehouses, setWarehouses] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [allParts, setAllParts] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [liftTables, setLiftTables] = useState([]);
  const [partOptions, setPartOptions] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);

  // Vehicle Context
  const [vehicleFound, setVehicleFound] = useState(null); // { internal: true/false, data: ... }
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whRes, mechanicsRes, partsRes, liftRes, typesRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/mechanics'),
        api.get('/parts'),
        api.get('/lift-tables'),
        api.get('/vehicle-types')
      ]);
      setWarehouses(whRes.data);
      setMechanics(mechanicsRes.data.filter(m => m.is_active));
      setAllParts(partsRes.data);
      setLiftTables(liftRes.data);
      setVehicleTypes(typesRes.data);

      if (isEditing) {
          fetchOrderDetails();
      } else if (location.state?.lift_id) {
          form.setFieldsValue({ 
              lift_table_id: location.state.lift_id,
              warehouse_id: location.state.warehouse_id
          });
      }
    } catch (error) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetails = async () => {
      try {
          const res = await api.get('/maintenance-orders'); // In a real app, use /maintenance-orders/:id if exists
          // Since the dummy API search uses full text, we find the specific one
          const order = res.data.find(o => o.id === id);
          if (order) {
              form.setFieldsValue({
                  ...order,
                  maintenance_date: dayjs(order.maintenance_date)
              });
              setItems(order.MaintenanceItems.map(item => ({
                  key: item.id,
                  id: item.id,
                  type: item.type,
                  part_id: item.part_id,
                  description: item.type === 'PART' ? item.Part?.name : item.description,
                  unit: item.unit,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  total_price: item.total_price
              })));
              setVehicleFound({ internal: order.is_internal_vehicle });
          }
      } catch (e) {
          message.error('Lỗi tải chi tiết phiếu: ' + e.message);
      }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleVehicleAutoCompleteSearch = async (value) => {
    if (!value || value.length < 2) {
        setVehicleOptions([]);
        return;
    }
    try {
        const [vRes, hRes] = await Promise.all([
            api.get(`/vehicles?search=${value}`),
            api.get(`/maintenance-orders?search=${value}`)
        ]);

        const options = [];
        
        // From Master Vehicles
        vRes.data.forEach(v => {
            options.push({
                value: v.engine_no,
                label: `${v.engine_no} | ${v.VehicleType?.name || ''} | ${v.RetailSale?.customer_name || 'Xe kho'}`,
                vehicle: v,
                type: 'MASTER'
            });
        });

        // From History (for vehicles not in master or seen before)
        hRes.data.forEach(h => {
            // Avoid duplicates
            if (!options.find(o => o.value === h.engine_no)) {
                options.push({
                    value: h.engine_no || h.license_plate,
                    label: `${h.license_plate || h.engine_no} | ${h.model_name} | ${h.customer_name} (Lịch sử)`,
                    history: h,
                    type: 'HISTORY'
                });
            }
        });

        setVehicleOptions(options);
    } catch (e) {
        console.error(e);
    }
  };

  const handleVehicleSearch = async (searchValue, selectedOption = null) => {
    const value = searchValue || (selectedOption?.value);
    if (!value) return;
    setLoading(true);
    try {
        let vehicleData = selectedOption?.vehicle;
        let historyData = selectedOption?.history;

        // If not from autocomplete selection, fetch now
        if (!selectedOption) {
            const res = await api.get(`/vehicles?search=${value}`);
            if (res.data.length > 0) vehicleData = res.data[0];
        }

        const historyRes = await api.get(`/maintenance-orders?search=${value}`);
        setMaintenanceHistory(historyRes.data);
        if (!historyData && historyRes.data.length > 0) historyData = historyRes.data[0];

        if (vehicleData) {
            setVehicleFound({ internal: true, data: vehicleData });
            message.success('Tìm thấy xe trong hệ thống!');
            
            form.setFieldsValue({
                engine_no: vehicleData.engine_no,
                chassis_no: vehicleData.chassis_no,
                license_plate: vehicleData.license_plate || form.getFieldValue('license_plate'),
                model_name: vehicleData.VehicleType?.name,
                customer_name: vehicleData.RetailSale?.customer_name || historyData?.customer_name,
                customer_phone: vehicleData.RetailSale?.phone || historyData?.customer_phone,
                customer_address: vehicleData.RetailSale?.address || historyData?.customer_address
            });
        } else if (historyData) {
            setVehicleFound({ internal: false });
            message.info('Tìm thấy lịch sử bảo trì trước đó.');
            form.setFieldsValue({
                engine_no: historyData.engine_no,
                chassis_no: historyData.chassis_no,
                license_plate: historyData.license_plate,
                model_name: historyData.model_name,
                customer_name: historyData.customer_name,
                customer_phone: historyData.customer_phone,
                customer_address: historyData.customer_address
            });
        } else {
            setVehicleFound({ internal: false });
            message.info('Xe mới. Vui lòng nhập thông tin thủ công.');
        }
    } catch (error) {
        console.error(error);
        message.error('Lỗi tìm kiếm: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  const handlePartSearch = (value) => {
    const filtered = allParts.filter(p => 
        p.code.toLowerCase().includes(value.toLowerCase()) || 
        p.name.toLowerCase().includes(value.toLowerCase())
    );
    setPartOptions(filtered.map(p => ({
        value: p.code,
        label: `${p.code} - ${p.name}`,
        part: p
    })));
  };

  const addPartItem = (part) => {
    const key = Date.now();
    setItems([...items, {
        key,
        type: 'PART',
        part_id: part.id,
        description: part.name,
        unit: part.unit,
        quantity: 1,
        unit_price: part.selling_price || 0,
        total_price: part.selling_price || 0
    }]);
  };

  const addServiceItem = () => {
    const key = Date.now();
    setItems([...items, {
        key,
        type: 'SERVICE',
        part_id: null,
        description: '',
        unit: 'Công',
        quantity: 1,
        unit_price: 0,
        total_price: 0
    }]);
  };

  const updateItem = (key, field, value) => {
    const newItems = items.map(item => {
      if (item.key === key) {
        const updated = { ...item, [field]: value };
        updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
        return updated;
      }
      return item;
    });
    setItems(newItems);
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.total_price), 0);
    const vatPercent = form.getFieldValue('vat_percent') || 0;
    return subtotal * (1 + vatPercent / 100);
  };

  const onFinish = async (values) => {
    if (items.length === 0) return message.error('Chưa có hạng mục sửa chữa!');
    setSubmitLoading(true);
    try {
      const payload = {
        ...values,
        maintenance_date: values.maintenance_date.toISOString(),
        items: items
      };
      
      if (isEditing) {
          await api.put(`/maintenance-order/${id}`, payload);
          message.success('Đã cập nhật hóa đơn bảo trì!');
          // If status completed/cancelled, free up the lift table automatically (handled by status field in order)
      } else {
          // If creating new and assigning lift, it will trigger BUSY status logic (via status field)
          await api.post('/maintenance-order', payload);
          message.success('Đã lưu hóa đơn bảo trì!');
      }

      const goToBoard = confirm('Bạn có muốn quay lại Bảng điều phối bàn nâng?');
      if (goToBoard) {
          navigate('/lift-tables');
      } else {
          if (!isEditing) {
              form.resetFields();
              setItems([]);
              setVehicleFound(null);
          }
      }
    } catch (error) {
      message.error('Lỗi khi lưu: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    { 
        title: 'Hạng mục', 
        dataIndex: 'type', 
        key: 'type',
        width: 100,
        render: (type) => type === 'PART' ? <Tag color="blue">Phụ tùng</Tag> : <Tag color="orange">Tiền công</Tag>
    },
    { 
        title: 'Nội dung sửa chữa / Tên linh kiện', 
        dataIndex: 'description', 
        key: 'description',
        render: (text, record) => (
            record.type === 'SERVICE' ? 
            <Input 
                value={text} 
                placeholder="Ví dụ: Làm hơi, Thay dầu..." 
                onChange={(e) => updateItem(record.key, 'description', e.target.value)} 
            /> : 
            <Text>{text}</Text>
        )
    },
    { 
        title: 'Đơn vị', 
        dataIndex: 'unit', 
        key: 'unit',
        width: 80,
    },
    { 
        title: 'SL', 
        dataIndex: 'quantity', 
        key: 'quantity',
        width: 80,
        render: (v, record) => (
            <InputNumber min={1} value={v} onChange={(val) => updateItem(record.key, 'quantity', val)} />
        )
    },
    { 
        title: 'Đơn giá (đ)', 
        dataIndex: 'unit_price', 
        key: 'unit_price',
        width: 150,
        render: (v, record) => (
            <InputNumber 
                min={0} 
                value={v} 
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                parser={(val) => val.replace(/\./g, "")}
                onChange={(val) => updateItem(record.key, 'unit_price', val)} 
                style={{ width: '100%' }}
            />
        )
    },
    { 
        title: 'Thành tiền', 
        dataIndex: 'total_price', 
        key: 'total_price',
        width: 150,
        render: (v) => <Text strong>{Number(v || 0).toLocaleString()} đ</Text>
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => setItems(items.filter(i => i.key !== record.key))} />
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={24}>
        {/* LEFT PANEL: VEHICLE & CUSTOMER */}
        <Col xs={24} lg={8}>
          <div className="glass-card" style={{ padding: 24 }}>
            <Title level={4} style={{ marginBottom: 20 }}>
                <Wrench size={20} style={{ marginRight: 8, marginBottom: -3 }} /> THÔNG TIN BẢO TRÌ
            </Title>
            
            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ maintenance_date: dayjs(), vat_percent: 0 }}>
                {/* Vehicle Search Section */}
                <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text strong>TÌM KIẾM XE</Text>
                        {vehicleFound?.internal ? <Badge status="success" text="Xe hệ thống" /> : vehicleFound?.internal === false ? <Badge status="warning" text="Xe ngoài" /> : null}
                    </div>
                    <AutoComplete
                        options={vehicleOptions}
                        onSearch={handleVehicleAutoCompleteSearch}
                        onSelect={(val, option) => handleVehicleSearch(val, option)}
                        style={{ width: '100%' }}
                    >
                        <Input.Search 
                            placeholder="Biển số / Số máy / Số khung..." 
                            size="large"
                            onSearch={(v) => handleVehicleSearch(v)}
                        />
                    </AutoComplete>
                    <Divider style={{ margin: '16px 0' }} />
                    <Row gutter={12}>
                        <Col span={10}>
                            <Form.Item label="Biển số" name="license_plate">
                                <Input placeholder="35H1-..." />
                            </Form.Item>
                        </Col>
                        <Col span={14}>
                            <Form.Item label="Số KM hiện tại" name="km_reading">
                                <InputNumber size="large" style={{ width: '100%' }} placeholder="Nhập số KM..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Số máy" name="engine_no">
                                <Input  />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Số khung" name="chassis_no">
                                <Input  />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item label="Loại xe / Model" name="model_name">
                                <Select 
                                    showSearch 
                                    placeholder="Chọn loại xe hoặc gõ tìm..."
                                    optionFilterProp="children"
                                    allowClear
                                >
                                    {vehicleTypes.map(t => <Select.Option key={t.id} value={t.name}>{t.name}</Select.Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* KM HISTORY COMPONENT */}
                    {maintenanceHistory.length > 0 && (
                        <div style={{ marginTop: 12, padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px dashed rgba(255,255,255,0.2)' }}>
                            <Text strong size="small" style={{ display: 'block', marginBottom: 8, color: 'var(--primary-color)' }}>
                                <Clock size={14} style={{ marginRight: 4 }} /> LỊCH SỬ KM CÁC LẦN TRƯỚC:
                            </Text>
                            <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                                {maintenanceHistory.map((h, idx) => (
                                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '12px' }}>
                                        <Text type="secondary">Lần {maintenanceHistory.length - idx}: {dayjs(h.maintenance_date).format('DD/MM/YY')}</Text>
                                        <Text strong>{Number(h.km_reading || 0).toLocaleString()} KM</Text>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <Title level={5}><User size={16} style={{ marginRight: 4 }} /> KHÁCH HÀNG</Title>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="Tên khách" name="customer_name">
                            <Input onBlur={(e) => form.setFieldsValue({ customer_name: capitalizeName(e.target.value) })} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Điện thoại" name="customer_phone">
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>

                <Title level={5}><FileText size={16} style={{ marginRight: 4 }} /> THU THẬP PHIẾU</Title>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="Nhân viên lập" name="created_by_dummy" initialValue={JSON.parse(localStorage.getItem('user'))?.full_name}>
                            <Input disabled />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Ngày thực hiện" name="maintenance_date" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Thợ chính" name="mechanic_1_id">
                            <Select placeholder="Chọn thợ">
                                {mechanics.map(m => <Select.Option key={m.id} value={m.id}>{m.mechanic_name}</Select.Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Thợ phụ" name="mechanic_2_id">
                            <Select placeholder="Chọn thợ">
                                {mechanics.map(m => <Select.Option key={m.id} value={m.id}>{m.mechanic_name}</Select.Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Xuất kho" name="warehouse_id">
                            <Select placeholder="Kho phụ tùng">
                                {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Phân loại" name="service_type">
                            <Select placeholder="Bảo hành/Sửa chữa">
                                <Select.Option value="Bảo hành">Bảo hành</Select.Option>
                                <Select.Option value="Sửa chữa">Sửa chữa</Select.Option>
                                <Select.Option value="Bảo dưỡng định kỳ">Bảo dưỡng định kỳ</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Vị trí bàn nâng" name="lift_table_id">
                            <Select placeholder="Chọn bàn nâng" allowClear>
                                {liftTables
                                    .filter(l => !selectedWarehouse || l.warehouse_id === selectedWarehouse)
                                    .map(l => (
                                        <Select.Option key={l.id} value={l.id}>
                                            {l.name} {l.status === 'BUSY' && l.id !== form.getFieldValue('lift_table_id') ? '(Đang bận)' : ''}
                                        </Select.Option>
                                    ))
                                }
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Trạng thái xử lý" name="status" initialValue="PENDING">
                            <Select>
                                <Select.Option value="PENDING">🕒 Đang chờ</Select.Option>
                                <Select.Option value="IN_PROGRESS">🛠️ Đang sửa</Select.Option>
                                <Select.Option value="COMPLETED">✅ Hoàn thành</Select.Option>
                                <Select.Option value="CANCELLED">❌ Hủy bỏ</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>

                <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: 20, borderRadius: 16, marginTop: 24, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Tiền công sửa chữa:</Text>
                        <Text strong>{items.filter(i => i.type === 'SERVICE').reduce((sum, i) => sum + i.total_price, 0).toLocaleString()} đ</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Tiền phụ tùng:</Text>
                        <Text strong>{items.filter(i => i.type === 'PART').reduce((sum, i) => sum + i.total_price, 0).toLocaleString()} đ</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <Text>VAT (%):</Text>
                        <Form.Item name="vat_percent" style={{ margin: 0 }}>
                            <InputNumber min={0} max={100} size="small" style={{ width: 60 }} />
                        </Form.Item>
                    </div>
                    <Divider style={{ margin: '12px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Title level={4} style={{ margin: 0 }}>TỔNG CỘNG:</Title>
                        <Title level={4} style={{ margin: 0, color: 'var(--primary-color)' }}>
                            {calculateTotal().toLocaleString()} đ
                        </Title>
                    </div>
                </div>

                <Space direction="vertical" style={{ width: '100%', marginTop: 24 }}>
                    <Button 
                        type="primary" 
                        size="large" 
                        block 
                        icon={<Save size={20} />} 
                        onClick={() => form.submit()}
                        loading={submitLoading}
                        style={{ height: 50, borderRadius: 12 }}
                    >
                        {isEditing ? 'LƯU THAY ĐỔI' : 'TẠO PHIẾU MỚI'}
                    </Button>
                    
                    {isEditing && form.getFieldValue('status') !== 'COMPLETED' && (
                        <Popconfirm
                            title="Bạn có chắc chắn muốn thanh toán và hoàn thành phiếu này?"
                            onConfirm={() => {
                                form.setFieldsValue({ 
                                    status: 'COMPLETED',
                                    paid_amount: calculateTotal()
                                });
                                form.submit();
                            }}
                            okText="Đồng ý"
                            cancelText="Hủy"
                        >
                            <Button 
                                type="primary" 
                                size="large" 
                                block 
                                icon={<CheckCircle size={20} />} 
                                loading={submitLoading}
                                style={{ height: 50, borderRadius: 12, backgroundColor: '#10b981', borderColor: '#10b981' }}
                            >
                                THANH TOÁN & HOÀN THÀNH
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            </Form>
          </div>
        </Col>

        {/* RIGHT PANEL: SERVICE CONTENT */}
        <Col xs={24} lg={16}>
          <div className="glass-card" style={{ padding: 24, minHeight: 'calc(100vh - 48px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>CHI TIẾT PHIẾU BẢO TRÌ</Title>
                <Space>
                    <Button icon={<PlusCircle size={16} />} onClick={addServiceItem}>Thêm tiền công</Button>
                    <div style={{ width: 350 }}>
                        <AutoComplete
                            style={{ width: '100%' }}
                            onSearch={handlePartSearch}
                            onSelect={(val, option) => addPartItem(option.part)}
                            options={partOptions}
                            placeholder="🔍 Tìm phụ tùng..."
                        >
                            <Input size="middle" />
                        </AutoComplete>
                    </div>
                </Space>
            </div>

            <Table 
                dataSource={items} 
                columns={columns} 
                pagination={false} 
                className="modern-table"
                locale={{ emptyText: 'Hãy thêm phụ tùng hoặc hạng mục tiền công ở trên.' }}
            />

            <div style={{ marginTop: 24 }}>
                <Text strong>Ghi chú / Tình trạng xe trước bảo trì:</Text>
                <Input.TextArea 
                    placeholder="Ghi chú thêm về tình trạng xe..." 
                    rows={4} 
                    style={{ marginTop: 8 }} 
                    onChange={(e) => form.setFieldsValue({ notes: e.target.value })}
                />
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default RepairServicePage;
