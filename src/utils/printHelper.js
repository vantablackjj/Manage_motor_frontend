
export const numberToVietnameseWords = (num) => {
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

export const printReceipt = (elementId) => {
  const printContent = document.getElementById(elementId);
  if (!printContent) return;
  
  const originalDisplay = printContent.style.display;
  printContent.style.display = 'block';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>In phiếu</title>
        <style>
          body { margin: 0; padding: 0; }
          @media print {
            @page { margin: 10mm; size: A4 portrait; }
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printContent.outerHTML}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  
  printContent.style.display = originalDisplay;
};
