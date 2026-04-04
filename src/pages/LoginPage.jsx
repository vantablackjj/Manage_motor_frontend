import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { User, Lock, LogIn, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const { Title, Text } = Typography;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', values);
      const { token, user } = response.data;

      // Lưu trữ phiên đăng nhập vào máy tính
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      message.success('Đăng nhập thành công! Chào mừng bạn, ' + (user.full_name || user.username));
      
      // Chuyển về trang chủ hệ thống
      navigate('/');
      window.location.reload(); // Làm mới để cập nhật menu/quyền
    } catch (error) {
      const msg = error.response?.data?.message || 'Lỗi kết nối Server!';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      background: 'linear-gradient(135deg, #09090b 0%, #18181b 100%)',
      overflow: 'hidden'
    }}>
      {/* Hiệu ứng nền mờ ảo */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'var(--primary-color)',
        filter: 'blur(100px)',
        opacity: 0.1,
        top: '10%',
        left: '20%'
      }}></div>

      <Card 
        className="glass-card"
        style={{ 
          width: 400, 
          padding: '24px 10px', 
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ 
            background: 'var(--primary-color)', 
            display: 'inline-flex', 
            padding: 12, 
            borderRadius: 16,
            marginBottom: 16,
            color: 'white'
          }}>
            <ShieldAlert size={32} />
          </div>
          <Title level={2} style={{ margin: 0, color: 'white' }}>CỬA HÀNG XE MÁY</Title>
          <Text type="secondary">Phần mềm quản trị & bán hàng chuyên dụng</Text>
        </div>

        <Form
          layout="vertical"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item
            label="Tên đăng nhập"
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
          >
            <Input 
              prefix={<User size={18} style={{ opacity: 0.5 }} />} 
              size="large" 
              placeholder="admin / nhân viên..."
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password 
              prefix={<Lock size={18} style={{ opacity: 0.5 }} />} 
              size="large"
              placeholder="••••••••"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              block 
              loading={loading}
              icon={<LogIn size={18} />}
              style={{ height: 48, fontWeight: 'bold' }}
            >
              ĐĂNG NHẬP HỆ THỐNG
            </Button>
          </Form.Item>
        </Form>
        
        <div style={{ textAlign: 'center', marginTop: 16 }}>
           <Text type="secondary" style={{ fontSize: 12 }}>
             Hệ thống bảo mật bởi Antigravity AI © 2026
           </Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
