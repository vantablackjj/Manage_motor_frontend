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

  const handleDisbursementChange = async (saleId, status) => {
    try {
      setLoading(true);
      await api.put(`/retail-sales/${saleId}/disbursement`, { is_disbursed: status });
      message.success(status ? 'Đã xác nhận giải ngân!' : 'Đã hủy xác nhận giải ngân!');
      fetchData();
    } catch (e) {
      message.error(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
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
      width: 130,
      render: (_, r) => {
        const collected = Number(r.paid_amount) + (r.is_disbursed ? Number(r.loan_amount || 0) : 0);
        return <Text style={{ color: '#10b981' }}>{collected.toLocaleString()} đ</Text>
      }
    },
    { 
      title: 'Còn nợ', 
      width: 130,
      render: (_, r) => {
        const debt = Number(r.total_price) - Number(r.paid_amount) - (r.is_disbursed ? Number(r.loan_amount || 0) : 0);
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
    },
    {
      title: 'Giải ngân (Ngân hàng)',
      width: 180,
      fixed: 'right',
      render: (_, r) => {
        if (r.payment_method !== 'Trả góp') return <Text type="secondary">-</Text>;
        
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const canSettle = user.role === 'ADMIN' || user.can_manage_money;

        return (
          <Space direction="vertical" size={0}>
              <Checkbox 
                checked={r.is_disbursed} 
                disabled={!canSettle || (r.is_disbursed && user.role !== 'ADMIN')}
                onChange={e => handleDisbursementChange(r.id, e.target.checked)}
              >
                {r.is_disbursed ? 'Đã giải ngân' : 'Chờ giải ngân'}
              </Checkbox>
              {r.is_disbursed && r.disbursed_at && (
                <Text style={{ fontSize: 10, opacity: 0.6 }}>
                  Ngày: {dayjs(r.disbursed_at).format('DD/MM/YYYY')}
                </Text>
              )}
          </Space>
        );
      }
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
      'Đã trả': Number(s.paid_amount) + (s.is_disbursed ? Number(s.loan_amount || 0) : 0),
      'Còn nợ': Number(s.total_price) - Number(s.paid_amount) - (s.is_disbursed ? Number(s.loan_amount || 0) : 0),
      'Kiểu bán': s.sale_type,
      'Bảo hành': s.guarantee,
      'Giải ngân NH': s.payment_method === 'Trả góp' ? (s.is_disbursed ? `Đã giải ngân (${dayjs(s.disbursed_at).format('DD/MM/YYYY')})` : 'Chờ giải ngân') : '-'
    }));

    exportToExcel(exportData, `BaoCaoBanLe_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const handlePrint = () => {
    if (!data || data.length === 0) {
        return message.warning('Không có dữ liệu để in!');
    }

    const fromDate = filters.dates[0].format('DD/MM/YYYY');
    const toDate = filters.dates[1].format('DD/MM/YYYY');
    const warehouseName = filters.warehouse_id ? warehouses.find(w => w.id === filters.warehouse_id)?.warehouse_name : 'Tất cả các kho';

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Báo cáo bán lẻ</title>
    <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.4; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
        .company-name { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
        .report-title { font-size: 22pt; font-weight: bold; margin: 15px 0; color: #000; }
        .report-subtitle { font-size: 12pt; font-style: italic; }
        .summary-box { display: flex; justify-content: space-around; margin-bottom: 25px; background: #f9f9f9; padding: 15px; border: 1px solid #ddd; }
        .summary-item { text-align: center; }
        .summary-label { font-size: 10pt; color: #666; margin-bottom: 5px; }
        .summary-value { font-size: 13pt; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 9pt; }
        th, td { border: 1px solid #000; padding: 6px; text-align: left; }
        th { background-color: #eee; font-weight: bold; text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; text-align: center; }
        .signature-box { width: 250px; }
        .signature-title { font-weight: bold; margin-bottom: 60px; }
        @media print {
            @page { margin: 15mm; size: A4 landscape; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">HỆ THỐNG CỬA HÀNG XE MÁY THANH HẢI</div>
        <div class="report-title">BÁO CÁO CHI TIẾT DOANH THU BÁN LẺ</div>
        <div class="report-subtitle">Từ ngày ${fromDate} đến ngày ${toDate} | Kho: ${warehouseName}</div>
    </div>

    <div class="summary-box">
        <div class="summary-item">
            <div class="summary-label">TỔNG SỐ LƯỢNG</div>
            <div class="summary-value">${summary.total_count} chiếc</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">TỔNG DOANH THU</div>
            <div class="summary-value">${summary.total_revenue.toLocaleString()} đ</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">THỰC THU</div>
            <div class="summary-value" style="color: #10b981;">${summary.total_collected.toLocaleString()} đ</div>
        </div>
        <div class="summary-item">
            <div class="summary-label">CÒN NỢ</div>
            <div class="summary-value" style="color: #ef4444;">${summary.total_debt.toLocaleString()} đ</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 40px;">STT</th>
                <th style="width: 80px;">Ngày</th>
                <th>Khách hàng</th>
                <th>SĐT</th>
                <th>Loại xe</th>
                <th>Số máy</th>
                <th>Số khung</th>
                <th>Giá bán</th>
                <th>Đã trả</th>
                <th>Còn nợ</th>
                <th>Kiểu bán</th>
            </tr>
        </thead>
        <tbody>
            ${data.map((s, index) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center">${dayjs(s.sale_date).format('DD/MM/YYYY')}</td>
                    <td>${s.customer_name}</td>
                    <td>${s.phone || '-'}</td>
                    <td>${s.Vehicle?.VehicleType?.name || 'N/A'}</td>
                    <td>${s.engine_no}</td>
                    <td>${s.chassis_no}</td>
                    <td class="text-right">${Number(s.total_price).toLocaleString()}</td>
                    <td class="text-right">${(Number(s.paid_amount) + (s.is_disbursed ? Number(s.loan_amount || 0) : 0)).toLocaleString()}</td>
                    <td class="text-right">${(Number(s.total_price) - Number(s.paid_amount) - (s.is_disbursed ? Number(s.loan_amount || 0) : 0)).toLocaleString()}</td>
                    <td class="text-center">${s.sale_type}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">
        <div class="signature-box">
            <div class="signature-title">Người lập biểu</div>
            <div>(Ký và ghi rõ họ tên)</div>
        </div>
        <div class="signature-box">
            <div class="signature-title">Kế toán trưởng</div>
            <div>(Ký và ghi rõ họ tên)</div>
        </div>
        <div class="signature-box">
            <div>Ngày ....... tháng ....... năm .......</div>
            <div class="signature-title">Giám đốc</div>
            <div>(Ký tên và đóng dấu)</div>
        </div>
    </div>

    <script>
        window.onload = function() { window.print(); };
        window.onafterprint = function() { window.close(); };
    </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    } else {
        message.warning('Vui lòng cho phép pop-up để in báo cáo.');
    }
  };

  return (
    <div style={{ padding: '0 5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>XEM THÔNG TIN VỀ XE BÁN LẺ</Title>
        <Space>
           <Button icon={<Printer size={16} />} onClick={handlePrint} type="dashed">In báo cáo</Button>
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
