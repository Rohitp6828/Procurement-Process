// CivProcure – Core Domain Types & Data Models

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PROJECT_ENGINEER'
  | 'SITE_MANAGER'
  | 'PROCUREMENT_MANAGER'
  | 'PROCUREMENT_EXECUTIVE'
  | 'STORE_MANAGER'
  | 'ACCOUNTS_MANAGER'
  | 'FINANCE_USER'
  | 'APPROVER'
  | 'MANAGEMENT'
  | 'VIEWER';

export interface Profile {
  id: string;
  auth_user_id?: string;
  email: string;
  full_name: string;
  role_code: UserRole;
  phone?: string;
  department?: string;
  avatar_url?: string;
  is_active: boolean;
  assigned_project_ids?: string[];
}

export interface Permission {
  id: string;
  code: string;
  module: string;
  name: string;
  description?: string;
}

export interface Project {
  id: string;
  project_code: string;
  project_name: string;
  client_name: string;
  project_type: string;
  location: string;
  start_date: string;
  end_date?: string;
  project_manager: string;
  budget: number;
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
  created_at?: string;
  updated_at?: string;
}

export interface Site {
  id: string;
  project_id: string;
  project_name?: string;
  site_code: string;
  site_name: string;
  site_address: string;
  site_manager: string;
  contact_number?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Vendor {
  id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_type: string;
  gst_number: string;
  pan_number: string;
  contact_person: string;
  mobile: string;
  email: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  bank_name: string;
  account_number: string;
  ifsc: string;
  payment_terms: string;
  credit_days: number;
  vendor_rating: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  created_at?: string;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  uploaded_at: string;
}

export interface VendorEvaluation {
  id: string;
  vendor_id: string;
  vendor_name?: string;
  project_id?: string;
  evaluation_date: string;
  price_score?: number; // weight 25%
  quality_score?: number; // weight 20%
  delivery_score?: number; // weight 20%
  experience_score?: number; // weight 10%
  financial_score?: number; // weight 10%
  technical_score?: number; // weight 15%
  price_competitiveness?: number;
  quality_compliance?: number;
  delivery_timeliness?: number;
  documentation_accuracy?: number;
  safety_compliance?: number;
  payment_terms_flexibility?: number;
  technical_capability?: number;
  past_performance?: number;
  total_score?: number;
  overall_score?: number;
  status?: string;
  evaluated_by?: string;
  evaluated_by_id?: string;
  evaluated_by_name?: string;
  remarks?: string;
  created_at?: string;
}

export interface Item {
  id: string;
  item_code: string;
  item_name: string;
  category_name?: string;
  category?: string;
  sub_category?: string;
  description?: string;
  specification?: string;
  specifications?: string;
  unit?: string;
  uom?: string;
  hsn_sac?: string;
  hsn_code?: string;
  gst_rate?: number;
  standard_rate?: number;
  reorder_level: number;
  is_active?: boolean;
  status?: string;
  spec_id?: string;
  standard_code?: string;
}

export interface MaterialSpecification {
  id: string;
  spec_code: string;
  title: string;
  category: string;
  standard_code: string; // e.g. IS 1786:2008, IS 12269:2013, IS 383:2016
  grade?: string; // e.g. Fe 550D, Grade 53, Zone II
  technical_parameters: string; // Key tolerances, chemical/physical requirements
  test_certificates_required: string; // MTC, Lab Test, Sieve Report
  sampling_frequency?: string; // e.g. 1 sample per 10 MT
  packaging_delivery_terms?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CostCode {
  id: string;
  code: string;
  description?: string;
  category?: string;
  name?: string;
  is_active?: boolean;
  allocated_budget?: number;
  committed_amount?: number;
  actual_spent?: number;
}

export interface TermItem {
  id: string;
  term_type: 'PAYMENT' | 'DELIVERY' | 'WARRANTY' | 'FREIGHT' | 'TAX' | 'INSPECTION' | 'COMMERCIAL';
  term_code?: string;
  term_title: string;
  term_content: string;
  term_text?: string;
  is_default: boolean;
}

export type TermMaster = TermItem;

export interface ApprovalMatrixTier {
  id: string;
  module?: 'PR' | 'PO' | 'GRN' | 'BILL' | 'ADVANCE';
  document_type?: 'PR' | 'PO' | 'GRN' | 'BILL' | 'ADVANCE';
  min_amount: number;
  max_amount: number;
  approval_level: number;
  required_role?: UserRole;
  approver_role?: UserRole;
  is_final_level?: boolean;
}

export type ApprovalMatrix = ApprovalMatrixTier;

export interface ApprovalTransaction {
  id: string;
  document_type: string;
  document_id: string;
  approval_level: number;
  approver_name: string;
  approver_email: string;
  approver_role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED';
  comments?: string;
  action_date: string;
}

// Purchase Requisition
export type PRStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_ORDERED'
  | 'FULLY_ORDERED'
  | 'CLOSED'
  | 'CANCELLED';

export interface PRItem {
  id: string;
  pr_id: string;
  item_id?: string;
  item_name: string;
  description?: string;
  specification?: string;
  quantity: number;
  ordered_quantity: number;
  unit: string;
  uom?: string;
  required_date?: string;
  estimated_rate: number;
  estimated_amount: number;
  cost_code?: string;
  cost_code_name?: string;
  budget?: number;
  remarks?: string;
  current_stock?: number;
  remaining_stock?: number;
  balance_quantity?: number;
}

export interface PurchaseRequisition {
  id: string;
  pr_number: string;
  pr_date: string;
  project_id: string;
  project_name?: string;
  site_id: string;
  site_name?: string;
  department: string;
  requested_by?: string;
  requested_by_id?: string;
  requested_by_name?: string;
  required_date?: string;
  required_by_date?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  purpose?: string;
  material_type?: string;
  remarks?: string;
  subtotal?: number;
  tax_amount?: number;
  estimated_total?: number;
  total_estimated_amount?: number;
  current_approval_level: number;
  status: PRStatus;
  items: PRItem[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

// RFQ
export type RFQStatus = 'DRAFT' | 'SENT' | 'PARTIALLY_RESPONDED' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface RFQItem {
  id: string;
  rfq_id: string;
  item_id?: string;
  item_name: string;
  specification?: string;
  quantity: number;
  unit: string;
  required_date?: string;
}

export interface RFQVendor {
  id: string;
  rfq_id: string;
  vendor_id: string;
  vendor_name?: string;
  status: 'SENT' | 'VIEWED' | 'RESPONDED' | 'NOT_RESPONDED' | 'EXPIRED';
  sent_at: string;
  responded_at?: string;
}

export interface RFQ {
  id: string;
  rfq_number: string;
  rfq_date: string;
  pr_id?: string;
  pr_number?: string;
  project_id: string;
  project_name?: string;
  site_id: string;
  site_name?: string;
  submission_deadline: string;
  terms?: string;
  commercial_terms?: string;
  delivery_location: string;
  remarks?: string;
  status: RFQStatus;
  created_by_id?: string;
  created_by_name?: string;
  vendors: RFQVendor[];
  items: RFQItem[];
  created_at: string;
}

// Vendor Quotation
export type QuotationStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface VendorQuotationItem {
  id: string;
  quotation_id: string;
  item_id?: string;
  item_name: string;
  quantity: number;
  unit?: string;
  uom?: string;
  rate?: number;
  basic_rate?: number;
  landed_rate?: number;
  discount_pct?: number;
  tax_pct?: number;
  amount?: number;
  total_amount?: number;
  delivery_time?: string;
}

export interface VendorQuotation {
  id: string;
  quotation_number: string;
  quotation_date: string;
  vendor_id: string;
  vendor_name: string;
  rfq_id?: string;
  rfq_number?: string;
  project_id?: string;
  valid_until?: string;
  validity_date?: string;
  currency?: string;
  payment_terms?: string;
  delivery_terms?: string;
  delivery_period_days?: number;
  basic_rate?: number;
  discount_percent?: number;
  freight_amount?: number;
  packing_forwarding?: number;
  gst_percent?: number;
  landed_rate?: number;
  total_amount?: number;
  freight?: number;
  discount?: number;
  tax_amount?: number;
  other_charges?: number;
  net_amount?: number;
  remarks?: string;
  status: QuotationStatus;
  items: VendorQuotationItem[];
  created_at: string;
}

// Quotation Comparison & Shortlist
export interface QuotationComparisonItem {
  id: string;
  comparison_id: string;
  item_id?: string;
  item_name: string;
  quantity: number;
  unit: string;
  lowest_rate: number;
  selected_vendor_id?: string;
  selected_rate?: number;
  rates_by_vendor: Record<string, { rate: number; amount: number; vendor_name: string }>;
}

export interface QuotationComparison {
  id: string;
  comparison_number: string;
  rfq_id: string;
  rfq_number?: string;
  comparison_date: string;
  prepared_by: string;
  selected_vendor_id?: string;
  selected_vendor_name?: string;
  remarks?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approved_by?: string;
  approved_at?: string;
  items: QuotationComparisonItem[];
}

export interface SupplierShortlist {
  id: string;
  pr_id?: string;
  rfq_id?: string;
  quotation_id?: string;
  vendor_id: string;
  vendor_name: string;
  selected_items_summary: string;
  selected_amount: number;
  selection_reason: string;
  approved_by: string;
  approval_date: string;
  created_at: string;
}

// Purchase Order (PO)
export type POStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PARTIALLY_RECEIVED'
  | 'FULLY_RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';

export interface POItem {
  id: string;
  po_id: string;
  item_id?: string;
  item_name: string;
  description?: string;
  specification?: string;
  quantity: number;
  received_quantity: number;
  billed_quantity: number;
  unit: string;
  uom?: string;
  rate: number;
  discount_pct: number;
  tax_pct: number;
  amount: number;
  total_amount?: number;
  balance_quantity?: number;
}

export interface POVersion {
  id: string;
  po_id: string;
  version_number: number;
  amendment_number: string;
  amendment_reason: string;
  previous_snapshot: any;
  new_snapshot: any;
  changed_fields: string[];
  amended_by: string;
  amended_at: string;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  project_id: string;
  project_name?: string;
  site_id: string;
  site_name?: string;
  vendor_id: string;
  vendor_name: string;
  pr_id?: string;
  pr_number?: string;
  rfq_id?: string;
  quotation_id?: string;
  po_type?: string;
  payment_terms: string;
  delivery_terms?: string;
  freight_terms?: string;
  delivery_address: string;
  billing_address?: string;
  expected_delivery_date?: string;
  delivery_date?: string;
  advance_percentage?: number;
  advance_amount?: number;
  terms_and_conditions?: string;
  created_by_id?: string;
  created_by_name?: string;
  currency?: string;
  remarks?: string;
  subtotal: number;
  discount?: number;
  freight?: number;
  other_charges?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  tax_amount?: number;
  round_off?: number;
  grand_total: number;
  advance_paid?: number;
  version?: number;
  po_version?: number;
  current_approval_level?: number;
  status: POStatus;
  items: POItem[];
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

// Advance Payment
export type AdvanceStatus = 'REQUESTED' | 'APPROVED' | 'PAID' | 'ADJUSTED' | 'CANCELLED';

export interface AdvancePayment {
  id: string;
  advance_number: string;
  po_id: string;
  po_number?: string;
  vendor_id: string;
  vendor_name: string;
  project_id: string;
  project_name?: string;
  amount: number;
  payment_date: string;
  payment_mode: 'RTGS' | 'NEFT' | 'CHEQUE' | 'WIRE' | 'CASH';
  reference_number: string;
  bank_name: string;
  remarks?: string;
  status: AdvanceStatus;
  created_at: string;
}

// Goods Received Note (GRN)
export type GRNStatus = 'DRAFT' | 'SUBMITTED' | 'INSPECTION_PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CLOSED';

export interface GRNItem {
  id: string;
  grn_id: string;
  po_item_id?: string;
  item_id?: string;
  item_name: string;
  ordered_quantity: number;
  previously_received?: number;
  current_received?: number;
  challan_quantity?: number;
  received_quantity?: number;
  accepted_quantity: number;
  rejected_quantity: number;
  unit?: string;
  uom?: string;
  rate?: number;
  amount?: number;
  rejection_reason?: string;
  batch_number?: string;
  storage_location?: string;
  bin_rack?: string;
  remaining_po_quantity?: number;
  current_stock?: number;
}

export interface GoodsReceivedNote {
  id: string;
  grn_number: string;
  grn_date: string;
  po_id: string;
  po_number: string;
  vendor_id: string;
  vendor_name: string;
  project_id: string;
  project_name?: string;
  site_id: string;
  site_name?: string;
  vehicle_number: string;
  delivery_challan?: string;
  vendor_challan_number?: string;
  vendor_challan_date?: string;
  challan_date?: string;
  transporter_name?: string;
  gate_entry_number?: string;
  gate_entry_date?: string;
  received_by?: string;
  received_by_id?: string;
  received_by_name?: string;
  store_location?: string;
  weighbridge_slip_no?: string;
  inspection_status?: 'PENDING' | 'ACCEPTED' | 'PARTIALLY_ACCEPTED' | 'REJECTED';
  remarks?: string;
  total_amount?: number;
  status: GRNStatus;
  items: GRNItem[];
  created_at: string;
}

// Debit Note
export type DebitNoteStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'ADJUSTED' | 'CANCELLED';
export type DebitReason = 'Short Supply' | 'Quality Issue' | 'Rate Difference' | 'Damaged Material' | 'Excess Billing' | 'Rejection' | 'Other';

export interface DebitNoteItem {
  id: string;
  debit_note_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  reason?: string;
}

export interface DebitNote {
  id: string;
  debit_note_number: string;
  debit_note_date: string;
  vendor_id: string;
  vendor_name: string;
  po_id?: string;
  po_number?: string;
  grn_id?: string;
  grn_number?: string;
  bill_id?: string;
  reason: DebitReason;
  amount: number;
  tax_amount: number;
  total: number;
  remarks?: string;
  status: DebitNoteStatus;
  items: DebitNoteItem[];
  created_at: string;
}

// Purchase Bill & 3-Way Matching
export type BillStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFICATION_PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PAID' | 'PARTIALLY_PAID' | 'CANCELLED';
export type MatchingStatus = 'MATCHED' | 'QTY_MISMATCH' | 'RATE_MISMATCH' | 'TAX_MISMATCH' | 'EXCESS_BILLING' | 'REQUIRES_OVERRIDE' | 'VARIANCE_DETECTED';

export interface PurchaseBillItem {
  id: string;
  bill_id: string;
  item_id?: string;
  item_name: string;
  po_item_id?: string;
  grn_item_id?: string;
  uom?: string;
  po_quantity?: number;
  grn_quantity?: number;
  invoice_quantity?: number;
  variance_reason?: string;
  ordered_qty?: number;
  received_qty?: number;
  billed_qty?: number;
  po_rate?: number;
  billed_rate?: number;
  unit?: string;
  amount?: number;
}

export interface PurchaseBill {
  id: string;
  bill_number: string;
  bill_date: string;
  vendor_id: string;
  vendor_name: string;
  po_id: string;
  po_number: string;
  grn_id: string;
  grn_number: string;
  project_id: string;
  project_name?: string;
  invoice_number?: string;
  vendor_invoice_number?: string;
  invoice_date?: string;
  vendor_invoice_date?: string;
  invoice_amount?: number;
  taxable_amount?: number;
  tax_amount: number;
  total_bill_amount?: number;
  tds_rate_percent?: number;
  tds_amount?: number;
  gst_tds_amount?: number;
  retention_amount?: number;
  advance_adjusted?: number;
  net_payable_amount?: number;
  current_approval_level?: number;
  discount?: number;
  other_charges?: number;
  net_payable?: number;
  matching_status: MatchingStatus;
  matching_discrepancies?: Array<{ type: string; message: string; severity: 'warning' | 'error' }>;
  paid_amount?: number;
  adjusted_amount?: number;
  outstanding_amount?: number;
  is_financially_posted?: boolean;
  remarks?: string;
  status: BillStatus;
  items: PurchaseBillItem[];
  created_at: string;
}

// Financial Posting
export interface FinancialPostingItem {
  id: string;
  posting_id: string;
  account_name: string;
  account_code: string;
  debit: number;
  credit: number;
  cost_code?: string;
  remarks?: string;
}

export interface FinancialPosting {
  id: string;
  posting_number: string;
  posting_date: string;
  document_type: 'PURCHASE_BILL' | 'PAYMENT' | 'DEBIT_NOTE';
  document_number: string;
  project_id?: string;
  project_name?: string;
  vendor_id?: string;
  vendor_name?: string;
  total_amount: number;
  status: 'POSTED';
  created_by: string;
  created_at: string;
  entries: FinancialPostingItem[];
}

// Payments & Knockoffs
export interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  vendor_id: string;
  vendor_name: string;
  project_id?: string;
  project_name?: string;
  bill_id?: string;
  bill_number?: string;
  po_id?: string;
  po_number?: string;
  amount?: number;
  amount_paid?: number;
  payment_type?: string;
  payment_mode: 'RTGS' | 'NEFT' | 'CHEQUE' | 'WIRE' | 'CASH';
  reference_number: string;
  bank_account?: string;
  bank_name?: string;
  status?: string;
  created_by_id?: string;
  created_by_name?: string;
  remarks?: string;
  created_at: string;
}

export interface Knockoff {
  id: string;
  bill_id: string;
  bill_number?: string;
  invoice_number?: string;
  payment_id?: string;
  payment_number?: string;
  debit_note_id?: string;
  advance_payment_id?: string;
  allocated_amount: number;
  knockoff_date: string;
  created_at: string;
}

// Audit Log, Notification, Attachment
export interface AuditLog {
  id: string;
  user_email: string;
  user_name: string;
  user_role: string;
  module: string;
  action: string;
  record_id: string;
  old_value?: any;
  new_value?: any;
  timestamp: string;
}

export interface Attachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  uploaded_at: string;
}

export interface Notification {
  id: string;
  recipient_role?: string;
  recipient_email?: string;
  title: string;
  message: string;
  document_type?: string;
  document_id?: string;
  is_read: boolean;
  created_at: string;
}

// Request For Quotation alias
export type RequestForQuotation = RFQ;

// Store Stock Ledger
export interface StockLedger {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  project_id: string;
  project_name?: string;
  site_id: string;
  site_name?: string;
  storage_location?: string;
  bin_rack?: string;
  uom: string;
  current_quantity: number;
  reorder_level: number;
  average_rate: number;
  total_valuation: number;
  updated_at?: string;
}

// Material Issue Note (MIN)
export interface MaterialIssueItem {
  id: string;
  issue_id: string;
  item_id: string;
  item_name: string;
  uom: string;
  quantity: number;
  remarks?: string;
}

export interface MaterialIssue {
  id: string;
  issue_number: string;
  issue_date: string;
  project_id: string;
  project_name?: string;
  site_id: string;
  site_name?: string;
  contractor_name: string;
  issued_to_person: string;
  work_order_ref: string;
  status: 'DRAFT' | 'ISSUED' | 'CANCELLED';
  remarks?: string;
  items: MaterialIssueItem[];
  created_at: string;
}

// Inter-Site Material Transfer (MTN)
export interface MaterialTransferItem {
  id: string;
  transfer_id: string;
  item_id: string;
  item_name: string;
  uom: string;
  dispatched_quantity: number;
  received_quantity: number;
}

export interface MaterialTransfer {
  id: string;
  transfer_number: string;
  transfer_date: string;
  from_project_id: string;
  from_project_name?: string;
  from_site_id: string;
  from_site_name?: string;
  to_project_id: string;
  to_project_name?: string;
  to_site_id: string;
  to_site_name?: string;
  vehicle_number: string;
  driver_name: string;
  dispatch_gate_pass_no: string;
  status: 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  remarks?: string;
  receipt_date?: string;
  items: MaterialTransferItem[];
  created_at: string;
}

// Bill Item for 3-Way Match
export interface BillItem {
  id: string;
  bill_id: string;
  po_item_id: string;
  grn_item_id?: string;
  item_id: string;
  item_name: string;
  uom: string;
  po_quantity: number;
  grn_quantity: number;
  invoice_quantity: number;
  po_rate: number;
  invoice_rate: number;
  taxable_amount: number;
  gst_percent: number;
  gst_amount: number;
  total_amount: number;
  quantity_variance: number;
  rate_variance: number;
  variance_reason?: string;
}

