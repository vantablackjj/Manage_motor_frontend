import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Typography, Tag, Card } from 'antd';
import { Plus, Edit, Trash2, LayoutGrid } from 'lucide-react';
import api from '../../utils/api';

const { Title } = Typography;

const LiftTableManagementPage = () => {
    const [data, setData] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form] = Form.useForm();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [liftRes, whRes] = await Promise.all([
                api.get('/lift-tables'),
                api.get('/warehouses')
            ]);
            setData(liftRes.data);
            setWarehouses(whRes.data);
        } catch (error) {
            message.error('Lỗi tải dữ liệu: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSubmit = async (values) => {
        try {
            if (editingItem) {
                await api.put(`/lift-tables/${editingItem.id}`, values);
                message.success('Cập nhật thành công');
            } else {
                await api.post('/lift-tables', values);
                message.success('Thêm mới thành công');
            }
            setIsModalOpen(false);
            setEditingItem(null);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error('Lỗi: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.delete(`/lift-tables/${id}`);
            message.success('Đã xóa bàn nâng');
            fetchData();
        } catch (error) {
            message.error('Lỗi khi xóa: ' + error.message);
        }
    };

    const columns = [
        { title: 'Tên bàn nâng', dataIndex: 'name', key: 'name' },
        { 
            title: 'Kho / Chi nhánh', 
            dataIndex: ['Warehouse', 'warehouse_name'], 
            key: 'warehouse' 
        },
        { 
            title: 'Trạng thái', 
            dataIndex: 'status', 
            key: 'status',
            render: (status) => {
                let color = 'green';
                let text = 'Sẵn sàng';
                if (status === 'BUSY') { color = 'blue'; text = 'Đang sửa'; }
                if (status === 'MAINTENANCE') { color = 'orange'; text = 'Đang bảo trì bàn'; }
                return <Tag color={color}>{text}</Tag>;
            }
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Button 
                        type="text" 
                        icon={<Edit size={16} />} 
                        onClick={() => {
                            setEditingItem(record);
                            form.setFieldsValue(record);
                            setIsModalOpen(true);
                        }}
                    />
                    <Button 
                        type="text" 
                        danger 
                        icon={<Trash2 size={16} />} 
                        onClick={() => handleDelete(record.id)}
                    />
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0 }}>
                    <LayoutGrid size={24} style={{ marginRight: 8, marginBottom: -4 }} /> DANH MỤC BÀN NÂNG
                </Title>
                <Button type="primary" icon={<Plus size={16} />} onClick={() => {
                    setEditingItem(null);
                    form.resetFields();
                    setIsModalOpen(true);
                }}>
                    Thêm bàn nâng mới
                </Button>
            </div>

            <Card className="glass-card">
                <Table 
                    columns={columns} 
                    dataSource={data} 
                    loading={loading} 
                    rowKey="id"
                    pagination={false}
                />
            </Card>

            <Modal
                title={editingItem ? "Sửa bàn nâng" : "Thêm bàn nâng"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="name" label="Tên bàn nâng" rules={[{ required: true }]}>
                        <Input placeholder="Bàn nâng 1, Bàn 2..." />
                    </Form.Item>
                    <Form.Item name="warehouse_id" label="Thuộc kho" rules={[{ required: true }]}>
                        <Select placeholder="Chọn chi nhánh">
                            {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="status" label="Trạng thái" initialValue="AVAILABLE">
                        <Select>
                            <Select.Option value="AVAILABLE">Sẵn sàng</Select.Option>
                            <Select.Option value="BUSY">Đang sửa</Select.Option>
                            <Select.Option value="MAINTENANCE">Đang bảo trì bàn</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default LiftTableManagementPage;
