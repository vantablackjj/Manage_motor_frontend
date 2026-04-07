import React, { useState, useEffect } from 'react';
import { Layout, Menu, Breadcrumb, Drawer, Button, Badge, Dropdown, Card, Space, Typography, notification, Avatar, Tag } from 'antd';

import { io } from "socket.io-client";




import { 
  PlusSquare, 
  ShoppingCart, 
  Truck, 
  Wallet, 
  Settings, 
  LogOut, 
  UserPlus, 
  ClipboardList,
  Layers,
  ArrowRightLeft,
  Users,
  Menu as MenuIcon,
  X,
  Bell,
  Mail,
  User,
  Clock as ClockIcon,
  History,
  LayoutDashboard
} from 'lucide-react';




import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const MainLayout = ({ children }) => {
  const navigate = useNavigate();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

  const location = useLocation();

  useEffect(() => {
    fetchNotifications();
    
    // Kết nối Socket.io
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    const socketUrl = apiUrl.replace('/api', ''); // Lấy domain gốc, bỏ đuôi /api
    const socket = io(socketUrl); // URL Backend linh hoạt
    
    socket.on("connect", () => {
      console.log("Connected to Real-time server");
      socket.emit("join_room", user.id);
      if (user.warehouse_id) {
          socket.emit("join_warehouse", user.warehouse_id);
      }
      if (isAdmin) {
          socket.emit("join_admins");
      }
    });

    socket.on("notification_new", (noti) => {
      setNotifications(prev => [noti, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Hiển thị Popup Toast
      notification.info({
        message: noti.title,
        description: noti.message,
        placement: 'bottomRight',
        duration: 5,
        onClick: () => {
          if (noti.link) {
            navigate(noti.link);
          }
        },
        style: { cursor: 'pointer' }
      });

      // Phát âm thanh chuông nếu trình duyệt cho phép
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play();
      } catch (e) {}
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.list || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (e) {
      console.error('Failed to fetch notifications');
    }
  };

  const handleNotificationClick = async (noti) => {
    try {
      if (!noti.is_read) {
        await api.put(`/notifications/${noti.id}/read`);
        // Cập nhật state local ngay để mượt mà
        setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Điều hướng tới link xử lý
      if (noti.link) {
        navigate(noti.link);
      }
    } catch (e) {
      console.error("Lỗi xử lý thông báo", e);
    }
  };

  const notificationMenu = (
    <Card 
      title={<Space><Bell size={18} /> Thông báo công việc</Space>} 
      size="small" 
      style={{ width: 350, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', background: '#1f1f1f' }}
      styles={{ body: { padding: '0 12px' } }}
    >
      <div style={{ maxHeight: 400, overflowY: 'auto', padding: '10px 0' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, opacity: 0.5 }}>Không có thông báo mới</div>
        ) : (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => handleNotificationClick(n)}
              className="notification-item"
              style={{ 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 8, 
                background: n.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                cursor: 'pointer',
                borderLeft: n.is_read ? '2px solid transparent' : '2px solid var(--primary-color)',
                transition: 'all 0.3s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text strong style={{ fontSize: 13, color: n.is_read ? 'rgba(255,255,255,0.5)' : 'white' }}>{n.title}</Text>
                <Text style={{ fontSize: 10, opacity: 0.5 }}>{dayjs(n.createdAt).fromNow()}</Text>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, color: 'rgba(255,255,255,0.9)' }}>{n.message}</div>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {n.Warehouse && <Tag size="small" color="blue" style={{ fontSize: 9, margin: 0, height: 18, lineHeight: '16px', background: 'rgba(59, 130, 246, 0.1)', border: 'none' }}>{n.Warehouse.warehouse_name}</Tag>}
                    {n.creator && <Text style={{ fontSize: 10, opacity: 0.5 }}>bởi {n.creator.full_name}</Text>}
                 </div>
                 {!n.is_read && <div style={{ fontSize: 10, color: 'var(--primary-color)', fontWeight: 'bold' }}>Xử lý &raquo;</div>}
              </div>

            </div>
          ))
        )}
      </div>
      <div style={{ padding: '8px 4px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <Button 
          type="link" 
          size="small" 
          onClick={async () => {
            await api.put('/notifications/all/read');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
          }}
        >
          Đánh dấu tất cả đã đọc
        </Button>
        <Button 
          type="primary" 
          size="small" 
          ghost
          onClick={() => {
            navigate('/notifications');
          }}
          style={{ marginLeft: 8 }}
        >
          Xem tất cả
        </Button>
      </div>

      <style>{`
        .notification-item:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          transform: translateX(5px);
        }
      `}</style>
    </Card>
  );
  
  const userMenuItems = {
    items: [
      {
        key: 'profile',
        label: (
          <div style={{ padding: '4px 8px' }}>
            <div style={{ fontWeight: 'bold' }}>{user.full_name}</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{user.role}</div>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogOut size={16} />,
        label: 'Đăng xuất',
        danger: true,
        onClick: () => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    ]
  };


  const menuItems = [
    isAdmin && {
      key: '/dashboard',
      icon: <LayoutDashboard size={18} />,
      label: <Link to="/dashboard">Bảng điều khiển (Admin)</Link>
    },
    {
      key: 'input-data',
      icon: <PlusSquare size={18} />,
      label: 'Nhập dữ liệu chung',
      children: [
        { key: '/retail', label: <Link to="/retail">Nhập xe bán lẻ</Link> },
        { key: '/wholesale', label: <Link to="/wholesale">Nhập xe bán buôn & trả tiền</Link> },
        { key: '/purchase', label: <Link to="/purchase">Nhập xe mua về & trả tiền</Link> },
        isAdmin && { key: '/expenses', label: <Link to="/expenses">Nhập chi tiêu</Link> },
        { key: '/vehicle-colors', label: <Link to="/vehicle-colors">Đăng ký màu xe</Link> },
        { key: '/vehicle-types', label: <Link to="/vehicle-types">Đăng ký loại xe</Link> },
        { key: '/suppliers', label: <Link to="/suppliers">Nhập chủ hàng</Link> },
        { key: '/wholesale-customers', label: <Link to="/wholesale-customers">Nhập mã khách buôn</Link> },
        { key: '/transfers', label: <Link to="/transfers">Chuyển kho chi nhánh</Link> },
      ],
    },

    {
      key: 'reports',
      icon: <History size={18} />,
      label: 'Xem thông tin tổng hợp',
      children: [
        { key: '/vehicle-search', label: <Link to="/vehicle-search">Tìm xe theo yêu cầu</Link> },
        { 
          key: 'sales-info', 
          label: 'Xem thông tin bán xe', 
          children: [
            { key: '/report/sales-retail', label: <Link to="/report/sales-retail">Xe bán lẻ</Link> },
            { key: '/report/sales-wholesale', label: <Link to="/report/sales-wholesale">Xe bán buôn</Link> },
            { key: '/report/wholesale-audit', label: <Link to="/report/wholesale-audit">Đối soát khách buôn</Link> },
          ]
        },
        { key: '/report/purchases', label: <Link to="/report/purchases">Xem thông tin mua xe</Link> },
        { key: '/inventory-report', label: <Link to="/inventory-report">Xem xe tồn</Link> },
        { key: '/report/warranty', label: <Link to="/report/warranty">Danh sách xe bảo hành</Link> },
        { key: '/report/daily', label: <Link to="/report/daily">Báo cáo cuối ngày</Link> },
      ],
    },

    {
      key: 'admin-area',
      icon: <Users size={18} />,
      label: isAdmin ? 'Quản trị & Phân quyền' : 'Danh mục nhân sự & Kho',
      children: [
        isAdmin && { key: '/employees', label: <Link to="/employees">Quản lý nhân viên</Link> },
        { key: '/warehouses', label: <Link to="/warehouses">{isAdmin ? 'Quản lý kho' : 'Xem danh sách kho'}</Link> },
      ].filter(Boolean),
    },
  ].filter(Boolean);



  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        width={260}
        theme="dark"
        className="desktop-sider"
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
      >

        <div style={{ height: 64, margin: '16px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 40, width: 40, height: 40, background: 'var(--primary-color)', borderRadius: 8, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Truck color="white" size={24} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 'bold' }} className="gradient-text">QUẢN LÝ XE MÁY</span>

        </div>
        <Menu 
          theme="dark" 
          defaultOpenKeys={['input-data']}
          selectedKeys={[location.pathname]} 
          mode="inline" 
          items={menuItems} 
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 24px', 
          background: 'rgba(24, 24, 27, 0.4)', 
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button 
                type="text" 
                icon={<MenuIcon color="white" />} 
                className="mobile-only-btn"
                onClick={() => setDrawerVisible(true)}
              />
              <style>{`
                @media (min-width: 992px) {
                  .mobile-only-btn { display: none !important; }
                }
                @media (max-width: 768px) {
                  .desktop-only { display: none !important; }
                  .ant-layout-header { padding: 0 12px !important; }
                  .ant-layout-sider-trigger { display: none !important; }
                }
              `}</style>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isAdmin && (
              <Dropdown dropdownRender={() => notificationMenu} trigger={['click']} placement="bottomRight" overlayClassName="glass-dropdown">
                <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Badge count={unreadCount} size="small" offset={[-2, 6]}>
                    <Button type="text" shape="circle" icon={<Bell size={22} color={unreadCount > 0 ? 'var(--primary-color)' : 'white'} />} />
                  </Badge>
                </span>
              </Dropdown>
            )}

            <Dropdown menu={userMenuItems} trigger={['click']} placement="bottomRight">
              <Space style={{ 
                cursor: 'pointer', 
                padding: '6px 12px', 
                borderRadius: '10px', 
                transition: 'all 0.3s',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)'
              }} className="user-dropdown-trigger">
                <Avatar 
                  style={{ backgroundColor: 'var(--primary-color)', boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)' }} 
                  icon={<User size={18} />} 
                />
                <div style={{ lineHeight: 1.2 }} className="desktop-only">
                    <div style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{user.full_name}</div>
                    <div style={{ color: 'var(--primary-color)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{user.role}</div>
                </div>
              </Space>
            </Dropdown>
            
            <style>{`
                .user-dropdown-trigger:hover {
                    background: rgba(255,255,255,0.05);
                }
            `}</style>
          </div>
        </Header>
        <Drawer
          title={<span className="gradient-text">QUẢN LÝ XE MÁY</span>}
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={280}
          styles={{ body: { padding: 0, background: '#09090b' }, header: { background: '#09090b', borderBottom: '1px solid var(--border-color)' } }}
        >
          <Menu 
            theme="dark" 
            mode="inline" 
            selectedKeys={[location.pathname]} 
            items={menuItems} 
            onClick={() => setDrawerVisible(false)}
          />
        </Drawer>
        <Content className="main-content-area">
          <div className="glass-card main-card-container">
            {children}
          </div>
        </Content>
        <style>{`
            .main-content-area {
                margin: 16px;
                min-height: 280px;
                color: var(--text-primary);
            }
            .main-card-container {
                padding: 24px;
                min-height: calc(100vh - 160px);
            }
            @media (max-width: 768px) {
                .main-content-area {
                    margin: 8px !important;
                    padding: 4px !important;
                }
                .main-card-container {
                    padding: 16px !important;
                    min-height: calc(100vh - 120px) !important;
                }
            }
        `}</style>

      </Layout>
    </Layout>
  );
};

export default MainLayout;

