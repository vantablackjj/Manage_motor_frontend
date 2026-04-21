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
  AutoComplete,
  Tag,
  Modal,
  Tabs
} from 'antd';
import { PlusCircle, Search, Trash2, Save, RotateCcw, Box, User, Receipt, Calculator, ChevronRight, FileStack, Printer, Plus, History, Eye } from 'lucide-react';
import PrintPartPurchase from '../../components/PrintPartPurchase';
import { printReceipt } from '../../utils/printHelper';
import api from '../../utils/api';
import dayjs from 'dayjs';
import ImportExcelModal from '../../components/ImportExcelModal';

const { Text, Title } = Typography;

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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [selectedPurchaseDetail, setSelectedPurchaseDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
        const res = await api.get('/reports/parts/purchases', {
            params: {
                from_date: dayjs().startOf('month').format('YYYY-MM-DD'),
                to_date: dayjs().format('YYYY-MM-DD')
            }
        });
        setHistory(res.data);
    } catch (e) {
        console.error(e);
    } finally {
        setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchHistory();
  }, []);

  const handlePartSearch = (value = "") => {
    const v = value ? value.toLowerCase() : "";
    const filtered = allParts.filter(
      (p) => (p.code && p.code.toLowerCase().includes(v)) || (p.name && p.name.toLowerCase().includes(v)),
    );
    setPartOptions(
      filtered.slice(0, 30).map((p) => ({
        value: p.code,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
            <div style={{ flex: 1 }}>
              <Text strong style={{ display: 'block' }}>{p.code}</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>{p.name}</Text>
            </div>
            <div style={{ textAlign: 'right' }}>
                <Tag color="blue">{p.unit}</Tag>
                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: 2 }}>Giá lẻ: {Number(p.selling_price).toLocaleString()} đ</div>
            </div>
          </div>
        ),
        part: p,
      })),
    );
  };

  const addNewItem = () => {
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
          total_price: (part.purchase_price || 0) * (item.quantity || 1),
        };
      }
      return item;
    });
    setItems(newItems);
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
    return items.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  };

  const onFinish = async (values) => {
    const validItems = items.filter((i) => i.part_id);
    if (validItems.length === 0) return message.error("Vui lòng chọn ít nhất một phụ tùng!");

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
      setItems([{ key: Date.now(), part_id: null, code: "", name: "", unit: "", quantity: 1, unit_price: 0, conversion_rate: 1, total_price: 0 }]);
      form.resetFields();
      fetchHistory();
    } catch (error) {
      message.error("Lỗi khi lưu: " + (error.response?.data?.message || error.message));
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns = [
    { title: "Mã PT", dataIndex: "code", width: 150, render: (text, record) => (
        <AutoComplete options={partOptions} onSearch={handlePartSearch} value={text} onSelect={(val, option) => handleSelectPart(record.key, option.part)} onChange={(val) => updateItem(record.key, "code", val)}>
          <Input />
        </AutoComplete>
    )},
    { title: "Tên PT", dataIndex: "name", render: (text, record) => <Input value={text} onChange={(e) => updateItem(record.key, "name", e.target.value)} /> },
    { title: "SL", dataIndex: "quantity", width: 80, render: (v, r) => <InputNumber min={1} value={v} onChange={(v) => updateItem(r.key, "quantity", v)} /> },
    { title: "Đơn giá", dataIndex: "unit_price", width: 120, render: (v, r) => <InputNumber min={0} value={v} onChange={(v) => updateItem(r.key, "unit_price", v)} /> },
    { title: "Thành tiền", dataIndex: "total_price", render: (v) => <Text strong>{Number(v).toLocaleString()} đ</Text> },
    { title: "", width: 50, render: (_, r) => <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => setItems(items.filter(i => i.key !== r.key))} /> }
  ];

  const historyColumns = [
    { title: 'Ngày nhập', dataIndex: 'purchase_date', key: 'date', render: v => dayjs(v).format('DD/MM/YYYY') },
    { title: 'Nhà cung cấp', dataIndex: ['Supplier', 'name'], key: 'supplier' },
    { title: 'Kho nhập', dataIndex: ['Warehouse', 'warehouse_name'], key: 'warehouse' },
    { title: 'Tổng tiền', dataIndex: 'total_amount', align: 'right', render: v => <Text strong>{Number(v).toLocaleString()} đ</Text> },
    {
        title: 'Tác vụ',
        key: 'action',
        render: (_, r) => (
            <Space>
                <Button size="small" icon={<Eye size={14} />} onClick={() => { setSelectedPurchaseDetail(r); setIsDetailModalOpen(true); }} />
                <Button size="small" type="primary" ghost icon={<Printer size={14} />} onClick={() => { setSelectedPurchaseDetail(r); setTimeout(() => printReceipt('print-part-purchase-receipt'), 300); }} />
            </Space>
        )
    }
  ];

  return (
    <div className="page-container" style={{ padding: 24 }}>
      <div style={{ display: 'none' }}>
        <PrintPartPurchase 
          purchase={selectedPurchaseDetail} 
          items={selectedPurchaseDetail?.PartPurchaseItems} 
          warehouse={selectedPurchaseDetail?.Warehouse} 
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>QUẢN LÝ NHẬP KHO PHỤ TÙNG</Title>
        <Button 
          icon={<FileStack size={18} />} 
          onClick={() => setIsImportModalOpen(true)}
          style={{ 
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            color: 'var(--primary-color)',
            borderColor: 'var(--primary-color)'
          }}
        >
          Nhập từ Excel (Hóa đơn HVN)
        </Button>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        type="card"
        items={[
            {
                key: '1',
                label: <Space><Plus size={18} /> LẬP PHIẾU NHẬP MỚI</Space>,
                children: (
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={7}>
                        <Card className="glass-card" title={<Space><FileStack size={20} /> Thông tin chung</Space>}>
                            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ purchase_date: dayjs() }}>
                            <Form.Item label="Ngày nhập kho" name="purchase_date" rules={[{ required: true }]}>
                                <DatePicker style={{ width: "100%" }} size="large" format="DD/MM/YYYY" />
                            </Form.Item>

                            <Form.Item label="Nhà cung cấp" name="supplier_id" rules={[{ required: true }]}>
                                <Select size="large" placeholder="Chọn nhà cung cấp..." showSearch optionFilterProp="children">
                                    {suppliers.map((s) => (
                                        <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item label="Kho nhập hàng" name="warehouse_id" rules={[{ required: true }]}>
                                <Select size="large" placeholder="Chọn kho nhập...">
                                    {warehouses.map((w) => (
                                        <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Divider />

                            <div style={{ padding: 15, background: "rgba(0,0,0,0.02)", borderRadius: 12 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                                    <Text type="secondary">Tổng mặt hàng:</Text>
                                    <Text strong>{items.length}</Text>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <Title level={4} style={{ margin: 0 }}>TỔNG TIỀN:</Title>
                                    <Title level={4} style={{ margin: 0, color: "var(--primary-color)" }}>
                                        {calculateTotal().toLocaleString()} đ
                                    </Title>
                                </div>
                            </div>

                            <Button type="primary" block size="large" icon={<Save size={20} />} style={{ marginTop: 24, height: 50, fontWeight: "bold" }} loading={submitLoading} onClick={() => form.submit()}>
                                XÁC NHẬN NHẬP KHO
                            </Button>

                            <Button block ghost icon={<FileStack size={18} />} style={{ marginTop: 12 }} onClick={() => setIsImportModalOpen(true)}>
                                NHẬP TỪ EXCEL (FILE HVN)
                            </Button>
                            </Form>
                        </Card>
                        </Col>

                        <Col xs={24} lg={17}>
                        <Card className="glass-card" title={<Space><PlusCircle size={20} /> Chi tiết phụ tùng nhập</Space>} extra={<Button type="dashed" icon={<Plus size={16} />} onClick={addNewItem}>Thêm dòng</Button>}>
                            <Table dataSource={items} columns={columns} pagination={false} scroll={{ x: "max-content", y: 550 }} className="modern-table" />
                        </Card>
                        </Col>
                    </Row>
                )
            },
            {
                key: '2',
                label: <Space><History size={18} /> LỊCH SỬ NHẬP KHO</Space>,
                children: (
                    <Card className="glass-card" styles={{ body: { padding: 0 } }}>
                         <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Các phiếu nhập kho trong tháng</Text>
                            <Button size="small" icon={<RotateCcw size={14} />} onClick={fetchHistory} loading={historyLoading}>Làm mới</Button>
                         </div>
                         <Table 
                            dataSource={history} 
                            columns={historyColumns} 
                            loading={historyLoading} 
                            pagination={{ pageSize: 12 }}
                            className="modern-table"
                         />
                    </Card>
                )
            }
        ]}
      />

      <Modal
        title={`CHI TIẾT PHIẾU NHẬP #${selectedPurchaseDetail?.id}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={900}
        footer={[
            <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
            <Button key="print" type="primary" icon={<Printer size={16} />} onClick={() => { setTimeout(() => printReceipt('print-part-purchase-receipt'), 300); }}>In phiếu nhập</Button>
        ]}
      >
        {selectedPurchaseDetail && (
            <Table 
                dataSource={selectedPurchaseDetail.PartPurchaseItems}
                pagination={false}
                columns={[
                    { title: 'STT', render: (_, __, i) => i + 1, width: 60 },
                    { title: 'Mã PT', dataIndex: ['Part', 'code'] },
                    { title: 'Tên PT', dataIndex: ['Part', 'name'] },
                    { title: 'SL', dataIndex: 'quantity', align: 'right' },
                    { title: 'ĐVT', dataIndex: 'unit' },
                    { title: 'Đơn giá', dataIndex: 'unit_price', align: 'right', render: v => Number(v).toLocaleString() },
                    { title: 'Thành tiền', dataIndex: 'total_price', align: 'right', render: v => <Text strong>{Number(v).toLocaleString()} đ</Text> }
                ]}
            />
        )}
      </Modal>

      <ImportExcelModal
        visible={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchData();
          fetchHistory();
        }}
        type="part_purchases"
        title="Nhập linh kiện từ File Excel (HVN)"
      />
    </div>
  );
};

export default PartImportPage;
