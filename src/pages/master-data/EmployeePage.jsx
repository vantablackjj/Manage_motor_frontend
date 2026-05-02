import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Table, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Popconfirm, 
  message,
  Modal,
  Tag,
  Select,
  Checkbox,
  Divider
} from 'antd';
import { UserPlus, Trash2, Edit, Save, Plus, Shield, MapPin, Eye, EyeOff, Download } from 'lucide-react';
import api from '../../utils/api';
import { capitalizeName } from '../../utils/stringHelper';
import { exportToExcel } from '../../utils/excelExport';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;

const EmployeePage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const [editingId, setEditingId] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [showPassword, setShowPassword] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/users');
      setData(response.data);
    } catch (error) {
      message.error('Không thể tải danh sách nhân viên: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!data || data.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = data.map(u => ({
      'Họ và tên': u.full_name,
      'Tên đăng nhập': u.username,
      'Quyền hạn': u.role === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên',
      'Kho làm việc': warehouses.find(w => w.id === u.warehouse_id)?.warehouse_name || '---',
      'Quản lý nợ': u.can_manage_debt ? 'Có' : 'Không',
      'Hủy đơn/Xóa': u.can_delete ? 'Có' : 'Không',
      'Quản lý tiền': u.can_manage_money ? 'Có' : 'Không',
      'Quản lý phụ tùng': u.can_manage_spare_parts ? 'Có' : 'Không',
      'Quản lý danh mục': u.can_manage_master_data ? 'Có' : 'Không',
      'Quản lý bán hàng': u.can_manage_sales ? 'Có' : 'Không',
      'Xóa phiếu': u.can_delete_ticket ? 'Có' : 'Không',
      'Sửa phiếu': u.can_edit_ticket ? 'Có' : 'Không',
      'Kho bổ sung': u.accessible_warehouses ? u.accessible_warehouses.split(',').map(id => warehouses.find(w => w.id === id)?.warehouse_name).join(', ') : '---',
    }));

    exportToExcel(exportData, `DanhSachNhanVien_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/warehouses');
      setWarehouses(response.data);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchWarehouses();
  }, []);

  const showModal = (record = null) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue({
        username: record.username,
        full_name: record.full_name,
        role: record.role,
        warehouse_id: record.warehouse_id,
        phone: record.phone || '',
        password: '', // Không tải mật khẩu cũ
        can_manage_debt: record.can_manage_debt,
        can_delete: record.can_delete,
        can_manage_money: record.can_manage_money,
        can_manage_spare_parts: record.can_manage_spare_parts,
        can_manage_master_data: record.can_manage_master_data,
        can_manage_sales: record.can_manage_sales,
        can_manage_expenses: record.can_manage_expenses,
        can_delete_ticket: record.can_delete_ticket,
        can_edit_ticket: record.can_edit_ticket,
        expense_warehouses: record.expense_warehouses ? record.expense_warehouses.split(',') : [],
        accessible_warehouses: record.accessible_warehouses ? record.accessible_warehouses.split(',') : [],
      });
    } else {
      setEditingId(null);
      form.resetFields();
      form.setFieldsValue({ 
        role: 'STAFF',
        can_manage_debt: false,
        can_delete: false,
        can_manage_money: false,
        can_manage_master_data: false,
        can_manage_sales: true, // Mặc định nhân viên mới thường cho bán hàng
        can_manage_expenses: false,
        can_delete_ticket: false,
        can_edit_ticket: false,
        expense_warehouses: [],
        accessible_warehouses: []
      });
    }

    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const fields = await form.validateFields();
      const values = {
        ...fields,
        expense_warehouses: fields.expense_warehouses ? fields.expense_warehouses.join(',') : '',
        accessible_warehouses: fields.accessible_warehouses ? fields.accessible_warehouses.join(',') : ''
      };
      if (editingId) {
        // Cập nhật
        await api.put(`/auth/users/${editingId}`, values);
        message.success('Cập nhật nhân viên thành công!');
      } else {
        // Tạo mới (Dùng api/auth/register)
        await api.post('/auth/register', values);
        message.success('Thêm nhân viên mới thành công!');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      if (error.errorFields) return;
      message.error('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/auth/users/${id}`);
      message.success('Đã xóa nhân viên');
      fetchUsers();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + (error.response?.data?.message || error.message));
    }
  };

  const getRoleTag = (role) => {
    const roles = {
      'ADMIN': { color: 'gold', label: 'Quản trị viên' },
      'MANAGER': { color: 'purple', label: 'Nhân viên tổng bộ' },
      'STAFF': { color: 'blue', label: 'Nhân viên' },
    };

    const r = roles[role] || { color: 'default', label: role };
    return <Tag color={r.color} icon={<Shield size={12} style={{marginRight: 4}} />}>{r.label}</Tag>;
  };

  const columns = [
    { 
      title: 'Họ và tên', 
      dataIndex: 'full_name', 
      key: 'full_name',
      render: (text) => <Text strong>{text}</Text>
    },
    { 
      title: 'Tên đăng nhập', 
      dataIndex: 'username', 
      key: 'username' 
    },
    { 
      title: 'SĐT', 
      dataIndex: 'phone', 
      key: 'phone' 
    },
    { 
      title: 'Quyền hạn', 
      dataIndex: 'role', 
      key: 'role',
      render: (role) => getRoleTag(role)
    },
    { 
      title: 'Quyền hạn bổ sung', 
      key: 'permissions',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {record.can_manage_debt && <Tag color="cyan" style={{fontSize: '10px'}}>Quản lý nợ</Tag>}
          {record.can_delete && <Tag color="red" style={{fontSize: '10px'}}>Hủy/Xóa</Tag>}
          {record.can_manage_money && <Tag color="gold" style={{fontSize: '10px'}}>Tiền/Trả nợ</Tag>}
          {record.can_manage_spare_parts && <Tag color="purple" style={{fontSize: '10px'}}>Phụ tùng</Tag>}
          {record.can_manage_sales && <Tag color="green" style={{fontSize: '10px'}}>Bán hàng</Tag>}
          {record.can_manage_expenses && <Tag color="volcano" style={{fontSize: '10px'}}>Chi tiêu</Tag>}
          {record.can_delete_ticket && <Tag color="orange" style={{fontSize: '10px'}}>Xóa phiếu</Tag>}
          {record.can_edit_ticket && <Tag color="blue" style={{fontSize: '10px'}}>Sửa phiếu</Tag>}
          {!record.can_manage_debt && !record.can_delete && !record.can_manage_money && !record.can_manage_spare_parts && !record.can_manage_master_data && !record.can_manage_sales && !record.can_manage_expenses && !record.can_delete_ticket && !record.can_edit_ticket && <Text type="secondary" style={{fontSize: '11px'}}>---</Text>}
        </Space>
      )
    },
    { 
      title: 'Kho làm việc', 
      dataIndex: 'warehouse_id', 
      key: 'warehouse_id',
      render: (id, record) => {
        const w = warehouses.find(wh => wh.id === id);
        const others = record.accessible_warehouses ? record.accessible_warehouses.split(',').filter(x => x !== id) : [];
        return (
          <Space direction="vertical" size={2}>
            {w && <Tag color="blue" icon={<MapPin size={12} style={{marginRight:4}} />}>{w.warehouse_name}</Tag>}
            {others.map(oid => {
              const ow = warehouses.find(wh => wh.id === oid);
              return ow ? <Tag key={oid} style={{fontSize: '10px'}}>+ {ow.warehouse_name}</Tag> : null;
            })}
          </Space>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: '120px',
      hidden: !isAdmin,
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<Edit size={16} />} 
            onClick={() => showModal(record)}
            style={{ color: '#10b981' }} 
          />
          {record.username !== 'admin' && (
            <Popconfirm title="Xóa nhân viên này?" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" danger icon={<Trash2 size={16} />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <Title level={2} className="gradient-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserPlus size={28} /> QUẢN LÝ NHÂN VIÊN
          </Title>
          <Text type="secondary">Phân quyền và quản lý tài khoản nhân viên.</Text>
        </div>
        <Space wrap className="mobile-stack">
            <Button 
                icon={<Download size={18} />} 
                onClick={handleExport}
                ghost
                type="primary"
                style={{ height: 40, borderRadius: 8 }}
                block={window.innerWidth < 768}
            >
                Xuất Excel
            </Button>
            {isAdmin && (
              <Button 
                  type="primary" 
                  icon={<Plus size={18} />} 
                  onClick={() => showModal()}
                  style={{ background: 'var(--primary-color)', height: 40, borderRadius: 8 }}
                  block={window.innerWidth < 768}
              >
                  Thêm nhân viên
              </Button>
            )}
        </Space>
      </div>

      <Table 
        dataSource={data} 
        columns={columns.filter(c => !c.hidden)} 
        rowKey="id" 
        loading={loading}
        size={window.innerWidth < 768 ? 'small' : 'middle'}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 15 }}
      />

      <Modal
        title={editingId ? "Cập nhật nhân viên" : "Thêm nhân viên mới"}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Lưu lại"
        cancelText="Hủy"
        centered
        width={window.innerWidth < 768 ? '95%' : 700}
        styles={{ body: { paddingTop: 20 } }}
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changedValues) => {
            if (changedValues.role === 'MANAGER') {
              form.setFieldsValue({
                can_manage_debt: false,
                can_delete: true,
                can_manage_money: false,
                can_manage_spare_parts: true,
                can_manage_master_data: true,
                can_manage_sales: true,
                can_manage_expenses: false,
                can_delete_ticket: true,
                can_edit_ticket: true,
              });
            } else if (changedValues.role === 'ADMIN') {
              form.setFieldsValue({
                can_manage_debt: true,
                can_delete: true,
                can_manage_money: true,
                can_manage_spare_parts: true,
                can_manage_master_data: true,
                can_manage_sales: true,
                can_manage_expenses: true,
                can_delete_ticket: true,
                can_edit_ticket: true,
              });
            }
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item label="Họ và tên" name="full_name" rules={[{ required: true, message: 'Nhập họ tên' }]}>
                <Input 
                  size="large"
                  placeholder="Nguyễn Văn A" 
                  onBlur={(e) => form.setFieldsValue({ full_name: capitalizeName(e.target.value) })}
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item label="Số điện thoại" name="phone">
                <Input size="large" placeholder="09xxx..." />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item label="Tên đăng nhập" name="username" rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
                <Input 
                  size="large"
                  placeholder="user_01" 
                  disabled={!!editingId && form.getFieldValue('username') === 'admin'} 
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item 
                label={editingId ? "Đổi mật khẩu mới" : "Mật khẩu"} 
                name="password" 
                rules={[{ required: !editingId, message: 'Nhập mật khẩu' }]}
              >
                <Input.Password 
                  size="large"
                  placeholder={editingId ? "Nhập mật khẩu mới (để trống nếu không đổi)" : "Nhập mật khẩu"} 
                  iconRender={(visible) => (visible ? <Eye size={16} /> : <EyeOff size={16} />)}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Quyền hạn (Phân quyền)" name="role" rules={[{ required: true }]}>
                <Select size="large">
                  <Option value="ADMIN">Quản trị viên (Toàn quyền)</Option>
                  <Option value="MANAGER">Nhân viên tổng bộ (Gần như toàn quyền)</Option>
                  <Option value="STAFF">Nhân viên chi nhánh</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Kho làm việc chính" name="warehouse_id">
            <Select size="large" placeholder="Chọn kho chính cho nhân viên" allowClear>
              {warehouses.map(w => (
                <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Kho bổ sung (Được phép truy cập)" name="accessible_warehouses">
            <Select size="large" mode="multiple" placeholder="Chọn các kho phụ hoặc kho khác được phép truy cập" allowClear>
              {warehouses.map(w => (
                <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Divider orientation="left" plain style={{ fontSize: '13px', color: '#888' }}>Phân quyền chi tiết</Divider>
          
          <Row gutter={[8, 8]}>
            <Col xs={12} sm={6}>
              <Form.Item name="can_manage_debt" valuePropName="checked" noStyle>
                <Checkbox>Công nợ</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="can_delete" valuePropName="checked" noStyle>
                <Checkbox>Hủy/Xóa</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="can_manage_money" valuePropName="checked" noStyle>
                <Checkbox>Tiền mặt</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="can_manage_spare_parts" valuePropName="checked" noStyle>
                <Checkbox>Phụ tùng</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="can_manage_master_data" valuePropName="checked" noStyle>
                <Checkbox>Danh mục</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="can_manage_sales" valuePropName="checked" noStyle>
                <Checkbox>Bán hàng</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="can_manage_expenses" valuePropName="checked" noStyle>
                <Checkbox>Chi tiêu</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="can_delete_ticket" valuePropName="checked" noStyle>
                <Checkbox>Xóa phiếu</Checkbox>
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="can_edit_ticket" valuePropName="checked" noStyle>
                <Checkbox>Sửa phiếu</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.can_manage_expenses !== currentValues.can_manage_expenses}
          >
            {({ getFieldValue }) => 
              getFieldValue('can_manage_expenses') && (
                <Form.Item label="Kho được quyền nhập chi tiêu" name="expense_warehouses">
                    <Select mode="multiple" placeholder="Chọn các kho được phép chi tiêu">
                        {warehouses.map(w => (
                            <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>
                        ))}
                    </Select>
                </Form.Item>
              )
            }
          </Form.Item>

        </Form>
      </Modal>
    </div>
  );
};

export default EmployeePage;
