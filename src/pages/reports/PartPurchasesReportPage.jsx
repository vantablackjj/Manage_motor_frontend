import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Row, 
  Col, 
  Select, 
  Space, 
  Typography, 
  Button, 
  Tag,
  Input,
  DatePicker,
  message
} from 'antd';
import { 
  Search, 
  Download, 
  Calendar,
  Filter,
  FileText
} from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PartPurchasesReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [filters, setFilters] = useState({
    from_date: dayjs().startOf('month').format('YYYY-MM-DD'),
    to_date: dayjs().format('YYYY-MM-DD'),
    warehouse_id: undefined,
    supplier_id: undefined,
    query: ''
  });
  
  const [options, setOptions] = useState({ warehouses: [], suppliers: [] });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    fetchOptions();
    fetchReport();
  }, []);

  const fetchOptions = async () => {
    try {
      const [wRes, sRes] = await Promise.all([
        api.get('/warehouses'),
        api.get('/suppliers')
      ]);
      setOptions({
        warehouses: wRes.data,
        suppliers: sRes.data
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const response = await api.get('/reports/parts/purchases', { params: currentFilters });
      setPurchases(response.data);
    } catch (error) {
      message.error('Không thể tải báo cáo nhập phụ tùng');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const onSearch = () => {
    fetchReport();
  };

  const handleExport = () => {
    if (!purchases || purchases.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = [];
    purchases.forEach(p => {
        p.PartPurchaseItems?.forEach(item => {
            exportData.push({
                'Ngày nhập': dayjs(p.purchase_date).format('DD/MM/YYYY'),
                'Số PO': p.po_number,
                'Số hóa đơn': p.invoice_no,
                'Nhà cung cấp': p.Supplier?.name || 'N/A',
                'Kho': p.Warehouse?.warehouse_name || 'N/A',
                'Mã phụ tùng': item.Part?.code,
                'Tên phụ tùng': item.Part?.name,
                'Đơn vị': item.unit,
                'Số lượng': Number(item.quantity),
                'Đơn giá (DNP)': Number(item.unit_price),
                'Thành tiền (Chưa VAT)': Number(item.total_price),
                'VAT (%)': p.vat_percent || 0,
                'Người tạo': p.creator?.full_name || 'N/A'
            });
        });
    });

    exportToExcel(exportData, `BaoCaoNhapPhuTung_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const columns = [
    { 
        title: 'Ngày Nhập', 
        dataIndex: 'purchase_date', 
        key: 'date', 
        render: v => dayjs(v).format('DD/MM/YYYY') 
    },
    { title: 'Hóa Đơn / PO', key: 'invoice', render: (_, r) => (
        <Space direction="vertical" size={0}>
            <Text strong>{r.invoice_no}</Text>
            {r.po_number && <Text type="secondary" style={{ fontSize: 11 }}>PO: {r.po_number}</Text>}
        </Space>
    )},
    { title: 'Nhà Cung Cấp', dataIndex: ['Supplier', 'name'], key: 'supplier' },
    { 
        title: 'Chi Tiết Linh Kiện', 
        key: 'items', 
        width: 400,
        render: (_, r) => (
            <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                {r.PartPurchaseItems?.map((item, idx) => (
                    <div key={idx} style={{ padding: '4px 0', borderBottom: idx < r.PartPurchaseItems.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Text size="small"><Text strong>{item.Part?.code}</Text> - {item.Part?.name}</Text>
                            <Text type="secondary">{Number(item.quantity).toLocaleString()} {item.unit}</Text>
                        </Space>
                    </div>
                ))}
            </div>
        )
    },
    { 
        title: 'Tổng Tiền', 
        dataIndex: 'total_amount', 
        key: 'total', 
        align: 'right',
        render: v => <Text strong color="#10b981">{Number(v || 0).toLocaleString()} đ</Text>
    },
    { title: 'Kho', dataIndex: ['Warehouse', 'warehouse_name'], key: 'warehouse' }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="gradient-text">BÁO CÁO NHẬP HÀNG PHỤ TÙNG</Title>
        <Space>
          <Button 
            icon={<Download size={18} />} 
            type="primary" 
            ghost
            onClick={handleExport}
          >
            Xuất Excel
          </Button>
        </Space>
      </div>

      <Card className="glass-card" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Khoảng thời gian:</Text>
            <RangePicker 
              style={{ width: '100%' }} 
              size="large"
              defaultValue={[dayjs().startOf('month'), dayjs()]}
              onChange={(dates) => {
                if (dates) {
                  handleFilterChange('from_date', dates[0].format('YYYY-MM-DD'));
                  handleFilterChange('to_date', dates[1].format('YYYY-MM-DD'));
                }
              }}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Kho nhập:</Text>
            <Select 
              allowClear 
              style={{ width: '100%' }} 
              placeholder="--- Tất cả các kho ---" 
              size="large"
              defaultValue={isAdmin ? undefined : user.warehouse_id}
              onChange={v => handleFilterChange('warehouse_id', v)}
            >
              {options.warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Nhà cung cấp:</Text>
            <Select 
              allowClear 
              showSearch
              style={{ width: '100%' }} 
              placeholder="--- Tất cả NCC ---" 
              size="large"
              onChange={v => handleFilterChange('supplier_id', v)}
            >
              {options.suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={18}>
            <Input 
              placeholder="Tìm theo Mã phụ tùng, Tên phụ tùng, Số hóa đơn..." 
              size="large"
              prefix={<Search size={18} style={{ opacity: 0.5 }} />}
              value={filters.query}
              onChange={e => handleFilterChange('query', e.target.value)}
              onPressEnter={onSearch}
            />
          </Col>
          <Col xs={24} md={6}>
            <Button type="primary" size="large" block icon={<Search size={18} />} onClick={onSearch}>
              Lọc dữ liệu
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="glass-card">
        <Table 
          dataSource={purchases} 
          columns={columns} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 15 }}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default PartPurchasesReportPage;
