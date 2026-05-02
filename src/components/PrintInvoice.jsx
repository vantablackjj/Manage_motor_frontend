import React from "react";
import dayjs from "dayjs";
import numberToWords from "../utils/numberToWords";

const PrintInvoice = ({ sale }) => {
  if (!sale) return null;

  const warehouse = sale.Warehouse || sale.warehouse || {};
  const vehicle = sale.Vehicle || sale.vehicle || {};
  const seller = sale.seller || sale.Seller || {};

  const debt = Number(sale.sale_price || 0) - Number(sale.paid_amount || 0);

  return (
    <div className="print-invoice-outer">
      <style>
        {`
                /* Global border-box reset */
                .print-invoice-outer,
                .print-invoice-outer *,
                .print-invoice-outer *::before,
                .print-invoice-outer *::after {
                    box-sizing: border-box;
                }

                .print-invoice-outer {
                    width: 100%;
                    max-width: 210mm;
                    margin: 0 auto;
                    padding: 2mm 5mm;
                    background: white;
                    color: black;
                    font-family: "Times New Roman", Times, serif;
                    font-size: 10pt;
                    line-height: 1.15;
                }

                @media screen {
                    .print-invoice-outer {
                        border: 1px solid #ddd;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        margin: 20px auto;
                        overflow-x: hidden;
                    }
                }

                @media print {
                    @page {
                        margin: 5mm 10mm;
                        size: A4;
                    }
                    body {
                        visibility: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }
                    .print-invoice-outer {
                        visibility: visible !important;
                        display: block !important;
                        position: fixed !important; /* Fixed solves viewport issues */
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        min-height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important; /* Relies on @page margin */
                        border: none !important;
                        box-shadow: none !important;
                        z-index: 9999999;
                        font-size: 10.5pt !important;
                    }
                    .print-invoice-outer * {
                        visibility: visible !important;
                    }
                }

                .header-flex {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    width: 100%;
                    margin-bottom: 2px;
                }

                .logo-side {
                    width: 80px;
                    text-align: center;
                }

                .logo-img {
                    width: 60px;
                    height: auto;
                    object-fit: contain;
                }

                .national-side {
                    flex: 1;
                    display: flex;
                    justify-content: flex-end;
                }

                .national-title-block {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }

                .national-title {
                    font-weight: bold;
                    font-size: 11pt;
                    word-break: break-word; 
                }

                .national-subtitle {
                    font-weight: bold;
                    font-size: 10pt;
                }

                .underline-center {
                    width: 150px;
                    height: 1px;
                    background: #000;
                    margin-top: 2px;
                }

                .title-main {
                    text-align: center;
                    font-size: 14pt;
                    font-weight: bold;
                    margin: 2px 0 0 0;
                    width: 100%;
                }

                .title-date {
                    text-align: center;
                    font-style: italic;
                    font-size: 10pt;
                    margin-bottom: 2px;
                    width: 100%;
                }

                .section-container {
                    margin-bottom: 2px;
                    width: 100%;
                    padding-left: 5px;
                }

                .group-header {
                    font-weight: bold;
                    text-decoration: underline;
                    margin-bottom: 5px;
                    margin-top: 5px;
                }

                .info-row {
                    display: flex;
                    width: 100%;
                    margin-bottom: 2px;
                    align-items: flex-start;
                }

                .info-col {
                    display: flex;
                    width: 50%;
                    min-width: 0;
                }

                .info-label {
                    width: 110px;
                    flex-shrink: 0;
                }

                .info-value {
                    font-weight: bold;
                    word-break: break-word;
                    flex: 1;
                }

                .dotted-line {
                    border-bottom: 1px dotted #000;
                    flex: 1;
                    height: 1.2em;
                    margin-left: 5px;
                }

                .contract-body {
                    margin-top: 5px;
                    width: 100%;
                }

                .footer-text {
                    font-size: 10pt;
                    margin-top: 10px;
                    line-height: 1.3;
                    font-style: italic;
                    width: 100%;
                }

                .signature-flex {
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                    margin-top: 10px;
                    text-align: center;
                }

                .sig-box {
                    flex: 1;
                }

                .sig-title { font-weight: bold; font-size: 10pt; }
                .sig-guide { font-size: 8pt; font-style: italic; margin-bottom: 20px; }
                .sig-name { font-weight: bold; font-size: 10pt; }
                `}
      </style>

      <div className="print-invoice-container">
        {/* Header Section */}
        <div className="header-flex">
          <div className="logo-side">
            <img
              src="/honda-logo.png"
              alt="Logo"
              className="logo-img"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            <div
              style={{ fontSize: "9pt", fontWeight: "bold", marginTop: "5px" }}
            >
              HEAD {warehouse.location || "Ninh Bình"}
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontWeight: "bold", fontSize: "11pt", textAlign: "center" }}>
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div style={{ fontWeight: "bold", fontSize: "10pt", textAlign: "center" }}>
                Độc lập - Tự do - Hạnh phúc
              </div>
              <div style={{ width: "150px", height: "1px", background: "#000", marginTop: "2px" }}></div>
            </div>
          </div>
        </div>

        <div className="title-main">HỢP ĐỒNG MUA BÁN XE MÁY</div>
        <div className="title-date">
          {warehouse.location || "Ninh Bình"}, ngày{" "}
          {dayjs(sale.sale_date).format("DD")} tháng{" "}
          {dayjs(sale.sale_date).format("MM")} năm{" "}
          {dayjs(sale.sale_date).format("YYYY")}
        </div>

        <div className="section-container">
          <div className="group-header">CHÚNG TÔI GỒM :</div>

          {/* BÊN BÁN */}
          <div style={{ fontWeight: "bold", marginTop: "5px" }}>
            1 - ĐẠI DIỆN BÊN BÁN XE (A) :
          </div>
          <div className="info-row">
            <span className="info-label">Tên cửa hàng :</span>
            <div className="info-value" style={{ textTransform: "uppercase" }}>
              {warehouse.warehouse_name
                ? `${warehouse.warehouse_name} - ${warehouse.address || ""}`
                : "................................................................................................"}
            </div>
          </div>
          <div className="info-row">
            <div className="info-col">
              <span className="info-label">Điện thoại :</span>
              <span className="info-value">
                {warehouse.phone || "......................"}
              </span>
            </div>
            <div className="info-col">
              <span className="info-label">Di động :</span>
              <span className="info-value">
                {warehouse.mobile || "......................"}
              </span>
            </div>
          </div>
          <div className="info-row">
            <div className="info-col">
              <span className="info-label">Do ông :</span>
              <span className="info-value">
                {warehouse.manager_name || "......................"}
              </span>
            </div>
            <div className="info-col">
              <span className="info-label">Chức vụ :</span>
              <span className="info-value">Cửa hàng trưởng</span>
            </div>
          </div>

          {/* BÊN MUA */}
          <div style={{ fontWeight: "bold", marginTop: "10px" }}>
            2 - ĐẠI DIỆN BÊN MUA XE (B) :
          </div>
          <div className="info-row">
            <div style={{ display: "flex", width: "50%", minWidth: 0 }}>
              <span className="info-label">Do ông (bà) :</span>
              <span className="info-value">{sale.customer_name}</span>
            </div>
            <div style={{ display: "flex", width: "50%", minWidth: 0 }}>
              <span className="info-label">Số CMND :</span>
              <span className="info-value">
                {sale.id_card || "................"}
              </span>
            </div>
          </div>
          <div className="info-row">
            <span className="info-label">Địa chỉ :</span>
            <span className="info-value">
              {sale.address ||
                "................................................................................"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Điện thoại :</span>
            <span className="info-value">
              {sale.phone || "......................"}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Người bảo lãnh :</span>
            <span className="info-value">
              {sale.guarantor_name || "................................"}
            </span>
          </div>

          {/* NỘI DUNG */}
          <div style={{ fontWeight: "bold", marginTop: "10px" }}>
            3 - NỘI DUNG HỢP ĐỒNG :
          </div>
          <div className="contract-body">
            Bên A bán cho bên B - 01 chiếc xe máy. Giá xe hai bên đã thỏa thuận.
          </div>
          <div className="info-row" style={{ marginTop: "5px" }}>
            <span className="info-label">Xe bao gồm :</span>
            <span className="info-value">
              {sale.sale_type === "Đăng ký" ? "Đăng ký xe" : "Hồ sơ xe"}
            </span>
          </div>
          <div className="info-row">
            <div className="info-col">
              <span className="info-label">Loại xe :</span>
              <span className="info-value">
                {vehicle.VehicleType?.name || "................"}
              </span>
            </div>
            <div className="info-col">
              <span className="info-label">Màu :</span>
              <span className="info-value">
                {vehicle.VehicleColor?.color_name || "................"}
              </span>
            </div>
          </div>
          <div className="info-row">
            <div className="info-col">
              <span className="info-label">Số máy :</span>
              <span className="info-value">
                {sale.engine_no || "................"}
              </span>
            </div>
            <div className="info-col">
              <span className="info-label">Số khung :</span>
              <span className="info-value">
                {sale.chassis_no || "................"}
              </span>
            </div>
          </div>
          <div className="info-row" style={{ marginTop: "5px" }}>
            <div className="info-col">
              <span className="info-label">Giá bán :</span>
              <span className="info-value">
                {Number(sale.sale_price).toLocaleString()} đ
              </span>
            </div>
            <div className="info-col">
              <span className="info-label">Đã trả :</span>
              <span className="info-value">
                {Number(sale.paid_amount).toLocaleString()} đ
              </span>
            </div>
          </div>
          {sale.payment_method === "Trả góp" && (
            <div className="info-row">
              <div className="info-col">
                <span className="info-label">Trả góp :</span>
                <span className="info-value">
                  {Number(sale.loan_amount || 0).toLocaleString()} đ
                </span>
              </div>
              <div className="info-col">
                <span className="info-label">Ngân hàng :</span>
                <span className="info-value">
                  ....................................................
                </span>
              </div>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Còn nợ lại :</span>
            <span className="info-value" style={{ fontSize: "12pt" }}>
              {debt.toLocaleString()} đ
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">Bằng chữ :</span>
            <span className="info-value" style={{ fontStyle: "italic" }}>
              {numberToWords(debt)} .
            </span>
          </div>

          <div style={{ marginTop: "5px" }}>
            Hẹn đến ngày ....... tháng ....... năm 20....... , Ông (Bà){" "}
            <span style={{ fontWeight: "bold" }}>{sale.customer_name}</span>{" "}
            phải trả hết số tiền còn nợ cho công ty chúng tôi và nhận Đăng ký xe
            .
          </div>

          <div className="footer-text">
            - Nếu quá hạn thanh toán 1 tháng khách hàng phải chịu lãi suất
            3%/tháng.
            <br />- Nếu quá hạn thanh toán 2 tháng tôi xin chịu chấp nhận cho
            công ty thu hồi xe và xin chịu mọi phí tổn hao mòn xe, bồi thường
            cho{" "}
            <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>
              {warehouse.warehouse_name || "CÔNG TY"}
            </span>
            .<br />
            (Tôi xin cam kết thực hiện nghiêm chỉnh hợp đồng trên. Nếu sai tôi
            xin chịu hoàn toàn trách nhiệm trước pháp luật.)
          </div>

          <div className="info-row" style={{ marginTop: "5px" }}>
            <span className="info-label" style={{ fontWeight: "bold" }}>
              Ghi chú :
            </span>
            <span className="dotted-line"></span>
          </div>
        </div>

        {/* Signature Section */}
        <div className="signature-flex">
          <div className="sig-box">
            <div className="sig-title">Người mua xe ký</div>
            <div className="sig-guide">(Ký và ghi rõ họ tên)</div>
            <div className="sig-name" style={{ marginTop: "35px" }}>
              {sale.customer_name}
            </div>
          </div>
          <div className="sig-box">
            <div className="sig-title">Người bảo lãnh</div>
            <div className="sig-guide">(Ký và ghi rõ họ tên)</div>
            <div className="sig-name" style={{ marginTop: "35px" }}>
              {sale.guarantor_name || ""}
            </div>
          </div>
          <div className="sig-box">
            <div className="sig-title">Đại diện bên bán xe</div>
            <div className="sig-guide">(Ký và đóng dấu)</div>
            <div className="sig-name" style={{ marginTop: "35px" }}>
              {warehouse.manager_name || ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintInvoice;
