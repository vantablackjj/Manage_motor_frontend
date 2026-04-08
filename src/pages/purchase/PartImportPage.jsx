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
  InputNumber,
  Select,
  DatePicker,
  Card,
  Divider,
  AutoComplete
} from 'antd';
import { PlusCircle, Search, Trash2, Save, RotateCcw, Box, User, Receipt, Calculator, ChevronRight } from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;

const PartImportPage = () => {
  const [form] = Form.useForm();
  const [items, setItems] = useState([
    {
      key: Date.now(),
      part_id: null,
      code: "",
      name: "",
      unit: "",
      quantity: 1,
      unit_price: 0,
      conversion_rate: 1,
      total_price: 0,
    },
  ]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [allParts, setAllParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Search Results for Parts
  const [partOptions, setPartOptions] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [suppRes, whRes, partsRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/warehouses'),
        api.get('/parts')
      ]);
      setSuppliers(suppRes.data);
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
    const v = value.toLowerCase();
    const filtered = allParts.filter(
      (p) => p.code.toLowerCase().includes(v) || p.name.toLowerCase().includes(v),
    );
    setPartOptions(
      filtered.slice(0, 15).map((p) => ({
        value: p.code,
        label: `${p.code} - ${p.name}`,
        part: p,
      })),
    );
  };

  const addRow = () => {
    setItems([
      ...items,
      {
        key: Date.now(),
        part_id: null,
        code: "",
        name: "",
        unit: "",
        quantity: 1,
        unit_price: 0,
        conversion_rate: 1,
        total_price: 0,
      },
    ]);
  };

  const handleSelectPart = (key, part) => {
    const newItems = items.map((item) => {
      if (item.key === key) {
        return {
          ...item,
          part_id: part.id,
          code: part.code,
          name: part.name,
          unit: part.unit,
          unit_price: part.purchase_price || 0,
          conversion_rate: part.default_conversion_rate || 1,
          total_price: (part.purchase_price || 0) * item.quantity,
        };
      }
      return item;
    });
    setItems(newItems);
  };

  const removeItem = (key) => {
    if (items.length === 1) {
      setItems([
        {
          key: Date.now(),
          part_id: null,
          code: "",
          name: "",
          unit: "",
          quantity: 1,
          unit_price: 0,
          conversion_rate: 1,
          total_price: 0,
        },
      ]);
      return;
    }
    setItems(items.filter((i) => i.key !== key));
  };

  const updateItem = (key, field, value) => {
    const newItems = items.map(item => {
      if (item.key === key) {
        const updated = { ...item, [field]: value };
        // Update total
        updated.total_price = Number(updated.quantity) * Number(updated.unit_price);
        return updated;
      }
      return item;
    });
    setItems(newItems);
  };

  const calculateTotal = () => {
    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.total_price || 0),
      0,
    );
    const vatPercent = form.getFieldValue("vat_percent") || 0;
    return subtotal * (1 + vatPercent / 100);
  };

  const resetAll = () => {
    setItems([
      {
        key: Date.now(),
        part_id: null,
        code: "",
        name: "",
        unit: "",
        quantity: 1,
        unit_price: 0,
        conversion_rate: 1,
        total_price: 0,
      },
    ]);
    form.resetFields();
  };

  const onFinish = async (values) => {
    const validItems = items.filter((i) => i.part_id);
    if (validItems.length === 0) {
      return message.error("Vui lòng chọn ít nhất một phụ tùng!");
    }

    setSubmitLoading(true);
    try {
      const payload = {
        ...values,
        purchase_date: values.purchase_date.toISOString(),
        items: validItems.map((i) => ({
          part_id: i.part_id,
          quantity: i.quantity,
          unit: i.unit,
          unit_price: i.unit_price,
          conversion_rate: i.conversion_rate,
          description: i.name,
        })),
      };

      await api.post("/part-purchase", payload);
      message.success("Nhập hàng thành công!");
      resetAll();
    } catch (error) {
      message.error(
        "Lỗi khi lưu hóa đơn: " +
          (error.response?.data?.message || error.message),
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    {
      title: "Mã Phụ Tùng",
      dataIndex: "code",
      key: "code",
      width: 200,
      render: (text, record) => (
        <AutoComplete
          style={{ width: "100%" }}
          onSearch={handlePartSearch}
          options={partOptions}
          value={text}
          onSelect={(val, option) => handleSelectPart(record.key, option.part)}
          onChange={(val) => updateItem(record.key, "code", val)}
          placeholder="Mã PT..."
        >
          <Input size="large" />
        </AutoComplete>
      ),
    },
    {
      title: "Tên Phụ Tùng",
      dataIndex: "name",
      key: "name",
      width: 250,
      render: (text, record) => (
        <Input
          size="large"
          value={text}
          placeholder="Tên phụ tùng..."
          onChange={(e) => updateItem(record.key, "name", e.target.value)}
        />
      ),
    },
    {
      title: "Đơn vị nhập",
      dataIndex: "unit",
      key: "unit",
      width: 120,
      render: (text, record) => (
        <Input
          size="large"
          value={text}
          onChange={(e) => updateItem(record.key, "unit", e.target.value)}
        />
      ),
    },
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 100,
      render: (value, record) => (
        <InputNumber
          size="large"
          min={1}
          value={value}
          onChange={(v) => updateItem(record.key, "quantity", v)}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Quy đổi",
      dataIndex: "conversion_rate",
      key: "conversion_rate",
      width: 150,
      render: (value, record) => (
        <Space direction="vertical" size={0} style={{ width: "100%" }}>
          <InputNumber
            size="large"
            min={1}
            value={value}
            onChange={(v) => updateItem(record.key, "conversion_rate", v)}
            style={{ width: "100%" }}
          />
          <Text type="secondary" style={{ fontSize: "11px" }}>
            = {Number(record.quantity * (value || 1)).toLocaleString()}{" "}
            {record.unit} lẻ
          </Text>
        </Space>
      ),
    },
    {
      title: "Đơn giá (đ)",
      dataIndex: "unit_price",
      key: "unit_price",
      width: 150,
      render: (value, record) => (
        <InputNumber
          size="large"
          min={0}
          value={value}
          className="modern-input-number"
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
          parser={(v) => v.replace(/\$\s?|(\.*)/g, "")}
          onChange={(v) => updateItem(record.key, "unit_price", v)}
          style={{ width: "100%" }}
        />
      ),
    },
    { 
        title: 'Thành tiền', 
        dataIndex: 'total_price', 
        key: 'total_price',
        render: (v) => <Text strong>{Number(v || 0).toLocaleString()} đ</Text>
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<Trash2 size={16} />}
          onClick={() => removeItem(record.key)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={24}>
        {/* LEFT PANEL: INVOICE INFO */}
        <Col xs={24} lg={7}>
          <div className="glass-card" style={{ padding: 24, position: 'sticky', top: 24 }}>
            <Title level={4} style={{ marginBottom: 20, display: 'flex', alignItems: 'center' }}>
                <Receipt size={20} style={{ marginRight: 8 }} /> THÔNG TIN HÓA ĐƠN
            </Title>
            
            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ purchase_date: dayjs(), vat_percent: 0 }}>
                <Form.Item label="Ngày nhập" name="purchase_date" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" size="large" />
                </Form.Item>

                <Form.Item label="Nhà cung cấp" name="supplier_id" rules={[{ required: true }]}>
                    <Select placeholder="Chọn nhà cung cấp" size="large">
                        {suppliers.map(s => <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>)}
                    </Select>
                </Form.Item>

                <Form.Item label="Nhập về kho" name="warehouse_id" rules={[{ required: true }]}>
                    <Select placeholder="Chọn kho nhận" size="large">
                        {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                    </Select>
                </Form.Item>

                <Form.Item label="Số hóa đơn gốc" name="invoice_no">
                  <Input placeholder="Mã HĐ từ NCC..." size="large" />
                </Form.Item>

                <div style={{ padding: "8px 0" }}>
                  <Button
                    icon={<RotateCcw size={16} />}
                    onClick={resetAll}
                    style={{ marginRight: 8 }}
                  >
                    Làm mới
                  </Button>
                </div>

                <Divider style={{ margin: "16px 0" }} />

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: 16, borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Row justify="space-between" align="middle" style={{ marginBottom: 8 }}>
                        <Text>Tổng tiền hàng:</Text>
                        <Text strong style={{ fontSize: 16 }}>{items.reduce((sum, i) => sum + i.total_price, 0).toLocaleString()} đ</Text>
                    </Row>
                    <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                        <Text>VAT (%):</Text>
                        <Form.Item name="vat_percent" style={{ margin: 0 }}>
                            <InputNumber min={0} max={100} size="small" style={{ width: 60 }} onChange={() => form.submit()} />
                        </Form.Item>
                    </Row>
                    <Divider style={{ margin: '12px 0' }} />
                    <Row justify="space-between" align="middle">
                        <Text strong>TỔNG CỘNG:</Text>
                        <Title level={4} style={{ margin: 0, color: 'var(--primary-color)' }}>
                            {calculateTotal().toLocaleString()} đ
                        </Title>
                    </Row>
                </div>

                <Form.Item label="Tiền đã thanh toán" name="paid_amount" style={{ marginTop: 16 }}>
                    <InputNumber 
                        style={{ width: '100%' }}
                        size="large"
                        formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                        parser={(v) => v.replace(/\$\s?|(\.*)/g, "")}
                    />
                </Form.Item>

                <Form.Item label="Ghi chú" name="notes">
                    <Input.TextArea rows={2} />
                </Form.Item>

                <Button 
                    type="primary" 
                    size="large" 
                    block 
                    icon={<Save size={18} />} 
                    onClick={() => form.submit()}
                    loading={submitLoading}
                    style={{ height: 48, borderRadius: 12, marginTop: 12 }}
                >
                    LƯU HÓA ĐƠN
                </Button>
            </Form>
          </div>
        </Col>

        {/* RIGHT PANEL: ITEMS GRID */}
        <Col xs={24} lg={17}>
          <div className="glass-card" style={{ padding: 24, minHeight: 'calc(100vh - 48px)' }}>
            <div
              style={{
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Title level={4} style={{ margin: 0 }}>
                CHI TIẾT LINH KIỆN NHẬP
              </Title>
              <Button
                type="primary"
                icon={<PlusCircle size={18} />}
                onClick={addRow}
              >
                Thêm linh kiện
              </Button>
            </div>

            <Table 
                dataSource={items} 
                columns={columns} 
                pagination={false}
                className="modern-table"
                locale={{ emptyText: 'Chưa có linh kiện nào được chọn. Hãy tìm kiếm ở trên để thêm.' }}
                summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={6} textAlign="right">
                          <Text strong>Tổng cộng:</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>
                          <Text strong type="danger" style={{ fontSize: 16 }}>
                            {items.reduce((sum, i) => sum + i.total_price, 0).toLocaleString()} đ
                          </Text>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                )}
            />
            
            <div style={{ marginTop: 24, textAlign: 'center', opacity: 0.5 }}>
                <Paragraph>
                    <Calculator size={14} style={{ marginRight: 4 }} /> 
                    Số lượng tồn kho sẽ được quy đổi tự động: 1 [Đơn vị nhập] = [Quy đổi] [Đơn vị cơ bản]
                </Paragraph>
            </div>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default PartImportPage;
