import React, { useState, useEffect } from "react";
import {
  Table,
  Card,
  Typography,
  Tabs,
  Button,
  Modal,
  Form,
  InputNumber,
  message,
  Tag,
  Space,
} from "antd";
import { Banknote, History, Wrench, ShoppingBag } from "lucide-react";
import api from "../../utils/api";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const PartRetailDebtPage = () => {
  const [activeTab, setActiveTab] = useState("1");
  const [salesDebt, setSalesDebt] = useState([]);
  const [serviceDebt, setServiceDebt] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, serviceRes] = await Promise.all([
        api.get("/part-sales?sale_type=Retail"),
        api.get("/maintenance-orders"),
      ]);

      // Filter for debts
      setSalesDebt(salesRes.data.filter((s) => Number(s.total_amount) > Number(s.paid_amount)));
      setServiceDebt(serviceRes.data.filter((s) => Number(s.total_amount) > Number(s.paid_amount)));
    } catch (error) {
      message.error("Lỗi tải dữ liệu nợ: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenPayment = (record, type) => {
    setSelectedRecord({ ...record, type });
    setIsModalOpen(true);
    const remaining = Number(record.total_amount) - Number(record.paid_amount);
    form.setFieldsValue({ amount: remaining });
  };

  const handlePayment = async (values) => {
    try {
      const { id, type } = selectedRecord;
      const endpoint = type === 'SALE' ? `/part-sale/${id}/payment` : `/maintenance-order/${id}/payment`;
      
      await api.put(endpoint, { amount: values.amount });
      message.success("Đã cập nhật thanh toán!");
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error("Lỗi thanh toán: " + error.message);
    }
  };

  const salesColumns = [
    {
      title: "Ngày bán",
      dataIndex: "sale_date",
      render: (d) => dayjs(d).format("DD/MM/YYYY"),
    },
    { title: "Khách hàng", dataIndex: "customer_name" },
    { title: "SĐT", dataIndex: "customer_phone" },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      render: (v) => <Text strong>{Number(v).toLocaleString()} đ</Text>,
    },
    {
      title: "Đã trả",
      dataIndex: "paid_amount",
      render: (v) => <Text type="success">{Number(v).toLocaleString()} đ</Text>,
    },
    {
      title: "Còn nợ",
      render: (_, r) => (
        <Tag color="red">
          {(Number(r.total_amount) - Number(r.paid_amount)).toLocaleString()} đ
        </Tag>
      ),
    },
    {
      title: "Thanh toán",
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          icon={<Banknote size={14} />}
          onClick={() => handleOpenPayment(r, 'SALE')}
        >
          Trả nợ
        </Button>
      ),
    },
  ];

  const serviceColumns = [
    {
      title: "Ngày sửa",
      dataIndex: "maintenance_date",
      render: (d) => dayjs(d).format("DD/MM/YYYY"),
    },
    { title: "Biển số / Xe", render: (_, r) => r.license_plate || r.model_name },
    { title: "Khách hàng", dataIndex: "customer_name" },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      render: (v) => <Text strong>{Number(v).toLocaleString()} đ</Text>,
    },
    {
      title: "Còn nợ",
      render: (_, r) => (
        <Tag color="volcano">
          {(Number(r.total_amount) - Number(r.paid_amount)).toLocaleString()} đ
        </Tag>
      ),
    },
    {
      title: "Thanh toán",
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handleOpenPayment(r, 'SERVICE')}
        >
          Trả nợ
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="gradient-text">QUẢN LÝ NỢ PHỤ TÙNG BÁN LẺ</Title>
      </div>

      <Card className="glass-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "1",
              label: <Space><ShoppingBag size={18} /> NỢ TỪ BÁN LẺ</Space>,
              children: (
                <Table
                  dataSource={salesDebt}
                  columns={salesColumns}
                  rowKey="id"
                  loading={loading}
                />
              ),
            },
            {
              key: "2",
              label: <Space><Wrench size={18} /> NỢ TỪ DỊCH VỤ SỬA CHỮA</Space>,
              children: (
                <Table
                  dataSource={serviceDebt}
                  columns={serviceColumns}
                  rowKey="id"
                  loading={loading}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Ghi nhận thanh toán trả nợ"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handlePayment}>
          <Form.Item label="Số tiền thanh toán thêm" name="amount" rules={[{ required: true }]}>
            <InputNumber
              style={{ width: "100%" }}
              size="large"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              parser={(v) => v.replace(/\$\s?|(\.*)/g, "")}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PartRetailDebtPage;
