import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  DatePicker, 
  Select, 
  InputNumber, 
  Row, 
  Col, 
  Table, 
  Space, 
  Typography, 
  Divider,
  Tabs,
  Modal,
  notification,
  message,
  Card,
  Tag,
  Alert
} from 'antd';
import { ShoppingCart, Save, RotateCcw, Plus, Trash2, DollarSign, History, CheckCircle2, AlertTriangle, Search, FileSpreadsheet, Download } from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../utils/api';
import ImportExcelModal from '../../components/ImportExcelModal';
import { exportToExcel } from '../../utils/excelExport';

const { Text, Title } = Typography;
const { Option } = Select;

const WholesaleSalePage = () => {
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();
  
  const [customers, setCustomers] = useState([]);
  const [availableStock, setAvailableStock] = useState([]);
  
  // State for editable sale batch
  const [batchItems, setBatchItems] = useState([
    { key: Date.now().toString(), engine_no: '', chassis_no: '', sale_price: undefined, cost_price: undefined, notes: '' }
  ]);
  
  const [saleHistory, setSaleHistory] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetails, setSaleDetails] = useState({ vehicles: [], payments: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(user.warehouse_id);
  const canDelete =
    isAdmin || user.can_delete === true || user.can_delete === 1;
  const canManageMoney =
    isAdmin || user.can_manage_money === true || user.can_manage_money === 1;


  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async (warehouseId = selectedWarehouseId) => {
    try {
      const [cRes, sRes, whRes] = await Promise.all([
        api.get('/wholesale-customers'),
        api.get(`/inventory/available${warehouseId ? `?warehouse_id=${warehouseId}` : ''}`),
        isAdmin ? api.get('/warehouses') : Promise.resolve({ data: [] })
      ]);
      setCustomers(cRes.data);
      setAvailableStock(sRes.data);
      if (isAdmin) setWarehouses(whRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleWarehouseChange = (val) => {
    setSelectedWarehouseId(val);
    setBatchItems([{ key: Date.now().toString(), engine_no: '', chassis_no: '', sale_price: undefined, cost_price: undefined, notes: '' }]);
    fetchInitialData(val);
  };


  const handleSearchHistory = async (customerId) => {
    if (!customerId) return;
    setLoading(true);
    try {
      const response = await api.get(`/wholesale-sales?customer_id=${customerId}`);
      setSaleHistory(response.data);
    } catch (error) {
      message.error('Lỗi tải lịch sử bán hàng: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSaleDetails = async (sale) => {
    setSelectedSale(sale);
    setLoading(true);
    try {
      const response = await api.get(`/wholesale-sales/${sale.id}/details`);
      setSaleDetails(response.data);
    } catch (error) {
      message.error('Lỗi tải chi tiết: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Editable Table Logic for Batch Sale
  const addRow = () => {
    setBatchItems([...batchItems, { key: Date.now().toString(), engine_no: '', chassis_no: '', sale_price: undefined, cost_price: undefined, notes: '' }]);
  };

  const updateItem = (key, field, value) => {
    // Check if this vehicle is already selected in another row
    if (field === 'engine_no' || field === 'chassis_no') {
      const isDuplicate = batchItems.some(item => item.key !== key && item.vehicle_id === value);
      if (isDuplicate) {
        return message.warning('Xe này đã được chọn trong lô hàng!');
      }
    }

    const newData = [...batchItems];
    const index = newData.findIndex(item => item.key === key);
    if (index > -1) {
      if (field === 'engine_no' || field === 'chassis_no') {
        const vehicle = availableStock.find(v => v.id === value);
        if (vehicle) {
          newData[index].vehicle_id = vehicle.id;
          newData[index].engine_no = vehicle.id; // Map id to value for bind
          newData[index].chassis_no = vehicle.id; // Map id to value for bind
          newData[index].cost_price = vehicle.price_vnd;
          newData[index].type_name = vehicle.VehicleType?.type_name;
          newData[index].color_name = vehicle.VehicleColor?.color_name;
        }
      } else {
        newData[index][field] = value;
      }
      setBatchItems(newData);
    }
  };

  const removeItem = (key) => {
    if (batchItems.length === 1) return;
    setBatchItems(batchItems.filter(item => item.key !== key));
  };

  const handleSaveBatch = async () => {
    try {
      const formValues = await form.validateFields();
      const validItems = batchItems.filter(item => item.vehicle_id);
      if (validItems.length === 0) return message.warning('Vui lòng chọn xe trong kho!');

      // KIỂM TRA GIÁ BÁN
      if (validItems.some(item => !item.sale_price || item.sale_price <= 0)) {
         return message.error('Vui lòng nhập giá bán cho tất cả các xe trong lô hàng!');
      }

      setLoading(true);
      await api.post('/wholesale-sales', {
        customer_id: formValues.customer_id,
        sale_date: formValues.sale_date.toISOString(),
        items: validItems.map(item => ({ 
          vehicle_id: item.vehicle_id, 
          price_vnd: item.sale_price,
          notes: item.notes // Pass individual notes
        })),
        notes: formValues.notes,
        warehouse_id: selectedWarehouseId // Source of Truth
      });

      notification.success({ message: 'Thành công', description: `Đã xuất hóa đơn lô hàng gồm ${validItems.length} xe cho khách buôn.` });
      setBatchItems([{ key: Date.now().toString(), engine_no: '', chassis_no: '', sale_price: undefined, cost_price: undefined, notes: '' }]);
      form.setFieldsValue({ notes: '' });
      handleSearchHistory(formValues.customer_id);
      fetchInitialData(); // Refresh available stock
    } catch (error) {
      message.error('Lỗi lưu đơn bán: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (values) => {
    try {
      await api.post('/wholesale-sales/payment', {
        wholesale_sale_id: selectedSale.id,
        amount_paid_vnd: values.amount,
        payment_date: values.date.toISOString(),
        notes: values.notes
      });
      message.success('Đã ghi nhận tiền trả từ khách buôn!');
      setIsPaymentModalOpen(false);
      paymentForm.resetFields();
      loadSaleDetails(selectedSale);
      handleSearchHistory(form.getFieldValue('customer_id'));
    } catch (error) {
       message.error(error.message);
    }
  };

  const handleExport = () => {
    if (saleHistory.length === 0) return message.warning('Không có lịch sử để xuất!');
    const exportData = saleHistory.map(h => ({
        'Ngày xuất lô': dayjs(h.sale_date).format('DD/MM/YYYY'),
        'Mã Khách': h.WholesaleCustomer?.customer_code || 'N/A',
        'Tên Khách': h.WholesaleCustomer?.name || 'N/A',
        'Tổng tiền lô': Number(h.total_amount_vnd),
        'Đã thanh toán': Number(h.paid_amount_vnd),
        'Còn nợ': Number(h.total_amount_vnd || 0) - Number(h.paid_amount_vnd || 0),
        'Kho xuất': h.Warehouse?.warehouse_name || 'N/A'
    }));
    exportToExcel(exportData, `LichSuBanBuon_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const entryColumns = [
    {
      title: 'Số Máy (Tìm xe)',
      dataIndex: 'engine_no',
      width: '30%',
      render: (val, record) => (
        <Select 
          style={{ width: '100%' }} 
          showSearch 
          placeholder="Số máy..."
          value={val || undefined}
          onChange={(v) => updateItem(record.key, 'engine_no', v)}
          optionFilterProp="children"
        >
          {availableStock
            .filter(v => !batchItems.some(item => item.key !== record.key && item.vehicle_id === v.id))
            .map(v => <Option key={v.id} value={v.id}>{v.engine_no}</Option>)}
        </Select>
      )
    },
    {
      title: 'Số Khung (Tìm xe)',
      dataIndex: 'chassis_no',
      width: '30%',
      render: (val, record) => (
        <Select 
          style={{ width: '100%' }} 
          showSearch 
          placeholder="Số khung..."
          value={val || undefined}
          onChange={(v) => updateItem(record.key, 'chassis_no', v)}
          optionFilterProp="children"
        >
          {availableStock
            .filter(v => !batchItems.some(item => item.key !== record.key && item.vehicle_id === v.id))
            .map(v => <Option key={v.id} value={v.id}>{v.chassis_no}</Option>)}
        </Select>
      )
    },
    {
      title: 'Thông tin xe',
      key: 'info',
      render: (_, record) => record.type_name ? (
        <div style={{ fontSize: 11, lineHeight: 1.2 }}>
           <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{record.type_name}</Tag>
           <br/>
           <Tag color="purple" style={{ fontSize: 10, margin: '2px 0 0 0' }}>{record.color_name}</Tag>
        </div>
      ) : null
    },
    {
      title: 'Giá Bán (đ)',
      dataIndex: 'sale_price',
      width: '18%',
      render: (val, record) => (
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
           <InputNumber 
              style={{ width: '100%', borderColor: (record.cost_price && Number(val) < Number(record.cost_price)) ? 'var(--error-color)' : '' }} 
              value={val} 
              size="small"
              placeholder="Giá..."
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/\$\s?|(,*)/g, '')}
              onChange={(v) => updateItem(record.key, 'sale_price', v)} 
           />
           {Number(record.cost_price) > 0 && Number(val) > 0 && Number(val) < Number(record.cost_price) && (
             <Text type="danger" style={{ fontSize: 9 }}>⚠️ Lỗ so với giá nhập!</Text>
           )}
        </Space>
      )
    },
    {
      title: 'Ghi chú xe',
      dataIndex: 'notes',
      width: '15%',
      render: (val, record) => (
        <Input 
          size="small" 
          placeholder="Ghi chú chi tiết..." 
          value={val} 
          onChange={(e) => updateItem(record.key, 'notes', e.target.value)} 
        />
      )
    },
    {
      title: '',
      key: 'action',
      width: 40,
      render: (_, record) => <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => removeItem(record.key)} />
    }
  ];


  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="gradient-text">XUẤT BÁN BUÔN & THU NỢ</Title>
        <Space wrap>
            <Button 
                icon={<Download size={18} />} 
                type="primary" 
                ghost
                onClick={handleExport}
            >
                Xuất Excel
            </Button>
        </Space>
      </div>

      <Card className="glass-card" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" initialValues={{ sale_date: dayjs() }}>
          <Row gutter={24} align="bottom">
            <Col xs={24} md={isAdmin ? 7 : 10}>
              <Form.Item label="Chọn Khách Hàng Buôn" name="customer_id" rules={[{ required: true }]}>
                <Select size="large" showSearch placeholder="Tìm theo tên hoặc mã khách" optionFilterProp="children" onChange={(val) => { handleSearchHistory(val); setActiveTab('2'); }}>
                  {customers.map(c => <Option key={c.id} value={c.id}>{c.customer_code} - {c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            {isAdmin && (
               <Col xs={24} md={6}>
                  <Form.Item label="Từ Kho Xuất Bán" required>
                    <Select size="large" showSearch placeholder="Chọn kho..." optionFilterProp="children" value={selectedWarehouseId} onChange={handleWarehouseChange}>
                        {warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
                    </Select>
                  </Form.Item>
               </Col>
            )}
            <Col xs={24} md={ isAdmin ? 4 : 6 }>
              <Form.Item label="Ngày xuất lô hàng" name="sale_date">
                <DatePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={7}>
              <Form.Item label="Ghi chú đơn bán" name="notes">
                <Input size="large" placeholder="Ghi chú đơn..." />
              </Form.Item>
            </Col>
          </Row>

        </Form>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card" className="custom-tabs" items={[
          {
            key: '1',
            label: <Space><Plus size={18} /> LẬP LÔ BÁN MỚI</Space>,
            children: (
              <Card className="glass-card" styles={{ body: { padding: '8px' } }}>
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                   <Text type="secondary" style={{ fontSize: 12 }}>Tìm xe, nhập giá bán lẻ vào bảng (Chốt lô bán buôn)</Text>
                   <Button icon={<Plus size={16} />} onClick={addRow} type="primary">Dòng mới</Button>
                </div>
                <Table dataSource={batchItems} columns={entryColumns} pagination={false} size="small" scroll={{ x: 1000 }} />
                 <div style={{ marginTop: 32, textAlign: 'right' }}>
                    <Space size={16}>
                       <Button size="large" icon={<RotateCcw size={18} />} danger ghost onClick={() => setBatchItems([{ key: Date.now().toString(), engine_no: '', chassis_no: '', sale_price: undefined, cost_price: undefined, notes: '' }])}>Làm mới bảng</Button>
                       <Button 
                        size="large" 
                        icon={<FileSpreadsheet size={18} />} 
                        type="primary" 
                        ghost
                        onClick={() => setImportVisible(true)}
                      >
                        NHẬP TỪ EXCEL
                      </Button>
                       <Button 
                         size="large" 
                         type="primary" 
                         loading={loading} 
                         icon={<CheckCircle2 size={18} />} 
                         onClick={handleSaveBatch} 
                         style={{ background: '#10b981', minWidth: 200 }}
                       >
                         CHỐT ĐƠN & XUẤT KHO
                       </Button>
                    </Space>
                 </div>

                 <ImportExcelModal 
                    visible={importVisible}
                    onCancel={() => setImportVisible(false)}
                    onSuccess={() => {
                        fetchInitialData();
                        if (form.getFieldValue('customer_id')) handleSearchHistory(form.getFieldValue('customer_id'));
                    }}
                    type="wholesale_sales"
                    title="Nhập danh sách bán buôn từ Excel"
                  />
              </Card>
            )
          },
          {
            key: '2',
            label: <Space><History size={18} /> LỊCH SỬ LÔ & THU NỢ</Space>,
            children: (
              <Row gutter={24}>
                <Col xs={24} lg={12}>
                  <Card 
                    title="Lịch sử Lô hàng" 
                    className="glass-card"
                    styles={{ body: { padding: 0 } }}
                  >
                    <Table 
                      dataSource={saleHistory} 
                      size="small" 
                      rowKey="id"
                      scroll={{ x: 'max-content' }}
                      columns={[
                        { title: 'Ngày Bán', dataIndex: 'sale_date', render: d => dayjs(d).format('DD/MM/YYYY') },
                        { title: 'Tổng Tiền', render: (_, r) => <b>{Number(r.total_amount_vnd).toLocaleString()}</b> },
                        { title: 'Còn Nợ', render: (_, r) => <Tag color="volcano">{(Number(r.total_amount_vnd) - Number(r.paid_amount_vnd)).toLocaleString()}</Tag> },
                        { title: '', render: (_, r) => <Button size="small" onClick={() => loadSaleDetails(r)}>Chi tiết</Button> }
                      ]}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title={selectedSale ? `Hóa đơn: ${dayjs(selectedSale?.sale_date).format('DD/MM/YYYY')}` : 'Chi tiết đơn'} className="glass-card">
                    {selectedSale ? (
                      <div className="lot-details">
                         <div style={{ marginBottom: 20 }}>
                            <Button 
                                block 
                                type="primary" 
                                style={{ background: canManageMoney ? '#10b981' : '#6b7280', height: 45, fontSize: 16 }} 
                                icon={<DollarSign size={20} />} 
                                onClick={() => setIsPaymentModalOpen(true)}
                                disabled={!canManageMoney}
                             >
                                {canManageMoney ? "THU TIỀN TỪ KHÁCH BUÔN" : "XEM LỊCH SỬ THU TIỀN"}
                             </Button>
                         </div>
                         <Text strong>- Xe trong lô:</Text>
                          <Table 
                             dataSource={saleDetails.vehicles} 
                             size="small" 
                             pagination={{ pageSize: 5 }}
                             rowKey="id"
                             scroll={{ x: 'max-content' }}
                             columns={[{ title: 'Số Máy', dataIndex: 'engine_no' }, { title: 'Số Khung', dataIndex: 'chassis_no' }, { title: 'Ghi chú xe', dataIndex: 'notes' }]}
                          />
                         <Divider />
                         <Text strong>- Lịch sử thu tiền:</Text>
                         <Table 
                            dataSource={saleDetails.payments} 
                            size="small" 
                            pagination={false}
                            rowKey="id"
                            columns={[{ title: 'Ngày thu', dataIndex: 'payment_date', render: d => dayjs(d).format('DD/MM/YYYY') }, { title: 'Số tiền thu', render: (_, r) => <Text strong color="#10b981">{Number(r.amount_paid_vnd).toLocaleString()} đ</Text> }]}
                         />
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '100px 0', opacity: 0.3 }}>
                         <Search size={64} style={{ marginBottom: 16 }} />
                         <br /><Text>Chọn danh sách bên trái để đối soát nợ</Text>
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            )
          }
        ]}
      />

      <Modal 
        title={<Space><DollarSign size={20} /> THU TIỀN TRẢ GÓP LÔ HÀNG</Space>}
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        footer={null}
        width={400}
      >
         <Form form={paymentForm} layout="vertical" onFinish={handlePayment} initialValues={{ date: dayjs() }}>
            <Form.Item label="Ngày khách trả tiền" name="date" rules={[{ required: true }]}>
               <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" size="large" />
            </Form.Item>
            <Form.Item label="Số tiền VNĐ" name="amount" rules={[{ required: true }]}>
               <InputNumber style={{ width: '100%' }} size="large" autoFocus formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => v.replace(/\$\s?|(,*)/g, '')}/>
            </Form.Item>
            <Form.Item label="Ghi chú" name="notes">
               <Input.TextArea placeholder="Nhập ghi chú thu tiền..." />
            </Form.Item>
            <Button block type="primary" htmlType="submit" size="large" style={{ background: '#10b981' }}>XÁC NHẬN THU NỢ</Button>
         </Form>
      </Modal>

      <style>{` .ant-table { background: transparent !important; } .ant-table-cell { background: transparent !important; color: white !important; } .ant-table-thead > tr > th { background: rgba(255,255,255,0.05) !important; color: var(--primary-color) !important; } `}</style>
    </div>
  );
};

export default WholesaleSalePage;
