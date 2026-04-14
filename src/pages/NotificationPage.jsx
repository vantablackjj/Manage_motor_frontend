import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  List, 
  Badge, 
  Button, 
  Space, 
  Tag, 
  Tabs, 
  message,
  Empty,
  Tooltip
} from 'antd';
import { 
  Bell, 
  CheckCircle, 
  MailOpen, 
  Clock, 
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  Truck,
  PlusSquare,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../utils/api';

const { Title, Text } = Typography;

const NotificationPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let url = '/notifications';
      if (activeTab === 'unread') {
        url += '?is_read=false';
      } else if (activeTab === 'read') {
        url += '?is_read=true';
      }
      
      const res = await api.get(url);
      setNotifications(res.data.list || []);
    } catch (e) {
      message.error('Lỗi tải thông báo');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      // Nếu đang ở tab unread thì filter nó đi luôn
      if (activeTab === 'unread') {
         setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAllRead = async () => {
    try {
      await api.put('/notifications/all/read');
      message.success('Đã đánh dấu tất cả là đã đọc');
      fetchNotifications();
    } catch (e) {
      message.error('Lỗi thao tác');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'RETAIL_SALE': return <ShoppingBag size={20} color="#10b981" />;
      case 'WHOLESALE_SALE': return <ShoppingBag size={20} color="#3b82f6" />;
      case 'PURCHASE': return <PlusSquare size={20} color="#f59e0b" />;
      case 'TRANSFER': return <Truck size={20} color="#8b5cf6" />;
      default: return <AlertCircle size={20} color="#6b7280" />;
    }
  };

  const handleAction = async (item) => {
    if (!item.is_read) {
        await markAsRead(item.id);
    }
    if (item.link) {
        navigate(item.link);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2} className="gradient-text" style={{ margin: 0 }}>
          <Space><Bell /> TRUNG TÂM THÔNG BÁO</Space>
        </Title>
        <Space>
           <Button icon={<RefreshCw size={16} />} onClick={fetchNotifications} loading={loading}>Làm mới</Button>
           <Button type="primary" icon={<CheckCircle size={16} />} onClick={handleAllRead}>Đọc tất cả</Button>
        </Space>
      </div>

      <Card className="glass-card">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            { key: 'all', label: 'Tất cả' },
            { key: 'unread', label: 'Chưa đọc' },
            { key: 'read', label: 'Đã đọc' }
          ]}
        />

        <List
          loading={loading}
          dataSource={notifications}
          locale={{ 
            emptyText: (
              <div style={{ padding: '60px 0', opacity: 0.4 }}>
                <Empty description="Bạn chưa có thông báo nào" />
              </div>
            ) 
          }}
          renderItem={(item) => (
            <List.Item
              onClick={() => handleAction(item)}
              style={{
                cursor: 'pointer',
                padding: '20px',
                borderRadius: '16px',
                marginBottom: '16px',
                background: item.is_read ? 'rgba(255,255,255,0.01)' : 'rgba(59, 130, 246, 0.04)',
                border: '1px solid',
                borderColor: item.is_read ? 'rgba(255,255,255,0.05)' : 'rgba(59, 130, 246, 0.15)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'block',
                position: 'relative',
                overflow: 'hidden'
              }}
              className="noti-list-item"
            >
              {!item.is_read && <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: 'var(--primary-color)' }} />}
              
              <div className="noti-flex-container">
                <div className="noti-icon-box" style={{ background: item.is_read ? '#f1f5f9' : '#eff6ff' }}>
                  {getIcon(item.type)}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="noti-header-row">
                <Title level={5} className="noti-title-text" style={{ margin: 0, color: item.is_read ? '#64748b' : '#0f172a', letterSpacing: '0.3px', fontWeight: 'bold' }}>
                  {item.title}
                </Title>
              </div>
              <div 
                className="noti-badge" 
                style={{ 
                  background: item.is_read ? '#f1f1f7' : 'var(--primary-color)',
                  color: item.is_read ? '#64748b' : 'white'
                }}
              >
                {item.is_read ? 'Đã đọc' : 'Mới'}
              </div>
            </div>
            <div className="noti-content-body">
              <Text className="noti-message-text" style={{ display: 'block', margin: '8px 0 16px 0', fontSize: 13, color: item.is_read ? '#64748b' : '#334155', lineHeight: 1.6, fontWeight: 500 }}>
                {item.message}
              </Text>
                  
                  <div className="noti-footer-row">
                    <Space size="middle" wrap>
                        <Tag 
                          style={{ margin: 0, borderRadius: 6, border: 'none', padding: '2px 8px' }} 
                          color={item.type === 'RETAIL_SALE' ? 'green' : item.type === 'WHOLESALE_SALE' ? 'blue' : item.type === 'PURCHASE' ? 'orange' : 'purple'}
                        >
                            {item.type}
                        </Tag>
                        {item.Warehouse && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                             <MailOpen size={14} opacity={0.4} />
                             <Text style={{ fontSize: 11, opacity: 0.6 }}>{item.Warehouse.warehouse_name}</Text>
                          </div>
                        )}
                    </Space>
                    
                    {item.link && (
                        <Button 
                          type="primary" 
                          size="small" 
                          ghost 
                          icon={<ArrowRight size={14} />} 
                          style={{ borderRadius: 6, fontSize: 11, height: 28 }}
                        >
                            Xử lý ngay
                        </Button>
                    )}
                  </div>
                </div>
              </div>
            </List.Item>
          )}
        />
      </Card>

      <style>{`
        .noti-list-item {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .ant-table-thead > tr > th { background: #f1f5fb !important; color: #0f172a !important; border-bottom: 1px solid var(--border-color) !important; font-weight: 700 !important; }
        .ant-table-cell { border-bottom: 1px solid #cbd5e1 !important; color: #000000 !important; font-weight: 600; }
        .noti-list-item:hover {
          background: #ffffff !important;
          border-color: var(--primary-color) !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
        }
        .noti-flex-container {
            display: flex; gap: 20px; align-items: flex-start;
        }
        .noti-icon-box {
            width: 48px; height: 48px; border-radius: 12px; display: flex; justify-content: center; align-items: center; flex-shrink: 0; margin-top: 2px;
        }
        .noti-header-row {
            display: flex; justify-content: space-between; align-items: center; gap: 12px;
        }
        .noti-footer-row {
            display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
        }

        @media (max-width: 768px) {
            .noti-flex-container {
                gap: 12px;
            }
            .noti-icon-box {
                width: 40px; height: 40px;
            }
            .noti-header-row {
                flex-direction: column;
                align-items: flex-start;
                gap: 4px;
            }
            .noti-time-text {
                margin-bottom: 4px;
            }
            .noti-footer-row {
                margin-top: 10px;
            }
        }
      `}</style>
    </div>
  );
};

export default NotificationPage;
