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
  Result,
  Badge,
  Alert,
  DatePicker,
  InputNumber
} from 'antd';
import { 
  ArrowRightLeft, 
  Plus, 
  History, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Truck, 
  Info, 
  Trash2, 
  XCircle,
  MapPin,
  Calendar,
  Search,
  User as UserIcon,
  Edit,
  Printer
} from 'lucide-react';

import api from '../../utils/api';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;

const TransferPage = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [editingTransfer, setEditingTransfer] = useState(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [vehicleSearchText, setVehicleSearchText] = useState('');
  const [historySearchText, setHistorySearchText] = useState('');
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    fetchWarehouses();
    fetchTransfers();
    const primaryWH = user.warehouse_id;
    if (primaryWH) {
       fetchAvailableVehicles(primaryWH);
    }
  }, []);


  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      if (isAdmin || user.accessible_warehouses) {
        const allWh = res.data;
        if (isAdmin) {
          setWarehouses(allWh);
        } else {
          const allowedIds = [user.warehouse_id, ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])];
          setWarehouses(allWh.filter(w => allowedIds.includes(w.id)));
        }
      } else {
        setWarehouses(res.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/transfers');
      setTransfers(res.data);
    } catch (e) {
      message.error('Lỗi tải danh sách chuyển kho');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableVehicles = async (warehouseId, includeTransferId = null) => {
    try {
      const url = includeTransferId 
        ? `/vehicles-in-warehouse/${warehouseId}?include_transfer_id=${includeTransferId}`
        : `/vehicles-in-warehouse/${warehouseId}`;
      const res = await api.get(url);
      setAvailableVehicles(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTransfer = async () => {
    try {
      const values = await form.validateFields();
      if (selectedVehicleIds.length === 0) {
        return message.warning('Vui lòng chọn ít nhất 1 xe để chuyển!');
      }

      setLoading(true);
      if (editingTransfer) {
        await api.put(`/transfers/${editingTransfer.id}`, {
          from_warehouse_id: values.from_warehouse_id,
          to_warehouse_id: values.to_warehouse_id,
          vehicle_ids: selectedVehicleIds,
          notes: values.notes
        });
        message.success('Đã cập nhật phiếu chuyển kho!');
      } else {
        await api.post('/transfers', {
          from_warehouse_id: values.from_warehouse_id,
          to_warehouse_id: values.to_warehouse_id,
          vehicle_ids: selectedVehicleIds,
          notes: values.notes
        });
        message.success('Đã gửi yêu cầu chuyển kho. Chờ Admin duyệt!');
      }

      form.resetFields();
      setSelectedVehicleIds([]);
      setEditingTransfer(null);
      fetchTransfers();
      if (user.warehouse_id) fetchAvailableVehicles(user.warehouse_id);
      else setAvailableVehicles([]);
      setActiveTab('2');

    } catch (e) {
      message.error('Lỗi: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transfer, vehicles) => {
    setEditingTransfer(transfer);
    setIsDetailModalOpen(false);
    setActiveTab('1');
    form.setFieldsValue({
      from_warehouse_id: transfer.from_warehouse_id,
      to_warehouse_id: transfer.to_warehouse_id,
      notes: transfer.notes
    });
    fetchAvailableVehicles(transfer.from_warehouse_id, transfer.id);
    setSelectedVehicleIds(vehicles.map(v => v.id));
  };

  const clearEdit = () => {
    setEditingTransfer(null);
    form.resetFields();
    setSelectedVehicleIds([]);
  };

  const loadDetails = async (id) => {

    setLoading(true);
    try {
      const res = await api.get(`/transfers/${id}`);
      setDetailData(res.data);
      setIsDetailModalOpen(true);
    } catch (e) {
      message.error('Không thể tải chi tiết');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/transfers/${id}/approve`);
      message.success('Đã duyệt phiếu chuyển kho!');
      setIsDetailModalOpen(false);
      fetchTransfers();
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
    }
  };

  const handleReceive = async (id) => {
    try {
      await api.post(`/transfers/${id}/receive`);
      message.success('Đã xác nhận nhận đủ hàng!');
      setIsDetailModalOpen(false);
      fetchTransfers();
      if (user.warehouse_id) fetchAvailableVehicles(user.warehouse_id);
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
    }
  };

  const handlePayment = async () => {
    try {
      const vals = await paymentForm.validateFields();
      setLoading(true);
      await api.post('/transfers/payment', {
        transfer_id: detailData.transfer.id,
        ...vals
      });
      message.success('Ghi nhận thanh toán thành công!');
      setIsPaymentModalOpen(false);
      paymentForm.resetFields();
      loadDetails(detailData.transfer.id);
      fetchTransfers();
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.post(`/transfers/${id}/cancel`);
      message.success('Đã hủy phiếu chuyển kho!');
      setIsDetailModalOpen(false);
      fetchTransfers();
      if (user.warehouse_id) fetchAvailableVehicles(user.warehouse_id);
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
    }
  };

  const handlePrintTransfer = (data) => {
    if (!data) return;
    const { transfer, vehicles } = data;
    const fromWH = warehouses.find(w => w.id === transfer.from_warehouse_id)?.warehouse_name || 'N/A';
    const toWH = warehouses.find(w => w.id === transfer.to_warehouse_id)?.warehouse_name || 'N/A';

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Phiếu chuyển kho ${transfer.transfer_code}</title>
    <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 12pt; padding: 30px; line-height: 1.5; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .title { font-size: 18pt; font-weight: bold; margin-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background: #eee; text-align: center; }
        .center { text-align: center; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; }
        .signature-box { text-align: center; width: 200px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">PHIẾU CHUYỂN KHO NỘI BỘ</div>
        <div>Mã phiếu: <strong>${transfer.transfer_code}</strong></div>
        <div>Ngày lập: ${dayjs(transfer.createdAt).format('DD/MM/YYYY HH:mm')}</div>
    </div>

    <div class="info-grid">
        <div><strong>Kho xuất:</strong> ${fromWH}</div>
        <div><strong>Kho nhận:</strong> ${toWH}</div>
        <div><strong>Người lập:</strong> ${transfer.creator?.full_name || 'N/A'}</div>
        <div><strong>Ghi chú:</strong> ${transfer.notes || '---'}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 40px">STT</th>
                <th>Loại xe</th>
                <th>Màu xe</th>
                <th>Số Máy</th>
                <th>Số Khung</th>
                <th style="width: 100px">Kiểm tra</th>
            </tr>
        </thead>
        <tbody>
            ${vehicles.map((v, i) => `
                <tr>
                    <td class="center">${i + 1}</td>
                    <td>${v.VehicleType?.name || 'N/A'}</td>
                    <td>${v.VehicleColor?.color_name || 'N/A'}</td>
                    <td>${v.engine_no}</td>
                    <td>${v.chassis_no}</td>
                    <td></td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">
        <div class="signature-box">
            <strong>Người xuất hàng</strong><br/>
            (Ký, họ tên)
        </div>
        <div class="signature-box">
            <strong>Người nhận hàng</strong><br/>
            (Ký, họ tên)
        </div>
    </div>

    <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

    const pw = window.open('', '_blank', 'width=800,height=600');
    pw.document.write(html);
    pw.document.close();
  };

  const getStatusTag = (status) => {
    const config = {
      'PENDING_ADMIN': { color: 'orange', text: 'Chờ Admin duyệt', icon: <Clock size={14} /> },
      'ADMIN_APPROVED': { color: 'blue', text: 'Đã duyệt - Đang đi đường', icon: <Truck size={14} /> },
      'RECEIVED': { color: 'green', text: 'Đã hoàn tất', icon: <CheckCircle2 size={14} /> },
      'CANCELLED': { color: 'red', text: 'Đã hủy', icon: <XCircle size={14} /> },
    };
    const s = config[status] || { color: 'default', text: status };
    return <Tag color={s.color} style={{ display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>{s.icon} {s.text}</Tag>;
  };

  const handleFromWarehouseChange = (warehouseId) => {
    fetchAvailableVehicles(warehouseId);
    setSelectedVehicleIds([]); // Reset selection when warehouse changes
  };

  const columns = [
    { title: 'Mã Phiếu', dataIndex: 'transfer_code', key: 'transfer_code', render: (text, r) => <a onClick={() => loadDetails(r.id)}><Text strong>{text}</Text></a> },
    { title: 'Từ Kho', dataIndex: 'from_warehouse_id', render: id => warehouses.find(w => w.id === id)?.warehouse_name || 'N/A' },
    { title: 'Đến Kho', dataIndex: 'to_warehouse_id', render: id => warehouses.find(w => w.id === id)?.warehouse_name || 'N/A' },
    { title: 'Tổng Tiền', dataIndex: 'total_amount', render: v => <Text strong>{Number(v).toLocaleString()}</Text> },
    { title: 'Đã Trả', dataIndex: 'paid_amount_vnd', render: v => <Text strong style={{ color: '#10b981' }}>{Number(v).toLocaleString()}</Text> },
    { title: 'Còn Nợ', key: 'debt', render: (_, r) => <Tag color={(Number(r.total_amount) - Number(r.paid_amount_vnd)) > 0 ? 'red' : 'green'}>{(Number(r.total_amount) - Number(r.paid_amount_vnd)).toLocaleString()}</Tag> },
    { title: 'Trạng Thái', dataIndex: 'status', render: status => getStatusTag(status) },
    { title: '', key: 'action', render: (_, r) => <Button size="small" onClick={() => loadDetails(r.id)}>Chi tiết</Button> }
  ];

  const vehicleColumns = [
    { title: 'Loại xe', key: 'type', render: (_, r) => r.VehicleType?.name || 'N/A' },
    { title: 'Màu', key: 'color', render: (_, r) => <Tag color="blue">{r.VehicleColor?.color_name || 'N/A'}</Tag> },
    { title: 'Số Máy', dataIndex: 'engine_no', render: v => <Text code>{v}</Text> },
    { title: 'Số Khung', dataIndex: 'chassis_no', render: v => <Text code>{v}</Text> },
    { title: 'Giá (đ)', dataIndex: 'price_vnd', render: v => Number(v).toLocaleString() }
  ];

  const filteredVehicles = availableVehicles.filter(v => 
    v.engine_no?.toLowerCase().includes(vehicleSearchText.toLowerCase()) ||
    v.chassis_no?.toLowerCase().includes(vehicleSearchText.toLowerCase()) ||
    v.VehicleType?.name?.toLowerCase().includes(vehicleSearchText.toLowerCase()) ||
    v.VehicleColor?.color_name?.toLowerCase().includes(vehicleSearchText.toLowerCase())
  );

  const filteredHistory = transfers.filter(t => 
    t.transfer_code?.toLowerCase().includes(historySearchText.toLowerCase()) ||
    warehouses.find(w => w.id === t.from_warehouse_id)?.warehouse_name?.toLowerCase().includes(historySearchText.toLowerCase()) ||
    warehouses.find(w => w.id === t.to_warehouse_id)?.warehouse_name?.toLowerCase().includes(historySearchText.toLowerCase())
  );


  const isPowerUser = user.role === 'ADMIN' || user.role === 'MANAGER';
  // Allow selection if power user OR has multiple warehouses
  const canSelectFromWarehouse = isPowerUser || warehouses.length > 1;
  const filteredFromWarehouses = warehouses;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} className="gradient-text" style={{ margin: 0 }}>LUÂN CHUYỂN XE GIỮA CÁC KHO</Title>
          <Text type="secondary">Quy trình: Tạo phiếu (Kho A) → Duyệt (Admin) → Xác nhận nhận (Kho B)</Text>
        </div>
        { (!isAdmin && (user.accessible_warehouses && user.accessible_warehouses.length > 0)) ? (
           <Card size="small" style={{ borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', borderColor: 'var(--primary-color)' }}>
              <Space><MapPin size={16} /> <Text strong>Bạn có quyền truy cập {1 + (user.accessible_warehouses ? user.accessible_warehouses.split(',').length : 0)} kho</Text></Space>
           </Card>
        ) : (!isAdmin && user.warehouse_id && (
           <Badge count={availableVehicles.length} overflowCount={999} offset={[-10, 10]}>
             <Card size="small" style={{ borderRadius: 12, background: 'rgba(59, 130, 246, 0.1)', borderColor: 'var(--primary-color)' }}>
                <Space><MapPin size={16} /> <Text strong>Kho của bạn: {warehouses.find(w => w.id === user.warehouse_id)?.warehouse_name}</Text></Space>
             </Card>
           </Badge>
        ))}
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" items={[
        {
          key: '1',
          label: <Space>{editingTransfer ? <Edit size={18} /> : <Plus size={18} />} {editingTransfer ? 'SỬA PHIẾU' : 'TẠO PHIẾU MỚI'}</Space>,
          children: (
            <Card className="glass-card" title={editingTransfer && <Alert description={`Bạn đang chỉnh sửa phiếu ${editingTransfer.transfer_code}`} type="info" action={<Button size="small" onClick={clearEdit}>Hủy bỏ & Tạo mới</Button>} showIcon />}>


              <Form form={form} layout="vertical" initialValues={{ from_warehouse_id: user.warehouse_id }}>
                <Row gutter={24}>
                  <Col span={8}>
                    <Form.Item label="Từ kho chi nhánh" name="from_warehouse_id" rules={[{ required: true, message: 'Chọn kho xuất' }]}>
                      <Select 
                        placeholder="Chọn kho xuất hàng" 
                        size="large" 
                        onChange={handleFromWarehouseChange}
                        disabled={!canSelectFromWarehouse}
                      >
                        {filteredFromWarehouses.map(w => (
                          <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item noStyle shouldUpdate={(prevVal, curVal) => prevVal.from_warehouse_id !== curVal.from_warehouse_id}>
                      {({ getFieldValue }) => {
                        const fromId = getFieldValue('from_warehouse_id');
                        return (
                          <Form.Item 
                            label="Đến kho chi nhánh" 
                            name="to_warehouse_id" 
                            rules={[{ required: true, message: 'Chọn kho đích' }]}
                          >
                            <Select placeholder="Chọn chi nhánh nhận hàng" size="large">
                              {warehouses
                                .filter(w => w.id !== fromId)
                                .map(w => (
                                  <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>
                                ))}
                            </Select>
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                  </Col>


                  <Col span={8}>
                    <Form.Item label="Ghi chú vận chuyển" name="notes">
                      <Input placeholder="Ghi chú..." size="large" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Divider orientation="left">
                   CHỌN XE TRONG KHO ({availableVehicles.length} xe sẵn sàng) 
                   {selectedVehicleIds.length > 0 && <Tag color="green" style={{ marginLeft: 10 }}>ĐANG CHỌN {selectedVehicleIds.length} XE</Tag>}
                </Divider>
                
                <div style={{ marginBottom: 16 }}>
                  {selectedVehicleIds.length > 0 && (
                    <Card size="small" style={{ marginBottom: 16, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 10 }}>
                        <div style={{ marginBottom: 8 }}><Text strong size="small">XE ĐÃ CHỌN:</Text></div>
                        <Space wrap>
                            {selectedVehicleIds.map(id => {
                                const v = availableVehicles.find(av => av.id === id);
                                return v ? (
                                    <Tag 
                                        key={id} 
                                        color="blue" 
                                        closable 
                                        onClose={() => setSelectedVehicleIds(prev => prev.filter(i => i !== id))}
                                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}
                                    >
                                        {v.engine_no}
                                    </Tag>
                                ) : null;
                            })}
                        </Space>
                    </Card>
                  )}
                  <Input 
                    placeholder="Tìm theo số máy hoặc số khung..." 
                    prefix={<Search size={18} opacity={0.6} />} 
                    allowClear
                    size="large"
                    value={vehicleSearchText}
                    onChange={(e) => setVehicleSearchText(e.target.value)}
                    style={{ borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}
                  />
                </div>

                <Table 
                   dataSource={filteredVehicles} 
                   columns={vehicleColumns} 
                   rowKey="id"
                   size="small"
                   pagination={{ pageSize: 12 }}
                   rowSelection={{
                     type: 'checkbox',
                     selectedRowKeys: selectedVehicleIds,
                     onChange: (keys) => setSelectedVehicleIds(keys),
                     preserveSelectedRowKeys: true
                   }}
                />

                <div style={{ marginTop: 24, textAlign: 'right' }}>
                  <Button 
                    type="primary" 
                    size="large" 
                    icon={<ArrowRightLeft size={18} />} 
                    style={{ background: 'var(--primary-color)', minWidth: 200, height: 48, borderRadius: 12 }}
                    onClick={handleCreateTransfer}
                    loading={loading}
                    disabled={selectedVehicleIds.length === 0}
                  >
                    GỬI YÊU CẦU ĐỢI DUYỆT
                  </Button>
                </div>
              </Form>
            </Card>
          )
        },

        {
          key: '2',
          label: <Space><History size={18} /> LỊCH SỬ CHUYỂN KHO</Space>,
          children: (
            <Card className="glass-card">
              <div style={{ marginBottom: 16 }}>
                <Input 
                   placeholder="Tìm theo mã phiếu, tên kho..." 
                   prefix={<Search size={18} opacity={0.6} />}
                   allowClear
                   value={historySearchText}
                   onChange={(e) => setHistorySearchText(e.target.value)}
                   style={{ width: 300, borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}
                />
              </div>
              <Table 
                dataSource={filteredHistory} 
                columns={columns} 
                rowKey="id" 
                loading={loading}
                pagination={{ pageSize: 12 }}
              />
            </Card>
          )
        }
      ]} />

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ArrowRightLeft color="var(--primary-color)" />
            <span>CHI TIẾT PHIẾU {detailData?.transfer?.transfer_code}</span>
          </div>
        }
        open={isDetailModalOpen}
        onCancel={() => setIsDetailModalOpen(false)}
        width={900}
        footer={null}
        centered
      >
        {detailData && (
          <div style={{ padding: '10px 0' }}>
            <Row gutter={24}>
              <Col span={16}>
                <div style={{ marginBottom: 20, display: 'flex', gap: 20 }}>
                   <div style={{ flex: 1, padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border-color)' }}>
                      <Text type="secondary" size="small">KHO XUẤT</Text><br/>
                      <Badge dot={editingTransfer?.id === detailData.transfer.id}><Text strong style={{ fontSize: 16 }}>{warehouses.find(w => w.id === detailData.transfer.from_warehouse_id)?.warehouse_name}</Text></Badge>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center' }}><ArrowRightLeft size={20} opacity={0.5} /></div>
                   <div style={{ flex: 1, padding: 15, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 12, border: '1px solid var(--primary-color)' }}>
                      <Text type="secondary" size="small">KHO NHẬN</Text><br/>
                      <Text strong style={{ fontSize: 16, color: 'var(--primary-color)' }}>{warehouses.find(w => w.id === detailData.transfer.to_warehouse_id)?.warehouse_name}</Text>
                   </div>
                </div>

                <div style={{ marginBottom: 20, padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                  <Space><UserIcon size={14} /> <Text type="secondary">Lập bởi:</Text> <Text strong>{detailData.transfer.creator?.full_name || 'N/A'}</Text></Space>
                </div>


                <Text strong>DANH SÁCH XE ({detailData.vehicles.length})</Text>
                <Table 
                   dataSource={detailData.vehicles} 
                   columns={vehicleColumns} 
                   size="small" 
                   pagination={false} 
                   style={{ marginTop: 10 }}
                />
                
                <div style={{ marginTop: 24 }}>
                  <Text strong>LỊCH SỬ THANH TOÁN ({detailData.payments?.length || 0})</Text>
                  <Table 
                    dataSource={detailData.payments} 
                    size="small" 
                    pagination={false} 
                    style={{ marginTop: 10 }}
                    columns={[
                      { title: 'Ngày trả', dataIndex: 'payment_date', render: d => dayjs(d).format('DD/MM/YYYY') },
                      { title: 'Số tiền', dataIndex: 'amount_paid_vnd', render: v => <Text strong style={{ color: '#10b981' }}>{Number(v).toLocaleString()} đ</Text> },
                      { title: 'Ghi chú', dataIndex: 'notes' }
                    ]}
                  />
                  <div style={{ marginTop: 12, textAlign: 'right' }}>
                    <Text type="secondary">Đã thanh toán: </Text>
                    <Title level={4} style={{ display: 'inline', margin: 0, color: '#10b981' }}>{Number(detailData.transfer.paid_amount_vnd).toLocaleString()} đ</Title>
                    {isAdmin && (
                      <Button style={{ marginLeft: 16 }} onClick={() => setIsPaymentModalOpen(true)}>+ Trả thêm</Button>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 20 }}>
                  <Text type="secondary">Ghi chú phiếu: </Text>
                  <Text>{detailData.transfer.notes || '---'}</Text>
                </div>

                <div style={{ marginTop: 32, display: 'flex', gap: 12 }}>
                  {/* ADMIN EDIT */}
                  {isAdmin && detailData.transfer.status !== 'RECEIVED' && detailData.transfer.status !== 'CANCELLED' && (
                    <Button icon={<Edit size={16} />} onClick={() => handleEdit(detailData.transfer, detailData.vehicles)}>CHỈNH SỬA</Button>
                  )}

                  {/* PRINT ANYTIME */}
                  <Button icon={<Printer size={16} />} onClick={() => handlePrintTransfer(detailData)}>IN PHIẾU KIỂM</Button>

                  {/* ADMIN APPROVE */}
                  {isAdmin && detailData.transfer.status === 'PENDING_ADMIN' && (
                    <Button type="primary" icon={<ShieldCheck size={18} />} style={{ background: '#10b981', height: 45 }} block onClick={() => handleApprove(detailData.transfer.id)}>XÁC NHẬN DUYỆT PHIẾU</Button>
                  )}

                  
                  {/* RECEIVE (Only if Admin approved and user is in To Warehouse) */}
                  {detailData.transfer.status === 'ADMIN_APPROVED' && (user.warehouse_id === detailData.transfer.to_warehouse_id || isAdmin) && (
                    <Button type="primary" icon={<CheckCircle2 size={18} />} style={{ background: '#3b82f6', height: 45 }} block onClick={() => handleReceive(detailData.transfer.id)}>XÁC NHẬN ĐÃ NHẬN ĐỦ XE</Button>
                  )}

                  {/* CANCEL (Admin or Requester) */}
                  {(isAdmin || (user.id === detailData.transfer.created_by)) && detailData.transfer.status !== 'RECEIVED' && detailData.transfer.status !== 'CANCELLED' && (
                    <Popconfirm title="Hủy phiếu này? Các xe sẽ quay lại trạng thái Sẵn sàng ở kho cũ." onConfirm={() => handleCancel(detailData.transfer.id)}>
                      <Button danger icon={<XCircle size={18} />} style={{ height: 45 }}>HỦY PHIẾU</Button>
                    </Popconfirm>
                  )}
                </div>
              </Col>
              
              <Col span={8}>
                <div style={{ padding: 15, background: 'rgba(255,255,255,0.02)', borderRadius: 12, height: '100%', borderLeft: '1px solid var(--border-color)' }}>
                   <Text strong style={{ display: 'block', marginBottom: 15 }}>TIẾN ĐỘ & LƯU VẾT</Text>
                    <Timeline
                      items={detailData.logs.map(log => ({
                         key: log.id,
                         color: log.action === 'CREATE' ? 'orange' : log.action === 'APPROVE' ? 'blue' : log.action === 'RECEIVE' ? 'green' : 'red',
                         children: (
                           <div key={log.id}>
                             <Text strong size="small">{log.action}</Text>
                             <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.details}</div>
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

      {/* MODAL GHI THANH TOÁN */}
      <Modal
        title="GHI NHẬN THANH TOÁN CHUYỂN KHO"
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        onOk={() => paymentForm.submit()}
        confirmLoading={loading}
      >
        <Form form={paymentForm} layout="vertical" onFinish={handlePayment} initialValues={{ payment_date: dayjs() }}>
          <Form.Item label="Số vốn thanh toán (đ)" name="amount_paid_vnd" rules={[{ required: true }]}>
              <InputNumber 
                style={{ width: '100%' }} 
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                parser={v => v.replace(/\$\s?|(,*)/g, '')}
              />
          </Form.Item>
          <Form.Item label="Ngày trả" name="payment_date" rules={[{ required: true }]}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea rows={2} placeholder="Chi phí vận chuyển, hạch toán đối chất..." />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .ant-table { background: transparent !important; }
        .ant-table-cell { background: transparent !important; }
        .ant-table-thead > tr > th { background: #f1f5fb !important; color: #0f172a !important; border-bottom: 1px solid var(--border-color) !important; font-weight: 700 !important; }
        .ant-table-cell { border-bottom: 1px solid #cbd5e1 !important; color: #000000 !important; font-weight: 600; }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active { background: var(--primary-color) !important; border-color: var(--primary-color) !important; }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: white !important; }
      `}</style>
    </div>
  );
};

export default TransferPage;
