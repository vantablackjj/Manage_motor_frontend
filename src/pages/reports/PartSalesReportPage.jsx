import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Typography, Row, Col, DatePicker, 
  Select, Button, Space, message, Input, Tag, Modal
} from 'antd';
import { Search, Printer, Download, LayoutList, Eye } from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { exportToExcel } from '../../utils/excelExport';
import PrintPartSale from '../../components/PrintPartSale';
import { printReceipt } from '../../utils/printHelper';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PartSalesReportPage = () => {
    const [loading, setLoading] = useState(false);
    const [sales, setSales] = useState([]);
    const [filters, setFilters] = useState({
        from_date: dayjs().startOf('month').format('YYYY-MM-DD'),
        to_date: dayjs().format('YYYY-MM-DD'),
        warehouse_id: undefined,
        query: ''
    });
    const [warehouses, setWarehouses] = useState([]);
    const [selectedSaleForPrint, setSelectedSaleForPrint] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isPowerUser = user.role === 'ADMIN' || user.role === 'MANAGER';
    const allowedWarehouseIds = [user.warehouse_id, ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])].filter(Boolean);

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/warehouses');
            if (isPowerUser) {
                setWarehouses(res.data);
            } else {
                setWarehouses(res.data.filter(w => allowedWarehouseIds.includes(w.id.toString())));
            }
        } catch (e) { console.error(e); }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/parts/sales', { params: filters });
            setSales(res.data);
        } catch (e) {
            message.error('Lỗi tải báo cáo: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
        fetchReport();
    }, []);

    const handlePrint = (sale) => {
        // Aggressively search for full warehouse details in the loaded warehouses list
        // to ensure address and phone number are present
        const fullWh = warehouses.find(w => w.id === sale.warehouse_id);
        const enrichedSale = fullWh ? { ...sale, Warehouse: fullWh } : sale;
        
        setSelectedSaleForPrint(enrichedSale);
        // Timeout to ensure component renders before printing
        setTimeout(() => {
            printReceipt('print-part-sale-receipt');
        }, 300);
    };

    const columns = [
        { 
            title: 'Ngày bán', 
            dataIndex: 'sale_date', 
            key: 'date',
            render: v => dayjs(v).format('DD/MM/YYYY HH:mm')
        },
        { 
            title: 'Khách hàng', 
            dataIndex: 'customer_name', 
            key: 'customer',
            render: (v, r) => (
                <div>
                    <div>{v || 'Khách vãng lai'}</div>
                    <div style={{ fontSize: '11px', opacity: 0.6 }}>{r.customer_phone}</div>
                </div>
            )
        },
        { 
            title: 'Kho xuất', 
            dataIndex: ['Warehouse', 'warehouse_name'], 
            key: 'warehouse' 
        },
        { 
            title: 'Số mặt hàng', 
            key: 'items',
            render: (_, r) => (
                <Button type="link" onClick={() => { setSelectedSaleForPrint(r); setIsDetailModalOpen(true); }}>
                    {r.PartSaleItems?.length || 0} mặt hàng
                </Button>
            )
        },
        { 
            title: 'Tổng cộng', 
            dataIndex: 'total_amount', 
            key: 'total',
            align: 'right',
            render: v => <Text strong style={{ color: '#10b981' }}>{Number(v).toLocaleString()} đ</Text>
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paid_amount',
            key: 'paid',
            align: 'right',
            render: (v, r) => {
                const total = Number(r.total_amount);
                const paid = Number(v || 0);
                if (paid >= total) return <Tag color="green">Đã thu đủ</Tag>;
                if (paid === 0) return <Tag color="red">Chưa thanh toán</Tag>;
                return <Tag color="orange">Còn nợ {(total - paid).toLocaleString()}</Tag>;
            }
        },
        {
            title: 'Tác vụ',
            key: 'action',
            width: 120,
            render: (_, r) => (
                <Space>
                    <Button 
                        icon={<Eye size={16} />} 
                        onClick={() => { setSelectedSaleForPrint(r); setIsDetailModalOpen(true); }}
                        title="Xem chi tiết"
                    />
                    <Button 
                        icon={<Printer size={16} />} 
                        onClick={() => handlePrint(r)}
                        type="primary"
                        ghost
                        title="In hóa đơn"
                    />
                </Space>
            )
        }
    ];

    const handleExport = () => {
        if (!sales || sales.length === 0) return message.warning('Không có dữ liệu để xuất!');
        const exportData = [];
        sales.forEach(sale => {
            (sale.PartSaleItems || []).forEach(item => {
                exportData.push({
                    'Ngày bán': dayjs(sale.sale_date).format('DD/MM/YYYY'),
                    'ID Đơn': sale.id,
                    'Khách hàng': sale.customer_name || 'Khách vãng lai',
                    'SĐT': sale.customer_phone,
                    'Kho xuất': sale.Warehouse?.warehouse_name,
                    'Mã phụ tùng': item.Part?.code,
                    'Tên phụ tùng': item.Part?.name,
                    'ĐVT': item.Part?.unit,
                    'Số lượng': item.quantity,
                    'Đơn giá': item.unit_price,
                    'Thành tiền': item.total_price,
                    'Tổng bill': sale.total_amount,
                    'Đã thanh toán': sale.paid_amount
                });
            });
        });
        exportToExcel(exportData, `NhatKyBanPhuTung_${dayjs().format('YYYYMMDD')}`);
    };

    return (
        <div className="page-container">
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} className="gradient-text" style={{ margin: 0 }}>NHẬT KÝ BÁN LẺ PHỤ TÙNG</Title>
                    <Text type="secondary">Xem lịch sử và in lại hóa đơn bán lẻ phụ tùng</Text>
                </div>
                <Button icon={<Download size={16} />} onClick={handleExport}>Xuất Excel</Button>
            </div>

            <Card className="glass-card" style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} md={8}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Khoảng thời gian:</Text>
                        <RangePicker 
                            style={{ width: '100%' }}
                            value={[dayjs(filters.from_date), dayjs(filters.to_date)]}
                            onChange={(dates) => setFilters(prev => ({ 
                                ...prev, 
                                from_date: dates[0].format('YYYY-MM-DD'),
                                to_date: dates[1].format('YYYY-MM-DD')
                            }))}
                            format="DD/MM/YYYY"
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Kho xuất:</Text>
                        <Select 
                            style={{ width: '100%' }}
                            placeholder={isPowerUser ? "Tất cả các kho" : "Kho hiện tại"}
                            allowClear={isPowerUser}
                            disabled={!isPowerUser}
                            value={filters.warehouse_id || (isPowerUser ? undefined : user.warehouse_id)}
                            onChange={v => setFilters(prev => ({ ...prev, warehouse_id: v }))}
                        >
                            {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Tìm kiếm:</Text>
                        <Input 
                            placeholder="Tên khách, SĐT, Mã PT..." 
                            value={filters.query}
                            onChange={e => setFilters(prev => ({ ...prev, query: e.target.value }))}
                            onPressEnter={fetchReport}
                            prefix={<Search size={16} style={{ opacity: 0.5 }} />}
                        />
                    </Col>
                    <Col xs={24} md={4}>
                        <Button type="primary" block icon={<Search size={16} />} onClick={fetchReport} loading={loading}>
                            Tìm kiếm
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Card className="glass-card" bodyStyle={{ padding: 0 }}>
                <Table 
                    dataSource={sales} 
                    columns={columns} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            {/* Hidden Print Component */}
            <div style={{ display: 'none' }}>
                <PrintPartSale 
                    sale={selectedSaleForPrint} 
                    items={selectedSaleForPrint?.PartSaleItems} 
                    warehouse={selectedSaleForPrint?.Warehouse}
                />
            </div>

            {/* Detail Modal */}
            <Modal
                title={`CHI TIẾT HÓA ĐƠN: ${selectedSaleForPrint?.id}`}
                open={isDetailModalOpen}
                onCancel={() => setIsDetailModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>,
                    <Button key="print" type="primary" icon={<Printer size={16} />} onClick={() => handlePrint(selectedSaleForPrint)}>In hóa đơn</Button>
                ]}
                width={800}
            >
                {selectedSaleForPrint && (
                    <Table 
                        dataSource={selectedSaleForPrint.PartSaleItems}
                        rowKey="id"
                        pagination={false}
                        columns={[
                            { title: 'STT', render: (_, __, i) => i + 1, width: 60 },
                            { title: 'Mã phụ tùng', dataIndex: ['Part', 'code'] },
                            { title: 'Tên phụ tùng', dataIndex: ['Part', 'name'] },
                            { title: 'ĐVT', dataIndex: ['Part', 'unit'] },
                            { title: 'SL', dataIndex: 'quantity', align: 'right' },
                            { title: 'Đơn giá', dataIndex: 'unit_price', align: 'right', render: v => Number(v).toLocaleString() },
                            { title: 'Thành tiền', dataIndex: 'total_price', align: 'right', render: v => <Text strong>{Number(v).toLocaleString()} đ</Text> }
                        ]}
                    />
                )}
            </Modal>
        </div>
    );
};

export default PartSalesReportPage;
