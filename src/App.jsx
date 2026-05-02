import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import RetailSalePage from './pages/retail/RetailSalePage';
import WholesaleSalePage from './pages/wholesale/WholesaleSalePage';
import PurchasePage from './pages/purchase/PurchasePage';
import ExpensePage from './pages/expenses/ExpensePage';
import VehicleTypePage from './pages/master-data/VehicleTypePage';
import SupplierPage from './pages/master-data/SupplierPage';
import WholesaleCustomerPage from './pages/master-data/WholesaleCustomerPage';
import VehicleColorPage from './pages/master-data/VehicleColorPage';
import WarehousePage from './pages/master-data/WarehousePage';
import EmployeePage from './pages/master-data/EmployeePage';
import TransferPage from './pages/transfer/TransferPage';
import VehicleLifecyclePage from './pages/reports/VehicleLifecyclePage';
import InventoryReportPage from './pages/reports/InventoryReportPage';
import WholesaleCustomerAudit from './pages/reports/WholesaleCustomerAudit';
import RetailSaleReportPage from './pages/reports/RetailSaleReportPage';
import WarrantyReportPage from './pages/reports/WarrantyReportPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import NotificationPage from './pages/NotificationPage';
// import DailyReportPage from './pages/reports/DailyReportPage';
import PartPage from './pages/master-data/PartPage';
import PartImportPage from './pages/purchase/PartImportPage';
import MechanicPage from './pages/master-data/MechanicPage';
import PartInventoryPage from './pages/inventory/PartInventoryPage';
import PartRetailPage from './pages/retail/PartRetailPage';
import PartRetailDebtPage from './pages/retail/PartRetailDebtPage';
import PartWholesaleDebtPage from './pages/purchase/PartWholesaleDebtPage';
import PartInventoryReportPage from './pages/reports/PartInventoryReportPage';
import PartPurchasesReportPage from './pages/reports/PartPurchasesReportPage';
import PartSalesReportPage from './pages/reports/PartSalesReportPage';
import MaintenanceHub from './pages/retail/MaintenanceHub';
import GiftManagementPage from './pages/inventory/GiftManagementPage';
import PartTransferPage from './pages/transfer/PartTransferPage';
import PartUsageReportPage from './pages/reports/PartUsageReportPage';
import PartWholesalePage from './pages/wholesale/PartWholesalePage';
import PartWholesaleCustomerPage from './pages/master-data/PartWholesaleCustomerPage';
import PartWholesaleReportPage from './pages/reports/PartWholesaleReportPage';
import MaintenanceReportPage from './pages/reports/MaintenanceReportPage';
import BackupPage from './pages/system/BackupPage';
import MaintenanceRulePage from './pages/master-data/MaintenanceRulePage';



import { ConfigProvider, theme } from 'antd';


import './App.css';

const getDefaultPath = (user) => {
  if (!user || !user.role) return "/login";
  if (user.role === 'ADMIN') return '/dashboard';
  
  const canManageSales = user.can_manage_sales === true || user.can_manage_sales === 1;
  const canManageSpareParts = user.can_manage_spare_parts === true || user.can_manage_spare_parts === 1;

  if (canManageSales) return "/retail";
  if (canManageSpareParts) return "/part-retail";
  
  return "/retail"; // Default fallback
};

// Tấm khiên bảo vệ (Hợp nhất Đăng nhập)
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to={getDefaultPath(user)} replace />;
  }

  return children;
};

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#4f46e5',
          borderRadius: 8,
          colorBgContainer: '#fcfcff',
          colorText: '#1e1b4b',
          colorTextSecondary: '#475569',
          colorBgElevated: '#ffffff',
          colorBgLayout: '#e9e9f0',
          colorBorder: '#cbd5e1',
        },
      }}
    >
      <Router>
        <Routes>
          {/* Cổng đăng nhập nằm ngoài Layout chính */}
          <Route path="/login" element={<LoginPage />} />

          {/* Toàn bộ hệ thống quản lý nằm trong Tấm khiên bảo vệ */}
          <Route 
            path="/*" 
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<Navigate to={getDefaultPath(JSON.parse(localStorage.getItem('user') || '{}'))} replace />} />
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <AdminDashboardPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="/retail" element={<RetailSalePage />} />
                    <Route path="/wholesale" element={<WholesaleSalePage />} />
                    <Route path="/purchase" element={<PurchasePage />} />
                    <Route 
                      path="/expenses" 
                      element={<ExpensePage />} 
                    />
                    <Route path="/vehicle-types" element={<VehicleTypePage />} />
                    <Route path="/suppliers" element={<SupplierPage />} />
                    <Route path="/wholesale-customers" element={<WholesaleCustomerPage />} />
                    <Route path="/vehicle-colors" element={<VehicleColorPage />} />
                    <Route 
                      path="/warehouses" 
                      element={<WarehousePage />} 
                    />
                    <Route 
                      path="/employees" 
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <EmployeePage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/mechanics" 
                      element={<MechanicPage />} 
                    />
                    <Route path="/transfers" element={<TransferPage />} />
                    <Route path="/vehicle-search" element={<VehicleLifecyclePage />} />
                    <Route path="/report/sales-retail" element={<RetailSaleReportPage />} />
                    <Route path="/report/sales-wholesale" element={<VehicleLifecyclePage />} />
                    <Route path="/report/wholesale-audit" element={<WholesaleCustomerAudit />} />
                    <Route path="/report/purchases" element={<VehicleLifecyclePage />} />
                    <Route path="/report/warranty" element={<WarrantyReportPage />} />
                    {/* <Route path="/report/daily" element={<DailyReportPage />} /> */}
                    <Route path="/inventory-report" element={<InventoryReportPage />} />
                    <Route path="/notifications" element={<NotificationPage />} />
                    
                    {/* HỆ THUẬT PHỤ TÙNG & DỊCH VỤ MỚI */}
                    <Route path="/parts" element={<PartPage />} />
                    <Route path="/part-wholesale-customers" element={<PartWholesaleCustomerPage />} />
                    <Route path="/part-import" element={<PartImportPage />} />
                    <Route path="/part-inventory" element={<PartInventoryPage />} />
                    {/* BÀO TRÌ & DỊCH VỤ HỢP NHẤT */}
                    <Route path="/maintenance-hub" element={<MaintenanceHub />} />
                    <Route path="/maintenance-rules" element={<MaintenanceRulePage />} />
                    <Route path="/maintenance-hub/:id" element={<MaintenanceHub />} />
                    <Route path="/part-transfer" element={<PartTransferPage />} />
                    <Route path="/part-retail" element={<PartRetailPage />} />
                    <Route path="/part-wholesale" element={<PartWholesalePage />} />
                    <Route path="/part-retail-debt" element={<PartRetailDebtPage />} />
                    <Route path="/part-wholesale-debt" element={<PartWholesaleDebtPage />} />
                    <Route 
                      path="/gifts" 
                      element={
                        <ProtectedRoute>
                          <GiftManagementPage />
                        </ProtectedRoute>
                      } 
                    />
                    
                    {/* BÁO CÁO PHỤ TÙNG */}
                    <Route path="/report/parts-inventory" element={<PartInventoryReportPage />} />
                    <Route path="/report/parts-purchases" element={<PartPurchasesReportPage />} />
                    <Route path="/report/parts-sales" element={<PartSalesReportPage />} />
                    <Route path="/report/parts-wholesale" element={<PartWholesaleReportPage />} />
                    <Route path="/report/parts-usage" element={<PartUsageReportPage />} />
                    <Route path="/report/maintenance" element={<MaintenanceReportPage />} />
                    <Route 
                      path="/system/backups" 
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <BackupPage />
                        </ProtectedRoute>
                      } 
                    />
                  </Routes>





                </MainLayout>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
