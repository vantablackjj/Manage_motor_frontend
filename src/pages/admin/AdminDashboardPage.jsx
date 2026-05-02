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
  Tag,
  Progress,
  Badge,
  Tooltip,
  Button
} from 'antd';

import { 
  TrendingUp, 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Wrench,
  Settings,
  CreditCard,
  Truck,
  Activity,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Wallet
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

    const KPICard = ({ title, value, icon: Icon, color, trend, suffix = 'đ' }) => (
        <Card className="modern-kpi-card" bordered={false}>
            <div className="kpi-icon" style={{ backgroundColor: `${color}15`, color: color }}>
                <Icon size={24} />
            </div>
            <div className="kpi-content">
                <Text type="secondary" className="kpi-title">{title}</Text>
                <div className="kpi-value-container">
                    <Title level={3} className="kpi-value">
                        {typeof value === 'number' && suffix === 'đ' ? formatCurrency(value).replace('₫', '') : value}
                        <small className="kpi-suffix">{suffix}</small>
                    </Title>
                    {trend && (
                        <Tag color={trend > 0 ? 'success' : 'error'} className="kpi-trend">
                            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                            {Math.abs(trend)}%
                        </Tag>
                    )}
                </div>
            </div>
        </Card>
    );

    return (
        <div className="modern-dashboard">
            {/* STYLES */}
            <style>{`
                .modern-dashboard {
                    padding: 0 12px 24px 12px;
                    background: transparent;
                }
                .dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 32px;
                }
                .header-title-section h2 {
                    margin: 0;
                    font-weight: 800;
                    letter-spacing: -0.5px;
                }
                .filter-bar {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(10px);
                    padding: 8px 16px;
                    border-radius: 12px;
                    border: 1px solid rgba(0,0,0,0.05);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }
                
                .modern-kpi-card {
                    border-radius: 20px;
                    box-shadow: 0 10px 20px rgba(0,0,0,0.02);
                    transition: all 0.3s ease;
                    height: 100%;
                }
                .modern-kpi-card:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 15px 30px rgba(0,0,0,0.05);
                }
                .kpi-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                }
                .kpi-title {
                    font-size: 13px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    font-weight: 700;
                }
                .kpi-value-container {
                    display: flex;
                    align-items: baseline;
                    gap: 8px;
                    margin-top: 4px;
                }
                .kpi-value {
                    margin: 0 !important;
                    font-weight: 800 !important;
                }
                .kpi-suffix {
                    font-size: 14px;
                    margin-left: 4px;
                    opacity: 0.6;
                }
                .kpi-trend {
                    font-size: 11px;
                    border-radius: 20px;
                    padding: 0 8px;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                }

                .main-stats-card {
                    border-radius: 24px;
                    background: #ffffff;
                    border: 1px solid rgba(0,0,0,0.05);
                    overflow: hidden;
                }
                .card-header-premium {
                    padding: 20px 24px;
                    border-bottom: 1px solid rgba(0,0,0,0.03);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .card-header-premium h4 {
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 700;
                }
                
                .revenue-hero {
                    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                    color: white;
                    padding: 32px;
                    border-radius: 20px;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 20px 40px rgba(30, 27, 75, 0.2);
                }
                .revenue-hero::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -20%;
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, rgba(79, 70, 229, 0.2) 0%, transparent 70%);
                    border-radius: 50%;
                }
                .hero-label {
                    opacity: 0.7;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .hero-amount {
                    font-size: 36px;
                    font-weight: 900;
                    margin: 8px 0;
                    background: linear-gradient(to right, #ffffff, #cbd5e1);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .breakdown-item {
                    padding: 16px;
                    border-radius: 16px;
                    background: #f8fafc;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                }
                .breakdown-item:hover {
                    background: #ffffff;
                    border-color: #e2e8f0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }

                .metric-bar-label {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 6px;
                    font-size: 12px;
                }
                
                .op-card {
                    background: #fff;
                    border-radius: 20px;
                    padding: 24px;
                    height: 100%;
                }
                .profit-badge {
                    background: #ecfdf5;
                    color: #059669;
                    padding: 12px 20px;
                    border-radius: 14px;
                    text-align: center;
                }
                .loss-badge {
                    background: #fef2f2;
                    color: #dc2626;
                    padding: 12px 20px;
                    border-radius: 14px;
                    text-align: center;
                }

                @media (max-width: 768px) {
                    .dashboard-header {
                        flex-direction: column;
                        gap: 16px;
                    }
                    .filter-bar {
                        width: 100%;
                    }
                    .revenue-hero {
                        padding: 20px;
                    }
                    .hero-amount {
                        font-size: 24px;
                    }
                }
            `}</style>

            {/* HEADER */}
            <div className="dashboard-header">
                <div className="header-title-section">
                    <Title level={2} className="gradient-text">Trung Tâm Điều Hành</Title>
                    <Space>
                        <Badge status="processing" color="var(--primary-color)" />
                        <Text type="secondary" style={{ fontSize: 13 }}>Cập nhật tự động: {dayjs().format('HH:mm')}</Text>
                    </Space>
                </div>

                <div className="filter-bar">
                    <Space size="large" wrap>
                        <Space>
                            <Calendar size={16} opacity={0.5} />
                            <RangePicker 
                                variant="borderless"
                                value={filters.dates}
                                onChange={handleDateChange}
                                format="DD/MM/YYYY"
                                size="small"
                                style={{ width: 220 }}
                            />
                        </Space>
                        <Divider type="vertical" />
                        <Space>
                            <Truck size={16} opacity={0.5} />
                            <Select 
                                variant="borderless"
                                placeholder="Tất cả kho" 
                                style={{ width: 140 }} 
                                allowClear
                                onChange={handleWarehouseChange}
                                value={filters.warehouse_id}
                                size="small"
                            >
                                {warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
                            </Select>
                        </Space>
                    </Space>
                </div>
            </div>

            {/* TOP KPI ROW */}
            <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                <Col xs={24} sm={12} lg={6}>
                    <KPICard 
                        title="Dòng Tiền Thuần" 
                        value={stats?.totalRevenue - (stats?.totalCOGS + stats?.expenses)} 
                        icon={Activity} 
                        color="#6366f1"
                        trend={12}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <KPICard 
                        title="Doanh Số Bán Lẻ" 
                        value={stats?.retail?.count || 0} 
                        icon={ShoppingCart} 
                        color="#10b981"
                        suffix="xe"
                        trend={5}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <KPICard 
                        title="Hàng Tồn Kho" 
                        value={stats?.inventorySize || 0} 
                        icon={Package} 
                        color="#f59e0b"
                        suffix="xe"
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <KPICard 
                        title="Tồn Trên 40 Ngày" 
                        value={stats?.agingVehicles || 0} 
                        icon={AlertTriangle} 
                        color="#ef4444"
                        suffix="xe"
                    />
                </Col>
            </Row>

            <Row gutter={[24, 24]}>
                {/* LEFT COLUMN: Revenue & Performance */}
                <Col xs={24} xl={16}>
                    <div className="main-stats-card">
                        <div className="card-header-premium">
                            <h4><TrendingUp size={20} color="var(--primary-color)" /> PHÂN TÍCH DOANH THU CHI TIẾT</h4>
                            <Tag color="blue" bordered={false}>Dữ liệu tổng hợp</Tag>
                        </div>
                        <div style={{ padding: 24 }}>
                            <Row gutter={[32, 32]}>
                                <Col xs={24} md={10}>
                                    <div className="revenue-hero">
                                        <div className="hero-label">Tổng doanh thu hệ thống</div>
                                        <div className="hero-amount">{formatCurrency(stats?.totalRevenue)}</div>
                                        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                                            <div className="hero-stat">
                                                <div style={{ opacity: 0.6, fontSize: 10 }}>THỰC THU</div>
                                                <div style={{ fontWeight: 700 }}>{formatCurrency(stats?.retail?.paid)}</div>
                                            </div>
                                            <div className="hero-stat">
                                                <div style={{ opacity: 0.6, fontSize: 10 }}>CÒN NỢ</div>
                                                <div style={{ fontWeight: 700 }}>{formatCurrency(stats?.totalRevenue - stats?.retail?.paid)}</div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginTop: 24 }}>
                                        <Title level={5} style={{ marginBottom: 16 }}>Dịch vụ & Phụ tùng</Title>
                                        <Row gutter={[16, 16]}>
                                            <Col span={12}>
                                                <div className="breakdown-item">
                                                    <Wrench size={16} color="#3b82f6" />
                                                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>DỊCH VỤ</div>
                                                    <Text strong>{formatCurrency(stats?.maintenance?.revenue)}</Text>
                                                </div>
                                            </Col>
                                            <Col span={12}>
                                                <div className="breakdown-item">
                                                    <Settings size={16} color="#8b5cf6" />
                                                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>PHỤ TÙNG</div>
                                                    <Text strong>{formatCurrency(stats?.parts?.sales?.revenue)}</Text>
                                                </div>
                                            </Col>
                                        </Row>
                                    </div>
                                </Col>

                                <Col xs={24} md={14}>
                                    <Title level={5} style={{ marginBottom: 20 }}>Tỷ Trọng Doanh Thu</Title>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                        <div className="metric-bar-group">
                                            <div className="metric-bar-label">
                                                <Text strong>Bán lẻ xe máy</Text>
                                                <Text type="secondary">{Math.round((stats?.retail?.revenue / stats?.totalRevenue) * 100) || 0}%</Text>
                                            </div>
                                            <Progress percent={Math.round((stats?.retail?.revenue / stats?.totalRevenue) * 100) || 0} strokeColor="#4f46e5" showInfo={false} strokeWidth={8} />
                                        </div>

                                        <div className="metric-bar-group">
                                            <div className="metric-bar-label">
                                                <Text strong>Bán buôn (Sỉ lô)</Text>
                                                <Text type="secondary">{Math.round((stats?.wholesale?.revenue / stats?.totalRevenue) * 100) || 0}%</Text>
                                            </div>
                                            <Progress percent={Math.round((stats?.wholesale?.revenue / stats?.totalRevenue) * 100) || 0} strokeColor="#10b981" showInfo={false} strokeWidth={8} />
                                        </div>

                                        <div className="metric-bar-group">
                                            <div className="metric-bar-label">
                                                <Text strong>Thu nhập khác (Gửi xe, mặt bằng...)</Text>
                                                <Text type="secondary">{Math.round((stats?.otherIncomes / stats?.totalRevenue) * 100) || 0}%</Text>
                                            </div>
                                            <Progress percent={Math.round((stats?.otherIncomes / stats?.totalRevenue) * 100) || 0} strokeColor="#f59e0b" showInfo={false} strokeWidth={8} />
                                        </div>

                                        <div className="metric-bar-group">
                                            <div className="metric-bar-label">
                                                <Text strong>Bảo trì & Sửa chữa</Text>
                                                <Text type="secondary">{Math.round((stats?.maintenance?.revenue / stats?.totalRevenue) * 100) || 0}%</Text>
                                            </div>
                                            <Progress percent={Math.round((stats?.maintenance?.revenue / stats?.totalRevenue) * 100) || 0} strokeColor="#3b82f6" showInfo={false} strokeWidth={8} />
                                        </div>
                                    </div>

                                    <Divider />
                                    
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <div style={{ flex: 1, padding: 16, borderRadius: 12, background: 'rgba(59, 130, 246, 0.05)' }}>
                                            <Space><Layers size={14} color="#3b82f6" /> <Text type="secondary" style={{ fontSize: 12 }}>Tổng lượt bán lẻ</Text></Space>
                                            <div style={{ fontSize: 18, fontWeight: 700 }}>{stats?.retail?.count} <small style={{ fontWeight: 400, fontSize: 12 }}>xe</small></div>
                                        </div>
                                        <div style={{ flex: 1, padding: 16, borderRadius: 12, background: 'rgba(16, 185, 129, 0.05)' }}>
                                            <Space><CheckCircle2 size={14} color="#10b981" /> <Text type="secondary" style={{ fontSize: 12 }}>Tỉ lệ xe In Stock</Text></Space>
                                            <div style={{ fontSize: 18, fontWeight: 700 }}>{Math.round((stats?.inventorySize / (stats?.inventorySize + (stats?.retail?.count || 0))) * 100) || 0}%</div>
                                        </div>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    </div>
                </Col>

                {/* RIGHT COLUMN: Operating & Profit */}
                <Col xs={24} xl={8}>
                    <div className="op-card shadow-sm">
                        <Title level={5} style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <CreditCard size={18} /> KẾT QUẢ KINH DOANH
                        </Title>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className={stats?.totalProfit >= 0 ? "profit-badge" : "loss-badge"}>
                                <div style={{ fontSize: 12, opacity: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>Lợi nhuận ròng dự kiến</div>
                                <div style={{ fontSize: 24, fontWeight: 900 }}>{formatCurrency(stats?.totalProfit)}</div>
                                <div style={{ fontSize: 11, marginTop: 4 }}>Sau khi trừ giá vốn & chi phí vận hành</div>
                            </div>

                            <Card bordered={false} styles={{ body: { padding: '16px' } }} style={{ background: '#f8fafc', borderRadius: 16 }}>
                                <Text strong style={{ fontSize: 12, opacity: 0.6, textTransform: 'uppercase' }}>Cơ cấu chi phí</Text>
                                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Space><Truck size={14} opacity={0.6} /> <Text>Nhập xe máy:</Text></Space>
                                        <Text strong>{formatCurrency(stats?.purchase?.spent)}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Space><Settings size={14} opacity={0.6} /> <Text>Nhập phụ tùng:</Text></Space>
                                        <Text strong>{formatCurrency(stats?.parts?.purchase?.spent)}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Space><AlertTriangle size={14} color="#ef4444" /> <Text>Chi vận hành:</Text></Space>
                                        <Text strong color="#ef4444">{formatCurrency(stats?.expenses)}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Space><Wallet size={14} color="#10b981" /> <Text>Thu nhập khác:</Text></Space>
                                        <Text strong style={{ color: '#10b981' }}>+ {formatCurrency(stats?.otherIncomes)}</Text>
                                    </div>
                                </div>
                            </Card>

                            <div style={{ marginTop: 8 }}>
                                <Title level={5} style={{ fontSize: 14, marginBottom: 12 }}>Sức khỏe kho hàng</Title>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ background: '#fff', border: '1px solid #f1f5f9', padding: 12, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Space><Package size={16} color="#f59e0b" /> <Text>Xe tồn lâu (&gt;40n)</Text></Space>
                                        <Badge count={stats?.agingVehicles} color="#ef4444" />
                                    </div>
                                    <div style={{ background: '#fff', border: '1px solid #f1f5f9', padding: 12, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Space><CheckCircle2 size={16} color="#10b981" /> <Text>Mã phụ tùng có sẵn</Text></Space>
                                        <Text strong>{stats?.parts?.inventoryCount}</Text>
                                    </div>
                                </div>
                            </div>

                            <Button type="primary" block size="large" icon={<ArrowRight size={18} />} style={{ marginTop: 12, borderRadius: 14, height: 48, fontWeight: 700 }}>
                                XEM CHI TIẾT BÁO CÁO
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default AdminDashboardPage;
