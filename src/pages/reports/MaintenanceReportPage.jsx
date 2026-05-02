import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Typography, Row, Col, DatePicker, 
  Select, Button, Space, message, Input, Tag, Modal, Divider
} from 'antd';
import { Search, Printer, Download, Eye, Phone, User, Settings } from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const MaintenanceReportPage = () => {
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [filters, setFilters] = useState({
        from_date: dayjs().startOf('day').format('YYYY-MM-DD'),
        to_date: dayjs().format('YYYY-MM-DD'),
        warehouse_id: undefined,
        query: ''
    });
    const [warehouses, setWarehouses] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isPowerUser = user.role === 'ADMIN' || user.role === 'MANAGER';

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/warehouses');
            if (isPowerUser) {
                setWarehouses(res.data);
            } else {
                setWarehouses(res.data.filter(w => w.id === user.warehouse_id));
            }
        } catch (e) { console.error(e); }
    };

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/maintenance', { params: filters });
            setOrders(res.data);
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

    const columns = [
        { 
            title: 'Ngày bảo trì', 
            dataIndex: 'maintenance_date', 
            key: 'date',
            render: v => dayjs(v).format('DD/MM/YYYY HH:mm')
        },
        { 
            title: 'Khách hàng', 
            key: 'customer',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}><User size={14} style={{ marginRight: 4, opacity: 0.5 }} />{r.customer_name || 'Khách vãng lai'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--primary-color)' }}><Phone size={12} style={{ marginRight: 4, opacity: 0.5 }} />{r.customer_phone}</div>
                </div>
            )
        },
        { 
            title: 'Thông tin xe', 
            key: 'vehicle',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{r.license_plate || 'Chưa có biển'}</div>
                    <div style={{ fontSize: '11px', opacity: 0.7 }}>{r.model_name}</div>
                    {r.engine_no && <div style={{ fontSize: '11px', opacity: 0.5 }}>SM: {r.engine_no}</div>}
                </div>
            )
        },
        { 
            title: 'Kho thực hiện', 
            dataIndex: ['Warehouse', 'warehouse_name'], 
            key: 'warehouse' 
        },
        { 
            title: 'Loại hình', 
            dataIndex: 'service_type', 
            key: 'service_type',
            render: v => <Tag color="blue">{v}</Tag>
        },
        { 
            title: 'Trạng thái', 
            dataIndex: 'status', 
            key: 'status',
            render: v => {
                const colors = {
                    'COMPLETED': 'success',
                    'IN_PROGRESS': 'processing',
                    'PENDING': 'warning',
                    'CANCELLED': 'error'
                };
                return <Tag color={colors[v]}>{v}</Tag>;
            }
        },
        { 
            title: 'Tổng cộng', 
            dataIndex: 'total_amount', 
            key: 'total',
            align: 'right',
            render: v => <Text strong style={{ color: '#10b981' }}>{Number(v).toLocaleString()} đ</Text>
        },
        {
            title: 'Tác vụ',
            key: 'action',
            width: 100,
            render: (_, r) => (
                <Button 
                    icon={<Eye size={16} />} 
                    onClick={() => { setSelectedOrder(r); setIsDetailModalOpen(true); }}
                    title="Xem chi tiết"
                />
            )
        }
    ];

    const handleExport = () => {
        if (!orders || orders.length === 0) return message.warning('Không có dữ liệu để xuất!');
        
        const exportData = orders.map(order => ({
            'Ngày bảo trì': dayjs(order.maintenance_date).format('DD/MM/YYYY'),
            'Khách hàng': order.customer_name || 'Khách vãng lai',
            'Số điện thoại': order.customer_phone,
            'Biển số': order.license_plate,
            'Model xe': order.model_name,
            'Số máy': order.engine_no,
            'Số khung': order.chassis_no,
            'Số KM': order.km_reading,
            'Kho thực hiện': order.Warehouse?.warehouse_name,
            'Loại dịch vụ': order.service_type,
            'Trạng thái': order.status,
            'Tổng chi phí': Number(order.total_amount),
            'Đã thanh toán': Number(order.paid_amount),
            'Ghi chú': order.notes
        }));

        exportToExcel(exportData, `BaoCaoBaoTri_CSKH_${dayjs().format('YYYYMMDD')}`);
    };

    return (
        <div className="page-container">
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} className="gradient-text" style={{ margin: 0 }}>BÁO CÁO DỊCH VỤ SỬA CHỮA</Title>
                    <Text type="secondary">Tra cứu danh sách xe vào xưởng để chăm sóc khách hàng</Text>
                </div>
                <Button type="primary" icon={<Download size={16} />} onClick={handleExport}>Xuất Excel CSKH</Button>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} md={6}>
                    <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #4f46e5' }}>
                        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12, textTransform: 'uppercase' }}>Tổng số xe vào xưởng</Typography.Paragraph>
                        <Title level={3} style={{ margin: 0 }}>{orders.length} <Text type="secondary" style={{ fontSize: 16 }}>xe</Text></Title>
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                        <Typography.Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12, textTransform: 'uppercase' }}>Tổng doanh thu dịch vụ</Typography.Paragraph>
                        <Title level={3} style={{ margin: 0 }}>{orders.reduce((sum, o) => sum + Number(o.total_amount), 0).toLocaleString()} <Text type="secondary" style={{ fontSize: 16 }}>đ</Text></Title>
                    </Card>
                </Col>
            </Row>

            <Card className="glass-card" style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]} align="bottom">
                    <Col xs={24} md={8}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Khoảng thời gian:</Text>
                        <RangePicker 
                            style={{ width: '100%' }}
                            value={[dayjs(filters.from_date), dayjs(filters.to_date)]}
                            onChange={(dates) => {
                                if (dates) {
                                    setFilters(prev => ({ 
                                        ...prev, 
                                        from_date: dates[0].format('YYYY-MM-DD'),
                                        to_date: dates[1].format('YYYY-MM-DD')
                                    }));
                                }
                            }}
                            format="DD/MM/YYYY"
                        />
                    </Col>
                    <Col xs={24} md={6}>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Kho thực hiện:</Text>
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
                            placeholder="Tên khách, SĐT, Biển số..." 
                            value={filters.query}
                            onChange={e => setFilters(prev => ({ ...prev, query: e.target.value }))}
                            onPressEnter={fetchReport}
                            prefix={<Search size={16} style={{ opacity: 0.5 }} />}
                        />
                    </Col>
                    <Col xs={24} md={4}>
                        <Button type="primary" block icon={<Search size={16} />} onClick={fetchReport} loading={loading}>
                            Tra cứu
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Card className="glass-card" styles={{ body: { padding: 0 } }}>
                <Table 
                    dataSource={orders} 
                    columns={columns} 
                    rowKey="id" 
                    loading={loading}
                    pagination={{ pageSize: 15 }}
                />
            </Card>

            {/* Detail Modal */}
            <Modal
                title={`CHI TIẾT PHIẾU BẢO TRÌ: ${selectedOrder?.id?.substring(0, 8)}...`}
                open={isDetailModalOpen}
                onCancel={() => setIsDetailModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setIsDetailModalOpen(false)}>Đóng</Button>
                ]}
                width={900}
            >
                {selectedOrder && (
                    <div>
                        <Row gutter={24}>
                            <Col span={12}>
                                <Divider orientation="left">Thông tin khách hàng</Divider>
                                <p><Text type="secondary">Họ tên:</Text> <Text strong>{selectedOrder.customer_name || 'N/A'}</Text></p>
                                <p><Text type="secondary">Điện thoại:</Text> <Text strong>{selectedOrder.customer_phone || 'N/A'}</Text></p>
                                <p><Text type="secondary">Địa chỉ:</Text> <Text strong>{selectedOrder.customer_address || 'N/A'}</Text></p>
                            </Col>
                            <Col span={12}>
                                <Divider orientation="left">Thông tin phương tiện</Divider>
                                <p><Text type="secondary">Biển số:</Text> <Text strong>{selectedOrder.license_plate || 'N/A'}</Text></p>
                                <p><Text type="secondary">Model:</Text> <Text strong>{selectedOrder.model_name || 'N/A'}</Text></p>
                                <p><Text type="secondary">Số máy/khung:</Text> <Text strong>{selectedOrder.engine_no || 'N/A'} / {selectedOrder.chassis_no || 'N/A'}</Text></p>
                                <p><Text type="secondary">Số KM:</Text> <Text strong>{selectedOrder.km_reading?.toLocaleString()} km</Text></p>
                            </Col>
                        </Row>

                        <Divider orientation="left">Danh sách hạng mục</Divider>
                        <Table 
                            dataSource={selectedOrder.MaintenanceItems}
                            rowKey="id"
                            pagination={false}
                            columns={[
                                { title: 'STT', render: (_, __, i) => i + 1, width: 60 },
                                { title: 'Hạng mục', dataIndex: 'description', key: 'desc' },
                                { title: 'ĐVT', dataIndex: 'unit', key: 'unit' },
                                { title: 'SL', dataIndex: 'quantity', align: 'right', key: 'qty' },
                                { title: 'Đơn giá', dataIndex: 'unit_price', align: 'right', render: v => Number(v).toLocaleString(), key: 'price' },
                                { title: 'Thành tiền', dataIndex: 'total_price', align: 'right', render: v => <Text strong>{Number(v).toLocaleString()} đ</Text>, key: 'total' }
                            ]}
                            summary={pageData => {
                                let total = 0;
                                pageData.forEach(({ total_price }) => total += Number(total_price));
                                return (
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={5} align="right"><Text strong>TỔNG CỘNG CHƯA VAT:</Text></Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right"><Text strong type="danger">{total.toLocaleString()} đ</Text></Table.Summary.Cell>
                                    </Table.Summary.Row>
                                );
                            }}
                        />
                        
                        <div style={{ marginTop: 16 }}>
                            <p><Text type="secondary">Ghi chú:</Text> {selectedOrder.notes || 'Không có ghi chú'}</p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MaintenanceReportPage;
