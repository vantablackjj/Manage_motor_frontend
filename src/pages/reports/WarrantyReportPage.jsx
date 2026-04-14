import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Row, 
  Col, 
  Typography, 
  Select, 
  Button, 
  Space, 
  message,
  Statistic,
  Checkbox
} from 'antd';
import { 
  Printer, 
  Search, 
  Calendar,
  Clock,
  ShieldCheck,
  Download
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text } = Typography;
const { Option } = Select;

const WarrantyReportPage = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [filters, setFilters] = useState({
        month: dayjs().month() + 1,
        year: dayjs().year(),
        turn: '1' // Lần 1
    });

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = Array.from({ length: 5 }, (_, i) => dayjs().year() - 2 + i);

    useEffect(() => {
        fetchData();
    }, []);

    const handleExport = () => {
        if (!data || data.length === 0) {
            return message.warning('Không có dữ liệu để xuất!');
        }

        const exportData = data.map(r => ({
            'Ngày bán': dayjs(r.sale_date).format('DD/MM/YYYY'),
            'Tên khách hàng': r.customer_name,
            'Loại xe': r.Vehicle?.VehicleType?.name || 'N/A',
            'Màu xe': r.Vehicle?.VehicleColor?.color_name || 'N/A',
            'Số khung': r.Vehicle?.chassis_no || 'N/A',
            'Số máy': r.Vehicle?.engine_no || 'N/A',
            'Lượt bảo hành': `Lần ${filters.turn}`
        }));

        exportToExcel(exportData, `BaoCaoBaoHanh_Lan${filters.turn}_Thang${filters.month}_${filters.year}`);
    };

    const fetchData = async (currentFilters = filters) => {
        setLoading(true);
        try {
            const { month, year, turn } = currentFilters;
            const res = await api.get('/reports/warranty-report', {
                params: { month, year, turn }
            });
            setData(res.data || []);
        } catch (e) {
            console.error('Lỗi khi lấy dữ liệu bảo hành', e);
            message.error('Không thể tải danh sách xe bảo hành');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
// ... existing handleFilterChange ...
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        fetchData(newFilters);
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

    const columns = [
        { 
            title: 'Ngày bán', 
            dataIndex: 'sale_date', 
            width: 120,
            render: d => dayjs(d).format('DD/MM/YYYY') 
        },
        { 
            title: 'Tên khách hàng', 
            dataIndex: 'customer_name',
            width: 200,
            render: (t, r) => <Text strong>{t}</Text>
        },
        { 
            title: 'Loại xe', 
            width: 180,
            render: (_, r) => r.Vehicle?.VehicleType?.name || 'N/A'
        },
        { 
            title: 'Màu xe', 
            width: 120,
            render: (_, r) => r.Vehicle?.VehicleColor?.color_name || 'N/A'
        },
        { 
            title: 'Số khung', 
            width: 150,
            render: (_, r) => r.Vehicle?.chassis_no || 'N/A'
        },
        { 
            title: 'Số máy', 
            width: 150,
            render: (_, r) => r.Vehicle?.engine_no || 'N/A'
        },
        { 
            title: 'Lượt bảo hành', 
            width: 150,
            render: () => <Tag color="blue">Lần {filters.turn}</Tag>
        },
        {
            title: 'Sổ bảo hành',
            width: 150,
            fixed: 'right',
            render: (_, r) => (
                <Space direction="vertical" size={0}>
                    <Checkbox 
                        checked={r.guarantee_book_issued}
                        onChange={() => toggleGuaranteeBook(r.id, r.guarantee_book_issued)}
                    >
                        {r.guarantee_book_issued ? 'Đã cấp sổ' : 'Chưa cấp'}
                    </Checkbox>
                    {r.guarantee_book_issued && r.guarantee_book_issued_at && (
                        <Text style={{ fontSize: 10, opacity: 0.6 }}>
                            {dayjs(r.guarantee_book_issued_at).format('DD/MM/YYYY')}
                        </Text>
                    )}
                </Space>
            )
        }
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Blue Header Section from Screenshot */}
            <div style={{ background: '#1e40af', padding: '12px 24px', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={4} style={{ color: 'white', margin: 0, letterSpacing: 1 }}>XEM DANH SÁCH XE BẢO HÀNH</Title>
                <Space>
                     <Button type="text" style={{ color: 'white' }}>Hướng dẫn hoặc Thoát</Button>
                </Space>
            </div>

            <Card className="glass-card" style={{ borderRadius: '0 0 8px 8px', borderTop: 'none' }}>
                <Row justify="center" align="middle" gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={8} md={6} style={{ textAlign: 'center' }}>
                        <Space>
                            <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>Tháng:</Text>
                            <Select 
                                value={filters.month} 
                                style={{ width: 70 }} 
                                onChange={v => handleFilterChange('month', v)}
                            >
                                {months.map(m => <Option key={m} value={m}>{m}</Option>)}
                            </Select>
                        </Space>
                    </Col>
                    <Col xs={12} sm={8} md={6} style={{ textAlign: 'center' }}>
                        <Space>
                            <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>Năm:</Text>
                            <Select 
                                value={filters.year} 
                                style={{ width: 90 }} 
                                onChange={v => handleFilterChange('year', v)}
                            >
                                {years.map(y => <Option key={y} value={y}>{y}</Option>)}
                            </Select>
                        </Space>
                    </Col>
                </Row>

                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <Title level={3} className="responsive-title" style={{ color: 'var(--text-primary)', letterSpacing: 1 }}>DANH SÁCH XE ĐẾN HẠN BẢO HÀNH</Title>
                </div>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={18}>
                        <Table 
                            dataSource={data} 
                            columns={columns} 
                            rowKey="id" 
                            loading={loading}
                            pagination={{ pageSize: 12 }}
                            size="small"
                            className="modern-table"
                            bordered
                            scroll={{ x: 800 }}
                        />
                        <div style={{ marginTop: 10 }}>
                            <Text type="secondary">Tổng số dòng dữ liệu: {data.length}</Text>
                        </div>
                    </Col>
                    <Col xs={24} lg={6}>
                        <Card title="Chọn lượt bảo hành" size="small" className="glass-card">
                            <Row gutter={[8, 8]}>
                                {[
                                    { key: '1', label: 'Lần 1', sub: '1 th' },
                                    { key: '2', label: 'Lần 2', sub: '6 th' },
                                    { key: '3', label: 'Lần 3', sub: '12 th' },
                                    { key: '4', label: 'Lần 4', sub: '18 th' },
                                    { key: '5', label: 'Lần 5', sub: '24 th' },
                                    { key: '6', label: 'Lần 6', sub: '30 th' },
                                    { key: '7', label: 'Lần 7', sub: '36 th' },
                                ].map(t => (
                                    <Col xs={12} lg={24} key={t.key}>
                                        <Button 
                                            type={filters.turn === t.key ? 'primary' : 'default'} 
                                            block 
                                            onClick={() => handleFilterChange('turn', t.key)}
                                            icon={<ShieldCheck size={16} />}
                                            style={{ height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}
                                        >
                                            {t.label} ({t.sub})
                                        </Button>
                                    </Col>
                                ))}
                            </Row>
                            
                            <Divider style={{ margin: '12px 0' }} />
                            <Row gutter={[8, 8]}>
                                <Col xs={12} lg={24}><Button block icon={<Printer size={16} />}>In</Button></Col>
                                <Col xs={12} lg={24}>
                                    <Button 
                                        block 
                                        icon={<Download size={16} />} 
                                        onClick={handleExport}
                                        disabled={data.length === 0}
                                    >
                                        Excel
                                    </Button>
                                </Col>
                            </Row>
                        </Card>
                    </Col>
                </Row>
            </Card>

            <style>{`
                .ant-table-thead > tr > th {
                    background: #f1f1f7 !important;
                    color: #475569 !important;
                    font-size: 11px;
                    text-transform: uppercase;
                }
                .ant-table-cell {
                    font-size: 13px !important;
                }
            `}</style>
        </div>
    );
};

// Tag fallback for columns
const Tag = ({ color, children }) => (
    <span style={{ 
        background: color === 'blue' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0,0,0,0.05)',
        color: color === 'blue' ? '#2563eb' : '#000000',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12
    }}>
        {children}
    </span>
);

const Divider = ({ style }) => <div style={{ borderTop: '1px solid #cbd5e1', ...style }} />;

export default WarrantyReportPage;
