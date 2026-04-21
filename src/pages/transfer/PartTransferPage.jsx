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
  Modal,
  Tag,
  Select,
  Tabs,
  Card,
  Timeline,
  Divider,
  Badge,
  Alert,
  InputNumber,
  AutoComplete
} from 'antd';
import { 
  ArrowRightLeft, 
  Plus, 
  History, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Truck, 
  Trash2, 
  XCircle,
  MapPin,
  Search,
  User as UserIcon,
  Printer,
  RotateCcw
} from 'lucide-react';

import api from '../../utils/api';
import dayjs from 'dayjs';
import PrintPartTransfer from '../../components/PrintPartTransfer';
import { printReceipt } from '../../utils/printHelper';

const { Text, Title } = Typography;
const { Option } = Select;

const PartTransferPage = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [availableInventory, setAvailableInventory] = useState([]);
  const [transferItems, setTransferItems] = useState([]); // Array of {part_id, quantity, code, name...}
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [inventorySearchText, setInventorySearchText] = useState('');
  const [historySearchText, setHistorySearchText] = useState('');
  const [form] = Form.useForm();
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    fetchWarehouses();
    fetchTransfers();
    if (user.warehouse_id) {
        fetchAvailableInventory(user.warehouse_id);
    }
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/part-transfers');
      setTransfers(res.data);
    } catch (e) {
      message.error('Lỗi tải danh sách chuyển kho');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableInventory = async (warehouseId) => {
    setLoading(true);
    try {
      // Get inventory for this warehouse specifically
      const res = await api.get(`/part-inventory?warehouse_id=${warehouseId}`);
      setAvailableInventory(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async () => {
    try {
      const values = await form.validateFields();
      const itemsToTransfer = transferItems.filter(i => i.quantity > 0);
      
      if (itemsToTransfer.length === 0) {
        return message.warning('Vui lòng nhập số lượng cho ít nhất 1 phụ tùng!');
      }

      setLoading(true);
      await api.post('/part-transfers', {
        from_warehouse_id: isAdmin ? values.from_warehouse_id : user.warehouse_id,
        to_warehouse_id: values.to_warehouse_id,
        items: itemsToTransfer.map(i => ({ part_id: i.part_id, quantity: i.quantity })),
        notes: values.notes
      });
      message.success('Đã gửi yêu cầu chuyển kho phụ tùng!');

      form.resetFields();
      setTransferItems([]);
      fetchTransfers();
      if (user.warehouse_id) fetchAvailableInventory(user.warehouse_id);
      setActiveTab('2');

    } catch (e) {
      message.error('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (id) => {
    setLoading(true);
    try {
      const res = await api.get(`/part-transfers/${id}`);
      setDetailData(res.data);
      setIsDetailModalOpen(true);
    } catch (e) {
      message.error('Không thể tải chi tiết');
    } finally {
      setLoading(false);
    }
  };

  const handleFromWarehouseChange = (val) => {
    fetchAvailableInventory(val);
    setTransferItems([]);
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/part-transfers/${id}/approve`);
      message.success('Đã duyệt phiếu chuyển kho!');
      setIsDetailModalOpen(false);
      fetchTransfers();
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
    }
  };

  const handleReceive = async (id) => {
    try {
      await api.post(`/part-transfers/${id}/receive`);
      message.success('Đã xác nhận nhận đủ hàng!');
      setIsDetailModalOpen(false);
      fetchTransfers();
      if (user.warehouse_id) fetchAvailableInventory(user.warehouse_id);
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.post(`/part-transfers/${id}/cancel`);
      message.success('Đã hủy phiếu chuyển kho!');
      setIsDetailModalOpen(false);
      fetchTransfers();
      if (user.warehouse_id) fetchAvailableInventory(user.warehouse_id);
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
    }
  };

  const getStatusTag = (status) => {
    const config = {
      'PENDING_ADMIN': { color: 'orange', text: 'Chờ Admin duyệt', icon: <Clock size={14} /> },
      'ADMIN_APPROVED': { color: 'blue', text: 'Đã duyệt - Đang giao', icon: <Truck size={14} /> },
      'RECEIVED': { color: 'green', text: 'Đã hoàn tất', icon: <CheckCircle2 size={14} /> },
      'CANCELLED': { color: 'red', text: 'Đã hủy', icon: <XCircle size={14} /> },
    };
    const s = config[status] || { color: 'default', text: status };
    return <Tag color={s.color} style={{ display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>{s.icon} {s.text}</Tag>;
  };

  const updateItemQty = (partId, qty, partData) => {
    setTransferItems(prev => {
        const existing = prev.find(i => i.part_id === partId);
        if (existing) {
            if (qty <= 0) return prev.filter(i => i.part_id !== partId);
            return prev.map(i => i.part_id === partId ? { ...i, quantity: qty } : i);
        }
        if (qty <= 0) return prev;
        return [...prev, { 
            part_id: partId, 
            quantity: qty, 
            code: partData.Part?.code, 
            name: partData.Part?.name, 
            unit: partData.Part?.unit 
        }];
    });
  };

  const inventoryColumns = [
    { title: 'Mã Phụ tùng', key: 'code', render: (_, r) => <Text strong>{r.Part?.code}</Text> },
    { title: 'Tên phụ tùng', key: 'name', render: (_, r) => r.Part?.name },
    { title: 'Tồn hệ thống', dataIndex: 'quantity', key: 'stock', render: q => <Tag color="blue">{Number(q).toLocaleString()}</Tag> },
    { title: 'ĐVT', key: 'unit', render: (_, r) => r.Part?.unit },
    { 
      title: 'SL Chuyển', 
      key: 'qty_input',
      width: 150,
      render: (_, r) => (
        <InputNumber 
          min={0} 
          max={Number(r.quantity)}
          placeholder="0"
          value={transferItems.find(i => i.part_id === r.part_id)?.quantity || 0}
          onChange={(val) => updateItemQty(r.part_id, val, r)}
          style={{ width: '100%' }}
        />
      )
    }
  ];

  const filteredInventory = availableInventory.filter(item => 
    item.Part?.code?.toLowerCase().includes(inventorySearchText.toLowerCase()) ||
    item.Part?.name?.toLowerCase().includes(inventorySearchText.toLowerCase())
  );

  const historyColumns = [
    { title: 'Mã Phiếu', dataIndex: 'transfer_code', key: 'transfer_code', render: (text, r) => <a onClick={() => loadDetails(r.id)}><Text strong>{text}</Text></a> },
    { title: 'Từ Kho', dataIndex: 'FromWarehouse', render: wh => wh?.warehouse_name || 'N/A' },
    { title: 'Đến Kho', dataIndex: 'ToWarehouse', render: wh => wh?.warehouse_name || 'N/A' },
    { title: 'Người lập', dataIndex: 'creator', render: u => u?.full_name || 'N/A' },
    { title: 'Trạng Thái', dataIndex: 'status', render: status => getStatusTag(status) },
    { title: 'Ngày tạo', dataIndex: 'createdAt', render: d => dayjs(d).format('DD/MM/YYYY HH:mm') },
    { title: '', key: 'action', render: (_, r) => <Button size="small" onClick={() => loadDetails(r.id)}>Chi tiết</Button> }
  ];

  const handlePrint = () => {
    printReceipt('print-part-transfer-receipt');
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'none' }}>
        <PrintPartTransfer 
          transfer={detailData?.transfer} 
          items={detailData?.items} 
        />
      </div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} className="gradient-text" style={{ margin: 0 }}>LUÂN CHUYỂN PHỤ TÙNG NỘI BỘ</Title>
          <Text type="secondary">Cấu trúc và quy trình thống nhất với hệ thống quản lý xe máy</Text>
        </div>
        {!isAdmin && user.warehouse_id && (
           <Card size="small" style={{ borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', borderColor: 'var(--primary-color)' }}>
              <Space><MapPin size={16} /> <Text strong>Kho của bạn: {warehouses.find(w => w.id === user.warehouse_id)?.warehouse_name}</Text></Space>
           </Card>
        )}
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" items={[
        {
          key: '1',
          label: <Space><Plus size={18} /> TẠO PHIẾU CHUYỂN</Space>,
          children: (
            <Card className="glass-card">
              <Form form={form} layout="vertical" initialValues={{ from_warehouse_id: user.warehouse_id }}>
                <Row gutter={24}>
                  <Col span={8}>
                    <Form.Item label="Từ kho xuất" name="from_warehouse_id" rules={[{ required: true }]}>
                      <Select placeholder="Chọn kho xuất" size="large" disabled={!isAdmin} onChange={handleFromWarehouseChange}>
                        {warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Đến kho nhận" name="to_warehouse_id" rules={[{ required: true }]}>
                      <Select placeholder="Chọn kho nhận" size="large">
                        {warehouses.filter(w => w.id !== form.getFieldValue('from_warehouse_id')).map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Ghi chú vận chuyển" name="notes">
                      <Input placeholder="Người vận chuyển, lý do..." size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider orientation="left">DANH SÁCH PHỤ TÙNG SẴN CÓ TRONG KHO ({availableInventory.length})</Divider>
                
                <div style={{ marginBottom: 16 }}>
                    <Input 
                        placeholder="Tìm theo mã hoặc tên phụ tùng trong kho..." 
                        prefix={<Search size={18} opacity={0.6} />} 
                        allowClear
                        size="large"
                        value={inventorySearchText}
                        onChange={(e) => setInventorySearchText(e.target.value)}
                        style={{ borderRadius: 10 }}
                    />
                </div>

                {transferItems.length > 0 && (
                    <Card size="small" style={{ marginBottom: 16, background: '#f0f9ff', borderColor: '#bae6fd' }}>
                        <Space wrap>
                            <Text strong>Đang chọn chuyển:</Text>
                            {transferItems.map(i => (
                                <Tag key={i.part_id} color="blue" closable onClose={() => updateItemQty(i.part_id, 0)}>{i.code} (x{i.quantity})</Tag>
                            ))}
                            <Button type="link" size="small" onClick={() => setTransferItems([])} icon={<RotateCcw size={14}/>}>Xóa hết</Button>
                        </Space>
                    </Card>
                )}

                <Table 
                   dataSource={filteredInventory} 
                   columns={inventoryColumns} 
                   rowKey="id" 
                   size="small"
                   loading={loading}
                   pagination={{ pageSize: 12 }}
                   className="modern-table"
                />

                <div style={{ marginTop: 24, textAlign: 'right' }}>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<ArrowRightLeft size={18} />} 
                    onClick={handleCreateTransfer}
                    loading={loading}
                    disabled={transferItems.length === 0}
                    style={{ background: 'var(--primary-color)', minWidth: 200, borderRadius: 12, height: 48 }}
                  >
                    GỬI YÊU CẦU DUYỆT CHUYỂN
                  </Button>
                </div>
              </Form>
            </Card>
          )
        },
        {
          key: '2',
          label: <Space><History size={18} /> LỊCH SỬ CHUYỂN PHỤ TÙNG</Space>,
          children: (
            <Card className="glass-card">
              <div style={{ marginBottom: 16 }}>
                <Input 
                   placeholder="Tìm theo mã phiếu..." 
                   prefix={<Search size={18} opacity={0.6} />}
                   allowClear
                   value={historySearchText}
                   onChange={(e) => setHistorySearchText(e.target.value)}
                   style={{ width: 300, borderRadius: 10 }}
                />
              </div>
              <Table 
                dataSource={transfers.filter(t => t.transfer_code?.toLowerCase().includes(historySearchText.toLowerCase()))} 
                columns={historyColumns} 
                rowKey="id" 
                loading={loading}
                pagination={{ pageSize: 12 }}
              />
            </Card>
          )
        }
      ]} />

      <Modal
        title={`CHI TIẾT PHIẾU ${detailData?.transfer?.transfer_code}`}
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={900}
        footer={[
          <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
          <Button key="print" type="primary" icon={<Printer size={16} />} onClick={handlePrint}>In phiếu chuyển</Button>
        ]}
        centered
      >
        {detailData && (
          <div>
            <Row gutter={24}>
              <Col span={16}>
                <div style={{ marginBottom: 20, display: 'flex', gap: 20 }}>
                   <div style={{ flex: 1, padding: 15, background: 'rgba(0,0,0,0.02)', borderRadius: 12 }}>
                      <Text type="secondary" size="small">KHO XUẤT</Text><br/>
                      <Text strong style={{ fontSize: 16 }}>{detailData.transfer.FromWarehouse?.warehouse_name}</Text>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center' }}><ArrowRightLeft size={20} opacity={0.5} /></div>
                   <div style={{ flex: 1, padding: 15, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 12 }}>
                      <Text type="secondary" size="small">KHO NHẬN</Text><br/>
                      <Text strong style={{ fontSize: 16, color: 'var(--primary-color)' }}>{detailData.transfer.ToWarehouse?.warehouse_name}</Text>
                   </div>
                </div>

                <Text strong>DANH SÁCH LINH KIỆN ({detailData.items.length})</Text>
                <Table 
                   dataSource={detailData.items} 
                   columns={[
                     { title: 'Mã PT', dataIndex: ['Part', 'code'] },
                     { title: 'Tên phụ tùng', dataIndex: ['Part', 'name'] },
                     { title: 'SL', dataIndex: 'quantity' },
                     { title: 'ĐVT', dataIndex: 'unit' },
                   ]} 
                   size="small" 
                   pagination={false} 
                   style={{ marginTop: 10 }}
                />

                <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
                  {isAdmin && detailData.transfer.status === 'PENDING_ADMIN' && (
                    <Button type="primary" icon={<ShieldCheck size={18} />} style={{ background: '#10b981', height: 45 }} block onClick={() => handleApprove(detailData.transfer.id)}>CHẤP THUẬN DUYỆT</Button>
                  )}
                  {detailData.transfer.status === 'ADMIN_APPROVED' && (user.warehouse_id === detailData.transfer.to_warehouse_id || isAdmin) && (
                    <Button type="primary" icon={<CheckCircle2 size={18} />} style={{ background: '#3b82f6', height: 45 }} block onClick={() => handleReceive(detailData.transfer.id)}>XÁC NHẬN ĐÃ NHẬN HÀNG</Button>
                  )}
                  {detailData.transfer.status !== 'RECEIVED' && detailData.transfer.status !== 'CANCELLED' && (
                    <Popconfirm title="Hủy phiếu này? Phụ tùng sẽ hoàn trả về kho xuất." onConfirm={() => handleCancel(detailData.transfer.id)}>
                      <Button danger icon={<XCircle size={18} />} style={{ height: 45 }}>HỦY PHIẾU</Button>
                    </Popconfirm>
                  )}
                </div>
              </Col>
              <Col span={8}>
                <div style={{ padding: 15, background: 'rgba(0,0,0,0.02)', borderRadius: 12, height: '100%' }}>
                   <Text strong style={{ display: 'block', marginBottom: 15 }}>LỊCH TRÌNH</Text>
                    <Timeline
                      items={detailData.logs.map(log => ({
                         key: log.id,
                         color: log.action === 'CREATE' ? 'orange' : log.action === 'APPROVE' ? 'blue' : log.action === 'RECEIVE' ? 'green' : 'red',
                         children: (
                           <div>
                             <Text strong size="small">{log.action}</Text>
                             <div style={{ fontSize: 12, color: '#64748b' }}>{log.details}</div>
                             <div style={{ fontSize: 11, opacity: 0.5 }}>{dayjs(log.timestamp).format('DD/MM HH:mm')}</div>
                           </div>
                         )
                      }))}
                    />
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      <style>{`
        .ant-table-thead > tr > th { background: #f1f5fb !important; font-weight: 700 !important; }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active { background: var(--primary-color) !important; }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: white !important; }
      `}</style>
    </div>
  );
};

export default PartTransferPage;
