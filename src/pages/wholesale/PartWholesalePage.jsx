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
  Card,
  Tag,
  Modal,
  Tabs,
  Alert,
  Popconfirm
} from 'antd';
import { 
  ShoppingBag, User, Save, Trash2, RotateCcw, Printer, 
  Plus, History, Eye, Download, LayoutList, Banknote, Building2, FileStack
} from 'lucide-react';
import ImportExcelModal from '../../components/ImportExcelModal';
import PrintPartSale from '../../components/PrintPartSale';
import { printReceipt } from '../../utils/printHelper';
import { exportToExcel } from '../../utils/excelExport';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { capitalizeName } from '../../utils/stringHelper';

const { Text, Title } = Typography;

const PartWholesalePage = () => {
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const canManageMoney = isAdmin || user.can_manage_money === true || user.can_manage_money === 1;
  const canDelete = isAdmin || user.can_delete === true || user.can_delete === 1;

  const [items, setItems] = useState([]);
  const paidAmountWatch = Form.useWatch('paid_amount', form);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allParts, setAllParts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [partOptions, setPartOptions] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('1');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastSavedSale, setLastSavedSale] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(user.warehouse_id || null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [partSearchText, setPartSearchText] = useState('');

  // Debounce search effect
  useEffect(() => {
    const timer = setTimeout(() => {
        if (partSearchText) {
            executePartSearch(partSearchText);
        } else {
            setPartOptions([]);
        }
    }, 300);
    return () => clearTimeout(timer);
  }, [partSearchText]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [whRes, empRes, custRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/auth/users'),
        api.get('/wholesale-customers?type=PART')
      ]);
      setWarehouses(whRes.data);
      setEmployees(empRes.data);
      setCustomers(custRes.data);
    } catch (error) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = { sale_type: 'Wholesale' };
      if (!isAdmin && user.warehouse_id) params.warehouse_id = user.warehouse_id;
      const res = await api.get('/reports/parts/sales', { params });
      setHistory(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchHistory();
    form.setFieldsValue({ seller_id: user.id, sale_date: dayjs() });
  }, []);

  const selectedWarehouseWatch = Form.useWatch('warehouse_id', form);
  useEffect(() => {
    if (selectedWarehouseWatch) setSelectedWarehouseId(selectedWarehouseWatch);
  }, [selectedWarehouseWatch]);

  const executePartSearch = async (value = '') => {
    try {
        const res = await api.get(`/parts?search=${encodeURIComponent(value)}`);
        const parts = res.data.rows;
        setPartOptions(parts.map(p => {
          let stockText = '0';
          let stockColor = '#ef4444';
          if (p.PartInventories && p.PartInventories.length > 0) {
            if (selectedWarehouseId) {
              const whStock = p.PartInventories.find(inv => inv.warehouse_id === selectedWarehouseId);
              const qty = Number(whStock?.quantity || 0);
              stockText = qty.toLocaleString();
              stockColor = qty > 5 ? '#10b981' : (qty > 0 ? '#f59e0b' : '#ef4444');
            } else {
              const totalQty = p.PartInventories.reduce((sum, inv) => sum + Number(inv.quantity), 0);
              stockText = `Tổng: ${totalQty.toLocaleString()}`;
              stockColor = totalQty > 0 ? '#10b981' : '#ef4444';
            }
          }
          return {
            value: p.code,
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ display: 'block' }}>{p.code}</Text>
                  <Text type="secondary" style={{ fontSize: '11px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Text>
                </div>
                <div style={{ textAlign: 'right', minWidth: 100, flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, color: stockColor, fontSize: 13 }}>Tồn: {stockText}</div>
                  <Tag color="orange" style={{ fontSize: 10, margin: 0 }}>Sỉ: {Number(p.wholesale_price || p.selling_price).toLocaleString()} đ</Tag>
                </div>
              </div>
            ),
            part: p
          };
        }));
    } catch (e) {
    }
  };

  useEffect(() => {
    // No search on mount
  }, [selectedWarehouseId]);

  const addItem = (part) => {
    if (items.find(i => i.part_id === part.id)) {
      return message.warning('Phụ tùng này đã có trong hóa đơn. Hãy sửa số lượng.');
    }
    setItems([...items, {
      key: Date.now(),
      part_id: part.id,
      code: part.code,
      name: part.name,
      unit: part.unit,
      quantity: 1,
      unit_price: Number(part.wholesale_price || part.selling_price || 0),
      total_price: Number(part.wholesale_price || part.selling_price || 0)
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

  const subtotal = items.reduce((sum, i) => sum + Number(i.total_price || 0), 0);
  const vatPercent = Form.useWatch('vat_percent', form) || 0;
  const totalAmount = subtotal * (1 + vatPercent / 100);

  const handlePrint = (saleData) => {
    const wh = warehouses.find(w => w.id === (saleData.warehouse_id || selectedWarehouseId))
              || saleData?.Warehouse || saleData?.warehouse;
    setLastSavedSale({ ...saleData, Warehouse: wh });
    setTimeout(() => printReceipt('print-part-sale-receipt'), 500);
  };

  const onFinish = async (values) => {
    if (items.length === 0) return message.error('Chưa có linh kiện nào trong đơn hàng!');
    const warehouseId = isAdmin ? values.warehouse_id : (user.warehouse_id || values.warehouse_id);
    if (!warehouseId) return message.error('Vui lòng chọn kho xuất hàng!');

    setSubmitLoading(true);
    try {
      const selectedCustomer = customers.find(c => c.id === values.customer_id);
      const payload = {
        ...values,
        warehouse_id: warehouseId,
        customer_name: selectedCustomer?.name,
        customer_phone: selectedCustomer?.phone,
        sale_date: values.sale_date.toISOString(),
        sale_type: 'Wholesale',
        items
      };
      const res = await api.post('/part-sale', payload);
      const savedSale = res.data;

      Modal.success({
        title: 'Lưu đơn hàng buôn thành công!',
        content: 'Bạn có muốn in phiếu xuất kho ngay không?',
        okText: 'In phiếu xuất',
        cancelText: 'Đóng',
        onOk: () => handlePrint({ ...savedSale, ...values, warehouse_id: warehouseId, PartSaleItems: items }),
        closable: true,
        maskClosable: true
      });

      setItems([]);
      form.resetFields(['customer_id', 'paid_amount', 'notes', 'vat_percent']);
      form.setFieldsValue({ sale_date: dayjs(), seller_id: user.id });
      fetchHistory();
    } catch (error) {
      message.error('Lỗi khi lưu: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenPaymentModal = (sale) => {
    setSelectedSaleForDetail(sale);
    const remaining = Number(sale.total_amount) - Number(sale.paid_amount);
    paymentForm.setFieldsValue({ amount: Math.max(0, remaining), payment_date: dayjs() });
    setIsPaymentModalOpen(true);
  };

  const onAddPayment = async (values) => {
    try {
      await api.put(`/part-sale/${selectedSaleForDetail.id}/payment`, { amount: values.amount });
      message.success('Đã ghi nhận khoản thanh toán!');
      setIsPaymentModalOpen(false);
      paymentForm.resetFields();
      fetchHistory();
    } catch (error) {
      message.error('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/part-sales/${id}`);
      message.success('Đã hủy đơn hàng!');
      fetchHistory();
    } catch (error) {
      message.error('Lỗi khi hủy: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleExport = () => {
    if (!history.length) return message.warning('Không có dữ liệu để xuất!');
    const exportData = history.map(s => ({
      'Ngày bán': dayjs(s.sale_date).format('DD/MM/YYYY'),
      'Đối tác': s.customer_name || '',
      'Kho': s.Warehouse?.warehouse_name || '',
      'Tổng tiền': Number(s.total_amount),
      'Đã trả': Number(s.paid_amount),
      'Còn nợ': Math.max(0, Number(s.total_amount) - Number(s.paid_amount))
    }));
    exportToExcel(exportData, `BanBuonPhuTung_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const filteredHistory = history.filter(s => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return s.customer_name?.toLowerCase().includes(q);
  });

  // ────────────────────────── COLUMNS ──────────────────────────
  const itemColumns = [
    { title: 'Mã PT', dataIndex: 'code', width: 130 },
    { title: 'Tên Phụ tùng', dataIndex: 'name' },
    { title: 'ĐVT', dataIndex: 'unit', width: 80 },
    { 
      title: 'SL', dataIndex: 'quantity', width: 90,
      render: (v, r) => <InputNumber min={1} value={v} onChange={val => updateItem(r.key, 'quantity', val)} size="small" />
    },
    { 
      title: 'Giá sỉ', dataIndex: 'unit_price', width: 150,
      render: (v, r) => (
        <InputNumber 
          min={0} value={v} size="small"
          formatter={val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          parser={val => val.replace(/\./g, '')}
          onChange={val => updateItem(r.key, 'unit_price', val)} 
          style={{ width: '100%' }}
        />
      )
    },
    { 
      title: 'Thành tiền', dataIndex: 'total_price', width: 150, align: 'right',
      render: v => <Text strong style={{ color: 'var(--primary-color)' }}>{Number(v).toLocaleString('vi-VN')} đ</Text>
    },
    { 
      title: '', width: 40,
      render: (_, r) => <Button type="text" danger icon={<Trash2 size={14} />} onClick={() => setItems(items.filter(i => i.key !== r.key))} />
    }
  ];

  const historyColumns = [
    { title: 'Ngày bán', dataIndex: 'sale_date', render: v => dayjs(v).format('DD/MM/YYYY'), width: 110 },
    { title: 'Đối tác', dataIndex: 'customer_name' },
    { title: 'Kho', dataIndex: ['Warehouse', 'warehouse_name'], width: 130 },
    { title: 'Tổng tiền', dataIndex: 'total_amount', align: 'right', width: 140, render: v => <Text strong>{Number(v).toLocaleString()} đ</Text> },
    { 
      title: 'Thanh toán', key: 'debt', width: 150, align: 'right',
      render: (_, r) => {
        const debt = Number(r.total_amount) - Number(r.paid_amount);
        return debt > 0
          ? <Tag color="orange">Còn nợ {debt.toLocaleString()} đ</Tag>
          : <Tag color="green">Đã thanh toán đủ</Tag>;
      }
    },
    {
      title: 'Tác vụ', key: 'action', width: 140,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<Eye size={14} />} onClick={() => { setSelectedSaleForDetail(r); setIsDetailModalOpen(true); }} />
          <Button size="small" type="primary" ghost icon={<Printer size={14} />} onClick={() => handlePrint(r)} />
          {canManageMoney && (
            <Button size="small" icon={<Banknote size={14} />} onClick={() => handleOpenPaymentModal(r)} />
          )}
          {canDelete && (
            <Popconfirm title="Hủy đơn hàng?" description="Kho sẽ được hoàn lại. Tiếp tục?" onConfirm={() => handleDelete(r.id)} okText="Xác nhận" cancelText="Bỏ qua">
              <Button size="small" danger icon={<RotateCcw size={14} />} />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'none' }}>
        <PrintPartSale 
          sale={lastSavedSale || selectedSaleForDetail}
          items={(lastSavedSale || selectedSaleForDetail)?.PartSaleItems}
          warehouse={(lastSavedSale || selectedSaleForDetail)?.Warehouse}
          title="PHIẾU XUẤT KHO KIÊM BÁN BUÔN"
        />
      </div>

      <div className="page-header">
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>BÁN BUÔN PHỤ TÙNG</Title>
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
          Nhập từ Excel
        </Button>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        type="card"
        items={[
          {
            key: '1',
            label: <Space><Plus size={16} /> LẬP PHIẾU BÁN BUÔN</Space>,
            children: (
              <Row gutter={[24, 24]} className="mobile-stack-cols">
                <Col xs={24} lg={9}>
                  <Card className="glass-card" title={<Space><Building2 size={18} /> THÔNG TIN ĐỐI TÁC</Space>}>
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={onFinish}
                      onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                      initialValues={{ sale_date: dayjs(), vat_percent: 0, seller_id: user.id }}
                    >
                      <Row gutter={12}>
                        <Col xs={24} sm={12}>
                          <Form.Item label="Ngày bán" name="sale_date" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item label="Người bán" name="seller_id" rules={[{ required: true }]}>
                            <Select size="large" disabled={!isAdmin} showSearch optionFilterProp="children">
                              {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.full_name}</Select.Option>)}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item label="Chọn đối tác buôn" name="customer_id" rules={[{ required: true }]}>
                        <Select size="large" showSearch placeholder="Tìm theo tên đối tác..." optionFilterProp="children">
                          {customers.map(c => <Select.Option key={c.id} value={c.id}>{c.customer_code} - {c.name}</Select.Option>)}
                        </Select>
                      </Form.Item>

                      {isAdmin ? (
                        <Form.Item label="Kho xuất hàng" name="warehouse_id" rules={[{ required: true }]}>
                          <Select size="large" placeholder="Chọn kho..." onChange={val => setSelectedWarehouseId(val)}>
                            {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                          </Select>
                        </Form.Item>
                      ) : (
                        <Form.Item name="warehouse_id" hidden initialValue={user.warehouse_id}><Input /></Form.Item>
                      )}

                      <Form.Item label="Ghi chú" name="notes">
                        <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
                      </Form.Item>

                      <Divider />

                      <div style={{ background: 'rgba(0,0,0,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text type="secondary">Tổng tiền hàng:</Text>
                          <Text strong style={{ fontSize: 15 }}>{subtotal.toLocaleString('vi-VN')} đ</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text type="secondary">VAT (%):</Text>
                          <Form.Item name="vat_percent" style={{ margin: 0 }}>
                            <InputNumber min={0} max={100} size="small" style={{ width: 65 }} />
                          </Form.Item>
                        </div>
                        <Divider style={{ margin: '10px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text strong style={{ fontSize: 16 }}>TỔNG CỘNG:</Text>
                          <Text strong style={{ fontSize: 18, color: 'var(--primary-color)' }}>{totalAmount.toLocaleString('vi-VN')} đ</Text>
                        </div>
                      </div>

                      <Form.Item label="Thanh toán trước" name="paid_amount" style={{ marginTop: 16 }}>
                        <InputNumber 
                          size="large" style={{ width: '100%' }}
                          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                          parser={v => v.replace(/\./g, '')}
                          placeholder="Có thể thanh toán sau..."
                        />
                      </Form.Item>

                      {paidAmountWatch > 0 && paidAmountWatch < totalAmount && (
                        <Alert 
                          message={`Còn nợ: ${(totalAmount - (paidAmountWatch || 0)).toLocaleString('vi-VN')} đ`}
                          type="warning" showIcon style={{ marginBottom: 16 }}
                        />
                      )}

                        <Button 
                          type="primary" block size="large" htmlType="submit"
                          icon={<Save size={20} />} loading={submitLoading}
                          disabled={items.length === 0}
                          style={{ height: 50, fontWeight: 'bold' }}
                        >
                          LƯU & XUẤT HÓA ĐƠN
                        </Button>
                      </Form>
                  </Card>
                </Col>

                <Col xs={24} lg={15}>
                  <Card 
                    className="glass-card"
                    title={<Space><LayoutList size={18} /> DANH SÁCH LINH KIỆN SỈ</Space>}
                    extra={<Tag color="blue">{items.length} mặt hàng | {subtotal.toLocaleString()} đ</Tag>}
                  >
                    <div style={{ marginBottom: 16 }}>
                      <AutoComplete
                        style={{ width: '100%' }}
                        onSearch={setPartSearchText}
                        onSelect={(val, option) => addItem(option.part)}
                        options={partOptions}
                        onFocus={() => executePartSearch(partSearchText)}
                        placeholder="🔍 Tìm theo mã hoặc tên (ví dụ: 'DAU HONDA')..."
                        popupMatchSelectWidth={false}
                        dropdownStyle={{ minWidth: 450 }}
                      >
                        <Input size="large" />
                      </AutoComplete>
                    </div>
                    <Table 
                      dataSource={items} 
                      columns={itemColumns} 
                      pagination={false} 
                      className="modern-table small-screen-optimized" 
                      size={window.innerWidth < 768 ? 'small' : 'middle'}
                      scroll={{ x: 'max-content', y: 450 }}
                      locale={{ emptyText: 'Tìm kiếm phụ tùng ở thanh trên để thêm vào đơn hàng' }}
                    />
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: '2',
            label: <Space><History size={16} /> LỊCH SỬ BÁN BUÔN</Space>,
            children: (
              <Card className="glass-card" styles={{ body: { padding: 0 } }}>
                <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Input.Search
                    placeholder="Tìm theo tên đối tác..."
                    allowClear style={{ maxWidth: 320 }}
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                  />
                  <Space>
                    <Button icon={<RotateCcw size={14} />} onClick={fetchHistory} loading={historyLoading}>Làm mới</Button>
                    <Button icon={<Download size={14} />} onClick={handleExport}>Xuất Excel</Button>
                  </Space>
                </div>
                <Table 
                  dataSource={filteredHistory}
                  columns={historyColumns}
                  loading={historyLoading}
                  pagination={{ pageSize: 12 }}
                  className="modern-table"
                  size={window.innerWidth < 768 ? 'small' : 'middle'}
                  scroll={{ x: 'max-content' }}
                  style={{ marginTop: 8 }}
                />
              </Card>
            )
          }
        ]}
      />

      {/* Detail Modal */}
      <Modal
        title={`CHI TIẾT ĐƠN HÀNG BUÔN #${selectedSaleForDetail?.id?.slice(-8).toUpperCase()}`}
        open={isDetailModalOpen && !isPaymentModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={window.innerWidth < 768 ? '95%' : 800}
        centered
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
          canManageMoney && <Button key="pay" icon={<Banknote size={16} />} onClick={() => { setIsDetailModalOpen(false); handleOpenPaymentModal(selectedSaleForDetail); }}>Thu tiền</Button>,
          <Button key="print" type="primary" icon={<Printer size={16} />} onClick={() => handlePrint(selectedSaleForDetail)}>In phiếu xuất</Button>
        ]}
      >
        {selectedSaleForDetail && (
          <>
            <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={6}><Text type="secondary">Ngày bán:</Text> <Text strong style={{ display: 'block' }}>{dayjs(selectedSaleForDetail.sale_date).format('DD/MM/YYYY')}</Text></Col>
              <Col xs={12} sm={8}><Text type="secondary">Đối tác:</Text> <Text strong style={{ display: 'block' }}>{selectedSaleForDetail.customer_name || '—'}</Text></Col>
              <Col xs={12} sm={5}><Text type="secondary">SĐT:</Text> <Text style={{ display: 'block' }}>{selectedSaleForDetail.customer_phone || '—'}</Text></Col>
              <Col xs={12} sm={5}><Text type="secondary">Kho:</Text> <Text style={{ display: 'block' }}>{selectedSaleForDetail.Warehouse?.warehouse_name || '—'}</Text></Col>
            </Row>
            <Table 
              dataSource={selectedSaleForDetail.PartSaleItems}
              pagination={false} size="small"
              columns={[
                { title: 'Mã PT', dataIndex: ['Part', 'code'] },
                { title: 'Tên PT', dataIndex: ['Part', 'name'] },
                { title: 'SL', dataIndex: 'quantity', align: 'right', width: 60 },
                { title: 'ĐVT', dataIndex: 'unit', width: 60 },
                { title: 'Đơn giá', dataIndex: 'unit_price', align: 'right', render: v => Number(v).toLocaleString() },
                { title: 'Thành tiền', dataIndex: 'total_price', align: 'right', render: v => <Text strong>{Number(v).toLocaleString()} đ</Text> }
              ]}
            />
            <Divider />
            <Row justify="end" gutter={32}>
              <Col><Text type="secondary">Tổng cộng:</Text> <Text strong style={{ fontSize: 15 }}>{Number(selectedSaleForDetail.total_amount).toLocaleString()} đ</Text></Col>
              <Col><Text type="secondary">Đã trả:</Text> <Text strong type="success">{Number(selectedSaleForDetail.paid_amount).toLocaleString()} đ</Text></Col>
              <Col>
                {Number(selectedSaleForDetail.total_amount) - Number(selectedSaleForDetail.paid_amount) > 0
                  ? <><Text type="secondary">Còn nợ:</Text> <Text strong type="danger">{(Number(selectedSaleForDetail.total_amount) - Number(selectedSaleForDetail.paid_amount)).toLocaleString()} đ</Text></>
                  : <Tag color="green">Đã thanh toán đủ</Tag>
                }
              </Col>
            </Row>
          </>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        title={<Space><Banknote size={18} /> Thu tiền #{selectedSaleForDetail?.id?.slice(-8).toUpperCase()}</Space>}
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        footer={null}
      >
        {selectedSaleForDetail && (
          <>
            <Alert
              message={`Còn nợ: ${Math.max(0, Number(selectedSaleForDetail.total_amount) - Number(selectedSaleForDetail.paid_amount)).toLocaleString()} đ`}
              type="warning" showIcon style={{ marginBottom: 16 }}
            />
            <Form form={paymentForm} layout="vertical" onFinish={onAddPayment}>
              <Form.Item label="Ngày thu" name="payment_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item label="Số tiền thu" name="amount" rules={[{ required: true }]}>
                <InputNumber
                  size="large" style={{ width: '100%' }}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  parser={v => v.replace(/\./g, '')}
                  min={1}
                />
              </Form.Item>
              <Form.Item label="Ghi chú" name="notes">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Row justify="end" gutter={12}>
                <Col><Button onClick={() => setIsPaymentModalOpen(false)}>Hủy</Button></Col>
                <Col><Button type="primary" htmlType="submit" icon={<Save size={16} />}>Xác nhận thu tiền</Button></Col>
              </Row>
            </Form>
          </>
        )}
      </Modal>

      <ImportExcelModal 
        visible={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onSuccess={() => {
            fetchHistory();
            setIsImportModalOpen(false);
        }}
        type="part_wholesale_sales"
        title="Nhập hóa đơn bán buôn từ Excel"
      />
    </div>
  );
};

export default PartWholesalePage;
