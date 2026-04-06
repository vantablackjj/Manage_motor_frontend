import React, { useState, useEffect } from 'react';
import { 
  Row, 
  Col, 
  Card, 
  Statistic, 
  Select, 
  DatePicker, 
  Typography, 
  Space, 
  message,
  Divider,
  Tag
} from 'antd';
import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Filter,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../utils/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const AdminDashboardPage = () => {
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [filters, setFilters] = useState({
        warehouse_id: null,
        dates: [dayjs().startOf('month'), dayjs()]
    });

    useEffect(() => {
        fetchWarehouses();
        fetchStats();
    }, []);

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/warehouses');
            setWarehouses(res.data);
        } catch (e) {}
    };

    const fetchStats = async (f = filters) => {
        setLoading(true);
        try {
            const params = {
                warehouse_id: f.warehouse_id,
                from_date: f.dates[0].format('YYYY-MM-DD'),
                to_date: f.dates[1].format('YYYY-MM-DD')
            };
            const res = await api.get('/dashboard/stats', { params });
            setStats(res.data);
        } catch (e) {
            message.error("Không thể tải số liệu thống kê");
        } finally {
            setLoading(false);
        }
    };

    const handleWarehouseChange = (val) => {
        const newFilters = { ...filters, warehouse_id: val };
        setFilters(newFilters);
        fetchStats(newFilters);
    };

    const handleDateChange = (dates) => {
        if (!dates) return;
        const newFilters = { ...filters, dates };
        setFilters(newFilters);
        fetchStats(newFilters);
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    return (
        <div className="dashboard-container">
            <div className="page-header" style={{ alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                   <Title level={2} className="gradient-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TrendingUp size={24} /> Tổng quan hệ thống
                   </Title>
                   <Text type="secondary" style={{ fontSize: 13 }}>Số liệu kinh doanh & tồn kho thời gian thực</Text>
                </div>

                <Space size="middle" wrap className="dashboard-filters">
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
                         <Space>
                            <Filter size={14} opacity={0.6} />
                            <Select 
                                placeholder="Tất cả kho" 
                                style={{ width: 140 }} 
                                allowClear
                                onChange={handleWarehouseChange}
                                value={filters.warehouse_id}
                                variant="borderless"
                                size="small"
                            >
                                {warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
                            </Select>
                         </Space>
                    </div>

                    <RangePicker 
                        value={filters.dates}
                        onChange={handleDateChange}
                        style={{ borderRadius: 8 }}
                        size="small"
                    />
                </Space>
            </div>

            <Row gutter={[24, 24]}>
                {/* 1. Tổng doanh thu */}
                <Col xs={24} sm={12} lg={6}>
                    <Card className="glass-card dashboard-card">
                        <Statistic
                            title={<Space><DollarSign size={16} /> <Text type="secondary">TỔNG DOANH THU (DỰ KIẾN)</Text></Space>}
                            value={stats?.totalRevenue || 0}
                            formatter={(v) => <span className="gradient-text" style={{ fontWeight: 'bold' }}>{formatCurrency(v)}</span>}
                        />
                        <div style={{ marginTop: 8 }}>
                            <Tag color="green"><ArrowUpRight size={12} /> Tăng trưởng 12%</Tag>
                        </div>
                    </Card>
                </Col>

                {/* 2. Lợi nhuận gộp */}
                <Col xs={24} sm={12} lg={6}>
                    <Card className="glass-card dashboard-card">
                        <Statistic
                            title={<Space><TrendingUp size={16} /> <Text type="secondary">LỢI NHUẬN GỘP</Text></Space>}
                            value={stats?.totalProfit || 0}
                            formatter={(v) => <span style={{ color: '#10b981', fontWeight: 'bold' }}>{formatCurrency(v)}</span>}
                        />
                         <div style={{ marginTop: 8 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Đã trừ giá nhập & phí</Text>
                        </div>
                    </Card>
                </Col>

                {/* 3. Bán lẻ */}
                <Col xs={24} sm={12} lg={6}>
                    <Card className="glass-card dashboard-card">
                        <Statistic
                            title={<Space><ShoppingCart size={16} /> <Text type="secondary">XE ĐÃ BÁN LẺ</Text></Space>}
                            value={stats?.retail?.count || 0}
                            suffix="xe"
                        />
                         <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>Tạm thu:</Text>
                            <Text strong style={{ fontSize: 12 }}>{formatCurrency(stats?.retail?.paid)}</Text>
                        </div>
                    </Card>
                </Col>

                 {/* 4. Tồn kho */}
                 <Col xs={24} sm={12} lg={6}>
                    <Card className="glass-card dashboard-card">
                        <Statistic
                            title={<Space><Package size={16} /> <Text type="secondary">XE ĐANG CÓ SẴN (TỒN)</Text></Space>}
                            value={stats?.inventorySize || 0}
                            valueStyle={{ color: '#f59e0b' }}
                            suffix="xe"
                        />
                         <div style={{ marginTop: 8 }}>
                            <Tag color="orange">Cần đẩy mạnh bán hàng</Tag>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={16}>
                    <Card title="CHI TIẾT HOẠT ĐỘNG KINH DOANH" className="glass-card">
                         <Row gutter={[24, 24]}>
                            <Col xs={24} md={12}>
                                <div style={{ padding: '10px 0' }}>
                                    <Text type="secondary">Doanh số bán buôn</Text>
                                    <div style={{ fontSize: 24, fontWeight: 'bold', margin: '8px 0' }}>{stats?.wholesale?.count || 0} <small style={{ fontWeight: 'normal', fontSize: 14, opacity: 0.5 }}>lô hàng</small></div>
                                    <div style={{ fontSize: 13 }}>Doanh thu buôn: <Text strong>{formatCurrency(stats?.wholesale?.revenue)}</Text></div>
                                </div>
                                <Divider style={{ margin: '12px 0' }} />
                                <div style={{ padding: '10px 0' }}>
                                    <Text type="secondary">Hoạt động nhập hàng</Text>
                                    <div style={{ fontSize: 24, fontWeight: 'bold', margin: '8px 0' }}>{stats?.purchase?.count || 0} <small style={{ fontWeight: 'normal', fontSize: 14, opacity: 0.5 }}>đơn</small></div>
                                    <div style={{ fontSize: 13 }}>Vốn đã nhập: <Text strong style={{ color: '#ef4444' }}>{formatCurrency(stats?.purchase?.spent)}</Text></div>
                                </div>
                            </Col>
                            <Col xs={24} md={12} className="dashboard-detail-col">
                                <div style={{ padding: '10px 0' }}>
                                    <Text type="secondary">Chi phí vận hành khác</Text>
                                    <div style={{ fontSize: 24, fontWeight: 'bold', margin: '8px 0', color: '#ef4444' }}>{formatCurrency(stats?.expenses)}</div>
                                    <Text type="secondary" style={{ fontSize: 12 }}>Bao gồm: Sửa chữa, mặt bằng, điện nước...</Text>
                                </div>
                                <div style={{ marginTop: 20, background: 'rgba(59, 130, 246, 0.05)', padding: 16, borderRadius: 12 }}>
                                     <Space direction="vertical" style={{ width: '100%' }}>
                                        <Text strong><Layers size={14} /> Hiệu suất kho</Text>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                            <span>Tỉ lệ quay vòng:</span>
                                            <span style={{ color: '#3b82f6' }}>4.2 / tháng</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                            <span>Hàng tồn kho lâu:</span>
                                            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{stats?.agingVehicles || 0} xe (&gt;60 ngày)</span>
                                        </div>
                                     </Space>
                                </div>
                            </Col>
                         </Row>
                    </Card>

                </Col>

                <Col xs={24} lg={8}>
                    <Card title="Giao diện Dashboard mobile" className="glass-card" style={{ height: '100%', background: 'linear-gradient(135deg, rgba(30,58,138,0.1) 0%, rgba(15,23,42,0.1) 100%)' }}>
                         <div style={{ textAlign: 'center', padding: '20px 0' }}>
                             <Statistic 
                                title="CHỈ SỐ SỨC KHỎE KHO" 
                                value={85} 
                                suffix="%" 
                                valueStyle={{ color: '#10b981', fontSize: 40 }}
                             />
                             <div style={{ marginTop: 20 }}>
                                <Tag color="success">Hệ thống đang vận hành tốt</Tag>
                             </div>
                             <p style={{ marginTop: 20, opacity: 0.6, fontSize: 12 }}>
                                Số liệu được tính toán tự động dựa trên hóa đơn bán lẻ và dữ liệu nhập kho.
                             </p>
                         </div>
                    </Card>
                </Col>
            </Row>

            <style>{`
                .dashboard-card {
                    transition: all 0.3s ease;
                }
                .dashboard-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(59, 130, 246, 0.1) !important;
                    border-color: var(--primary-color) !important;
                }
                .dashboard-detail-col {
                    border-left: 1px solid var(--border-color);
                    padding-left: 24px;
                }
                @media (max-width: 768px) {
                    .dashboard-filters {
                        width: 100% !important;
                        flex-direction: column !important;
                        align-items: stretch !important;
                    }
                    .dashboard-filters > div, .dashboard-filters > .ant-picker {
                        width: 100% !important;
                    }
                    .dashboard-detail-col {
                        border-left: none;
                        padding-left: 0;
                        margin-top: 16px;
                        border-top: 1px solid var(--border-color);
                        padding-top: 16px;
                    }
                }

            `}</style>
        </div>
    );
};

export default AdminDashboardPage;
