import React from 'react';
import dayjs from 'dayjs';

const PrintMaintenanceOrder = ({ order, warehouse, items }) => {
  if (!order) return null;

  const serviceItems = (items || []).filter(i => i.type === 'SERVICE');
  const partItems = (items || []).filter(i => i.type === 'PART');
  const totalLabor = serviceItems.reduce((sum, i) => sum + Number(i.total_price || 0), 0);
  const totalParts = partItems.reduce((sum, i) => sum + Number(i.total_price || 0), 0);
  const grandTotal = totalLabor + totalParts;
  const vatPercent = order.vat_percent || 0;
  const vatAmount = (grandTotal * vatPercent) / 100;
  const finalTotal = grandTotal + vatAmount;

  // Chuyển số thành chữ tiếng Việt
  const numberToVietnameseWords = (num) => {
    if (num === 0) return 'không đồng';
    const units = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const groups = ['', 'nghìn', 'triệu', 'tỷ'];

    const readThreeDigits = (n) => {
      const h = Math.floor(n / 100);
      const t = Math.floor((n % 100) / 10);
      const u = n % 10;
      let result = '';
      if (h > 0) result += units[h] + ' trăm ';
      if (t > 1) result += units[t] + ' mươi ';
      else if (t === 1) result += 'mười ';
      else if (t === 0 && h > 0 && u > 0) result += 'lẻ ';
      if (t > 1 && u === 5) result += 'lăm';
      else if (t > 0 && u === 1 && t !== 1) result += 'mốt';
      else if (u > 0) result += units[u];
      return result.trim();
    };

    let n = Math.round(num);
    const parts = [];
    let groupIdx = 0;
    while (n > 0) {
      const chunk = n % 1000;
      if (chunk > 0) {
        parts.unshift(readThreeDigits(chunk) + ' ' + groups[groupIdx]);
      }
      n = Math.floor(n / 1000);
      groupIdx++;
    }
    return parts.join(' ').trim() + ' đồng';
  };

  // Build unified rows: max of service count and part count to fill the table
  const maxRows = Math.max(serviceItems.length, partItems.length, 8);

  const cellStyle = { border: '1px solid #000', padding: '3px 6px', fontSize: '12px', lineHeight: '1.4' };
  const headerCellStyle = { ...cellStyle, fontWeight: 'bold', textAlign: 'center', background: '#f5f5f5', fontSize: '11px' };

  return (
    <div id="print-maintenance-receipt" style={{ 
      width: '210mm', 
      minHeight: '275mm',
      padding: '8mm 12mm', 
      color: '#000', 
      fontSize: '12px', 
      fontFamily: "'Times New Roman', Times, serif",
      background: '#fff',
      boxSizing: 'border-box'
    }}>
      {/* === HEADER === */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
        <tbody>
          <tr>
            <td style={{ width: '100px', verticalAlign: 'top' }}>
              <div style={{ fontWeight: 'bold', fontSize: '20px', fontFamily: 'Arial, sans-serif', color: '#c00' }}>HONDA</div>
            </td>
            <td style={{ textAlign: 'center', verticalAlign: 'top' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>PHIẾU SỬA CHỮA VÀ BẢO HÀNH</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>HỆ THỐNG XE MÁY THANH HẢI</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>Chi nhánh: {warehouse?.warehouse_name || '......................'}</div>
              <div style={{ fontSize: '11px' }}>Địa chỉ: {warehouse?.address || '............................................................'}</div>
              <div style={{ fontSize: '11px' }}>Điện thoại: {warehouse?.phone || '......................'} {warehouse?.mobile ? ` - ${warehouse.mobile}` : ''}</div>
            </td>
            <td style={{ width: '140px', textAlign: 'right', verticalAlign: 'top', fontSize: '11px' }}>
              <div>Mã HD: <strong>{String(order.id || '').substring(0, 8).toUpperCase()}</strong></div>
              <div>Trang 1 / 1</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* === CUSTOMER INFO === */}
      <div style={{ borderTop: '1.5px solid #000', paddingTop: '6px', marginBottom: '8px', fontSize: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ paddingBottom: '3px' }}>
                Khách hàng: <strong>{(order.customer_name || '').toUpperCase()}</strong>
              </td>
              <td style={{ paddingBottom: '3px' }}>
                ĐT: <strong>{order.customer_phone || ''}</strong>
              </td>
              <td style={{ paddingBottom: '3px' }}>
                Biển số xe: <strong>{order.license_plate || ''}</strong>
              </td>
              <td style={{ paddingBottom: '3px' }}>
                Loại xe: <strong>{order.model_name || ''}</strong>
              </td>
            </tr>
            <tr>
              <td colSpan="2" style={{ paddingBottom: '3px' }}>
                Địa chỉ: {order.customer_address || ''}
              </td>
              <td style={{ paddingBottom: '3px' }}>
                Số khung: {order.chassis_no || ''}
              </td>
              <td style={{ paddingBottom: '3px' }}>
                Số máy: {order.engine_no || ''}
              </td>
            </tr>
            <tr>
              <td colSpan="2" style={{ paddingBottom: '3px' }}>
                Ngày vào xưởng: <strong>{dayjs(order.maintenance_date).format('DD/MM/YYYY')}</strong>
              </td>
              <td colSpan="2" style={{ paddingBottom: '3px' }}>
                Số Km: <strong>{order.km_reading?.toLocaleString() || ''}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* === YÊU CẦU KHÁCH HÀNG === */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, width: '50%' }}>YÊU CẦU KHÁCH HÀNG</th>
            <th style={headerCellStyle}>TÌNH TRẠNG XE TRƯỚC KHI SỬA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...cellStyle, height: '35px', verticalAlign: 'top' }}>{order.notes || ''}</td>
            <td style={{ ...cellStyle, verticalAlign: 'top' }}>{order.km_reading ? `${order.km_reading.toLocaleString()}KM` : ''}</td>
          </tr>
        </tbody>
      </table>

      {/* === MAIN TABLE: CÔNG SỬA CHỮA & PHỤ TÙNG === */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th colSpan="2" style={headerCellStyle}>CÔNG SỬA CHỮA</th>
            <th colSpan="4" style={headerCellStyle}>PHỤ TÙNG THAY THẾ</th>
          </tr>
          <tr>
            <th style={{ ...headerCellStyle, width: '22%' }}>Nội dung sửa chữa</th>
            <th style={{ ...headerCellStyle, width: '10%' }}>Tiền công</th>
            <th style={{ ...headerCellStyle, width: '15%' }}>Mã phụ tùng</th>
            <th style={{ ...headerCellStyle, width: '28%' }}>Tên Tiếng Việt</th>
            <th style={{ ...headerCellStyle, width: '5%' }}>SL</th>
            <th style={{ ...headerCellStyle, width: '12%' }}>TT</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRows }).map((_, idx) => {
            const svc = serviceItems[idx];
            const part = partItems[idx];
            return (
              <tr key={idx}>
                <td style={cellStyle}>{svc ? svc.description : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{svc ? Number(svc.total_price || 0).toLocaleString() : ''}</td>
                <td style={cellStyle}>{part ? (part.Part?.code || part.part_code || '') : ''}</td>
                <td style={cellStyle}>{part ? part.description : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>{part ? part.quantity : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{part ? Number(part.total_price || 0).toLocaleString() : ''}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>Tiền công:</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{totalLabor.toLocaleString()}</td>
            <td colSpan="3" style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>Tiền phụ tùng thay thế:</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{totalParts.toLocaleString()}</td>
          </tr>
          <tr>
            <td colSpan="5" style={{ ...cellStyle, textAlign: 'right' }}>VAT ( {vatPercent} %):</td>
            <td style={{ ...cellStyle, textAlign: 'right' }}>{vatAmount.toLocaleString()}</td>
          </tr>
          <tr>
            <td colSpan="5" style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>Tổng số (làm tròn):</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>{finalTotal.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      {/* === BẰNG CHỮ === */}
      <div style={{ marginTop: '8px', fontSize: '12px' }}>
        Bằng chữ: <strong style={{ fontStyle: 'italic' }}>{numberToVietnameseWords(finalTotal)}</strong>
      </div>

      {/* === SIGNATURES === */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', textAlign: 'center' }}>
        <div style={{ width: '30%' }}>
          <strong>Khách hàng</strong>
        </div>
        <div style={{ width: '30%' }}>
          <strong>Nhân viên giao dịch</strong>
        </div>
        <div style={{ width: '30%' }}>
          <strong>Thợ sửa</strong>
        </div>
      </div>
      
      <div style={{ height: '60px' }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
        <div style={{ width: '30%', fontWeight: 'bold' }}>{order.customer_name || ''}</div>
        <div style={{ width: '30%', fontWeight: 'bold' }}></div>
        <div style={{ width: '30%', fontWeight: 'bold' }}></div>
      </div>

      <div style={{ marginTop: '15px', fontSize: '10px', lineHeight: '1.4', fontStyle: 'italic' }}>
        Chú ý: Trong trường hợp đặc biệt, nếu xe của quý khách gặp sự cố mà không thể đến được, xin quý khách vui lòng gọi điện trực tiếp cho chúng tôi, nhân viên kỹ thuật của chúng tôi sẽ đến tận nơi phục vụ quý khách.
      </div>
    </div>
  );
};

export default PrintMaintenanceOrder;
