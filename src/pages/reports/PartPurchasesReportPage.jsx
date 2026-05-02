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
  Modal,
  message,
  Tabs
} from 'antd';
import { 
  Search, 
  Download, 
  Calendar,
  Filter,
  FileText,
  LayoutList,
  BarChart3,
  Printer
} from 'lucide-react';
import PrintPartPurchase from '../../components/PrintPartPurchase';
import { printReceipt } from '../../utils/printHelper';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PartPurchasesReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [summaryData, setSummaryData] = useState([]);
  const [activeTab, setActiveTab] = useState('1'); // '1' is Log, '2' is Summary
  const [filters, setFilters] = useState({
    from_date: dayjs().startOf('month').format('YYYY-MM-DD'),
    to_date: dayjs().format('YYYY-MM-DD'),
    warehouse_id: undefined,
    supplier_id: undefined,
    query: ''
  });
  
  const [options, setOptions] = useState({ warehouses: [], suppliers: [] });

  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const isManager = user.role === 'MANAGER';
  const isPowerUser = isAdmin || isManager;
  const allowedWarehouseIds = [user.warehouse_id, ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])].filter(Boolean);

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
        warehouses: isPowerUser ? wRes.data : wRes.data.filter(w => allowedWarehouseIds.includes(w.id.toString())),
        suppliers: sRes.data
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        api.get('/reports/parts/purchases', { params: currentFilters }),
        api.get('/reports/parts/purchases-summary', { params: currentFilters })
      ]);
      setPurchases(pRes.data);
      setSummaryData(sRes.data);
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
    if (activeTab === '1') {
        if (!purchases || purchases.length === 0) return message.warning('Không có dữ liệu để xuất!');
        const exportData = [];
        purchases.forEach(p => {
            p.PartPurchaseItems?.forEach(item => {
                exportData.push({
                    'Ngày nhập': dayjs(p.purchase_date).format('DD/MM/YYYY'),
                    'Số hóa đơn': p.invoice_no,
                    'Nhà cung cấp': p.Supplier?.name || 'N/A',
                    'Kho': p.Warehouse?.warehouse_name || 'N/A',
                    'Mã phụ tùng': item.Part?.code,
                    'Tên phụ tùng': item.Part?.name,
                    'Đơn vị': item.unit,
                    'Số lượng': Number(item.quantity),
                    'Đơn giá': Number(item.unit_price),
                    'Thành tiền': Number(item.total_price),
                });
            });
        });
        exportToExcel(exportData, `NhatKyNhapPhuTung_${dayjs().format('YYYYMMDD')}`);
    } else {
        if (!summaryData || summaryData.length === 0) return message.warning('Không có dữ liệu để xuất!');
        const exportData = summaryData.map(item => ({
            'Mã phụ tùng': item.code,
            'Tên phụ tùng': item.name,
            'Đơn vị': item.unit,
            'Tổng số lượng nhập': item.total_qty,
            'Tổng giá trị nhập': item.total_amount,
            'Số lần nhập': item.purchase_count
        }));
        exportToExcel(exportData, `TongHopNhapPhuTung_${dayjs().format('YYYYMMDD')}`);
    }
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
        render: (_, r) => (
            <Button 
                type="link" 
                icon={<FileText size={16} />} 
                onClick={() => {
                    setSelectedPurchase(r);
                    setIsModalOpen(true);
                    setItemSearch('');
                }}
            >
                {r.PartPurchaseItems?.length || 0} mặt hàng (Xem chi tiết)
            </Button>
        )
    },
    { 
        title: 'Tổng Tiền', 
        dataIndex: 'total_amount', 
        key: 'total', 
        align: 'right',
        render: v => <Text strong style={{ color: '#10b981' }}>{Number(v || 0).toLocaleString()} đ</Text>
    },
    { title: 'Kho', dataIndex: ['Warehouse', 'warehouse_name'], key: 'warehouse' },
    {
        title: 'Tác vụ',
        key: 'action',
        fixed: 'right',
        width: 80,
        render: (_, r) => (
            <Button 
                icon={<Printer size={16} />} 
                onClick={() => handlePrint(r)}
                title="In lại phiếu nhập"
            />
        )
    }
  ];

  const summaryColumns = [
    { title: 'Mã Phụ Tùng', dataIndex: 'code', key: 'code', fixed: 'left', width: 150 },
    { title: 'Tên Phụ Tùng', dataIndex: 'name', key: 'name', width: 250 },
    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit', align: 'center', width: 100 },
    { 
        title: 'Tổng Nhập', 
        dataIndex: 'total_qty', 
        key: 'total_qty', 
        align: 'right', 
        width: 120,
        render: v => <Text strong>{v.toLocaleString()}</Text>
    },
    { 
        title: 'Tổng Giá Trị', 
        dataIndex: 'total_amount', 
        key: 'total_amount', 
        align: 'right', 
        width: 150,
        render: v => <Text strong style={{ color: '#10b981' }}>{Number(v).toLocaleString()} đ</Text>
    },
    { 
        title: 'Số Lần Nhập', 
        dataIndex: 'purchase_count', 
        key: 'purchase_count', 
        align: 'center', 
        width: 120,
        render: v => <Tag color="blue">{v} lần</Tag>
    }
  ];

  const handlePrint = (purchase) => {
    setSelectedPurchase(purchase);
    setTimeout(() => {
        printReceipt('print-part-purchase-receipt');
    }, 300);
  };

  return (
    <div className="page-container">
      <div style={{ display: 'none' }}>
        <PrintPartPurchase 
          purchase={selectedPurchase} 
          items={selectedPurchase?.PartPurchaseItems} 
          warehouse={selectedPurchase?.Warehouse} 
        />
      </div>
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
              allowClear={false}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Kho nhập:</Text>
            <Select 
              allowClear={isPowerUser}
              disabled={!isPowerUser}
              style={{ width: '100%' }} 
              placeholder={isPowerUser ? "--- Tất cả các kho ---" : "Kho hiện tại"}
              size="large"
              value={filters.warehouse_id || (isPowerUser ? undefined : user.warehouse_id)}
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
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Button type="primary" size="large" block icon={<Search size={18} />} onClick={onSearch} loading={loading}>
              Lọc dữ liệu
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="glass-card" styles={{ body: { padding: '10px 24px 24px' } }}>
        <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={[
                {
                    key: '1',
                    label: <Space><LayoutList size={16} />Nhật ký hóa đơn</Space>,
                    children: (
                        <Table 
                            dataSource={purchases} 
                            columns={columns} 
                            rowKey="id" 
                            loading={loading}
                            pagination={{ pageSize: 15 }}
                            scroll={{ x: 'max-content' }}
                        />
                    )
                },
                {
                    key: '2',
                    label: <Space><BarChart3 size={16} />Tổng hợp theo mã PT</Space>,
                    children: (
                        <Table 
                            dataSource={summaryData} 
                            columns={summaryColumns} 
                            rowKey="code" 
                            loading={loading}
                            pagination={{ pageSize: 20 }}
                            scroll={{ x: 'max-content' }}
                        />
                    )
                }
            ]}
        />
      </Card>

      <Modal
        title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '95%' }}>
                <Title level={4} style={{ margin: 0 }}>CHI TIẾT HÓA ĐƠN: {selectedPurchase?.invoice_no}</Title>
                <Input 
                    placeholder="Tìm mã hoặc tên trong hóa đơn..." 
                    style={{ width: 300 }} 
                    prefix={<Search size={16} />}
                    allowClear
                    onChange={e => setItemSearch(e.target.value)}
                />
            </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={1000}
        footer={[
            <Button key="close" onClick={() => setIsModalOpen(false)}>Đóng</Button>,
            <Button key="print" type="primary" icon={<Printer size={16} />} onClick={() => handlePrint(selectedPurchase)}>In phiếu nhập</Button>
        ]}
        destroyOnClose
      >
        {selectedPurchase && (
            <Table 
                dataSource={selectedPurchase.PartPurchaseItems?.filter(i => 
                    !itemSearch || 
                    i.Part?.code?.toLowerCase().includes(itemSearch.toLowerCase()) ||
                    i.Part?.name?.toLowerCase().includes(itemSearch.toLowerCase())
                )}
                pagination={{ pageSize: 10 }}
                rowKey="id"
                columns={[
                    { title: 'STT', key: 'stt', width: 60, render: (_, __, i) => i + 1 },
                    { title: 'Mã phụ tùng', dataIndex: ['Part', 'code'], key: 'code', render: v => <Text strong>{v}</Text> },
                    { title: 'Tên phụ tùng', dataIndex: ['Part', 'name'], key: 'name' },
                    { title: 'Số lượng', dataIndex: 'quantity', key: 'qty', align: 'right', render: (v, r) => <Text strong>{v} {r.unit}</Text> },
                    { title: 'Đơn giá (DNP)', dataIndex: 'unit_price', key: 'price', align: 'right', render: v => Number(v).toLocaleString() },
                    { title: 'Thành tiền', dataIndex: 'total_price', key: 'total', align: 'right', render: v => <Text strong>{Number(v).toLocaleString()} đ</Text> }
                ]}
            />
        )}
      </Modal>
    </div>
  );
};

export default PartPurchasesReportPage;
