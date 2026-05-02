import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Modal, Form, Input, InputNumber, Space, message, Popconfirm, Tag, Switch } from 'antd';
import { Plus, Edit, Trash2, Settings, AlertCircle } from 'lucide-react';
import api from '../../utils/api';

const MaintenanceRulePage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form] = Form.useForm();

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await api.get('/maintenance-rules');
      setRules(response.data);
    } catch (error) {
      message.error('Lỗi khi tải danh sách cấu hình: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleAdd = () => {
    setEditingRule(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    form.setFieldsValue(rule);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/maintenance-rules/${id}`);
      message.success('Xóa cấu hình thành công');
      fetchRules();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + error.message);
    }
  };

  const handleFinish = async (values) => {
    try {
      if (editingRule) {
        await api.put(`/maintenance-rules/${editingRule.id}`, values);
        message.success('Cập nhật cấu hình thành công');
      } else {
        await api.post('/maintenance-rules', values);
        message.success('Thêm cấu hình thành công');
      }
      setIsModalOpen(false);
      fetchRules();
    } catch (error) {
      message.error('Lỗi khi lưu: ' + error.message);
    }
  };

  const columns = [
    {
      title: 'Mốc Km bắt đầu',
      dataIndex: 'min_km',
      key: 'min_km',
      render: (val) => <Tag color="blue">{val.toLocaleString()} Km</Tag>,
      sorter: (a, b) => a.min_km - b.min_km,
    },
    {
      title: 'Mốc Km kết thúc',
      dataIndex: 'max_km',
      key: 'max_km',
      render: (val) => <Tag color="cyan">{val.toLocaleString()} Km</Tag>,
    },
    {
      title: 'Nội dung gợi ý',
      dataIndex: 'suggestion',
      key: 'suggestion',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Nhắc lại (Tháng)',
      dataIndex: 'time_gap_months',
      key: 'time_gap_months',
      render: (val) => val ? <Tag color="orange">{val} tháng</Tag> : '-',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active, record) => (
        <Switch 
          checked={active} 
          onChange={async (val) => {
            try {
              await api.put(`/maintenance-rules/${record.id}`, { is_active: val });
              fetchRules();
            } catch (e) {
              message.error(e.message);
            }
          }} 
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<Edit size={18} />} 
            onClick={() => handleEdit(record)} 
            style={{ color: '#1890ff' }}
          />
          <Popconfirm
            title="Bạn có chắc chắn muốn xóa quy tắc này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xác nhận"
            cancelText="Hủy"
          >
            <Button 
              type="text" 
              danger 
              icon={<Trash2 size={18} />} 
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title={
          <Space>
            <Settings size={20} />
            <span>THIẾT LẬP GỢI Ý BẢO TRÌ THEO SỐ KM</span>
          </Space>
        }
        extra={
          <Button type="primary" icon={<Plus size={18} />} onClick={handleAdd}>
            Thêm quy tắc mới
          </Button>
        }
        className="glass-card"
      >
        <div style={{ marginBottom: 16, padding: '12px', background: 'rgba(24, 144, 255, 0.05)', borderRadius: '8px', border: '1px solid rgba(24, 144, 255, 0.1)' }}>
          <Space>
            <AlertCircle size={16} style={{ color: '#1890ff' }} />
            <span style={{ fontSize: '13px', color: '#1890ff' }}>
              Hệ thống sẽ tự động quét số Km của xe khi vào xưởng. Nếu nằm trong khoảng (Bắt đầu - Kết thúc), nội dung gợi ý sẽ được hiển thị trong phiếu sửa chữa.
            </span>
          </Space>
        </div>

        <Table 
          columns={columns} 
          dataSource={rules} 
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingRule ? "Chỉnh sửa quy tắc" : "Thêm quy tắc mới"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ is_active: true }}
        >
          <Space style={{ display: 'flex' }} align="baseline">
            <Form.Item 
              label="Số Km bắt đầu" 
              name="min_km" 
              rules={[{ required: true, message: 'Vui lòng nhập số Km bắt đầu' }]}
            >
              <InputNumber style={{ width: '100%' }} placeholder="VD: 10000" />
            </Form.Item>
            <Form.Item 
              label="Số Km kết thúc" 
              name="max_km" 
              rules={[{ required: true, message: 'Vui lòng nhập số Km kết thúc' }]}
            >
              <InputNumber style={{ width: '100%' }} placeholder="VD: 15000" />
            </Form.Item>
          </Space>

          <Form.Item 
            label="Nội dung gợi ý sửa chữa/thay thế" 
            name="suggestion" 
            rules={[{ required: true, message: 'Vui lòng nhập nội dung gợi ý' }]}
          >
            <Input.TextArea rows={3} placeholder="VD: Kiểm tra và thay thế lốp xe nếu mòn..." />
          </Form.Item>

          <Form.Item 
            label="Khoảng thời gian nhắc lại dự kiến (Tháng)" 
            name="time_gap_months" 
            extra="Nếu nhập, hệ thống sẽ tự động cộng thêm số tháng này vào ngày hiện tại để gợi ý ngày bảo trì tiếp theo."
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="VD: 6 (tháng)" />
          </Form.Item>

          <Form.Item name="is_active" valuePropName="checked" label="Trạng thái kích hoạt">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MaintenanceRulePage;
