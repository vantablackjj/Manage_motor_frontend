import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Select, 
  DatePicker, 
  Button, 
  Table, 
  Card, 
  Row, 
  Col, 
  Typography, 
  Space, 
  Divider, 
  Statistic,
  message,
  Tag
} from 'antd';
import { 
  Search, 
  FileText, 
  Printer, 
  Download, 
  Users, 
  Calendar,
  DollarSign,
  Car,
  History
} from 'lucide-react';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const WholesaleCustomerAudit = () => {
// ... existing state ...
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ vehicles: [], payments: [], summary: { total_amount: 0, paid_amount: 0, balance: 0 } });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleExport = () => {
    if (!data.vehicles || data.vehicles.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const customer = customers.find(c => c.id === form.getFieldValue('customer_id'));
    const customerName = customer ? customer.name : 'KhachBuon';

    const exportData = data.vehicles.map(v => ({
      'Ngày Bán': dayjs(v.sale_date).format('DD/MM/YYYY'),
      'Loại Xe': v.type_name,
      'Số Máy': v.engine_no,
      'Số Khung': v.chassis_no,
      'Màu Xe': v.color_name,
      'Giá Bán Ước Tính': (Number(v.sale_price_lot) / (Number(v.lot_vehicles_count) || 1))
    }));

    exportToExcel(exportData, `DoiSoat_${customerName}_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const fetchCustomers = async () => {
// ... existing fetchCustomers ...
  };
// ... rest of the component ...

  const handleSearch = async (values) => {
// ... existing handleSearch ...
  };

  const vehicleColumns = [
    { 
      title: 'Ngày Nhập', 
      dataIndex: 'import_date', 
      render: d => d ? dayjs(d).format('DD/MM/YYYY') : 'N/A' 
    },
    { title: 'Người Nhập', dataIndex: 'importer_name' },
    { 
      title: 'Ngày Bán', 
      dataIndex: 'sale_date', 
      render: d => <Text strong color="var(--primary-color)">{dayjs(d).format('DD/MM/YYYY')}</Text> 
    },
    { title: 'Loại Xe', dataIndex: 'type_name' },
    { title: 'Số Máy', dataIndex: 'engine_no', className: 'strong-text' },
    { title: 'Số Khung', dataIndex: 'chassis_no', className: 'strong-text' },
    { title: 'Màu Xe', dataIndex: 'color_name' },
    { 
      title: 'Giá Bán (VNĐ)', 
      render: (_, r) => {
          // Tính toán giá xấp xỉ vì dữ liệu hiện tại chưa lưu giá lẻ trong lô
          const avgPrice = Number(r.sale_price_lot) / (Number(r.lot_vehicles_count) || 1);
          return <Text strong style={{ color: '#10b981' }}>{avgPrice.toLocaleString()} đ</Text>
      }
    }
  ];

  const paymentColumns = [
    { 
      title: 'Ngày Trả', 
      dataIndex: 'payment_date', 
      render: d => dayjs(d).format('DD/MM/YYYY') 
    },
    { 
      title: 'Số Tiền Trả', 
      dataIndex: 'amount_paid_vnd', 
      render: v => <Text strong>{Number(v).toLocaleString()} đ</Text> 
    },
    { title: 'Ghi chú', dataIndex: 'notes' }
  ];

  return (
    <div style={{ padding: '0 5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>XEM THÔNG TIN ĐỐI SOÁT KHÁCH BUÔN</Title>
        <Space>
           <Button icon={<Printer size={16} />}>In báo cáo</Button>
           <Button 
            type="primary" 
            icon={<Download size={16} />}
            onClick={handleExport}
           >
            Xuất Excel
           </Button>
        </Space>
      </div>

      <Card className="glass-card" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleSearch}>
          <Row gutter={24} align="bottom">
            <Col xs={24} md={10}>
              <Form.Item label="Chọn khách hàng cần xem" name="customer_id" rules={[{ required: true }]}>
                <Select size="large" showSearch placeholder="Tìm tên khách hàng...">
                  {customers.map(c => <Option key={c.id} value={c.id}>{c.customer_code} - {c.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Khoảng thời gian" name="dates">
                <RangePicker size="large" style={{ width: '100%' }} format="DD/MM/YYYY" placeholder={['Từ ngày', 'Đến ngày']} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item>
                <Button type="primary" size="large" block icon={<Search size={18} />} htmlType="submit" loading={loading} style={{ background: 'var(--primary-color)' }}>
                  TRA CỨU DỮ LIỆU
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Row gutter={24}>
        <Col span={24}>
          <Card title={<Space><Car size={18} /> DANH SÁCH XE ĐÃ BÁN</Space>} className="glass-card table-card" style={{ marginBottom: 24 }}>
            <Table 
              dataSource={data.vehicles} 
              columns={vehicleColumns} 
              rowKey="id" 
              size="small" 
              pagination={{ pageSize: 8 }}
              loading={loading}
              scroll={{ x: 1000 }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card title={<Space><History size={18} /> QUÁ TRÌNH TRẢ TIỀN</Space>} className="glass-card table-card">
            <Table 
              dataSource={data.payments} 
              columns={paymentColumns} 
              rowKey="id" 
              size="small" 
              pagination={{ pageSize: 5 }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title={<Space><DollarSign size={18} /> TỔNG HỢP CÔNG NỢ (VND)</Space>} className="glass-card">
             <div style={{ padding: '10px 0' }}>
                <Row gutter={[16, 16]}>
                    <Col span={24}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 12 }}>
                            <Statistic 
                                title="TỔNG TIỀN PHẢI TRẢ" 
                                value={data.summary.total_amount} 
                                suffix="đ"
                                valueStyle={{ color: 'white' }}
                            />
                        </div>
                    </Col>
                    <Col span={24}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: 15, borderRadius: 12 }}>
                            <Statistic 
                                title="SỐ TIỀN ĐÃ TRẢ" 
                                value={data.summary.paid_amount} 
                                suffix="đ"
                                valueStyle={{ color: '#10b981' }}
                            />
                        </div>
                    </Col>
                    <Col span={24}>
                        <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 15, borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                            <Statistic 
                                title="SỐ TIỀN CÒN NỢ" 
                                value={data.summary.balance} 
                                suffix="đ"
                                valueStyle={{ color: '#ef4444', fontWeight: 'bold' }}
                            />
                        </div>
                    </Col>
                </Row>
             </div>
          </Card>
        </Col>
      </Row>

      <style>{`
        .strong-text {
          font-weight: 600;
          color: var(--primary-color);
        }
        .table-card .ant-card-body {
          padding: 0;
        }
        .ant-table {
          background: transparent !important;
        }
        .ant-table-thead > tr > th {
          background: rgba(255,255,255,0.03) !important;
          color: rgba(255,255,255,0.6) !important;
          font-size: 11px;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
};

export default WholesaleCustomerAudit;
