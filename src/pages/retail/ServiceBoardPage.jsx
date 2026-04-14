import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Tag, Typography, Button, Space, message, Select, Badge, Empty } from 'antd';
import { LayoutGrid, Wrench, User, Bike, Clock, PlusCircle, Expand } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const { Title, Text } = Typography;

const ServiceBoardPage = () => {
    const navigate = useNavigate();
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
            if (!selectedWarehouse && whRes.data.length > 0) {
                // setSelectedWarehouse(whRes.data[0].id);
            }
        } catch (error) {
            message.error('Lỗi tải dữ liệu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Refresh every 30 seconds
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
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        <LayoutGrid size={24} style={{ marginRight: 8, marginBottom: -4 }} /> ĐIỀU PHỐI BÀN NÂNG
                    </Title>
                    <Text type="secondary">Quản lý và theo dõi trạng thái sửa chữa thời gian thực</Text>
                </div>
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

            {loading && lifts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 50 }}>Đang tải dữ liệu...</div>
            ) : lifts.length === 0 ? (
                <Empty description="Không có bàn nâng nào được thiết lập cho khu vực này." />
            ) : (
                <Row gutter={[20, 20]}>
                    {lifts.map(lift => {
                        const activeOrder = lift.MaintenanceOrders?.[0]; // Get the pending/in-progress order
                        
                        return (
                            <Col xs={24} sm={12} md={8} lg={6} key={lift.id}>
                                <Card 
                                    hoverable
                                    className={`lift-card ${lift.status === 'BUSY' ? 'busy-lift' : ''}`}
                                    styles={{ body: { padding: '16px' } }}
                                    style={{ 
                                        borderRadius: 16, 
                                        border: `1px solid ${lift.status === 'BUSY' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
                                        background: lift.status === 'BUSY' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(20, 20, 20, 0.4) 100%)' : 'rgba(255, 255, 255, 0.02)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <Text strong style={{ fontSize: 16 }}>{lift.name}</Text>
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
                                                <Text style={{ fontSize: 13 }}>
                                                    Sửa được: <Text strong color="warning">
                                                        {activeOrder.createdAt ? dayjs(activeOrder.createdAt).fromNow(true) : '...'}
                                                    </Text>
                                                </Text>
                                            </div>

                                            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center' }}>
                                                <Wrench size={14} style={{ marginRight: 8, opacity: 0.7 }} />
                                                <Tag size="small">Phiếu: #{activeOrder.id.substring(0, 8)}</Tag>
                                            </div>
                                            
                                            <Button 
                                                block 
                                                type="primary" 
                                                ghost 
                                                icon={<Expand size={14} />}
                                                onClick={() => navigate(`/repair-service/${activeOrder.id}`)}
                                            >
                                                Chi tiết / Cập nhật
                                            </Button>
                                        </div>
                                    ) : (
                                        <div style={{ minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', opacity: 0.5 }}>
                                            {lift.status === 'AVAILABLE' ? (
                                                <>
                                                    <Wrench size={32} style={{ marginBottom: 12 }} />
                                                    <Button 
                                                        icon={<PlusCircle size={16} />} 
                                                        onClick={() => navigate('/repair-service', { state: { lift_id: lift.id, warehouse_id: lift.warehouse_id } })}
                                                    >
                                                        Tiếp nhận xe mới
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Text italic>Bàn nâng đang được bảo trì</Text>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 11, opacity: 0.5 }}>
                                        Chi nhánh: {lift.Warehouse?.warehouse_name}
                                    </div>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            <style>{`
                .lift-card { transition: all 0.3s ease; }
                .lift-card:hover { transform: translateY(-5px); border-color: var(--primary-color) !important; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
                .busy-lift { border-left: 4px solid #ef4444 !important; }
            `}</style>
        </div>
    );
};

export default ServiceBoardPage;
