import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Card, 
  Row, 
  Col, 
  Select, 
  Space, 
  Typography, 
  Button, 
  Tag,
  DatePicker,
  Modal,
  message,
  Dropdown
} from 'antd';
import { 
  Search, 
  Download, 
  FileText
} from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PartTransferReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [filters, setFilters] = useState({
    from_date: dayjs().startOf('month').format('YYYY-MM-DD'),
    to_date: dayjs().format('YYYY-MM-DD'),
    warehouse_id: undefined,
    status: undefined
  });
  
  const [options, setOptions] = useState({ warehouses: [] });
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const isManager = user.role === 'MANAGER';
  const isPowerUser = isAdmin || isManager;
  const allowedWarehouseIds = [user.warehouse_id, ...(user.accessible_warehouses ? user.accessible_warehouses.split(',') : [])].filter(Boolean);

  useEffect(() => {
    fetchOptions();
    fetchReport();
  }, []);

  const fetchOptions = async () => {
    try {
      const res = await api.get('/warehouses');
      setOptions({
        warehouses: isPowerUser ? res.data : res.data.filter(w => allowedWarehouseIds.includes(w.id.toString()))
      });
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async (currentFilters = filters) => {
    setLoading(true);
    try {
      const res = await api.get('/reports/parts/transfers', { params: currentFilters });
      setTransfers(res.data);
    } catch (error) {
      message.error('Không thể tải báo cáo điều chuyển phụ tùng');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const onSearch = () => {
    fetchReport();
  };

  const handleExport = () => {
    if (!transfers || transfers.length === 0) return message.warning('Không có dữ liệu để xuất!');
    const exportData = [];
    transfers.forEach(t => {
        t.PartTransferItems?.forEach(item => {
            exportData.push({
                'Mã phiếu': t.transfer_code,
                'Ngày tạo': dayjs(t.createdAt).format('DD/MM/YYYY HH:mm'),
                'Từ kho': t.FromWarehouse?.warehouse_name || 'N/A',
                'Đến kho': t.ToWarehouse?.warehouse_name || 'N/A',
                'Trạng thái': t.status === 'PENDING_ADMIN' ? 'Chờ duyệt' : t.status === 'ADMIN_APPROVED' ? 'Đang giao' : t.status === 'RECEIVED' ? 'Đã nhận' : 'Đã hủy',
                'Người lập': t.creator?.full_name || 'N/A',
                'Mã phụ tùng': item.Part?.code,
                'Tên phụ tùng': item.Part?.name,
                'Số lượng': Number(item.quantity),
                'Đơn vị': item.unit || item.Part?.unit,
                'Ghi chú': t.notes
            });
        });
    });
    exportToExcel(exportData, `BaoCaoChuyenPhuTung_${dayjs().format('YYYYMMDD')}`);
  };

  const handleExportMonthly = () => {
    const { from_date, to_date, warehouse_id } = filters;
    if (!warehouse_id) return message.warning('Vui lòng chọn kho để xuất báo cáo!');
    
    // Construct the export URL
    const url = `${api.defaults.baseURL}/reports/parts/transfers/export-monthly?from_date=${from_date}&to_date=${to_date}&warehouse_id=${warehouse_id}`;
    
    // Use window.open or a hidden link to trigger download with token
    const token = localStorage.getItem('token');
    
    // We can't easily add headers to window.open, so we might need to use a temporary form or just append token to URL if the backend allows it
    // But our backend uses Bearer token in headers. 
    // Let's use fetch to get the blob and download it.
    
    setLoading(true);
    api.get('/reports/parts/transfers/export-monthly', { 
        params: { from_date, to_date, warehouse_id },
        responseType: 'blob' 
    })
    .then(response => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Bao_Cao_Luan_Chuyen_${dayjs(from_date).format('MM_YYYY')}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    })
    .catch(err => {
        message.error('Lỗi khi xuất báo cáo: ' + err.message);
    })
    .finally(() => setLoading(false));
  };

  const columns = [
    { 
        title: 'Ngày tạo', 
        dataIndex: 'createdAt', 
        key: 'date', 
        sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
        render: v => dayjs(v).format('DD/MM/YYYY HH:mm') 
    },
    { 
      title: 'Mã phiếu', 
      dataIndex: 'transfer_code', 
      key: 'code', 
      sorter: (a, b) => (a.transfer_code || '').localeCompare(b.transfer_code || ''),
      render: v => <Text strong>{v}</Text> 
    },
    { 
      title: 'Từ kho', 
      dataIndex: ['FromWarehouse', 'warehouse_name'], 
      key: 'from',
      sorter: (a, b) => (a.FromWarehouse?.warehouse_name || '').localeCompare(b.FromWarehouse?.warehouse_name || '')
    },
    { 
      title: 'Đến kho', 
      dataIndex: ['ToWarehouse', 'warehouse_name'], 
      key: 'to',
      sorter: (a, b) => (a.ToWarehouse?.warehouse_name || '').localeCompare(b.ToWarehouse?.warehouse_name || '')
    },
    { 
        title: 'Trạng thái', 
        dataIndex: 'status', 
        key: 'status',
        sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
        render: s => {
            const colors = {
                'PENDING_ADMIN': 'orange',
                'ADMIN_APPROVED': 'blue',
                'RECEIVED': 'green',
                'CANCELLED': 'red'
            };
            const labels = {
                'PENDING_ADMIN': 'Chờ duyệt',
                'ADMIN_APPROVED': 'Đang giao',
                'RECEIVED': 'Đã nhận',
                'CANCELLED': 'Đã hủy'
            };
            return <Tag color={colors[s]}>{labels[s] || s}</Tag>;
        }
    },
    { 
        title: 'Chi Tiết', 
        key: 'items', 
        sorter: (a, b) => (a.PartTransferItems?.length || 0) - (b.PartTransferItems?.length || 0),
        render: (_, r) => (
            <Button 
                type="link" 
                icon={<FileText size={16} />} 
                onClick={() => {
                    setSelectedTransfer(r);
                    setIsModalOpen(true);
                }}
            >
                {r.PartTransferItems?.length || 0} mặt hàng
            </Button>
        )
    },
    { 
      title: 'Người lập', 
      dataIndex: ['creator', 'full_name'], 
      key: 'creator',
      sorter: (a, b) => (a.creator?.full_name || '').localeCompare(b.creator?.full_name || '')
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} className="gradient-text">BÁO CÁO LUÂN CHUYỂN PHỤ TÙNG</Title>
        <Space direction="vertical" align="end" size={0}>
            <Space>
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'simple',
                      label: 'Danh sách phiếu (Dạng bảng)',
                      icon: <Download size={14} />,
                      onClick: handleExport
                    },
                    {
                      key: 'monthly',
                      label: 'Báo cáo X-N nội bộ (Mẫu)',
                      icon: <FileText size={14} />,
                      onClick: handleExportMonthly,
                      disabled: !filters.warehouse_id
                    }
                  ]
                }}
                placement="bottomRight"
              >
                <Button type="primary" icon={<Download size={18} />}>Xuất báo cáo</Button>
              </Dropdown>
            </Space>
            {!filters.warehouse_id && (
                <Text type="secondary" style={{ fontSize: '12px', marginTop: 4 }}>
                    * Vui lòng chọn <b>Kho liên quan</b> để xuất báo cáo mẫu.
                </Text>
            )}
        </Space>
      </div>

      <Card className="glass-card" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Khoảng thời gian:</Text>
            <RangePicker 
              style={{ width: '100%' }} 
              size="large"
              defaultValue={[dayjs().startOf('month'), dayjs()]}
              onChange={(dates) => {
                if (dates) {
                  handleFilterChange('from_date', dates[0].format('YYYY-MM-DD'));
                  handleFilterChange('to_date', dates[1].format('YYYY-MM-DD'));
                }
              }}
              allowClear={false}
            />
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Kho liên quan:</Text>
            <Select 
              allowClear={isPowerUser}
              disabled={!isPowerUser}
              style={{ width: '100%' }} 
              placeholder={isPowerUser ? "--- Tất cả các kho ---" : "Kho hiện tại"}
              size="large"
              value={filters.warehouse_id || (isPowerUser ? undefined : user.warehouse_id)}
              onChange={v => handleFilterChange('warehouse_id', v)}
            >
              {options.warehouses.map(w => <Option key={w.id} value={w.id}>{w.warehouse_name}</Option>)}
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Trạng thái:</Text>
            <Select 
              allowClear 
              style={{ width: '100%' }} 
              placeholder="--- Tất cả trạng thái ---" 
              size="large"
              onChange={v => handleFilterChange('status', v)}
            >
              <Option value="PENDING_ADMIN">Chờ duyệt</Option>
              <Option value="ADMIN_APPROVED">Đang giao</Option>
              <Option value="RECEIVED">Đã nhận</Option>
              <Option value="CANCELLED">Đã hủy</Option>
            </Select>
          </Col>
          <Col xs={24}>
            <Button type="primary" size="large" block icon={<Search size={18} />} onClick={onSearch} loading={loading}>
              Xem báo cáo
            </Button>
          </Col>
        </Row>
      </Card>

      <Card className="glass-card">
        <Table 
            dataSource={transfers} 
            columns={columns} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 15 }}
            scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={<Title level={4}>CHI TIẾT PHIẾU CHUYỂN: {selectedTransfer?.transfer_code}</Title>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        width={800}
        footer={[
            <Button key="close" onClick={() => setIsModalOpen(false)}>Đóng</Button>
        ]}
        destroyOnClose
      >
        {selectedTransfer && (
            <Table 
                dataSource={selectedTransfer.PartTransferItems}
                pagination={false}
                rowKey="id"
                columns={[
                    { title: 'STT', key: 'stt', width: 60, render: (_, __, i) => i + 1 },
                    { title: 'Mã phụ tùng', dataIndex: ['Part', 'code'], key: 'code', render: v => <Text strong>{v}</Text> },
                    { title: 'Tên phụ tùng', dataIndex: ['Part', 'name'], key: 'name' },
                    { title: 'Số lượng', dataIndex: 'quantity', key: 'qty', align: 'right', render: (v, r) => <Text strong>{v} {r.unit || r.Part?.unit}</Text> }
                ]}
            />
        )}
      </Modal>
    </div>
  );
};

export default PartTransferReportPage;
