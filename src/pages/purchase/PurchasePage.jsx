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
  Divider,
  Tabs,
  Modal,
  notification,
  message,
  Card,
  Tag,
  Popconfirm,
} from "antd";
import {
  Truck,
  Save,
  RotateCcw,
  Search,
  Plus,
  Trash2,
  DollarSign,
  History,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Wand2,
  Settings,
  Printer,
} from "lucide-react";
import dayjs from "dayjs";
import api from "../../utils/api";
import ImportExcelModal from "../../components/ImportExcelModal";
import { exportToExcel } from "../../utils/excelExport";

const { Text, Title } = Typography;
const { Option } = Select;

const PurchasePage = () => {
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();

  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);

  const [colors, setColors] = useState([]);

  const [batchItems, setBatchItems] = useState([
    {
      key: Date.now().toString(),
      type_id: null,
      color_id: null,
      engine_no: "",
      chassis_no: "",
      price_vnd: undefined,
      notes: "",
    },
  ]);

  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [lotDetails, setLotDetails] = useState({ vehicles: [], payments: [] });
  const [loading, setLoading] = useState(false);
  const [isEditingLot, setIsEditingLot] = useState(false);
  const [editLotData, setEditLotData] = useState({
    purchase_date: null,
    notes: "",
  });
  const [activeTab, setActiveTab] = useState("1");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [importVisible, setImportVisible] = useState(false);

  // Search states
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [detailSearchTerm, setDetailSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState("all"); // 'all', 'engine', 'chassis'

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [sRes, wRes, tRes, cRes] = await Promise.all([
        api.get("/suppliers"),
        api.get("/warehouses"),
        api.get("/vehicle-types"),
        api.get("/colors"),
      ]);

      setSuppliers(sRes.data);
      setWarehouses(wRes.data);
      setVehicleTypes(tRes.data);
      setColors(cRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "ADMIN";
  const isManager = user.role === "MANAGER";
  const isPowerUser = isAdmin || isManager;
  const canDelete =
    isAdmin || user.can_delete === true || user.can_delete === 1;
  const canManageMoney =
    isAdmin || user.can_manage_money === true || user.can_manage_money === 1;

  const allowedWarehouseIds = [
    user.warehouse_id,
    ...(user.accessible_warehouses
      ? user.accessible_warehouses.split(",")
      : []),
  ].filter(Boolean);

  const filteredWarehouses = isPowerUser
    ? warehouses
    : warehouses.filter((w) => allowedWarehouseIds.includes(w.id));

  const showWarehouseSelector = isPowerUser || allowedWarehouseIds.length > 1;

  const handleSearchHistory = async (supplierId) => {
    if (!supplierId) return;
    setLoading(true);
    try {
      const response = await api.get(`/purchases?supplier_id=${supplierId}`);
      setPurchaseHistory(response.data);
    } catch (error) {
      message.error("Lỗi tải lịch sử: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLotDetails = async (lot) => {
    setSelectedLot(lot);
    setLoading(true);
    try {
      const response = await api.get(`/purchases/${lot.id}/details`);
      setLotDetails(response.data);
    } catch (error) {
      message.error("Lỗi tải chi tiết lô: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    const newKey = Date.now().toString();
    setBatchItems([
      ...batchItems,
      {
        key: newKey,
        type_id: null,
        color_id: null,
        engine_no: "",
        chassis_no: "",
        price_vnd: undefined,
        notes: "",
      },
    ]);
  };

  const updateItem = (key, field, value) => {
    const newData = [...batchItems];
    const index = newData.findIndex((item) => item.key === key);
    if (index > -1) {
      newData[index][field] = value;

      // Tự động nhảy giá gợi ý khi chọn loại xe
      if (field === "type_id") {
        const type = vehicleTypes.find((t) => t.id === value);
        if (type && type.suggested_price) {
          newData[index]["price_vnd"] = Number(type.suggested_price);
        }
      }

      setBatchItems(newData);
    }
  };

  const removeItem = (key) => {
    if (batchItems.length === 1) return;
    setBatchItems(batchItems.filter((item) => item.key !== key));
  };

  const handleSaveBatch = async () => {
    try {
      const formValues = await form.validateFields();
      // Lọc ra các dòng mà người dùng có nhập liệu (tránh dòng trống hoàn toàn)
      const inputItems = batchItems.filter(
        (item) =>
          item.type_id ||
          item.engine_no ||
          item.chassis_no ||
          item.price_vnd > 0,
      );

      if (inputItems.length === 0)
        return message.warning("Vui lòng nhập ít nhất một xe vào bảng!");

      // KIỂM TRA TỪNG DÒNG
      for (let i = 0; i < inputItems.length; i++) {
        const item = inputItems[i];
        if (!item.type_id)
          return message.error(`Dòng ${i + 1}: Chưa chọn Loại xe!`);
        if (!item.color_id)
          return message.error(`Dòng ${i + 1}: Chưa chọn Màu xe!`);
        if (!item.engine_no || item.engine_no.trim() === "")
          return message.error(`Dòng ${i + 1}: Chưa nhập Số máy!`);
        if (!item.chassis_no || item.chassis_no.trim() === "")
          return message.error(`Dòng ${i + 1}: Chưa nhập Số khung!`);
        if (item.price_vnd === undefined || item.price_vnd === null || item.price_vnd < 0)
          return message.error(`Dòng ${i + 1}: Giá nhập không hợp lệ!`);
      }

      setLoading(true);
      await api.post("/purchases", {
        supplier_id: formValues.supplier_id,
        warehouse_id: formValues.warehouse_id,
        purchase_date: formValues.purchase_date.format("YYYY-MM-DD"),
        items: inputItems,
        notes: formValues.notes,
      });

      notification.success({ message: "Đã nhập đơn hàng thành công!" });
      setBatchItems([
        {
          key: Date.now().toString(),
          type_id: null,
          color_id: null,
          engine_no: "",
          chassis_no: "",
          price_vnd: undefined,
          notes: "",
        },
      ]);
      form.setFieldsValue({ notes: "" });
      handleSearchHistory(formValues.supplier_id);
    } catch (error) {
      message.error("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (values) => {
    try {
      await api.post("/purchases/payment", {
        purchase_id: selectedLot.id,
        amount_paid_vnd: values.amount,
        payment_date: values.date.format("YYYY-MM-DD"),
        notes: values.notes,
      });
      message.success("Đã ghi nhận thanh toán!");
      setIsPaymentModalOpen(false);
      paymentForm.resetFields();
      loadLotDetails(selectedLot);
      handleSearchHistory(form.getFieldValue("supplier_id"));
    } catch (error) {
      message.error(error.message);
    }
  };

  const handleDeleteVehicle = async (purchaseId, vehicleId, force = false) => {
    Modal.confirm({
      title: force ? "XÓA XE ĐÃ BÁN" : "Xác nhận xóa xe",
      content: force
        ? "Xe này đã được bán. Nếu xóa, đơn bán liên quan cũng sẽ bị bộ xóa. Bạn chắc chắn chứ?"
        : "Bạn có chắc chắn muốn xóa xe này khỏi lô hàng? Tổng tiền của lô sẽ tự động được cập nhật lại.",
      okText: "Đồng ý",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setLoading(true);
          await api.delete(`/purchases/${purchaseId}/vehicles/${vehicleId}`, {
            data: { force },
          });
          message.success("Đã xóa xe khỏi lô thành công!");
          loadLotDetails(selectedLot); // Tải lại chi tiết lô
          handleSearchHistory(form.getFieldValue("supplier_id")); // Tải lại lịch sử lô để cập nhật tổng tiền
        } catch (error) {
          if (error.response?.status === 409) {
            handleDeleteVehicle(purchaseId, vehicleId, true);
          } else {
            message.error(
              "Lỗi: " + (error.response?.data?.message || error.message),
            );
          }
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleDeleteLot = async (lot, force = false) => {
    Modal.confirm({
      title: force
        ? "XÁC NHẬN XÓA TOÀN BỘ (BAO GỒM ĐƠN BÁN)"
        : "Xác nhận xóa lô hàng",
      content: force
        ? `Lô này có xe đã bán. Nếu xóa, hệ thống sẽ XÓA LUÔN các đơn bán và công nợ xe đó để bạn nhập lại. Bạn chắc chắn chứ?`
        : `Bạn có chắc chắn muốn xóa toàn bộ lô hàng ngày ${dayjs(lot.purchase_date).format("DD/MM/YYYY")} không? Hành động này sẽ xóa toàn bộ danh sách xe và công nợ của lô này.`,
      okText: "Đồng ý xóa",
      okType: "danger",
      cancelText: "Hủy bỏ",
      onOk: async () => {
        try {
          setLoading(true);
          await api.delete(`/purchases/${lot.id}`, { data: { force } });
          message.success("Đã xóa lô hàng thành công!");
          if (selectedLot?.id === lot.id) setSelectedLot(null);
          handleSearchHistory(form.getFieldValue("supplier_id"));
        } catch (error) {
          if (error.response?.status === 409) {
            // Trường hợp có xe đã bán
            handleDeleteLot(lot, true); // Gọi lại với force = true
          } else {
            message.error(
              "Lỗi: " + (error.response?.data?.message || error.message),
            );
          }
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleDeletePayment = async (paymentId) => {
    Modal.confirm({
      title: "Xác nhận xóa khoản thanh toán",
      content:
        "Bạn có chắc chắn muốn xóa khoản thanh toán này? Số tiền nợ của lô hàng sẽ tự động tăng trở lại.",
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setLoading(true);
          await api.delete(`/purchases-payments/${paymentId}`);
          message.success("Đã xóa khoản thanh toán thành công!");
          loadLotDetails(selectedLot); // Tải lại chi tiết lô để cập nhật lịch sử thanh toán và nợ
          handleSearchHistory(form.getFieldValue("supplier_id"));
        } catch (error) {
          message.error(
            "Lỗi: " + (error.response?.data?.message || error.message),
          );
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleBulkFix = async () => {
    if (!selectedLot) return;
    Modal.confirm({
      title: "Tự động sửa mã số khung/máy?",
      content:
        "Hệ thống sẽ lấy Tiền tố từ Loại xe đã khai báo và tự động thêm vào trước các Số máy/Số khung đang bị thiếu trong lô hàng này. Bạn có chắc chắn muốn thực hiện?",
      okText: "Bắt đầu sửa",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          setLoading(true);
          const response = await api.put(
            `/purchases/${selectedLot.id}/bulk-fix-codes`,
          );
          message.success(response.data.message);
          loadLotDetails(selectedLot);
        } catch (error) {
          message.error(
            "Lỗi: " + (error.response?.data?.message || error.message),
          );
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handlePrintPurchaseLot = async (lot) => {
    if (!lot) return;

    setLoading(true);
    try {
      // Fetch fresh details to ensure we have the vehicle list
      const response = await api.get(`/purchases/${lot.id}/details`);
      const details = response.data;
      const displayItems = details.vehicles || [];

      // Resolve Supplier and Warehouse from state if missing in the lot object
      const supplier =
        lot.Supplier || suppliers.find((s) => s.id === lot.supplier_id) || {};
      const warehouse =
        lot.Warehouse ||
        warehouses.find((w) => w.id === lot.warehouse_id) ||
        {};
      const date = dayjs(lot.purchase_date);

      // Fix redundant "HEAD" text and use warehouse name
      const rawWhName = (warehouse.warehouse_name || "HỆ THỐNG").toUpperCase();
      const displayWhName = `HEAD ${rawWhName.replace(/^(HEAD\s*)+/i, "").trim()}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>In Phiếu Nhập Lô</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: "Times New Roman", Times, serif; font-size: 11pt; color: black; background: white; padding: 0; line-height: 1.2; }
            .header { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .logo-side { font-weight: bold; font-size: 12pt; }
            .title { text-align: center; font-size: 18pt; font-weight: bold; margin: 8px 0; }
            .info-sec { display: flex; flex-wrap: wrap; border-top: 1.5px solid black; border-bottom: 1.5px solid black; padding: 6px 0; margin-bottom: 10px; }
            .info-item { flex: 1; min-width: 200px; font-size: 11pt; margin-bottom: 1px; }
            .info-label { font-weight: normal; }
            .info-value { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9.5pt; }
            th, td { border: 1px solid black; padding: 3px 4px; text-align: left; }
            th { background: #f2f2f2; font-weight: bold; text-align: center; }
            .footer { margin-top: 20px; display: flex; justify-content: space-between; text-align: center; font-size: 11pt; }
            .sig-box { width: 180px; }
            .total-sec { margin-top: 10px; text-align: right; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-side">
              ${displayWhName}
              <div style="font-weight: normal; font-size: 10pt;">${warehouse.address || ""}</div>
            </div>
            <div style="text-align: right; font-weight: bold;">
              Ngày: ${date.format("DD/MM/YYYY")}
            </div>
          </div>
          
          <div class="title">PHIẾU NHẬP KHO LÔ HÀNG</div>
          
          <div class="info-sec">
            <div class="info-item"><span class="info-label">Nhà cung cấp:</span> <span class="info-value">${supplier.name || "N/A"}</span></div>
            <div class="info-item"><span class="info-label">Mã lô:</span> <span class="info-value">${lot.id}</span></div>
            <div class="info-item" style="width: 100%; margin-top: 2px;"><span class="info-label">Ghi chú:</span> <span>${lot.notes || ""}</span></div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 25px;">STT</th>
                <th>Loại xe</th>
                <th style="width: 70px;">Màu xe</th>
                <th style="width: 100px;">Số Máy</th>
                <th style="width: 150px;">Số Khung</th>
                <th style="text-align: right; width: 90px;">Giá nhập</th>
                <th style="width: 60px;">Kiểm tra</th>
              </tr>
            </thead>
            <tbody>
              ${displayItems
                .map(
                  (v, i) => `
                <tr>
                  <td style="text-align: center;">${i + 1}</td>
                  <td>${vehicleTypes.find((t) => t.id === v.type_id)?.name || "N/A"}</td>
                  <td style="text-align: center;">${colors.find((c) => c.id === v.color_id)?.color_name || "N/A"}</td>
                  <td style="text-align: center;"><b>${v.engine_no}</b></td>
                  <td style="text-align: center;"><b>${v.chassis_no}</b></td>
                  <td style="text-align: right;"><b>${Number(v.price_vnd).toLocaleString()}</b></td>
                  <td></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="total-sec">
            <div style="font-size: 13pt;">Tổng cộng: <b style="color: black;">${Number(lot.total_amount_vnd).toLocaleString()} đ</b></div>
          </div>
          
          <div class="footer">
            <div class="sig-box">
              <b>Người giao hàng</b><br/><i style="font-size: 9pt;">(Ký tên)</i>
            </div>
            <div class="sig-box">
               <b>Người nhận hàng</b><br/><i style="font-size: 9pt;">(Ký tên)</i>
            </div>
            <div class="sig-box">
              <b>Đại diện bên nhận</b><br/><i style="font-size: 9pt;">(Đóng dấu)</i>
            </div>
          </div>
          
          <script>
            window.onload = function() { window.print(); };
            window.onafterprint = function() { window.close(); };
          </script>
        </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      message.error("Lỗi khi tải chi tiết để in: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLot = async () => {
    try {
      setLoading(true);
      await api.put(`/purchases/${selectedLot.id}`, {
        purchase_date: editLotData.purchase_date.format("YYYY-MM-DD"),
        notes: editLotData.notes,
      });
      message.success("Cập nhật lô hàng thành công!");
      setIsEditingLot(false);
      // Refresh list
      const res = await api.get("/purchases", {
        params: { supplier_id: selectedSupplier },
      });
      setPurchaseHistory(res.data);
      const updatedLot = res.data.find((l) => l.id === selectedLot.id);
      setSelectedLot(updatedLot);
    } catch (e) {
      message.error("Lỗi khi cập nhật!");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (purchaseHistory.length === 0)
      return message.warning("Không có lịch sử để xuất!");
    const exportData = purchaseHistory.map((h) => ({
      "Ngày nhập lô": dayjs(h.purchase_date).format("DD/MM/YYYY"),
      "Chủ Hàng": h.Supplier?.name || "N/A",
      "Tổng tiền lô": Number(h.total_amount_vnd),
      "Đã thanh toán": Number(h.paid_amount_vnd),
      "Còn nợ":
        Number(h.total_amount_vnd || 0) - Number(h.paid_amount_vnd || 0),
      "Kho nhận": h.Warehouse?.warehouse_name || "N/A",
    }));
    exportToExcel(
      exportData,
      `LichSuNhapHang_${dayjs().format("YYYYMMDD_HHmm")}`,
    );
  };

  const entryColumns = [
    {
      title: "Loại xe",
      dataIndex: "type_id",
      width: "20%",
      render: (val, record) => (
        <Select
          style={{ width: "100%" }}
          showSearch
          placeholder="Loại xe..."
          optionFilterProp="children"
          value={val}
          onChange={(v) => updateItem(record.key, "type_id", v)}
        >
          {vehicleTypes.map((t) => (
            <Option key={t.id} value={t.id}>
              {t.name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Giá đề xuất",
      key: "suggested",
      width: "12%",
      render: (_, record) => {
        const type = vehicleTypes.find((t) => t.id === record.type_id);
        return type?.suggested_price ? (
          <Text type="secondary" style={{ fontSize: 13 }}>
            {Number(type.suggested_price).toLocaleString()} đ
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12, opacity: 0.5 }}>
            -
          </Text>
        );
      },
    },
    {
      title: "Số Máy",
      dataIndex: "engine_no",
      render: (val, record) => (
        <Input
          value={val}
          onChange={(e) => updateItem(record.key, "engine_no", e.target.value)}
        />
      ),
    },
    {
      title: "Số Khung",
      dataIndex: "chassis_no",
      render: (val, record) => (
        <Input
          value={val}
          onChange={(e) => updateItem(record.key, "chassis_no", e.target.value)}
        />
      ),
    },
    {
      title: "Màu",
      dataIndex: "color_id",
      width: "12%",
      render: (val, record) => (
        <Select
          style={{ width: "100%" }}
          showSearch
          placeholder="Màu..."
          optionFilterProp="children"
          value={val}
          onChange={(v) => updateItem(record.key, "color_id", v)}
        >
          {colors.map((c) => (
            <Option key={c.id} value={c.id}>
              {c.color_name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Giá Nhập (đ)",
      dataIndex: "price_vnd",
      width: "15%",
      render: (val, record) => (
        <Space direction="vertical" style={{ width: '100%' }} size={0}>
          <InputNumber
            style={{ width: "100%" }}
            value={val}
            placeholder="0"
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(v) => v.replace(/\$\s?|(,*)/g, "")}
            onChange={(v) => updateItem(record.key, "price_vnd", v)}
          />
          {Number(val) === 0 && <Tag color="warning" style={{ fontSize: 10, margin: 0 }}>XE MƯỢN</Tag>}
        </Space>
      ),
    },
    {
      title: "Ghi chú",
      dataIndex: "notes",
      width: "15%",
      render: (val, record) => (
        <Input
          value={val}
          placeholder="Ghi chú..."
          onChange={(e) => updateItem(record.key, "notes", e.target.value)}
        />
      ),
    },
    {
      title: "",
      key: "action",
      width: 40,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<Trash2 size={16} />}
          onClick={() => removeItem(record.key)}
        />
      ),
    },
  ];

  const detailColumns = [
    {
      title: "Loại Xe",
      width: "150px",
      render: (_, r) =>
        vehicleTypes.find((t) => t.id === r.type_id)?.name || "N/A",
    },
    {
      title: "Giá đề xuất",
      width: "120px",
      render: (_, r) => {
        const type = vehicleTypes.find((t) => t.id === r.type_id);
        return type?.suggested_price ? (
          <Text type="secondary">
            {Number(type.suggested_price).toLocaleString()} đ
          </Text>
        ) : (
          "-"
        );
      },
    },
    {
      title: "Số Máy",
      dataIndex: "engine_no",
      render: (v) => <Text code>{v}</Text>,
    },
    {
      title: "Số Khung",
      dataIndex: "chassis_no",
      render: (v) => <Text code>{v}</Text>,
    },
    {
      title: "Màu",
      width: "90px",
      render: (_, r) =>
        colors.find((c) => c.id === r.color_id)?.color_name || "N/A",
    },
    {
      title: "Giá Nhập",
      width: "120px",
      dataIndex: "price_vnd",
      render: (v) => <Text strong>{Number(v || 0).toLocaleString()} đ</Text>,
    },
    {
      title: "",
      key: "action",
      width: 50,
      render: (_, r) =>
        canDelete && (
          <Button
            type="text"
            danger
            icon={<Trash2 size={16} />}
            onClick={() => handleDeleteVehicle(selectedLot.id, r.id)}
          />
        ),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>
          QUẢN LÝ NHẬP LÔ XE
        </Title>
        <Button
          icon={<Download size={18} />}
          type="primary"
          ghost
          onClick={handleExport}
          block={window.innerWidth < 768}
        >
          Xuất Excel
        </Button>
      </div>

      <Card className="glass-card" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            purchase_date: dayjs(),
            warehouse_id: user.warehouse_id,
          }}
        >
          <Row gutter={[16, 16]} align="bottom">
            <Col xs={24} sm={8}>
              <Form.Item
                label="Chủ Hàng"
                name="supplier_id"
                rules={[{ required: true }]}
              >
                <Select
                  size="large"
                  showSearch
                  placeholder="Chọn người gửi hàng"
                  optionFilterProp="children"
                  onChange={(val) => {
                    handleSearchHistory(val);
                    setActiveTab("2");
                  }}
                >
                  {suppliers.map((s) => (
                    <Option key={s.id} value={s.id}>
                      {s.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            {showWarehouseSelector ? (
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Nhập vào kho chi nhánh"
                  name="warehouse_id"
                  rules={[{ required: true }]}
                >
                  <Select
                    size="large"
                    showSearch
                    placeholder="Chọn kho nhận"
                    optionFilterProp="children"
                  >
                    {filteredWarehouses.map((w) => (
                      <Option key={w.id} value={w.id}>
                        {w.warehouse_name}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            ) : (
              <Form.Item
                name="warehouse_id"
                hidden
                initialValue={user.warehouse_id}
              >
                <Input />
              </Form.Item>
            )}
            <Col xs={12} sm={4}>
              <Form.Item label="Ngày Nhập Lô" name="purchase_date">
                <DatePicker
                  size="large"
                  style={{ width: "100%" }}
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>
            <Col xs={12} sm={4}>
              <Form.Item label="Mô tả" name="notes">
                <Input size="large" placeholder="..." />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        className="custom-tabs"
        items={[
          {
            key: "1",
            label: (
              <Space>
                <Plus size={18} /> NHẬP LÔ XE MỚI
              </Space>
            ),
            children: (
              <Card
                className="glass-card"
                styles={{ body: { padding: "8px" } }}
              >
                <div
                  style={{
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Nhập danh sách xe mới vào bảng (Batch Entry)
                  </Text>
                  <Button
                    icon={<Plus size={16} />}
                    onClick={addRow}
                    type="primary"
                  >
                    Thêm xe
                  </Button>
                </div>
                <Table
                  dataSource={batchItems}
                  columns={entryColumns}
                  pagination={false}
                  size={window.innerWidth < 768 ? "small" : "middle"}
                  scroll={{ x: "max-content" }}
                />
                <div style={{ marginTop: 32, textAlign: "right" }}>
                  <Space wrap className="mobile-stack">
                    <Button
                      size="large"
                      icon={<RotateCcw size={18} />}
                      danger
                      ghost
                      onClick={() =>
                        setBatchItems([
                          {
                            key: Date.now().toString(),
                            type_id: null,
                            color_id: null,
                            engine_no: "",
                            chassis_no: "",
                            price_vnd: undefined,
                            notes: "",
                          },
                        ])
                      }
                      block={window.innerWidth < 768}
                    >
                      Nhập lại
                    </Button>
                    <Button
                      size="large"
                      icon={<FileSpreadsheet size={18} />}
                      type="primary"
                      ghost
                      onClick={() => setImportVisible(true)}
                      block={window.innerWidth < 768}
                    >
                      NHẬP TỪ EXCEL
                    </Button>
                    <Button
                      size="large"
                      type="primary"
                      loading={loading}
                      icon={<CheckCircle2 size={18} />}
                      onClick={handleSaveBatch}
                      style={{
                        background: "#10b981",
                        minWidth: window.innerWidth < 768 ? "100%" : 200,
                      }}
                      block={window.innerWidth < 768}
                    >
                      LƯU CHÍNH THỨC
                    </Button>
                  </Space>
                </div>

                <ImportExcelModal
                  visible={importVisible}
                  onCancel={() => setImportVisible(false)}
                  onSuccess={() => {
                    fetchMasterData();
                    if (form.getFieldValue("supplier_id"))
                      handleSearchHistory(form.getFieldValue("supplier_id"));
                  }}
                  type="purchases"
                  title="Nhập danh sách xe mua từ Excel"
                />
              </Card>
            ),
          },
          {
            key: "2",
            label: (
              <Space>
                <History size={18} /> LỊCH SỬ & GIẢM NỢ
              </Space>
            ),
            children: (
              <Row gutter={[24, 24]}>
                <Col xs={24} xl={10}>
                  <Card
                    title="Danh sách các Lô đã nhập"
                    className="glass-card"
                    extra={
                      <Space wrap>
                        <Input
                          placeholder="Tìm lô..."
                          size="small"
                          prefix={<Search size={14} />}
                          value={historySearchTerm}
                          onChange={(e) => setHistorySearchTerm(e.target.value)}
                          allowClear
                          style={{
                            width: window.innerWidth < 768 ? "100%" : 120,
                          }}
                        />
                        <Button
                          icon={<RotateCcw size={14} />}
                          onClick={() =>
                            handleSearchHistory(
                              form.getFieldValue("supplier_id"),
                            )
                          }
                          size="small"
                          loading={loading}
                        >
                          Làm mới
                        </Button>
                        <Button
                          icon={<Download size={14} />}
                          onClick={handleExport}
                          size="small"
                        >
                          Xuất
                        </Button>
                      </Space>
                    }
                  >
                    <Table
                      dataSource={purchaseHistory.filter((h) => {
                        const term = (historySearchTerm || "").toLowerCase();
                        if (!term) return true;
                        const formattedDate = dayjs(h.purchase_date).format(
                          "DD/MM/YYYY",
                        );
                        const totalAmount = String(h.total_amount_vnd || "");
                        return (
                          formattedDate.includes(term) ||
                          (h.notes && h.notes.toLowerCase().includes(term)) ||
                          totalAmount.includes(term)
                        );
                      })}
                      size="small"
                      rowKey="id"
                      scroll={{ x: "max-content" }}
                      columns={[
                        {
                          title: "Ngày Nhập",
                          dataIndex: "purchase_date",
                          sorter: (a, b) =>
                            dayjs(a.purchase_date).unix() -
                            dayjs(b.purchase_date).unix(),
                          defaultSortOrder: "descend",
                          render: (d) => dayjs(d).format("DD/MM/YYYY"),
                        },
                        {
                          title: "Tổng Tiền",
                          dataIndex: "total_amount_vnd",
                          sorter: (a, b) =>
                            Number(a.total_amount_vnd) -
                            Number(b.total_amount_vnd),
                          render: (v) => <b>{Number(v).toLocaleString()}</b>,
                        },
                        {
                          title: "Nợ",
                          key: "debt",
                          sorter: (a, b) => {
                            const debtA =
                              Number(a.total_amount_vnd) -
                              Number(a.paid_amount_vnd);
                            const debtB =
                              Number(b.total_amount_vnd) -
                              Number(b.paid_amount_vnd);
                            return debtA - debtB;
                          },
                          render: (_, r) => (
                            <Tag color="volcano">
                              {(
                                Number(r.total_amount_vnd) -
                                Number(r.paid_amount_vnd)
                              ).toLocaleString()}
                            </Tag>
                          ),
                        },
                        {
                          title: "",
                          render: (_, r) => (
                            <Space>
                              <Button
                                size="small"
                                onClick={() => loadLotDetails(r)}
                              >
                                Xem
                              </Button>
                              <Button
                                size="small"
                                icon={<Printer size={14} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePrintPurchaseLot(r);
                                }}
                              />
                              {canDelete && (
                                <Popconfirm
                                  title="Xóa lô hàng này?"
                                  onConfirm={() => handleDeleteLot(r)}
                                >
                                  <Button
                                    size="small"
                                    danger
                                    icon={<Trash2 size={14} />}
                                  />
                                </Popconfirm>
                              )}
                            </Space>
                          ),
                        },
                      ]}
                    />
                  </Card>
                </Col>
                <Col xs={24} xl={14}>
                  <Card
                    title={
                      selectedLot ? (
                        <Space>
                          <span>{`Lô hàng ngày ${dayjs(selectedLot.purchase_date).format("DD/MM/YYYY")}`}</span>
                          <Button
                            icon={<Settings size={14} />}
                            size="small"
                            type="text"
                            onClick={() => {
                              setEditLotData({
                                purchase_date: dayjs(selectedLot.purchase_date),
                                notes: selectedLot.notes || "",
                              });
                              setIsEditingLot(true);
                            }}
                          />
                        </Space>
                      ) : (
                        "Thông tin chi tiết lô"
                      )
                    }
                    className="glass-card"
                  >
                    {selectedLot ? (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 16,
                            flexWrap: "wrap",
                            gap: 12,
                          }}
                        >
                          <Space wrap>
                            <Text strong>DANH SÁCH XE TRONG LÔ</Text>
                            {isAdmin && (
                              <Button
                                size="small"
                                icon={<Wand2 size={14} />}
                                type="primary"
                                ghost
                                onClick={handleBulkFix}
                                loading={loading}
                              >
                                Tiền tố
                              </Button>
                            )}
                          </Space>
                          <Button
                            type="primary"
                            style={{
                              background: canManageMoney
                                ? "#10b981"
                                : "#6b7280",
                            }}
                            icon={<DollarSign size={16} />}
                            onClick={() => setIsPaymentModalOpen(true)}
                            disabled={!canManageMoney}
                            block={window.innerWidth < 768}
                          >
                            {canManageMoney ? "GIẢM NỢ" : "LỊCH SỬ"}
                          </Button>
                          <Button
                            icon={<Printer size={16} />}
                            onClick={() => handlePrintPurchaseLot(selectedLot)}
                            ghost
                            type="primary"
                            block={window.innerWidth < 768}
                          >
                            IN PHIẾU NHẬP
                          </Button>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <Row gutter={8}>
                            <Col flex="auto">
                              <Input
                                placeholder="Tìm nhanh Xe (Số máy, Số khung, Ghi chú...)"
                                prefix={<Search size={16} />}
                                value={detailSearchTerm}
                                onChange={(e) =>
                                  setDetailSearchTerm(e.target.value)
                                }
                                allowClear
                                size="small"
                              />
                            </Col>
                            <Col>
                              <Select
                                size="small"
                                value={searchBy}
                                onChange={setSearchBy}
                                style={{ width: 100 }}
                              >
                                <Option value="all">Tất cả</Option>
                                <Option value="engine">Số Máy</Option>
                                <Option value="chassis">Số Khung</Option>
                              </Select>
                            </Col>
                          </Row>
                        </div>
                        <Table
                          dataSource={lotDetails.vehicles.filter((v) => {
                            const term = detailSearchTerm.toLowerCase();
                            if (!term) return true;

                            const matchesEngine = (v.engine_no || "")
                              .toLowerCase()
                              .includes(term);
                            const matchesChassis = (v.chassis_no || "")
                              .toLowerCase()
                              .includes(term);
                            const matchesNotes = (v.notes || "")
                              .toLowerCase()
                              .includes(term);
                            const matchesType = (
                              vehicleTypes.find((t) => t.id === v.type_id)
                                ?.name || ""
                            )
                              .toLowerCase()
                              .includes(term);

                            if (searchBy === "engine") return matchesEngine;
                            if (searchBy === "chassis") return matchesChassis;
                            return (
                              matchesEngine ||
                              matchesChassis ||
                              matchesNotes ||
                              matchesType
                            );
                          })}
                          columns={detailColumns}
                          size="small"
                          pagination={{ pageSize: 8 }}
                          scroll={{ x: "max-content" }}
                        />
                        <Divider />
                        <Text strong>LỊCH SỬ THANH TOÁN:</Text>
                        <Table
                          dataSource={lotDetails.payments}
                          size="small"
                          pagination={false}
                          columns={[
                            {
                              title: "Ngày trả",
                              dataIndex: "payment_date",
                              render: (d) => dayjs(d).format("DD/MM/YYYY"),
                            },
                            {
                              title: "Số tiền",
                              dataIndex: "amount_paid_vnd",
                              render: (v) => (
                                <Text strong color="#10b981">
                                  {Number(v).toLocaleString()} đ
                                </Text>
                              ),
                            },
                            {
                              title: "",
                              width: 50,
                              render: (_, r) =>
                                canManageMoney && (
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    icon={<Trash2 size={14} />}
                                    onClick={() => handleDeletePayment(r.id)}
                                  />
                                ),
                            },
                          ]}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          textAlign: "center",
                          opacity: 0.3,
                          padding: "100px 0",
                        }}
                      >
                        <Search size={48} />
                        <br />
                        Chưa chọn lô để xem chi tiết
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      <Modal
        title={
          <Space>
            <DollarSign size={20} /> GHI NHẬN TRẢ NỢ
          </Space>
        }
        open={isPaymentModalOpen}
        onCancel={() => setIsPaymentModalOpen(false)}
        footer={null}
        width={window.innerWidth < 768 ? "95%" : 400}
        centered
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handlePayment}
          initialValues={{ date: dayjs() }}
        >
          <Form.Item
            label="Ngày thanh toán"
            name="date"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item
            label="Số tiền trả (VNĐ)"
            name="amount"
            rules={[{ required: true }]}
          >
            <InputNumber
              style={{ width: "100%" }}
              size="large"
              autoFocus
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(v) => v.replace(/\$\s?|(,*)/g, "")}
            />
          </Form.Item>
          <Form.Item label="Ghi chú" name="notes">
            <Input.TextArea placeholder="..." />
          </Form.Item>
          <Button
            block
            type="primary"
            htmlType="submit"
            size="large"
            style={{ background: "#10b981" }}
          >
            XÁC NHẬN TRẢ TIỀN
          </Button>
        </Form>
      </Modal>

      <Modal
        title="Chỉnh sửa thông tin lô hàng"
        open={isEditingLot}
        onCancel={() => setIsEditingLot(false)}
        onOk={handleUpdateLot}
        confirmLoading={loading}
      >
        <div style={{ padding: "10px 0" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Ngày nhập thực tế:</Text>
            </div>
            <DatePicker
              style={{ width: "100%" }}
              value={editLotData.purchase_date}
              onChange={(d) =>
                setEditLotData({ ...editLotData, purchase_date: d })
              }
              format="DD/MM/YYYY"
            />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>
              <Text strong>Ghi chú:</Text>
            </div>
            <Input.TextArea
              rows={4}
              value={editLotData.notes}
              onChange={(e) =>
                setEditLotData({ ...editLotData, notes: e.target.value })
              }
              placeholder="Ghi chú về lô hàng..."
            />
          </div>
        </div>
      </Modal>

      <style>{` .ant-table { background: transparent !important; } .ant-table-cell { background: transparent !important; color: white !important; } .ant-table-thead > tr > th { background: rgba(255,255,255,0.05) !important; color: var(--primary-color) !important; } `}</style>
    </div>
  );
};

export default PurchasePage;
