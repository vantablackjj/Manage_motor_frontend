import React from 'react';
import dayjs from 'dayjs';
import { numberToVietnameseWords } from '../utils/printHelper';

const PrintPartSale = ({ sale, items, warehouse, title }) => {
  if (!sale) return null;

  const subtotal = (items || []).reduce((sum, i) => sum + Number(i.total_price || 0), 0);
  const vatAmount = (subtotal * (sale.vat_percent || 0)) / 100;
  const finalTotal = subtotal + vatAmount;

  const cellStyle = { border: '1px solid #000', padding: '5px 8px', fontSize: '13px' };
  const headerCellStyle = { ...cellStyle, fontWeight: 'bold', textAlign: 'center', background: '#f2f2f2' };

  return (
    <div id="print-part-sale-receipt" style={{ 
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
              <div style={{ marginBottom: '8px' }}>
                <img src="/honda-logo.png" style={{ width: '80px', height: 'auto' }} alt="Honda" />
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>HỆ THỐNG XE MÁY THANH HẢI</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {warehouse?.warehouse_name ? `Kho: ${warehouse.warehouse_name}` : 'Chi nhánh: ......................'}
              </div>
              <div style={{ fontSize: '12px' }}>
                Địa chỉ: {[warehouse?.address, warehouse?.location].filter(Boolean).join(', ') || '............................................................'}
              </div>
              <div style={{ fontSize: '12px' }}>
                Điện thoại: {warehouse?.phone || '......................'} {warehouse?.mobile ? ` - ${warehouse.mobile}` : ''}
              </div>
            </td>
            <td style={{ width: '40%', textAlign: 'right', verticalAlign: 'top' }}>
              <div style={{ fontWeight: 'bold', fontSize: '18px' }}>
                {title || (sale.sale_type === 'Wholesale' ? 'HÓA ĐƠN BÁN BUÔN PHỤ TÙNG' : 'HÓA ĐƠN BÁN LẺ PHỤ TÙNG')}
              </div>
              <div style={{ fontSize: '13px' }}>Số: <strong>{sale.id?.slice(0, 8)?.toUpperCase()}</strong></div>
              <div style={{ fontSize: '13px' }}>Ngày: {dayjs(sale.sale_date).format('DD/MM/YYYY')}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <div>Khách hàng: <strong>{sale.customer_name || '...........................................'}</strong></div>
          <div>Số điện thoại: {sale.customer_phone || '......................'}</div>
          <div>Địa chỉ: {sale.customer_address || '............................................................'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Kho xuất: <strong>{warehouse?.warehouse_name || '......................'}</strong></div>
          <div>Người bán: {sale.creator?.full_name || '......................'}</div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: '40px' }}>STT</th>
            <th style={{ ...headerCellStyle, width: '130px' }}>Mã phụ tùng</th>
            <th style={headerCellStyle}>Tên phụ tùng</th>
            <th style={{ ...headerCellStyle, width: '60px' }}>ĐVT</th>
            <th style={{ ...headerCellStyle, width: '50px' }}>SL</th>
            <th style={{ ...headerCellStyle, width: '110px' }}>Đơn giá</th>
            <th style={{ ...headerCellStyle, width: '120px' }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).map((item, idx) => (
            <tr key={idx}>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
              <td style={cellStyle}>{item.Part?.code || item.part_code || item.code}</td>
              <td style={cellStyle}>{item.Part?.name || item.name}</td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{item.Part?.unit || item.unit}</td>
              <td style={{ ...cellStyle, textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{Number(item.unit_price).toLocaleString()}</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{Number(item.total_price).toLocaleString()}</td>
            </tr>
          ))}
          {/* Fill extra space */}
          {Array.from({ length: Math.max(0, 8 - (items?.length || 0)) }).map((_, i) => (
            <tr key={`pad-${i}`}>
              <td style={{ ...cellStyle, height: '22px' }}></td>
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
            <td colSpan="6" style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>Cộng tiền hàng:</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{subtotal.toLocaleString()}</td>
          </tr>
          {sale.vat_percent > 0 && (
            <tr>
              <td colSpan="6" style={{ ...cellStyle, textAlign: 'right' }}>Thuế suất GTGT ({sale.vat_percent}%):</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{vatAmount.toLocaleString()}</td>
            </tr>
          )}
          <tr>
            <td colSpan="6" style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>TỔNG CỘNG THANH TOÁN:</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '15px', color: '#d32f2f' }}>{finalTotal.toLocaleString()} đ</td>
          </tr>
        </tfoot>
      </table>

      <div style={{ fontStyle: 'italic', marginBottom: '40px' }}>
        Số tiền bằng chữ: <strong>{numberToVietnameseWords(finalTotal)}</strong>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
        <div style={{ width: '30%' }}>
          <div style={{ fontWeight: 'bold' }}>NGƯỜI MUA HÀNG</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
          <div style={{ marginTop: '70px', fontWeight: 'bold' }}>{sale.customer_name || ''}</div>
        </div>
        <div style={{ width: '30%' }}>
          <div style={{ fontWeight: 'bold' }}>NGƯỜI BÁN HÀNG</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
          <div style={{ marginTop: '70px', fontWeight: 'bold' }}>{sale.creator?.full_name || ''}</div>
        </div>
        <div style={{ width: '30%' }}>
          <div style={{ fontWeight: 'bold' }}>THỦ KHO</div>
          <div style={{ fontSize: '11px', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
          <div style={{ marginTop: '70px' }}>..........................................</div>
        </div>
      </div>
      
      <div style={{ marginTop: '50px', fontSize: '11px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
        Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ của chúng tôi!
      </div>
    </div>
  );
};

export default PrintPartSale;
