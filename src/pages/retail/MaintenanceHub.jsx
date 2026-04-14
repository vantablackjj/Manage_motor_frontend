import React, { useState, useEffect } from 'react';
import { 
  Tabs, Card, Typography, Row, Col, Badge, Space, Button, 
  message, Empty, Select, Table, Tag, Form, Input, 
  InputNumber, DatePicker, AutoComplete, Divider, Popconfirm 
} from 'antd';
import { 
  LayoutGrid, Wrench, User, Bike, Clock, PlusCircle, Expand, 
  Settings, History, Save, Trash2, CheckCircle, Search, FileText, Eye
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { capitalizeName } from '../../utils/stringHelper';

const { Title, Text } = Typography;

// --- SUB-COMPONENT: MAINTENANCE BOARD ---
const MaintenanceBoard = ({ onEditOrder, onCreateNew }) => {
    const [lifts, setLifts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [whRes, liftRes] = await Promise.all([
                api.get('/warehouses'),
                api.get(`/lift-tables${selectedWarehouse ? `?warehouse_id=${selectedWarehouse}` : ''}`)
            ]);
            setWarehouses(whRes.data);
            setLifts(liftRes.data);
        } catch (error) {
            message.error('Lỗi tải dữ liệu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const timer = setInterval(fetchData, 30000);
        return () => clearInterval(timer);
    }, [selectedWarehouse]);

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
                    <Select 
                        placeholder="Lọc theo kho/chi nhánh" 
                        style={{ width: 250 }}
                        allowClear
                        value={selectedWarehouse}
                        onChange={setSelectedWarehouse}
                    >
                        {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                    </Select>
                    <Button icon={<Clock size={16} />} onClick={fetchData}>Làm mới</Button>
                </Space>
            </div>

            <Row gutter={[20, 20]}>
                {lifts.map(lift => {
                    const activeOrder = lift.MaintenanceOrders?.[0];
                    return (
                        <Col xs={24} sm={12} md={8} lg={6} key={lift.id}>
                            <Card 
                                hoverable
                                className={`lift-card ${lift.status === 'BUSY' ? 'busy-lift' : ''}`}
                                styles={{ body: { padding: '16px' } }}
                                style={{ borderRadius: 16 }}
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
                                            <Text style={{ fontSize: 13 }}>Sửa được: <Text strong color="warning">{dayjs(activeOrder.createdAt).fromNow(true)}</Text></Text>
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
            {isModalOpen && (
                <Popconfirm title="Xác nhận lưu?" onConfirm={() => form.submit()}>
                    <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ display: 'none' }} />
                    <Modal open={isModalOpen} onOk={() => form.submit()} onCancel={() => setIsModalOpen(false)}>
                        <Form form={form} layout="vertical" onFinish={handleSubmit}>
                            <Form.Item name="name" label="Tên bàn" rules={[{required:true}]}><Input /></Form.Item>
                            <Form.Item name="warehouse_id" label="Kho" rules={[{required:true}]}><Select>{warehouses.map(w => <Select.Option value={w.id}>{w.warehouse_name}</Select.Option>)}</Select></Form.Item>
                        </Form>
                    </Modal>
                </Popconfirm>
            )}
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

    const selectedWarehouse = Form.useWatch('warehouse_id', form);

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
        try {
            const res = await api.get('/maintenance-orders');
            const order = res.data.find(o => o.id === orderId);
            if (order) {
                form.setFieldsValue({ ...order, maintenance_date: dayjs(order.maintenance_date) });
                setItems(order.MaintenanceItems.map(i => ({
                    key: i.id, type: i.type, part_id: i.part_id, 
                    description: i.type === 'PART' ? i.Part?.name : i.description,
                    unit: i.unit, quantity: i.quantity, unit_price: i.unit_price, total_price: i.total_price
                })));
                setVehicleFound({ internal: order.is_internal_vehicle });
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
            form.setFieldsValue({ lift_table_id: location.state.lift_id, warehouse_id: location.state.warehouse_id });
        }
    }, [id]);

    const handleEditFromBoard = (orderId) => {
        navigate(`/maintenance-hub/${orderId}`);
    };

    const handleCreateNew = (data) => {
        form.resetFields();
        setItems([]);
        setVehicleFound(null);
        if (data) form.setFieldsValue(data);
        setActiveTab('form');
    };

    const handleVehicleSearch = async (value) => {
        if (!value || value.length < 3) return;
        try {
            const res = await api.get(`/search-sold-vehicles?q=${value}`);
            const options = res.data.map(item => ({
                value: item.engine_no,
                label: `${item.engine_no} - ${item.customer_name} (${item.phone || 'N/A'})`,
                item
            }));
            setVehicleOptions(options);
        } catch (e) { console.error(e); }
    };

    const handleVehicleSelect = (val, option) => {
        const item = option.item;
        if (item) {
            setVehicleFound({ internal: true, data: item });
            form.setFieldsValue({
                customer_name: item.customer_name,
                customer_phone: item.phone,
                customer_address: item.address,
                engine_no: item.engine_no,
                chassis_no: item.chassis_no,
                model_name: item.Vehicle?.VehicleType?.name || ''
            });
            message.success('Đã nhận diện xe hệ thống bán ra!');
        }
    };

    const onFinish = async (values) => {
        setSubmitLoading(true);
        try {
            const payload = { ...values, maintenance_date: values.maintenance_date.toISOString(), items };
            if (id) await api.put(`/maintenance-order/${id}`, payload);
            else await api.post('/maintenance-order', payload);
            message.success('Thao tác thành công!');
            fetchData();
            setActiveTab('board');
            navigate('/maintenance-hub');
        } catch (e) { message.error(e.message); } finally { setSubmitLoading(false); }
    };

    // --- Tab Renderers ---
    const renderForm = () => (
        <Row gutter={24}>
            <Col xs={24} lg={8}>
                <Card 
                    className="glass-card" 
                    title={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <Space><Wrench size={18}/> THÔNG TIN BẢO TRÌ</Space>
                            {vehicleFound?.internal && <Badge status="success" text={<Text strong style={{color:'#10b981'}}>XE HỆ THỐNG</Text>} />}
                        </div>
                    }
                >
                    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ maintenance_date: dayjs(), status: 'IN_PROGRESS' }}>
                        <Form.Item label="Tìm kiếm xe (Số máy/Số khung/SĐT)" name="search_vehicle">
                            <AutoComplete 
                                options={vehicleOptions} 
                                onSearch={handleVehicleSearch} 
                                onSelect={handleVehicleSelect}
                            >
                                <Input.Search placeholder="Nhập để tìm xe hệ thống..." allowClear />
                            </AutoComplete>
                        </Form.Item>
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
                            <Col span={12}><Form.Item label="Số KM" name="km_reading"><InputNumber style={{width:'100%'}}/></Form.Item></Col>
                            <Col span={12}><Form.Item label="Kho xuất" name="warehouse_id"><Select>{warehouses.map(w => <Select.Option value={w.id}>{w.warehouse_name}</Select.Option>)}</Select></Form.Item></Col>
                            <Col span={12}><Form.Item label="Bàn nâng" name="lift_table_id"><Select allowClear>{liftTables.filter(l => !selectedWarehouse || l.warehouse_id === selectedWarehouse).map(l => <Select.Option value={l.id}>{l.name} {l.status==='BUSY'&&l.id!==form.getFieldValue('lift_table_id')?'(Bận)':''}</Select.Option>)}</Select></Form.Item></Col>
                        </Row>
                        <Divider />
                        <Title level={5}>KHÁCH HÀNG</Title>
                        <Form.Item label="Tên khách" name="customer_name"><Input /></Form.Item>
                        <Form.Item label="Điện thoại" name="customer_phone"><Input /></Form.Item>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 8, marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text>Tổng cộng:</Text><Title level={4} style={{margin:0}}>{items.reduce((s,i)=>s+i.total_price, 0).toLocaleString()} đ</Title></div>
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
                        </Space>
                    </Form>
                </Card>
            </Col>
            <Col xs={24} lg={16}>
                <Card className="glass-card" title="CHI TIẾT PHỤ TÙNG & CÔNG VIỆC">
                    <Table 
                        dataSource={items}
                        pagination={false}
                        columns={[
                            { title: 'Hạng mục', dataIndex: 'type', render: t => <Tag color={t==='PART'?'blue':'orange'}>{t}</Tag> },
                            { title: 'Nội dung', dataIndex: 'description', render: (t, r) => r.type==='SERVICE'?<Input value={t} onChange={e=>{setItems(items.map(i=>i.key===r.key?{...i,description:e.target.value,total_price:i.quantity*i.unit_price}:i))}}/> : t },
                            { title: 'SL', dataIndex: 'quantity', width: 80, render: (v, r) => <InputNumber min={1} value={v} onChange={val=>{setItems(items.map(i=>i.key===r.key?{...i,quantity:val,total_price:val*i.unit_price}:i))}}/> },
                            { title: 'Đơn giá', dataIndex: 'unit_price', render: (v, r) => <InputNumber value={v} onChange={val=>{setItems(items.map(i=>i.key===r.key?{...i,unit_price:val,total_price:i.quantity*val}:i))}}/> },
                            { title: 'Thành tiền', dataIndex: 'total_price', render: v => <b>{v.toLocaleString()}</b> },
                            { render: (_, r) => <Button type="text" danger icon={<Trash2 size={16}/>} onClick={()=>setItems(items.filter(i=>i.key!==r.key))}/> }
                        ]}
                    />
                    <Space style={{ marginTop: 20 }}>
                        <Button onClick={() => setItems([...items, { key:Date.now(), type:'SERVICE', description:'', quantity:1, unit_price:0, total_price:0 }])}>Thêm tiền công</Button>
                        <AutoComplete 
                            onSelect={(v, opt) => setItems([...items, { key:Date.now(), type:'PART', part_id:opt.p.id, description:opt.p.name, quantity:1, unit_price:opt.p.selling_price, total_price:opt.p.selling_price }])}
                            options={allParts.map(p=>({ value:p.name, label:p.name, p }))}
                        ><Input.Search placeholder="Tìm phụ tùng..." style={{width:300}}/></AutoComplete>
                    </Space>
                </Card>
            </Col>
        </Row>
    );

    const renderHistory = () => (
        <Card className="glass-card" title="LỊCH SỬ SỬA CHỮA">
            <Table 
                dataSource={history}
                columns={[
                    { title: 'Ngày', dataIndex: 'maintenance_date', render: d => dayjs(d).format('DD/MM/YY HH:mm') },
                    { title: 'Biển số', dataIndex: 'license_plate' },
                    { title: 'Khách hàng', dataIndex: 'customer_name' },
                    { title: 'Tổng tiền', dataIndex: 'total_amount', render: v => v.toLocaleString() },
                    { title: 'Trạng thái', dataIndex: 'status', render: s => <Tag color={s==='COMPLETED'?'green':'blue'}>{s}</Tag> },
                    { render: (_, r) => <Button icon={<Eye size={16}/>} onClick={() => fetchOrderDetails(r.id)}>Xem</Button> }
                ]}
            />
        </Card>
    );

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2} style={{ margin: 0 }} className="gradient-text">TRUNG TÂM BẢO TRÌ & DỊCH VỤ</Title>
            </div>

            <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                type="card"
                className="modern-tabs"
                items={[
                    { key: 'board', label: <Space><LayoutGrid size={16}/> ĐIỀU PHỐI BÀN NÂNG</Space>, children: <MaintenanceBoard onEditOrder={handleEditFromBoard} onCreateNew={handleCreateNew} /> },
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
            `}</style>
        </div>
    );
};

export default MaintenanceHub;
