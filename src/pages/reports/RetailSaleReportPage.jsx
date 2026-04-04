import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Row, 
  Col, 
  Typography, 
  DatePicker, 
  Button, 
  Space, 
  Checkbox, 
  Statistic,
  Tag,
  message,
  Divider
} from 'antd';
import { 
  Search, 
  Printer, 
  Download, 
  ShoppingBag, 
  Calendar,
  User,
  MapPin,
  Smartphone,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../utils/api';

import { useSearchParams } from 'react-router-dom';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const RetailSaleReportPage = () => {
  const [searchParams] = useSearchParams();
  const urlWarehouseId = searchParams.get('warehouse_id');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ total_count: 0, total_revenue: 0, total_collected: 0, total_debt: 0 });
  const [filters, setFilters] = useState({
    dates: [dayjs().subtract(1, 'month'), dayjs()],
    hasDebt: false,
    warehouse_id: urlWarehouseId || undefined
  });

  const [warehouses, setWarehouses] = useState([]);

  useEffect(() => {
    fetchWarehouses();
    fetchData();
  }, [urlWarehouseId]);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (e) {}
  };



  const fetchData = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const params = {
        from_date: currentFilters.dates?.[0]?.format('YYYY-MM-DD'),
        to_date: currentFilters.dates?.[1]?.format('YYYY-MM-DD'),
        has_debt: currentFilters.hasDebt,
        warehouse_id: currentFilters.warehouse_id
      };

      const res = await api.get('/reports/retail-sales-report', { params });
      setData(res.data.sales);
      setSummary(res.data.summary);
    } catch (e) {
      message.error('Lỗi tải báo cáo: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const columns = [
    { 
      title: 'Ngày Bán', 
      dataIndex: 'sale_date', 
      fixed: 'left',
      width: 110,
      render: d => dayjs(d).format('DD/MM/YYYY') 
    },
    { 
      title: 'Khách hàng', 
      dataIndex: 'customer_name',
      fixed: 'left',
      width: 180,
      render: (t, r) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{t}</div>
          <div style={{ fontSize: 11, opacity: 0.6 }}><Smartphone size={10} /> {r.phone}</div>
        </div>
      )
    },
    { 
      title: 'Người bán', 
      width: 140,
      render: (_, r) => <Tag color="blue">{r.seller?.full_name || 'N/A'}</Tag>
    },
    { 
      title: 'Địa chỉ', 
      dataIndex: 'address',
      width: 250,
      ellipsis: true
    },
    { 
      title: 'Loại xe', 
      width: 150,
      render: (_, r) => r.Vehicle?.VehicleType?.name || 'N/A'
    },
    { 
      title: 'Màu xe', 
      width: 120,
      render: (_, r) => <Tag color="purple">{r.Vehicle?.VehicleColor?.color_name || 'N/A'}</Tag>
    },
    { title: 'Số Máy', dataIndex: 'engine_no', width: 150 },
    { title: 'Số Khung', dataIndex: 'chassis_no', width: 150 },
    { 
      title: 'Giá bán', 
      dataIndex: 'total_price',
      width: 130,
      render: v => <Text strong>{Number(v).toLocaleString()} đ</Text> 
    },
    { 
      title: 'Đã trả', 
      dataIndex: 'paid_amount',
      width: 130,
      render: v => <Text style={{ color: '#10b981' }}>{Number(v).toLocaleString()} đ</Text> 
    },
    { 
      title: 'Còng nợ', 
      width: 130,
      render: (_, r) => {
        const debt = Number(r.total_price) - Number(r.paid_amount);
        return <Text style={{ color: debt > 0 ? '#ef4444' : 'transparent', fontWeight: 'bold' }}>{debt > 0 ? `${debt.toLocaleString()} đ` : '-'}</Text>
      }
    },
    { title: 'Kiểu bán', dataIndex: 'sale_type', width: 120 },
    { title: 'Người bảo lãnh', dataIndex: 'guarantor_name', width: 150, render: v => v || '-' },
    { 
      title: 'Bảo hành', 
      dataIndex: 'guarantee', 
      width: 100,
      render: v => <Tag color={v === 'Có' ? 'green' : 'default'}>{v}</Tag> 
    }
  ];

  const handleExport = () => {
    if (!data || data.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = data.map(s => ({
      'Ngày Bán': dayjs(s.sale_date).format('DD/MM/YYYY'),
      'Khách hàng': s.customer_name,
      'SĐT': s.phone,
      'Địa chỉ': s.address,
      'Người bán': s.seller?.full_name || 'N/A',
      'Loại xe': s.Vehicle?.VehicleType?.name || 'N/A',
      'Màu xe': s.Vehicle?.VehicleColor?.color_name || 'N/A',
      'Số máy': s.engine_no,
      'Số khung': s.chassis_no,
      'Giá bán': Number(s.total_price),
      'Đã trả': Number(s.paid_amount),
      'Còn nợ': Number(s.total_price) - Number(s.paid_amount),
      'Kiểu bán': s.sale_type,
      'Bảo hành': s.guarantee
    }));

    exportToExcel(exportData, `BaoCaoBanLe_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  return (
    <div style={{ padding: '0 5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>XEM THÔNG TIN VỀ XE BÁN LẺ</Title>
        <Space>
           <Button icon={<Printer size={16} />}>In giấy bảo hành</Button>
           <Button 
            type="primary" 
            icon={<Download size={16} />}
            onClick={handleExport}
           >
            Xuất tệp báo cáo
           </Button>
        </Space>
      </div>

      <Card className="glass-card" style={{ marginBottom: 20 }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={5}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Checkbox 
                    checked={filters.hasDebt} 
                    onChange={e => handleFilterChange('hasDebt', e.target.checked)}
                    className="custom-checkbox"
                >
                    Xem danh sách xe nợ tiền
                </Checkbox>
            </div>
          </Col>
          <Col xs={24} md={14}>
             <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                {JSON.parse(localStorage.getItem('user') || '{}').role === 'ADMIN' && (
                    <div style={{ width: 220 }}>
                        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Lọc theo kho</div>
                        <select 
                            style={{ 
                                width: '100%', 
                                padding: '8px', 
                                background: 'rgba(39, 39, 42, 0.4)', 
                                border: '1px solid var(--border-color)',
                                color: 'white',
                                borderRadius: 8
                            }}
                            value={filters.warehouse_id}
                            onChange={e => handleFilterChange('warehouse_id', e.target.value)}
                        >
                            <option value="">Tất cả các kho</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.warehouse_name}</option>)}
                        </select>
                    </div>
                )}
                <div>
                   <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Xem từ ngày</div>
                   <DatePicker 
                        value={filters.dates[0]} 
                        onChange={d => handleFilterChange('dates', [d, filters.dates[1]])}
                        format="DD/MM/YYYY"
                   />
                </div>
                <div>
                   <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>Xem đến ngày</div>
                   <DatePicker 
                        value={filters.dates[1]} 
                        onChange={d => handleFilterChange('dates', [filters.dates[0], d])}
                        format="DD/MM/YYYY"
                   />
                </div>
                <Button 
                    type="primary" 
                    icon={<Search size={18} />} 
                    size="large" 
                    onClick={() => fetchData()}
                >
                    Tra cứu
                </Button>
             </div>
          </Col>
        </Row>

      </Card>

      <Card className="glass-card table-card" bodyStyle={{ padding: 0 }}>
        <div style={{ padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
            <Text strong>Danh sách chi tiết xe bán lẻ từ ngày {filters.dates[0].format('DD/MM/YYYY')} đến ngày {filters.dates[1].format('DD/MM/YYYY')}</Text>
        </div>
        <Table 
          dataSource={data} 
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 2000, y: 'calc(100vh - 450px)' }}
          size="small"
        />
        
        {/* Footer Summary Container */}
        <div style={{ padding: 20, background: 'rgba(59, 130, 246, 0.05)', borderTop: '1px solid var(--border-color)' }}>
            <Row gutter={16} justify="center">
                <Col span={6}>
                    <Statistic 
                        title="Tổng số xe bán (Cái)" 
                        value={summary.total_count} 
                        valueStyle={{ color: 'white', textAlign: 'center' }}
                    />
                </Col>
                <Col span={6}>
                    <Statistic 
                        title="Doanh thu (đ)" 
                        value={summary.total_revenue} 
                        valueStyle={{ color: 'white', textAlign: 'center' }}
                    />
                </Col>
                <Col span={6}>
                    <Statistic 
                        title="Thực thu (đ)" 
                        value={summary.total_collected} 
                        valueStyle={{ color: '#10b981', textAlign: 'center' }}
                    />
                </Col>
                <Col span={6}>
                    <Statistic 
                        title="Tổng nợ (đ)" 
                        value={summary.total_debt} 
                        valueStyle={{ color: '#ef4444', textAlign: 'center' }}
                    />
                </Col>
            </Row>
        </div>
      </Card>

      <style>{`
        .custom-checkbox {
            color: white !important;
            font-size: 13px;
        }
        .ant-table-thead > tr > th {
            background: rgba(255,255,255,0.03) !important;
            color: rgba(255,255,255,0.5) !important;
            text-transform: uppercase;
            font-size: 11px !important;
            letter-spacing: 0.5px;
        }
        .ant-table-cell {
            border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
      `}</style>
    </div>
  );
};

export default RetailSaleReportPage;
