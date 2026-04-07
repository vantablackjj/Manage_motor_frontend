import React, { useState, useEffect } from 'react';
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
  Modal
} from 'antd';
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
  Printer
} from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

const VehicleLifecyclePage = () => {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const urlWarehouseId = searchParams.get('warehouse_id');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  
  // Edit State
  const [editVisible, setEditVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Xác định chế độ dựa trên URL
  const isPurchaseOnly = location.pathname.includes('purchases');
  const isRetailOnly = location.pathname.includes('retail');
  const isWholesaleOnly = location.pathname.includes('wholesale');

  const [searchMode, setSearchMode] = useState(isPurchaseOnly ? 'IMPORT' : (isRetailOnly || isWholesaleOnly ? 'SALE' : 'IMPORT'));
  const [searchType, setSearchType] = useState(isPurchaseOnly ? 'DATE_IMPORTER' : 'SALE_DATE');
  
  // Chi tiết vòng đời (Sử dụng Drawer thay cho Modal)
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchWarehouses();
    // Reset filters when switching pages
    if (isPurchaseOnly) { setSearchMode('IMPORT'); setSearchType('DATE_IMPORTER'); }
    else if (isRetailOnly || isWholesaleOnly) { setSearchMode('SALE'); setSearchType('SALE_DATE'); }
    
    // Auto search from URL
    if (urlWarehouseId) {
        form.setFieldsValue({ warehouse_id: urlWarehouseId });
        handleSearch({ warehouse_id: urlWarehouseId });
    }
  }, [location.pathname, urlWarehouseId]);
  
  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (e) {}
  };


  // Suggestions state
  const [options, setOptions] = useState([]);
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);

  const fetchUsers = async () => {
    try {
      const resp = await api.get('/auth/users');
      setUsers(resp.data);
    } catch (e) {
      console.error('Lỗi lấy danh sách nhân viên');
    }
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
          sale_date: record.sale_date ? dayjs(record.sale_date) : null
      });
      setEditVisible(true);
  };

  const submitEdit = async (values) => {
      setSavingEdit(true);
      try {
          const body = {
              ...values,
              import_date: values.import_date?.format('YYYY-MM-DD'),
              sale_date: values.sale_date?.format('YYYY-MM-DD')
          };
          await api.patch(`/reports/vehicle-update/${editingRecord.id}`, body);
          message.success('Cập nhật dữ liệu thành công!');
          setEditVisible(false);
          // Refresh search
          handleSearch(form.getFieldsValue());
      } catch (e) {
          message.error(e.response?.data?.message || 'Lỗi cập nhật dữ liệu!');
      } finally {
          setSavingEdit(false);
      }
  };

  const handleExport = () => {
    if (!results || results.length === 0) {
      return message.warning('Không có dữ liệu để xuất!');
    }

    const exportData = results.map(v => ({
      'Trạng thái': v.sale_date ? 'Đã bán' : 'Trong kho',
      'Ngày Nhập': v.import_date ? dayjs(v.import_date).format('DD/MM/YYYY') : 'N/A',
      'Nhà cung cấp': v.supplier_name,
      'Người Nhập': v.importer_name,
      'Loại Xe': v.type_name,
      'Màu Xe': v.color_name,
      'Số Máy': v.engine_no,
      'Số Khung': v.chassis_no,
      'Kênh Bán': v.sale_channel || '-',
      'Ngày Bán': v.sale_date ? dayjs(v.sale_date).format('DD/MM/YYYY') : '-',
      'Khách Hàng': v.customer_name || '-',
      'Giá Tiền': Number(v.sale_price || v.purchase_price)
    }));

    let fileName = 'BaoCaoTraCuuXe';
    if (isPurchaseOnly) fileName = 'BaoCaoNhapHang';
    else if (isRetailOnly) fileName = 'BaoCaoBanLe';
    else if (isWholesaleOnly) fileName = 'BaoCaoBanBuon_LichSu';

    exportToExcel(exportData, `${fileName}_${dayjs().format('YYYYMMDD_HHmm')}`);
  };

  const handlePrint = () => {
    if (!results || results.length === 0) {
        return message.warning('Không có dữ liệu để in!');
    }

    const reportTitle = isPurchaseOnly ? 'BÁO CÁO CHI TIẾT NHẬP XE' : 
                       isRetailOnly ? 'BÁO CÁO CHI TIẾT XE BÁN LẺ' : 
                       isWholesaleOnly ? 'BÁO CÁO CHI TIẾT XE BÁN BUÔN' : 
                       'BÁO CÁO TRA CỨU XE TỔNG HỢP';

    const vals = form.getFieldsValue();
    const subTitle = (vals.dates?.[0] && vals.dates?.[1]) 
        ? `Từ ngày ${vals.dates[0].format('DD/MM/YYYY')} đến ngày ${vals.dates[1].format('DD/MM/YYYY')}` 
        : 'Tất cả thời gian';

    const html = `<!DOCTYPE html>
<html>
<head>
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
            ${results.map((v, index) => `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td class="text-center">${dayjs(v.sale_date || v.import_date).format('DD/MM/YYYY')}</td>
                    <td class="text-center">${v.sale_date ? 'Đã bán' : 'Trong kho'}</td>
                    <td>${v.type_name}</td>
                    <td>${v.engine_no}</td>
                    <td>${v.chassis_no}</td>
                    <td>${v.customer_name || '-'}</td>
                    <td class="text-center">${v.sale_channel || '-'}</td>
                    <td class="text-right">${Number(v.sale_price || v.purchase_price).toLocaleString()}</td>
                </tr>
            `).join('')}
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

    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    } else {
        message.warning('Vui lòng cho phép pop-up để in báo cáo.');
    }
  };

  const onSearchSuggestions = async (searchText) => {
    if (searchText.length < 2) {
      setOptions([]);
      return;
    }
    setFetchingSuggestions(true);
    try {
      const resp = await api.get('/reports/vehicle-suggestions', { params: { query: searchText } });
      const mappedOptions = resp.data.map(v => ({
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Số máy: <Text strong>{v.engine_no}</Text></span>
            <Text type="secondary" style={{ fontSize: 12 }}>Số khung: {v.chassis_no}</Text>
          </div>
        ),
        value: v.engine_no, // Value is used for the input
        engine: v.engine_no,
        chassis: v.chassis_no
      }));
      setOptions(mappedOptions);
    } catch (e) {
      console.error('Search suggestions fail');
    } finally {
      setFetchingSuggestions(false);
    }
  };

  const onSelectSuggestion = (val, option) => {
      form.setFieldsValue({
          engine_no: option.engine,
          chassis_no: option.chassis
      });
  };

  const handleSearch = async (values) => {
    setLoading(true);
    try {
      const params = {
        mode: searchMode,
        type: searchType,
        from_date: values.dates?.[0]?.format('YYYY-MM-DD'),
        to_date: values.dates?.[1]?.format('YYYY-MM-DD'),
        created_by: values.created_by,
        warehouse_id: values.warehouse_id,
        engine_no: values.engine_no,
        chassis_no: values.chassis_no,
        sale_channel: isRetailOnly ? 'RETAIL' : isWholesaleOnly ? 'WHOLESALE' : null
      };


      let response = await api.get('/reports/vehicle-lookup', { params });
      let data = response.data;

      setResults(data);
      if (data.length === 0) {
          message.info('Không tìm thấy dữ liệu phù hợp');
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Lỗi tra cứu dữ liệu!');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const showLifecycle = async (vehicleId) => {
    setDetailLoading(true);
    setDrawerVisible(true);
    try {
      const vehicle = results.find(v => v.id === vehicleId);
      const resp = await api.get('/reports/vehicle-lifecycle', { params: { engine_no: vehicle.engine_no } });
      setDetailData(resp.data);
    } catch (e) {
      message.error('Không thể tải nhật ký vòng đời');
      setDrawerVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const getTimelineIcon = (type) => {
    switch (type) {
      case 'PURCHASE': return <PlusCircle size={18} color="#10b981" />;
      case 'TRANSFER': return <ArrowRightLeft size={18} color="#3b82f6" />;
      case 'SALE_RETAIL': return <ShoppingCart size={18} color="#f59e0b" />;
      case 'SALE_WHOLESALE': return <Warehouse size={18} color="#8b5cf6" />;
      default: return <Info size={18} />;
    }
  };

  // Tính toán tóm tắt cho Cards
  const stats = {
      total: results.length,
      sold: results.filter(v => v.sale_date).length,
      inStock: results.filter(v => !v.sale_date).length
  };

  const columns = [
    { 
        title: 'Trạng thái',
        width: 100,
        render: (_, record) => record.sale_date ? <Tag color="warning">Đã bán</Tag> : <Tag color="success">Trong kho</Tag>
    },
    { 
        title: 'Ngày Nhập', 
        dataIndex: 'import_date', 
        render: d => d ? dayjs(d).format('DD/MM/YYYY') : 'N/A'
    },
    { title: 'Nhà cung cấp', dataIndex: 'supplier_name', ellipsis: true },
    { title: 'Người Nhập', dataIndex: 'importer_name' },
    { title: 'Loại Xe', dataIndex: 'type_name' },
    { title: 'Màu Xe', dataIndex: 'color_name' },
    { title: 'Số Máy', dataIndex: 'engine_no', className: 'strong-text' },
    { title: 'Số Khung', dataIndex: 'chassis_no', className: 'strong-text' },
    { 
        title: 'Kênh Bán', 
        dataIndex: 'sale_channel',
        render: c => <Tag color={c === 'Bán Lẻ' ? 'gold' : c === 'Bán Sỉ (Lô)' ? 'purple' : 'default'}>{c}</Tag>
    },
    { 
        title: 'Ngày Bán', 
        dataIndex: 'sale_date', 
        render: d => d ? <Text strong style={{ color: '#f59e0b' }}>{dayjs(d).format('DD/MM/YYYY')}</Text> : <Text type="secondary">-</Text>
    },
    { title: 'Khách Hàng', dataIndex: 'customer_name' },
    { 
        title: 'Giá Tiền', 
        render: (_, record) => (
            <div style={{ fontSize: 13 }}>
                {record.sale_price ? (
                    <Text type="warning" strong>{Number(record.sale_price).toLocaleString()} đ</Text>
                ) : (
                    <Text type="success" strong>{Number(record.purchase_price).toLocaleString()} đ</Text>
                )}
            </div>
        )
    },
    {
        title: 'Thao tác',
        fixed: 'right',
        width: 120,
        render: (_, record) => (
            <Space>
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
                    onClick={() => showLifecycle(record.id)}
                    title="Xem vòng đời"
                />
            </Space>
        )
    }
  ];

  return (
    <div style={{ padding: '0 5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <Title level={2} className="gradient-text" style={{ margin: 0 }}>
              {isPurchaseOnly ? 'XEM THÔNG TIN MUA XE' : 
               isRetailOnly ? 'XEM THÔNG TIN BÁN LẺ' : 
               isWholesaleOnly ? 'XEM THÔNG TIN BÁN BUÔN' : 
               'TÌM XE THEO YÊU CẦU'}
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
          <Col span={8}>
              <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                  <Statistic 
                    title={<Space><Box size={14} /> Tổng số xe</Space>} 
                    value={stats.total} 
                    prefix={<Search size={20} color="#3b82f6" />}
                  />
              </Card>
          </Col>
          <Col span={8}>
              <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <Statistic 
                    title={<Space><CheckCircle2 size={14} /> {isPurchaseOnly ? 'Đã nhập' : 'Xe trong kho'}</Space>} 
                    value={stats.inStock} 
                    valueStyle={{ color: '#10b981' }}
                    prefix={<Truck size={20} color="#10b981" />} 
                  />
              </Card>
          </Col>
          <Col span={8}>
              <Card className="glass-card stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
                  <Statistic 
                    title={<Space><ShoppingCart size={14} /> {isPurchaseOnly ? 'Đã bán' : 'Xe đã bán'}</Space>} 
                    value={stats.sold} 
                    valueStyle={{ color: '#f59e0b' }}
                    prefix={<Info size={20} color="#f59e0b" />} 
                  />
              </Card>
          </Col>
      </Row>
      
      <Card className="glass-card" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleSearch} initialValues={{ created_by: null }}>
          <Row gutter={32}>
            {/* Cột Xe Nhập Vào */}
            <Col xs={24} md={6}>
                <div style={{ 
                    padding: '15px', 
                    background: 'rgba(59, 130, 246, 0.03)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(59, 130, 246, 0.1)', 
                    height: '100%',
                    opacity: (isRetailOnly || isWholesaleOnly) ? 0.3 : 1
                }}>
                    <Title level={5} style={{ marginBottom: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Radio 
                            checked={searchMode === 'IMPORT'} 
                            onChange={() => {setSearchMode('IMPORT'); setSearchType('DATE_IMPORTER');}} 
                            disabled={isRetailOnly || isWholesaleOnly}
                        />
                        <Text strong style={{ color: searchMode === 'IMPORT' ? 'var(--primary-color)' : 'inherit' }}>XE NHẬP VÀO</Text>
                    </Title>
                    <Radio.Group 
                        value={searchMode === 'IMPORT' ? searchType : null} 
                        onChange={(e) => setSearchType(e.target.value)}
                        disabled={searchMode !== 'IMPORT' || isRetailOnly || isWholesaleOnly}
                        className="custom-radio-group"
                    >
                        <Radio value="ENGINE_CHASSIS">Theo số khung - số máy</Radio>
                        <Radio value="DATE_IMPORTER">Theo ngày & Người nhập</Radio>
                    </Radio.Group>
                </div>
            </Col>

            {/* Cột Chi tiết lọc */}
            <Col xs={24} md={12}>
                <div style={{ padding: '0 15px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}>
                       <Filter size={16} color="var(--primary-color)" />
                       <Title level={5} style={{ margin: 0 }}>BỘ LỌC CHI TIẾT</Title>
                   </div>
                   <Row gutter={16}>
                      <Col span={isAdmin ? 8 : 16}>
                         <Form.Item label="Khoảng thời gian" name="dates">
                            <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder={['Từ ngày', 'Đến ngày']} />
                         </Form.Item>
                      </Col>
                      {isAdmin && (
                        <Col span={8}>
                          <Form.Item label="Lọc theo kho" name="warehouse_id">
                              <Select placeholder="Tất cả kho" allowClear>
                                  {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
                              </Select>
                          </Form.Item>
                        </Col>
                      )}
                      <Col span={8}>
                        <Form.Item label="Người thực hiện" name="created_by">
                            <Select 
                                placeholder="Chọn người dùng" 
                                allowClear 
                                options={users.map(u => ({ label: u.full_name || u.username, value: u.id }))}
                            />
                        </Form.Item>
                      </Col>

                      <Col span={12}>
                        <Form.Item label="Số Máy (Engine No)" name="engine_no">
                            <AutoComplete 
                                options={options} 
                                onSearch={onSearchSuggestions} 
                                onSelect={onSelectSuggestion}
                            >
                                <Input prefix={<Search size={14} opacity={0.5} />} placeholder="Gõ 2 ký tự để gợi ý..." />
                            </AutoComplete>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="Số Khung (Chassis No)" name="chassis_no">
                            <AutoComplete 
                                options={options} 
                                onSearch={onSearchSuggestions} 
                                onSelect={(val, opt) => {
                                    form.setFieldsValue({ engine_no: opt.engine, chassis_no: opt.chassis });
                                }}
                            >
                                <Input prefix={<Fingerprint size={14} opacity={0.5} />} placeholder="Gõ 2 ký tự để gợi ý..." />
                            </AutoComplete>
                        </Form.Item>
                      </Col>
                      <Col span={24}>
                        <Form.Item label="Tên Khách Hàng (Dành cho bản lẻ/bán sỉ)" name="customer_name">
                           <Input prefix={<UserIcon size={14} opacity={0.5} />} placeholder="Tìm tên khách..." />
                        </Form.Item>
                      </Col>
                   </Row>
                </div>
            </Col>

            {/* Cột Xe Bán Ra */}
            <Col xs={24} md={6}>
                <div style={{ 
                    padding: '15px', 
                    background: 'rgba(245, 158, 11, 0.03)', 
                    borderRadius: '12px', 
                    border: '1px solid rgba(245, 158, 11, 0.1)', 
                    height: '100%',
                    opacity: isPurchaseOnly ? 0.3 : 1
                }}>
                    <Title level={5} style={{ marginBottom: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Radio 
                            checked={searchMode === 'SALE'} 
                            onChange={() => {setSearchMode('SALE'); setSearchType('SALE_DATE');}} 
                            disabled={isPurchaseOnly}
                        />
                        <Text strong style={{ color: searchMode === 'SALE' ? '#f59e0b' : 'inherit' }}>XE BÁN RA</Text>
                    </Title>
                    <Radio.Group 
                        value={searchMode === 'SALE' ? searchType : null} 
                        onChange={(e) => setSearchType(e.target.value)}
                        disabled={searchMode !== 'SALE' || isPurchaseOnly}
                        className="custom-radio-group"
                    >
                        <Radio value="SALE_DATE">Theo ngày tháng bán</Radio>
                        <Radio value="ENGINE_CHASSIS">Theo số khung + số máy</Radio>
                        <Radio value="DATE_IMPORTER">Theo nhập hàng gốc</Radio>
                    </Radio.Group>
                </div>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: 20 }}>
            <Space>
                <Button onClick={() => {form.resetFields(); setResults([]);}}>Làm mới</Button>
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
            dataSource={results} 
            loading={loading}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{ pageSize: 10, showSizeChanger: true }}
            onRow={(record) => ({
                onClick: () => showLifecycle(record.id),
                style: { cursor: 'pointer' }
            })}
            rowClassName={(record) => record.sale_date ? 'sold-row' : 'instock-row'}
         />
      </Card>

      {/* Modal Sửa dữ liệu sai (Chỉ Admin) */}
      <Modal
        title={<Space><Edit2 size={18} /> SỬA DỮ LIỆU SAI (QUYỀN ADMIN)</Space>}
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
                    <Form.Item label="Số Máy" name="engine_no" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Số Khung" name="chassis_no" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Ngày Nhập" name="import_date">
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Ngày Bán" name="sale_date">
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
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
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                <Text type="danger" size="small">
                    <Info size={12} style={{ marginRight: 4 }} /> 
                    Lưu ý: Mọi thay đổi sẽ được ghi lại trong nhật ký hệ thống. Hãy kiểm tra kỹ trước khi cập nhật.
                </Text>
            </div>
        </Form>
      </Modal>

      {/* Drawer Nhật ký Vòng đời (UX tối ưu: Không che khuất bảng) */}
      <Drawer
        title={<Space><History size={20} /> NHẬT KÝ CHI TIẾT XE</Space>}
        placement="right"
        width={500}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        className="glass-drawer"
      >
        {detailLoading ? (
            <div style={{ textAlign: 'center', padding: '50px' }}><Spin tip="Đang tải..." /></div>
        ) : detailData ? (
            <div>
                 <Card className="detail-header-card" style={{ marginBottom: 24, background: 'rgba(var(--primary-rgb), 0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                        <div style={{ padding: 12, background: '#fff', borderRadius: 12, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                            <Truck size={32} color="var(--primary-color)" />
                        </div>
                        <div>
                            <Title level={4} style={{ margin: 0 }}>{detailData.vehicle.VehicleType?.name}</Title>
                            <Text type="secondary">{detailData.vehicle.VehicleColor?.color_name}</Text>
                        </div>
                    </div>
                    <Divider style={{ margin: '12px 0' }} />
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Số Máy:</Text>
                            <Text strong>{detailData.vehicle.engine_no}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Số Khung:</Text>
                            <Text strong>{detailData.vehicle.chassis_no}</Text>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Text type="secondary">Kho hiện tại:</Text>
                            <Tag color="blue">{detailData.vehicle.Warehouse?.warehouse_name}</Tag>
                        </div>
                    </Space>
                 </Card>
                 
                 <Timeline 
                    mode="left"
                    items={detailData.timeline.map(item => ({
                    label: <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(item.date).format('DD/MM/YYYY HH:mm')}</Text>,
                    children: (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                {getTimelineIcon(item.type)}
                                <Text strong>{item.title}</Text>
                            </div>
                            <Paragraph style={{ marginBottom: 2, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>{item.message}</Paragraph>
                            <Space>
                                {item.price && <Text strong style={{ color: '#10b981', display: 'block' }}>{Number(item.price).toLocaleString()} đ</Text>}
                                {item.guarantee === 'Có' && <Tag color="green">Có bảo hành</Tag>}
                            </Space>
                        </div>
                    ),
                    dot: getTimelineIcon(item.type)
                    }))}
                />
            </div>
        ) : <Empty />}
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
    </div>
  );
};

export default VehicleLifecyclePage;
