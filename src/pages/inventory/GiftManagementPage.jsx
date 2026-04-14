import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Button, Modal, Form, Input, InputNumber, 
  Select, DatePicker, Tabs, Space, Tag, Typography, 
  message, Row, Col, Popconfirm, Tooltip 
} from 'antd';
import { 
  Plus, 
  Download, 
  Upload, 
  History, 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  Filter,
  Gift
} from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const GiftManagementPage = () => {
    const [activeTab, setActiveTab] = useState('inventory');
    const [gifts, setGifts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Modals
    const [isGiftModalVisible, setIsGiftModalVisible] = useState(false);
    const [isImportModalVisible, setIsImportModalVisible] = useState(false);
    const [isExportModalVisible, setIsExportModalVisible] = useState(false);
    const [editingGift, setEditingGift] = useState(null);
    
    const [form] = Form.useForm();
    const [importForm] = Form.useForm();
    const [exportForm] = Form.useForm();

    useEffect(() => {
        fetchGifts();
        fetchWarehouses();
        fetchInventory();
        fetchTransactions();
    }, []);

    const fetchGifts = async () => {
        try {
            const res = await api.get('/gifts');
            setGifts(res.data);
        } catch (e) {
            message.error('Không thể tải danh mục quà tặng');
        }
    };

    const fetchWarehouses = async () => {
        try {
            const res = await api.get('/warehouses');
            setWarehouses(res.data);
        } catch (e) {
            message.error('Không thể tải danh sách kho');
        }
    };

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const res = await api.get('/gifts/inventory');
            setInventory(res.data);
        } catch (e) {
            message.error('Không thể tải tồn kho');
        } finally {
            setLoading(false);
        }
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/gifts/transactions');
            setTransactions(res.data);
        } catch (e) {
            message.error('Không thể tải nhật ký');
        } finally {
            setLoading(false);
        }
    };

    const handleGiftSubmit = async (values) => {
        try {
            if (editingGift) {
                await api.put(`/gifts/${editingGift.id}`, values);
                message.success('Cập nhật thành công');
            } else {
                await api.post('/gifts', values);
                message.success('Thêm mới thành công');
            }
            setIsGiftModalVisible(false);
            setEditingGift(null);
            form.resetFields();
            fetchGifts();
        } catch (e) {
            message.error(e.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleImportSubmit = async (values) => {
        try {
            await api.post('/gifts/import', {
                ...values,
                transaction_date: values.transaction_date.toDate()
            });
            message.success('Nhập kho thành công');
            setIsImportModalVisible(false);
            importForm.resetFields();
            fetchInventory();
            fetchTransactions();
        } catch (e) {
            message.error(e.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleExportSubmit = async (values) => {
        try {
            await api.post('/gifts/export', {
                ...values,
                transaction_date: values.transaction_date.toDate()
            });
            message.success('Xuất kho thành công');
            setIsExportModalVisible(false);
            exportForm.resetFields();
            fetchInventory();
            fetchTransactions();
        } catch (e) {
            message.error(e.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const deleteGift = async (id) => {
        try {
            await api.delete(`/gifts/${id}`);
            message.success('Xoá thành công');
            fetchGifts();
        } catch (e) {
            message.error('Không thể xoá vì có dữ liệu liên quan');
        }
    };

    const inventoryColumns = [
        {
            title: 'Tên quà tặng',
            dataIndex: ['Gift', 'name'],
            key: 'gift_name',
            render: (text) => <Text strong>{text}</Text>
        },
        {
            title: 'Kho',
            dataIndex: ['Warehouse', 'warehouse_name'],
            key: 'warehouse_name',
        },
        {
            title: 'Số lượng tồn',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (val, record) => (
                <Text strong style={{ color: val > 0 ? '#10b981' : '#ef4444' }}>
                    {Number(val).toLocaleString()} {record.Gift?.unit}
                </Text>
            )
        },
        {
            title: 'Cập nhật cuối',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm')
        }
    ];

    const transactionColumns = [
        {
            title: 'Ngày ghi',
            dataIndex: 'transaction_date',
            key: 'transaction_date',
            render: (date) => dayjs(date).format('DD/MM/YYYY')
        },
        {
            title: 'Loại',
            dataIndex: 'type',
            key: 'type',
            render: (type) => {
                const map = {
                    'IMPORT': { color: 'green', text: 'Nhập kho', icon: <ArrowDownLeft size={14} /> },
                    'EXPORT_RETAIL': { color: 'blue', text: 'Xuất bán lẻ', icon: <ArrowUpRight size={14} /> },
                    'EXPORT_EVENT': { color: 'purple', text: 'Xuất sự kiện', icon: <ArrowUpRight size={14} /> },
                    'OTHER_EXPORT': { color: 'orange', text: 'Xuất khác', icon: <ArrowUpRight size={14} /> },
                };
                const item = map[type];
                return (
                    <Tag color={item.color} style={{ display: 'flex', alignItems: 'center', width: 'fit-content', gap: 4 }}>
                        {item.icon} {item.text}
                    </Tag>
                );
            }
        },
        {
            title: 'Quà tặng',
            dataIndex: ['Gift', 'name'],
            key: 'gift_name',
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (val, record) => (
                <Text strong style={{ color: val > 0 ? '#10b981' : '#ef4444' }}>
                    {val > 0 ? '+' : ''}{Number(val).toLocaleString()} {record.Gift?.unit}
                </Text>
            )
        },
        {
            title: 'Sự kiện/Ghi chú',
            key: 'info',
            render: (_, record) => (
                <span>
                    {record.event_name && <Tag color="cyan">Sự kiện: {record.event_name}</Tag>}
                    {record.notes && <Text type="secondary" style={{ fontSize: 12 }}>{record.notes}</Text>}
                </span>
            )
        },
        {
            title: 'Kho',
            dataIndex: ['Warehouse', 'warehouse_name'],
            key: 'warehouse_name',
        }
    ];

    const giftMasterColumns = [
        { title: 'Tên quà tặng', dataIndex: 'name', key: 'name' },
        { title: 'Đơn vị tính', dataIndex: 'unit', key: 'unit' },
        { title: 'Mô tả', dataIndex: 'description', key: 'description' },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button 
                        size="small" 
                        onClick={() => {
                            setEditingGift(record);
                            form.setFieldsValue(record);
                            setIsGiftModalVisible(true);
                        }}
                    >
                        Sửa
                    </Button>
                    <Popconfirm title="Xoá quà tặng này?" onConfirm={() => deleteGift(record.id)}>
                        <Button size="small" danger>Xoá</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    const items = [
        {
            key: 'inventory',
            label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Package size={16} /> Tồn kho hiện tại</span>,
            children: (
                <Table 
                    columns={inventoryColumns} 
                    dataSource={inventory} 
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 15 }}
                />
            )
        },
        {
            key: 'history',
            label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><History size={16} /> Nhật ký nhập xuất</span>,
            children: (
                <Table 
                    columns={transactionColumns} 
                    dataSource={transactions} 
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 15 }}
                />
            )
        },
        {
            key: 'master',
            label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Gift size={16} /> Danh mục quà tặng</span>,
            children: (
                <>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button type="primary" icon={<Plus size={16} />} onClick={() => {
                            setEditingGift(null);
                            form.resetFields();
                            setIsGiftModalVisible(true);
                        }}>
                            Thêm loại quà tặng
                        </Button>
                    </div>
                    <Table 
                        columns={giftMasterColumns} 
                        dataSource={gifts} 
                        rowKey="id"
                    />
                </>
            )
        }
    ];

    return (
        <div style={{ padding: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Gift size={32} color="#4f46e5" /> Quản lý Đồ Khuyến Mại
                    </Title>
                    <Text type="secondary">Quản lý nhập, xuất và tồn kho quà tặng chương trình khuyến mại</Text>
                </div>
                <Space>
                    <Button 
                        className="glass-button" 
                        icon={<ArrowDownLeft size={16} color="#10b981" />}
                        onClick={() => setIsImportModalVisible(true)}
                        style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                    >
                        Nhập kho quà
                    </Button>
                    <Button 
                        className="glass-button" 
                        icon={<ArrowUpRight size={16} color="#3b82f6" />}
                        onClick={() => setIsExportModalVisible(true)}
                        style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                    >
                        Xuất kho quà
                    </Button>
                </Space>
            </div>

            <Card className="glass-card" styles={{ body: { padding: '24px' } }}>
                <Tabs 
                    activeKey={activeTab} 
                    onChange={setActiveTab} 
                    items={items}
                    className="custom-tabs"
                />
            </Card>

            {/* Modal: Thêm/Sửa quà tặng */}
            <Modal
                title={editingGift ? "Sửa thông tin quà tặng" : "Thêm loại quà tặng mới"}
                open={isGiftModalVisible}
                onCancel={() => setIsGiftModalVisible(false)}
                onOk={() => form.submit()}
                destroyOnClose
                centered
            >
                <Form form={form} layout="vertical" onFinish={handleGiftSubmit}>
                    <Form.Item name="name" label="Tên quà tặng" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                        <Input placeholder="VD: Mũ bảo hiểm, Áo mưa..." />
                    </Form.Item>
                    <Form.Item name="unit" label="Đơn vị tính" rules={[{ required: true, message: 'Vui lòng nhập đơn vị' }]} initialValue="Cái">
                        <Input placeholder="VD: Cái, Bộ, Chiếc..." />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea placeholder="Thông tin thêm..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal: Nhập kho */}
            <Modal
                title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ArrowDownLeft size={20} color="#10b981" /> Nhập kho quà tặng</span>}
                open={isImportModalVisible}
                onCancel={() => setIsImportModalVisible(false)}
                onOk={() => importForm.submit()}
                destroyOnClose
                centered
            >
                <Form form={importForm} layout="vertical" onFinish={handleImportSubmit} initialValues={{ transaction_date: dayjs() }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="gift_id" label="Chọn quà tặng" rules={[{ required: true }]}>
                                <Select placeholder="Chọn loại quà">
                                    {gifts.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="warehouse_id" label="Kho nhập vào" rules={[{ required: true }]}>
                                <Select placeholder="Chọn kho">
                                    {warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="quantity" label="Số lượng nhập" rules={[{ required: true, min: 1 }]}>
                                <InputNumber style={{ width: '100%' }} placeholder="3000" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="transaction_date" label="Ngày nhập" rules={[{ required: true }]}>
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="notes" label="Ghi chú">
                        <Input.TextArea placeholder="Nhập theo lô hàng..." />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal: Xuất kho */}
            <Modal
                title={<span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ArrowUpRight size={20} color="#3b82f6" /> Xuất kho quà tặng</span>}
                open={isExportModalVisible}
                onCancel={() => setIsExportModalVisible(false)}
                onOk={() => exportForm.submit()}
                destroyOnClose
                centered
            >
                <Form form={exportForm} layout="vertical" onFinish={handleExportSubmit} initialValues={{ transaction_date: dayjs(), type: 'EXPORT_RETAIL' }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="gift_id" label="Chọn quà tặng" rules={[{ required: true }]}>
                                <Select placeholder="Chọn loại quà">
                                    {gifts.map(g => <Option key={g.id} value={g.id}>{g.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="warehouse_id" label="Kho xuất" rules={[{ required: true }]}>
                                <Select placeholder="Chọn kho">
                                    {warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="type" label="Mục đích xuất" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="EXPORT_RETAIL">Xuất khuyến mại bán lẻ</Option>
                                    <Option value="EXPORT_EVENT">Xuất sự kiện LXAT</Option>
                                    <Option value="OTHER_EXPORT">Xuất khác</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="quantity" label="Số lượng xuất" rules={[{ required: true, min: 1 }]}>
                                <InputNumber style={{ width: '100%' }} placeholder="50" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item 
                        noStyle 
                        shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
                    >
                        {({ getFieldValue }) => 
                            getFieldValue('type') === 'EXPORT_EVENT' ? (
                                <Form.Item name="event_name" label="Tên sự kiện" rules={[{ required: true, message: 'Vui lòng nhập tên sự kiện' }]}>
                                    <Input placeholder="Tên sự kiện LXAT..." />
                                </Form.Item>
                            ) : null
                        }
                    </Form.Item>
                    <Form.Item name="transaction_date" label="Ngày xuất" rules={[{ required: true }]}>
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                    <Form.Item name="notes" label="Ghi chú">
                        <Input.TextArea placeholder="Thông tin thêm về việc xuất kho..." />
                    </Form.Item>
                </Form>
            </Modal>

            <style>{`
                .custom-tabs .ant-tabs-nav {
                    margin-bottom: 24px;
                }
                .custom-tabs .ant-tabs-tab {
                    padding: 12px 16px;
                    font-weight: 600;
                    font-size: 15px;
                }
                .glass-button {
                    border-radius: 8px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 600;
                    transition: all 0.3s;
                }
                .glass-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
};

export default GiftManagementPage;
