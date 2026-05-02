import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
  Tabs,
  Card,
  Typography,
  Row,
  Col,
  Badge,
  Space,
  Button,
  message,
  Empty,
  Table,
  Tag,
  Form,
  Input,
  InputNumber,
  DatePicker,
  AutoComplete,
  Divider,
  Popconfirm,
  Modal,
  Timeline,
  Collapse,
  Select,
} from "antd";
import {
  LayoutGrid,
  Wrench,
  User,
  Bike,
  Clock,
  PlusCircle,
  Expand,
  Settings,
  History,
  Save,
  Trash2,
  CheckCircle,
  Search,
  FileText,
  Eye,
  XCircle,
  MapPin,
  Printer,
  Edit,
  AlertCircle,
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../utils/api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/vi";
import PrintMaintenanceOrder from "../../components/PrintMaintenanceOrder";
import ImportExcelModal from "../../components/ImportExcelModal";
import { FileSpreadsheet } from "lucide-react";

dayjs.extend(relativeTime);
dayjs.locale("vi");
import { capitalizeName } from "../../utils/stringHelper";

const { Title, Text } = Typography;

// --- SUB-COMPONENT: MAINTENANCE BOARD ---
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const MaintenanceBoard = ({
  lifts,
  fetchData,
  loading,
  onEditOrder,
  onCreateNew,
}) => {
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [now, setNow] = useState(dayjs());
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.role === "ADMIN";

  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs()), 1000); // Cập nhật mỗi 1 giây
    return () => clearInterval(timer);
  }, []);

  const getDurationText = (startTime) => {
    if (!startTime) return "N/A";

    // Tính toán dựa trên timestamp tuyệt đối để tránh lệch múi giờ
    const start = dayjs(startTime).valueOf();
    const current = now.valueOf();
    let diffInSeconds = Math.floor((current - start) / 1000);

    if (diffInSeconds < 0) diffInSeconds = 0; // Tránh trường hợp đồng hồ máy tính bị chậm

    if (diffInSeconds < 60) return `${diffInSeconds} giây`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;
    const seconds = diffInSeconds % 60;

    if (hours > 0) return `${hours} giờ ${minutes} phút ${seconds} giây`;
    return `${minutes} phút ${seconds} giây`;
  };

  const fetchInitialData = async () => {
    try {
      const whRes = await api.get("/warehouses");
      if (isAdmin || user.accessible_warehouses) {
        const allWh = whRes.data;
        if (isAdmin) {
          setWarehouses(allWh);
        } else {
          const allowedIds = [user.warehouse_id, ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])];
          const filtered = allWh.filter(w => allowedIds.includes(w.id));
          setWarehouses(filtered);
          if (filtered.length > 0) setSelectedWarehouse(user.warehouse_id);
        }
      } else if (user.warehouse_id) {
        setSelectedWarehouse(user.warehouse_id);
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu ban đầu:", error.message);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredLifts = lifts.filter(
    (l) => !selectedWarehouse || l.warehouse_id === selectedWarehouse,
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "AVAILABLE":
        return "success";
      case "BUSY":
        return "error";
      case "MAINTENANCE":
        return "warning";
      default:
        return "default";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "AVAILABLE":
        return "SẴN SÀNG";
      case "BUSY":
        return "ĐANG SỬA";
      case "MAINTENANCE":
        return "BẢO TRÌ BÀN";
      default:
        return "KO XÁC ĐỊNH";
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Text type="secondary">
          Quản lý và theo dõi trạng thái sửa chữa thời gian thực
        </Text>
        <Space wrap className="mobile-stack">
          { (isAdmin || (user.accessible_warehouses && user.accessible_warehouses.length > 0)) ? (
            <Select
              placeholder="Lọc theo kho/chi nhánh"
              style={{ width: 250 }}
              allowClear
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
            >
              {warehouses.map((w) => (
                <Select.Option key={w.id} value={w.id}>
                  {w.warehouse_name}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <Tag color="blue" style={{ padding: "4px 12px", borderRadius: 8 }}>
              <Space>
                <MapPin size={14} />{" "}
                <Text strong>
                  {
                    warehouses.find((w) => w.id === user.warehouse_id)
                      ?.warehouse_name
                  }
                </Text>
              </Space>
            </Tag>
          )}
          <Button
            icon={<Clock size={16} />}
            onClick={fetchData}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>
      </div>

      <Row gutter={[20, 20]}>
        {filteredLifts.map((lift) => {
          const activeOrder = lift.MaintenanceOrders?.[0];
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={lift.id}>
              <Card
                hoverable
                className={`lift-card ${lift.status === "BUSY" ? "busy-lift" : ""}`}
                styles={{ body: { padding: "16px" } }}
                style={{ borderRadius: 16, cursor: "pointer" }}
                onClick={() => {
                  const activeOrder = lift.MaintenanceOrders?.[0];
                  if (lift.status === "BUSY" && activeOrder) {
                    onEditOrder(activeOrder.id);
                  } else if (lift.status === "AVAILABLE") {
                    onCreateNew({
                      lift_id: lift.id,
                      warehouse_id: lift.warehouse_id,
                    });
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <Text strong>{lift.name}</Text>
                  <Badge
                    status={getStatusColor(lift.status)}
                    text={
                      <span style={{ fontWeight: "bold", fontSize: 11 }}>
                        {getStatusText(lift.status)}
                      </span>
                    }
                  />
                </div>

                {lift.status === "BUSY" && activeOrder ? (
                  <div style={{ minHeight: 120 }}>
                    <div
                      style={{
                        marginBottom: 8,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Bike
                        size={14}
                        style={{ marginRight: 8, opacity: 0.7 }}
                      />
                      <Text
                        strong
                        style={{ fontSize: 18, color: "var(--primary-color)" }}
                      >
                        {activeOrder.license_plate || "Chưa biển"}
                      </Text>
                    </div>
                    <div
                      style={{
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <User
                        size={14}
                        style={{ marginRight: 8, opacity: 0.7 }}
                      />
                      <Text>{activeOrder.customer_name}</Text>
                    </div>
                    <div
                      style={{
                        marginBottom: 16,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Clock
                        size={14}
                        style={{ marginRight: 8, opacity: 0.7 }}
                      />
                      <Text style={{ fontSize: 13 }}>
                        Sửa được:{" "}
                        <Text strong style={{ color: "#f59e0b" }}>
                          {getDurationText(activeOrder.createdAt)}
                        </Text>
                      </Text>
                    </div>

                    <Button
                      block
                      type="primary"
                      ghost
                      icon={<Expand size={14} />}
                      onClick={() => onEditOrder(activeOrder.id)}
                    >
                      Chi tiết / Cập nhật
                    </Button>
                  </div>
                ) : (
                  <div
                    style={{
                      minHeight: 120,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      opacity: 0.5,
                    }}
                  >
                    {lift.status === "AVAILABLE" ? (
                      <Button
                        icon={<PlusCircle size={16} />}
                        onClick={() =>
                          onCreateNew({
                            lift_id: lift.id,
                            warehouse_id: lift.warehouse_id,
                          })
                        }
                      >
                        Tiếp nhận xe
                      </Button>
                    ) : (
                      <Text italic>Đang bảo trì bàn</Text>
                    )}
                  </div>
                )}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    fontSize: 11,
                    opacity: 0.5,
                  }}
                >
                  Chi nhánh: {lift.Warehouse?.warehouse_name}
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

// --- SUB-COMPONENT: LIFT MANAGER ---
const LiftManager = () => {
  const [data, setData] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [liftRes, whRes] = await Promise.all([
        api.get("/lift-tables"),
        api.get("/warehouses"),
      ]);
      setData(liftRes.data);
      setWarehouses(whRes.data);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (values) => {
    try {
      if (editingItem) await api.put(`/lift-tables/${editingItem.id}`, values);
      else await api.post("/lift-tables", values);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error(error.message);
    }
  };

  return (
    <Card className="glass-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Quản lý bàn nâng
        </Title>
        <Button
          type="primary"
          onClick={() => {
            setEditingItem(null);
            form.resetFields();
            setIsModalOpen(true);
          }}
        >
          Thêm bàn nâng
        </Button>
      </div>
      <Table
        columns={[
          { title: "Tên bàn", dataIndex: "name" },
          { title: "Kho", dataIndex: ["Warehouse", "warehouse_name"] },
          {
            title: "Trạng thái",
            dataIndex: "status",
            render: (s) => (
              <Tag color={s === "BUSY" ? "blue" : "green"}>{s}</Tag>
            ),
          },
          {
            title: "Thao tác",
            render: (_, r) => (
              <Button
                type="text"
                icon={<Trash2 size={16} />}
                onClick={async () => {
                  await api.delete(`/lift-tables/${r.id}`);
                  fetchData();
                }}
              />
            ),
          },
        ]}
        dataSource={data}
        rowKey="id"
        loading={loading}
      />
      {/* Modal simple for brevity in this merged file */}
      <Modal
        title={editingItem ? "Sửa bàn nâng" : "Thêm bàn nâng"}
        open={isModalOpen}
        onOk={() => form.submit()}
        onCancel={() => setIsModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Tên bàn" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="warehouse_id"
            label="Kho"
            rules={[{ required: true }]}
          >
            <Select>
              {warehouses.map((w) => (
                <Select.Option key={w.id} value={w.id}>
                  {w.warehouse_name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

// --- MAIN HUB PAGE ---
const MaintenanceHub = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("board");
  const [form] = Form.useForm();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const canDeleteTicket = user.role === "ADMIN" || user.can_delete_ticket;
  const canEditTicket = user.role === "ADMIN" || user.can_edit_ticket;
  const isAdmin = user.role === "ADMIN";

  // --- Shared States ---
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [allParts, setAllParts] = useState([]);
  const [liftTables, setLiftTables] = useState([]);
  const [vehicleFound, setVehicleFound] = useState(null);
  const [history, setHistory] = useState([]);
  const [partOptions, setPartOptions] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicleHistoryModal, setVehicleHistoryModal] = useState(null); // { engine_no, license_plate, chassis_no, customer_name }
  const engineNo = Form.useWatch("engine_no", form);
  const licensePlate = Form.useWatch("license_plate", form);
  const chassisNo = Form.useWatch("chassis_no", form);
  const [printingOrder, setPrintingOrder] = useState(null);
  const [maintenanceRules, setMaintenanceRules] = useState([]);
  const [amberJobs, setAmberJobs] = useState([
    { content: "", date: null, km: "" },
    { content: "", date: null, km: "" },
    { content: "", date: null, km: "" },
  ]);
  const selectedWarehouse = Form.useWatch("warehouse_id", form);
  const [historySearch, setHistorySearch] = useState("");
  const [partSearchText, setPartSearchText] = useState("");
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);

  // Debounce search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (partSearchText) {
        executePartSearch(partSearchText);
      } else {
        setPartOptions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [partSearchText]);

  const kmReading = Form.useWatch("km_reading", form);

  useEffect(() => {
    if (!kmReading) return;

    let updatedJobs = [...amberJobs];
    let changed = false;

    // 1. Detect Oil Change
    const oilChangeItem = items.find(item => 
      (item.description || "").toLowerCase().includes("thay dầu") || 
      (item.description || "").toLowerCase().includes("nhớt") ||
      (item.description || "").toLowerCase().includes("thay dau")
    );

    if (oilChangeItem) {
      const nextKm = Number(kmReading) + 2000;
      const existingIdx = updatedJobs.findIndex(j => j.content.includes("Thay dầu"));
      if (existingIdx > -1) {
        if (updatedJobs[existingIdx].km !== nextKm) {
          updatedJobs[existingIdx] = { ...updatedJobs[existingIdx], km: nextKm, content: "Thay dầu máy (định kỳ)" };
          changed = true;
        }
      } else {
        // Find empty slot or add new
        const emptyIdx = updatedJobs.findIndex(j => !j.content);
        if (emptyIdx > -1) {
          updatedJobs[emptyIdx] = { content: "Thay dầu máy (định kỳ)", time: "", km: nextKm };
        } else {
          updatedJobs.push({ content: "Thay dầu máy (định kỳ)", time: "", km: nextKm });
        }
        changed = true;
      }
    }

    // 2. Dynamic Rules from Settings
    maintenanceRules.forEach(rule => {
      if (kmReading >= rule.min_km && kmReading <= rule.max_km) {
        if (!updatedJobs.some(j => j.content.includes(rule.suggestion))) {
          const emptyIdx = updatedJobs.findIndex(j => !j.content);
          if (emptyIdx > -1) {
            updatedJobs[emptyIdx] = { 
              content: rule.suggestion, 
              date: rule.time_gap_months ? dayjs().add(rule.time_gap_months, 'month') : null, 
              km: "" 
            };
          } else {
            updatedJobs.push({ 
              content: rule.suggestion, 
              date: rule.time_gap_months ? dayjs().add(rule.time_gap_months, 'month') : null, 
              km: "" 
            });
          }
          changed = true;
        }
      }
    });

    if (changed) {
      setAmberJobs(updatedJobs);
    }
  }, [items, kmReading, maintenanceRules]);

  const fetchMaintenanceRules = async () => {
    try {
      const res = await api.get('/maintenance-rules');
      setMaintenanceRules(res.data.filter(r => r.is_active));
    } catch (e) {
      console.error('Lỗi khi tải quy tắc bảo trì:', e);
    }
  };

  const fetchData = async () => {
    try {
      fetchMaintenanceRules();
      const [whRes, mechanicsRes, liftRes, historyRes, typesRes] =
        await Promise.all([
          api.get("/warehouses"),
          api.get("/mechanics"),
          api.get("/lift-tables"),
          api.get("/maintenance-orders"),
          api.get("/vehicle-types"),
        ]);
      const isPowerUser = user.role === "ADMIN" || user.role === "MANAGER";
      if (isPowerUser || user.accessible_warehouses) {
        const allWh = whRes.data;
        if (isPowerUser) {
          setWarehouses(allWh);
        } else {
          const allowedIds = [user.warehouse_id, ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])];
          setWarehouses(allWh.filter(w => allowedIds.includes(w.id)));
        }
      } else {
        setWarehouses(whRes.data.filter(w => w.id === user.warehouse_id));
      }
      setMechanics(mechanicsRes.data.filter((m) => m.is_active));
      setLiftTables(liftRes.data);
      setHistory(historyRes.data);
      setVehicleTypes(typesRes.data);
    } catch (e) {
      message.error(e.message);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    setLoading(true);
    setPrintingOrder(null);
    try {
      const res = await api.get("/maintenance-orders");
      const order = res.data.find((o) => o.id === orderId);
      if (order) {
        const ktdkMatch = (order.notes || "").match(/KTDK lần (\d+)/);
        const ktdk_type = ktdkMatch ? parseInt(ktdkMatch[1]) : null;

        form.setFieldsValue({
          ...order,
          ktdk_type,
          maintenance_date: dayjs(order.maintenance_date),
          received_at: order.received_at ? dayjs(order.received_at) : null,
          returned_at: order.returned_at ? dayjs(order.returned_at) : null,
        });
        if (order.amber_jobs) {
          try {
            const parsed = JSON.parse(order.amber_jobs);
            setAmberJobs(parsed);
          } catch (e) {
            console.error("Error parsing amber_jobs", e);
          }
        } else {
          setAmberJobs([
            { content: "", time: "", km: "" },
            { content: "", time: "", km: "" },
            { content: "", time: "", km: "" },
          ]);
        }
        setItems(
          order.MaintenanceItems.map((i) => ({
            key: i.id,
            type: i.type,
            part_id: i.part_id,
            description: i.type === "PART" ? i.Part?.name : i.description,
            unit: i.unit,
            quantity: i.quantity,
            unit_price: i.unit_price,
            total_price: i.total_price,
            sale_type: i.sale_type || "THU_NGAY",
            purchase_price: i.purchase_price || 0,
            discount_pct: i.discount_pct || 0,
            discount_amount: i.discount_amount || 0,
            notes: i.notes || "",
            Part: i.Part,
          })),
        );
        setVehicleFound({
          internal: order.is_internal_vehicle,
          data: order,
        });
        setActiveTab("form");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (id) {
      fetchOrderDetails(id);
    } else if (location.state?.lift_id) {
      setActiveTab("form");
      form.setFieldsValue({
        lift_table_id: location.state.lift_id,
        warehouse_id: location.state.warehouse_id,
        maintenance_date: dayjs(),
        received_at: dayjs(),
      });
    }
  }, [id, location.state]);

  const vehicleType = Form.useWatch("vehicle_type", form);

  const handleEditFromBoard = (id) => {
    navigate(`/maintenance-hub/${id}`);
    setActiveTab("form");
  };

  const handleCreateNew = (initialData = {}) => {
    navigate("/maintenance-hub", { state: initialData });
    setActiveTab("form");
    form.resetFields();
    setItems([]);
    setAmberJobs([
      { content: "", date: null, km: "" },
      { content: "", date: null, km: "" },
      { content: "", date: null, km: "" },
    ]);
  };

  const executePartSearch = async (value) => {
    try {
      // Backend now returns inventory info inside each part object
      const res = await api.get(`/parts?search=${encodeURIComponent(value)}`);
      const parts = res.data.rows;

      const options = parts.map((p) => {
        // Tồn tại kho đang chọn
        const currentWHInv = (p.PartInventories || []).find(
          (i) => i.warehouse_id === selectedWarehouse,
        );
        const stockInCurrent = currentWHInv ? Number(currentWHInv.quantity) : 0;

        // Tổng tồn các kho khác
        const otherWHInv = (p.PartInventories || []).filter(
          (i) => i.warehouse_id !== selectedWarehouse,
        );
        const totalOtherStock = otherWHInv.reduce(
          (sum, i) => sum + Number(i.quantity),
          0,
        );

        return {
          value: p.code,
          label: (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text strong style={{ display: "block" }}>
                  {p.code}
                </Text>
                <Text
                  type="secondary"
                  style={{
                    fontSize: "12px",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.name}
                </Text>
              </div>
              <div
                style={{ textAlign: "right", marginLeft: 12, flexShrink: 0 }}
              >
                <Tag
                  color={stockInCurrent > 0 ? "green" : "red"}
                  style={{ margin: 0 }}
                >
                  Tồn: {stockInCurrent}
                </Tag>
                {stockInCurrent === 0 && totalOtherStock > 0 && (
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#8c8c8c",
                      marginTop: "2px",
                    }}
                  >
                    ({totalOtherStock} ở kho khác)
                  </div>
                )}
              </div>
            </div>
          ),
          part: p,
          stock: stockInCurrent,
        };
      });
      setPartOptions(options);
    } catch (error) {
      console.error(error);
    }
  };

  const handleVehicleSearch = async (value) => {
    if (!value) {
      setVehicleOptions([]);
      setVehicleFound(null);
      return;
    }
    if (value.length < 3) return;

    try {
      const res = await api.get(`/search-sold-vehicles?q=${value}`);
      let options = res.data.map((item) => {
        if (item.is_previous_external) {
          return {
            value: `PREV_EXTERNAL_${item.id}`, // Unique value
            label: (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  <Text strong>
                    {item.engine_no || item.license_plate || "Chưa rõ"}
                  </Text>{" "}
                  - {item.customer_name}
                  <div style={{ fontSize: "11px", opacity: 0.6 }}>
                    Vãng lai (Đã ghé) | {item.phone}
                  </div>
                </span>
                <Tag color="blue" style={{ margin: 0 }}>
                  Đã ghé
                </Tag>
              </div>
            ),
            item,
            isInternal: false,
            isPreviousExternal: true,
          };
        }
        return {
          value: `INTERNAL_${item.id}`, // Unique value
          label: (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                <Text strong>{item.engine_no}</Text> - {item.customer_name}
                <div style={{ fontSize: "11px", opacity: 0.6 }}>
                  {item.chassis_no} | {item.phone}
                </div>
              </span>
              <Tag color="green" style={{ margin: 0 }}>
                Hệ thống
              </Tag>
            </div>
          ),
          item,
          isInternal: true,
        };
      });

      // Thêm tùy chọn xe ngoài mới (nếu chưa có trong list)
      if (
        !res.data.some(
          (d) =>
            d.engine_no?.toUpperCase() === value.toUpperCase() ||
            d.license_plate?.toUpperCase() === value.toUpperCase(),
        )
      ) {
        options.push({
          value: `EXTERNAL_${value}`, // Unique value
          label: (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                Tiếp nhận mới <b>"{value}"</b>
              </span>
              <Tag color="orange" style={{ margin: 0 }}>
                Xe lạ
              </Tag>
            </div>
          ),
          isInternal: false,
          isPreviousExternal: false,
          searchValue: value,
        });
      }

      setVehicleOptions(options);
    } catch (e) {
      console.error(e);
    }
  };

  const handleVehicleSelect = (val, option) => {
    if (option.isInternal) {
      const item = option.item;
      setVehicleFound({ internal: true, data: item });
      form.setFieldsValue({
        customer_name: item.customer_name || item.RetailSale?.customer_name,
        customer_phone: item.phone || item.RetailSale?.phone,
        customer_address: item.address || item.RetailSale?.address,
        engine_no: item.engine_no,
        chassis_no: item.chassis_no,
        model_name: item.Vehicle?.VehicleType?.name || "",
        search_vehicle: item.engine_no, // Set input back to clean engine number
      });
      message.success("Đã nhận diện xe hệ thống bán ra!");
    } else if (option.isPreviousExternal) {
      const item = option.item;
      setVehicleFound({ internal: false, data: item });
      form.setFieldsValue({
        customer_name: item.customer_name,
        customer_phone: item.phone,
        customer_address: item.address,
        engine_no: item.engine_no,
        chassis_no: item.chassis_no,
        license_plate: item.license_plate,
        model_name: item.model_name,
        search_vehicle: item.engine_no || item.license_plate,
      });
      message.success("Nhận diện xe ngoài từng ghé!");
    } else {
      const searchVal = option.searchValue;
      setVehicleFound({ internal: false });
      form.setFieldsValue({
        engine_no: searchVal,
        search_vehicle: searchVal,
      });
      message.info("Tiếp nhận xe ngoài mới");
    }
  };

  const onFinish = async (values) => {
    setSubmitLoading(true);
    const hide = message.loading("Đang xử lý...", 0);
    try {
      // Đảm bảo có ngày thực hiện, mặc định là ngày hiện tại nếu bị trống
      const mDate = values.maintenance_date
        ? typeof values.maintenance_date.toISOString === "function"
          ? values.maintenance_date
          : dayjs(values.maintenance_date)
        : dayjs();

      const totalAmount = items.reduce(
        (s, i) => s + Number(i.total_price || 0),
        0,
      );

      const payload = {
        ...values,
        maintenance_date: values.received_at ? values.received_at.toISOString() : mDate.toISOString(),
        received_at: values.received_at ? values.received_at.toISOString() : null,
        returned_at: values.returned_at ? values.returned_at.toISOString() : null,
        items,
        amber_jobs: JSON.stringify(amberJobs),
        paid_amount:
          values.status === "COMPLETED" ? totalAmount : values.paid_amount || 0,
      };

      if (id) await api.put(`/maintenance-order/${id}`, payload);
      else await api.post("/maintenance-order", payload);
      message.success("Thao tác thành công!");
      await fetchData();
      setActiveTab("board");
      navigate("/maintenance-hub");
    } catch (e) {
      message.error(e.message);
    } finally {
      setSubmitLoading(false);
      hide();
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await api.delete(`/maintenance-order/${orderId}`);
      message.success("Đã xóa phiếu bảo trì");
      fetchData();
    } catch (e) {
      message.error("Lỗi khi xóa: " + (e.response?.data?.message || e.message));
    }
  };

  const buildPrintHtml = (orderData, warehouseData, itemsData, amberJobs) => {
    const serviceItems = (itemsData || []).filter((i) => i.type === "SERVICE");
    const partItems = (itemsData || []).filter((i) => i.type === "PART");
    const totalLabor = serviceItems.reduce((s, i) => s + Number(i.total_price || 0), 0);
    const totalParts = partItems.reduce((s, i) => s + Number(i.total_price || 0), 0);
    const grandTotal = totalLabor + totalParts;
    const vatPercent = orderData.vat_percent || 0;
    const vatAmount = (grandTotal * vatPercent) / 100;
    const finalTotal = grandTotal + vatAmount;

    const fmt = (n) => Number(n || 0).toLocaleString("vi-VN");
    const fmtDate = (d) => {
      if (!d) return "";
      return dayjs(d).format("DD/MM/YYYY HH:mm");
    };

    const maxRows = 20;

    let bodyRows = "";
    for (let i = 0; i < maxRows; i++) {
      const item = itemsData?.[i];
      bodyRows += `<tr style="height:20px">
                <td style="text-align:center">${i + 1}</td>
                <td>${item?.description || ""}</td>
                <td>${item?.Part?.code || item?.part_code || ""}</td>
                <td></td>
                <td></td>
                <td></td>
                <td style="text-align:center">${item?.type === "PART" ? "v" : ""}</td>
                <td></td>
                <td style="text-align:center">${item?.quantity || ""}</td>
                <td style="text-align:right">${item?.type === "PART" ? fmt(item.total_price) : ""}</td>
                <td style="text-align:right">${item?.type === "SERVICE" ? fmt(item.total_price) : ""}</td>
                <td style="text-align:right">${item ? fmt(item.total_price) : ""}</td>
            </tr>`;
    }

    const checklist = [
      "Mức dầu - rò rỉ dầu - bu lông xả dầu",
      "Ống dẫn nhiên liệu (rò rỉ, lỏng ốc...)",
      "Vật dễ cháy và vị trí các sóc chuột (chuột, rác...)",
      "Hệ thống phanh (Hành trình tự do, hoạt động của phanh...)",
      "Đèn lái, đèn phanh, đèn tín hiệu, còi...",
      "Ốc và đai ốc, đai ốc trục trước và trục sau",
      "Xác nhận các hạng mục đã sửa chữa",
      "Kiểm tra ngoại quan xe (trầy xước...)",
      "Khả năng vận hành và hoạt động động cơ xe",
      "Tốc độ cầm chừng",
      "Chạy thử"
    ];

    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>Phiếu Sửa Chữa</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 10px; color: #000; background: #fff; padding: 8mm; }
  table { width: 100%; border-collapse: collapse; border: 1.2px solid #000; margin-bottom: 8px; }
  td, th { border: 1px solid #000; padding: 3px 4px; }
  th { font-weight: bold; text-align: center; background: #f0f0f0; }
  .no-border, .no-border td { border: none !important; }
  .header-title { font-size: 20px; font-weight: bold; text-align: center; letter-spacing: 1px; }
  @page { size: A4; margin: 0; }
  @media print { body { padding: 8mm; } }
</style>
</head>
<body>
  <div style="position: absolute; top: 8mm; right: 8mm; border: 1px dashed #000; padding: 4px 15px; font-size: 10px;">STT:</div>

  <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;">
    <div style="width: 35%;">
      <div style="font-weight: bold; font-size: 11px;">HỆ THỐNG XE MÁY THANH HẢI</div>
      <div style="font-size: 9px;">Địa chỉ: ${warehouseData?.address || "..."}</div>
      <div style="font-size: 9px;">SĐT: ${warehouseData?.phone || "..."}</div>
    </div>
    <div class="header-title">PHIẾU SỬA CHỮA</div>
    <div style="width: 30%;"></div>
  </div>

  <table>
    <tbody>
      <tr>
        <td style="width: 45%;">Tên khách hàng: <strong>${(orderData.customer_name || "").toUpperCase()}</strong></td>
        <td style="width: 25%;">Địa chỉ hiện tại: ${orderData.customer_address || ""}</td>
        <td style="width: 15%;">Mức nhiên liệu:</td>
        <td style="width: 15%; padding: 2px;">
          <div style="display: flex; justify-content: space-between; font-size: 9px;">
            <span>E</span>
            <div style="border-bottom: 1px solid #000; flex: 1; margin: 0 4px; position: relative;">
              <span style="position: absolute; left: 50%; transform: translateX(-50%); bottom: -2px;">|</span>
            </div>
            <span>F</span>
          </div>
        </td>
      </tr>
      <tr>
        <td rowspan="2">
          Loại xe: 
          ${["Ga", "Số", "Côn tay", "Xe Điện", "PKL"].map((t) => {
            const isElectric = !!orderData.battery_id;
            const checked = isElectric ? t === "Xe Điện" : orderData.vehicle_type === t;
            return `<span style="margin-right:6px"><input type="checkbox" ${checked ? "checked" : ""}> ${t}</span>`;
          }).join("")}
        </td>
        <td>Số điện thoại: <strong>${orderData.customer_phone || ""}</strong></td>
        <td colspan="2">Thời gian nhận xe: <strong>${fmtDate(orderData.received_at)}</strong></td>
      </tr>
      <tr>
        <td>Số khung: ${orderData.chassis_no || ""}</td>
        <td colspan="2">Thời gian trả xe thực tế: <strong>${fmtDate(orderData.returned_at)}</strong></td>
      </tr>
      <tr>
        <td>Tên xe: ${orderData.model_name || ""}</td>
        <td>Số máy: ${orderData.engine_no || ""}</td>
        <td colspan="2">ID Pin (Xe điện): ${orderData.battery_id || ""}</td>
      </tr>
      <tr>
        <td>Biển số: <strong>${orderData.license_plate || ""}</strong>  |  Số Km: <strong>${fmt(orderData.km_reading)}</strong></td>
        <td colspan="3"></td>
      </tr>
      <tr>
        <td style="height: 30px;">Yêu cầu của khách hàng: ${orderData.notes || ""}</td>
        <td colspan="3">Tư vấn sửa chữa: ...</td>
      </tr>
    </tbody>
  </table>

  <table>
    <thead>
      <tr>
        <th rowspan="2" width="20" style="font-size: 8px;">STT</th>
        <th rowspan="2" style="font-size: 8px;">Tên phụ tùng, công việc</th>
        <th rowspan="2" width="80" style="font-size: 8px;">Mã Phụ Tùng</th>
        <th width="25" style="font-size: 8px; background: #ffcccc;">Cần thay thế</th>
        <th width="25" style="font-size: 8px; background: #ffffcc;">Chú ý</th>
        <th width="40" style="font-size: 8px;">Báo giá</th>
        <th colspan="2" style="font-size: 8px;">Thay thế</th>
        <th width="25" style="font-size: 8px;">SL</th>
        <th colspan="3" style="font-size: 8px;">Thống kê chi phí sửa chữa</th>
      </tr>
      <tr>
        <th style="background: #ffcccc;">v</th>
        <th style="background: #ffffcc;">v</th>
        <th></th>
        <th width="20">Có</th>
        <th width="20">Không</th>
        <th></th>
        <th style="font-size: 8px;">Tổng PT</th>
        <th style="font-size: 8px;">Tiền công</th>
        <th style="font-size: 8px;">Tổng cộng</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="9" style="text-align:right; font-weight:bold; border: none;">Tổng cộng chưa VAT:</td>
        <td style="text-align:right; font-weight:bold;">${fmt(totalParts)}</td>
        <td style="text-align:right; font-weight:bold;">${fmt(totalLabor)}</td>
        <td style="text-align:right; font-weight:bold;">${fmt(grandTotal)}</td>
      </tr>
      ${vatPercent > 0 ? `
      <tr>
        <td colspan="11" style="text-align:right; border: none;">Thuế VAT (${vatPercent}%):</td>
        <td style="text-align:right;">${fmt(vatAmount)}</td>
      </tr>
      ` : ""}
      <tr>
        <td colspan="11" style="text-align:right; font-weight:bold; font-size:11px; border: none;">TỔNG THANH TOÁN (ĐÃ CÓ VAT):</td>
        <td style="text-align:right; font-weight:bold; font-size:11px;">${fmt(finalTotal)}</td>
      </tr>
    </tfoot>
  </table>

  <div style="display: flex; gap: 10px; font-size: 9px;">
    <div style="flex: 1;">
      <div style="display: flex; border: 1px solid #000; padding: 2px 5px; margin-bottom: 4px;">
        <div style="flex: 1;">Xác nhận lấy lại phụ tùng cũ:</div>
        <div style="width: 80px; display: flex; justify-content: space-between;">
          <span><input type="checkbox"> Có</span>
          <span><input type="checkbox"> Không</span>
        </div>
      </div>
      <div style="border: 1px solid #000; padding: 2px 5px; min-height: 30px; margin-bottom: 4px;">* Lý do khách hàng chưa đồng ý thay Phụ Tùng:</div>
      <div style="border: 1px solid #000; padding: 2px 5px; min-height: 30px; margin-bottom: 4px;">* Khung thời gian trong ngày thuận tiện nghe cuộc điện thoại:</div>
      <div style="display: flex; gap: 10px;">
        <div style="flex: 1;">
          <div style="border: 1px solid #000; font-size: 8px;">
            <div style="display: flex; border-bottom: 1px solid #000; background: #f0f0f0;">
              <div style="width: 20px; border-right: 1px solid #000; text-align: center;">STT</div>
              <div style="flex: 1; border-right: 1px solid #000; text-align: center;">Kiểm tra cuối</div>
              <div style="width: 40px; border-right: 1px solid #000; text-align: center;">Xác nhận</div>
              <div style="width: 40px; text-align: center;">Thay dầu</div>
            </div>
            ${checklist.map((item, i) => `
              <div style="display: flex; border-bottom: ${i === 10 ? "none" : "1px solid #000"};">
                <div style="width: 20px; border-right: 1px solid #000; text-align: center;">${i + 1}</div>
                <div style="flex: 1; border-right: 1px solid #000; padding-left: 2px;">${item}</div>
                <div style="width: 40px; border-right: 1px solid #000;"></div>
                <div style="width: 40px;"></div>
              </div>
            `).join("")}
          </div>
        </div>
        <div style="width: 180px;">
          <div style="border: 1px solid #000; text-align: center; background: #f0f0f0; font-weight: bold;">Thời gian kiểm tra xe lần tới &lt;Amber Job&gt;</div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
            <thead style="background: #f0f0f0;">
              <tr>
                <th style="padding: 2px;">Tên phụ tùng/Công việc</th>
                <th width="40" style="padding: 2px;">Ngày</th>
                <th width="30" style="padding: 2px;">Km</th>
              </tr>
            </thead>
            <tbody>
              ${[0, 1, 2, 3, 4].map((idx) => {
                const job = (typeof amberJobs === 'string' ? JSON.parse(amberJobs) : amberJobs)?.[idx];
                const dateText = job?.date ? dayjs(job.date).format("DD/MM/YYYY") : (job?.time || "");
                return `<tr style="height: 15px;">
                  <td style="font-size: 8px; border: 1px solid #000;">${job?.content || ""}</td>
                  <td style="font-size: 8px; border: 1px solid #000; text-align: center;">${dateText}</td>
                  <td style="font-size: 8px; border: 1px solid #000; text-align: center;">${job?.km ? Number(job.km).toLocaleString() : ""}</td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div style="margin-top: 10px; display: flex; justify-content: space-between; text-align: center; font-size: 9px;">
    <div style="width: 40%; border: 1px solid #000; padding: 5px;">
      <div style="font-weight: bold; margin-bottom: 10px;">Khách hàng xác nhận</div>
      <div style="display: flex; justify-content: space-around;">
        <div>Trước sửa chữa</div>
        <div>Sau sửa chữa</div>
      </div>
      <div style="height: 40px;"></div>
    </div>
    <div style="flex: 1; display: flex; justify-content: space-around; align-items: flex-start; padding-top: 10px;">
      <div style="font-weight: bold;">Tiếp nhận</div>
      <div style="font-weight: bold;">Kỹ thuật viên</div>
      <div style="font-weight: bold;">Kiểm tra cuối</div>
    </div>
  </div>

  <div style="position: absolute; bottom: 2mm; left: 8mm; right: 8mm; font-size: 7px; font-style: italic; border-top: 1px solid #ccc; padding-top: 2px;">
    Bằng việc ký vào Phiếu sửa chữa này, khách hàng đồng ý với Điều khoản và Chính sách Quyền Riêng Tư... (Vui lòng xem chi tiết tại www.honda.com/policy)
  </div>

  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }</script>
</body>
</html>`;
  };

  const handlePrint = (order = null) => {
    const hide = message.loading("Đang chuẩn bị phiếu in...", 0);

    let orderData, itemsData, warehouseData, currentAmberJobs;

    if (order) {
      orderData = order;
      itemsData =
        order.MaintenanceItems?.map((i) => ({
          ...i,
          description:
            i.type === "PART" ? i.Part?.name || i.description : i.description,
          Part: i.Part,
        })) || [];
      warehouseData = warehouses.find((w) => w.id === order.warehouse_id);
      currentAmberJobs = order.amber_jobs;
    } else {
      orderData = { ...form.getFieldsValue(), id };
      itemsData = items;
      warehouseData = warehouses.find((w) => w.id === selectedWarehouse);
      currentAmberJobs = amberJobs;
    }

    setTimeout(() => {
      hide();
      const html = buildPrintHtml(orderData, warehouseData, itemsData, currentAmberJobs);
      const win = window.open("", "_blank", "width=900,height=700");
      win.document.write(html);
      win.document.close();
    }, 300);
  };

  // --- Tab Renderers ---
  const renderForm = () => {
    // Calculate busy mechanics from active lift table orders
    const busyMechanicIds = liftTables
      .flatMap((l) => l.MaintenanceOrders || [])
      .filter((o) => o.id !== id) // exclude current order
      .flatMap((o) => [o.mechanic_1_id, o.mechanic_2_id])
      .filter(Boolean);

    return (
      <>
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card
              className="glass-card"
              title={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                  }}
                >
                  <Space>
                    <Wrench size={18} /> THÔNG TIN BẢO TRÌ
                  </Space>
                  <Space>
                    {id && (
                      <Button
                        icon={<Printer size={16} />}
                        onClick={() => handlePrint()}
                        type="primary"
                        ghost
                      >
                        In phiếu
                      </Button>
                    )}
                    {vehicleFound &&
                      (vehicleFound.internal ? (
                        <Tag
                          color="success"
                          icon={
                            <CheckCircle
                              size={14}
                              style={{
                                verticalAlign: "middle",
                                marginRight: 4,
                              }}
                            />
                          }
                        >
                          XE HỆ THỐNG
                        </Tag>
                      ) : (
                        <Tag
                          color="warning"
                          icon={
                            <Search
                              size={14}
                              style={{
                                verticalAlign: "middle",
                                marginRight: 4,
                              }}
                            />
                          }
                        >
                          XE NGOÀI
                        </Tag>
                      ))}
                  </Space>
                </div>
              }
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
                initialValues={{
                  maintenance_date: dayjs(),
                  status: "IN_PROGRESS",
                }}
              >
                <Form.Item name="status" hidden>
                  <Input />
                </Form.Item>
                <Form.Item
                  label="Tìm kiếm xe (Số máy/Số khung/SĐT)"
                  name="search_vehicle"
                  style={{ marginBottom: vehicleFound ? 12 : 24 }}
                >
                  <AutoComplete
                    options={vehicleOptions}
                    onSearch={handleVehicleSearch}
                    onSelect={handleVehicleSelect}
                    popupMatchSelectWidth={false}
                    dropdownStyle={{ minWidth: 350 }}
                  >
                    <Input.Search
                      placeholder="Nhập để tìm xe hệ thống..."
                      allowClear
                      size="large"
                    />
                  </AutoComplete>
                </Form.Item>

                {vehicleFound && (
                  <div
                    style={{
                      marginBottom: 24,
                      padding: "16px",
                      borderRadius: 12,
                      background: vehicleFound.internal
                        ? "rgba(16, 185, 129, 0.08)"
                        : "rgba(245, 158, 11, 0.08)",
                      border: `1px solid ${vehicleFound.internal ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      animation: "fadeIn 0.3s ease-out",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: vehicleFound.internal
                          ? "#10b981"
                          : "#f59e0b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                      }}
                    >
                      {vehicleFound.internal ? (
                        <Bike size={24} />
                      ) : (
                        <Search size={24} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontWeight: "bold",
                              color: vehicleFound.internal
                                ? "#10b981"
                                : "#f59e0b",
                              fontSize: 13,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            }}
                          >
                            {vehicleFound.internal
                              ? "Nhận diện: Xe hệ thống"
                              : "Xe ngoài hệ thống"}
                          </div>
                          <div
                            style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}
                          >
                            {vehicleFound.internal
                              ? `Khách hàng: ${vehicleFound.data?.customer_name || vehicleFound.data?.RetailSale?.customer_name || "N/A"} - SĐT: ${vehicleFound.data?.phone || vehicleFound.data?.RetailSale?.phone || vehicleFound.data?.customer_phone || "N/A"}`
                              : "Xe này không thuộc dữ liệu bán hàng hệ thống hoặc là xe khách vãng lai."}
                          </div>
                        </div>
                        {vehicleFound.internal &&
                          vehicleFound.data?.gifts?.length > 0 && (
                            <div style={{ textAlign: "right" }}>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: "bold",
                                  marginBottom: 4,
                                  opacity: 0.6,
                                }}
                              >
                                ƯU ĐÃI TẶNG KÈM
                              </div>
                              <Space wrap size={[4, 4]}>
                                {vehicleFound.data.gifts.map((g, idx) => {
                                  const isUsed = (
                                    vehicleFound.data.used_gifts || []
                                  ).includes(g);
                                  return (
                                    <Tag
                                      key={idx}
                                      color={isUsed ? "default" : "purple"}
                                      style={{
                                        textDecoration: isUsed
                                          ? "line-through"
                                          : "none",
                                        opacity: isUsed ? 0.6 : 1,
                                      }}
                                    >
                                      {g} {isUsed ? "(Đã dùng)" : ""}
                                    </Tag>
                                  );
                                })}
                              </Space>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item label="Loại xe" name="vehicle_type" initialValue="Số">
                      <Select size="large">
                        <Select.Option value="Số">Xe Số</Select.Option>
                        <Select.Option value="Ga">Xe Ga</Select.Option>
                        <Select.Option value="Côn tay">Xe Côn tay</Select.Option>
                        <Select.Option value="Xe Điện">Xe Điện</Select.Option>
                        <Select.Option value="PKL">Phân khối lớn</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Tên xe / Model" name="model_name">
                      <AutoComplete
                        options={vehicleTypes.map((t) => ({ value: t.name }))}
                        placeholder="VD: Airblade 125..."
                        size="large"
                        filterOption={(inputValue, option) =>
                          option.value
                            .toUpperCase()
                            .indexOf(inputValue.toUpperCase()) !== -1
                        }
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Biển số xe" name="license_plate">
                      <Input placeholder="29A-12345" size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Số máy" name="engine_no">
                      <Input size="large" placeholder="Nhập số máy..." />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item label="Số khung" name="chassis_no">
                      <Input size="large" placeholder="Nhập số khung..." />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="ID Pin (Xe điện)" name="battery_id">
                      <Input placeholder="Nhập ID Pin..." size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Sức khỏe PIN (SOH %)" name="battery_soh">
                      <InputNumber style={{ width: "100%" }} min={0} max={100} placeholder="%" size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Số KM hiện tại" name="km_reading">
                      <InputNumber
                        style={{ width: "100%" }}
                        placeholder="Nhập số KM..."
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item label="Ngày nhận xe" name="received_at" rules={[{ required: true }]}>
                      <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Ngày trả thực tế" name="returned_at">
                      <DatePicker showTime style={{ width: "100%" }} format="DD/MM/YYYY HH:mm" size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Chủ xe" name="customer_name">
                      <Input placeholder="Tên khách..." size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Điện thoại" name="customer_phone">
                      <Input placeholder="Số điện thoại..." size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item label="Mức nhiên liệu" name="fuel_level">
                      <Select placeholder="Mức xăng..." size="large">
                        <Select.Option value="E">E (Cạn)</Select.Option>
                        <Select.Option value="1/4">1/4</Select.Option>
                        <Select.Option value="1/2">1/2</Select.Option>
                        <Select.Option value="3/4">3/4</Select.Option>
                        <Select.Option value="F">F (Đầy)</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item label="Kiểm tra định kỳ" name="ktdk_type">
                      <Select placeholder="Chọn lần KT..." size="large" allowClear onChange={(val) => {
                          if (val) form.setFieldsValue({ notes: `KTDK lần ${val}` });
                          else form.setFieldsValue({ notes: "Kiểm tra xe" });
                      }}>
                        {[1, 2, 3, 4, 5, 6, 7].map(n => (
                          <Select.Option key={n} value={n}>Lần {n}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Yêu cầu của khách hàng" name="notes" initialValue="Kiểm tra xe">
                      <Input placeholder="Ghi chú yêu cầu cụ thể..." size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Kho xuất" name="warehouse_id" rules={[{ required: true }]}>
                      <Select placeholder="Chọn kho" size="large" disabled={!(user.role === 'ADMIN' || user.role === 'MANAGER' || (user.accessible_warehouses && user.accessible_warehouses.length > 0))}>
                        {warehouses.map((w) => (
                          <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Bàn nâng" name="lift_table_id">
                      <Select placeholder="Chọn bàn" allowClear size="large">
                        {liftTables.filter(l => !selectedWarehouse || l.warehouse_id === selectedWarehouse).map((l) => {
                          const isBusy = l.status === "BUSY" && l.id !== form.getFieldValue("lift_table_id");
                          return (
                            <Select.Option key={l.id} value={l.id} disabled={isBusy}>
                              {l.name} {isBusy ? "(Đang bận)" : ""}
                            </Select.Option>
                          );
                        })}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Vehicle History Timeline in Collapse to save space */}
                {(engineNo || licensePlate || chassisNo) &&
                  history.filter(
                    (h) =>
                      h.id !== id &&
                      (engineNo
                        ? h.engine_no === engineNo
                        : chassisNo
                          ? h.chassis_no === chassisNo
                          : h.license_plate === licensePlate),
                  ).length > 0 && (
                    <Collapse ghost style={{ marginBottom: 16 }}>
                      <Collapse.Panel
                        key="history"
                        header={
                          <Space>
                            <History size={14} style={{ color: "#6366f1" }} />
                            <Text strong style={{ fontSize: 12, color: "#6366f1" }}>
                              LỊCH SỬ SỬA CHỮA (
                              {
                                history.filter(
                                  (h) =>
                                    h.id !== id &&
                                    (engineNo
                                      ? h.engine_no === engineNo
                                      : chassisNo
                                        ? h.chassis_no === chassisNo
                                        : h.license_plate === licensePlate),
                                ).length
                              }{" "}
                              lần)
                            </Text>
                          </Space>
                        }
                      >
                        <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 8, paddingTop: 8 }}>
                          <Timeline>
                            {history
                              .filter(
                                (h) =>
                                  h.id !== id &&
                                  (engineNo
                                    ? h.engine_no === engineNo
                                    : chassisNo
                                      ? h.chassis_no === chassisNo
                                      : h.license_plate === licensePlate),
                              )
                              .map((h, idx) => (
                                <Timeline.Item
                                  key={idx}
                                  color={
                                    h.status === "COMPLETED"
                                      ? "green"
                                      : h.status === "CANCELLED"
                                        ? "red"
                                        : "blue"
                                  }
                                >
                                  <div
                                    className="history-item-card"
                                    style={{
                                      background: "rgba(255,255,255,0.02)",
                                      padding: "10px",
                                      borderRadius: "8px",
                                      border: "1px solid rgba(255,255,255,0.06)",
                                      marginBottom: 8,
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                      <Text strong style={{ fontSize: 12 }}>
                                        {dayjs(h.maintenance_date).format("DD/MM/YY")}
                                      </Text>
                                      <Tag color="cyan" style={{ fontSize: 10, margin: 0 }}>
                                        {h.km_reading?.toLocaleString()} KM
                                      </Tag>
                                    </div>
                                    <div style={{ fontSize: 11, opacity: 0.8, marginBottom: 6 }}>
                                      {h.MaintenanceItems?.map((i) => i.description).join(", ")}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                      <Button
                                        size="small"
                                        type="link"
                                        style={{ fontSize: 10, height: 20, padding: 0 }}
                                        onClick={() => handleEditFromBoard(h.id)}
                                      >
                                        Chi tiết &raquo;
                                      </Button>
                                    </div>
                                  </div>
                                </Timeline.Item>
                              ))}
                          </Timeline>
                        </div>
                      </Collapse.Panel>
                    </Collapse>
                  )}

                {/* Smart Recommendation Alert */}
                {(() => {
                  const matched = (maintenanceRules || []).filter(r => kmReading >= r.min_km && kmReading <= r.max_km);
                  if (matched.length === 0) return null;
                  
                  return (
                    <div style={{ marginBottom: 20 }}>
                      <Card 
                        size="small" 
                        style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', border: '1px solid #f59e0b', borderRadius: '12px' }}
                        styles={{ body: { padding: '16px' } }}
                      >
                        <Space align="start">
                          <AlertCircle size={24} style={{ color: '#d97706', marginTop: 2 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text strong style={{ color: '#92400e', fontSize: 14 }}>
                                GỢI Ý BẢO TRÌ THÔNG MINH CHO XE {Number(kmReading || 0).toLocaleString()} KM:
                                </Text>
                                <Button 
                                    size="small" 
                                    type="primary" 
                                    icon={<PlusCircle size={14} />}
                                    style={{ backgroundColor: '#d97706', borderColor: '#d97706', borderRadius: '6px', fontWeight: 'bold' }}
                                    onClick={() => {
                                        let updatedJobs = [...amberJobs];
                                        matched.forEach(m => {
                                        if (!updatedJobs.some(j => j.content === m.suggestion)) {
                                            const emptyIdx = updatedJobs.findIndex(j => !j.content);
                                            if (emptyIdx > -1) {
                                            updatedJobs[emptyIdx] = { 
                                                content: m.suggestion, 
                                                date: m.time_gap_months ? dayjs().add(m.time_gap_months, 'month').toISOString() : null, 
                                                km: "" 
                                            };
                                            } else {
                                            updatedJobs.push({ 
                                                content: m.suggestion, 
                                                date: m.time_gap_months ? dayjs().add(m.time_gap_months, 'month').toISOString() : null, 
                                                km: "" 
                                            });
                                            }
                                        }
                                        });
                                        setAmberJobs(updatedJobs);
                                        message.success('Đã tự động điền các hạng mục cần lưu ý!');
                                    }}
                                    >
                                    ĐƯA VÀO PHIẾU NGAY
                                </Button>
                            </div>
                            <div>
                              {matched.map((m, i) => (
                                <div key={i} style={{ fontSize: 13, color: '#b45309', marginBottom: 4 }}>
                                  • {m.suggestion} {m.time_gap_months ? `(Gợi ý bảo trì sau ${m.time_gap_months} tháng)` : ''}
                                </div>
                              ))}
                            </div>
                          </div>
                        </Space>
                      </Card>
                    </div>
                  );
                })()}


                {vehicleFound?.internal &&
                  vehicleFound.data?.gifts?.some(
                    (g) =>
                      !["Áo mưa", "Mũ bảo hiểm", "Bảo hiểm đi đường"].includes(
                        g,
                      ),
                  ) && (
                    <Row gutter={12}>
                      <Col span={24}>
                        <Form.Item
                          label={
                            <Space>
                              <Tag color="purple">SỬ DỤNG ƯU ĐÃI TẶNG KÈM</Tag>
                            </Space>
                          }
                          name="gift_used"
                        >
                          <Select
                            placeholder="Chọn ưu đãi muốn áp dụng..."
                            allowClear
                          >
                            {vehicleFound.data.gifts
                              .filter(
                                (g) =>
                                  ![
                                    "Áo mưa",
                                    "Mũ bảo hiểm",
                                    "Bảo hiểm đi đường",
                                  ].includes(g),
                              )
                              .map((g) => {
                                const isUsed = (
                                  vehicleFound.data.used_gifts || []
                                ).includes(g);
                                return (
                                  <Select.Option
                                    key={g}
                                    value={g}
                                    disabled={isUsed}
                                  >
                                    {g}{" "}
                                    {isUsed ? "(Đã sử dụng ở lần trước)" : ""}
                                  </Select.Option>
                                );
                              })}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                <Row gutter={16}>
                  <Col span={6}>
                    <Form.Item label="Chủ xe" name="customer_name" hidden>
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <div
                  style={{
                    background: "rgba(0,0,0,0.05)",
                    padding: 15,
                    borderRadius: 8,
                    marginBottom: 20,
                  }}
                >
                  <Row gutter={12} align="middle" style={{ marginBottom: 10 }}>
                    <Col span={14}><Text strong>TỔNG CỘNG CHƯA VAT:</Text></Col>
                    <Col span={10} style={{ textAlign: 'right' }}>
                      <Text strong style={{ fontSize: 16 }}>
                        {items.reduce((s, i) => s + Number(i.total_price || 0), 0).toLocaleString()} đ
                      </Text>
                    </Col>
                  </Row>
                  
                  <Row gutter={12} align="middle" style={{ marginBottom: 10 }}>
                    <Col span={14}><Text strong>VAT (%):</Text></Col>
                    <Col span={10}>
                      <Form.Item name="vat_percent" noStyle initialValue={0}>
                        <Select size="small" style={{ width: '100%' }}>
                          <Select.Option value={0}>0%</Select.Option>
                          <Select.Option value={8}>8%</Select.Option>
                          <Select.Option value={10}>10%</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item shouldUpdate={(prev, curr) => prev.vat_percent !== curr.vat_percent}>
                    {() => {
                      const vatP = form.getFieldValue('vat_percent') || 0;
                      const subtotal = items.reduce((s, i) => s + Number(i.total_price || 0), 0);
                      const vatAmt = (subtotal * vatP) / 100;
                      return (
                        <>
                          <Row gutter={12} align="middle" style={{ marginBottom: 10 }}>
                            <Col span={14}><Text>Tiền thuế VAT:</Text></Col>
                            <Col span={10} style={{ textAlign: 'right' }}>
                              <Text>{vatAmt.toLocaleString()} đ</Text>
                            </Col>
                          </Row>
                          <Divider style={{ margin: '8px 0' }} />
                          <Row gutter={12} align="middle">
                            <Col span={14}><Title level={4} style={{ margin: 0 }}>TỔNG THANH TOÁN:</Title></Col>
                            <Col span={10} style={{ textAlign: 'right' }}>
                              <Title level={4} style={{ margin: 0, color: '#ef4444' }}>
                                {(subtotal + vatAmt).toLocaleString()} đ
                              </Title>
                            </Col>
                          </Row>
                        </>
                      );
                    }}
                  </Form.Item>
                </div>
                <Space
                  direction="vertical"
                  style={{ width: "100%", marginTop: 24 }}
                >
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<Save size={20} />}
                    onClick={() => {
                      if (!id) {
                        form.setFieldsValue({ status: "IN_PROGRESS" });
                      }
                      form.submit();
                    }}
                    loading={submitLoading}
                    disabled={id && !canEditTicket}
                    style={{ height: 50, borderRadius: 12 }}
                  >
                    {id ? "LƯU THAY ĐỔI" : "TẠO PHIẾU MỚI"}
                  </Button>

                  {id && (
                    <Button
                      block
                      icon={<PlusCircle size={20} />}
                      onClick={() => {
                        navigate("/maintenance-hub");
                        handleCreateNew();
                      }}
                      style={{ height: 50, borderRadius: 12 }}
                    >
                      LÀM PHIẾU MỚI
                    </Button>
                  )}

                  {id && form.getFieldValue("status") !== "COMPLETED" && (
                    <Popconfirm
                      title="Bạn có chắc chắn muốn thanh toán và hoàn thành phiếu này?"
                      onConfirm={() => {
                        form.setFieldsValue({
                          status: "COMPLETED",
                          paid_amount: items.reduce(
                            (s, i) => s + Number(i.total_price || 0),
                            0,
                          ),
                        });
                        form.submit();
                      }}
                      okText="Đồng ý"
                      cancelText="Hủy"
                    >
                      <Button
                        type="primary"
                        size="large"
                        block
                        icon={<CheckCircle size={20} />}
                        loading={submitLoading}
                        disabled={!canEditTicket}
                        style={{
                          height: 50,
                          borderRadius: 12,
                          backgroundColor: "#10b981",
                          borderColor: "#10b981",
                        }}
                      >
                        THANH TOÁN & HOÀN THÀNH
                      </Button>
                    </Popconfirm>
                  )}

                  {id &&
                    form.getFieldValue("status") !== "COMPLETED" &&
                    form.getFieldValue("status") !== "CANCELLED" && (
                      <Popconfirm
                        title="Bạn có chắc chắn muốn hủy phiếu này? Thao tác này sẽ hoàn trả lại phụ tùng vào kho và giải phóng bàn nâng."
                        onConfirm={() => {
                          form.setFieldsValue({ status: "CANCELLED" });
                          form.submit();
                        }}
                        okText="Xác nhận hủy"
                        cancelText="Quay lại"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          danger
                          block
                          icon={<XCircle size={18} />}
                          disabled={!canEditTicket}
                          style={{
                            height: 45,
                            borderRadius: 12,
                            marginTop: 12,
                          }}
                        >
                          HỦY PHIẾU SỬA CHỮA
                        </Button>
                      </Popconfirm>
                    )}
                </Space>
              </Form>
            </Card>
          </Col>
          <Col span={24}>
            <Card className="glass-card" title="CHI TIẾT PHỤ TÙNG & CÔNG VIỆC">
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.05)",
                  marginBottom: 24,
                }}
              >
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={
                        <Text strong style={{ fontSize: 12 }}>
                          THỢ CHÍNH
                        </Text>
                      }
                      name="mechanic_1_id"
                      style={{ margin: 0 }}
                    >
                      <Select placeholder="Chọn thợ chính" allowClear>
                        {mechanics
                          .filter(
                            (m) =>
                              !selectedWarehouse ||
                              !m.warehouse_id ||
                              m.warehouse_id === selectedWarehouse,
                          )
                          .map((m) => {
                            const isBusy =
                              busyMechanicIds.includes(m.id) &&
                              m.id !== form.getFieldValue("mechanic_1_id") &&
                              m.id !== form.getFieldValue("mechanic_2_id");
                            return (
                              <Select.Option
                                key={m.id}
                                value={m.id}
                                disabled={isBusy}
                              >
                                {m.mechanic_name} {isBusy ? "(Đang bận)" : ""}
                              </Select.Option>
                            );
                          })}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={
                        <Text strong style={{ fontSize: 12 }}>
                          THỢ PHỤ
                        </Text>
                      }
                      name="mechanic_2_id"
                      style={{ margin: 0 }}
                    >
                      <Select placeholder="Chọn thợ phụ" allowClear>
                        {mechanics
                          .filter(
                            (m) =>
                              !selectedWarehouse ||
                              !m.warehouse_id ||
                              m.warehouse_id === selectedWarehouse,
                          )
                          .map((m) => {
                            const isBusy =
                              busyMechanicIds.includes(m.id) &&
                              m.id !== form.getFieldValue("mechanic_1_id") &&
                              m.id !== form.getFieldValue("mechanic_2_id");
                            return (
                              <Select.Option
                                key={m.id}
                                value={m.id}
                                disabled={isBusy}
                              >
                                {m.mechanic_name} {isBusy ? "(Đang bận)" : ""}
                              </Select.Option>
                            );
                          })}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              </div>
              <Table
                dataSource={items}
                pagination={false}
                scroll={{ x: "max-content" }}
                size={window.innerWidth < 768 ? "small" : "middle"}
                className="modern-table small-screen-optimized"
                columns={[
                  {
                    title: "MÃ PT",
                    dataIndex: "part_code",
                    width: 120,
                    render: (v, r) =>
                      r.type === "PART" ? (
                        <Text strong>{v || r.Part?.code}</Text>
                      ) : null,
                  },
                  {
                    title: "HẠNG MỤC",
                    dataIndex: "type",
                    width: 100,
                    render: (t) => (
                      <Tag
                        color={t === "PART" ? "blue" : "orange"}
                        style={{ fontWeight: "bold" }}
                      >
                        {t}
                      </Tag>
                    ),
                  },
                  {
                    title: (
                      <Text strong style={{ color: "#6366f1" }}>
                        KIỂU BÁN
                      </Text>
                    ),
                    dataIndex: "sale_type",
                    width: 140,
                    render: (v, r) => (
                      <Select
                        value={v || "THU_NGAY"}
                        size="middle"
                        style={{ width: "100%" }}
                        onChange={(val) => {
                          const newUnitPrice =
                            val === "BAO_HANH" || val === "KHUYEN_MAI"
                              ? 0
                              : r.type === "PART"
                                ? allParts.find((p) => p.id === r.part_id)
                                    ?.selling_price || 0
                                : r.unit_price;
                          setItems(
                            items.map((i) =>
                              i.key === r.key
                                ? {
                                    ...i,
                                    sale_type: val,
                                    unit_price: newUnitPrice,
                                    total_price: i.quantity * newUnitPrice,
                                  }
                                : i,
                            ),
                          );
                        }}
                      >
                        <Select.Option value="THU_NGAY">
                          <Tag
                            color="success"
                            style={{
                              margin: 0,
                              width: "100%",
                              textAlign: "center",
                            }}
                          >
                            Thu ngay
                          </Tag>
                        </Select.Option>
                        <Select.Option value="BAO_HANH">
                          <Tag
                            color="warning"
                            style={{
                              margin: 0,
                              width: "100%",
                              textAlign: "center",
                            }}
                          >
                            Bảo hành
                          </Tag>
                        </Select.Option>
                        <Select.Option value="KHUYEN_MAI">
                          <Tag
                            color="processing"
                            style={{
                              margin: 0,
                              width: "100%",
                              textAlign: "center",
                            }}
                          >
                            Khuyến mại
                          </Tag>
                        </Select.Option>
                      </Select>
                    ),
                  },
                  {
                    title: "TÊN PHỤ TÙNG / CÔNG VIỆC",
                    dataIndex: "description",
                    width: 300,
                    render: (t, r) =>
                      r.type === "SERVICE" ? (
                        <AutoComplete
                          value={t}
                          style={{ width: "100%" }}
                          popupMatchSelectWidth={false}
                          onChange={(val) =>
                            setItems(
                              items.map((i) =>
                                i.key === r.key
                                  ? { ...i, description: val }
                                  : i,
                              ),
                            )
                          }
                          options={[
                            { value: "Bảo dưỡng định kỳ" },
                            { value: "Sửa chữa chung" },
                            { value: "Kiểm tra xe" },
                            { value: "Rửa xe" },
                            { value: "Thay dầu máy" },
                            { value: "Bảo hành" },
                          ]}
                          filterOption={(input, option) =>
                            option.value
                              .toUpperCase()
                              .indexOf(input.toUpperCase()) >= 0
                          }
                        >
                          <Input placeholder="Tên công việc..." />
                        </AutoComplete>
                      ) : (
                        <Text strong>{t}</Text>
                      ),
                  },
                  {
                    title: "GHI CHÚ",
                    dataIndex: "notes",
                    width: 200,
                    render: (v, r) => (
                      <Space direction="vertical" style={{ width: "100%" }}>
                        <Input
                          placeholder="Ghi chú..."
                          value={v}
                          onChange={(e) =>
                            setItems(
                              items.map((i) =>
                                i.key === r.key
                                  ? { ...i, notes: e.target.value }
                                  : i,
                              ),
                            )
                          }
                        />
                        {r.type === "PART" && r.sale_type !== "KHUYEN_MAI" && (
                          <Button
                            size="small"
                            type="dashed"
                            onClick={() => {
                              setItems(
                                items.map((i) =>
                                  i.key === r.key
                                    ? {
                                        ...i,
                                        sale_type: "KHUYEN_MAI",
                                        unit_price: 0,
                                        total_price: 0,
                                        notes: "Tặng khách",
                                      }
                                    : i,
                                ),
                              );
                            }}
                          >
                            Tặng (0đ)
                          </Button>
                        )}
                      </Space>
                    ),
                  },
                  {
                    title: "SL",
                    dataIndex: "quantity",
                    width: 80,
                    align: "center",
                    render: (v, r) => (
                      <InputNumber
                        min={0.1}
                        value={v}
                        style={{ width: "100%" }}
                        onChange={(val) => {
                          const base = val * r.unit_price;
                          const disc =
                            base * (Number(r.discount_pct || 0) / 100);
                          setItems(
                            items.map((i) =>
                              i.key === r.key
                                ? {
                                    ...i,
                                    quantity: val,
                                    discount_amount: disc,
                                    total_price: base - disc,
                                  }
                                : i,
                            ),
                          );
                        }}
                      />
                    ),
                  },
                  {
                    title: "ĐƠN GIÁ",
                    dataIndex: "unit_price",
                    width: 130,
                    render: (v, r) => (
                      <InputNumber
                        value={v}
                        style={{ width: "100%" }}
                        formatter={(v) =>
                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) => v.replace(/\$\s?|(,*)/g, "")}
                        onChange={(val) => {
                          const base = r.quantity * val;
                          const disc =
                            base * (Number(r.discount_pct || 0) / 100);
                          setItems(
                            items.map((i) =>
                              i.key === r.key
                                ? {
                                    ...i,
                                    unit_price: val,
                                    discount_amount: disc,
                                    total_price: base - disc,
                                  }
                                : i,
                            ),
                          );
                        }}
                      />
                    ),
                  },
                  {
                    title: (
                      <Text strong style={{ color: "#ef4444" }}>
                        TIỀN CHI
                      </Text>
                    ),
                    dataIndex: "purchase_price",
                    width: 120,
                    render: (v, r) => (
                      <InputNumber
                        value={v}
                        style={{ width: "100%" }}
                        placeholder="Vốn/Chi ngoài"
                        formatter={(v) =>
                          `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                        }
                        parser={(v) => v.replace(/\$\s?|(,*)/g, "")}
                        onChange={(val) => {
                          setItems(
                            items.map((i) =>
                              i.key === r.key
                                ? {
                                    ...i,
                                    purchase_price: val,
                                  }
                                : i,
                            ),
                          );
                        }}
                      />
                    ),
                  },
                  {
                    title: "GIẢM %",
                    dataIndex: "discount_pct",
                    width: 100,
                    align: "center",
                    render: (v, r) => (
                      <InputNumber
                        min={0}
                        max={100}
                        value={v}
                        placeholder="0"
                        formatter={(v) => `${v}%`}
                        parser={(v) => v.replace("%", "")}
                        style={{ width: "100%" }}
                        onChange={(val) => {
                          const safeVal = Number(val || 0);
                          const base = r.quantity * r.unit_price;
                          const disc = base * (safeVal / 100);
                          setItems(
                            items.map((i) =>
                              i.key === r.key
                                ? {
                                    ...i,
                                    discount_pct: safeVal,
                                    discount_amount: disc,
                                    total_price: base - disc,
                                  }
                                : i,
                            ),
                          );
                        }}
                      />
                    ),
                  },
                  {
                    title: "THÀNH TIỀN",
                    dataIndex: "total_price",
                    width: 150,
                    align: "right",
                    render: (v, r) => (
                      <Space
                        direction="vertical"
                        size={0}
                        style={{ textAlign: "right", width: "100%" }}
                      >
                        <Text strong style={{ color: "#1e293b" }}>
                          {Number(v || 0).toLocaleString()} đ
                        </Text>
                        {r.discount_pct > 0 && (
                          <Text type="success" style={{ fontSize: 10 }}>
                            Giảm: -
                            {Number(r.discount_amount || 0).toLocaleString()} đ
                          </Text>
                        )}
                        {(r.sale_type === "BAO_HANH" ||
                          r.sale_type === "KHUYEN_MAI") && (
                          <Text type="secondary" style={{ fontSize: 10 }}>
                            Vốn:{" "}
                            {Number(
                              r.purchase_price * r.quantity,
                            ).toLocaleString()}
                          </Text>
                        )}
                      </Space>
                    ),
                  },
                  {
                    width: 50,
                    align: "center",
                    render: (_, r) => (
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 size={18} />}
                        onClick={() =>
                          setItems(items.filter((i) => i.key !== r.key))
                        }
                      />
                    ),
                  },
                ]}
              />
              <Space
                className="mobile-stack"
                style={{ marginTop: 20, width: "100%" }}
              >
                <Button
                  block={window.innerWidth < 768}
                  onClick={() =>
                    setItems([
                      ...items,
                      {
                        key: Date.now(),
                        type: "SERVICE",
                        description: "",
                        quantity: 1,
                        unit_price: 0,
                        discount_pct: 0,
                        discount_amount: 0,
                        total_price: 0,
                        sale_type: "THU_NGAY",
                        purchase_price: 0,
                        notes: "",
                      },
                    ])
                  }
                >
                  Thêm tiền công
                </Button>
                <AutoComplete
                  style={{ width: window.innerWidth < 768 ? "100%" : 380 }}
                  onSelect={(v, opt) =>
                    setItems([
                      ...items,
                      {
                        key: Date.now(),
                        type: "PART",
                        part_id: opt.part.id,
                        part_code: opt.part.code,
                        description: opt.part.name,
                        unit: opt.part.unit,
                        quantity: 1,
                        unit_price: Number(opt.part.selling_price || 0),
                        discount_pct: 0,
                        discount_amount: 0,
                        total_price: Number(opt.part.selling_price || 0),
                        sale_type: "THU_NGAY",
                        purchase_price: Number(opt.part.purchase_price || 0),
                        notes: "",
                      },
                    ])
                  }
                  onSearch={setPartSearchText}
                  options={partOptions}
                  onFocus={() => executePartSearch(partSearchText)}
                  popupMatchSelectWidth={false}
                  dropdownStyle={{ minWidth: 450 }}
                >
                  <Input.Search placeholder="🔍 Tìm mã hoặc tên (ví dụ: 'DAU HONDA')..." />
                </AutoComplete>
              </Space>
            </Card>

            <Card
              className="glass-card"
              title={
                <Space>
                  <Clock size={18} /> THỜI GIAN KIỂM TRA XE LẦN TỚI (AMBER JOB)
                </Space>
              }
              style={{ marginTop: 24 }}
            >
              <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
                Các hạng mục cần lưu ý cho khách hàng ở lần ghé tiếp theo. Hệ thống sẽ tự động gợi ý nếu phát hiện thay dầu hoặc mốc Km đặc biệt.
              </Text>
              <Table
                dataSource={amberJobs}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: "Tên phụ tùng / Nội dung công việc",
                    dataIndex: "content",
                    render: (v, _, idx) => (
                      <Input
                        value={v}
                        placeholder="VD: Thay dầu máy..."
                        onChange={(e) => {
                          const newJobs = [...amberJobs];
                          newJobs[idx].content = e.target.value;
                          setAmberJobs(newJobs);
                        }}
                      />
                    ),
                  },
                  {
                    title: "Ngày dự kiến",
                    dataIndex: "date",
                    width: 150,
                    render: (v, _, idx) => (
                      <DatePicker
                        value={v ? dayjs(v) : null}
                        format="DD/MM/YYYY"
                        placeholder="Chọn ngày"
                        style={{ width: "100%" }}
                        onChange={(val) => {
                          const newJobs = [...amberJobs];
                          newJobs[idx].date = val ? val.toISOString() : null;
                          setAmberJobs(newJobs);
                        }}
                      />
                    ),
                  },
                  {
                    title: "Số Km",
                    dataIndex: "km",
                    width: 150,
                    render: (v, _, idx) => (
                      <InputNumber
                        value={v}
                        style={{ width: "100%" }}
                        placeholder="22,000"
                        onChange={(val) => {
                          const newJobs = [...amberJobs];
                          newJobs[idx].km = val;
                          setAmberJobs(newJobs);
                        }}
                      />
                    ),
                  },
                  {
                    width: 50,
                    render: (_, __, idx) => (
                      <Button
                        type="text"
                        danger
                        icon={<Trash2 size={16} />}
                        onClick={() => {
                          const newJobs = amberJobs.filter((_, i) => i !== idx);
                          setAmberJobs(newJobs);
                        }}
                      />
                    ),
                  },
                ]}
              />
              <Button
                type="dashed"
                block
                icon={<PlusCircle size={16} />}
                onClick={() =>
                  setAmberJobs([...amberJobs, { content: "", date: null, km: "" }])
                }
                style={{ marginTop: 12 }}
              >
                Thêm dòng ghi chú
              </Button>
            </Card>
          </Col>
        </Row>
      </>
    );
  };

  // Helper: get all history for a specific vehicle
  // Ưu tiên: Số máy (duy nhất) > Số khung > Biển số (có thể trùng)
  const getVehicleHistory = (record) => {
    if (record.engine_no) {
      return history.filter((h) => h.engine_no === record.engine_no);
    }
    if (record.chassis_no) {
      return history.filter((h) => h.chassis_no === record.chassis_no);
    }
    if (record.license_plate) {
      return history.filter((h) => h.license_plate === record.license_plate);
    }
    return [];
  };

  const openVehicleHistory = (record) => {
    setVehicleHistoryModal({
      engine_no: record.engine_no,
      license_plate: record.license_plate,
      chassis_no: record.chassis_no,
      customer_name: record.customer_name,
      records: getVehicleHistory(record),
    });
  };

  const renderHistory = () => {
    let filteredHistory = [...history];

    if (historySearch) {
      const s = historySearch.toLowerCase();
      filteredHistory = filteredHistory.filter(
        (h) =>
          h.license_plate?.toLowerCase().includes(s) ||
          h.engine_no?.toLowerCase().includes(s) ||
          h.chassis_no?.toLowerCase().includes(s) ||
          h.customer_name?.toLowerCase().includes(s) ||
          h.customer_phone?.toLowerCase().includes(s),
      );
    }

    return (
      <>
        <Card
          className="glass-card"
          title={
            <div className="page-header" style={{ marginBottom: 16 }}>
              <Space>
                <History size={18} /> LỊCH SỬ SỬA CHỮA
              </Space>
              <Input.Search
                placeholder="Tìm biển số, số máy, tên khách..."
                allowClear
                onSearch={setHistorySearch}
                onChange={(e) => !e.target.value && setHistorySearch("")}
                style={{ width: window.innerWidth < 768 ? "100%" : 380 }}
              />
            </div>
          }
        >
          <Table
            dataSource={filteredHistory}
            rowKey="id"
            pagination={{ pageSize: 12 }}
            size={window.innerWidth < 768 ? "small" : "middle"}
            scroll={{ x: "max-content" }}
            className="modern-table small-screen-optimized"
            columns={[
              {
                title: "Ngày",
                dataIndex: "maintenance_date",
                render: (d) => dayjs(d).format("DD/MM/YY HH:mm"),
              },
              {
                title: "Biển số",
                dataIndex: "license_plate",
                render: (t) => <Text strong>{t || "Chưa biển"}</Text>,
              },
              {
                title: "Số máy",
                dataIndex: "engine_no",
                render: (t) => (
                  <Text style={{ fontSize: 12, opacity: 0.8 }}>{t}</Text>
                ),
              },
              { title: "Khách hàng", dataIndex: "customer_name" },
              {
                title: "Số KM",
                dataIndex: "km_reading",
                render: (v) => (
                  <Tag color="cyan">{v?.toLocaleString() || 0} KM</Tag>
                ),
              },
              {
                title: "Tổng tiền",
                dataIndex: "total_amount",
                render: (v) => (
                  <Text strong>{Number(v).toLocaleString()} đ</Text>
                ),
              },
              {
                title: "Trạng thái",
                dataIndex: "status",
                render: (s) => (
                  <Tag
                    color={
                      s === "COMPLETED"
                        ? "green"
                        : s === "CANCELLED"
                          ? "red"
                          : "blue"
                    }
                  >
                    {s}
                  </Tag>
                ),
              },
              {
                title: "",
                render: (_, r) => (
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      icon={<Eye size={14} />}
                      onClick={() => openVehicleHistory(r)}
                    >
                      Lịch sử xe
                    </Button>
                    <Button
                      size="small"
                      type="primary"
                      ghost
                      icon={<Edit size={14} />}
                      onClick={() => handleEditFromBoard(r.id)}
                    >
                      Sửa phiếu
                    </Button>
                    {canDeleteTicket && (
                      <Popconfirm
                        title="Xóa phiếu DỊCH VỤ này? Tồn kho phụ tùng sẽ được hoàn lại."
                        onConfirm={() => handleDeleteOrder(r.id)}
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

        {/* Vehicle History Detail Modal */}
        <Modal
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <Bike size={22} />
              </div>
              <div>
                <div style={{ fontWeight: "bold", fontSize: 16 }}>
                  Lịch sử sửa chữa:{" "}
                  {vehicleHistoryModal?.license_plate || "Xe không biển"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  <Space
                    split={
                      <Divider
                        type="vertical"
                        style={{ borderColor: "rgba(255,255,255,0.2)" }}
                      />
                    }
                  >
                    <span>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Khách hàng:
                      </Text>{" "}
                      <Text strong style={{ fontSize: 12 }}>
                        {vehicleHistoryModal?.customer_name || "N/A"}
                      </Text>
                    </span>
                    <span>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Số máy:
                      </Text>{" "}
                      <Text strong style={{ fontSize: 12 }}>
                        {vehicleHistoryModal?.engine_no || "N/A"}
                      </Text>
                    </span>
                    <span>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        Số khung:
                      </Text>{" "}
                      <Text strong style={{ fontSize: 12 }}>
                        {vehicleHistoryModal?.chassis_no || "N/A"}
                      </Text>
                    </span>
                  </Space>
                </div>
              </div>
            </div>
          }
          open={!!vehicleHistoryModal}
          onCancel={() => setVehicleHistoryModal(null)}
          footer={null}
          width={window.innerWidth < 768 ? "95%" : 700}
          centered
          destroyOnClose
        >
          {vehicleHistoryModal && (
            <div
              style={{
                maxHeight: 500,
                overflowY: "auto",
                paddingRight: 8,
                paddingTop: 16,
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <Tag
                  color="purple"
                  style={{ fontSize: 13, padding: "4px 12px" }}
                >
                  Tổng cộng {vehicleHistoryModal.records.length} lần sửa chữa
                </Tag>
              </div>
              <Timeline>
                {vehicleHistoryModal.records.map((h, idx) => (
                  <Timeline.Item
                    key={idx}
                    color={
                      h.status === "COMPLETED"
                        ? "green"
                        : h.status === "CANCELLED"
                          ? "red"
                          : "blue"
                    }
                  >
                    <div
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 10,
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <Tag color="geekblue" style={{ marginRight: 8 }}>
                            Lần {vehicleHistoryModal.records.length - idx}
                          </Tag>
                          <Text strong>
                            {dayjs(h.maintenance_date).format(
                              "DD/MM/YYYY HH:mm",
                            )}
                          </Text>
                          <Text
                            type="secondary"
                            style={{ fontSize: 11, marginLeft: 8 }}
                          >
                            ({dayjs(h.maintenance_date).fromNow()})
                          </Text>
                        </div>
                        <Space>
                          <Tag color="cyan" style={{ fontWeight: "bold" }}>
                            {h.km_reading?.toLocaleString() || 0} KM
                          </Tag>
                          <Tag
                            color={
                              h.status === "COMPLETED"
                                ? "success"
                                : "processing"
                            }
                          >
                            {h.status}
                          </Tag>
                        </Space>
                      </div>

                      <div style={{ marginBottom: 10 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            display: "block",
                            marginBottom: 6,
                          }}
                        >
                          Nội dung sửa chữa:
                        </Text>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {h.MaintenanceItems?.map((i, iIdx) => (
                            <Tag
                              key={iIdx}
                              color={i.type === "PART" ? "blue" : "orange"}
                              style={{ fontSize: 11 }}
                            >
                              {i.description || (i.type === "PART" ? `Phụ tùng #${i.part_id}` : "Dịch vụ")}
                              {i.quantity > 1 ? ` x${i.quantity}` : ""}
                            </Tag>
                          ))}
                          {(!h.MaintenanceItems || h.MaintenanceItems.length === 0) && (
                            <Text type="secondary" style={{ fontSize: 11, fontStyle: "italic" }}>
                              Không có chi tiết
                            </Text>
                          )}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: 8,
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <Text strong style={{ color: "#6366f1" }}>
                          {Number(h.total_amount).toLocaleString()} đ
                        </Text>
                        <Space>
                          {h.notes && (
                            <Text style={{ fontSize: 11, fontStyle: "italic", color: "#a78bfa" }}>
                              📝 {h.notes}
                            </Text>
                          )}
                          <Button size="small" icon={<Printer size={12} />} onClick={() => handlePrint(h)}>
                            In phiếu
                          </Button>
                          <Button
                            size="small"
                            type="primary"
                            ghost
                            icon={<Edit size={12} />}
                            onClick={() => {
                              handleEditFromBoard(h.id);
                              setVehicleHistoryModal(null);
                            }}
                          >
                            Sửa phiếu
                          </Button>
                          {canDeleteTicket && (
                            <Popconfirm
                              title="Xóa phiếu DỊCH VỤ này? Tồn kho phụ tùng sẽ được hoàn lại."
                              onConfirm={() => handleDeleteOrder(h.id)}
                            >
                              <Button size="small" danger icon={<Trash2 size={12} />} />
                            </Popconfirm>
                          )}
                        </Space>
                      </div>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          )}
        </Modal>
      </>
    );
  };

  return (
    <div style={{ padding: "24px" }}>
      {ReactDOM.createPortal(
        <div
          className="print-only-container"
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            height: 0,
            overflow: "hidden",
          }}
        >
          <PrintMaintenanceOrder
            order={printingOrder || { ...form.getFieldsValue(), id }}
            warehouse={warehouses.find(
              (w) =>
                w.id === (printingOrder?.warehouse_id || selectedWarehouse),
            )}
            items={printingOrder ? printingOrder.items : items}
          />
        </div>,
        document.body,
      )}
      <div
        className="page-header"
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Title level={2} style={{ margin: 0 }} className="gradient-text">
          TRUNG TÂM BẢO TRÌ & DỊCH VỤ
        </Title>
        <Button
          icon={<FileSpreadsheet size={16} />}
          onClick={() => setIsImportModalVisible(true)}
          style={{
            background: "linear-gradient(90deg, #10b981, #059669)",
            color: "white",
            border: "none",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)",
          }}
        >
          Nhập dịch vụ từ Excel
        </Button>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        className="modern-tabs"
        items={[
          {
            key: "board",
            label: (
              <Space>
                <LayoutGrid size={16} /> ĐIỀU PHỐI BÀN NÂNG
              </Space>
            ),
            children: (
              <MaintenanceBoard
                lifts={liftTables}
                fetchData={fetchData}
                loading={loading}
                onEditOrder={handleEditFromBoard}
                onCreateNew={handleCreateNew}
              />
            ),
          },
          {
            key: "form",
            label: (
              <Space>
                <FileText size={16} /> PHIẾU BẢO TRÌ
              </Space>
            ),
            children: renderForm(),
          },
          {
            key: "history",
            label: (
              <Space>
                <History size={16} /> LỊCH SỬ SỬA CHỮA
              </Space>
            ),
            children: renderHistory(),
          },
          {
            key: "mgmt",
            label: (
              <Space>
                <Settings size={16} /> CẤU HÌNH BÀN NÂNG
              </Space>
            ),
            children: <LiftManager />,
          },
        ]}
      />

      <style>{`
                .modern-tabs .ant-tabs-nav::before { border-bottom: 1px solid rgba(255,255,255,0.1); }
                .modern-tabs .ant-tabs-tab { background: transparent !important; border: none !important; margin-right: 10px !important; }
                .modern-tabs .ant-tabs-tab-active { background: rgba(59, 130, 246, 0.1) !important; border-bottom: 2px solid var(--primary-color) !important; }
                .lift-card { border: 1px solid rgba(255,255,255,0.05); transition: transform 0.2s; }
                .lift-card:hover { transform: translateY(-5px); }
                .busy-lift { border-left: 4px solid #ef4444 !important; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media print {
                    /* Hide the entire app UI */
                    #root {
                        display: none !important;
                    }
                    body {
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    /* Show the portal-rendered print container */
                    .print-only-container {
                        position: static !important;
                        left: auto !important;
                        top: auto !important;
                        width: 100% !important;
                        height: auto !important;
                        overflow: visible !important;
                        display: block !important;
                        background: white !important;
                    }
                    #print-maintenance-receipt {
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 8mm 12mm !important;
                    }
                    @page {
                        size: A4;
                        margin: 5mm;
                    }
                }
            `}</style>
      <ImportExcelModal
        visible={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        onSuccess={() => {
          setIsImportModalVisible(false);
          fetchData();
        }}
        type="maintenance"
        title="Nhập dữ liệu Bảo trì/Sửa chữa"
      />
    </div>
  );
};

export default MaintenanceHub;
