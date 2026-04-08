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
  message, 
  InputNumber, 
  Select, 
  DatePicker, 
  Divider, 
  AutoComplete,
  Card
} from 'antd';
import { ShoppingCart, User, Smartphone, Save, Trash2, Search, Calculator } from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const PartRetailPage = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [allParts, setAllParts] = useState([]);
  const [partOptions, setPartOptions] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whRes, partsRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/parts')
      ]);
      setWarehouses(whRes.data);
      setAllParts(partsRes.data);
    } catch (error) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const addItem = (part) => {
    const key = Date.now();
    setItems([...items, {
        key,
        part_id: part.id,
        code: part.code,
        name: part.name,
        unit: part.unit,
        quantity: 1,
        unit_price: part.selling_price || 0,
        total_price: part.selling_price || 0
    }]);
  };

  const updateItem = (key, field, value) => {
    setItems(items.map(item => {
        if (item.key === key) {
            const updated = { ...item, [field]: value };
            updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
            return updated;
        }
        return item;
    }));
  };

  const calculateTotal = () => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.total_price), 0);
    const vatPercent = form.getFieldValue('vat_percent') || 0;
    return subtotal * (1 + vatPercent / 100);
  };

  const onFinish = async (values) => {
    if (items.length === 0) return message.error('Chưa có linh kiện để bán!');
    setSubmitLoading(true);
    try {
      const payload = {
        ...values,
        sale_date: values.sale_date.toISOString(),
        sale_type: 'Retail',
        items: items
      };
      await api.post('/part-sale', payload);
      message.success('Đã lưu hóa đơn bán lẻ phụ tùng!');
      setItems([]);
      form.resetFields();
    } catch (error) {
      message.error('Lỗi khi lưu: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    { title: 'Mã PT', dataIndex: 'code', key: 'code', width: 140 },
    { title: 'Tên Phụ tùng', dataIndex: 'name', key: 'name' },
    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit', width: 100 },
    { 
        title: 'SL', 
        dataIndex: 'quantity', 
        key: 'quantity',
        width: 100,
        render: (v, record) => <InputNumber min={1} value={v} onChange={(val) => updateItem(record.key, 'quantity', val)} />
    },
    { 
        title: 'Giá bán (đ)', 
        dataIndex: 'unit_price', 
        key: 'unit_price',
        render: (v, record) => (
            <InputNumber 
                min={0} 
                value={v} 
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                parser={(val) => val.replace(/\$\s?|(\.*)/g, "")}
                onChange={(val) => updateItem(record.key, 'unit_price', val)} 
                style={{ width: '100%' }}
            />
        )
    },
    { title: 'Thành tiền', dataIndex: 'total_price', key: 'total', render: (v) => <Text strong>{Number(v).toLocaleString()} đ</Text> },
    { title: '', key: 'action', width: 50, render: (_, record) => <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => setItems(items.filter(i => i.key !== record.key))} /> }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={24}>
        <Col xs={24} lg={8}>
          <div className="glass-card" style={{ padding: 24, position: 'sticky', top: 24 }}>
            <Title level={4} style={{ marginBottom: 20 }}><ShoppingCart size={20} style={{ marginRight: 8, marginBottom: -4 }} /> CHI TIẾT BÁN LẺ</Title>
            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ sale_date: dayjs(), vat_percent: 0 }}>
                <Form.Item label="Ngày bán" name="sale_date" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" />
                </Form.Item>
                <Form.Item label="Tên khách hàng" name="customer_name">
                    <Input size="large" prefix={<User size={16} />} />
                </Form.Item>
                <Form.Item label="Số điện thoại" name="customer_phone">
                    <Input size="large" prefix={<Smartphone size={16} />} />
                </Form.Item>
                <Form.Item label="Xuất từ kho" name="warehouse_id" rules={[{ required: true }]}>
                    <Select size="large">
                        {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                    </Select>
                </Form.Item>

                <Divider />
                
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text>Tổng tiền hàng:</Text>
                        <Text strong style={{ fontSize: 16 }}>{items.reduce((sum, i) => sum + i.total_price, 0).toLocaleString()} đ</Text>
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

                <Form.Item label="Khách đã trả" name="paid_amount" style={{ marginTop: 16 }}>
                    <InputNumber size="large" style={{ width: '100%' }} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")} />
                </Form.Item>

                <Button type="primary" block size="large" icon={<Save size={20} />} onClick={() => form.submit()} loading={submitLoading} style={{ marginTop: 12 }}>
                    XUẤT HÓA ĐƠN
                </Button>
            </Form>
          </div>
        </Col>

        <Col xs={24} lg={16}>
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={4} style={{ margin: 0 }}>LINH KIỆN ĐÃ CHỌN</Title>
                <div style={{ width: 350 }}>
                    <AutoComplete
                        style={{ width: '100%' }}
                        onSearch={handlePartSearch}
                        onSelect={(val, option) => addItem(option.part)}
                        options={partOptions}
                        placeholder="🔍 Tìm phụ tùng..."
                    >
                        <Input size="large" />
                    </AutoComplete>
                </div>
            </div>
            <Table dataSource={items} columns={columns} pagination={false} className="modern-table" />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default PartRetailPage;
