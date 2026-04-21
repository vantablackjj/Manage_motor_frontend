import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  Tabs, Card, Typography, Row, Col, Badge, Space, Button, 
  message, Empty, Select, Table, Tag, Form, Input, 
  InputNumber, DatePicker, AutoComplete, Divider, Popconfirm, Modal, Timeline 
} from 'antd';
import { 
  LayoutGrid, Wrench, User, Bike, Clock, PlusCircle, Expand, 
  Settings, History, Save, Trash2, CheckCircle, Search, FileText, Eye, XCircle, MapPin, Printer
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import PrintMaintenanceOrder from '../../components/PrintMaintenanceOrder';

dayjs.extend(relativeTime);
dayjs.locale('vi');
import { capitalizeName } from '../../utils/stringHelper';

const { Title, Text } = Typography;

// --- SUB-COMPONENT: MAINTENANCE BOARD ---
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const MaintenanceBoard = ({ lifts, fetchData, loading, onEditOrder, onCreateNew }) => {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [now, setNow] = useState(dayjs());
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000); // Cập nhật mỗi 1 giây
    return () => clearInterval(timer);
  }, []);


  const getDurationText = (startTime) => {
    if (!startTime) return 'N/A';
    
    // Tính toán dựa trên timestamp tuyệt đối để tránh lệch múi giờ
    const start = dayjs(startTime).valueOf();
    const current = now.valueOf();
    let diffInSeconds = Math.floor((current - start) / 1000);
    
    if (diffInSeconds < 0) diffInSeconds = 0; // Tránh trường hợp đồng hồ máy tính bị chậm
    
    if (diffInSeconds < 60) return `${diffInSeconds} giây`;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    const seconds = diffInSeconds % 60;
    
    if (hours > 0) return `${hours} giờ ${minutes} phút ${seconds} giây`;
    return `${minutes} phút ${seconds} giây`;
  };



    const fetchInitialData = async () => {
        try {
            const whRes = await api.get('/warehouses');
            setWarehouses(whRes.data);
            if (!isAdmin && user.warehouse_id) {
                setSelectedWarehouse(user.warehouse_id);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    const filteredLifts = lifts.filter(l => !selectedWarehouse || l.warehouse_id === selectedWarehouse);

    const getStatusColor = (status) => {
        switch (status) {
            case 'AVAILABLE': return 'success';
            case 'BUSY': return 'error';
            case 'MAINTENANCE': return 'warning';
            default: return 'default';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'AVAILABLE': return 'SẴN SÀNG';
            case 'BUSY': return 'ĐANG SỬA';
            case 'MAINTENANCE': return 'BẢO TRÌ BÀN';
            default: return 'KO XÁC ĐỊNH';
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Text type="secondary">Quản lý và theo dõi trạng thái sửa chữa thời gian thực</Text>
                <Space>
                    {isAdmin ? (
                        <Select 
                            placeholder="Lọc theo kho/chi nhánh" 
                            style={{ width: 250 }}
                            allowClear
                            value={selectedWarehouse}
                            onChange={setSelectedWarehouse}
                        >
                            {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                        </Select>
                    ) : (
                        <Tag color="blue" style={{ padding: '4px 12px', borderRadius: 8 }}>
                           <Space><MapPin size={14} /> <Text strong>{warehouses.find(w => w.id === user.warehouse_id)?.warehouse_name}</Text></Space>
                        </Tag>
                    )}
                    <Button icon={<Clock size={16} />} onClick={fetchData} loading={loading}>Làm mới</Button>
                </Space>
            </div>

            <Row gutter={[20, 20]}>
                {filteredLifts.map(lift => {
                    const activeOrder = lift.MaintenanceOrders?.[0];
                    return (
                        <Col xs={24} sm={12} md={8} lg={6} key={lift.id}>
                            <Card 
                                hoverable
                                className={`lift-card ${lift.status === 'BUSY' ? 'busy-lift' : ''}`}
                                styles={{ body: { padding: '16px' } }}
                                style={{ borderRadius: 16, cursor: 'pointer' }}
                                onClick={() => {
                                    const activeOrder = lift.MaintenanceOrders?.[0];
                                    if (lift.status === 'BUSY' && activeOrder) {
                                        onEditOrder(activeOrder.id);
                                    }
                                    else if (lift.status === 'AVAILABLE') {
                                        onCreateNew({ lift_id: lift.id, warehouse_id: lift.warehouse_id });
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Text strong>{lift.name}</Text>
                                    <Badge status={getStatusColor(lift.status)} text={<span style={{ fontWeight: 'bold', fontSize: 11 }}>{getStatusText(lift.status)}</span>} />
                                </div>

                                {lift.status === 'BUSY' && activeOrder ? (
                                    <div style={{ minHeight: 120 }}>
                                        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                                            <Bike size={14} style={{ marginRight: 8, opacity: 0.7 }} />
                                            <Text strong style={{ fontSize: 18, color: 'var(--primary-color)' }}>{activeOrder.license_plate || 'Chưa biển'}</Text>
                                        </div>
                                        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
                                            <User size={14} style={{ marginRight: 8, opacity: 0.7 }} />
                                            <Text>{activeOrder.customer_name}</Text>
                                        </div>
                                        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                                            <Clock size={14} style={{ marginRight: 8, opacity: 0.7 }} />
                                            <Text style={{ fontSize: 13 }}>Sửa được: <Text strong style={{ color: '#f59e0b' }}>{getDurationText(activeOrder.createdAt)}</Text></Text>
                                        </div>

                                        <Button block type="primary" ghost icon={<Expand size={14} />} onClick={() => onEditOrder(activeOrder.id)}>Chi tiết / Cập nhật</Button>
                                    </div>
                                ) : (
                                    <div style={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
                                        {lift.status === 'AVAILABLE' ? (
                                            <Button icon={<PlusCircle size={16} />} onClick={() => onCreateNew({ lift_id: lift.id, warehouse_id: lift.warehouse_id })}>Tiếp nhận xe</Button>
                                        ) : <Text italic>Đang bảo trì bàn</Text>}
                                    </div>
                                )}
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 11, opacity: 0.5 }}>Chi nhánh: {lift.Warehouse?.warehouse_name}</div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
};

// --- SUB-COMPONENT: LIFT MANAGER ---
const LiftManager = () => {
    const [data, setData] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [liftRes, whRes] = await Promise.all([api.get('/lift-tables'), api.get('/warehouses')]);
            setData(liftRes.data);
            setWarehouses(whRes.data);
        } catch (error) { message.error(error.message); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (values) => {
        try {
            if (editingItem) await api.put(`/lift-tables/${editingItem.id}`, values);
            else await api.post('/lift-tables', values);
            setIsModalOpen(false);
            fetchData();
        } catch (error) { message.error(error.message); }
    };

    return (
        <Card className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>Quản lý bàn nâng</Title>
                <Button type="primary" onClick={() => { setEditingItem(null); form.resetFields(); setIsModalOpen(true); }}>Thêm bàn nâng</Button>
            </div>
            <Table 
                columns={[
                    { title: 'Tên bàn', dataIndex: 'name' },
                    { title: 'Kho', dataIndex: ['Warehouse', 'warehouse_name'] },
                    { title: 'Trạng thái', dataIndex: 'status', render: s => <Tag color={s === 'BUSY' ? 'blue' : 'green'}>{s}</Tag> },
                    { title: 'Thao tác', render: (_, r) => <Button type="text" icon={<Trash2 size={16} />} onClick={async () => { await api.delete(`/lift-tables/${r.id}`); fetchData(); }} /> }
                ]} 
                dataSource={data} 
                rowKey="id" 
                loading={loading}
            />
            {/* Modal simple for brevity in this merged file */}
            <Modal 
                title={editingItem ? "Sửa bàn nâng" : "Thêm bàn nâng"}
                open={isModalOpen} 
                onOk={() => form.submit()} 
                onCancel={() => setIsModalOpen(false)}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="name" label="Tên bàn" rules={[{required:true}]}><Input /></Form.Item>
                    <Form.Item name="warehouse_id" label="Kho" rules={[{required:true}]}>
                        <Select>
                            {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

// --- MAIN HUB PAGE ---
const MaintenanceHub = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('board');
    const [form] = Form.useForm();
    
    // --- Shared States ---
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [mechanics, setMechanics] = useState([]);
    const [allParts, setAllParts] = useState([]);
    const [liftTables, setLiftTables] = useState([]);
    const [vehicleFound, setVehicleFound] = useState(null);
    const [history, setHistory] = useState([]);
    const [partOptions, setPartOptions] = useState([]);
    const [vehicleOptions, setVehicleOptions] = useState([]);
    const [vehicleHistoryModal, setVehicleHistoryModal] = useState(null); // { engine_no, license_plate, chassis_no, customer_name }
    const engineNo = Form.useWatch('engine_no', form);
    const licensePlate = Form.useWatch('license_plate', form);
    const chassisNo = Form.useWatch('chassis_no', form);
    const [printingOrder, setPrintingOrder] = useState(null);
    const selectedWarehouse = Form.useWatch('warehouse_id', form);
    const [historySearch, setHistorySearch] = useState('');

    const fetchData = async () => {
        try {
            const [whRes, mechanicsRes, partsRes, liftRes, historyRes] = await Promise.all([
                api.get('/warehouses'),
                api.get('/mechanics'),
                api.get('/parts'),
                api.get('/lift-tables'),
                api.get('/maintenance-orders')
            ]);
            setWarehouses(whRes.data);
            setMechanics(mechanicsRes.data.filter(m => m.is_active));
            setAllParts(partsRes.data);
            setLiftTables(liftRes.data);
            setHistory(historyRes.data);
        } catch (e) { message.error(e.message); }
    };

    const fetchOrderDetails = async (orderId) => {
        setLoading(true);
        setPrintingOrder(null);
        try {
            const res = await api.get('/maintenance-orders');
            const order = res.data.find(o => o.id === orderId);
            if (order) {
                form.setFieldsValue({ 
                    ...order, 
                    maintenance_date: dayjs(order.maintenance_date)
                });
                setItems(order.MaintenanceItems.map(i => ({
                    key: i.id, type: i.type, part_id: i.part_id, 
                    description: i.type === 'PART' ? i.Part?.name : i.description,
                    unit: i.unit, quantity: i.quantity, 
                    unit_price: i.unit_price, total_price: i.total_price,
                    sale_type: i.sale_type || 'THU_NGAY',
                    purchase_price: i.purchase_price || 0,
                    Part: i.Part
                })));
                setVehicleFound({ 
                    internal: order.is_internal_vehicle, 
                    data: order 
                });
                setActiveTab('form');
            }
        } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        if (id) {
            fetchOrderDetails(id);
        } else if (location.state?.lift_id) {
            setActiveTab('form');
            form.setFieldsValue({ 
                lift_table_id: location.state.lift_id, 
                warehouse_id: location.state.warehouse_id,
                maintenance_date: dayjs()
            });
        }
    }, [id, location.state]);

    const handleEditFromBoard = (id) => {
        navigate(`/maintenance-hub/${id}`);
        setActiveTab('form');
    };

    const handleCreateNew = (initialData = {}) => {
        navigate('/maintenance-hub', { state: initialData });
        setActiveTab('form');
        form.resetFields();
        setItems([]);
    };

    const handlePartSearch = async (value) => {
        if (!value) {
            setPartOptions([]);
            return;
        }
        try {
            const res = await api.get(`/parts?search=${value}`);
            const parts = res.data;

            // Lấy tồn kho của tất cả phụ tùng này để check kho khác
            const invRes = await api.get(`/part-inventory`);
            const allInventory = invRes.data;

            const options = parts.map(p => {
                // Tồn tại kho đang chọn
                const currentWHInv = allInventory.find(i => i.part_id === p.id && i.warehouse_id === selectedWarehouseId);
                const stockInCurrent = currentWHInv ? Number(currentWHInv.quantity) : 0;
                
                // Tổng tồn các kho khác
                const otherWHInv = allInventory.filter(i => i.part_id === p.id && i.warehouse_id !== selectedWarehouseId);
                const totalOtherStock = otherWHInv.reduce((sum, i) => sum + Number(i.quantity), 0);

                return {
                    value: p.code,
                    label: (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <Text strong>{p.code}</Text> - <Text>{p.name}</Text>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <Tag color={stockInCurrent > 0 ? 'green' : 'red'} style={{ margin: 0 }}>
                                    Tồn kho này: {stockInCurrent}
                                </Tag>
                                {stockInCurrent === 0 && totalOtherStock > 0 && (
                                    <div style={{ fontSize: '10px', color: '#8c8c8c', marginTop: '2px' }}>
                                        (Có {totalOtherStock} cái ở kho khác)
                                    </div>
                                )}
                            </div>
                        </div>
                    ),
                    part: p,
                    stock: stockInCurrent
                };
            });
            setPartOptions(options);
        } catch (error) {
            console.error(error);
        }
    };

    const handleVehicleSearch = async (value) => {
        if (!value) {
            setVehicleOptions([]);
            setVehicleFound(null);
            return;
        }
        if (value.length < 3) return;
        
        try {
            const res = await api.get(`/search-sold-vehicles?q=${value}`);
            let options = res.data.map(item => {
                if (item.is_previous_external) {
                    return {
                        value: `PREV_EXTERNAL_${item.id}`, // Unique value
                        label: (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>
                                    <Text strong>{item.engine_no || item.license_plate || 'Chưa rõ'}</Text> - {item.customer_name} 
                                    <div style={{ fontSize: '11px', opacity: 0.6 }}>Vãng lai (Đã ghé) | {item.phone}</div>
                                </span>
                                <Tag color="blue" style={{ margin: 0 }}>Đã ghé</Tag>
                            </div>
                        ),
                        item,
                        isInternal: false,
                        isPreviousExternal: true
                    };
                }
                return {
                    value: `INTERNAL_${item.id}`, // Unique value
                    label: (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                                <Text strong>{item.engine_no}</Text> - {item.customer_name} 
                                <div style={{ fontSize: '11px', opacity: 0.6 }}>{item.chassis_no} | {item.phone}</div>
                            </span>
                            <Tag color="green" style={{ margin: 0 }}>Hệ thống</Tag>
                        </div>
                    ),
                    item,
                    isInternal: true
                };
            });

            // Thêm tùy chọn xe ngoài mới (nếu chưa có trong list)
            if (!res.data.some(d => d.engine_no?.toUpperCase() === value.toUpperCase() || d.license_plate?.toUpperCase() === value.toUpperCase())) {
                options.push({
                    value: `EXTERNAL_${value}`, // Unique value
                    label: (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Tiếp nhận mới <b>"{value}"</b></span>
                            <Tag color="orange" style={{ margin: 0 }}>Xe lạ</Tag>
                        </div>
                    ),
                    isInternal: false,
                    isPreviousExternal: false,
                    searchValue: value
                });
            }


            setVehicleOptions(options);
        } catch (e) { console.error(e); }
    };

    const handleVehicleSelect = (val, option) => {
        if (option.isInternal) {
            const item = option.item;
            setVehicleFound({ internal: true, data: item });
            form.setFieldsValue({
                customer_name: item.customer_name || item.RetailSale?.customer_name,
                customer_phone: item.phone || item.RetailSale?.phone,
                customer_address: item.address || item.RetailSale?.address,
                engine_no: item.engine_no,
                chassis_no: item.chassis_no,
                model_name: item.Vehicle?.VehicleType?.name || '',
                search_vehicle: item.engine_no // Set input back to clean engine number
            });
            message.success('Đã nhận diện xe hệ thống bán ra!');
        } else if (option.isPreviousExternal) {
            const item = option.item;
            setVehicleFound({ internal: false, data: item });
            form.setFieldsValue({
                customer_name: item.customer_name,
                customer_phone: item.phone,
                customer_address: item.address,
                engine_no: item.engine_no,
                chassis_no: item.chassis_no,
                license_plate: item.license_plate,
                model_name: item.model_name,
                search_vehicle: item.engine_no || item.license_plate
            });
            message.success('Nhận diện xe ngoài từng ghé!');
        } else {
            const searchVal = option.searchValue;
            setVehicleFound({ internal: false });
            form.setFieldsValue({
                engine_no: searchVal,
                search_vehicle: searchVal
            });
            message.info('Tiếp nhận xe ngoài mới');
        }
    };


    const onFinish = async (values) => {
        setSubmitLoading(true);
        const hide = message.loading('Đang xử lý...', 0);
        try {
            // Đảm bảo có ngày thực hiện, mặc định là ngày hiện tại nếu bị trống
            const mDate = values.maintenance_date ? 
                (typeof values.maintenance_date.toISOString === 'function' ? values.maintenance_date : dayjs(values.maintenance_date)) : 
                dayjs();

            const totalAmount = items.reduce((s, i) => s + Number(i.total_price || 0), 0);
            
            const payload = { 
                ...values, 
                maintenance_date: mDate.toISOString(), 
                items,
                paid_amount: values.status === 'COMPLETED' ? totalAmount : (values.paid_amount || 0)
            };
            
            if (id) await api.put(`/maintenance-order/${id}`, payload);
            else await api.post('/maintenance-order', payload);
            message.success('Thao tác thành công!');
            await fetchData();
            setActiveTab('board');
            navigate('/maintenance-hub');
        } catch (e) { message.error(e.message); } 
        finally { 
            setSubmitLoading(false); 
            hide();
        }
    };

    const buildPrintHtml = (orderData, warehouseData, itemsData) => {
        const serviceItems = (itemsData || []).filter(i => i.type === 'SERVICE');
        const partItems = (itemsData || []).filter(i => i.type === 'PART');
        const totalLabor = serviceItems.reduce((s, i) => s + Number(i.total_price || 0), 0);
        const totalParts = partItems.reduce((s, i) => s + Number(i.total_price || 0), 0);
        const grandTotal = totalLabor + totalParts;
        const vatPercent = orderData.vat_percent || 0;
        const vatAmount = (grandTotal * vatPercent) / 100;
        const finalTotal = grandTotal + vatAmount;

        const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
        const fmtDate = (d) => {
            if (!d) return '';
            const dt = new Date(d);
            return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
        };

        const maxRows = Math.max(serviceItems.length, partItems.length, 10);

        let bodyRows = '';
        for (let i = 0; i < maxRows; i++) {
            const svc = serviceItems[i];
            const part = partItems[i];
            bodyRows += `<tr style="height:24px">
                <td>${svc ? svc.description || '' : ''}</td>
                <td style="text-align:right">${svc ? fmt(svc.total_price) : ''}</td>
                <td>${part ? (part.Part?.code || part.part_code || '') : ''}</td>
                <td>${part ? (part.description || '') : ''}</td>
                <td style="text-align:center">${part ? (part.quantity || '') : ''}</td>
                <td style="text-align:right">${part ? fmt(part.total_price) : ''}</td>
            </tr>`;
        }

        return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>Phiếu Sửa Chữa</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12px; color: #000; background: #fff; padding: 8mm 12mm; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 3px 6px; font-size: 12px; }
  th { font-weight: bold; text-align: center; background: #f5f5f5; }
  .no-border td, .no-border th { border: none; }
  .header-logo { font-size: 22px; font-weight: bold; color: #c00; font-family: Arial, sans-serif; }
  .header-title { font-size: 17px; font-weight: bold; text-align: center; letter-spacing: 1px; }
  .header-company { font-size: 15px; font-weight: bold; text-align: center; }
  .section-divider { border-top: 1.5px solid #000; margin: 6px 0; }
  .footer-sign { display: flex; justify-content: space-between; text-align: center; margin-top: 30px; }
  .footer-sign div { width: 30%; }
  .note { font-size: 10px; font-style: italic; margin-top: 15px; line-height: 1.4; }
  @page { size: A4; margin: 8mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <!-- HEADER -->
  <table class="no-border" style="margin-bottom:6px">
    <tr>
      <td style="width:100px;vertical-align:top">
        <div class="header-logo">HONDA</div>
      </td>
      <td style="text-align:center;vertical-align:top">
        <div class="header-title">PHIẾU SỬA CHỮA VÀ BẢO HÀNH</div>
        <div class="header-company">HỆ THỐNG XE MÁY THANH HẢI</div>
        <div style="font-size:12px; font-weight:bold; margin-top:2px">${warehouseData?.warehouse_name || 'Chi nhánh'}</div>
        <div style="font-size:11px">Địa chỉ: ${warehouseData?.address || '............................................................'}</div>
        <div style="font-size:11px">Điện thoại: ${warehouseData?.phone || '......................'} ${warehouseData?.mobile ? ' - ' + warehouseData.mobile : ''}</div>
      </td>
      <td style="width:140px;text-align:right;vertical-align:top;font-size:11px">
        <div>Mã HD: <strong>${String(orderData.id || '').substring(0,8).toUpperCase()}</strong></div>
        <div>Trang 1 / 1</div>
      </td>
    </tr>
  </table>

  <div class="section-divider"></div>

  <!-- CUSTOMER INFO -->
  <table class="no-border" style="margin-bottom:8px">
    <tr>
      <td>Khách hàng: <strong>${(orderData.customer_name || '').toUpperCase()}</strong></td>
      <td>ĐT: <strong>${orderData.customer_phone || ''}</strong></td>
      <td>Biển số xe: <strong>${orderData.license_plate || ''}</strong></td>
      <td>Loại xe: ${orderData.model_name || ''}</td>
    </tr>
    <tr>
      <td colspan="2">Địa chỉ: ${orderData.customer_address || ''}</td>
      <td>Số khung: ${orderData.chassis_no || ''}</td>
      <td>Số máy: ${orderData.engine_no || ''}</td>
    </tr>
    <tr>
      <td colspan="2">Ngày vào xưởng: <strong>${fmtDate(orderData.maintenance_date)}</strong></td>
      <td colspan="2">Số Km: <strong>${orderData.km_reading ? Number(orderData.km_reading).toLocaleString('vi-VN') : ''}</strong></td>
    </tr>
  </table>

  <!-- YÊU CẦU KHÁCH HÀNG -->
  <table style="margin-bottom:8px">
    <thead>
      <tr>
        <th style="width:50%">YÊU CẦU KHÁCH HÀNG</th>
        <th>TÌNH TRẠNG XE TRƯỚC KHI SỬA</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="height:40px;vertical-align:top">${orderData.notes || ''}</td>
        <td style="vertical-align:top">${orderData.km_reading ? Number(orderData.km_reading).toLocaleString('vi-VN') + 'KM' : ''}</td>
      </tr>
    </tbody>
  </table>

  <!-- BẢNG CÔNG & PHỤ TÙNG -->
  <table>
    <thead>
      <tr>
        <th colspan="2">CÔNG SỬA CHỮA</th>
        <th colspan="4">PHỤ TÙNG THAY THẾ</th>
      </tr>
      <tr>
        <th style="width:22%">Nội dung sửa chữa</th>
        <th style="width:10%">Tiền công</th>
        <th style="width:15%">Mã phụ tùng</th>
        <th style="width:28%">Tên Tiếng Việt</th>
        <th style="width:5%">SL</th>
        <th style="width:12%">TT</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
    <tfoot>
      <tr>
        <td style="text-align:right;font-weight:bold">Tiền công:</td>
        <td style="text-align:right;font-weight:bold">${fmt(totalLabor)}</td>
        <td colspan="3" style="text-align:right;font-weight:bold">Tiền phụ tùng thay thế:</td>
        <td style="text-align:right;font-weight:bold">${fmt(totalParts)}</td>
      </tr>
      <tr>
        <td colspan="5" style="text-align:right">VAT ( ${vatPercent} %):</td>
        <td style="text-align:right">${fmt(vatAmount)}</td>
      </tr>
      <tr>
        <td colspan="5" style="text-align:right;font-weight:bold;font-size:14px">Tổng số (làm tròn):</td>
        <td style="text-align:right;font-weight:bold;font-size:14px">${fmt(finalTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <div style="margin-top:8px;font-size:12px">Bằng chữ: <strong><em>${fmt(finalTotal)} đồng</em></strong></div>

  <!-- KÝ TÊN -->
  <div class="footer-sign">
    <div><strong>Khách hàng</strong></div>
    <div><strong>Nhân viên giao dịch</strong></div>
    <div><strong>Thợ sửa</strong></div>
  </div>
  <div style="height:60px"></div>
  <div class="footer-sign">
    <div><strong>${orderData.customer_name || ''}</strong></div>
    <div></div>
    <div></div>
  </div>

  <div class="note">Chú ý: Trong trường hợp đặc biệt, nếu xe của quý khách gặp sự cố mà không thể đến được, xin quý khách vui lòng gọi điện trực tiếp cho chúng tôi, nhân viên kỹ thuật của chúng tôi sẽ đến tận nơi phục vụ quý khách.</div>

  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
</body>
</html>`;
    };

    const handlePrint = (order = null) => {
        const hide = message.loading('Đang chuẩn bị phiếu in...', 0);

        let orderData, itemsData, warehouseData;

        if (order) {
            orderData = order;
            itemsData = order.MaintenanceItems?.map(i => ({
                ...i,
                description: i.type === 'PART' ? (i.Part?.name || i.description) : i.description,
                Part: i.Part
            })) || [];
            warehouseData = warehouses.find(w => w.id === order.warehouse_id);
        } else {
            orderData = { ...form.getFieldsValue(), id };
            itemsData = items;
            warehouseData = warehouses.find(w => w.id === selectedWarehouse);
        }

        setTimeout(() => {
            hide();
            const html = buildPrintHtml(orderData, warehouseData, itemsData);
            const win = window.open('', '_blank', 'width=900,height=700');
            win.document.write(html);
            win.document.close();
        }, 300);
    };

    // --- Tab Renderers ---
    const renderForm = () => {
        // Calculate busy mechanics from active lift table orders
        const busyMechanicIds = liftTables
            .flatMap(l => l.MaintenanceOrders || [])
            .filter(o => o.id !== id) // exclude current order
            .flatMap(o => [o.mechanic_1_id, o.mechanic_2_id])
            .filter(Boolean);

        return (
            <>
            <Row gutter={24}>
            <Col xs={24} lg={8}>
                <Card 
                    className="glass-card" 
                    title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <Space><Wrench size={18}/> THÔNG TIN BẢO TRÌ</Space>
                            <Space>
                                {id && <Button icon={<Printer size={16} />} onClick={() => handlePrint()} type="primary" ghost>In phiếu</Button>}
                                {vehicleFound && (
                                    vehicleFound.internal ? 
                                        <Tag color="success" icon={<CheckCircle size={14} style={{verticalAlign:'middle', marginRight:4}}/>}>XE HỆ THỐNG</Tag> : 
                                        <Tag color="warning" icon={<Search size={14} style={{verticalAlign:'middle', marginRight:4}}/>}>XE NGOÀI</Tag>
                                )}
                            </Space>
                        </div>
                    }
                >
                    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ maintenance_date: dayjs(), status: 'IN_PROGRESS' }}>
                        <Form.Item name="status" hidden><Input /></Form.Item>
                        <Form.Item label="Tìm kiếm xe (Số máy/Số khung/SĐT)" name="search_vehicle" style={{ marginBottom: vehicleFound ? 12 : 24 }}>
                            <AutoComplete 
                                options={vehicleOptions} 
                                onSearch={handleVehicleSearch} 
                                onSelect={handleVehicleSelect}
                            >
                                <Input.Search placeholder="Nhập để tìm xe hệ thống..." allowClear size="large" />
                            </AutoComplete>
                        </Form.Item>

                        {vehicleFound && (
                            <div style={{ 
                                marginBottom: 24, 
                                padding: '16px', 
                                borderRadius: 12, 
                                background: vehicleFound.internal ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                                border: `1px solid ${vehicleFound.internal ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                animation: 'fadeIn 0.3s ease-out'
                            }}>
                                <div style={{ 
                                    width: 44, 
                                    height: 44, 
                                    borderRadius: 10, 
                                    background: vehicleFound.internal ? '#10b981' : '#f59e0b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white'
                                }}>
                                    {vehicleFound.internal ? <Bike size={24} /> : <Search size={24} />}
                                </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: vehicleFound.internal ? '#10b981' : '#f59e0b', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {vehicleFound.internal ? 'Nhận diện: Xe hệ thống' : 'Xe ngoài hệ thống'}
                                        </div>
                                        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                                            {vehicleFound.internal 
                                                ? `Khách hàng: ${vehicleFound.data?.customer_name || vehicleFound.data?.RetailSale?.customer_name || 'N/A'} - SĐT: ${vehicleFound.data?.phone || vehicleFound.data?.RetailSale?.phone || vehicleFound.data?.customer_phone || 'N/A'}` 
                                                : 'Xe này không thuộc dữ liệu bán hàng hệ thống hoặc là xe khách vãng lai.'}
                                        </div>
                                    </div>
                                    {(vehicleFound.internal && vehicleFound.data?.gifts?.length > 0) && (
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 4, opacity: 0.6 }}>ƯU ĐÃI TẶNG KÈM</div>
                                            <Space wrap size={[4, 4]}>
                                                {vehicleFound.data.gifts.map((g, idx) => {
                                                    const isUsed = (vehicleFound.data.used_gifts || []).includes(g);
                                                    return (
                                                        <Tag 
                                                            key={idx} 
                                                            color={isUsed ? 'default' : 'purple'} 
                                                            style={{ 
                                                                margin: 0, 
                                                                fontSize: 10, 
                                                                textDecoration: isUsed ? 'line-through' : 'none',
                                                                opacity: isUsed ? 0.6 : 1
                                                            }}
                                                        >
                                                            {g} {isUsed ? '(Đã dùng)' : ''}
                                                        </Tag>
                                                    );
                                                })}
                                            </Space>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                        {/* Vehicle History Timeline */}
                        {(engineNo || licensePlate || chassisNo) && history.filter(h => 
                            h.id !== id && (
                                engineNo ? h.engine_no === engineNo :
                                chassisNo ? h.chassis_no === chassisNo :
                                h.license_plate === licensePlate
                            )
                        ).length > 0 && (

                            <div style={{ marginBottom: 24 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <History size={16} style={{ color: '#6366f1' }} />
                                    <Text strong style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6366f1' }}>Lịch sử sửa chữa của xe</Text>
                                </div>
                                <div style={{ 
                                    maxHeight: 350, 
                                    overflowY: 'auto', 
                                    paddingRight: 12,
                                    paddingLeft: 4,
                                    paddingTop: 8
                                }}>
                                    <Timeline
                                        items={history
                                            .filter(h => 
                                                h.id !== id && (
                                                    engineNo ? h.engine_no === engineNo :
                                                    chassisNo ? h.chassis_no === chassisNo :
                                                    h.license_plate === licensePlate
                                                )
                                            )

                                            .map(h => ({
                                                color: h.status === 'COMPLETED' ? 'green' : (h.status === 'CANCELLED' ? 'red' : 'blue'),
                                                children: (
                                                    <div className="history-item-card" style={{ 
                                                        background: 'rgba(255,255,255,0.03)', 
                                                        padding: '12px', 
                                                        borderRadius: '12px', 
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                        transition: 'all 0.3s ease'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'flex-start' }}>
                                                            <div>
                                                                <Text strong style={{ fontSize: 13, display: 'block' }}>{dayjs(h.maintenance_date).format('DD/MM/YYYY')}</Text>
                                                                <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(h.maintenance_date).fromNow()}</Text>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <Tag color="cyan" style={{ margin: 0, fontWeight: 'bold' }}>{h.km_reading?.toLocaleString() || 0} KM</Tag>
                                                                <div style={{ marginTop: 4 }}>
                                                                    <Tag color={h.status === 'COMPLETED' ? 'success' : 'processing'} style={{ fontSize: 10, margin: 0 }}>{h.status}</Tag>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div style={{ marginBottom: 8 }}>
                                                            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>Nội dung sửa chữa:</div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                                {h.MaintenanceItems?.map((i, idx) => (
                                                                    <Tag key={idx} color={i.type === 'PART' ? 'blue' : 'orange'} style={{ fontSize: 11, margin: 0 }}>
                                                                        {i.description || (i.type === 'PART' ? 'Phụ tùng' : 'Dịch vụ')}
                                                                    </Tag>
                                                                ))}
                                                                {(!h.MaintenanceItems || h.MaintenanceItems.length === 0) && <Text type="secondary" italic style={{fontSize:11}}>Không có chi tiết</Text>}
                                                            </div>
                                                        </div>
                                                        
                                                        {h.notes && (
                                                            <div style={{ 
                                                                fontSize: 11, 
                                                                fontStyle: 'italic', 
                                                                marginTop: 8, 
                                                                color: '#a78bfa',
                                                                padding: '6px 8px',
                                                                background: 'rgba(139, 92, 246, 0.05)',
                                                                borderRadius: '6px',
                                                                borderLeft: '2px solid #a78bfa'
                                                            }}>
                                                                Lưu ý: {h.notes}
                                                            </div>
                                                        )}
                                                        
                                                        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                                            <Button 
                                                                size="small" 
                                                                icon={<Printer size={12} />} 
                                                                onClick={() => handlePrint(h)}
                                                                style={{ fontSize: 11 }}
                                                            >
                                                                In phiếu
                                                            </Button>
                                                            <Button 
                                                                size="small" 
                                                                type="link" 
                                                                icon={<Eye size={12} />} 
                                                                onClick={() => fetchOrderDetails(h.id)}
                                                                style={{ padding: 0, fontSize: 11 }}
                                                            >
                                                                Xem chi tiết phiếu
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        )}

                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item label="Biển số xe" name="license_plate">
                                    <Input placeholder="Ví dụ: 29A-12345" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label="Số máy" name="engine_no">
                                    <Input />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={12}><Form.Item label="Ngày thực hiện" name="maintenance_date" rules={[{required:true}]}><DatePicker style={{width:'100%'}} format="DD/MM/YYYY" /></Form.Item></Col>
                            <Col span={12}><Form.Item label="Số KM" name="km_reading"><InputNumber style={{width:'100%'}} placeholder="Nhập số KM..." /></Form.Item></Col>
                            <Col span={12}><Form.Item label="Kho xuất" name="warehouse_id" rules={[{required:true}]}><Select placeholder="Chọn kho">{warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}</Select></Form.Item></Col>
                            <Col span={12}><Form.Item label="Bàn nâng" name="lift_table_id"><Select placeholder="Chọn bàn" allowClear>{liftTables.filter(l => !selectedWarehouse || l.warehouse_id === selectedWarehouse).map(l => {
                                const isBusy = l.status === 'BUSY' && l.id !== form.getFieldValue('lift_table_id');
                                return (
                                    <Select.Option key={l.id} value={l.id} disabled={isBusy}>
                                        {l.name} {isBusy ? '(Đang bận)' : ''}
                                    </Select.Option>
                                );
                            })}</Select></Form.Item></Col>
                        </Row>

                        {(vehicleFound?.internal && vehicleFound.data?.gifts?.some(g => !['Áo mưa', 'Mũ bảo hiểm', 'Bảo hiểm đi đường'].includes(g))) && (
                             <Row gutter={12}>
                                <Col span={24}>
                                    <Form.Item label={<Space><Tag color="purple">SỬ DỤNG ƯU ĐÃI TẶNG KÈM</Tag></Space>} name="gift_used">
                                        <Select placeholder="Chọn ưu đãi muốn áp dụng..." allowClear>
                                            {vehicleFound.data.gifts
                                                .filter(g => !['Áo mưa', 'Mũ bảo hiểm', 'Bảo hiểm đi đường'].includes(g))
                                                .map(g => {
                                                    const isUsed = (vehicleFound.data.used_gifts || []).includes(g);
                                                    return (
                                                        <Select.Option key={g} value={g} disabled={isUsed}>
                                                            {g} {isUsed ? '(Đã sử dụng ở lần trước)' : ''}
                                                        </Select.Option>
                                                    );
                                                })
                                            }
                                        </Select>
                                    </Form.Item>
                                </Col>
                             </Row>
                        )}
                        <Divider />
                        <Title level={5}>KHÁCH HÀNG</Title>
                        <Row gutter={12}>
                            <Col span={12}><Form.Item label="Tên khách" name="customer_name"><Input /></Form.Item></Col>
                            <Col span={12}><Form.Item label="Điện thoại" name="customer_phone"><Input /></Form.Item></Col>
                        </Row>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8, marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text>Tổng cộng:</Text><Title level={4} style={{margin:0}}>{items.reduce((s,i)=>s+Number(i.total_price || 0), 0).toLocaleString()} đ</Title></div>
                        </div>
                        <Space direction="vertical" style={{ width: '100%', marginTop: 24 }}>
                            <Button 
                                type="primary" 
                                size="large" 
                                block 
                                icon={<Save size={20} />} 
                                onClick={() => {
                                    form.setFieldsValue({ status: 'IN_PROGRESS' });
                                    form.submit();
                                }}
                                loading={submitLoading}
                                style={{ height: 50, borderRadius: 12 }}
                            >
                                {id ? 'LƯU THAY ĐỔI' : 'TẠO PHIẾU MỚI'}
                            </Button>

                            {id && (
                                <Button 
                                    block 
                                    icon={<PlusCircle size={20} />} 
                                    onClick={() => {
                                        navigate('/maintenance-hub');
                                        handleCreateNew();
                                    }}
                                    style={{ height: 50, borderRadius: 12 }}
                                >
                                    LÀM PHIẾU MỚI
                                </Button>
                            )}
                            
                            {id && form.getFieldValue('status') !== 'COMPLETED' && (
                                <Popconfirm
                                    title="Bạn có chắc chắn muốn thanh toán và hoàn thành phiếu này?"
                                    onConfirm={() => {
                                        form.setFieldsValue({ 
                                            status: 'COMPLETED',
                                            paid_amount: items.reduce((s,i)=>s+i.total_price, 0)
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

                            {id && form.getFieldValue('status') !== 'COMPLETED' && form.getFieldValue('status') !== 'CANCELLED' && (
                                <Popconfirm
                                    title="Bạn có chắc chắn muốn hủy phiếu này? Thao tác này sẽ hoàn trả lại phụ tùng vào kho và giải phóng bàn nâng."
                                    onConfirm={() => {
                                        form.setFieldsValue({ status: 'CANCELLED' });
                                        form.submit();
                                    }}
                                    okText="Xác nhận hủy"
                                    cancelText="Quay lại"
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button 
                                        danger 
                                        block 
                                        icon={<XCircle size={18} />} 
                                        style={{ height: 45, borderRadius: 12, marginTop: 12 }}
                                    >
                                        HỦY PHIẾU SỬA CHỮA
                                    </Button>
                                </Popconfirm>
                            )}
                        </Space>
                    </Form>
                </Card>
            </Col>
            <Col xs={24} lg={16}>
                <Card className="glass-card" title="CHI TIẾT PHỤ TÙNG & CÔNG VIỆC">
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: 24 }}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label={<Text strong style={{fontSize:12}}>THỢ CHÍNH</Text>} name="mechanic_1_id" style={{margin:0}}>
                                    <Select placeholder="Chọn thợ chính" allowClear>
                                        {mechanics.filter(m => !selectedWarehouse || !m.warehouse_id || m.warehouse_id === selectedWarehouse).map(m => {
                                            const isBusy = busyMechanicIds.includes(m.id) && m.id !== form.getFieldValue('mechanic_1_id') && m.id !== form.getFieldValue('mechanic_2_id');
                                            return (
                                                <Select.Option key={m.id} value={m.id} disabled={isBusy}>
                                                    {m.mechanic_name} {isBusy ? '(Đang bận)' : ''}
                                                </Select.Option>
                                            );
                                        })}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label={<Text strong style={{fontSize:12}}>THỢ PHỤ</Text>} name="mechanic_2_id" style={{margin:0}}>
                                    <Select placeholder="Chọn thợ phụ" allowClear>
                                        {mechanics.filter(m => !selectedWarehouse || !m.warehouse_id || m.warehouse_id === selectedWarehouse).map(m => {
                                            const isBusy = busyMechanicIds.includes(m.id) && m.id !== form.getFieldValue('mechanic_1_id') && m.id !== form.getFieldValue('mechanic_2_id');
                                            return (
                                                <Select.Option key={m.id} value={m.id} disabled={isBusy}>
                                                    {m.mechanic_name} {isBusy ? '(Đang bận)' : ''}
                                                </Select.Option>
                                            );
                                        })}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                    <Table 
                        dataSource={items}
                        pagination={false}
                        scroll={{ x: 1000 }}
                        columns={[
                            { title: 'HẠNG MỤC', dataIndex: 'type', width: 100, render: t => <Tag color={t==='PART'?'blue':'orange'} style={{fontWeight:'bold'}}>{t}</Tag> },
                            { 
                                title: <Text strong style={{ color: '#6366f1' }}>KIỂU BÁN</Text>, 
                                dataIndex: 'sale_type', 
                                width: 140,
                                render: (v, r) => (
                                    <Select 
                                        value={v || 'THU_NGAY'} 
                                        size="middle"
                                        style={{ width: '100%' }}
                                        onChange={val => {
                                            const newUnitPrice = (val === 'BAO_HANH' || val === 'KHUYEN_MAI') ? 0 : (r.type === 'PART' ? (allParts.find(p => p.id === r.part_id)?.selling_price || 0) : r.unit_price);
                                            setItems(items.map(i => i.key === r.key ? {
                                                ...i, 
                                                sale_type: val, 
                                                unit_price: newUnitPrice,
                                                total_price: i.quantity * newUnitPrice
                                            } : i));
                                        }}
                                    >
                                        <Select.Option value="THU_NGAY">
                                            <Tag color="success" style={{ margin: 0, width: '100%', textAlign: 'center' }}>Thu ngay</Tag>
                                        </Select.Option>
                                        <Select.Option value="BAO_HANH">
                                            <Tag color="warning" style={{ margin: 0, width: '100%', textAlign: 'center' }}>Bảo hành</Tag>
                                        </Select.Option>
                                        <Select.Option value="KHUYEN_MAI">
                                            <Tag color="processing" style={{ margin: 0, width: '100%', textAlign: 'center' }}>Khuyến mại</Tag>
                                        </Select.Option>
                                    </Select>
                                )
                            },
                            { 
                                title: 'TÊN PHỤ TÙNG / CÔNG VIỆC', 
                                dataIndex: 'description', 
                                width: 300,
                                render: (t, r) => (
                                    r.type === 'SERVICE' ? 
                                    <AutoComplete 
                                        value={t} 
                                        style={{ width: '100%' }}
                                        popupMatchSelectWidth={false}
                                        onChange={val => setItems(items.map(i=>i.key===r.key?{...i,description:val}:i))}
                                        options={[
                                            { value: 'Bảo dưỡng định kỳ' },
                                            { value: 'Sửa chữa chung' },
                                            { value: 'Kiểm tra xe' },
                                            { value: 'Rửa xe' },
                                            { value: 'Thay dầu máy' },
                                            { value: 'Bảo hành' }
                                        ]}
                                        filterOption={(input, option) => option.value.toUpperCase().indexOf(input.toUpperCase()) >= 0}
                                    >
                                        <Input placeholder="Tên công việc..." />
                                    </AutoComplete> : 
                                    <Text strong>{t}</Text>
                                ) 
                            },
                            { title: 'SL', dataIndex: 'quantity', width: 80, align: 'center', render: (v, r) => <InputNumber min={1} value={v} style={{width:'100%'}} onChange={val=>{setItems(items.map(i=>i.key===r.key?{...i,quantity:val,total_price:val*i.unit_price}:i))}}/> },
                            { title: 'ĐƠN GIÁ', dataIndex: 'unit_price', width: 140, render: (v, r) => <InputNumber value={v} style={{width:'100%'}} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v.replace(/\$\s?|(,*)/g, '')} onChange={val=>{setItems(items.map(i=>i.key===r.key?{...i,unit_price:val,total_price:i.quantity*val}:i))}}/> },
                            { title: 'THÀNH TIỀN', dataIndex: 'total_price', width: 140, align: 'right', render: (v, r) => (
                                <Space direction="vertical" size={0} style={{ textAlign: 'right', width: '100%' }}>
                                    <Text strong style={{ color: '#1e293b' }}>{Number(v || 0).toLocaleString()} đ</Text>
                                    {(r.sale_type === 'BAO_HANH' || r.sale_type === 'KHUYEN_MAI') && (
                                        <Text type="secondary" style={{ fontSize: 10 }}>Vốn: {Number(r.purchase_price * r.quantity).toLocaleString()}</Text>
                                    )}
                                </Space>
                            )},
                            { width: 60, align: 'center', render: (_, r) => <Button type="text" danger icon={<Trash2 size={18}/>} onClick={()=>setItems(items.filter(i=>i.key!==r.key))}/> }
                        ]}
                    />
                    <Space style={{ marginTop: 20 }}>
                        <Button onClick={() => setItems([...items, { key:Date.now(), type:'SERVICE', description:'', quantity:1, unit_price:0, total_price:0, sale_type: 'THU_NGAY', purchase_price: 0 }])}>Thêm tiền công</Button>
                        <AutoComplete 
                            onSelect={(v, opt) => setItems([...items, { 
                                key:Date.now(), 
                                type:'PART', 
                                part_id:opt.p.id, 
                                description:opt.p.name, 
                                unit: opt.p.unit,
                                quantity:1, 
                                unit_price:Number(opt.p.selling_price || 0), 
                                total_price:Number(opt.p.selling_price || 0),
                                sale_type: 'THU_NGAY',
                                purchase_price: Number(opt.p.purchase_price || 0)
                            }])}
                            options={allParts.map(p => {
                                let stock = 0;
                                if (p.PartInventories && p.PartInventories.length > 0) {
                                    if (selectedWarehouse) {
                                        stock = Number(p.PartInventories.find(i => i.warehouse_id === selectedWarehouse)?.quantity || 0);
                                    } else {
                                        stock = p.PartInventories.reduce((sum, i) => sum + Number(i.quantity), 0);
                                    }
                                }
                                return {
                                    value: p.code,
                                    label: (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>
                                                <Text strong>{p.code}</Text> - {p.name}
                                            </span>
                                            <Tag color={stock > 0 ? 'green' : 'red'} style={{ margin: 0 }}>
                                                Tồn: {stock.toLocaleString()}
                                            </Tag>
                                        </div>
                                    ),
                                    p
                                };
                            })}
                            filterOption={(input, option) => 
                                option.p.name.toUpperCase().indexOf(input.toUpperCase()) >= 0 ||
                                option.p.code.toUpperCase().indexOf(input.toUpperCase()) >= 0
                            }
                        ><Input.Search placeholder="Tìm theo Mã hoặc Tên phụ tùng..." style={{width:380}}/></AutoComplete>
                    </Space>
                </Card>
            </Col>
        </Row>
            </>
        );
    };

    // Helper: get all history for a specific vehicle
    // Ưu tiên: Số máy (duy nhất) > Số khung > Biển số (có thể trùng)
    const getVehicleHistory = (record) => {
        if (record.engine_no) {
            return history.filter(h => h.engine_no === record.engine_no);
        }
        if (record.chassis_no) {
            return history.filter(h => h.chassis_no === record.chassis_no);
        }
        if (record.license_plate) {
            return history.filter(h => h.license_plate === record.license_plate);
        }
        return [];
    };


    const openVehicleHistory = (record) => {
        setVehicleHistoryModal({
            engine_no: record.engine_no,
            license_plate: record.license_plate,
            chassis_no: record.chassis_no,
            customer_name: record.customer_name,
            records: getVehicleHistory(record)
        });
    };

    const renderHistory = () => {
        let filteredHistory = [...history];
        
        if (historySearch) {
            const s = historySearch.toLowerCase();
            filteredHistory = filteredHistory.filter(h => 
                h.license_plate?.toLowerCase().includes(s) ||
                h.engine_no?.toLowerCase().includes(s) ||
                h.chassis_no?.toLowerCase().includes(s) ||
                h.customer_name?.toLowerCase().includes(s) ||
                h.customer_phone?.toLowerCase().includes(s)
            );
        }

        return (
            <>
            <Card className="glass-card" title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <Space><History size={18}/> LỊCH SỬ SỬA CHỮA</Space>
                    <Input.Search 
                        placeholder="Tìm biển số, số máy, tên khách..." 
                        allowClear
                        onSearch={setHistorySearch}
                        onChange={e => !e.target.value && setHistorySearch('')}
                        style={{ width: 380 }}
                    />
                </div>
            }>
                <Table 
                    dataSource={filteredHistory}
                    rowKey="id"
                    pagination={{ pageSize: 12 }}
                    columns={[
                        { title: 'Ngày', dataIndex: 'maintenance_date', render: d => dayjs(d).format('DD/MM/YY HH:mm') },
                        { title: 'Biển số', dataIndex: 'license_plate', render: t => <Text strong>{t || 'Chưa biển'}</Text> },
                        { title: 'Số máy', dataIndex: 'engine_no', render: t => <Text style={{fontSize:12, opacity:0.8}}>{t}</Text> },
                        { title: 'Khách hàng', dataIndex: 'customer_name' },
                        { title: 'Số KM', dataIndex: 'km_reading', render: v => <Tag color="cyan">{v?.toLocaleString() || 0} KM</Tag> },
                        { title: 'Tổng tiền', dataIndex: 'total_amount', render: v => <Text strong>{Number(v).toLocaleString()} đ</Text> },
                        { title: 'Trạng thái', dataIndex: 'status', render: s => (
                            <Tag color={s==='COMPLETED'?'green':(s==='CANCELLED'?'red':'blue')}>{s}</Tag>
                        ) },
                        { title: '', render: (_, r) => (
                            <Space>
                                <Button size="small" type="primary" ghost icon={<Eye size={14}/>} onClick={() => openVehicleHistory(r)}>Lịch sử xe</Button>
                                <Button size="small" icon={<FileText size={14}/>} onClick={() => fetchOrderDetails(r.id)}>Chi tiết</Button>
                            </Space>
                        ) }
                    ]}
                />
            </Card>

            {/* Vehicle History Detail Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Bike size={22} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: 16 }}>Lịch sử sửa chữa: {vehicleHistoryModal?.license_plate || 'Xe không biển'}</div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>
                                <Space split={<Divider type="vertical" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />}>
                                    <span><Text type="secondary" style={{ fontSize: 11 }}>Khách hàng:</Text> <Text strong style={{ fontSize: 12 }}>{vehicleHistoryModal?.customer_name || 'N/A'}</Text></span>
                                    <span><Text type="secondary" style={{ fontSize: 11 }}>Số máy:</Text> <Text strong style={{ fontSize: 12 }}>{vehicleHistoryModal?.engine_no || 'N/A'}</Text></span>
                                    <span><Text type="secondary" style={{ fontSize: 11 }}>Số khung:</Text> <Text strong style={{ fontSize: 12 }}>{vehicleHistoryModal?.chassis_no || 'N/A'}</Text></span>
                                </Space>
                            </div>
                        </div>

                    </div>
                }
                open={!!vehicleHistoryModal}
                onCancel={() => setVehicleHistoryModal(null)}
                footer={null}
                width={700}
                destroyOnClose
            >
                {vehicleHistoryModal && (
                    <div style={{ maxHeight: 500, overflowY: 'auto', paddingRight: 8, paddingTop: 16 }}>
                        <div style={{ marginBottom: 16 }}>
                            <Tag color="purple" style={{ fontSize: 13, padding: '4px 12px' }}>
                                Tổng cộng {vehicleHistoryModal.records.length} lần sửa chữa
                            </Tag>
                        </div>
                        <Timeline
                            items={vehicleHistoryModal.records.map((h, idx) => ({
                                color: h.status === 'COMPLETED' ? 'green' : (h.status === 'CANCELLED' ? 'red' : 'blue'),
                                children: (
                                    <div style={{ 
                                        background: 'rgba(255,255,255,0.03)', 
                                        padding: '14px', 
                                        borderRadius: '12px', 
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                                            <div>
                                                <Tag color="geekblue" style={{ marginRight: 8 }}>Lần {vehicleHistoryModal.records.length - idx}</Tag>
                                                <Text strong>{dayjs(h.maintenance_date).format('DD/MM/YYYY HH:mm')}</Text>
                                                <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>({dayjs(h.maintenance_date).fromNow()})</Text>
                                            </div>
                                            <Space>
                                                <Tag color="cyan" style={{ fontWeight: 'bold' }}>{h.km_reading?.toLocaleString() || 0} KM</Tag>
                                                <Tag color={h.status === 'COMPLETED' ? 'success' : 'processing'}>{h.status}</Tag>
                                            </Space>
                                        </div>
                                        
                                        <div style={{ marginBottom: 10 }}>
                                            <Text style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 6 }}>Nội dung sửa chữa:</Text>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {h.MaintenanceItems?.map((i, iIdx) => (
                                                    <Tag key={iIdx} color={i.type === 'PART' ? 'blue' : 'orange'} style={{ fontSize: 11 }}>
                                                        {i.description || (i.type === 'PART' ? `Phụ tùng #${i.part_id}` : 'Dịch vụ')} 
                                                        {i.quantity > 1 ? ` x${i.quantity}` : ''}
                                                    </Tag>
                                                ))}
                                                {(!h.MaintenanceItems || h.MaintenanceItems.length === 0) && <Text type="secondary" style={{fontSize:11, fontStyle:'italic'}}>Không có chi tiết</Text>}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Text strong style={{ color: '#6366f1' }}>{Number(h.total_amount).toLocaleString()} đ</Text>
                                            <Space>
                                                {h.notes && (
                                                    <Text style={{ fontSize: 11, fontStyle: 'italic', color: '#a78bfa' }}>📝 {h.notes}</Text>
                                                )}
                                                <Button 
                                                    size="small" 
                                                    icon={<Printer size={12} />} 
                                                    onClick={() => handlePrint(h)}
                                                >
                                                    In phiếu
                                                </Button>
                                                <Button 
                                                    size="small" 
                                                    type="primary"
                                                    ghost
                                                    icon={<FileText size={12} />} 
                                                    onClick={() => {
                                                        fetchOrderDetails(h.id);
                                                        setVehicleHistoryModal(null);
                                                    }}
                                                >
                                                    Chi tiết
                                                </Button>
                                            </Space>
                                        </div>
                                    </div>
                                )
                            }))}
                        />
                    </div>
                )}
            </Modal>
            </>
        );
    };



    return (
        <div style={{ padding: '24px' }}>
            {ReactDOM.createPortal(
                <div className="print-only-container" style={{ position: 'absolute', left: '-9999px', top: '-9999px', height: 0, overflow: 'hidden' }}>
                    <PrintMaintenanceOrder 
                        order={printingOrder || { ...form.getFieldsValue(), id }} 
                        warehouse={warehouses.find(w => w.id === (printingOrder?.warehouse_id || selectedWarehouse))}
                        items={printingOrder ? printingOrder.items : items}
                    />
                </div>,
                document.body
            )}
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }} className="gradient-text">TRUNG TÂM BẢO TRÌ & DỊCH VỤ</Title>
            </div>

            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                type="card"
                className="modern-tabs"
                items={[
                    { 
                        key: 'board', 
                        label: <Space><LayoutGrid size={16}/> ĐIỀU PHỐI BÀN NÂNG</Space>, 
                        children: (
                            <MaintenanceBoard 
                                lifts={liftTables} 
                                fetchData={fetchData} 
                                loading={loading} 
                                onEditOrder={handleEditFromBoard}
                                onCreateNew={handleCreateNew}
                            />
                        ) 
                    },
                    { key: 'form', label: <Space><FileText size={16}/> PHIẾU BẢO TRÌ</Space>, children: renderForm() },
                    { key: 'history', label: <Space><History size={16}/> LỊCH SỬ SỬA CHỮA</Space>, children: renderHistory() },
                    { key: 'mgmt', label: <Space><Settings size={16}/> CẤU HÌNH BÀN NÂNG</Space>, children: <LiftManager /> },
                ]}
            />

            <style>{`
                .modern-tabs .ant-tabs-nav::before { border-bottom: 1px solid rgba(255,255,255,0.1); }
                .modern-tabs .ant-tabs-tab { background: transparent !important; border: none !important; margin-right: 10px !important; }
                .modern-tabs .ant-tabs-tab-active { background: rgba(59, 130, 246, 0.1) !important; border-bottom: 2px solid var(--primary-color) !important; }
                .lift-card { border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s; }
                .lift-card:hover { transform: translateY(-5px); }
                .busy-lift { border-left: 4px solid #ef4444 !important; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media print {
                    /* Hide the entire app UI */
                    #root {
                        display: none !important;
                    }
                    body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    /* Show the portal-rendered print container */
                    .print-only-container {
                        position: static !important;
                        left: auto !important;
                        top: auto !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        display: block !important;
                        background: white !important;
                    }
                    #print-maintenance-receipt {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 8mm 12mm !important;
                    }
                    @page {
                        size: A4;
                        margin: 5mm;
                    }
                }
            `}</style>
        </div>
    );
};

export default MaintenanceHub;
