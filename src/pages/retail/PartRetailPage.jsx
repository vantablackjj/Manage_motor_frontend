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
  Badge,
  Alert,
  Popconfirm
} from 'antd';
import { 
  ShoppingCart, User, Smartphone, Save, Trash2, RotateCcw, Printer, 
  Plus, History, Eye, Download, LayoutList, Banknote, Car, FileStack
} from 'lucide-react';
import ImportExcelModal from '../../components/ImportExcelModal';
import PrintPartSale from '../../components/PrintPartSale';
import { printReceipt } from '../../utils/printHelper';
import { exportToExcel } from '../../utils/excelExport';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { capitalizeName } from '../../utils/stringHelper';

const { Text, Title } = Typography;

const PartRetailPage = () => {
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const isManager = user.role === 'MANAGER';
  const isPowerUser = isAdmin || isManager;
  const canManageMoney = isPowerUser || user.can_manage_money === true || user.can_manage_money === 1;
  const canDelete = isPowerUser || user.can_delete === true || user.can_delete === 1;

  const allowedWarehouseIds = [user.warehouse_id, ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])].filter(Boolean);
  const showWarehouseSelector = isPowerUser || allowedWarehouseIds.length > 1;

  const [items, setItems] = useState([]);
  const paidAmountWatch = Form.useWatch('paid_amount', form);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allParts, setAllParts] = useState([]);
  const [partOptions, setPartOptions] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('1');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedSaleForDetail, setSelectedSaleForDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastSavedSale, setLastSavedSale] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
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

  // Default to user's assigned warehouse
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(user.warehouse_id || null);

  const fetchInitialData = async (warehouseId = selectedWarehouseId) => {
    setLoading(true);
    try {
      const [whRes, empRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/auth/users')
      ]);
      const allWh = whRes.data;
      if (isAdmin) {
        setWarehouses(allWh);
      } else {
        const allowedIds = [user.warehouse_id, ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])].filter(Boolean);
        setWarehouses(allWh.filter(w => allowedIds.includes(w.id)));
      }
      setEmployees(empRes.data);
    } catch (error) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const params = { 
        sale_type: 'Retail',
        from_date: dayjs().startOf('month').format('YYYY-MM-DD'),
        to_date: dayjs().format('YYYY-MM-DD')
      };
      // Non-admins only see their warehouse's history
      if (!isAdmin && user.warehouse_id) {
        params.warehouse_id = user.warehouse_id;
      }
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

  const handleWarehouseChange = (val) => {
    setSelectedWarehouseId(val);
    executePartSearch('');
  };

  const selectedWarehouseWatch = Form.useWatch('warehouse_id', form);
  // Sync the watched field into the selectedWarehouseId state for stock display
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
                  <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{Number(p.selling_price).toLocaleString()} đ</Tag>
                </div>
              </div>
            ),
            part: p
          };
        }));
    } catch (e) {
        console.error(e);
    }
  };

  useEffect(() => {
    // We don't search on mount anymore
  }, [selectedWarehouseId]);

  // ── Count stock in selected warehouse for the badge ──
  const totalStockInWarehouse = allParts.reduce((sum, p) => {
    if (!selectedWarehouseId || !p.PartInventories) return sum;
    const inv = p.PartInventories.find(i => i.warehouse_id === selectedWarehouseId);
    return sum + Number(inv?.quantity || 0);
  }, 0);

  const addItem = (part) => {
    // Prevent duplicate
    if (items.find(i => i.part_id === part.id)) {
      return message.warning('Phụ tùng này đã có trong hóa đơn. Hãy sửa số lượng.');
    }
    const key = Date.now();
    setItems([...items, {
      key,
      part_id: part.id,
      code: part.code,
      name: part.name,
      unit: part.unit,
      quantity: 1,
      unit_price: Number(part.selling_price || 0),
      total_price: Number(part.selling_price || 0)
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
    // If the saleData already has Warehouse (from backend), use it.
    // Otherwise fallback to manual lookup (history items might not have it yet)
    let wh = saleData.Warehouse || saleData.warehouse;
    // Aggressively search for full warehouse details in the loaded warehouses list
    const fullWh = warehouses.find(w => w.id === (saleData.warehouse_id || selectedWarehouseId));
    if (fullWh) {
       wh = fullWh;
    }
    setLastSavedSale({ ...saleData, Warehouse: wh });
    setTimeout(() => printReceipt('print-part-sale-receipt'), 500);
  };

  const onFinish = async (values) => {
    if (items.length === 0) return message.error('Chưa có linh kiện nào trong hóa đơn!');
    const warehouseId = isAdmin ? values.warehouse_id : (user.warehouse_id || values.warehouse_id);
    if (!warehouseId) return message.error('Vui lòng chọn kho xuất hàng!');

    setSubmitLoading(true);
    try {
      const mDate = values.sale_date ? (dayjs.isDayjs(values.sale_date) ? values.sale_date : dayjs(values.sale_date)) : dayjs();

      const payload = {
        ...values,
        warehouse_id: warehouseId,
        sale_date: mDate.toISOString(),
        sale_type: 'Retail',
        items
      };
      const res = await api.post('/part-sale', payload);
      const savedSale = res.data;

      Modal.success({
        title: 'Lưu hóa đơn thành công!',
        content: 'Bạn có muốn in hóa đơn ngay không?',
        okText: 'In hóa đơn',
        cancelText: 'Đóng',
        onOk: () => handlePrint({ ...savedSale, ...values, sale_date: mDate, warehouse_id: warehouseId, PartSaleItems: items }),
        closable: true,
        maskClosable: true
      });

      setItems([]);
      form.resetFields(['customer_name', 'customer_phone', 'paid_amount', 'notes', 'vat_percent']);
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
      message.success('Đã hủy hóa đơn!');
      fetchHistory();
    } catch (error) {
      message.error('Lỗi khi hủy: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleExport = () => {
    if (!history.length) return message.warning('Không có dữ liệu để xuất!');
    const exportData = history.map(s => ({
      'Ngày bán': dayjs(s.sale_date).format('DD/MM/YYYY'),
      'Tên khách': s.customer_name || 'Khách lẻ',
      'SĐT': s.customer_phone || '',
      'Kho': s.Warehouse?.warehouse_name || '',
      'Tổng tiền': Number(s.total_amount),
      'Đã trả': Number(s.paid_amount),
      'Còn nợ': Math.max(0, Number(s.total_amount) - Number(s.paid_amount))
    }));
    exportToExcel(exportData, `BanLePhuTung_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const filteredHistory = Array.isArray(history) ? history.filter(s => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      s.customer_name?.toLowerCase().includes(q) ||
      s.customer_phone?.includes(q)
    );
  }) : [];

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
      title: 'Đơn giá', dataIndex: 'unit_price', width: 150,
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
    { title: 'Khách hàng', dataIndex: 'customer_name', render: (v, r) => v || r.customer_phone || 'Khách lẻ' },
    { title: 'SĐT', dataIndex: 'customer_phone', width: 120 },
    { title: 'Kho', dataIndex: ['Warehouse', 'warehouse_name'], width: 130 },
    { title: 'Tổng tiền', dataIndex: 'total_amount', align: 'right', width: 130, render: v => <Text strong>{Number(v).toLocaleString()} đ</Text> },
    { 
      title: 'Còn nợ', key: 'debt', width: 130, align: 'right',
      render: (_, r) => {
        const debt = Number(r.total_amount) - Number(r.paid_amount);
        return debt > 0
          ? <Text type="danger" strong>{debt.toLocaleString()} đ</Text>
          : <Tag color="green">Đã đủ</Tag>;
      }
    },
    {
      title: 'Tác vụ', key: 'action', width: 130,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<Eye size={14} />} title="Xem chi tiết" onClick={() => { setSelectedSaleForDetail(r); setIsDetailModalOpen(true); }} />
          <Button size="small" type="primary" ghost icon={<Printer size={14} />} title="In hóa đơn" onClick={() => handlePrint(r)} />
          {canManageMoney && (
            <Button size="small" icon={<Banknote size={14} />} title="Thu thêm tiền" onClick={() => handleOpenPaymentModal(r)} />
          )}
          {canDelete && (
            <Popconfirm title="Hủy hóa đơn?" description="Kho sẽ được hoàn lại. Tiếp tục?" onConfirm={() => handleDelete(r.id)} okText="Xác nhận" cancelText="Bỏ qua">
              <Button size="small" danger icon={<RotateCcw size={14} />} title="Hủy hóa đơn" />
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  return (
    <div className="page-container">
      {/* Hidden print component */}
      <div style={{ display: 'none' }}>
        <PrintPartSale 
          sale={lastSavedSale || selectedSaleForDetail}
          items={(lastSavedSale || selectedSaleForDetail)?.PartSaleItems}
          warehouse={(lastSavedSale || selectedSaleForDetail)?.Warehouse}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>BÁN LẺ PHỤ TÙNG</Title>
        <Space size="middle">
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
        </Space>
      </div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        type="card"
        items={[
          {
            key: '1',
            label: <Space><Plus size={16} /> LẬP PHIẾU MỚI</Space>,
            children: (
              <Row gutter={[24, 24]}>
                {/* LEFT: Invoice Info */}
                <Col xs={24} lg={9}>
                  <Card className="glass-card" title={<Space><ShoppingCart size={18} /> THÔNG TIN HÓA ĐƠN</Space>}>
                    <Form
                      form={form}
                      layout="vertical"
                      onFinish={onFinish}
                      onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                      initialValues={{ sale_date: dayjs(), vat_percent: 0, seller_id: user.id }}
                    >
                      <Row gutter={12}>
                        <Col xs={12}>
                          <Form.Item label="Ngày bán" name="sale_date" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" />
                          </Form.Item>
                        </Col>
                        <Col xs={12}>
                          <Form.Item label="Người bán" name="seller_id" rules={[{ required: true }]}>
                            <Select size="large" disabled={!isAdmin} showSearch optionFilterProp="children">
                              {employees.map(e => <Select.Option key={e.id} value={e.id}>{e.full_name}</Select.Option>)}
                            </Select>
                          </Form.Item>
                        </Col>
                      </Row>

                      { showWarehouseSelector ? (
                        <Form.Item label="Kho xuất hàng" name="warehouse_id" rules={[{ required: true }]}>
                          <Select size="large" placeholder="Chọn kho..." onChange={handleWarehouseChange}>
                            {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                          </Select>
                        </Form.Item>
                      ) : (
                        // Staff: auto-set warehouse, hidden field
                        <Form.Item name="warehouse_id" hidden initialValue={user.warehouse_id}>
                          <Input />
                        </Form.Item>
                      )}

                      <Form.Item label="Tên khách hàng" name="customer_name" rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng!' }]}>
                        <Input 
                          size="large" 
                          prefix={<User size={16} />} 
                          placeholder="Ví dụ: Nguyễn Văn A"
                          onBlur={e => form.setFieldsValue({ customer_name: capitalizeName(e.target.value) })}
                        />
                      </Form.Item>
                      <Form.Item label="Số điện thoại" name="customer_phone" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại!' }]}>
                        <Input size="large" prefix={<Smartphone size={16} />} placeholder="09xxxx..." />
                      </Form.Item>
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

                      <Form.Item label="Khách đã trả" name="paid_amount" style={{ marginTop: 16 }}>
                        <InputNumber 
                          size="large" style={{ width: '100%' }}
                          formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                          parser={v => v.replace(/\./g, '')}
                          placeholder="Có thể trả sau..."
                        />
                      </Form.Item>

                      {/* Debt warning */}
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

                {/* RIGHT: Items list */}
                <Col xs={24} lg={15}>
                  <Card 
                    className="glass-card" 
                    title={<Space><LayoutList size={18} /> DANH SÁCH LINH KIỆN CHỌN BÁN</Space>}
                    extra={
                      <Tag color="blue">{items.length} mặt hàng | {subtotal.toLocaleString()} đ</Tag>
                    }
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
                      className="modern-table" 
                      scroll={{ x: 'max-content', y: 450 }}
                      locale={{ emptyText: 'Tìm kiếm phụ tùng ở thanh trên để thêm vào hóa đơn' }}
                    />
                  </Card>
                </Col>
              </Row>
            )
          },
          {
            key: '2',
            label: <Space><History size={16} /> LỊCH SỬ GIAO DỊCH</Space>,
            children: (
              <Card className="glass-card" styles={{ body: { padding: 0 } }}>
                <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <Input.Search
                    placeholder="Tìm theo tên khách, SĐT..."
                    allowClear
                    style={{ maxWidth: 320 }}
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
                  style={{ marginTop: 8 }}
                />
              </Card>
            )
          }
        ]}
      />

      {/* Detail Modal */}
      <Modal
        title={`CHI TIẾT HÓA ĐƠN #${selectedSaleForDetail?.id?.slice(-8)?.toUpperCase() || '...'}`}
        open={isDetailModalOpen && !isPaymentModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
          canManageMoney && <Button key="pay" icon={<Banknote size={16} />} onClick={() => { setIsDetailModalOpen(false); handleOpenPaymentModal(selectedSaleForDetail); }}>Thu tiền</Button>,
          <Button key="print" type="primary" icon={<Printer size={16} />} onClick={() => handlePrint(selectedSaleForDetail)}>In hóa đơn</Button>
        ]}
      >
        {selectedSaleForDetail && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Text type="secondary">Ngày bán:</Text> <Text strong>{dayjs(selectedSaleForDetail.sale_date).format('DD/MM/YYYY')}</Text></Col>
              <Col span={8}><Text type="secondary">Khách:</Text> <Text strong>{selectedSaleForDetail.customer_name || 'Khách lẻ'}</Text></Col>
              <Col span={8}><Text type="secondary">SĐT:</Text> <Text>{selectedSaleForDetail.customer_phone || '—'}</Text></Col>
            </Row>
            <Table 
              dataSource={selectedSaleForDetail.PartSaleItems}
              pagination={false}
              size="small"
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
        title={<Space><Banknote size={18} /> Thu tiền hóa đơn #{selectedSaleForDetail?.id?.slice(-8)?.toUpperCase() || '...'}</Space>}
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        footer={null}
      >
        {selectedSaleForDetail && (
          <>
            <Alert
              message={`Còn nợ: ${Math.max(0, Number(selectedSaleForDetail.total_amount) - Number(selectedSaleForDetail.paid_amount)).toLocaleString()} đ`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
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
        type="part_retail_sales"
        title="Nhập hóa đơn bán lẻ từ Excel"
      />
    </div>
  );
};

export default PartRetailPage;
