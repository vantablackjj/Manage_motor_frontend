import React, { useState, useEffect } from "react";
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
  message,
  Card,
  Popconfirm,
  Badge,
  Alert,
  Tag,
  Collapse,
  Checkbox,
  Modal,
} from "antd";

const { Panel } = Collapse;

import {
  ShoppingBag,
  Save,
  Trash2,
  Car,
  AlertTriangle,
  User,
  UserPlus,
  Smartphone,
  MapPin,
  FileSpreadsheet,
  Download,
  Banknote,
  RotateCcw,
  Printer,
} from "lucide-react";
import dayjs from "dayjs";
import api from "../../utils/api";
import ImportExcelModal from "../../components/ImportExcelModal";
import { exportToExcel } from "../../utils/excelExport";
import PrintInvoice from "../../components/PrintInvoice";

const { Text, Title } = Typography;
const { Option } = Select;

const RetailSalePage = () => {
  const [form] = Form.useForm();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "ADMIN";
  const canManageDebt =
    isAdmin || user.can_manage_debt === true || user.can_manage_debt === 1;
  const canDelete =
    isAdmin || user.can_delete === true || user.can_delete === 1;
  const canManageMoney =
    isAdmin || user.can_manage_money === true || user.can_manage_money === 1;

  const [salesHistory, setSalesHistory] = useState([]);
  const [availableStock, setAvailableStock] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPriceWarning, setShowPriceWarning] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    user.warehouse_id,
  );
  const [importVisible, setImportVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentForm] = Form.useForm();
  // printSale state removed - now using window.open approach
  const [searchText, setSearchText] = useState("");
  const [showOnlyDebt, setShowOnlyDebt] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async (warehouseId = selectedWarehouseId) => {
    try {
      const [salesRes, stockRes, whRes, empRes] = await Promise.all([
        api.get("/retail-sales"),
        api.get(
          `/inventory/available${warehouseId ? `?warehouse_id=${warehouseId}` : ""}`,
        ),
        isAdmin ? api.get("/warehouses") : Promise.resolve({ data: [] }),
        api.get("/auth/users"),
      ]);
      setSalesHistory(salesRes.data);
      setAvailableStock(stockRes.data);
      if (isAdmin) setWarehouses(whRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      message.error("Lỗi tải dữ liệu: " + error.message);
    }
  };

  const handleWarehouseChange = (val) => {
    setSelectedWarehouseId(val);
    form.resetFields(["engine_no", "chassis_no"]);
    setSelectedVehicle(null);
    fetchInitialData(val);
  };

  const handleVehicleSelect = (id) => {
    const vehicle = availableStock.find((v) => v.id === id);
    if (vehicle) {
      setSelectedVehicle(vehicle);
      form.setFieldsValue({
        engine_no: vehicle.engine_no,
        chassis_no: vehicle.chassis_no,
      });

      setShowPriceWarning(false);
    }
  };

  const handlePriceChange = (value, currentVehicle = selectedVehicle) => {
    if (currentVehicle && currentVehicle.price_vnd) {
      if (Number(value) < Number(currentVehicle.price_vnd)) {
        setShowPriceWarning(true);
      } else {
        setShowPriceWarning(false);
      }
    }
    // Tự động gợi ý trả đủ (có trừ đi tiền vay nếu có)
    const loan = form.getFieldValue("loan_amount") || 0;
    const target = (value || 0) - loan;
    form.setFieldsValue({
      paid_amount: target,
      cash_amount: target,
      transfer_amount: 0,
    });
  };

  const handlePaymentChange = (type, value) => {
    const cash =
      type === "cash" ? value : form.getFieldValue("cash_amount") || 0;
    const transfer =
      type === "transfer" ? value : form.getFieldValue("transfer_amount") || 0;
    form.setFieldsValue({
      paid_amount: Number(cash) + Number(transfer),
    });
  };

  const onFinish = async (values) => {
    try {
      setLoading(true);
      await api.post("/retail-sales", {
        ...values,
        vehicle_id: selectedVehicle ? selectedVehicle.id : null,
        warehouse_id: selectedWarehouseId,
        sale_date: values.sale_date.toISOString(),
        guarantee: values.guarantee ? "Có" : "Không",
        loan_amount: values.loan_amount || 0,
      });
      message.success("Đã bán lẻ xe thành công!");
      form.resetFields();
      setSelectedVehicle(null);
      setShowPriceWarning(false);
      fetchInitialData();
    } catch (error) {
      message.error("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await api.delete(`/retail-sales/${id}`);
      message.success(
        "Đã hủy đơn bán và khôi phục xe về trạng thái 'Trong kho'!",
      );
      fetchInitialData();
    } catch (error) {
      message.error(
        "Lỗi khi hủy đơn: " + (error.response?.data?.message || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = async (sale) => {
    try {
      setSelectedSale(sale);
      const res = await api.get(`/retail-sales/${sale.id}/payments`);
      setPaymentHistory(res.data);
      setPaymentModalVisible(true);
      const price = Number(sale.sale_price || sale.total_price || 0);
      const paid = Number(sale.paid_amount || 0);
      const loan = Number(sale.loan_amount || 0);
      paymentForm.setFieldsValue({
        payment_date: dayjs(),
        amount: Math.max(0, price - paid - loan),
      });
    } catch (error) {
      message.error("Không thể tải lịch sử trả tiền: " + error.message);
    }
  };

  const onAddPayment = async (values) => {
    try {
      setLoading(true);
      await api.post("/retail-payments", {
        ...values,
        retail_sale_id: selectedSale.id,
        payment_date: values.payment_date.toISOString(),
      });
      message.success("Đã thêm khoản thanh toán!");
      paymentForm.resetFields(["amount", "notes"]);

      // Refresh data
      const res = await api.get(`/retail-sales/${selectedSale.id}/payments`);
      setPaymentHistory(res.data);

      fetchInitialData(); // Refresh history table
    } catch (error) {
      message.error("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePayment = async (id) => {
    try {
      await api.delete(`/retail-payments/${id}`);
      message.success("Đã xóa khoản thanh toán");
      const res = await api.get(`/retail-sales/${selectedSale.id}/payments`);
      setPaymentHistory(res.data);
      fetchInitialData();
    } catch (error) {
      message.error("Lỗi: " + error.message);
    }
  };

  const handlePrint = (sale) => {
    const warehouse = sale.Warehouse || sale.warehouse || sale.Store || {};
    const vehicle = sale.Vehicle || sale.vehicle || {};
    const seller = sale.Seller || sale.seller || sale.User || {};
    const loan = Number(sale.loan_amount || 0);
    const paid = Number(sale.paid_amount || 0);
    const price = Number(sale.sale_price || 0);
    const debt = price - paid - loan;

    // Simple Vietnamese number-to-words converter
    const toViWords = (n) => {
      if (n <= 0) return "Không đồng";
      const units = [
        "",
        "một",
        "hai",
        "ba",
        "bốn",
        "năm",
        "sáu",
        "bảy",
        "tám",
        "chín",
      ];
      const readGroup = (num) => {
        const h = Math.floor(num / 100),
          t = Math.floor((num % 100) / 10),
          u = num % 10;
        let res = "";
        if (h > 0) res += units[h] + " trăm ";
        if (t > 1)
          res +=
            [
              "",
              "mười",
              "hai mươi",
              "ba mươi",
              "bốn mươi",
              "năm mươi",
              "sáu mươi",
              "bảy mươi",
              "tám mươi",
              "chín mươi",
            ][t] + (u > 0 ? " " + units[u] : "");
        else if (t === 1) res += "mười" + (u > 0 ? " " + units[u] : "");
        else if (u > 0 && h > 0) res += "lẻ " + units[u];
        else if (u > 0) res += units[u];
        return res.trim();
      };
      const groups = [],
        labels = ["", " nghìn", " triệu", " tỷ"];
      let temp = n;
      while (temp > 0) {
        groups.push(temp % 1000);
        temp = Math.floor(temp / 1000);
      }
      let result = "";
      for (let i = groups.length - 1; i >= 0; i--) {
        if (groups[i] > 0) result += readGroup(groups[i]) + labels[i] + " ";
      }
      const r = result.trim();
      return r.charAt(0).toUpperCase() + r.slice(1) + " đồng";
    };

    const dateObj = sale.sale_date ? new Date(sale.sale_date) : new Date();
    const dd = String(dateObj.getDate()).padStart(2, "0");
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const yyyy = dateObj.getFullYear();
    const getHeadName = (whName) => {
      const name = (whName || "").toUpperCase();
      if (name.includes("NINH MỸ") || name.includes("NINH MY"))
        return "THANH HẢI 1";
      if (name.includes("KIM SƠN") || name.includes("KIM SON"))
        return "THANH HẢI 2";
      if (name.includes("TH3")) return "THANH HẢI 3";
      return "THANH HẢI";
    };
    const headName = getHeadName(warehouse.warehouse_name);

    const formatSN = (no) => {
      if (!no) return "................";
      return no.replace(/\s/g, ""); // Just remove spaces, keep original dashes if any or none.
    };

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>&nbsp;</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Times New Roman", Times, serif; font-size: 11.5pt; line-height: 1.35; color: #000; background: white; }
    .page { padding: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px; }
    .logo-side { width: 120px; text-align: center; }
    .logo-side img { width: 90px; height: auto; }
    .head-text { font-size: 8.5pt; font-weight: bold; margin-top: 3px; }
    .nat-side { flex: 1; text-align: right; padding-left: 15px; }
    .nat-title { font-weight: bold; font-size: 12.5pt; }
    .nat-sub { font-weight: bold; font-size: 11.5pt; }
    .underline { width: 160px; height: 1.2px; background: #000; margin: 1px 0 0 auto; }
    .title-main { text-align: center; font-size: 19pt; font-weight: bold; margin: 8px 0 4px; }
    .title-date { text-align: center; font-style: italic; margin-bottom: 8px; font-size: 11pt; }
    .row { display: flex; width: 100%; margin: 2px 0; align-items: flex-start; }
    .col { flex: 0 0 50%; display: flex; min-width: 0; }
    .lbl { width: 115px; display: inline-block; color: #000; font-weight: normal; flex-shrink: 0; }
    .val { font-weight: bold; flex: 1; word-break: break-word; }
    .footer-text { font-size: 10pt; margin-top: 10px; line-height: 1.3; font-style: italic; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 15px; text-align: center; }
    .sig-box { flex: 1; }
    .sig-title { font-weight: bold; font-size: 11pt; }
    .sig-guide { font-size: 9.5pt; font-style: italic; margin-bottom: 45px; }
    .sig-name { font-weight: bold; }
    @page { margin: 10mm 15mm 10mm 15mm; size: A4; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-side">
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/1200px-Honda_Logo.svg.png" alt="Honda" onerror="this.style.display='none'"/>
      <div class="head-text">HEAD ${headName}</div>
    </div>
    <div class="nat-side">
      <div class="nat-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="nat-sub">Độc lập - Tự do - Hạnh phúc</div>
      <div class="underline"></div>
    </div>
  </div>
  <div class="title-main">HỢP ĐỒNG MUA BÁN XE MÁY</div>
  <div class="title-date">${warehouse.location || "Ninh Bình"}, ngày ${dd} tháng ${mm} năm ${yyyy}</div>
  <div style="font-weight:bold;text-decoration:underline;margin:5px 0 3px; font-size: 11pt">CHÚNG TÔI GỒM :</div>
  <div style="font-weight:bold;margin-top:2px; font-size: 11pt">1 - ĐẠI DIỆN BÊN BÁN XE (A) :</div>
  <div class="row"><div class="val" style="text-transform:uppercase">${warehouse.warehouse_name || "................................................................................"}</div></div>
  <div class="row"><span class="lbl">Địa chỉ :</span><span class="val">${[warehouse.address, warehouse.location].filter(Boolean).join(", ") || "................................................................................"}</span></div>
  <div class="row">
    <div class="col"><span class="lbl">Điện thoại :</span><span class="val">${warehouse.phone || "......................"}</span></div>
    <div class="col"><span class="lbl">Di động :</span><span class="val">${warehouse.mobile || "......................"}</span></div>
  </div>
  <div class="row">
    <div class="col"><span class="lbl">Do ông :</span><span class="val">${warehouse.manager_name || "......................"}</span></div>
    <div class="col"><span class="lbl">Chức vụ :</span><span class="val">Cửa hàng trưởng</span></div>
  </div>
  <div style="font-weight:bold;margin-top:10px; font-size: 11pt">2 - ĐẠI DIỆN BÊN MUA XE (B) :</div>
  <div class="row">
    <div class="col"><span class="lbl">Do ông (bà) :</span><span class="val">${sale.customer_name || ""}</span></div>
    <div class="col"><span class="lbl">Số CMND :</span><span class="val">${sale.id_card || "................"}</span></div>
  </div>
  <div class="row"><span class="lbl">Địa chỉ :</span><span class="val">${sale.address || "................................................................................"}</span></div>
  <div class="row">
    <div class="col"><span class="lbl">Điện thoại :</span><span class="val">${sale.phone || "......................"}</span></div>
    <div class="col"><span class="lbl">Người bảo lãnh :</span><span class="val">${sale.guarantor_name || "................................"}</span></div>
  </div>
  <div style="font-weight:bold;margin-top:10px; font-size: 11pt">3 - NỘI DUNG HỢP ĐỒNG :</div>
  <div style="margin-top:4px">Bên A bán cho bên B - 01 chiếc xe máy. Giá xe hai bên đã thỏa thuận.</div>
  <div class="row" style="margin-top:2px"><span class="lbl">Xe bao gồm :</span><span class="val">${sale.sale_type === "Đăng ký" ? "Đăng ký xe" : "Hồ sơ xe"}</span></div>
  <div class="row">
    <div class="col"><span class="lbl">Loại xe :</span><span class="val">${vehicle.VehicleType?.name || "................"}</span></div>
    <div class="col"><span class="lbl">Màu :</span><span class="val">${vehicle.VehicleColor?.color_name || "................"}</span></div>
  </div>
  <div class="row">
    <div class="col"><span class="lbl">Số máy :</span><span class="val">${formatSN(sale.engine_no)}</span></div>
    <div class="col"><span class="lbl">Số khung :</span><span class="val">${formatSN(sale.chassis_no)}</span></div>
  </div>
  <div class="row" style="margin-top:2px">
    <div class="col"><span class="lbl">Giá bán :</span><span class="val">${price.toLocaleString("vi-VN")} đ</span></div>
    <div class="col"><span class="lbl">Đã trả (TM/CK) :</span><span class="val">${paid.toLocaleString("vi-VN")} đ</span></div>
  </div>
  ${
    sale.payment_method === "Trả góp"
      ? `
  <div class="row">
    <div class="col"><span class="lbl">Trả góp :</span><span class="val">${loan.toLocaleString("vi-VN")} đ</span></div>
    <div class="col"><span class="lbl">Ngân hàng :</span><span class="val">....................................................</span></div>
  </div>
  `
      : ""
  }
  <div class="row">
    <div class="col"><span class="lbl">Còn nợ lại :</span><span class="val" style="font-size:12pt">${debt.toLocaleString("vi-VN")} đ</span></div>
  </div>
  <div class="row"><span class="lbl">Bằng chữ :</span><span class="val" style="font-style:italic">${toViWords(debt)} .</span></div>
  <div style="margin-top:6px">Hẹn đến ngày ....... tháng ....... năm 20....... , Ông (Bà) <b>${sale.customer_name || ""}</b> phải trả hết số tiền còn nợ cho công ty chúng tôi và nhận Đăng ký xe .</div>
  <div class="footer-text">
    - Nếu quá hạn thanh toán 1 tháng khách hàng phải chịu lãi suất 3%/tháng.<br>
    - Nếu quá hạn thanh toán 2 tháng tôi xin chịu chấp nhận cho công ty thu hồi xe và xin chịu mọi phí tổn hao mòn xe, bồi thường cho <b style="text-transform:uppercase">HEAD ${headName}</b>.<br>
    (Tôi xin cam kết thực hiện nghiêm chỉnh hợp đồng trên. Nếu sai tôi xin chịu hoàn toàn trách nhiệm trước pháp luật.)
  </div>
  <div class="row" style="margin-top:6px"><b>Ghi chú :</b><span style="border-bottom:1px dotted #000;flex:1;margin-left:8px;min-height:1.2em;display:block"></span></div>
  <div class="sig-row">
    <div class="sig-box"><div class="sig-title">Người mua xe ký</div><div class="sig-guide">(Ký và ghi rõ họ tên)</div></div>
    <div class="sig-box"><div class="sig-title">Người bảo lãnh</div><div class="sig-guide">(Ký và ghi rõ họ tên)</div></div>
    <div class="sig-box"><div class="sig-title">Đại diện bên bán xe</div><div class="sig-guide">(Ký và đóng dấu)</div></div>
  </div>
</div>
<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

    const pw = window.open("", "_blank", "width=850,height=700");
    if (pw) {
      pw.document.write(html);
      pw.document.close();
    } else {
      message.warning(
        "Trình duyệt đã chặn cửa sổ pop-up. Vui lòng cho phép pop-up cho trang này.",
      );
    }
  };

  const columns = [
    {
      title: "Ngày bán",
      dataIndex: "sale_date",
      key: "date",
      render: (d) => dayjs(d).format("DD/MM/YYYY"),
    },
    { title: "Số Máy", dataIndex: "engine_no", key: "engine_no" },
    { title: "Tên Khách", dataIndex: "customer_name", key: "customer" },
    {
      title: "Giá bán",
      dataIndex: "sale_price",
      render: (v) => <b>{Number(v).toLocaleString()}</b>,
    },
    {
      title: "Loại TT",
      dataIndex: "payment_method",
      render: (v) => <Tag color={v === "Trả góp" ? "orange" : "blue"}>{v}</Tag>,
    },
    {
      title: "Đã trả",
      dataIndex: "paid_amount",
      render: (v) => <Text type="success">{Number(v).toLocaleString()}</Text>,
    },
    {
      title: "Còn nợ",
      key: "debt",
      render: (_, r) => {
        const price = Number(r.sale_price || r.total_price || 0);
        const paid = Number(r.paid_amount || 0);
        const loan = Number(r.loan_amount || 0);
        const debt = price - paid - loan;
        return debt > 0 ? (
          <Text type="danger" strong>
            {Number(debt).toLocaleString()}
          </Text>
        ) : (
          <Tag color="green">Đã đủ</Tag>
        );
      },
    },
    {
      title: "Tác vụ",
      key: "action",
      render: (_, r) => (
        <Space>
          {canManageMoney && (
            <Button
              type="text"
              icon={<Banknote size={16} />}
              onClick={() => handleOpenPaymentModal(r)}
              title="Lịch sử trả tiền"
            />
          )}
          <Button
            type="text"
            icon={<Printer size={16} />}
            onClick={() => handlePrint(r)}
            title="In hợp đồng"
            style={{ color: "#1890ff" }}
          />
          {canDelete && (
            <Popconfirm
              title="Hủy đơn bán này?"
              description="Xe sẽ được khôi phục về trạng thái 'Trong kho'. Tiếp tục?"
              onConfirm={() => handleDelete(r.id)}
              okText="Xác nhận"
              cancelText="Bỏ qua"
            >
              <Button
                type="text"
                danger
                icon={<RotateCcw size={16} />}
                title="Hủy đơn / Đổi xe"
              />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const handleExport = () => {
    if (salesHistory.length === 0)
      return message.warning("Không có lịch sử để xuất!");
    const exportData = salesHistory.map((s) => ({
      "Ngày bán": dayjs(s.sale_date).format("DD/MM/YYYY"),
      "Số Máy": s.engine_no,
      "Số Khung": s.chassis_no,
      "Tên Khách": s.customer_name,
      SĐT: s.phone,
      "Hình thức": s.payment_method,
      "Ngân hàng": s.bank_name || "",
      "Số hợp đồng": s.contract_number || "",
      "Tiền vay": Number(s.loan_amount || 0),
      "Giá bán": Number(s.sale_price || s.total_price),
      "Đã trả": Number(s.paid_amount),
      "NV Bán": s.seller?.full_name || "N/A",
    }));
    exportToExcel(exportData, `LichSuBanLe_${dayjs().format("YYYYMMDD_HHmm")}`);
  };

  const filteredHistory = salesHistory.filter((s) => {
    const matchesSearch =
      s.engine_no?.toLowerCase().includes(searchText.toLowerCase()) ||
      s.customer_name?.toLowerCase().includes(searchText.toLowerCase()) ||
      s.phone?.includes(searchText);

    const hasDebt = (s.sale_price || s.total_price) - s.paid_amount > 0;

    if (showOnlyDebt) {
      return matchesSearch && hasDebt;
    }
    return matchesSearch;
  });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>
          BÁN LẺ XE MÁY
        </Title>
        <Badge
          count={availableStock.length}
          color="#10b981"
          title="Xe đang có trong kho"
        >
          <Button icon={<Car size={18} />} ghost>
            Tồn kho: {availableStock.length} xe
          </Button>
        </Badge>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={11}>
          <Card
            title={
              <Space>
                <ShoppingBag size={18} /> Hóa đơn bán lẻ
              </Space>
            }
            className="glass-card"
            extra={
              selectedVehicle && (
                <div style={{ textAlign: "right" }}>
                  <Tag color="blue">{selectedVehicle.VehicleType?.name}</Tag>
                  <Tag color="purple">
                    {selectedVehicle.VehicleColor?.color_name}
                  </Tag>
                </div>
              )
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              initialValues={{
                sale_type: "Hồ sơ xe",
                guarantee: false,
                seller_id: user.id,
                payment_method: "Trả thẳng",
                loan_amount: 0,
                cash_amount: 0,
                transfer_amount: 0,
              }}
            >
              <Row gutter={[16, 16]}>
                <Col xs={12} md={isAdmin ? 8 : 12}>
                  <Form.Item
                    label="Ngày bán hàng"
                    name="sale_date"
                    rules={[{ required: true }]}
                  >
                    <DatePicker
                      style={{ width: "100%" }}
                      format="DD/MM/YYYY"
                      size="large"
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={isAdmin ? 8 : 12}>
                  <Form.Item
                    label="Người bán"
                    name="seller_id"
                    rules={[{ required: true }]}
                  >
                    <Select
                      size="large"
                      showSearch
                      placeholder="Chọn nhân viên bán..."
                      optionFilterProp="children"
                      disabled={!isAdmin}
                    >
                      {employees.map((e) => (
                        <Option key={e.id} value={e.id}>
                          {e.full_name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                {isAdmin && (
                  <Col xs={24} md={8}>
                    <Form.Item label="Kho xuất bán" required>
                      <Select
                        size="large"
                        showSearch
                        value={selectedWarehouseId}
                        onChange={handleWarehouseChange}
                        placeholder="Chọn kho..."
                        optionFilterProp="children"
                      >
                        {warehouses.map((w) => (
                          <Option key={w.id} value={w.id}>
                            {w.warehouse_name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                )}
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Số Máy (Tìm xe)"
                    name="engine_no"
                    rules={[{ required: true }]}
                  >
                    <Select
                      showSearch
                      size="large"
                      placeholder="Chọn số máy..."
                      onChange={handleVehicleSelect}
                      optionFilterProp="children"
                    >
                      {availableStock.map((v) => (
                        <Option key={v.id} value={v.id}>
                          {v.engine_no}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Số Khung (Tìm xe)"
                    name="chassis_no"
                    rules={[{ required: true }]}
                  >
                    <Select
                      showSearch
                      size="large"
                      placeholder="Chọn số khung..."
                      onChange={handleVehicleSelect}
                      optionFilterProp="children"
                    >
                      {availableStock.map((v) => (
                        <Option key={v.id} value={v.id}>
                          {v.chassis_no}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Tên khách mua"
                    name="customer_name"
                    rules={[{ required: true }]}
                  >
                    <Input
                      size="large"
                      placeholder="Họ và tên khách hàng..."
                      prefix={<User size={16} />}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item label="Số điện thoại" name="phone">
                    <Input
                      size="large"
                      placeholder="09xxx..."
                      prefix={<Smartphone size={16} />}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Item label="Số CCCD" name="id_card">
                    <Input size="large" placeholder="CCCD..." />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={16} md={18}>
                  <Form.Item label="Địa chỉ" name="address">
                    <Input
                      size="large"
                      placeholder="Tỉnh, Huyện, Xã..."
                      prefix={<MapPin size={16} />}
                    />
                  </Form.Item>
                </Col>
                <Col xs={8} md={6}>
                  <Form.Item label="Giới tính" name="gender">
                    <Select size="large">
                      <Option value="Trai">Nam</Option>
                      <Option value="Gái">Nữ</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Giá bán"
                    name="sale_price"
                    rules={[{ required: true }]}
                  >
                    <InputNumber
                      size="large"
                      style={{ width: "100%" }}
                      onChange={handlePriceChange}
                      formatter={(v) =>
                        `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                      }
                      parser={(v) => v.replace(/\$\s?|(\.*)/g, "")}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Hồ sơ / Đăng ký" name="sale_type">
                    <Select size="large">
                      <Option value="Hồ sơ xe">Giao hồ sơ</Option>
                      <Option value="Đăng ký">Làm đăng ký</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={12} md={8}>
                  <Form.Item label="Tiền mặt" name="cash_amount">
                    <InputNumber
                      size="large"
                      style={{ width: "100%" }}
                      onChange={(v) => handlePaymentChange("cash", v)}
                      formatter={(v) =>
                        `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                      }
                      parser={(v) => v.replace(/\$\s?|(\.*)/g, "")}
                    />
                  </Form.Item>
                </Col>
                <Col xs={12} md={8}>
                  <Form.Item label="Chuyển khoản" name="transfer_amount">
                    <InputNumber
                      size="large"
                      style={{ width: "100%" }}
                      onChange={(v) => handlePaymentChange("transfer", v)}
                      formatter={(v) =>
                        `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                      }
                      parser={(v) => v.replace(/\$\s?|(\.*)/g, "")}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) =>
                      prev.sale_price !== curr.sale_price ||
                      prev.loan_amount !== curr.loan_amount ||
                      prev.payment_method !== curr.payment_method
                    }
                  >
                    {({ getFieldValue }) => {
                      const price = getFieldValue("sale_price") || 0;
                      const loan = getFieldValue("loan_amount") || 0;
                      const target = price - loan;
                      return (
                        <Form.Item
                          label={
                            <Space>
                              Tiền thực thu
                              {getFieldValue("payment_method") ===
                                "Trả góp" && (
                                <Tag color="cyan">
                                  Cần thu: {target.toLocaleString()}đ
                                </Tag>
                              )}
                            </Space>
                          }
                          name="paid_amount"
                          rules={[{ required: true }]}
                        >
                          <InputNumber
                            size="large"
                            style={{ width: "100%" }}
                            placeholder="Tổng thực thu..."
                            readOnly
                            className="readonly-input-highlight"
                            formatter={(v) =>
                              `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                            }
                            parser={(v) => v.replace(/\$\s?|(\.*)/g, "")}
                          />
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={24}>
                  <Form.Item label="Hình thức thanh toán" name="payment_method">
                    <Select
                      size="large"
                      onChange={(v) => {
                        const price = form.getFieldValue("sale_price") || 0;
                        if (v === "Trả thẳng") {
                          form.setFieldsValue({
                            loan_amount: 0,
                            bank_name: null,
                            contract_number: null,
                            cash_amount: price,
                            transfer_amount: 0,
                            paid_amount: price,
                          });
                        } else {
                          const loan = form.getFieldValue("loan_amount") || 0;
                          const target = price - loan;
                          form.setFieldsValue({
                            cash_amount: target,
                            transfer_amount: 0,
                            paid_amount: target,
                          });
                        }
                      }}
                    >
                      <Option value="Trả thẳng">
                        Trả thẳng (Tiền mặt/Chuyển khoản)
                      </Option>
                      <Option value="Trả góp">Trả góp (Qua ngân hàng)</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* WATCHER TRONG JSX ĐỂ HIỂN THỊ Ô NGÂN HÀNG */}
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.payment_method !== currentValues.payment_method
                }
              >
                {({ getFieldValue }) =>
                  getFieldValue("payment_method") === "Trả góp" && (
                    <div
                      style={{
                        padding: "20px",
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: 12,
                        marginBottom: 24,
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <Title
                        level={5}
                        style={{
                          fontSize: 13,
                          marginBottom: 20,
                          color: "var(--primary-color)",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        THÔNG TIN TRẢ GÓP
                      </Title>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                          <Form.Item
                            label="Ngân hàng"
                            name="bank_name"
                            rules={[
                              { required: true, message: "Nhập tên ngân hàng" },
                            ]}
                          >
                            <Input
                              size="large"
                              placeholder="HD Saison, FE, MCredit..."
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                          <Form.Item label="Số hợp đồng" name="contract_number">
                            <Input size="large" placeholder="Mã HĐ..." />
                          </Form.Item>
                        </Col>
                        <Col xs={12} md={8}>
                          <Form.Item label="Số tiền vay" name="loan_amount">
                            <InputNumber
                              size="large"
                              style={{ width: "100%" }}
                              onChange={(val) => {
                                const price =
                                  form.getFieldValue("sale_price") || 0;
                                const target = price - (val || 0);
                                form.setFieldsValue({
                                  cash_amount: target,
                                  transfer_amount: 0,
                                  paid_amount: target,
                                });
                              }}
                              formatter={(v) =>
                                `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                              }
                              parser={(v) => v.replace(/\$\s?|(\.*)/g, "")}
                              placeholder="Số tiền vay..."
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </div>
                  )
                }
              </Form.Item>

              {showPriceWarning && (
                <Alert
                  message="Giá bán thấp hơn giá nhập!"
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <Collapse ghost size="small">
                <Panel
                  header={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Thông tin bảo lãnh & bảo hành
                    </Text>
                  }
                  key="1"
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Người bảo lãnh" name="guarantor_name">
                        <Input
                          size="large"
                          placeholder="Tên..."
                          prefix={<UserPlus size={16} />}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                      <Form.Item label="SĐT bảo lãnh" name="guarantor_phone">
                        <Input size="large" placeholder="SĐT..." />
                      </Form.Item>
                    </Col>
                    <Col xs={12} md={8}>
                      <Form.Item
                        name="guarantee"
                        valuePropName="checked"
                        noStyle
                      >
                        <Checkbox>Phát sổ bảo hành</Checkbox>
                      </Form.Item>
                    </Col>
                  </Row>
                </Panel>
              </Collapse>
              <Form.Item
                label="Ghi chú thêm"
                name="notes"
                style={{ marginTop: 16 }}
              >
                <Input.TextArea rows={2} placeholder="Các quà tặng đi kèm..." />
              </Form.Item>

              <Button
                block
                type="primary"
                size="large"
                htmlType="submit"
                loading={loading}
                style={{ height: 48, fontWeight: "bold" }}
              >
                XÁC NHẬN XUẤT HÓA ĐƠN
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={13}>
          <Card
            title="Lịch sử giao dịch"
            className="glass-card"
            extra={
              <Space wrap>
                <Input.Search
                  placeholder="Tìm theo số máy/tên khách..."
                  allowClear
                  onSearch={(v) => setSearchText(v)}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 220 }}
                />
                <Checkbox
                  checked={showOnlyDebt}
                  onChange={(e) => setShowOnlyDebt(e.target.checked)}
                >
                  <Text strong type="danger" style={{ fontSize: 13 }}>
                    Chưa thu đủ
                  </Text>
                </Checkbox>
                <Button
                  icon={<Download size={16} />}
                  onClick={handleExport}
                  size="small"
                  ghost
                >
                  Xuất Excel
                </Button>
                <Button
                  icon={<FileSpreadsheet size={16} />}
                  type="primary"
                  ghost
                  size="small"
                  onClick={() => setImportVisible(true)}
                >
                  Nhập Excel
                </Button>
              </Space>
            }
            styles={{ body: { padding: 0 } }}
          >
            <Table
              dataSource={filteredHistory}
              columns={columns}
              rowKey="id"
              pagination={{ pageSize: 12 }}
              size="small"
              scroll={{ x: "max-content" }}
            />
          </Card>

          <ImportExcelModal
            visible={importVisible}
            onCancel={() => setImportVisible(false)}
            onSuccess={fetchInitialData}
            type="retail_sales"
            title="Nhập danh sách bán lẻ từ Excel"
          />
        </Col>
      </Row>

      <Modal
        title={
          <Space>
            <Banknote size={20} />
            Lịch sử & Thu tiền: {selectedSale?.customer_name}
          </Space>
        }
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 15,
              background: "rgba(255, 255, 255, 0.05)",
              padding: "16px",
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Tổng giá bán:
              </Text>
              <br />
              <Title
                level={4}
                style={{ margin: 0, color: "var(--primary-color)" }}
              >
                {Number(
                  selectedSale?.sale_price || selectedSale?.total_price || 0,
                ).toLocaleString()}{" "}
                đ
              </Title>
            </div>
            <div style={{ textAlign: "right" }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Còn nợ lại:
              </Text>
              <br />
              <Title level={4} style={{ margin: 0, color: "#ef4444" }}>
                {Number(
                  (selectedSale?.sale_price || selectedSale?.total_price || 0) -
                    (selectedSale?.paid_amount || 0),
                ).toLocaleString()}{" "}
                đ
              </Title>
            </div>
          </div>

          <Title level={5} style={{ fontSize: 14 }}>
            THÊM KHOẢN THU (KHÁCH TRẢ THÊM)
          </Title>
          <Form form={paymentForm} layout="vertical" onFinish={onAddPayment}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="payment_date"
                  label="Ngày thu"
                  rules={[{ required: true }]}
                >
                  <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="amount"
                  label="Số tiền thu"
                  rules={[{ required: true }]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    formatter={(v) =>
                      `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
                    }
                    parser={(v) => v.replace(/\$\s?|(\.*)/g, "")}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="payment_method"
                  label="Hình thức"
                  initialValue="Tiền mặt"
                >
                  <Select>
                    <Option value="Tiền mặt">Tiền mặt</Option>
                    <Option value="Chuyển khoản">Chuyển khoản</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="notes"
              label="Ghi chú (Ví dụ: Trả nợ đăng ký, Trả góp đợt 1...)"
            >
              <Input placeholder="Nhập ghi chú..." />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<Save size={16} />}
              block
              loading={loading}
            >
              XÁC NHẬN THU TIỀN
            </Button>
          </Form>
        </div>

        <Title level={5} style={{ fontSize: 14, marginTop: 24 }}>
          CHI TIẾT CÁC LẦN TRẢ TIỀN
        </Title>
        <Table
          dataSource={paymentHistory}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: "Ngày",
              dataIndex: "payment_date",
              render: (d) => dayjs(d).format("DD/MM/YYYY HH:mm"),
            },
            {
              title: "Số tiền",
              dataIndex: "amount",
              render: (v) => <b>{Number(v).toLocaleString()}</b>,
            },
            { title: "Hình thức", dataIndex: "payment_method" },
            { title: "Ghi chú", dataIndex: "notes" },
            {
              title: "",
              key: "del",
              render: (_, r) =>
                canManageMoney ? (
                  <Popconfirm
                    title="Xóa khoản thu này?"
                    onConfirm={() => handleDeletePayment(r.id)}
                  >
                    <Button type="text" danger icon={<Trash2 size={14} />} />
                  </Popconfirm>
                ) : null,
            },
          ]}
        />
      </Modal>

      {/* PrintInvoice component removed - printing is now handled via window.open */}
    </div>
  );
};

export default RetailSalePage;
