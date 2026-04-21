import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Typography, Row, Col, DatePicker, 
  Select, Button, Space, message, Tag, Input
} from 'antd';
import { Search, FileText, Download, Filter } from 'lucide-react';
import api from '../../utils/api';
import dayjs from 'dayjs';
import { exportToExcel } from '../../utils/excelExport';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PartUsageReportPage = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [dates, setDates] = useState([dayjs().startOf('month'), dayjs()]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [query, setQuery] = useState('');

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (e) { console.error(e); }
  };

  const fetchReport = async () => {
    if (!dates || dates.length < 2) {
      if (loading) setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const from = dates[0].format('YYYY-MM-DD');
      const to = dates[1].format('YYYY-MM-DD');
      const whParam = selectedWarehouse ? `&warehouse_id=${selectedWarehouse}` : '';
      const queryParam = query ? `&query=${encodeURIComponent(query)}` : '';
      const res = await api.get(`/reports/parts/usage?from_date=${from}&to_date=${to}${whParam}${queryParam}`);
      setData(res.data);
    } catch (e) {
      message.error('Lỗi tải báo cáo: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchReport();
  }, []);

  const totalSelling = data.reduce((sum, item) => sum + Number(item.thu_ngay_amount), 0);

  const columns = [
    { title: 'PT', dataIndex: 'code', key: 'code', fixed: 'left', width: 140 },
    { title: 'Tên Tiếng Việt', dataIndex: 'name', key: 'name', width: 250 },
    { title: 'Đơn vị', dataIndex: 'unit', key: 'unit', width: 80, align: 'center' },
    { 
      title: 'Tổng xuất', 
      dataIndex: 'total_qty', 
      key: 'total_qty', 
      width: 100, 
      align: 'right',
      render: v => <Text strong>{v}</Text>
    },
    { title: 'Thu ngay', dataIndex: 'thu_ngay_qty', key: 'thu_ngay_qty', width: 100, align: 'right' },
    { title: 'Bảo hành', dataIndex: 'bao_hanh_qty', key: 'bao_hanh_qty', width: 100, align: 'right' },
    { title: 'Khuyến mại', dataIndex: 'khuyen_mai_qty', key: 'khuyen_mai_qty', width: 110, align: 'right' },
    { 
      title: 'Tiền thu ngay', 
      dataIndex: 'thu_ngay_amount', 
      key: 'thu_ngay_amount', 
      width: 140, 
      align: 'right',
      render: v => <Text style={{ color: '#10b981', fontWeight: 'bold' }}>{Number(v).toLocaleString()} đ</Text>
    },
    { 
      title: 'Tiền bảo hành', 
      dataIndex: 'bao_hanh_amount', 
      key: 'bao_hanh_amount', 
      width: 140, 
      align: 'right',
      render: v => v > 0 ? <Text type="secondary">{Number(v).toLocaleString()} đ</Text> : '-'
    },
    { 
      title: 'Tiền khuyến mại', 
      dataIndex: 'khuyen_mai_amount', 
      key: 'khuyen_mai_amount', 
      width: 140, 
      align: 'right',
      render: v => v > 0 ? <Text type="secondary">{Number(v).toLocaleString()} đ</Text> : '-'
    },
  ];

  const handleExport = () => {
    if (!data || data.length === 0) return message.warning('Không có dữ liệu để xuất!');
    const exportData = data.map(item => ({
      'Mã phụ tùng': item.code,
      'Tên phụ tùng': item.name,
      'Đơn vị': item.unit,
      'Tổng xuất': Number(item.total_qty),
      'Thu ngay (SL)': Number(item.thu_ngay_qty),
      'Bảo hành (SL)': Number(item.bao_hanh_qty),
      'Khuyến mại (SL)': Number(item.khuyen_mai_qty),
      'Tiền thu ngay': Number(item.thu_ngay_amount),
      'Tiền bảo hành': Number(item.bao_hanh_amount),
      'Tiền khuyến mại': Number(item.khuyen_mai_amount),
    }));
    exportToExcel(exportData, `BaoCaoXuatPhuTung_${dayjs().format('YYYYMMDD')}`);
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
           <Title level={2} className="gradient-text" style={{ margin: 0 }}>BÁO CÁO CHI TIẾT XUẤT PHỤ TÙNG</Title>
           <Text type="secondary">Thống kê chi tiết phụ tùng xuất kho theo mục đích sử dụng</Text>
        </div>
        <Space>
           <Button icon={<Download size={16} />} onClick={handleExport}>Xuất Excel</Button>
        </Space>
      </div>

      <Card className="glass-card" style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Space>
              <Filter size={18} style={{ color: 'var(--primary-color)' }} />
              <Text strong>Bộ lọc:</Text>
            </Space>
          </Col>
          <Col>
            <RangePicker 
              value={dates} 
              onChange={setDates} 
              format="DD/MM/YYYY" 
              className="glass-input"
              allowClear={false}
            />
          </Col>
          <Col>
            <Input 
              placeholder="Mã/Tên phụ tùng" 
              style={{ width: 220 }}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onPressEnter={fetchReport}
              prefix={<Search size={14} style={{ color: '#8c8c8c' }} />}
              className="glass-input"
            />
          </Col>
          <Col>
            <Select 
              placeholder="Chọn kho" 
              style={{ width: 180 }} 
              allowClear
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              className="glass-input"
            >
              {warehouses.map(w => <Select.Option key={w.id} value={w.id}>{w.warehouse_name}</Select.Option>)}
            </Select>
          </Col>
          <Col>
            <Button type="primary" icon={<Search size={16} />} onClick={fetchReport} loading={loading}>Xem báo cáo</Button>
          </Col>
        </Row>
      </Card>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.05)', 
        padding: '12px 20px', 
        borderRadius: '12px 12px 0 0',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottom: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space size={24}>
           <Text>Tổng tiền bán: <Text strong style={{ fontSize: 18, color: '#10b981' }}>{totalSelling.toLocaleString()} đ</Text></Text>
           <Text>Số mặt hàng: <Text strong>{data.length}</Text></Text>
        </Space>
        {dates && dates.length >= 2 && (
          <Tag color="processing">{dates[0].format('DD/MM/YYYY')} - {dates[1].format('DD/MM/YYYY')}</Tag>
        )}
      </div>

      <Card className="glass-card" styles={{ body: { padding: 0 } }} style={{ borderRadius: '0 0 12px 12px' }}>
        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="code" 
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 1200 }}
          bordered
          className="modern-table"
        />
      </Card>

      <style>{`
        .modern-table .ant-table-thead > tr > th {
          background: rgba(255, 255, 255, 0.02) !important;
          font-weight: bold;
          font-size: 13px;
        }
        .modern-table .ant-table-tbody > tr > td {
          font-size: 13px;
        }
      `}</style>
    </div>
  );
};

export default PartUsageReportPage;
