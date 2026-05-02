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

  const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');
  const fmtDate = (d) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '';

  const maxRows = 20; // Match the 20 rows in the sample

  const tableStyle = { width: '100%', borderCollapse: 'collapse', border: '1.2px solid #000', marginBottom: '8px' };
  const cellStyle = { border: '1px solid #000', padding: '3px 4px', fontSize: '10px', lineHeight: '1.2' };
  const headerStyle = { ...cellStyle, fontWeight: 'bold', textAlign: 'center', background: '#f0f0f0' };

  return (
    <div id="print-maintenance-receipt" style={{ 
      width: '210mm', 
      padding: '8mm', 
      color: '#000', 
      fontFamily: "'Times New Roman', Times, serif",
      background: '#fff',
      position: 'relative'
    }}>
      {/* === HEADER === */}
      <div style={{ position: 'absolute', top: '8mm', right: '8mm', border: '1px dashed #000', padding: '4px 15px', fontSize: '10px' }}>
        STT:
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
        <div style={{ width: '35%' }}>
          <div style={{ fontWeight: 'bold', fontSize: '11px' }}>HỆ THỐNG XE MÁY THANH HẢI</div>
          <div style={{ fontSize: '9px' }}>Địa chỉ: {warehouse?.address || '...'}</div>
          <div style={{ fontSize: '9px' }}>SĐT: {warehouse?.phone || '...'}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '1px' }}>PHIẾU SỬA CHỮA</div>
        </div>
        <div style={{ width: '30%' }}></div>
      </div>

      {/* === INFO GRID === */}
      <table style={tableStyle}>
        <tbody>
          <tr>
            <td style={{ ...cellStyle, width: '45%' }}>Tên khách hàng: <strong>{order.customer_name}</strong></td>
            <td style={{ ...cellStyle, width: '25%' }}>Địa chỉ hiện tại: {order.customer_address}</td>
            <td style={{ ...cellStyle, width: '15%' }}>Mức nhiên liệu:</td>
            <td style={{ ...cellStyle, width: '15%', padding: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
                <span>E</span>
                <div style={{ borderBottom: '1px solid #000', flex: 1, margin: '0 4px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: -2 }}>|</span>
                </div>
                <span>F</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style={cellStyle} rowSpan={2}>
              Loại xe: 
              <span style={{ marginLeft: 6 }}>
                {['Ga', 'Số', 'Côn tay', 'Xe Điện', 'Phân khối lớn'].map(t => {
                  const isElectric = !!order.battery_id;
                  const checked = isElectric ? t === 'Xe Điện' : order.vehicle_type === t;
                  return (
                    <label key={t} style={{ marginRight: 6, display: 'inline-block' }}>
                      <input type="checkbox" checked={checked} readOnly style={{ transform: 'scale(0.8)' }} /> {t}
                    </label>
                  );
                })}
              </span>
            </td>
            <td style={cellStyle}>Số điện thoại: <strong>{order.customer_phone}</strong></td>
            <td style={cellStyle} colSpan={2}>Thời gian nhận xe: <strong>{fmtDate(order.received_at)}</strong></td>
          </tr>
          <tr>
            <td style={cellStyle}>Số khung: {order.chassis_no}</td>
            <td style={cellStyle} colSpan={2}>Thời gian trả xe thực tế: <strong>{fmtDate(order.returned_at)}</strong></td>
          </tr>
          <tr>
            <td style={cellStyle}>Tên xe: {order.model_name}</td>
            <td style={cellStyle}>Số máy: {order.engine_no}</td>
            <td style={cellStyle} colSpan={2}>ID Pin (Xe điện): {order.battery_id}</td>
          </tr>
          <tr>
            <td style={cellStyle}>Biển số: <strong>{order.license_plate}</strong>  |  Số Km: <strong>{fmt(order.km_reading)}</strong></td>
            <td style={cellStyle} colSpan={3}>
              Rửa xe: 
              <label style={{ marginLeft: 10, marginRight: 8 }}><input type="checkbox" checked={order.wash_option === 'Trước sửa chữa'} readOnly /> Trước sửa chữa</label>
              <label style={{ marginRight: 8 }}><input type="checkbox" checked={order.wash_option === 'Sau sửa chữa'} readOnly /> Sau sửa chữa</label>
              <label><input type="checkbox" checked={order.wash_option === 'Không cần rửa'} readOnly /> Không cần rửa xe</label>
            </td>
          </tr>
          <tr>
            <td style={{ ...cellStyle, height: '30px' }}>Yêu cầu của khách hàng: {order.notes}</td>
            <td style={cellStyle} colSpan={3}>Tư vấn sửa chữa: ...</td>
          </tr>
        </tbody>
      </table>

      {/* === ITEMS TABLE === */}
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...headerStyle, fontSize: '8px' }} rowSpan={2} width="20">STT</th>
            <th style={{ ...headerStyle, fontSize: '8px' }} rowSpan={2}>Tên phụ tùng, công việc</th>
            <th style={{ ...headerStyle, fontSize: '8px' }} rowSpan={2} width="80">Mã Phụ Tùng</th>
            <th style={{ ...headerStyle, fontSize: '8px', background: '#ffcccc' }} width="25">Cần thay thế</th>
            <th style={{ ...headerStyle, fontSize: '8px', background: '#ffffcc' }} width="25">Chú ý</th>
            <th style={{ ...headerStyle, fontSize: '8px' }} width="40">Báo giá</th>
            <th style={{ ...headerStyle, fontSize: '8px' }} colSpan={2}>Thay thế</th>
            <th style={{ ...headerStyle, fontSize: '8px' }} width="25">SL</th>
            <th style={{ ...headerStyle, fontSize: '8px' }} colSpan={3}>Thống kê chi phí sửa chữa</th>
          </tr>
          <tr>
            <th style={{ ...headerStyle, background: '#ffcccc' }}>v</th>
            <th style={{ ...headerStyle, background: '#ffffcc' }}>v</th>
            <th style={headerStyle}></th>
            <th style={headerStyle} width="20">Có</th>
            <th style={headerStyle} width="20">Không</th>
            <th style={headerStyle}></th>
            <th style={{ ...headerStyle, fontSize: '8px' }}>Tổng PT</th>
            <th style={{ ...headerStyle, fontSize: '8px' }}>Tiền công</th>
            <th style={{ ...headerStyle, fontSize: '8px' }}>Tổng cộng</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRows }).map((_, idx) => {
            const item = items?.[idx];
            return (
              <tr key={idx} style={{ height: '20px' }}>
                <td style={{ ...cellStyle, textAlign: 'center' }}>{idx + 1}</td>
                <td style={cellStyle}>{item?.description || ''}</td>
                <td style={cellStyle}>{item?.Part?.code || item?.part_code || ''}</td>
                <td style={cellStyle}></td>
                <td style={cellStyle}></td>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>{item?.type === 'PART' ? 'v' : ''}</td>
                <td style={cellStyle}></td>
                <td style={{ ...cellStyle, textAlign: 'center' }}>{item?.quantity || ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{item?.type === 'PART' ? fmt(item.total_price) : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{item?.type === 'SERVICE' ? fmt(item.total_price) : ''}</td>
                <td style={{ ...cellStyle, textAlign: 'right' }}>{item ? fmt(item.total_price) : ''}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', border: 'none' }} colSpan={9}>Tổng cộng chưa VAT:</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{fmt(totalParts)}</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{fmt(totalLabor)}</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold' }}>{fmt(grandTotal)}</td>
          </tr>
          {vatPercent > 0 && (
            <tr>
              <td style={{ ...cellStyle, textAlign: 'right', border: 'none' }} colSpan={11}>Thuế VAT ({vatPercent}%):</td>
              <td style={{ ...cellStyle, textAlign: 'right' }}>{fmt(vatAmount)}</td>
            </tr>
          )}
          <tr>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '11px', border: 'none' }} colSpan={11}>TỔNG THANH TOÁN (ĐÃ CÓ VAT):</td>
            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '11px' }}>{fmt(finalTotal)}</td>
          </tr>
        </tfoot>
      </table>

      {/* === FOOTER SECTIONS === */}
      <div style={{ display: 'flex', gap: '10px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', border: '1px solid #000', padding: '2px 5px', marginBottom: '4px' }}>
            <div style={{ flex: 1 }}>Xác nhận lấy lại phụ tùng cũ:</div>
            <div style={{ width: '80px', display: 'flex', justifyContent: 'space-between' }}>
              <label><input type="checkbox" /> Có</label>
              <label><input type="checkbox" /> Không</label>
            </div>
          </div>
          <div style={{ border: '1px solid #000', padding: '2px 5px', minHeight: '30px', marginBottom: '4px' }}>
            * Lý do khách hàng chưa đồng ý thay Phụ Tùng:
          </div>
          <div style={{ border: '1px solid #000', padding: '2px 5px', minHeight: '30px', marginBottom: '4px' }}>
            * Khung thời gian trong ngày thuận tiện nghe cuộc điện thoại:
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ border: '1px solid #000', fontSize: '8px' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #000', background: '#f0f0f0' }}>
                  <div style={{ width: '20px', borderRight: '1px solid #000', textAlign: 'center' }}>STT</div>
                  <div style={{ flex: 1, borderRight: '1px solid #000', textAlign: 'center' }}>Kiểm tra cuối</div>
                  <div style={{ width: '40px', borderRight: '1px solid #000', textAlign: 'center' }}>Xác nhận</div>
                  <div style={{ width: '40px', textAlign: 'center' }}>Thay dầu</div>
                </div>
                {[
                  'Mức dầu - rò rỉ dầu - bu lông xả dầu',
                  'Ống dẫn nhiên liệu (rò rỉ, lỏng ốc...)',
                  'Vật dễ cháy và vị trí các sóc chuột (chuột, rác...)',
                  'Hệ thống phanh (Hành trình tự do, hoạt động của phanh...)',
                  'Đèn lái, đèn phanh, đèn tín hiệu, còi...',
                  'Ốc và đai ốc, đai ốc trục trước và trục sau',
                  'Xác nhận các hạng mục đã sửa chữa',
                  'Kiểm tra ngoại quan xe (trầy xước...)',
                  'Khả năng vận hành và hoạt động động cơ xe',
                  'Tốc độ cầm chừng',
                  'Chạy thử'
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', borderBottom: i === 10 ? 'none' : '1px solid #000' }}>
                    <div style={{ width: '20px', borderRight: '1px solid #000', textAlign: 'center' }}>{i + 1}</div>
                    <div style={{ flex: 1, borderRight: '1px solid #000', paddingLeft: '2px' }}>{item}</div>
                    <div style={{ width: '40px', borderRight: '1px solid #000' }}></div>
                    <div style={{ width: '40px' }}></div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ width: '180px' }}>
              <div style={{ border: '1px solid #000', textAlign: 'center', background: '#f0f0f0', fontWeight: 'bold' }}>Thời gian kiểm tra xe lần tới &lt;Amber Job&gt;</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                <thead style={{ background: '#f0f0f0' }}>
                  <tr>
                    <th style={cellStyle}>Tên phụ tùng/Công việc</th>
                    <th style={cellStyle} width="40">Ngày</th>
                    <th style={cellStyle} width="30">Km</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let jobs = [];
                    try {
                      jobs = typeof order.amber_jobs === 'string' ? JSON.parse(order.amber_jobs) : (order.amber_jobs || []);
                    } catch (e) {
                      console.error("Print parse error", e);
                    }
                    return [0, 1, 2, 3, 4].map(idx => {
                      const job = jobs[idx];
                      const dateText = job?.date ? dayjs(job.date).format("DD/MM/YYYY") : (job?.time || '');
                      return (
                        <tr key={idx} style={{ height: '15px' }}>
                          <td style={cellStyle}>{job?.content || ''}</td>
                          <td style={{ ...cellStyle, textAlign: 'center' }}>{dateText}</td>
                          <td style={{ ...cellStyle, textAlign: 'center' }}>{job?.km ? Number(job.km).toLocaleString() : ''}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* === SIGNATURE AREA === */}
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '9px' }}>
        <div style={{ width: '40%', border: '1px solid #000', padding: '5px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Khách hàng xác nhận</div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div>Trước sửa chữa</div>
            <div>Sau sửa chữa</div>
          </div>
          <div style={{ height: '40px' }}></div>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: '10px' }}>
          <div style={{ fontWeight: 'bold' }}>Tiếp nhận</div>
          <div style={{ fontWeight: 'bold' }}>Kỹ thuật viên</div>
          <div style={{ fontWeight: 'bold' }}>Kiểm tra cuối</div>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: '2mm', left: '8mm', right: '8mm', fontSize: '7px', fontStyle: 'italic', borderTop: '1px solid #ccc', paddingTop: '2px' }}>
        Bằng việc ký vào Phiếu sửa chữa này, khách hàng đồng ý với Điều khoản và Chính sách Quyền Riêng Tư... (Vui lòng xem chi tiết tại www.honda.com/policy)
      </div>
    </div>
  );
};

export default PrintMaintenanceOrder;
