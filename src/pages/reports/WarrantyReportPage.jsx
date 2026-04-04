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
  Statistic
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
// ... existing state ...
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
// ... existing fetchData ...
    };

    const handleFilterChange = (key, value) => {
// ... existing handleFilterChange ...
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        fetchData(newFilters);
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
                                dropdownStyle={{ background: '#1f2937' }}
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
                    <Title level={3} className="responsive-title" style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: 1 }}>DANH SÁCH XE ĐẾN HẠN BẢO HÀNH</Title>
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
                                <Col xs={12} lg={24}>
                                    <Button 
                                        type={filters.turn === '1' ? 'primary' : 'default'} 
                                        block 
                                        onClick={() => handleFilterChange('turn', '1')}
                                        icon={<ShieldCheck size={16} />}
                                    >
                                        Lần 1 (1 th)
                                    </Button>
                                </Col>
                                <Col xs={12} lg={24}>
                                    <Button 
                                        type={filters.turn === '2' ? 'primary' : 'default'} 
                                        block 
                                        onClick={() => handleFilterChange('turn', '2')}
                                        icon={<ShieldCheck size={16} />}
                                    >
                                        Lần 2 (6 th)
                                    </Button>
                                </Col>
                                <Col xs={12} lg={24}>
                                    <Button 
                                        type={filters.turn === '3' ? 'primary' : 'default'} 
                                        block 
                                        onClick={() => handleFilterChange('turn', '3')}
                                        icon={<ShieldCheck size={16} />}
                                    >
                                        Lần 3 (12 th)
                                    </Button>
                                </Col>
                                <Col xs={12} lg={24}>
                                    <Button 
                                        type={filters.turn === '4' ? 'primary' : 'default'} 
                                        block 
                                        onClick={() => handleFilterChange('turn', '4')}
                                        icon={<ShieldCheck size={16} />}
                                    >
                                        Lần 4 (18 th)
                                    </Button>
                                </Col>
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
                    background: rgba(255,255,255,0.03) !important;
                    color: rgba(255,255,255,0.6) !important;
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
        background: color === 'blue' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.1)',
        color: color === 'blue' ? '#60a5fa' : 'white',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12
    }}>
        {children}
    </span>
);

const Divider = ({ style }) => <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', ...style }} />;

export default WarrantyReportPage;
