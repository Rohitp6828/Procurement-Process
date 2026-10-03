import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages - Dashboard
import { DashboardPage } from './pages/dashboard/DashboardPage';

// Pages - Master Data (Only Item Master & Specifications Master)
import { ItemMasterPage } from './pages/masters/ItemMasterPage';
import { SpecificationsMasterPage } from './pages/masters/SpecificationsMasterPage';

// Pages - Procurement Lifecycle
import { PurchaseRequisitionsPage } from './pages/procurement/PurchaseRequisitionsPage';
import { VendorEvaluationPage } from './pages/procurement/VendorEvaluationPage';
import { RFQPage } from './pages/procurement/RFQPage';
import { QuotationsPage } from './pages/procurement/QuotationsPage';
import { QuotationComparisonPage } from './pages/procurement/QuotationComparisonPage';
import { SupplierShortlistPage } from './pages/procurement/SupplierShortlistPage';
import { PurchaseOrdersPage } from './pages/procurement/PurchaseOrdersPage';

// Pages - Inventory & Stores
import { GoodsReceivedNotesPage } from './pages/inventory/GoodsReceivedNotesPage';
import { StoreStockPage } from './pages/inventory/StoreStockPage';
import { MaterialIssuePage } from './pages/inventory/MaterialIssuePage';
import { MaterialTransferPage } from './pages/inventory/MaterialTransferPage';
import { DebitNotesPage } from './pages/inventory/DebitNotesPage';

// Pages - Billing & Payments (3-Way Matching Engine)
import { PurchaseBillsPage } from './pages/billing/PurchaseBillsPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';

// Pages - Reports & Governance
import { ReportsPage } from './pages/reports/ReportsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Executive Dashboard */}
              <Route path="/" element={<DashboardPage />} />

              {/* Master Data Modules (Item Master & Specifications Master) */}
              <Route path="/masters/items" element={<ItemMasterPage />} />
              <Route path="/masters/specifications" element={<SpecificationsMasterPage />} />

              {/* Purchase Process Workflow */}
              <Route path="/procurement/requisitions" element={<PurchaseRequisitionsPage />} />
              <Route path="/procurement/vendor-evaluation" element={<VendorEvaluationPage />} />
              <Route path="/procurement/rfq" element={<RFQPage />} />
              <Route path="/procurement/quotations" element={<QuotationsPage />} />
              <Route path="/procurement/quotation-comparison" element={<QuotationComparisonPage />} />
              <Route path="/procurement/supplier-shortlist" element={<SupplierShortlistPage />} />
              <Route path="/procurement/purchase-orders" element={<PurchaseOrdersPage />} />

              {/* Inventory & Material Management */}
              <Route path="/inventory/grn" element={<GoodsReceivedNotesPage />} />
              <Route path="/inventory/stock" element={<StoreStockPage />} />
              <Route path="/inventory/issues" element={<MaterialIssuePage />} />
              <Route path="/inventory/transfers" element={<MaterialTransferPage />} />
              <Route path="/inventory/debit-notes" element={<DebitNotesPage />} />

              {/* Billing & Payments */}
              <Route path="/accounts/bills" element={<PurchaseBillsPage />} />
              <Route path="/accounts/payments" element={<PaymentsPage />} />

              {/* Reports & Audit */}
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
