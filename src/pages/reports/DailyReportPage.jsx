import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  DatePicker, 
  Select, 
  Space, 
  Typography, 
  Divider, 
  Button, 
  message,
  Skeleton
} from 'antd';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Truck, 
  Search,
  Calendar,
  Warehouse as WarehouseIcon,
  Download,
  Wallet,
  Gift,
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { Wrench } from 'lucide-react';

const { Title, Text } = Typography;
const { Option } = Select;

const DailyReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [date, setDate] = useState(dayjs());
  const [warehouseId, setWarehouseId] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    if (isAdmin) {
      fetchWarehouses();
    }
    fetchReport();
  }, [date, warehouseId]);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const dateStr = date.format('YYYY-MM-DD');
      const whParam = warehouseId ? `&warehouse_id=${warehouseId}` : '';
      const res = await api.get(`/reports/daily?date=${dateStr}${whParam}`);
      setData(res.data.metrics);
    } catch (error) {
      message.error('Lỗi tải báo cáo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
  };

  const MetricCard = ({ title, value, icon: Icon, color, suffix = 'đ' }) => (
    <Card className="glass-card" bordered={false}>
      <Statistic
        title={<Space style={{ color: '#64748b' }}><Icon size={16} /> <Text type="secondary">{title}</Text></Space>}
        value={value || 0}
        valueStyle={{ color: color || '#1e293b', fontWeight: 'bold' }}
        suffix={suffix}
      />
    </Card>
  );

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Title level={2} className="gradient-text">BÁO CÁO CUỐI NGÀY</Title>
        <Space wrap>
          <DatePicker 
            size="large" 
            value={date} 
            onChange={setDate} 
            format="DD/MM/YYYY" 
            allowClear={false}
            className="glass-input"
          />
          {isAdmin && (
            <Select 
              size="large"
              placeholder="Tất cả các kho" 
              style={{ width: 200 }}
              allowClear
              onChange={setWarehouseId}
              className="glass-input"
            >
              {warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
            </Select>
          )}
          <Button icon={<Search size={18} />} onClick={fetchReport} type="primary">Cập nhật</Button>
        </Space>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : data ? (
        <div className="report-content">
          <Row gutter={[24, 24]}>
            {/* Row 1: Key Metrics */}
            <Col xs={24} sm={12} lg={4}>
              <MetricCard 
                title="Tổng Doanh Thu" 
                value={data.totalRevenue} 
                icon={TrendingUp} 
                color="#6366f1"
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <MetricCard 
                title="Tiền Thực Thu" 
                value={data.totalIncome} 
                icon={Wallet} 
                color="#10b981"
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <MetricCard 
                title="Tiền Thực Chi" 
                value={data.totalOutcome} 
                icon={TrendingDown} 
                color="#f43f5e"
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <MetricCard 
                title="Dòng Tiền Thuần" 
                value={data.netCashFlow} 
                icon={DollarSign} 
                color={data.netCashFlow >= 0 ? '#10b981' : '#f43f5e'}
              />
            </Col>
            <Col xs={24} sm={12} lg={4}>
              <MetricCard 
                title="Doanh thu Dịch vụ" 
                value={data.maintenanceRevenue} 
                icon={Wrench} 
                color="#f59e0b"
              />
            </Col>

            {/* Row 2: Breakdown Cards */}
            <Col xs={24} md={12}>
              <Card title={<Space><TrendingUp size={18} /> CHI TIẾT DOANH THU & THU TIỀN</Space>} className="glass-card">
                 <Row gutter={[16, 16]}>
                    <Col span={8}>
                        <Statistic title="DT Bán lẻ" value={data.retailRevenue} suffix="đ" valueStyle={{ fontSize: 16 }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{data.retailCount} xe</Text>
                    </Col>
                    <Col span={8}>
                        <Statistic title="DT Bán sỉ" value={data.wholesaleRevenue} suffix="đ" valueStyle={{ fontSize: 16 }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{data.wholesaleCount} xe</Text>
                    </Col>
                    <Col span={8}>
                        <Statistic title="DT Dịch vụ" value={data.maintenanceRevenue} suffix="đ" valueStyle={{ fontSize: 16 }} />
                        <Text type="secondary" style={{ fontSize: 11 }}>{data.maintenanceCount} phiếu</Text>
                    </Col>
                    <Divider style={{ margin: '12px 0' }} />
                    <Col span={24}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text>Tổng các khoản thu hôm nay:</Text>
                            <Text strong color="#10b981">{formatMoney(data.collections)}</Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            (Bao gồm thu ngay khi bán và thu nợ từ khách hàng)
                        </Text>
                    </Col>
                 </Row>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title={<Space><TrendingDown size={18} /> CHI TIẾT CHI TIỀN (HÀNG & PHÍ)</Space>} className="glass-card">
                 <Row gutter={[16, 16]}>
                    <Col span={12}>
                        <Statistic title="Tiền nhập hàng" value={data.purchasesPaid} suffix="đ" valueStyle={{ fontSize: 18 }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>Thanh toán cho nhà cung cấp</Text>
                    </Col>
                    <Col span={12}>
                        <Statistic title="Chi phí phát sinh" value={data.expenses} suffix="đ" valueStyle={{ fontSize: 18 }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>Điện, nước, mặt bằng, lương...</Text>
                    </Col>
                    <Divider style={{ margin: '12px 0' }} />
                    <Col span={24}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text>Tổng các khoản chi hôm nay:</Text>
                            <Text strong color="#f43f5e">{formatMoney(data.totalOutcome)}</Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            (Vốn nhập hàng + Tất cả các chi phí vận hành)
                        </Text>
                    </Col>
                 </Row>
              </Card>
            </Col>

            <Col xs={24}>
              <Card title={<Space><Gift size={18} /> CHI PHÍ NỘI BỘ (KHUYẾN MẠI & BẢO HÀNH)</Space>} className="glass-card">
                 <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                        <div style={{ padding: '20px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 16, border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                            <Statistic 
                                title={<Text type="secondary">Tổng chi phí Bảo hành</Text>} 
                                value={data.warrantyCost} 
                                suffix="đ" 
                                valueStyle={{ color: '#f59e0b', fontWeight: 'bold' }} 
                            />
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Wrench size={14} style={{ color: '#f59e0b' }}/>
                                <Text type="secondary" style={{ fontSize: 12 }}>Tiền phụ tùng & công gốc bảo hành</Text>
                            </div>
                        </div>
                    </Col>
                    <Col xs={24} sm={12}>
                        <div style={{ padding: '20px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: 16, border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                            <Statistic 
                                title={<Text type="secondary">Tổng chi phí Khuyến mại</Text>} 
                                value={data.promoCost} 
                                suffix="đ" 
                                valueStyle={{ color: '#6366f1', fontWeight: 'bold' }} 
                            />
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Gift size={14} style={{ color: '#6366f1' }}/>
                                <Text type="secondary" style={{ fontSize: 12 }}>Giá trị quà tặng & phụ tùng khuyến mại</Text>
                            </div>
                        </div>
                    </Col>
                 </Row>
              </Card>
            </Col>


            {data.giftDistribution && Object.keys(data.giftDistribution).length > 0 && (
              <Col xs={24}>
                <Card title={<Space><Gift size={18} /> QUÀ TẶNG KHUYẾN MẠI ĐÃ PHÁT</Space>} className="glass-card">
                  <Row gutter={[16, 16]}>
                    {Object.entries(data.giftDistribution).map(([name, count]) => (
                      <Col xs={12} sm={8} md={6} lg={4} key={name}>
                        <div style={{ 
                          padding: '12px', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          borderRadius: 12, 
                          textAlign: 'center',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{name}</div>
                          <div style={{ fontSize: 20, fontWeight: 'bold', color: 'var(--primary-color)' }}>{count}</div>
                          <div style={{ fontSize: 10, opacity: 0.6 }}>Chiếc</div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Col>
            )}
          </Row>

        </div>
      ) : (
        <Card className="glass-card" style={{ textAlign: 'center', padding: '40px 0' }}>
            <Calendar size={48} style={{ color: '#cbd5e1', marginBottom: 16 }} />
            <br />
            <Text style={{ color: '#64748b' }}>Chưa có dữ liệu cho ngày này hoặc kho này.</Text>
        </Card>
      )}
    </div>
  );
};

export default DailyReportPage;
