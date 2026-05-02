import React, { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Card, 
  Typography, 
  Space, 
  message, 
  Alert,
  Breadcrumb,
  Row,
  Col,
  Modal,
  Input,
  Tag
} from 'antd';
import { 
  Download, 
  History, 
  Database, 
  RefreshCw, 
  HardDrive, 
  ShieldCheck,
  ExternalLink,
  PlusCircle,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import api, { apiBackup } from '../../utils/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const BackupPage = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/system/backups');
      setBackups(res.data);
    } catch (error) {
      message.error('Không thể lấy danh sách bản sao lưu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    message.loading({ content: 'Đang khởi tạo bản sao lưu và đẩy lên AWS... (có thể mất 1-2 phút)', key: 'backup_proc', duration: 0 });
    try {
      await apiBackup.post('/system/backups');
      message.success({ content: 'Tạo bản sao lưu thành công!', key: 'backup_proc', duration: 4 });
      fetchBackups(); // Refresh list
    } catch (error) {
      const errMsg = error.response?.data?.message || error.message;
      message.error({ content: 'Lỗi khi tạo bản sao lưu: ' + errMsg, key: 'backup_proc', duration: 6 });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = (record) => {
    let confirmText = '';
    
    Modal.confirm({
      title: <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 10 }}><AlertTriangle size={24} /> XÁC NHẬN KHÔI PHỤC DỮ LIỆU</div>,
      content: (
        <div style={{ marginTop: 15 }}>
          <Alert 
            message="CẢNH BÁO NGUY HIỂM" 
            description="Hành động này sẽ XÓA SẠCH dữ liệu hiện tại và thay thế bằng dữ liệu từ bản sao lưu. Bạn không thể hoàn tác hành động này." 
            type="error" 
            showIcon 
          />
          <div style={{ marginTop: 20 }}>
            <Text>Để tiếp tục, vui lòng nhập chính xác chữ <b>KHOI PHUC</b> vào ô dưới đây:</Text>
            <Input 
              placeholder="Nhập chữ KHOI PHUC..." 
              style={{ marginTop: 10 }} 
              onChange={(e) => confirmText = e.target.value}
            />
          </div>
        </div>
      ),
      okText: 'XÁC NHẬN KHÔI PHỤC',
      okButtonProps: { danger: true, size: 'large' },
      cancelText: 'Hủy bỏ',
      width: 500,
      onOk: async () => {
        if (confirmText !== 'KHOI PHUC') {
          message.error('Mã xác nhận không đúng!');
          return Promise.reject();
        }

        setRestoring(true);
        message.loading({ content: 'Đang tiến hành khôi phục dữ liệu... Vui lòng không tắt trình duyệt. (có thể mất vài phút)', key: 'restore_proc', duration: 0 });
        try {
          await apiBackup.post('/system/backups/restore', { key: record.key });
          message.success({ content: 'Khôi phục dữ liệu thành công! Trang web sẽ tự động tải lại.', key: 'restore_proc', duration: 5 });
          setTimeout(() => window.location.reload(), 3000);
        } catch (error) {
          const errMsg = error.response?.data?.message || error.message;
          message.error({ content: 'Lỗi khôi phục: ' + errMsg, key: 'restore_proc', duration: 6 });
        } finally {
          setRestoring(false);
        }
      }
    });
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleDownload = async (key) => {
    try {
      const res = await api.get(`/system/backups/download?key=${encodeURIComponent(key)}`);
      if (res.data.downloadUrl) {
        // Mở link tải trong tab mới
        window.open(res.data.downloadUrl, '_blank');
        message.success('Đang bắt đầu tải bản sao lưu...');
      }
    } catch (error) {
      message.error('Lỗi khi lấy link tải: ' + error.message);
    }
  };

  const columns = [
    {
      title: 'Tên bản sao lưu',
      dataIndex: 'name',
      key: 'name',
      render: (text) => (
        <Space>
          <Database size={16} className="text-primary" />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Dung lượng',
      dataIndex: 'size',
      key: 'size',
      render: (size) => {
        const kb = size / 1024;
        const mb = kb / 1024;
        return mb > 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'lastModified',
      key: 'lastModified',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
      sorter: (a, b) => new Date(a.lastModified) - new Date(b.lastModified),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: () => <Tag color="green">Sẵn sàng</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<Download size={16} />} 
            onClick={() => handleDownload(record.key)}
            className="btn-success"
          >
            Tải về
          </Button>
          <Button 
            danger
            icon={<RotateCcw size={16} />} 
            onClick={() => handleRestore(record)}
            loading={restoring}
          >
            Khôi phục
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2} className="gradient-text" style={{ margin: 0 }}>QUẢN LÝ SAO LƯU DỮ LIỆU</Title>
          <Breadcrumb items={[
            { title: 'Hệ thống' },
            { title: 'Sao lưu & Phục hồi' }
          ]} style={{ marginTop: 8 }} />
        </div>
        <Space>
          <Button 
            type="primary"
            icon={<PlusCircle size={18} />} 
            onClick={handleCreateBackup} 
            loading={creating}
            size="large"
            className="btn-primary-gradient"
          >
            Tạo bản sao lưu ngay
          </Button>
          <Button 
            icon={<RefreshCw size={18} />} 
            onClick={fetchBackups} 
            loading={loading}
            size="large"
          >
            Làm mới
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={18}>
          <Card 
            className="glass-card" 
            title={<Space><History size={18} /> LỊCH SỬ SAO LƯU TRÊN AWS S3</Space>}
            styles={{ body: { padding: 0 } }}
          >
            <Table 
              columns={columns} 
              dataSource={backups} 
              loading={loading}
              rowKey="key"
              pagination={{ pageSize: 10 }}
              className="modern-table"
            />
          </Card>
        </Col>

        <Col xs={24} lg={6}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card className="glass-card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
              <Space direction="vertical">
                <ShieldCheck size={32} color="var(--primary-color)" />
                <Text strong style={{ fontSize: 16 }}>An toàn dữ liệu</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Dữ liệu được lưu trữ an toàn trên nền tảng AWS S3. 
                  Bạn có thể tải về để lưu trữ ngoại tuyến hoặc phục hồi khi cần thiết.
                </Text>
              </Space>
            </Card>

            <Card className="glass-card">
              <Title level={5}>Hướng dẫn</Title>
              <ul style={{ paddingLeft: 20, fontSize: 13, color: '#64748b' }}>
                <li>Tải file .sql về máy cá nhân.</li>
                <li>Dùng công cụ pgAdmin hoặc lệnh psql để phục hồi.</li>
                <li>Nên kiểm tra định kỳ các bản sao lưu.</li>
              </ul>
            </Card>
          </Space>
        </Col>
      </Row>

      <style>{`
        .btn-success {
          background-color: #10b981;
          border-color: #10b981;
        }
        .btn-success:hover {
          background-color: #059669 !important;
          border-color: #059669 !important;
        }
      `}</style>
    </div>
  );
};

export default BackupPage;
