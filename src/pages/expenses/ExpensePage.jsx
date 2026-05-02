import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  InputNumber, 
  Row, 
  Col, 
  Table, 
  Typography, 
  message, 
  Space,
  Popconfirm,
  Select,
  Tag,
  Card,
  Divider,
  Tabs,
  Statistic,
  Checkbox
} from 'antd';
import { 
  Wallet, 
  Save, 
  RotateCcw, 
  Trash2, 
  Search, 
  Download, 
  PlusCircle, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/excelExport';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const ExpensePage = () => {
  const [expenseForm] = Form.useForm();
  const [incomeForm] = Form.useForm();
  const [filterForm] = Form.useForm();
  
  const [expenseData, setExpenseData] = useState([]);
  const [incomeData, setIncomeData] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [activeTab, setActiveTab] = useState('1');

  const [filters, setFilters] = useState({
    warehouse_id: null,
    dates: [dayjs().startOf('month'), dayjs().endOf('month')], // Mặc định tháng hiện tại
    query: '',
    category: null
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const isManager = user.role === 'MANAGER';
  const isPowerUser = isAdmin || isManager;
  const allowedWarehouseIds = [user.warehouse_id, ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])].filter(Boolean);

  const fetchData = async (f = filters) => {
    setLoading(true);
    try {
      const params = {
        warehouse_id: f.warehouse_id,
        query: f.query,
        category: f.category
      };
      
      if (f.dates && f.dates[0] && f.dates[1]) {
          params.from_date = f.dates[0].startOf('day').toISOString();
          params.to_date = f.dates[1].endOf('day').toISOString();
      }

      const [expenseRes, incomeRes, vRes, wRes] = await Promise.all([
        api.get('/expenses', { params }),
        api.get('/incomes', { params }),
        api.get('/vehicles?status=In Stock'),
        api.get('/warehouses')
      ]);

      setExpenseData(expenseRes.data);
      setIncomeData(incomeRes.data);
      setVehicles(vRes.data);
      
      const filteredWH = isPowerUser 
        ? wRes.data 
        : wRes.data.filter(w => allowedWarehouseIds.includes(w.id.toString()));
      setWarehouses(filteredWH);
    } catch (error) {
      message.error('Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    filterForm.setFieldsValue({ dates: filters.dates });
  }, []);

  const handleApplyFilter = () => {
    const values = filterForm.getFieldsValue();
    const newFilters = { ...filters, ...values };
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const handleQuickFilter = (type) => {
    let dates = [];
    if (type === 'today') dates = [dayjs(), dayjs()];
    else if (type === 'yesterday') dates = [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')];
    else if (type === '7days') dates = [dayjs().subtract(7, 'day'), dayjs()];
    else if (type === 'month') dates = [dayjs().startOf('month'), dayjs().endOf('month')];

    filterForm.setFieldsValue({ dates });
    handleApplyFilter();
  };

  const handleResetFilter = () => {
    filterForm.resetFields();
    const defaultDates = [dayjs().startOf('month'), dayjs().endOf('month')];
    filterForm.setFieldsValue({ dates: defaultDates });
    const newFilters = { warehouse_id: null, dates: defaultDates, query: '', category: null };
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const totalExpense = expenseData.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalIncome = incomeData.reduce((sum, item) => sum + Number(item.amount), 0);

  const handleExport = (type) => {
    const dataToExport = type === 'expense' ? expenseData : incomeData;
    if (!dataToExport || dataToExport.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = dataToExport.map(e => ({
      [type === 'expense' ? 'Ngày chi' : 'Ngày thu']: dayjs(e.expense_date || e.income_date).format('DD/MM/YYYY'),
      'Xe liên quan': e.related_vehicle ? e.related_vehicle.engine_no : 'Toàn hệ thống/Chung',
      'Cửa hàng/Kho': e.Warehouse?.warehouse_name || 'N/A',
      'Số tiền': Number(e.amount),
      'Phân loại': e.category || 'N/A',
      'Nội dung': e.content
    }));

    exportToExcel(exportData, `DanhSach_${type === 'expense' ? 'ChiPhi' : 'ThuNhap'}_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const onFinishExpense = async (values) => {
    try {
      const payload = { ...values, expense_date: values.expense_date.toISOString() };
      await api.post('/expenses', payload);
      message.success('Ghi nhận chi tiêu thành công!');
      expenseForm.resetFields();
      handleResetFilter();
    } catch (error) {
      message.error('Lỗi khi lưu chi tiêu: ' + error.message);
    }
  };

  const onFinishIncome = async (values) => {
    try {
      const payload = { ...values, income_date: values.income_date.toISOString() };
      await api.post('/incomes', payload);
      message.success('Ghi nhận thu nhập thành công!');
      incomeForm.resetFields();
      handleResetFilter();
    } catch (error) {
      message.error('Lỗi khi lưu thu nhập: ' + error.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await api.delete(`/expenses/${id}`);
      message.success('Đã xóa chi tiêu');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + error.message);
    }
  };

  const handleDeleteIncome = async (id) => {
    try {
      await api.delete(`/incomes/${id}`);
      message.success('Đã xóa thu nhập');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + error.message);
    }
  };

  const commonColumns = (type) => [
    { 
      title: type === 'expense' ? 'Ngày chi' : 'Ngày thu', 
      dataIndex: type === 'expense' ? 'expense_date' : 'income_date', 
      key: 'date', 
      width: '130px', 
      render: (d) => dayjs(d).format('DD/MM/YYYY') 
    },
    { 
      title: 'Xe liên quan', 
      key: 'vehicle', 
      width: '180px',
      render: (_, r) => r.related_vehicle ? (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 12 }}>{r.related_vehicle.engine_no}</Text>
          <Text type="secondary" style={{ fontSize: 10 }}>SM: {r.related_vehicle.chassis_no}</Text>
        </Space>
      ) : <Tag>Chung (Vận hành)</Tag>
    },
    { 
      title: 'Cửa hàng/Kho', 
      dataIndex: 'Warehouse', 
      key: 'warehouse', 
      width: '150px', 
      render: (w) => w?.warehouse_name || <Tag color="orange">Toàn hệ thống</Tag> 
    },
    { 
      title: 'Số tiền (VNĐ)', 
      dataIndex: 'amount', 
      key: 'amount', 
      width: '150px', 
      render: (val) => <Text strong style={{ color: type === 'expense' ? '#ef4444' : '#10b981' }}>{Number(val).toLocaleString()} đ</Text> 
    },
    { 
      title: 'Phân loại', 
      dataIndex: 'category', 
      key: 'category',
      width: '120px',
      render: (cat, r) => (
        <Space size={4}>
          {cat ? <Tag color="blue">{cat}</Tag> : <Text type="secondary" italic>N/A</Text>}
          {r.is_internal && <Tag color="red">Nội bộ</Tag>}
        </Space>
      )
    },
    { title: 'Nội dung', dataIndex: 'content', key: 'content' },
    { 
      title: 'Tác vụ', 
      key: 'action', 
      width: '80px',
      align: 'center',
      render: (_, r) => (isAdmin || user.can_delete) ? (
        <Popconfirm title={`Xóa khoản ${type === 'expense' ? 'chi' : 'thu'} này?`} onConfirm={() => type === 'expense' ? handleDeleteExpense(r.id) : handleDeleteIncome(r.id)}>
          <Button type="text" danger icon={<Trash2 size={16} />} />
        </Popconfirm>
      ) : null
    },
  ];

  const filteredWarehouses = isPowerUser 
    ? warehouses 
    : warehouses.filter(w => allowedWarehouseIds.includes(w.id.toString()));

  const renderForm = (type) => (
    <Card 
      className="glass-card" 
      style={{ borderLeft: `4px solid ${type === 'expense' ? '#ef4444' : '#10b981'}` }}
      title={
        <Space>
          {type === 'expense' ? <TrendingDown size={18} color="#ef4444" /> : <TrendingUp size={18} color="#10b981" />}
          <span style={{ fontSize: 14 }}>{type === 'expense' ? 'GHI PHIẾU CHI' : 'GHI PHIẾU THU'}</span>
        </Space>
      }
    >
      <Form
        form={type === 'expense' ? expenseForm : incomeForm}
        layout="vertical"
        onFinish={type === 'expense' ? onFinishExpense : onFinishIncome}
        initialValues={{ 
          [type === 'expense' ? 'expense_date' : 'income_date']: dayjs(),
          warehouse_id: user.warehouse_id
        }}
        size="small"
      >
        <Row gutter={12}>
          {type === 'expense' && (
            <Col xs={24} sm={12}>
              <Form.Item label="Phân loại" name="category" rules={[{ required: true, message: 'Vui lòng chọn loại chi' }]}>
                <Select placeholder="Chọn loại chi">
                  <Option value="Chi bán hàng">Chi bán hàng</Option>
                  <Option value="Chi phụ tùng">Chi phụ tùng</Option>
                  <Option value="Chi khác">Chi khác</Option>
                </Select>
              </Form.Item>
            </Col>
          )}
          <Col xs={24} sm={12}>
            <Form.Item label="Xe liên quan" name="vehicle_id">
              <Select showSearch allowClear placeholder="Chọn xe" optionFilterProp="children" style={{ width: '100%' }}>
                {vehicles.map(v => (
                  <Option key={v.id} value={v.id}>{`${v.engine_no}`}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Kho/Cửa hàng" name="warehouse_id">
              <Select placeholder="Chọn kho" allowClear style={{ width: '100%' }} disabled={!isPowerUser}>
                {filteredWarehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Ngày" name={type === 'expense' ? 'expense_date' : 'income_date'} rules={[{ required: true }]}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="Số tiền" name="amount" rules={[{ required: true }]}>
              <InputNumber 
                style={{ width: '100%' }} 
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={value => value.replace(/\$\s?|(,*)/g, '')}
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item label="Nội dung" name="content" rules={[{ required: true }]}>
              <Input placeholder="Lý do thu/chi..." />
            </Form.Item>
          </Col>
          {isAdmin && (
            <Col span={24}>
              <Form.Item name="is_internal" valuePropName="checked" style={{ marginBottom: 8 }}>
                <Checkbox style={{ color: '#ef4444', fontWeight: 500 }}>
                  Ghi chú nội bộ (Chỉ Admin thấy)
                </Checkbox>
              </Form.Item>
            </Col>
          )}
        </Row>
        <Button 
            type="primary" 
            htmlType="submit" 
            danger={type === 'expense'} 
            block 
            icon={<Save size={16} />}
            style={{ marginTop: 8 }}
        >
          {type === 'expense' ? "Xác nhận Chi" : "Xác nhận Thu"}
        </Button>
      </Form>
    </Card>
  );

  return (
    <div className="page-container" style={{ maxWidth: 1400 }}>
      {/* Header & Stats */}
      <Row gutter={[16, 24]} justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col xs={24} xl={6}>
          <Title level={2} className="gradient-text" style={{ margin: 0 }}>QUẢN LÝ THU CHI</Title>
          <Text type="secondary">Theo dõi dòng tiền ngoài hệ thống bán lẻ.</Text>
        </Col>
        
        <Col xs={24} xl={18}>
          <Row gutter={[16, 16]} justify="end">
            <Col xs={24} sm={8}>
              <Card className="glass-card" style={{ background: '#f0fdf4', margin: 0 }}>
                <Statistic 
                  title={<span style={{ color: '#166534' }}>Tổng Thu</span>} 
                  value={totalIncome} 
                  precision={0} 
                  suffix="đ" 
                  valueStyle={{ color: '#15803d', fontSize: 18 }}
                  prefix={<ArrowUpRight size={16} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="glass-card" style={{ background: '#fef2f2', margin: 0 }}>
                <Statistic 
                  title={<span style={{ color: '#991b1b' }}>Tổng Chi</span>} 
                  value={totalExpense} 
                  precision={0} 
                  suffix="đ" 
                  valueStyle={{ color: '#b91c1c', fontSize: 18 }}
                  prefix={<ArrowDownRight size={16} />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="glass-card" style={{ background: '#eff6ff', margin: 0 }}>
                <Statistic 
                  title={<span style={{ color: '#1e40af' }}>Dòng tiền ròng</span>} 
                  value={totalIncome - totalExpense} 
                  precision={0} 
                  suffix="đ" 
                  valueStyle={{ color: totalIncome - totalExpense >= 0 ? '#1d4ed8' : '#b91c1c', fontSize: 18 }}
                  prefix={<DollarSign size={16} />}
                />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      <Row gutter={24}>
        {/* Cột trái: Form nhập */}
        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {renderForm('expense')}
            {renderForm('income')}
          </Space>
        </Col>

        {/* Cột phải: Bộ lọc & Bảng */}
        <Col xs={24} lg={16}>
          <Card className="glass-card" style={{ marginBottom: 16 }}>
            <Form form={filterForm} layout="vertical">
              <Row gutter={[16, 16]} align="bottom">
                <Col xs={24} md={12} lg={7}>
                  <Form.Item name="dates" label={<Space><Calendar size={14} /> Thời gian</Space>} style={{ marginBottom: 8 }}>
                    <DatePicker.RangePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
                  </Form.Item>
                  <div className="filter-card-content">
                    <Button size="small" onClick={() => handleQuickFilter('today')}>Hôm nay</Button>
                    <Button size="small" onClick={() => handleQuickFilter('yesterday')}>Hôm qua</Button>
                    <Button size="small" onClick={() => handleQuickFilter('7days')}>7 ngày</Button>
                    <Button size="small" onClick={() => handleQuickFilter('month')}>Tháng</Button>
                  </div>
                </Col>
                <Col xs={24} sm={12} md={6} lg={4}>
                  <Form.Item name="warehouse_id" label="Cửa hàng" style={{ marginBottom: 8 }}>
                    <Select placeholder="Tất cả kho" allowClear style={{ width: '100%' }}>
                      {warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6} lg={4}>
                  <Form.Item name="category" label="Phân loại" style={{ marginBottom: 8 }}>
                    <Select placeholder="Tất cả loại chi" allowClear style={{ width: '100%' }}>
                      <Option value="Chi bán hàng">Chi bán hàng</Option>
                      <Option value="Chi phụ tùng">Chi phụ tùng</Option>
                      <Option value="Chi khác">Chi khác</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={6} lg={5}>
                  <Form.Item name="query" label="Nội dung" style={{ marginBottom: 8 }}>
                    <Input placeholder="Tìm kiếm..." prefix={<Search size={14} />} allowClear style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={24} lg={4}>
                   <Row gutter={8}>
                      <Col span={12} lg={24}>
                        <Button type="primary" icon={<Filter size={14} />} onClick={handleApplyFilter} block className="btn-filter-group">Lọc</Button>
                      </Col>
                      <Col span={12} lg={24}>
                        <Button icon={<RotateCcw size={14} />} onClick={handleResetFilter} block size="small">Reset</Button>
                      </Col>
                   </Row>
                </Col>
              </Row>
            </Form>
          </Card>

          <Tabs 
            type="card"
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={[
              {
                key: '1',
                label: <Space><TrendingDown size={14} /> CHI PHÍ</Space>,
                children: (
                  <Card className="glass-card" styles={{ body: { padding: 0 } }}>
                    <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                      <Text strong>Lịch sử chi tiền</Text>
                      <Button icon={<Download size={14} />} onClick={() => handleExport('expense')} size="small">Xuất Excel</Button>
                    </div>
                    <Table 
                      dataSource={expenseData} 
                      columns={commonColumns('expense')} 
                      rowKey="id" 
                      loading={loading} 
                      size="small" 
                      pagination={{ pageSize: 10 }} 
                      className="modern-table"
                    />
                  </Card>
                )
              },
              {
                key: '2',
                label: <Space><TrendingUp size={14} /> THU NHẬP</Space>,
                children: (
                  <Card className="glass-card" styles={{ body: { padding: 0 } }}>
                    <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                      <Text strong>Lịch sử thu tiền</Text>
                      <Button icon={<Download size={14} />} onClick={() => handleExport('income')} size="small">Xuất Excel</Button>
                    </div>
                    <Table 
                      dataSource={incomeData} 
                      columns={commonColumns('income')} 
                      rowKey="id" 
                      loading={loading} 
                      size="small" 
                      pagination={{ pageSize: 10 }} 
                      className="modern-table"
                    />
                  </Card>
                )
              }
            ]}
          />
        </Col>
      </Row>

      <style>{`
        .page-container {
          padding: 24px;
          background: #f1f5f9;
          min-height: 100vh;
        }
        .modern-table .ant-table-thead > tr > th {
          background: #f8fafc;
          font-weight: 600;
        }
        .ant-statistic-title {
          font-weight: 600;
          margin-bottom: 8px;
        }
        .btn-filter-group {
          margin-bottom: 8px;
        }
        @media (max-width: 991px) {
          .btn-filter-group {
            margin-bottom: 0;
          }
        }
        .filter-card-content {
           display: flex;
           flex-wrap: wrap;
           gap: 4px;
           margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
};

export default ExpensePage;

