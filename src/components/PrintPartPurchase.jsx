import React from 'react';
import dayjs from 'dayjs';
import { numberToVietnameseWords } from '../utils/printHelper';

const PrintPartPurchase = ({ purchase, items, warehouse }) => {
  if (!purchase) return null;

  const subtotal = (items || []).reduce((sum, i) => sum + Number(i.total_price || 0), 0);
  const finalTotal = subtotal; // Assuming no VAT shown on internal receipt, or handled in total_price

  const cellStyle = { border: '1px solid #000', padding: '5px 8px', fontSize: '13px' };
  const headerCellStyle = { ...cellStyle, fontWeight: 'bold', textAlign: 'center', background: '#f2f2f2' };

  return (
    <div id="print-part-purchase-receipt" style={{ 
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
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>HỆ THỐNG CỬA HÀNG XE MÁY THANH HẢI</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Địa chỉ: {warehouse?.address || '............................................................'}</div>
              <div style={{ fontSize: '13px' }}>Điện thoại: {warehouse?.phone || '......................'} {warehouse?.mobile ? ` - ${warehouse.mobile}` : ''}</div>
            </td>
            <td style={{ width: '50%', textAlign: 'right', verticalAlign: 'top' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>PHIẾU NHẬP KHO PHỤ TÙNG</div>
              <div style={{ fontSize: '13px' }}>Số CT: {purchase.id}</div>
              {purchase.invoice_no && <div style={{ fontSize: '13px' }}>HĐ số: {purchase.invoice_no}</div>}
              <div style={{ fontSize: '13px' }}>Ngày nhập: {dayjs(purchase.purchase_date).format('DD/MM/YYYY')}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginBottom: '20px' }}>
        <div>Nhà cung cấp: <strong>{purchase.Supplier?.name || '............................................................'}</strong></div>
        <div>Kho nhập: <strong>{purchase.Warehouse?.warehouse_name || warehouse?.warehouse_name || '......................'}</strong></div>
        <div>Ghi chú: {purchase.notes || '............................................................'}</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: '40px' }}>STT</th>
            <th style={{ ...headerCellStyle, width: '150px' }}>Mã phụ tùng</th>
            <th style={headerCellStyle}>Tên phụ tùng</th>
            <th style={{ ...headerCellStyle, width: '80px' }}>ĐVT</th>
            <th style={{ ...headerCellStyle, width: '60px' }}>SL</th>
            <th style={{ ...headerCellStyle, width: '120px' }}>Đơn giá</th>
            <th style={{ ...headerCellStyle, width: '140px' }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).map((item, idx) => (
            <tr key={idx}>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
              <td style={cellStyle}>{item.Part?.code || item.part_code}</td>
              <td style={cellStyle}>{item.Part?.name || item.name}</td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{item.unit || item.Part?.unit}</td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{Number(item.unit_price).toLocaleString()}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{Number(item.total_price).toLocaleString()}</td>
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
              <td style={cellStyle}></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="6" style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>TỔNG CỘNG TIỀN NHẬP:</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{finalTotal.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ fontStyle: 'italic', marginBottom: '30px' }}>
        Số tiền bằng chữ: <strong>{numberToVietnameseWords(finalTotal)}</strong>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
        <div style={{ width: '25%' }}>
          <div style={{ fontWeight: 'bold' }}>NGƯỜI LẬP PHIẾU</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
        </div>
        <div style={{ width: '25%' }}>
          <div style={{ fontWeight: 'bold' }}>NGƯỜI GIAO HÀNG</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
        </div>
        <div style={{ width: '25%' }}>
          <div style={{ fontWeight: 'bold' }}>THỦ KHO</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
        </div>
        <div style={{ width: '25%' }}>
          <div style={{ fontWeight: 'bold' }}>KẾ TOÁN TRƯỞNG</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
        </div>
      </div>
    </div>
  );
};

export default PrintPartPurchase;
