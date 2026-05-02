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
  InputNumber,
  Tag,
  Divider,
  Radio,
  AutoComplete,
  Select
} from 'antd';
import { Package, Trash2, Edit, Plus, Search, Archive, Info, FileStack, Download } from 'lucide-react';
import api from '../../utils/api';
import ImportExcelModal from '../../components/ImportExcelModal';
import { exportToExcel } from '../../utils/excelExport';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const PartPage = () => {
  const [form] = Form.useForm();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1, searchText);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const fetchData = async (page = currentPage, search = searchText) => {
    setLoading(true);
    try {
      const res = await api.get('/parts', {
        params: {
          search,
          limit: pageSize,
          offset: (page - 1) * pageSize
        }
      });
      setData(res.data.rows);
      setTotal(res.data.count);
      setCurrentPage(page);
    } catch (error) {
      message.error('Lỗi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch handled by search effect
  }, []);

  const showModal = (record = null) => {
    if (record) {
      setEditingId(record.id);
      form.setFieldsValue(record);
    } else {
      setEditingId(null);
      form.resetFields();
      form.setFieldsValue({ 
          code_type: 'HONDA', 
          default_conversion_rate: 1
      });
    }
    setIsModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingId) {
        await api.put(`/parts/${editingId}`, values);
        message.success('Cập nhật thành công!');
      } else {
        await api.post('/parts', values);
        message.success('Thêm mới thành công!');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error('Lỗi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/parts/${id}`);
      message.success('Đã xóa phụ tùng');
      fetchData();
    } catch (error) {
      message.error('Lỗi khi xóa: ' + error.message);
    }
  };

  const handleExport = () => {
    if (!data || data.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = data.map(p => ({
      'Mã phụ tùng (SKU)': p.code,
      'Phân loại mã': p.code_type === 'HONDA' ? 'Mã Honda' : 'Mã Tự tạo',
      'Tên phụ tùng': p.name,
      'Đơn vị cơ bản': p.unit,
      'Tỉ lệ quy đổi': p.default_conversion_rate,
      'Mã quy đổi gốc': p.LinkedPart?.code || '',
      'Giá nhập mặc định': Number(p.purchase_price),
      'Giá bán mặc định': Number(p.selling_price),
      'Mô tả': p.description || ''
    }));

    exportToExcel(exportData, `DanhMucPhuTung_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const columns = [
// ... existing columns ...
    { 
        title: 'Mã phụ tùng (SKU)', 
        dataIndex: 'code', 
        key: 'code', 
        render: (text, record) => (
            <Space direction="vertical" size={0}>
                <Text strong>{text}</Text>
                <Tag color={record.code_type === 'HONDA' ? 'orange' : 'cyan'} style={{ fontSize: '10px' }}>
                    {record.code_type === 'HONDA' ? 'Mã Honda' : 'Mã Tự tạo'}
                </Tag>
            </Space>
        )
    },
    { title: 'Tên phụ tùng', dataIndex: 'name', key: 'name' },
    { 
        title: 'Đơn vị/Quy đổi', 
        key: 'unit_info',
        render: (_, record) => (
            <Space direction="vertical" size={0}>
                <Text>{record.unit}</Text>
                {record.default_conversion_rate > 1 && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        1 {record.unit} = {record.default_conversion_rate} {record.LinkedPart?.unit || 'đơn vị base'} 
                        {record.LinkedPart && ` (${record.LinkedPart.code})`}
                    </Text>
                )}
            </Space>
        )
    },
    { 
        title: 'Giá nhập (đ)', 
        dataIndex: 'purchase_price', 
        key: 'purchase_price',
        render: (v) => <Text>{Number(v).toLocaleString()}</Text>
    },
    { 
        title: 'Giá bán (đ)', 
        dataIndex: 'selling_price', 
        key: 'selling_price',
        render: (v) => <Text strong style={{ color: 'var(--primary-color)' }}>{Number(v).toLocaleString()}</Text>
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<Edit size={16} />} onClick={() => showModal(record)} style={{ color: '#10b981' }} />
          <Popconfirm title="Xóa phụ tùng này?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // filteredData is no longer needed as we do it on server
  const tableData = data;

  return (
    <div style={{ padding: '24px' }}>
      <div className="page-header">
        <div>
          <Title level={2} className="gradient-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Package size={window.innerWidth < 768 ? 24 : 32} /> DANH MỤC PHỤ TÙNG
          </Title>
          <p style={{ color: 'var(--text-secondary)' }} className="mobile-hidden">Quản lý thông tin linh kiện chuyên sâu.</p>
        </div>
        <Space wrap className="mobile-stack">
            <Button 
                icon={<Download size={20} />} 
                onClick={handleExport}
                style={{ height: 48, borderRadius: 12, display: 'flex', alignItems: 'center' }}
                block={window.innerWidth < 768}
            >
                Xuất Excel
            </Button>
            <Button 
                icon={<FileStack size={20} />} 
                onClick={() => setIsImportModalOpen(true)}
                style={{ height: 48, borderRadius: 12, display: 'flex', alignItems: 'center' }}
                block={window.innerWidth < 768}
            >
                Nhập từ Excel
            </Button>
            <Button 
                type="primary" 
                size="large" 
                icon={<Plus size={20} />} 
                onClick={() => showModal()}
                style={{ height: 48, borderRadius: 12, padding: '0 24px' }}
                block={window.innerWidth < 768}
            >
                Thêm mới
            </Button>
        </Space>
      </div>

      <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
        <Input.Search 
            placeholder="Tìm theo Mã hoặc Tên phụ tùng..." 
            prefix={<Search size={18} />} 
            size="large"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(val) => { setSearchText(val); fetchData(1, val); }}
            enterButton
        />
      </div>

      <Table 
        dataSource={tableData} 
        columns={columns} 
        rowKey="id" 
        loading={loading}
        className="modern-table small-screen-optimized"
        scroll={{ x: 'max-content' }}
        size={window.innerWidth < 768 ? 'small' : 'middle'}
        pagination={{ 
            current: currentPage,
            pageSize: pageSize,
            total: total,
            onChange: (page) => fetchData(page),
            showSizeChanger: false
        }}
      />

      <Modal
        title={<Space><Archive size={20} /> {editingId ? "Cập nhật phụ tùng" : "Thêm phụ tùng mới"}</Space>}
        open={isModalOpen}
        onOk={handleOk}
        onCancel={() => setIsModalOpen(false)}
        okText="Lưu thông tin"
        cancelText="Hủy bỏ"
        width={window.innerWidth < 768 ? '95%' : 750}
        centered
      >
        <Form form={form} layout="vertical" style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Quy tắc đặt Mã" name="code_type" rules={[{ required: true }]}>
                <Radio.Group buttonStyle="solid" style={{ width: '100%' }}>
                    <Radio.Button value="HONDA" style={{ width: '50%', textAlign: 'center' }}>HONDA</Radio.Button>
                    <Radio.Button value="SELF_CREATED" style={{ width: '50%', textAlign: 'center' }}>TỰ TẠO</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Mã SKU (Phụ tùng)" name="code" rules={[{ required: true, message: 'Nhập mã phụ tùng' }]}>
                <Input placeholder="Ví dụ: PGD" disabled={!!editingId} size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Tên linh kiện / Phụ tùng" name="name" rules={[{ required: true, message: 'Nhập tên phụ tùng' }]}>
            <Input placeholder="Ví dụ: Phụ gia dầu" />
          </Form.Item>

          <Divider orientation="left" plain>Quy đổi & Đơn vị</Divider>
          
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item label="Đơn vị cơ bản" name="unit" rules={[{ required: true, message: 'Ví dụ: Chai, Cái' }]}>
                <Input placeholder="Chai / Cái" size="large" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item 
                label={
                    <Space>
                        Tỉ lệ quy đổi
                        <Info size={14} style={{ color: 'var(--primary-color)' }} />
                    </Space>
                } 
                name="default_conversion_rate"
                help="1 Thùng = 24 Chai thì nhập 24"
              >
                <InputNumber style={{ width: '100%' }} min={1} size="large" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={8}>
              <Form.Item label="Quy đổi về mã" name="linked_part_id">
                <Select
                    showSearch
                    allowClear
                    size="large"
                    placeholder="Mã cơ sở..."
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                        (option?.label ?? '').toUpperCase().includes(input.toUpperCase())
                    }
                    options={data.filter(p => p.id !== editingId).map(p => ({
                        value: p.id,
                        label: `${p.code} - ${p.name} (${p.unit})`
                    }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" plain>Giá cả mặc định</Divider>
          
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item label="Giá nhập mặc định (đ)" name="purchase_price">
                <InputNumber 
                    style={{ width: '100%' }} 
                    size="large"
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                    parser={(val) => val.replace(/\$\s?|(\.*)/g, "")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label="Giá bán mặc định (đ)" name="selling_price">
                <InputNumber 
                    style={{ width: '100%' }} 
                    size="large"
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                    parser={(val) => val.replace(/\$\s?|(\.*)/g, "")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={2} placeholder="Thông tin chi tiết về linh kiện..." />
          </Form.Item>
        </Form>
      </Modal>

      <ImportExcelModal 
        visible={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        onSuccess={() => {
            fetchData();
            setIsImportModalOpen(false);
        }}
        type="part_master"
        title="Đăng ký danh mục phụ tùng mới"
      />
    </div>
  );
};

export default PartPage;
