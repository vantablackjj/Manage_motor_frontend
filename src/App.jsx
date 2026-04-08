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
import DailyReportPage from './pages/reports/DailyReportPage';
import PartPage from './pages/master-data/PartPage';
import PartImportPage from './pages/purchase/PartImportPage';
import MechanicPage from './pages/master-data/MechanicPage';
import RepairServicePage from './pages/retail/RepairServicePage';
import PartInventoryPage from './pages/inventory/PartInventoryPage';
import MaintenanceHistoryPage from './pages/reports/MaintenanceHistoryPage';
import PartRetailPage from './pages/retail/PartRetailPage';
import PartRetailDebtPage from './pages/retail/PartRetailDebtPage';
import PartWholesaleDebtPage from './pages/purchase/PartWholesaleDebtPage';



import { ConfigProvider, theme } from 'antd';


import './App.css';

// Tấm khiên bảo vệ (Hợp nhất Đăng nhập)
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'ADMIN') {
    return <Navigate to="/retail" replace />;
  }

  return children;
};

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          borderRadius: 8,
          colorBgContainer: 'rgba(24, 24, 27, 0.4)',
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
                    <Route path="/" element={<Navigate to="/retail" replace />} />
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
                      element={
                        <ProtectedRoute adminOnly={true}>
                          <ExpensePage />
                        </ProtectedRoute>
                      } 
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
                    <Route path="/report/daily" element={<DailyReportPage />} />
                    <Route path="/inventory-report" element={<InventoryReportPage />} />
                    <Route path="/notifications" element={<NotificationPage />} />
                    
                    {/* HỆ THUẬT PHỤ TÙNG & DỊCH VỤ MỚI */}
                    <Route path="/parts" element={<PartPage />} />
                    <Route path="/part-import" element={<PartImportPage />} />
                    <Route path="/part-inventory" element={<PartInventoryPage />} />
                    <Route path="/repair-service" element={<RepairServicePage />} />
                    <Route path="/maintenance-history" element={<MaintenanceHistoryPage />} />
                    <Route path="/part-retail" element={<PartRetailPage />} />
                    <Route path="/part-retail-debt" element={<PartRetailDebtPage />} />
                    <Route path="/part-wholesale-debt" element={<PartWholesaleDebtPage />} />
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
