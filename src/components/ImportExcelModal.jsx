import React, { useState } from 'react';
import { Modal, Upload, Button, message, Space, Typography, Table } from 'antd';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, HelpCircle, RotateCcw, Download } from 'lucide-react';
import api from '../utils/api';
import { exportToExcel } from '../utils/excelExport';

const { Dragger } = Upload;
const { Text, Title } = Typography;

const ImportExcelModal = ({ visible, onCancel, onSuccess, type, title }) => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

  const handleDownloadTemplate = async () => {
    try {
      message.loading('Đang khởi tạo file mẫu với dữ liệu thực tế...', 1.5);
      const response = await api.get(`/import/template?type=${type}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Mau_Import_${type}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      message.error('Lỗi khi tải file mẫu từ máy chủ.');
    }
  };

  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn file Excel!');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileList[0]);
    formData.append('type', type);

    setUploading(true);
    try {
      const response = await api.post('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success(response.data.message);
      setResults(response.data.results);
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error('Lỗi khi import: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([file]);
      return false;
    },
    fileList,
    accept: ".xlsx, .xls",
    maxCount: 1
  };

  const templateColumns = {
    colors: ['Tên màu'],
    types: ['Tên loại xe', 'Phân loại', 'Tiền tố khung', 'Tiền tố máy'],
    customers: ['Mã khách', 'Tên khách', 'Địa chỉ', 'Hình thức TT'],
    suppliers: ['Tên NCC', 'Địa chỉ', 'Ghi chú', 'Hình thức TT'],
    purchases: ['Số máy', 'Số khung', 'Loại xe', 'Màu sắc', 'Giá nhập', 'Tên NCC', 'Tên kho', 'Ngày nhập'],
    retail_sales: ['Ngày bán', 'Số máy', 'Tên khách', 'Số điện thoại', 'Địa chỉ', 'Giá bán', 'Tiền khách trả', 'Tên kho', 'Phát sổ bảo hành'],
    wholesale_sales: ['Ngày bán', 'Số máy', 'Mã khách hàng', 'Giá bán lẻ', 'Đã trả', 'Tên kho'],
    part_master: ['Mã phụ tùng', 'Tên phụ tùng', 'Đơn vị tính', 'Giá nhập', 'Giá bán'],
    part_inventory: ['Mã phụ tùng', 'Số lượng tồn', 'Kho', 'Vị trí']
  };

  const getBadgeColor = (type) => {
    const colors = [
      { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' }, // Blue
      { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }, // Green
      { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' }, // Red
      { bg: '#fff7ed', text: '#ea580c', border: '#ffedd5' }, // Orange
      { bg: '#faf5ff', text: '#9333ea', border: '#e9d5ff' }, // Purple
      { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' }, // Pink
      { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' }, // Sky
      { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' }, // Violet
    ];
    const index = Math.abs(type.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
    return colors[index];
  };

  return (
    <Modal
      title={
        <Space>
          <FileSpreadsheet size={18} color="var(--primary-color)" />
          <span style={{ color: 'white' }}>{title || 'Nhập dữ liệu từ Excel'}</span>
        </Space>
      }
      open={visible}
      onCancel={() => {
        setFileList([]);
        setResults(null);
        onCancel();
      }}
      footer={[
        <Button key="cancel" onClick={onCancel}>Đóng</Button>,
        !results && (
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleUpload} 
            loading={uploading}
            disabled={fileList.length === 0}
            style={{ 
              background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
              border: 'none',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            Bắt đầu tải lên
          </Button>
        )
      ]}
      width={600}
      centered
      styles={{
        mask: { backdropFilter: 'blur(4px)' },
        content: { 
          background: '#1c1c21', 
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)' 
        },
        header: { background: 'transparent', borderBottom: '1px solid var(--border-color)', paddingBottom: 15 },
        body: { padding: '24px 20px' }
      }}
    >
      {!results ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="template-info" style={{ 
            padding: '16px 20px', 
            background: 'rgba(59, 130, 246, 0.05)', 
            borderRadius: 12, 
            border: '1px solid rgba(59, 130, 246, 0.2)',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.1)'
          }}>
             <Space direction="vertical" style={{ width: '100%' }} size={12}>
                <Space>
                    <HelpCircle size={18} color="#3b82f6" />
                    <Text strong style={{ color: 'white', fontSize: 15 }}>Hướng dẫn định dạng file Excel:</Text>
                </Space>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: 13, display: 'block' }}>
                        File của bạn cần có các cột tiêu đề sau (chính xác tên):
                    </Text>
                    <Button 
                        size="small" 
                        type="link" 
                        icon={<Download size={14} />} 
                        onClick={handleDownloadTemplate}
                        style={{ color: '#3b82f6', padding: 0 }}
                    >
                        Tải file mẫu
                    </Button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {(templateColumns[type] || []).map(col => {
                        return (
                          <span 
                            key={col} 
                            style={{ 
                              background: 'rgba(255, 255, 255, 0.05)', 
                              color: 'white', 
                              padding: '5px 12px', 
                              borderRadius: 6, 
                              fontSize: 12,
                              fontWeight: 500,
                              border: `1px solid rgba(255, 255, 255, 0.1)`,
                              display: 'inline-block'
                            }}
                          >
                            {col}
                          </span>
                        );
                    })}
                </div>
             </Space>
          </div>

          <div style={{ marginTop: 8 }}>
            <Dragger {...uploadProps} style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '2px dashed var(--border-color)',
                borderRadius: 12,
                padding: '30px 0'
            }}>
                <p className="ant-upload-drag-icon">
                <UploadCloud size={48} style={{ margin: '0 auto', color: '#3b82f6', opacity: 0.8 }} />
                </p>
                <p className="ant-upload-text" style={{ color: 'white', fontSize: 15, fontWeight: 500 }}>
                    Kéo thả file Excel vào đây hoặc nhấp để chọn
                </p>
                <p className="ant-upload-hint" style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                    Chỉ hỗ trợ file .xlsx hoặc .xls (Tối đa 1 file)
                </p>
            </Dragger>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
           <div style={{ marginBottom: 24, padding: 24, background: 'rgba(255,255,255,0.02)', borderRadius: 16 }}>
                {results.failed === 0 ? (
                    <div style={{ marginBottom: 16 }}>
                        <CheckCircle2 size={56} color="#10b981" style={{ margin: '0 auto' }} />
                        <Title level={4} style={{ color: 'white', marginTop: 16 }}>Import thành công!</Title>
                    </div>
                ) : (
                    <div style={{ marginBottom: 16 }}>
                        <AlertCircle size={56} color="#f59e0b" style={{ margin: '0 auto' }} />
                        <Title level={4} style={{ color: 'white', marginTop: 16 }}>Hoàn tất với một số lỗi</Title>
                    </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 20 }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981' }}>{results.success}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Thành công</Text>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ef4444' }}>{results.failed}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>Thất bại</Text>
                    </div>
                </div>
           </div>
           
           {results.errors.length > 0 && (
               <div style={{ textAlign: 'left', marginTop: 20 }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <AlertCircle size={16} color="#ef4444" />
                        <Text strong style={{ color: 'white' }}>Chi tiết các dòng lỗi:</Text>
                   </div>
                   <div style={{ 
                        maxHeight: 200, 
                        overflowY: 'auto', 
                        padding: 12, 
                        background: 'rgba(239, 68, 68, 0.05)', 
                        borderRadius: 8,
                        border: '1px solid rgba(239, 68, 68, 0.1)'
                    }}>
                       <ul style={{ paddingLeft: 20, margin: 0, fontSize: 13, color: '#fca5a5' }}>
                           {results.errors.slice(0, 50).map((err, idx) => <li key={idx} style={{ marginBottom: 4 }}>{err}</li>)}
                           {results.errors.length > 50 && <li style={{ opacity: 0.7, fontStyle: 'italic' }}>...và {results.errors.length - 50} lỗi khác</li>}
                       </ul>
                   </div>
               </div>
           )}
           
           <Button 
                type="primary" 
                ghost 
                icon={<RotateCcw size={16} />} 
                onClick={() => { setResults(null); setFileList([]); }} 
                style={{ marginTop: 32, borderRadius: 8 }}
            >
               Tải file khác
           </Button>
        </div>
      )}
    </Modal>
  );
};

export default ImportExcelModal;
