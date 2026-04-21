import React from 'react';
import dayjs from 'dayjs';

const PrintPartTransfer = ({ transfer, items }) => {
  if (!transfer) return null;

  const cellStyle = { border: '1px solid #000', padding: '5px 8px', fontSize: '13px' };
  const headerCellStyle = { ...cellStyle, fontWeight: 'bold', textAlign: 'center', background: '#f2f2f2' };

  return (
    <div id="print-part-transfer-receipt" style={{ 
      width: '210mm', 
      padding: '15mm', 
      color: '#000', 
      fontSize: '14px', 
      fontFamily: "'Times New Roman', Times, serif",
      background: '#fff',
      display: 'none'
    }}>
      <table style={{ width: '100%', marginBottom: '20px' }}>
        <tbody>
          <tr>
            <td style={{ width: '60%' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>HỆ THỐNG CỬA HÀNG XE MÁY THANH HẢI</div>
              <div style={{ fontSize: '12px' }}>Bộ phận: Quản lý phụ tùng & linh kiện</div>
            </td>
            <td style={{ width: '40%', textAlign: 'right', verticalAlign: 'top' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>PHIẾU XUẤT KHO KIÊM VẬN CHUYỂN</div>
              <div style={{ fontSize: '13px' }}>Mã phiếu: {transfer.transfer_code}</div>
              <div style={{ fontSize: '13px' }}>Ngày: {dayjs(transfer.createdAt).format('DD/MM/YYYY')}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '40px' }}>
        <div>
            <div>Từ kho xuất: <strong>{transfer.FromWarehouse?.warehouse_name}</strong></div>
            <div>Địa chỉ: {transfer.FromWarehouse?.address || '...................................................'}</div>
        </div>
        <div>
            <div>Đến kho nhận: <strong>{transfer.ToWarehouse?.warehouse_name}</strong></div>
            <div>Địa chỉ: {transfer.ToWarehouse?.address || '...................................................'}</div>
        </div>
      </div>

      <div style={{ marginBottom: '15px' }}>
         Ghi chú: {transfer.notes || '......................................................................................................'}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: '40px' }}>STT</th>
            <th style={{ ...headerCellStyle, width: '150px' }}>Mã phụ tùng</th>
            <th style={headerCellStyle}>Tên phụ tùng</th>
            <th style={{ ...headerCellStyle, width: '80px' }}>ĐVT</th>
            <th style={{ ...headerCellStyle, width: '80px' }}>Số lượng</th>
            <th style={headerCellStyle}>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).map((item, idx) => (
            <tr key={idx}>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
              <td style={cellStyle}>{item.Part?.code}</td>
              <td style={cellStyle}>{item.Part?.name}</td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{item.unit || item.Part?.unit}</td>
              <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
              <td style={cellStyle}></td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 10 - (items?.length || 0)) }).map((_, i) => (
            <tr key={`pad-${i}`}>
              <td style={{ ...cellStyle, height: '25px' }}></td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginTop: '30px' }}>
        <div style={{ width: '20%' }}>
          <div style={{ fontWeight: 'bold' }}>THỦ KHO XUẤT</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
        </div>
        <div style={{ width: '20%' }}>
          <div style={{ fontWeight: 'bold' }}>NGƯỜI VẬN CHUYỂN</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
        </div>
        <div style={{ width: '20%' }}>
          <div style={{ fontWeight: 'bold' }}>THỦ KHO NHẬN</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
        </div>
        <div style={{ width: '20%' }}>
          <div style={{ fontWeight: 'bold' }}>NGƯỜI DUYỆT</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
        </div>
      </div>
    </div>
  );
};

export default PrintPartTransfer;
