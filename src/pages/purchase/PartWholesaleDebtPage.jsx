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
import { Truck, Users, Banknote } from "lucide-react";
import api from "../../utils/api";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const PartWholesaleDebtPage = () => {
  const [activeTab, setActiveTab] = useState("1");
  const [purchaseDebt, setPurchaseDebt] = useState([]);
  const [wholesaleDebt, setWholesaleDebt] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purchaseRes, salesRes] = await Promise.all([
        api.get("/part-purchases"),
        api.get("/part-sales?sale_type=Wholesale"),
      ]);

      setPurchaseDebt(purchaseRes.data.filter((s) => Number(s.total_amount) > Number(s.paid_amount)));
      setWholesaleDebt(salesRes.data.filter((s) => Number(s.total_amount) > Number(s.paid_amount)));
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
      const endpoint = type === 'PURCHASE' ? `/part-purchase/${id}/payment` : `/part-sale/${id}/payment`;
      
      await api.put(endpoint, { amount: values.amount });
      message.success("Đã cập nhật thanh toán!");
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error("Lỗi thanh toán: " + error.message);
    }
  };

  const purchaseColumns = [
    {
      title: "Ngày nhập",
      dataIndex: "purchase_date",
      render: (d) => dayjs(d).format("DD/MM/YYYY"),
    },
    { title: "Nhà cung cấp", render: (_, r) => r.Supplier?.name },
    { title: "Hóa đơn", dataIndex: "invoice_no" },
    {
      title: "Tổng tiền",
      dataIndex: "total_amount",
      render: (v) => <Text strong>{Number(v).toLocaleString()} đ</Text>,
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
          onClick={() => handleOpenPayment(r, 'PURCHASE')}
        >
          Trả tiền
        </Button>
      ),
    },
  ];

  const wholesaleColumns = [
    {
      title: "Ngày bán",
      dataIndex: "sale_date",
      render: (d) => dayjs(d).format("DD/MM/YYYY"),
    },
    { title: "Khách sỉ", dataIndex: "customer_name" },
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
          onClick={() => handleOpenPayment(r, 'SALE')}
        >
          Thu nợ
        </Button>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="gradient-text">QUẢN LÝ NỢ PHỤ TÙNG MUA/BÁN BUÔN</Title>
      </div>

      <Card className="glass-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "1",
              label: <Space><Truck size={18} /> NỢ NHÀ CUNG CẤP (MUA VÀO)</Space>,
              children: (
                <Table
                  dataSource={purchaseDebt}
                  columns={purchaseColumns}
                  rowKey="id"
                  loading={loading}
                />
              ),
            },
            {
              key: "2",
              label: <Space><Users size={18} /> NỢ KHÁCH SỈ (BÁN RA)</Space>,
              children: (
                <Table
                  dataSource={wholesaleDebt}
                  columns={wholesaleColumns}
                  rowKey="id"
                  loading={loading}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Ghi nhận thanh toán"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handlePayment}>
          <Form.Item label="Số tiền thanh toán" name="amount" rules={[{ required: true }]}>
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

export default PartWholesaleDebtPage;
