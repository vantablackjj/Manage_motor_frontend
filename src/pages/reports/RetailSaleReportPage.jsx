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
  Divider,
  Input,
  Tooltip,
  Modal,
  Form,
  InputNumber,
  Popconfirm,
  Select
} from 'antd';
const { Option } = Select;
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
  DollarSign,
  Box,
  CheckCircle2,
  ShoppingCart,
  Info,
  Truck,
  AlertCircle,
  History,
  Banknote,
  Trash2,
  RotateCcw,
  Save,
  Gift,
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
  
  // Payment Modal States
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentForm] = Form.useForm();
  const [paymentLoading, setPaymentLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const canManageMoney = isAdmin || user.can_manage_money === true || user.can_manage_money === 1;
  const canDelete = isAdmin || user.can_delete === true || user.can_delete === 1;

  const [filters, setFilters] = useState({
    dates: [dayjs().subtract(1, 'month'), dayjs()],
    hasDebt: false,
    warehouse_id: urlWarehouseId || undefined
  });
  
  const [searchTerm, setSearchTerm] = useState('');

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
      
      // Sắp xếp dữ liệu ngay khi nhận từ API: Mới nhất lên đầu
      const sortedSales = [...res.data.sales].sort((a, b) => dayjs(b.sale_date).unix() - dayjs(a.sale_date).unix());
      
      setData(sortedSales);
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

  // --- PAYMENT LOGIC ---
  const handleOpenPaymentModal = async (sale) => {
    try {
      setSelectedSale(sale);
      const res = await api.get(`/retail-sales/${sale.id}/payments`);
      setPaymentHistory(res.data);
      setPaymentModalVisible(true);
      
      const price = Number(sale.total_price || 0);
      const paid = Number(sale.paid_amount || 0);
      const loan = (sale.is_disbursed) ? Number(sale.loan_amount || 0) : 0;
      
      paymentForm.setFieldsValue({
        payment_date: dayjs(),
        amount: Math.max(0, price - paid - loan),
        payment_method: 'Tiền mặt'
      });
    } catch (error) {
      message.error("Không thể tải lịch sử trả tiền: " + error.message);
    }
  };

  const onAddPayment = async (values) => {
    try {
      setPaymentLoading(true);
      await api.post("/retail-payments", {
        ...values,
        retail_sale_id: selectedSale.id,
        payment_date: values.payment_date.format('YYYY-MM-DD'),
      });
      message.success("Đã thêm khoản thanh toán!");
      paymentForm.resetFields(["amount", "notes"]);

      // Refresh local data
      const res = await api.get(`/retail-sales/${selectedSale.id}/payments`);
      setPaymentHistory(res.data);
      fetchData(); // Refresh main report table to update Debt numbers
    } catch (error) {
      message.error("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePayment = async (id) => {
    try {
      await api.delete(`/retail-payments/${id}`);
      message.success("Đã xóa khoản thanh toán");
      const res = await api.get(`/retail-sales/${selectedSale.id}/payments`);
      setPaymentHistory(res.data);
      fetchData();
    } catch (error) {
      message.error("Lỗi: " + error.message);
    }
  };

  const toggleGuaranteeBook = async (id, currentStatus) => {
    try {
        await api.put(`/retail-sales/${id}/guarantee-book`, {
            guarantee_book_issued: !currentStatus
        });
        message.success(!currentStatus ? 'Đã xác nhận cấp sổ!' : 'Đã hủy xác nhận cấp sổ!');
        fetchData();
    } catch (e) {
        message.error('Lỗi khi cập nhật trạng thái sổ: ' + e.message);
    }
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
      sorter: (a, b) => dayjs(a.sale_date).unix() - dayjs(b.sale_date).unix(),
      render: (d, r) => {
        const purchaseDate = r.Vehicle?.Purchase?.purchase_date;
        const hasError = purchaseDate && dayjs(purchaseDate).isAfter(dayjs(d));
        return (
          <Space>
            {dayjs(d).format('DD/MM/YYYY')}
            {hasError && (
              <Tooltip title={`Lỗi logic: Ngày nhập (${dayjs(purchaseDate).format('DD/MM/YYYY')}) sau ngày bán!`}>
                <AlertCircle size={14} color="#ef4444" />
              </Tooltip>
            )}
          </Space>
        );
      }
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
      title: 'Quà tặng',
      width: 150,
      render: (_, r) => (
        <Space size={[0, 4]} wrap>
          {r.gifts && Array.isArray(r.gifts) && r.gifts.map(g => (
            <Tag color="cyan" key={g} style={{ fontSize: 10 }}>{g}</Tag>
          ))}
        </Space>
      )
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
      title: 'Sổ bảo hành',
      width: 130,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
            <Checkbox 
                checked={r.guarantee_book_issued}
                onChange={() => toggleGuaranteeBook(r.id, r.guarantee_book_issued)}
            >
                {r.guarantee_book_issued ? 'Đã cấp' : 'Chưa'}
            </Checkbox>
            {r.guarantee_book_issued && r.guarantee_book_issued_at && (
                <Text style={{ fontSize: 10, opacity: 0.6 }}>
                    {dayjs(r.guarantee_book_issued_at).format('DD/MM/YYYY')}
                </Text>
            )}
        </Space>
      )
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
              {r.bank_name && <Text strong style={{ fontSize: 11, color: '#3b82f6' }}>{r.bank_name}</Text>}
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
    },
    {
        title: 'Tác vụ',
        width: 100,
        fixed: 'right',
        render: (_, r) => (
          <Space>
             {canManageMoney && (
                <Button 
                    type="text" 
                    icon={<Banknote size={18} />} 
                    onClick={() => handleOpenPaymentModal(r)}
                    title="Lịch sử & Thu tiền"
                    style={{ color: '#10b981' }}
                />
             )}
             <Button 
                type="text" 
                icon={<Printer size={16} />} 
                onClick={() => {
                   // Reuse print logic from RetailSalePage if needed, 
                   // but here we might just want to trigger a print of the report row?
                   // For now, let's keep it consistent.
                }}
                disabled
                title="Sắp có"
             />
          </Space>
        )
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

    const fromDate = filters.dates[0]?.format('DD/MM/YYYY') || '...';
    const toDate = filters.dates[1]?.format('DD/MM/YYYY') || '...';
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

  const filteredData = data.filter(s => {
    const term = searchTerm.toLowerCase();
    return (s.customer_name || '').toLowerCase().includes(term) || 
           (s.engine_no || '').toLowerCase().includes(term) || 
           (s.chassis_no || '').toLowerCase().includes(term) ||
           (s.phone || '').includes(term);
  });

  const stats = {
      total: filteredData.length,
      sold: filteredData.length,
      registration: filteredData.filter(v => v.sale_type === 'Đăng ký').length
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

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <Statistic 
              title={<Space><Box size={14} /> Tổng số xe bán</Space>}
              value={stats.total} 
              prefix={<Search size={20} color="#3b82f6" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
            <Statistic 
              title={<Space><CheckCircle2 size={14} /> Xe làm đăng ký</Space>}
              value={stats.registration} 
              valueStyle={{ color: '#10b981' }}
              prefix={<ShieldCheck size={20} color="#10b981" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <Statistic 
              title={<Space><ShoppingCart size={14} /> Xe bán hồ sơ</Space>}
              value={stats.total - stats.registration} 
              valueStyle={{ color: '#f59e0b' }}
              prefix={<ShoppingCart size={20} color="#f59e0b" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card" style={{ borderLeft: '4px solid #ec4899' }}>
            <Statistic 
              title={<Space><DollarSign size={14} /> Thực thu hiện tại</Space>}
              value={summary.total_collected}
              formatter={v => `${Number(v).toLocaleString()} đ`}
              valueStyle={{ color: '#ec4899', fontSize: 16 }}
              prefix={<DollarSign size={20} color="#ec4899" />}
            />
          </Card>
        </Col>
      </Row>
      
      {summary.total_gifts && (
        <Card size="small" className="glass-card" style={{ marginBottom: 20 }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', marginBottom: 12 }}>
            <Space><Gift size={16} color="var(--primary-color)" /> <Text strong>SỐ QUÀ KM ĐÃ XUẤT</Text></Space>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr>
                  {["Mũ bảo hiểm", "Áo mưa", "Phiếu thay dầu", "Thẻ bảo dưỡng xe cũ", "Bảo hiểm đi đường"].map(h => (
                    <th key={h} style={{ padding: '8px', border: '1px solid #f0f0f0', background: '#fafafa', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {["Mũ bảo hiểm", "Áo mưa", "Phiếu thay dầu", "Thẻ bảo dưỡng xe cũ", "Bảo hiểm đi đường"].map(h => (
                    <td key={h} style={{ padding: '12px', border: '1px solid #f0f0f0', fontSize: 16, fontWeight: 'bold', color: 'var(--primary-color)' }}>
                      {summary.total_gifts[h] || 0}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

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
                        <div style={{ fontSize: 9, color: '#64748b', marginTop: 4, fontWeight: 'bold' }}>KHO</div>
                        <select 
                            style={{ 
                                width: '100%', 
                                padding: '8px', 
                                background: '#f8fafc', 
                                border: '1px solid #cbd5e1',
                                color: '#0f172a',
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
                   <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4, fontWeight: 'bold' }}>XEM TỪ NGÀY</div>
                   <DatePicker 
                        value={filters.dates[0]} 
                        onChange={d => handleFilterChange('dates', [d, filters.dates[1]])}
                        format="DD/MM/YYYY"
                   />
                </div>
                <div>
                   <div style={{ fontSize: 9, color: '#64748b', marginBottom: 4, fontWeight: 'bold' }}>XEM ĐẾN NGÀY</div>
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
        <div style={{ padding: '8px 24px', background: '#f8fafc', borderBottom: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <Text strong style={{ color: '#0f172a' }}>Danh sách chi tiết xe bán lẻ từ ngày {filters.dates[0]?.format('DD/MM/YYYY') || '...'} đến ngày {filters.dates[1]?.format('DD/MM/YYYY') || '...'}</Text>
            <Input 
              placeholder="Tìm nhanh Số máy, Số khung, Khách hàng..." 
              prefix={<Search size={16} />} 
              style={{ width: 300 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              allowClear
              size="small"
            />
        </div>
        <Table 
          dataSource={filteredData} 
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 2000, y: 'calc(100vh - 450px)' }}
          size="small"
        />
        
        {/* Footer Summary Container */}
        <div style={{ padding: 20, background: '#f1f5f9', borderTop: '1px solid #cbd5e1' }}>
            <Row gutter={16} justify="center">
                <Col span={6}>
                    <Statistic 
                        title="Tổng số xe bán (Cái)" 
                        value={summary.total_count} 
                        valueStyle={{ color: '#000000', textAlign: 'center', fontWeight: 'bold' }}
                    />
                </Col>
                <Col span={6}>
                    <Statistic 
                        title="Doanh thu (đ)" 
                        value={summary.total_revenue} 
                        valueStyle={{ color: '#000000', textAlign: 'center', fontWeight: 'bold' }}
                    />
                </Col>
                <Col span={6}>
                    <Statistic 
                        title="Thực thu (đ)" 
                        value={summary.total_collected} 
                        valueStyle={{ color: '#10b981', textAlign: 'center', fontWeight: 'bold' }}
                    />
                </Col>
                <Col span={6}>
                    <Statistic 
                        title="Tổng nợ (đ)" 
                        value={summary.total_debt} 
                        valueStyle={{ color: '#ef4444', textAlign: 'center', fontWeight: 'bold' }}
                    />
                </Col>
            </Row>
            </div>
      </Card>

      {/* MODAL THU TIỀN TRẢ GÓP / NỢ */}
      <Modal
        title={
          <Space>
            <History size={18} /> Lịch sử & Thu tiền: {selectedSale?.customer_name}
          </Space>
        }
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={700}
        className="glass-modal"
      >
        {selectedSale && (
          <div style={{ marginBottom: 20 }}>
             <Row gutter={16}>
                <Col span={12}>
                    <Card size="small" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>Tổng giá bán:</div>
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--primary-color)' }}>{Number(selectedSale.total_price).toLocaleString()} đ</div>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card size="small" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'right' }}>Còn nợ lại:</div>
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ef4444', textAlign: 'right' }}>
                            {(Number(selectedSale.total_price) - Number(selectedSale.paid_amount) - (selectedSale.is_disbursed ? Number(selectedSale.loan_amount || 0) : 0)).toLocaleString()} đ
                        </div>
                    </Card>
                </Col>
             </Row>

             <Divider orientation="left" plain><span style={{ fontSize: 12, opacity: 0.7, fontWeight: 'bold' }}>THÊM KHOẢN THU (KHÁCH TRẢ THÊM)</span></Divider>

             <Form form={paymentForm} layout="vertical" onFinish={onAddPayment}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label="Ngày thu" name="payment_date" rules={[{required: true}]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="Số tiền thu" name="amount" rules={[{required: true}]}>
                            <InputNumber 
                                style={{ width: '100%' }} 
                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={v => v.replace(/\$\s?|(,*)/g, '')}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="Hình thức" name="payment_method">
                            <Select>
                                <Option value="Tiền mặt">Tiền mặt</Option>
                                <Option value="Chuyển khoản">Chuyển khoản</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label="Ghi chú (Ví dụ: Trả nợ đăng ký, Trả góp đợt 1...)" name="notes">
                    <Input placeholder="Nhập ghi chú..." />
                </Form.Item>
                <Button type="primary" icon={<Save size={16} />} block htmlType="submit" loading={paymentLoading}>
                    XÁC NHẬN THU TIỀN
                </Button>
             </Form>

             <Divider orientation="left" plain><span style={{ fontSize: 12, opacity: 0.7, fontWeight: 'bold' }}>CHI TIẾT CÁC LẦN TRẢ TIỀN</span></Divider>
             
             <Table 
                dataSource={paymentHistory}
                pagination={false}
                size="small"
                rowKey="id"
                columns={[
                    { title: 'NGÀY', dataIndex: 'payment_date', render: d => dayjs(d).format('DD/MM/YYYY') },
                    { title: 'SỐ TIỀN', dataIndex: 'amount', render: v => <Text strong color="green">{Number(v).toLocaleString()} đ</Text> },
                    { title: 'HÌNH THỨC', dataIndex: 'payment_method' },
                    { title: 'GHI CHÚ', dataIndex: 'notes' },
                    { 
                        title: '', 
                        render: (_, record) => (
                            <Popconfirm title="Xóa khoản thu này?" onConfirm={() => handleDeletePayment(record.id)}>
                                <Button type="text" danger icon={<Trash2 size={14} />} size="small" />
                            </Popconfirm>
                        ) 
                    }
                ]}
             />
          </div>
        )}
      </Modal>

      <style>{`
        .custom-checkbox {
            color: #0f172a !important;
            font-size: 13px;
        }
        .ant-table-thead > tr > th {
            background: #f1f5fb !important;
            color: #0f172a !important;
            text-transform: uppercase;
            font-size: 11px !important;
            letter-spacing: 0.5px;
            font-weight: 700 !important;
        }
        .ant-table-cell {
            border-bottom: 1px solid #cbd5e1 !important;
        }
        .stat-card .ant-statistic-title {
            font-size: 11px !important;
            margin-bottom: 4px !important;
            color: #475569;
            font-weight: 700;
        }
        .stat-card .ant-statistic-content-value {
            font-size: 20px !important;
            font-weight: 800 !important;
        }
        .stat-card {
            background: #ffffff !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 12px;
        }
      `}</style>
    </div>
  );
};

export default RetailSaleReportPage;
