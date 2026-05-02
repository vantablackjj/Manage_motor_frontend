import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Timeline,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Empty,
  Spin,
  message,
  Divider,
  Radio,
  DatePicker,
  Select,
  Table,
  Drawer,
  Statistic,
  AutoComplete,
  InputNumber,
  Modal,
  Popconfirm,
  Tooltip,
} from "antd";
import {
  Search,
  History,
  Truck,
  PlusCircle,
  ShoppingCart,
  Warehouse,
  Calendar,
  Info,
  ArrowRightLeft,
  DollarSign,
  FileText,
  User as UserIcon,
  Download,
  Filter,
  CheckCircle2,
  Box,
  Fingerprint,
  Edit2,
  Printer,
  AlertCircle,
  Banknote,
  Trash2,
  Save,
} from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import api from "../../utils/api";
import { exportToExcel } from "../../utils/excelExport";

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const VehicleLifecyclePage = () => {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlWarehouseId = searchParams.get("warehouse_id");

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [users, setUsers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [wholesaleCustomers, setWholesaleCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [options, setOptions] = useState([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "ADMIN";
  const isManager = user.role === "MANAGER";
  const isPowerUser = isAdmin || isManager;

  // Edit State
  const [editVisible, setEditVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Xác định chế độ dựa trên URL
  const isPurchaseOnly = location.pathname.includes("purchases");
  const isRetailOnly = location.pathname.includes("retail");
  const isWholesaleOnly = location.pathname.includes("wholesale");

  const [searchMode, setSearchMode] = useState(
    isPurchaseOnly
      ? "IMPORT"
      : isRetailOnly || isWholesaleOnly
        ? "SALE"
        : "IMPORT",
  );
  const [searchType, setSearchType] = useState(
    isPurchaseOnly ? "DATE_IMPORTER" : "SALE_DATE",
  );

  // Chi tiết vòng đời (Sử dụng Drawer thay cho Modal)
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [batchVisible, setBatchVisible] = useState(false);
  const [selectedBatchData, setSelectedBatchData] = useState([]);
  const [selectedBatchInfo, setSelectedBatchInfo] = useState(null);

  // Payment States (copied from RetailSaleReportPage & WholesaleSalePage)
  const [retailPaymentModalVisible, setRetailPaymentModalVisible] = useState(false);
  const [wholesalePaymentModalVisible, setWholesalePaymentModalVisible] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentForm] = Form.useForm();

  useEffect(() => {
    fetchUsers();
    fetchWarehouses();
    fetchSuppliers();
    fetchWholesaleCustomers();
    // Reset filters when switching pages
    if (isPurchaseOnly) {
      setSearchMode("IMPORT");
      setSearchType("DATE_IMPORTER");
    } else if (isRetailOnly || isWholesaleOnly) {
      setSearchMode("SALE");
      setSearchType("SALE_DATE");
    }

    // Auto search from URL
    if (urlWarehouseId) {
      form.setFieldsValue({ warehouse_id: urlWarehouseId });
      handleSearch({ warehouse_id: urlWarehouseId });
    }
  }, [location.pathname, urlWarehouseId]);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get("/warehouses");
      setWarehouses(res.data);
    } catch (e) {}
  };

  const fetchUsers = async () => {
    try {
      const resp = await api.get("/auth/users");
      setUsers(resp.data);
    } catch (e) {
      console.error("Lỗi lấy danh sách nhân viên");
    }
  };

  const fetchSuppliers = async () => {
    try {
      const resp = await api.get("/suppliers");
      setSuppliers(resp.data);
    } catch (e) {
      console.error("Lỗi lấy danh sách nhà cung cấp");
    }
  };

  const fetchWholesaleCustomers = async () => {
    try {
      const resp = await api.get("/wholesale-customers?type=VEHICLE");
      setWholesaleCustomers(resp.data);
    } catch (e) {
      console.error("Lỗi lấy danh sách khách buôn");
    }
  };

  const onSearchSuggestions = async (searchText) => {
    if (searchText.length < 2) {
      setOptions([]);
      return;
    }
    setFetchingSuggestions(true);
    try {
      const resp = await api.get("/reports/vehicle-suggestions", {
        params: { query: searchText },
      });
      const mappedOptions = resp.data.map((v) => ({
        label: (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>
              Số máy: <Text strong>{v.engine_no}</Text>
            </span>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Số khung: {v.chassis_no}
            </Text>
          </div>
        ),
        value: v.engine_no, // Value is used for the input
        engine: v.engine_no,
        chassis: v.chassis_no,
      }));
      setOptions(mappedOptions);
    } catch (e) {
      console.error("Search suggestions fail");
    } finally {
      setFetchingSuggestions(false);
    }
  };

  const onSelectSuggestion = (val, option) => {
    form.setFieldsValue({
      engine_no: option.engine,
      chassis_no: option.chassis,
    });
  };

  const handleEditClick = (record, e) => {
    e.stopPropagation();
    setEditingRecord(record);
    editForm.setFieldsValue({
      engine_no: record.engine_no,
      chassis_no: record.chassis_no,
      purchase_price: record.purchase_price,
      sale_price: record.sale_price,
      import_date: record.import_date ? dayjs(record.import_date) : null,
      sale_date: record.sale_date ? dayjs(record.sale_date) : null,
    });
    setEditVisible(true);
  };

  const submitEdit = async (values) => {
    setSavingEdit(true);
    try {
      const body = {
        ...values,
        import_date: values.import_date?.format("YYYY-MM-DD"),
        sale_date: values.sale_date?.format("YYYY-MM-DD"),
      };
      await api.patch(`/reports/vehicle-update/${editingRecord.id}`, body);
      message.success("Cập nhật dữ liệu thành công!");
      setEditVisible(false);
      // Refresh search
      handleSearch(form.getFieldsValue());
    } catch (e) {
      message.error(e.response?.data?.message || "Lỗi cập nhật dữ liệu!");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExport = () => {
    if (!results || results.length === 0) {
      return message.warning("Không có dữ liệu để xuất!");
    }

    const exportData = results.map((v) => ({
      "Trạng thái": v.sale_date ? "Đã bán" : "Trong kho",
      "Ngày Nhập": v.import_date
        ? dayjs(v.import_date).format("DD/MM/YYYY")
        : "N/A",
      "Nhà cung cấp": v.supplier_name,
      "Người Nhập": v.importer_name,
      "Loại Xe": v.type_name,
      "Số Máy": v.engine_no,
      "Số Khung": v.chassis_no,
      "Kênh Bán": v.sale_channel || "-",
      "Ngày Bán": v.sale_date ? dayjs(v.sale_date).format("DD/MM/YYYY") : "-",
      "Khách Hàng": v.customer_name || "-",
      "Giá Tiền": Number(v.sale_price || v.purchase_price),
    }));

    let fileName = "BaoCaoTraCuuXe";
    if (isPurchaseOnly) fileName = "BaoCaoNhapHang";
    else if (isRetailOnly) fileName = "BaoCaoBanLe";
    else if (isWholesaleOnly) fileName = "BaoCaoBanBuon_LichSu";

    exportToExcel(exportData, `${fileName}_${dayjs().format("YYYYMMDD_HHmm")}`);
  };

  const handlePrint = () => {
    if (!results || results.length === 0) {
      return message.warning("Không có dữ liệu để in!");
    }

    const reportTitle = isPurchaseOnly
      ? "BÁO CÁO CHI TIẾT NHẬP XE"
      : isRetailOnly
        ? "BÁO CÁO CHI TIẾT XE BÁN LẺ"
        : isWholesaleOnly
          ? "BÁO CÁO CHI TIẾT XE BÁN BUÔN"
          : "BÁO CÁO TRA CỨU XE TỔNG HỢP";

    const vals = form.getFieldsValue();
    const subTitle =
      vals.dates?.[0] && vals.dates?.[1]
        ? `Từ ngày ${vals.dates[0].format("DD/MM/YYYY")} đến ngày ${vals.dates[1].format("DD/MM/YYYY")}`
        : "Tất cả thời gian";

    const html = `<!DOCTYPE html>
<html>
<head>\
    <meta charset="UTF-8">
    <title>Báo cáo tra cứu</title>
    <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 10pt; line-height: 1.4; padding: 20px; }
        .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 15px; }
        .company-name { font-size: 13pt; font-weight: bold; text-transform: uppercase; }
        .report-title { font-size: 18pt; font-weight: bold; margin: 10px 0; }
        .report-subtitle { font-size: 11pt; font-style: italic; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 8pt; }
        th, td { border: 1px solid #000; padding: 5px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .footer { margin-top: 30px; display: flex; justify-content: space-between; text-align: center; }
        .signature-box { width: 200px; }
        .signature-title { font-weight: bold; margin-bottom: 50px; }
        @media print {
            @page { margin: 10mm; size: A4 landscape; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">HỆ THỐNG CỬA HÀNG XE MÁY THANH HẢI</div>
        <div class="report-title">${reportTitle}</div>
        <div class="report-subtitle">${subTitle}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 30px;">STT</th>
                <th>Ngày</th>
                <th>Trạng thái</th>
                <th>Loại xe</th>
                <th>Số máy</th>
                <th>Số khung</th>
                <th>Khách hàng</th>
                <th>Kênh bán</th>
                <th>Giá tiền</th>
            </tr>
        </thead>
        <tbody>
            ${results
              .map(
                (v, index) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center">${dayjs(v.sale_date || v.import_date).format("DD/MM/YYYY")}</td>
                    <td class="text-center">${v.sale_date ? "Đã bán" : "Trong kho"}</td>
                    <td>${v.type_name}</td>
                    <td>${v.engine_no}</td>
                    <td>${v.chassis_no}</td>
                    <td>${v.customer_name || "-"}</td>
                    <td class="text-center">${v.sale_channel || "-"}</td>
                    <td class="text-right">${Number(v.sale_price || v.purchase_price).toLocaleString()}</td>
                </tr>
            `,
              )
              .join("")}
        </tbody>
    </table>

    <div class="footer">
        <div class="signature-box">
            <div class="signature-title">Người lập báo cáo</div>
            <div>(Ký tên)</div>
        </div>
        <div class="signature-box">
            <div class="signature-title">Kế toán</div>
            <div>(Ký tên)</div>
        </div>
        <div class="signature-box">
            <div>Ngày ....... tháng ....... năm .......</div>
            <div class="signature-title">Giám đốc</div>
            <div>(Ký tên và đóng dấu)</div>
        </div>
    </div>

    <script>
        window.onload = function() { window.print(); };
        window.onafterprint = function() { window.close(); };
    </script>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    } else {
      message.warning("Vui lòng cho phép pop-up để in báo cáo.");
    }
  };

  const handleSearch = async (values) => {
    setLoading(true);
    try {
      const params = {
        mode: searchMode,
        type: searchType,
        from_date: values.dates?.[0]?.format("YYYY-MM-DD"),
        to_date: values.dates?.[1]?.format("YYYY-MM-DD"),
        created_by: values.created_by,
        warehouse_id: values.warehouse_id,
        engine_no: values.engine_no,
        chassis_no: values.chassis_no,
        supplier_id: values.supplier_id,
        customer_name: values.customer_name,
        status: values.status,
        sale_channel: isRetailOnly
          ? "RETAIL"
          : isWholesaleOnly
            ? "WHOLESALE"
            : values.sale_channel_filter, // Sử dụng bộ lọc kênh bán mới
      };

      let response = await api.get("/reports/vehicle-lookup", { params });
      let data = response.data;

      // Sắp xếp dữ liệu ngay khi nhận từ API: Mới nhất lên đầu (Descending)
      const sortedData = [...data].sort((a, b) => {
        const dateA = isPurchaseOnly ? (a.import_date || a.sale_date) : (a.sale_date || a.import_date);
        const dateB = isPurchaseOnly ? (b.import_date || b.sale_date) : (b.sale_date || b.import_date);
        
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        return dayjs(dateB).unix() - dayjs(dateA).unix();
      });

      setResults(sortedData);
      if (data.length === 0) {
        message.info("Không tìm thấy dữ liệu phù hợp");
      }
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi tra cứu dữ liệu!");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const showLifecycle = async (vehicleId) => {
    setDetailLoading(true);
    setDrawerVisible(true);
    try {
      const vehicle = results.find((v) => v.id === vehicleId);
      const resp = await api.get("/reports/vehicle-lifecycle", {
        params: { engine_no: vehicle.engine_no },
      });
      setDetailData(resp.data);
    } catch (e) {
      message.error("Không thể tải nhật ký vòng đời");
      setDrawerVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

const getTimelineIcon = (type) => {
    switch (type) {
      case "PURCHASE":
        return <PlusCircle size={18} color="#10b981" />;
      case "TRANSFER":
        return <ArrowRightLeft size={18} color="#3b82f6" />;
      case "SALE_RETAIL":
        return <ShoppingCart size={18} color="#f59e0b" />;
      case "SALE_WHOLESALE":
        return <Warehouse size={18} color="#8b5cf6" />;
      default:
        return <Info size={18} />;
    }
  };

  // Logic nhóm dữ liệu theo lô để hiển thị chuyên nghiệp
  const processGroupedData = () => {
    if (!results || results.length === 0) return [];

    // Lấy giá trị bộ lọc từ form
    const vals = form.getFieldsValue();
    const isSpecificSearch = vals.customer_name || vals.supplier_id || vals.engine_no || vals.chassis_no || vals.created_by;

    // Nếu tra cứu theo người (khách hàng/nhà cung cấp/nhân viên) hoặc theo số máy/khung cụ thể,
    // hoặc không phải chế độ bán buôn/nhập hàng, thì hiển thị chi tiết lẻ luôn theo yêu cầu
    if (isSpecificSearch || (!isWholesaleOnly && !isPurchaseOnly)) return results;

    const groups = {};
    const others = [];

    results.forEach(v => {
      // Logic gộp mới: Nếu là bán sỉ, gộp theo Ngày + Tên khách hàng
      const key = isWholesaleOnly 
        ? (v.customer_name && v.customer_name !== 'N/A' ? `${dayjs(v.sale_date).format('YYYY-MM-DD')}_${v.customer_name}` : v.wholesale_sale_id)
        : (isPurchaseOnly ? v.purchase_id : null);
      
      if (!key) {
        others.push({ ...v, key: v.id });
        return;
      }

      if (!groups[key]) {
        groups[key] = {
          id: key,
          key: `group-${key}`,
          isGroup: true,
          sale_date: v.sale_date,
          import_date: v.import_date,
          supplier_name: v.supplier_name,
          customer_name: v.customer_name,
          sale_channel: v.sale_channel,
          type_name: `LÔ HÀNG (${(isWholesaleOnly && v.customer_name && v.customer_name !== 'N/A') ? v.customer_name : (v.supplier_name || v.customer_name)})`,
          children: []
        };
      }
      groups[key].children.push({ ...v, key: v.id });
    });

    // Tính toán tổng cho mỗi nhóm
    const groupedList = Object.values(groups).map(g => {
        const count = g.children.length;
        const total_price = g.children.reduce((sum, item) => sum + Number(item.sale_price || 0), 0);
        const purchase_total = g.children.reduce((sum, item) => sum + Number(item.purchase_price || 0), 0);
        
        return {
            ...g,
            engine_no: <Tag color="blue" style={{ fontWeight: 'bold' }}>LÔ GIAO DỊCH: {count} XE</Tag>,
            chassis_no: 'Click để xem danh sách',
            sale_price: isWholesaleOnly ? total_price : (isPurchaseOnly ? purchase_total : 0),
            purchase_price: purchase_total,
            count,
            // Xóa children để Ant Design Table không hiện dấu (+)
            batch_items: g.children,
            children: undefined 
        };
    });

    return [...groupedList, ...others];
  };

  const handleOpenPaymentModal = async (record) => {
    try {
        setPaymentLoading(true);
        setSelectedSaleForPayment(record);
        setPaymentHistory([]);
        
        if (record.isGroup || record.sale_channel === 'Bán Sỉ (Lô)') {
            // WHOLESALE
            const saleId = record.isGroup ? record.id : record.wholesale_sale_id;
            const res = await api.get(`/wholesale-sales/${saleId}/details`);
            // The API returns { vehicles: [], payments: [] }
            setPaymentHistory(res.data.payments || []);
            setWholesalePaymentModalVisible(true);
            
            paymentForm.setFieldsValue({
                payment_date: dayjs(),
                amount: Math.max(0, Number(record.sale_price || 0) - Number(record.paid_amount_vnd || 0)),
                payment_method: 'Tiền mặt'
            });
        } else {
            // RETAIL
            const saleId = record.retail_sale_id || record.id;
            const res = await api.get(`/retail-sales/${saleId}/payments`);
            setPaymentHistory(res.data);
            setRetailPaymentModalVisible(true);
            
            const price = Number(record.sale_price || 0);
            const paid = Number(record.paid_amount || 0);
            const isDisbursed = record.is_disbursed === true || record.is_disbursed === 1;
            const loan = isDisbursed ? Number(record.loan_amount || 0) : 0;
            
            paymentForm.setFieldsValue({
                payment_date: dayjs(),
                amount: Math.max(0, price - paid - loan),
                payment_method: 'Tiền mặt'
            });
        }
    } catch (error) {
        message.error("Không thể tải lịch sử thanh toán: " + error.message);
    } finally {
        setPaymentLoading(false);
    }
  };

  const onAddPayment = async (values) => {
    try {
      setPaymentLoading(true);
      const isWholesale = selectedSaleForPayment.isGroup || selectedSaleForPayment.sale_channel === 'Bán Sỉ (Lô)';
      
      if (isWholesale) {
          const saleId = selectedSaleForPayment.isGroup ? selectedSaleForPayment.id : selectedSaleForPayment.wholesale_sale_id;
          await api.post('/wholesale-sales/payment', {
            wholesale_sale_id: saleId,
            amount_paid_vnd: values.amount,
            payment_date: values.payment_date.format('YYYY-MM-DD'),
            notes: values.notes
          });
          message.success('Đã ghi nhận tiền trả từ khách buôn!');
          
          // Refresh Full Data
          const res = await api.get(`/wholesale-sales/${saleId}/details`);
          setPaymentHistory(res.data.payments || []);
          setSelectedSaleForPayment(prev => ({ ...prev, ...res.data })); // Update paid_amount_vnd
      } else {
          const saleId = selectedSaleForPayment.retail_sale_id || selectedSaleForPayment.id;
          await api.post("/retail-payments", {
            ...values,
            retail_sale_id: saleId,
            payment_date: values.payment_date.format('YYYY-MM-DD'),
          });
          message.success("Đã thêm khoản thanh toán bán lẻ!");
          
          // Refresh Payments and calculate new total for UI
          const res = await api.get(`/retail-sales/${saleId}/payments`);
          setPaymentHistory(res.data);
          
          const newTotalPaid = res.data.reduce((sum, p) => sum + Number(p.amount), 0);
          setSelectedSaleForPayment(prev => ({ ...prev, paid_amount: newTotalPaid }));
      }
      
      paymentForm.resetFields(["amount", "notes"]);
      handleSearch(form.getFieldsValue()); // Refresh main table to update debt numbers
    } catch (error) {
      message.error("Lỗi: " + (error.response?.data?.message || error.message));
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePayment = async (id) => {
    try {
      setPaymentLoading(true);
      const isWholesale = selectedSaleForPayment.isGroup || selectedSaleForPayment.sale_channel === 'Bán Sỉ (Lô)';
      
      if (isWholesale) {
          await api.delete(`/wholesale-payments/${id}`);
          const saleId = selectedSaleForPayment.isGroup ? selectedSaleForPayment.id : selectedSaleForPayment.wholesale_sale_id;
          const res = await api.get(`/wholesale-sales/${saleId}/details`);
          setPaymentHistory(res.data.payments || []);
          setSelectedSaleForPayment(prev => ({ ...prev, ...res.data }));
      } else {
          await api.delete(`/retail-payments/${id}`);
          const res = await api.get(`/retail-sales/${selectedSaleForPayment.id}/payments`);
          setPaymentHistory(res.data);
          
          const newTotalPaid = res.data.reduce((sum, p) => sum + Number(p.amount), 0);
          setSelectedSaleForPayment(prev => ({ ...prev, paid_amount: newTotalPaid }));
      }
      
      message.success("Đã xóa khoản thanh toán");
      handleSearch(form.getFieldsValue());
    } catch (error) {
      message.error("Lỗi: " + error.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const showBatchDetail = (record) => {
    setSelectedBatchData(record.batch_items || []);
    setSelectedBatchInfo(record);
    setBatchVisible(true);
  };

  const handlePrintBatch = (record) => {
    if (!record || !record.batch_items) return;
    
    const items = record.batch_items;
    const warehouse = warehouses.find(w => w.id === (items[0]?.warehouse_id || record.warehouse_id)) || {};
    const date = dayjs(record.sale_date || record.import_date);

    // Fix redundant "HEAD" text
    const rawWhName = (warehouse.warehouse_name || 'HỆ THỐNG').toUpperCase();
    const displayWhName = `HEAD ${rawWhName.replace(/^(HEAD\s*)+/i, '').trim()}`;

    const title = isWholesaleOnly ? "PHIẾU XUẤT KHO LÔ HÀNG" : "PHIẾU NHẬP KHO LÔ HÀNG";
    const partnerLabel = isWholesaleOnly ? "Khách hàng" : "Nhà cung cấp";
    const priceLabel = isWholesaleOnly ? "Giá bán" : "Giá nhập";

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>In Phiếu Lô</title>
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
            <div style="font-weight: normal; font-size: 10pt;">${warehouse.address || ''}</div>
          </div>
          <div style="text-align: right; font-weight: bold;">
            Ngày: ${date.format('DD/MM/YYYY')}
          </div>
        </div>
        
        <div class="title">${title}</div>
        
        <div class="info-sec">
          <div class="info-item"><span class="info-label">${partnerLabel}:</span> <span class="info-value">${(isWholesaleOnly && record.customer_name && record.customer_name !== 'N/A') ? record.customer_name : (record.supplier_name || record.customer_name || 'N/A')}</span></div>
          <div class="info-item"><span class="info-label">Mã giao dịch:</span> <span class="info-value">${record.id}</span></div>
          <div class="info-item" style="width: 100%; margin-top: 2px;"><span class="info-label">Ghi chú:</span> <span>${record.notes || ''}</span></div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 25px;">STT</th>
              <th>Loại xe</th>
              <th style="width: 100px;">Số Máy</th>
              <th style="width: 150px;">Số Khung</th>
              <th style="text-align: right; width: 90px;">${priceLabel}</th>
              ${!isWholesaleOnly ? '<th style="width: 60px;">Kiểm tra</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${items.map((v, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td>${v.type_name} (${v.color_name})</td>
                <td style="text-align: center;"><b>${v.engine_no}</b></td>
                <td style="text-align: center;"><b>${v.chassis_no}</b></td>
                <td style="text-align: right;"><b>${Number(isWholesaleOnly ? (v.sale_price || v.purchase_price) : v.purchase_price).toLocaleString()}</b></td>
                ${!isWholesaleOnly ? '<td></td>' : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-sec">
          <div style="font-size: 13pt;">Tổng cộng: <b style="color: black;">${Number(record.sale_price || record.purchase_price).toLocaleString()} đ</b></div>
        </div>
        
        <div class="footer">
          <div class="sig-box">
            <b>Người lập biểu</b><br/><i style="font-size: 9pt;">(Ký tên)</i>
          </div>
          <div class="sig-box">
             <b>Người nhận hàng</b><br/><i style="font-size: 9pt;">(Ký tên)</i>
          </div>
          <div class="sig-box">
            <b>Đại diện đơn vị</b><br/><i style="font-size: 9pt;">(Đóng dấu)</i>
          </div>
        </div>
        
        <script>
          window.onload = function() { window.print(); };
          window.onafterprint = function() { window.close(); };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const columns = [
    { 
        title: 'Trạng thái',
        width: 100,
        render: (_, record) => {
            if (record.isGroup) return <Tag color="processing" icon={<Box size={12} />}>GIAO DỊCH LÔ</Tag>;
            return record.sale_date ? <Tag color="warning">Đã bán</Tag> : <Tag color="success">Trong kho</Tag>;
        }
    },
    { 
        title: 'Ngày', 
        sorter: (a, b) => {
            const dateA = isPurchaseOnly ? (a.import_date || a.sale_date) : (a.sale_date || a.import_date);
            const dateB = isPurchaseOnly ? (b.import_date || b.sale_date) : (b.sale_date || b.import_date);
            return dayjs(dateA || 0).unix() - dayjs(dateB || 0).unix();
        },
        render: (_, record) => {
            const hasError = record.import_date && record.sale_date && dayjs(record.import_date).isAfter(dayjs(record.sale_date));
            const date = isPurchaseOnly ? (record.import_date || record.sale_date) : (record.sale_date || record.import_date);
            const dayjsDate = dayjs(date);
            const isValidDate = date && dayjsDate.isValid() && dayjsDate.year() >= 2010;
            
            return (
                <Space>
                    {isValidDate ? dayjsDate.format('DD/MM/YYYY') : 'N/A'}
                    {hasError && (
                        <Tooltip title={`Lỗi logic: Ngày nhập (${dayjs(record.import_date).format('DD/MM/YYYY')}) sau ngày bán!`}>
                            <AlertCircle size={14} color="#ef4444" />
                        </Tooltip>
                    )}
                </Space>
            );
        }
    },
    { 
        title: isPurchaseOnly ? 'Chủ hàng (Nhà CC)' : 'Chủ hàng / Khách hàng', 
        width: 180,
        ellipsis: true, 
        render: (text, record) => {
            if (record.isGroup) {
                if (isWholesaleOnly && record.customer_name && record.customer_name !== 'N/A') return record.customer_name;
                return record.supplier_name || record.customer_name;
            }
            
            // Nếu là trang Mua xe, ưu tiên hiện Chủ hàng (Người bán cho mình)
            if (isPurchaseOnly) {
                return <Text strong>{record.supplier_name}</Text>;
            }
            // Các trang khác (Bán lẻ/Bán sỉ) hiện tên Khách hàng
            if (record.customer_name && record.customer_name !== 'N/A') return record.customer_name;
            return record.supplier_name;
        }
    },
    { title: 'Người thực hiện', dataIndex: 'importer_name', width: 150 },
    { 
        title: 'Thông tin xe / Lô', 
        dataIndex: 'type_name',
        render: (text, record) => (
            <div>
                {record.isGroup ? <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{text}</span> : text}
                {!record.isGroup && record.color_name && (
                    <div style={{ fontSize: 10, opacity: 0.8, marginTop: 4 }}>
                        Màu: <Tag color="purple" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>{record.color_name}</Tag>
                    </div>
                )}
            </div>
        )
    },
    { title: 'Số Máy', dataIndex: 'engine_no', className: 'strong-text' },
    { title: 'Số Khung', dataIndex: 'chassis_no', className: 'strong-text' },
    { 
        title: 'Kênh Bán', 
        dataIndex: 'sale_channel',
        render: c => c ? <Tag color={c === 'Bán Lẻ' ? 'gold' : c === 'Bán Sỉ (Lô)' ? 'purple' : 'default'}>{c}</Tag> : '-'
    },
    { 
        title: 'Thành tiền / Giá xe', 
        render: (_, record) => {
            // Nếu là xem lô nhập (isPurchaseOnly), ưu tiên hiện Giá Nhập (purchase_price)
            // Nếu là xem lô bán (isWholesaleOnly/isRetailOnly), ưu tiên hiện Giá Bán (sale_price)
            const showPurchasePrice = isPurchaseOnly;
            // Nếu là trang Bán Lẻ, chỉ hiện sale_price. Nếu là trang tra cứu chung, ưu tiên sale_price cho xe đã bán.
            const primaryPrice = showPurchasePrice ? record.purchase_price : (record.sale_channel === 'Bán Lẻ' ? record.sale_price : (record.sale_price || record.purchase_price));
            const secondaryPrice = showPurchasePrice ? record.sale_price : null;

            if (record.isGroup) {
                return (
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 'bold', color: showPurchasePrice ? '#3b82f6' : '#10b981' }}>
                            {Number(primaryPrice).toLocaleString()} đ
                        </div>
                        <Text type="secondary" style={{ fontSize: 10 }}>Tổng cộng {record.count} xe</Text>
                    </div>
                );
            }

            return (
                <div style={{ fontSize: 13 }}>
                    <div style={{ fontWeight: 'bold' }}>{Number(primaryPrice).toLocaleString()} đ</div>
                    {Number(record.purchase_price) === 0 && (
                        <Tag color="warning" style={{ fontSize: 9, padding: '0 4px', marginTop: 2 }}>XE MƯỢN</Tag>
                    )}
                    {Number(record.sale_price) === 0 && record.sale_date && (
                        <Tag color="error" style={{ fontSize: 9, padding: '0 4px', marginTop: 2 }}>TRẢ XE</Tag>
                    )}
                    {secondaryPrice && record.sale_date && (
                        <Text type="warning" style={{ fontSize: 10 }}>Bán: {Number(secondaryPrice).toLocaleString()} đ</Text>
                    )}
                    {showPurchasePrice && !record.sale_date && (
                        <Tag color="success" style={{ fontSize: 9, padding: '0 4px', marginTop: 2 }}>Giá gốc</Tag>
                    )}
                </div>
            );
        }
    },
    {
        title: 'Thao tác',
        fixed: 'right',
        width: 100,
        render: (_, record) => (
            <Space>
                {record.isGroup ? (
                    <Button 
                        type="primary" 
                        ghost
                        icon={<Printer size={16} />} 
                        onClick={(e) => { e.stopPropagation(); handlePrintBatch(record); }}
                        title="In phiếu lô hàng"
                    />
                ) : (
                    <>
                        {isAdmin && (
                            <Button 
                                type="default" 
                                shape="circle"
                                icon={<Edit2 size={16} />} 
                                onClick={(e) => handleEditClick(record, e)}
                                title="Sửa dữ liệu sai"
                            />
                        )}
                        <Button 
                            type="primary" 
                            shape="circle"
                            icon={<History size={16} />} 
                            onClick={(e) => { e.stopPropagation(); showLifecycle(record.id); }}
                            title="Xem vòng đời"
                        />
                        {record.sale_date && (
                             <Button 
                                type="text" 
                                icon={<Banknote size={18} />} 
                                onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(record); }}
                                title="Lịch sử & Thu tiền"
                                style={{ color: '#10b981' }}
                            />
                        )}
                    </>
                )}
                {record.isGroup && record.sale_date && (
                     <Button 
                        type="text" 
                        icon={<Banknote size={18} />} 
                        onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(record); }}
                        title="Lịch sử & Thu tiền nợ lô"
                        style={{ color: '#10b981' }}
                    />
                )}
            </Space>
        )
    }
  ];

  // Tính toán tóm tắt cho Cards
  const stats = {
      total: results.length,
      sold: results.filter(v => v.sale_date).length,
      soldRetail: results.filter(v => v.sale_channel === 'Bán Lẻ').length,
      soldWholesale: results.filter(v => v.sale_channel === 'Bán Sỉ (Lô)').length,
      inStock: results.filter(v => !v.sale_date).length
  };

  return (
    <div style={{ padding: "0 5px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>
          {isPurchaseOnly
            ? "XEM THÔNG TIN MUA XE"
            : isRetailOnly
              ? "XEM THÔNG TIN BÁN LẺ"
              : isWholesaleOnly
                ? "XEM THÔNG TIN BÁN BUÔN"
                : "TÌM XE THEO YÊU CẦU"}
        </Title>
        <Space>
          <Button
            icon={<Printer size={16} />}
            disabled={results.length === 0}
            onClick={handlePrint}
            type="dashed"
          >
            In Báo Cáo
          </Button>
          <Button
            icon={<Download size={16} />}
            disabled={results.length === 0}
            onClick={handleExport}
            type="primary"
            ghost
          >
            Xuất Báo Cáo
          </Button>
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={6}>
          <Card
            className="glass-card stat-card"
            style={{ borderLeft: "4px solid #3b82f6" }}
          >
            <Statistic
              title={
                <Space>
                  <Box size={14} /> {isPurchaseOnly ? "Tổng xe trong lô" : "Tổng số xe tìm thấy"}
                </Space>
              }
              value={stats.total}
              prefix={<Search size={20} color="#3b82f6" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            className="glass-card stat-card"
            style={{ borderLeft: "4px solid #10b981" }}
          >
            <Statistic
              title={
                <Space>
                  <CheckCircle2 size={14} />{" "}
                  {isPurchaseOnly ? "Hiện còn tồn kho" : "Xe trong kho"}
                </Space>
              }
              value={stats.inStock}
              valueStyle={{ color: "#10b981" }}
              prefix={<Truck size={20} color="#10b981" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            className="glass-card stat-card"
            style={{ borderLeft: "4px solid #f59e0b" }}
          >
            <Statistic
              title={
                <Space>
                  <ShoppingCart size={14} />{" "}
                  {isPurchaseOnly ? "Đã bán lẻ (Khách lẻ)" : "Số xe đã bán lẻ"}
                </Space>
              }
              value={stats.soldRetail}
              valueStyle={{ color: "#f59e0b" }}
              prefix={<UserIcon size={20} color="#f59e0b" />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card
            className="glass-card stat-card"
            style={{ borderLeft: "4px solid #8b5cf6" }}
          >
            <Statistic
              title={
                <Space>
                  <Warehouse size={14} />{" "}
                  {isPurchaseOnly ? "Đã bán sỉ (Đại lý)" : "Số xe đã bán sỉ"}
                </Space>
              }
              value={stats.soldWholesale}
              valueStyle={{ color: "#8b5cf6" }}
              prefix={<Warehouse size={20} color="#8b5cf6" />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="glass-card" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSearch}
          initialValues={{ created_by: null }}
        >
          <Row gutter={32}>
            {/* Cột Xe Nhập Vào */}
            <Col xs={24} md={6}>
              <div
                style={{
                  padding: "15px",
                  background: "rgba(59, 130, 246, 0.03)",
                  borderRadius: "12px",
                  border: "1px solid rgba(59, 130, 246, 0.1)",
                  height: "100%",
                  opacity: isRetailOnly || isWholesaleOnly ? 0.3 : 1,
                }}
              >
                <Title
                  level={5}
                  style={{
                    marginBottom: 15,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Radio
                    checked={searchMode === "IMPORT"}
                    onChange={() => {
                      setSearchMode("IMPORT");
                      setSearchType("DATE_IMPORTER");
                    }}
                    disabled={isRetailOnly || isWholesaleOnly}
                  />
                  <Text
                    strong
                    style={{
                      color:
                        searchMode === "IMPORT"
                          ? "var(--primary-color)"
                          : "inherit",
                    }}
                  >
                    XE NHẬP VÀO
                  </Text>
                </Title>
                <Radio.Group
                  value={searchMode === "IMPORT" ? searchType : null}
                  onChange={(e) => setSearchType(e.target.value)}
                  disabled={
                    searchMode !== "IMPORT" || isRetailOnly || isWholesaleOnly
                  }
                  className="custom-radio-group"
                >
                  <Radio value="ENGINE_CHASSIS">Theo số khung - số máy</Radio>
                  <Radio value="DATE_IMPORTER">Theo ngày & Người nhập</Radio>
                </Radio.Group>
              </div>
            </Col>

            {/* Cột Chi tiết lọc */}
            <Col xs={24} md={12}>
              <div style={{ padding: "0 15px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 15,
                  }}
                >
                  <Filter size={16} color="var(--primary-color)" />
                  <Title level={5} style={{ margin: 0 }}>
                    BỘ LỌC CHI TIẾT
                  </Title>
                </div>
                <Row gutter={16}>
                  <Col span={isPowerUser ? 8 : 16}>
                    <Form.Item label="Khoảng thời gian" name="dates">
                      <RangePicker
                        style={{ width: "100%" }}
                        format="DD/MM/YYYY"
                        placeholder={["Từ ngày", "Đến ngày"]}
                      />
                    </Form.Item>
                  </Col>
                  {isPowerUser && (
                    <Col span={8}>
                      <Form.Item label="Lọc theo kho" name="warehouse_id">
                        <Select placeholder="Tất cả kho" allowClear>
                          {warehouses.map((w) => (
                            <Select.Option key={w.id} value={w.id}>
                              {w.warehouse_name}
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  )}
                  <Col span={8}>
                    <Form.Item label="Người thực hiện" name="created_by">
                      <Select
                        placeholder="Chọn người dùng"
                        allowClear
                        options={users.map((u) => ({
                          label: u.full_name || u.username,
                          value: u.id,
                        }))}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item label="Trạng thái tồn kho" name="status">
                      <Select placeholder="Tất cả trạng thái" allowClear>
                        <Select.Option value="In Stock">Trong kho (Chưa bán)</Select.Option>
                        <Select.Option value="Sold">Đã bán</Select.Option>
                        <Select.Option value="Transferring">Đang chuyển kho</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item label="Kênh Bán (Đầu ra)" name="sale_channel_filter">
                      <Select placeholder="Tất cả kênh bán" allowClear>
                        <Select.Option value="RETAIL">Bán Lẻ (Khách lẻ)</Select.Option>
                        <Select.Option value="WHOLESALE">Bán Sỉ (Đại lý/Lô)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>

                   <Col span={12}>
                    <Form.Item label="Số Máy (Engine No)" name="engine_no">
                      <AutoComplete
                        options={options}
                        onSearch={onSearchSuggestions}
                        onSelect={onSelectSuggestion}
                      >
                        <Input
                          prefix={<Search size={14} opacity={0.5} />}
                          placeholder="Gõ 2 ký tự để gợi ý..."
                        />
                      </AutoComplete>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Số Khung (Chassis No)" name="chassis_no">
                      <AutoComplete
                        options={options}
                        onSearch={onSearchSuggestions}
                        onSelect={(val, opt) => {
                          form.setFieldsValue({
                            engine_no: opt.engine,
                            chassis_no: opt.chassis,
                          });
                        }}
                      >
                        <Input
                          prefix={<Fingerprint size={14} opacity={0.5} />}
                          placeholder="Gõ 2 ký tự để gợi ý..."
                        />
                      </AutoComplete>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Chủ hàng / Nhà cung cấp"
                      name="supplier_id"
                    >
                      <Select
                        placeholder="Tất cả chủ hàng"
                        allowClear
                        showSearch
                        optionFilterProp="children"
                        style={{ width: "100%" }}
                      >
                        {suppliers.map((s) => (
                          <Select.Option key={s.id} value={s.id}>
                            {s.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Khách Hàng (Tìm theo danh sách)"
                      name="customer_name"
                    >
                      <Select
                        showSearch
                        mode="tags"
                        placeholder="Tìm hoặc nhập tên khách..."
                        style={{ width: "100%" }}
                        optionFilterProp="children"
                        maxCount={1}
                      >
                        {wholesaleCustomers.map((c) => (
                          <Select.Option key={c.id} value={c.name}>
                            {c.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </Col>

            {/* Cột Xe Bán Ra */}
            <Col xs={24} md={6}>
              <div
                style={{
                  padding: "15px",
                  background: "rgba(245, 158, 11, 0.03)",
                  borderRadius: "12px",
                  border: "1px solid rgba(245, 158, 11, 0.1)",
                  height: "100%",
                  opacity: isPurchaseOnly ? 0.3 : 1,
                }}
              >
                <Title
                  level={5}
                  style={{
                    marginBottom: 15,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Radio
                    checked={searchMode === "SALE"}
                    onChange={() => {
                      setSearchMode("SALE");
                      setSearchType("SALE_DATE");
                    }}
                    disabled={isPurchaseOnly}
                  />
                  <Text
                    strong
                    style={{
                      color: searchMode === "SALE" ? "#f59e0b" : "inherit",
                    }}
                  >
                    XE BÁN RA
                  </Text>
                </Title>
                <Radio.Group
                  value={searchMode === "SALE" ? searchType : null}
                  onChange={(e) => setSearchType(e.target.value)}
                  disabled={searchMode !== "SALE" || isPurchaseOnly}
                  className="custom-radio-group"
                >
                  <Radio value="SALE_DATE">Theo ngày tháng bán</Radio>
                  <Radio value="ENGINE_CHASSIS">Theo số khung + số máy</Radio>
                  <Radio value="DATE_IMPORTER">Theo nhập hàng gốc</Radio>
                </Radio.Group>
              </div>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 20 }}>
            <Space>
              <Button
                onClick={() => {
                  form.resetFields();
                  setResults([]);
                }}
              >
                Làm mới
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                icon={<Search size={18} />}
                style={{ minWidth: 150 }}
              >
                TRA CỨU NGAY
              </Button>
            </Space>
          </div>
        </Form>
      </Card>

      <Card className="glass-card table-card">
         <Table 
            columns={columns} 
            dataSource={processGroupedData()} 
            loading={loading}
            rowKey="key"
            scroll={{ x: 1300 }}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            onRow={(record) => ({
                onClick: () => {
                    if (record.isGroup) {
                        showBatchDetail(record);
                    } else {
                        showLifecycle(record.id);
                    }
                },
                style: { cursor: 'pointer' }
            })}
            rowClassName={(record) => {
                if (record.isGroup) return 'group-row';
                return record.sale_date ? 'sold-row' : 'instock-row';
            }}
         />
      </Card>

      {/* Modal Chi tiết Lô hàng */}
      <Modal
        title={
            <Space>
                <Box size={20} color="var(--primary-color)" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong>CHI TIẾT LÔ HÀNG</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {isPurchaseOnly ? selectedBatchInfo?.supplier_name : (selectedBatchInfo?.customer_name || selectedBatchInfo?.supplier_name)}
                    </Text>
                </div>
            </Space>
        }
        open={batchVisible}
        onCancel={() => setBatchVisible(false)}
        footer={[<Button key="close" onClick={() => setBatchVisible(false)}>Đóng</Button>]}
        width={1000}
        className="glass-modal"
      >
          <Table 
            dataSource={selectedBatchData}
            rowKey="id"
            pagination={false}
            scroll={{ y: 400 }}
            rowClassName={(r) => r.sale_date ? 'sold-row' : 'instock-row'}
            columns={[
                { 
                    title: 'Trạng thái', 
                    dataIndex: 'sale_channel',
                    width: 120,
                    render: (c, r) => (
                        <Tag color={r.sale_date ? 'warning' : 'success'}>
                            {c === 'Chưa bán' ? 'Tồn kho' : c}
                        </Tag>
                    )
                },
                { title: 'Loại xe', dataIndex: 'type_name' },
                { title: 'Số Máy', dataIndex: 'engine_no', className: 'strong-text' },
                { title: 'Số Khung', dataIndex: 'chassis_no', className: 'strong-text' },
                { 
                    title: 'Giá tiền', 
                    render: (r) => (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
                                Nhập: {Number(r.purchase_price || 0).toLocaleString()} đ
                            </div>
                            {r.sale_date && (
                                <div style={{ fontWeight: 'bold', color: '#f59e0b' }}>
                                    Bán: {Number(r.sale_price || 0).toLocaleString()} đ
                                </div>
                            )}
                            {!r.sale_date && (
                                <div style={{ fontWeight: 'bold', color: '#10b981' }}>
                                    Gốc: {Number(r.purchase_price || 0).toLocaleString()} đ
                                </div>
                            )}
                        </div>
                    )
                },
                {
                    title: 'Thao tác',
                    width: 70,
                    render: (r) => (
                        <Button 
                            icon={<History size={16} />} 
                            type="text" 
                            onClick={() => showLifecycle(r.id)}
                        />
                    )
                }
            ]}
          />
      </Modal>

      {/* Modal Sửa dữ liệu sai (Chỉ Admin) */}
      <Modal
        title={
          <Space>
            <Edit2 size={18} /> SỬA DỮ LIỆU SAI (QUYỀN ADMIN)
          </Space>
        }
        open={editVisible}
        onCancel={() => setEditVisible(false)}
        onOk={() => editForm.submit()}
        confirmLoading={savingEdit}
        okText="Cập nhật"
        cancelText="Hủy"
        width={600}
      >
        <Form form={editForm} layout="vertical" onFinish={submitEdit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Số Máy"
                name="engine_no"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Số Khung"
                name="chassis_no"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ngày Nhập" name="import_date">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Ngày Bán" name="sale_date">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Giá Mua (VND)" name="purchase_price">
                <Input type="number" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Giá Bán (VND)" name="sale_price">
                <Input type="number" />
              </Form.Item>
            </Col>
          </Row>
          <div
            style={{
              background: "rgba(239, 68, 68, 0.05)",
              padding: 12,
              borderRadius: 8,
              border: "1px solid rgba(239, 68, 68, 0.1)",
            }}
          >
            <Text type="danger" size="small">
              <Info size={12} style={{ marginRight: 4 }} />
              Lưu ý: Mọi thay đổi sẽ được ghi lại trong nhật ký hệ thống. Hãy
              kiểm tra kỹ trước khi cập nhật.
            </Text>
          </div>
        </Form>
      </Modal>

      {/* Drawer Nhật ký Vòng đời (UX tối ưu: Không che khuất bảng) */}
      <Drawer
        title={
          <Space>
            <History size={20} /> NHẬT KÝ CHI TIẾT XE
          </Space>
        }
        placement="right"
        width={500}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        className="glass-drawer"
      >
        {detailLoading ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <Spin tip="Đang tải..." />
          </div>
        ) : detailData ? (
          <div>
            <Card
              className="detail-header-card"
              style={{
                marginBottom: 24,
                background: "rgba(var(--primary-rgb), 0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
                <div
                  style={{
                    padding: 12,
                    background: "#fff",
                    borderRadius: 12,
                    boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                  }}
                >
                  <Truck size={32} color="var(--primary-color)" />
                </div>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {detailData.vehicle.VehicleType?.name}
                  </Title>
                  <Text type="secondary">
                    {detailData.vehicle.VehicleColor?.color_name}
                  </Text>
                </div>
              </div>
              <Divider style={{ margin: "12px 0" }} />
              <Space direction="vertical" style={{ width: "100%" }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Text type="secondary">Số Máy:</Text>
                  <Text strong>{detailData.vehicle.engine_no}</Text>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Text type="secondary">Số Khung:</Text>
                  <Text strong>{detailData.vehicle.chassis_no}</Text>
                </div>
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Text type="secondary">Kho hiện tại:</Text>
                  <Tag color="blue">
                    {detailData.vehicle.Warehouse?.warehouse_name}
                  </Tag>
                </div>
              </Space>
            </Card>

            <Timeline
              mode="left"
              items={detailData.timeline.map((item) => ({
                label: (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(item.date).format("DD/MM/YYYY HH:mm")}
                  </Text>
                ),
                children: (
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 2,
                      }}
                    >
                      {getTimelineIcon(item.type)}
                      <Space>
                        <Text strong>{item.title}</Text>
                        {/* Cảnh báo lỗi logic ngày tháng */}
                        {detailData.vehicle.Purchase?.purchase_date && item.type !== 'PURCHASE' && dayjs(detailData.vehicle.Purchase.purchase_date).isAfter(dayjs(item.date)) && (
                            <Tag color="error" icon={<AlertCircle size={12} />}>Lỗi: Trước ngày nhập</Tag>
                        )}
                      </Space>
                    </div>
                    <Paragraph
                      style={{
                        marginBottom: 2,
                        fontSize: 13,
                        color: "rgba(0,0,0,0.65)",
                      }}
                    >
                      {item.message}
                    </Paragraph>
                    <Space>
                      {item.price && (
                        <Text
                          strong
                          style={{ color: "#10b981", display: "block" }}
                        >
                          {Number(item.price).toLocaleString()} đ
                        </Text>
                      )}
                      {item.guarantee === "Có" && (
                        <Tag color="green">Có bảo hành</Tag>
                      )}
                    </Space>
                  </div>
                ),
                dot: getTimelineIcon(item.type),
              }))}
            />
          </div>
        ) : (
          <Empty />
        )}
      </Drawer>

      <style>{`
        .strong-text {
            font-weight: 600;
            color: var(--primary-color);
        }
        .table-card .ant-card-body {
            padding: 0;
        }
        .custom-radio-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .custom-radio-group .ant-radio-wrapper {
            margin: 0 !important;
            font-size: 13px;
        }
        .sold-row {
            background-color: rgba(245, 158, 11, 0.02);
        }
        .instock-row {
            background-color: rgba(16, 185, 129, 0.01);
        }
        .sold-row:hover td {
            background-color: rgba(245, 158, 11, 0.05) !important;
        }
        .instock-row:hover td {
            background-color: rgba(16, 185, 129, 0.04) !important;
        }
        .stat-card .ant-statistic-title {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
      `}</style>
      <Modal
        title={
          <Space>
            <Banknote size={18} /> Thu tiền {selectedSaleForPayment?.sale_channel === 'Bán Sỉ (Lô)' ? 'Khách buôn' : 'Khách lẻ'}: {selectedSaleForPayment?.customer_name}
          </Space>
        }
        open={retailPaymentModalVisible || wholesalePaymentModalVisible}
        onCancel={() => { setRetailPaymentModalVisible(false); setWholesalePaymentModalVisible(false); }}
        footer={null}
        width={700}
        className="glass-modal"
      >
        {selectedSaleForPayment && (
          <div style={{ marginBottom: 20 }}>
             <Row gutter={16}>
                <Col span={12}>
                    <Card size="small" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: 12, opacity: 0.6 }}>Tổng giá bán:</div>
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--primary-color)' }}>{Number(selectedSaleForPayment.sale_price || 0).toLocaleString()} đ</div>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card size="small" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'right' }}>Đã trả:</div>
                        <div style={{ fontSize: 18, fontWeight: 'bold', color: '#10b981', textAlign: 'right' }}>
                            {(() => {
                                const isWholesale = selectedSaleForPayment.isGroup || selectedSaleForPayment.sale_channel === 'Bán Sỉ (Lô)';
                                let totalPaidFromHistory = 0;
                                
                                if (paymentHistory && paymentHistory.length > 0) {
                                    totalPaidFromHistory = paymentHistory.reduce((sum, p) => 
                                        sum + Number(isWholesale ? (p.amount_paid_vnd || 0) : (p.amount || 0)), 0
                                    );
                                } else {
                                    // Sử dụng dữ liệu đã được Backend tính toán sẵn (paid_amount)
                                    totalPaidFromHistory = Number(selectedSaleForPayment.paid_amount || 0);
                                }

                                if (isWholesale) return totalPaidFromHistory.toLocaleString();

                                // For Retail: Cộng thêm tiền giải ngân nếu đã chốt
                                const isDisbursed = selectedSaleForPayment.is_disbursed === true || selectedSaleForPayment.is_disbursed === 1;
                                const loan = isDisbursed ? Number(selectedSaleForPayment.loan_amount || 0) : 0;
                                return (totalPaidFromHistory + loan).toLocaleString();
                            })()} đ
                        </div>
                    </Card>
                </Col>
             </Row>

             <Divider orientation="left" plain><span style={{ fontSize: 12, opacity: 0.7, fontWeight: 'bold' }}>THÊM KHOẢN THU (KHÁCH TRẢ THÊM)</span></Divider>

             <Form form={paymentForm} layout="vertical" onFinish={onAddPayment}>
                <Row gutter={16}>
                    <Col span={8}>
                        <Form.Item label="Ngày thu" name="payment_date" rules={[{required: true}]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="Số tiền thu" name="amount" rules={[{required: true}]}>
                            <InputNumber 
                                style={{ width: '100%' }} 
                                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                parser={v => v.replace(/\$\s?|(,*)/g, '')}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="Hình thức" name="payment_method">
                            <Select>
                                <Select.Option value="Tiền mặt">Tiền mặt</Select.Option>
                                <Select.Option value="Chuyển khoản">Chuyển khoản</Select.Option>
                            </Select>
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label="Ghi chú" name="notes">
                    <Input placeholder="Nhập ghi chú..." />
                </Form.Item>
                <Button type="primary" icon={<Save size={16} />} block htmlType="submit" loading={paymentLoading}>
                    XÁC NHẬN THU TIỀN
                </Button>
             </Form>

             <Divider orientation="left" plain><span style={{ fontSize: 12, opacity: 0.7, fontWeight: 'bold' }}>CHI TIẾT CÁC LẦN TRẢ TIỀN</span></Divider>
             
             <Table 
                dataSource={paymentHistory}
                pagination={false}
                size="small"
                rowKey="id"
                loading={paymentLoading}
                columns={[
                    { title: 'NGÀY', dataIndex: 'payment_date', render: d => dayjs(d).format('DD/MM/YYYY') },
                    { 
                        title: 'SỐ TIỀN', 
                        dataIndex: wholesalePaymentModalVisible ? 'amount_paid_vnd' : 'amount', 
                        render: v => <Text strong style={{ color: '#10b981' }}>{Number(v).toLocaleString()} đ</Text> 
                    },
                    { title: 'HÌNH THỨC', dataIndex: 'payment_method', render: v => v || 'Tiền mặt' },
                    { title: 'GHI CHÚ', dataIndex: 'notes' },
                    { 
                        title: '', 
                        render: (_, record) => (
                            <Popconfirm title="Xóa khoản thu này?" onConfirm={() => handleDeletePayment(record.id)}>
                                <Button 
                                    type="text" 
                                    danger 
                                    icon={<Trash2 size={14} />} 
                                    size="small" 
                                />
                            </Popconfirm>
                        ) 
                    }
                ]}
             />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default VehicleLifecyclePage;
