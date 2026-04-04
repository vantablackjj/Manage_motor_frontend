import React, { useState } from 'react';
import { Modal, Upload, Button, message, Space, Typography, Table } from 'antd';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import api from '../utils/api';

const { Dragger } = Upload;
const { Text, Title } = Typography;

const ImportExcelModal = ({ visible, onCancel, onSuccess, type, title }) => {
  const [fileList, setFileList] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);

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
    colors: ['color_name'],
    types: ['name', 'type', 'chassis_prefix', 'engine_prefix'],
    customers: ['customer_code', 'name', 'address', 'payment_type'],
    suppliers: ['name', 'address', 'notes', 'payment_type'],
    purchases: ['engine_no', 'chassis_no', 'type_name', 'color_name', 'price_vnd', 'supplier_name', 'warehouse_name', 'purchase_date'],
    retail_sales: ['sale_date', 'engine_no', 'customer_name', 'phone', 'address', 'sale_price', 'paid_amount', 'warehouse_name'],
    wholesale_sales: ['sale_date', 'engine_no', 'customer_code', 'sale_price_vnd', 'paid_amount_vnd', 'warehouse_name']
  };

  return (
    <Modal
      title={
        <Space>
          <FileSpreadsheet size={18} />
          <span>{title || 'Nhập dữ liệu từ Excel'}</span>
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
          >
            Bắt đầu tải lên
          </Button>
        )
      ]}
      width={600}
    >
      {!results ? (
        <div style={{ padding: '10px 0' }}>
          <div className="template-info" style={{ marginBottom: 20, padding: 15, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
             <Space direction="vertical" style={{ width: '100%' }}>
                <Space><HelpCircle size={16} color="#3b82f6" /><Text strong>Hướng dẫn định dạng file Excel:</Text></Space>
                <Text size="small" type="secondary">File của bạn cần có các cột tiêu đề sau (chính xác tên):</Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 5 }}>
                    {(templateColumns[type] || []).map(col => (
                        <code key={col} style={{ background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{col}</code>
                    ))}
                </div>
             </Space>
          </div>

          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <UploadCloud size={48} style={{ margin: '0 auto', color: '#94a3b8' }} />
            </p>
            <p className="ant-upload-text">Kéo thả file Excel vào đây hoặc nhấp để chọn</p>
            <p className="ant-upload-hint">Chỉ hỗ trợ file .xlsx hoặc .xls</p>
          </Dragger>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
           <div style={{ marginBottom: 20 }}>
                {results.failed === 0 ? (
                    <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 10px' }} />
                ) : (
                    <AlertCircle size={48} color="#f59e0b" style={{ margin: '0 auto 10px' }} />
                )}
                <Title level={4}>Kết quả xử lý</Title>
                <Space size="large">
                    <Text type="success">Thành công: <b>{results.success}</b></Text>
                    <Text type="danger">Thất bại: <b>{results.failed}</b></Text>
                </Space>
           </div>
           
           {results.errors.length > 0 && (
               <div style={{ textAlign: 'left', maxHeight: 200, overflowY: 'auto' }}>
                   <Text type="secondary">Chi tiết lỗi:</Text>
                   <ul style={{ paddingLeft: 20, marginTop: 10, fontSize: 13, color: '#ef4444' }}>
                       {results.errors.slice(0, 50).map((err, idx) => <li key={idx}>{err}</li>)}
                       {results.errors.length > 50 && <li>...và {results.errors.length - 50} lỗi khác</li>}
                   </ul>
               </div>
           )}
           
           <Button type="primary" ghost onClick={() => { setResults(null); setFileList([]); }} style={{ marginTop: 20 }}>
               Tải file khác
           </Button>
        </div>
      )}
    </Modal>
  );
};

export default ImportExcelModal;
