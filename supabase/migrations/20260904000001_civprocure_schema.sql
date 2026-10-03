-- CivProcure - Civil Construction Purchase Management System
-- Schema Migration: Complete Normalized Tables, Enums, Sequences, and Foreign Keys

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES & PERMISSIONS
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 2. PROFILES (Linked to auth.users if Supabase Auth is active)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role_code VARCHAR(50) REFERENCES roles(code) ON UPDATE CASCADE,
    phone VARCHAR(20),
    department VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROJECTS & SITES
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code VARCHAR(50) UNIQUE NOT NULL,
    project_name VARCHAR(200) NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    project_type VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    project_manager VARCHAR(150),
    budget NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    site_code VARCHAR(50) UNIQUE NOT NULL,
    site_name VARCHAR(200) NOT NULL,
    site_address TEXT NOT NULL,
    site_manager VARCHAR(150),
    contact_number VARCHAR(20),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MASTER DATA: UNITS, TAX RATES, COST CODES, ITEM CATEGORIES, ITEMS
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    percentage NUMERIC(5,2) NOT NULL,
    description VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES item_categories(id),
    category_name VARCHAR(100),
    description TEXT,
    specification TEXT,
    unit VARCHAR(20) NOT NULL,
    hsn_sac VARCHAR(50),
    gst_rate NUMERIC(5,2) DEFAULT 18.00,
    standard_rate NUMERIC(12,2) DEFAULT 0,
    reorder_level NUMERIC(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. VENDORS & VENDOR DOCUMENTS & EVALUATIONS
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_code VARCHAR(50) UNIQUE NOT NULL,
    vendor_name VARCHAR(200) NOT NULL,
    vendor_type VARCHAR(100) DEFAULT 'SUPPLIER',
    gst_number VARCHAR(20),
    pan_number VARCHAR(20),
    contact_person VARCHAR(150),
    mobile VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    state VARCHAR(100),
    city VARCHAR(100),
    pincode VARCHAR(20),
    bank_name VARCHAR(150),
    account_number VARCHAR(50),
    ifsc VARCHAR(30),
    payment_terms VARCHAR(100),
    credit_days INT DEFAULT 30,
    vendor_rating NUMERIC(3,2) DEFAULT 4.00,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    evaluation_date DATE NOT NULL,
    price_score NUMERIC(5,2) DEFAULT 0,
    quality_score NUMERIC(5,2) DEFAULT 0,
    delivery_score NUMERIC(5,2) DEFAULT 0,
    experience_score NUMERIC(5,2) DEFAULT 0,
    financial_score NUMERIC(5,2) DEFAULT 0,
    technical_score NUMERIC(5,2) DEFAULT 0,
    overall_score NUMERIC(5,2) DEFAULT 0,
    evaluated_by VARCHAR(150),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TERMS MASTER
CREATE TABLE IF NOT EXISTS terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_type VARCHAR(50) NOT NULL,
    term_title VARCHAR(200) NOT NULL,
    term_content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. APPROVAL MATRIX
CREATE TABLE IF NOT EXISTS approval_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL, -- 'PR', 'PO', 'GRN', 'BILL', 'ADVANCE'
    min_amount NUMERIC(15,2) DEFAULT 0,
    max_amount NUMERIC(15,2) DEFAULT 999999999,
    project_id UUID REFERENCES projects(id),
    department VARCHAR(50),
    approval_level INT NOT NULL,
    required_role VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_type VARCHAR(50) NOT NULL,
    document_id UUID NOT NULL,
    approval_level INT NOT NULL,
    approver_name VARCHAR(150),
    approver_email VARCHAR(200),
    approver_role VARCHAR(50),
    status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED')),
    comments TEXT,
    action_date TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PURCHASE REQUISITION (PR)
CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_number VARCHAR(50) UNIQUE NOT NULL,
    pr_date DATE NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id),
    site_id UUID NOT NULL REFERENCES sites(id),
    department VARCHAR(50) NOT NULL,
    requested_by VARCHAR(150) NOT NULL,
    required_date DATE NOT NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    purpose TEXT,
    remarks TEXT,
    subtotal NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    estimated_total NUMERIC(15,2) DEFAULT 0,
    current_approval_level INT DEFAULT 1,
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PARTIALLY_ORDERED', 'FULLY_ORDERED', 'CLOSED', 'CANCELLED')),
    created_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_requisition_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_id UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    specification TEXT,
    quantity NUMERIC(12,2) NOT NULL,
    ordered_quantity NUMERIC(12,2) DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    required_date DATE,
    estimated_rate NUMERIC(12,2) NOT NULL,
    estimated_amount NUMERIC(15,2) NOT NULL,
    cost_code VARCHAR(50),
    budget NUMERIC(15,2) DEFAULT 0,
    remarks TEXT
);

-- 9. REQUEST FOR QUOTATION (RFQ)
CREATE TABLE IF NOT EXISTS rfqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_number VARCHAR(50) UNIQUE NOT NULL,
    rfq_date DATE NOT NULL,
    pr_id UUID REFERENCES purchase_requisitions(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    site_id UUID NOT NULL REFERENCES sites(id),
    submission_deadline DATE NOT NULL,
    terms TEXT,
    delivery_location TEXT,
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PARTIALLY_RESPONDED', 'COMPLETED', 'EXPIRED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rfq_vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    status VARCHAR(30) DEFAULT 'SENT' CHECK (status IN ('SENT', 'VIEWED', 'RESPONDED', 'NOT_RESPONDED', 'EXPIRED')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS rfq_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    item_name VARCHAR(200) NOT NULL,
    specification TEXT,
    quantity NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    required_date DATE
);

-- 10. VENDOR QUOTATION
CREATE TABLE IF NOT EXISTS vendor_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    quotation_date DATE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    rfq_id UUID REFERENCES rfqs(id),
    valid_until DATE NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    payment_terms TEXT,
    delivery_terms TEXT,
    freight NUMERIC(12,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    other_charges NUMERIC(12,2) DEFAULT 0,
    net_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES vendor_quotations(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    item_name VARCHAR(200) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    rate NUMERIC(12,2) NOT NULL,
    discount_pct NUMERIC(5,2) DEFAULT 0,
    tax_pct NUMERIC(5,2) DEFAULT 18.00,
    amount NUMERIC(15,2) NOT NULL,
    delivery_time VARCHAR(50)
);

-- 11. QUOTATION COMPARISON & SHORTLIST
CREATE TABLE IF NOT EXISTS quotation_comparisons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comparison_number VARCHAR(50) UNIQUE NOT NULL,
    rfq_id UUID NOT NULL REFERENCES rfqs(id),
    comparison_date DATE NOT NULL,
    prepared_by VARCHAR(150),
    selected_vendor_id UUID REFERENCES vendors(id),
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approved_by VARCHAR(150),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quotation_comparison_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comparison_id UUID NOT NULL REFERENCES quotation_comparisons(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    item_name VARCHAR(200) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    lowest_rate NUMERIC(12,2),
    selected_vendor_id UUID REFERENCES vendors(id),
    selected_rate NUMERIC(12,2)
);

CREATE TABLE IF NOT EXISTS supplier_shortlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pr_id UUID REFERENCES purchase_requisitions(id),
    rfq_id UUID REFERENCES rfqs(id),
    quotation_id UUID REFERENCES vendor_quotations(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    selected_items JSONB,
    selected_amount NUMERIC(15,2) NOT NULL,
    selection_reason TEXT NOT NULL,
    approved_by VARCHAR(150),
    approval_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PURCHASE ORDER (PO) & PO VERSIONS
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    po_date DATE NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id),
    site_id UUID NOT NULL REFERENCES sites(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    pr_id UUID REFERENCES purchase_requisitions(id),
    rfq_id UUID REFERENCES rfqs(id),
    quotation_id UUID REFERENCES vendor_quotations(id),
    payment_terms TEXT,
    delivery_terms TEXT,
    delivery_address TEXT NOT NULL,
    expected_delivery_date DATE NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    remarks TEXT,
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    freight NUMERIC(12,2) DEFAULT 0,
    other_charges NUMERIC(12,2) DEFAULT 0,
    cgst NUMERIC(15,2) DEFAULT 0,
    sgst NUMERIC(15,2) DEFAULT 0,
    igst NUMERIC(15,2) DEFAULT 0,
    round_off NUMERIC(6,2) DEFAULT 0,
    grand_total NUMERIC(15,2) NOT NULL DEFAULT 0,
    advance_paid NUMERIC(15,2) DEFAULT 0,
    version INT DEFAULT 1,
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED', 'CANCELLED')),
    created_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    specification TEXT,
    quantity NUMERIC(12,2) NOT NULL,
    received_quantity NUMERIC(12,2) DEFAULT 0,
    billed_quantity NUMERIC(12,2) DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    rate NUMERIC(12,2) NOT NULL,
    discount_pct NUMERIC(5,2) DEFAULT 0,
    tax_pct NUMERIC(5,2) DEFAULT 18.00,
    amount NUMERIC(15,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_order_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    amendment_number VARCHAR(50) NOT NULL,
    amendment_reason TEXT NOT NULL,
    previous_snapshot JSONB NOT NULL,
    new_snapshot JSONB NOT NULL,
    changed_fields JSONB,
    amended_by VARCHAR(150) NOT NULL,
    amended_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. ADVANCE PAYMENTS
CREATE TABLE IF NOT EXISTS advance_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advance_number VARCHAR(50) UNIQUE NOT NULL,
    po_id UUID NOT NULL REFERENCES purchase_orders(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    amount NUMERIC(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'RTGS' CHECK (payment_mode IN ('RTGS', 'NEFT', 'CHEQUE', 'WIRE', 'CASH')),
    reference_number VARCHAR(100),
    bank_name VARCHAR(150),
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'PAID', 'ADJUSTED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. GOODS RECEIVED NOTE (GRN)
CREATE TABLE IF NOT EXISTS goods_received_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_number VARCHAR(50) UNIQUE NOT NULL,
    grn_date DATE NOT NULL,
    po_id UUID NOT NULL REFERENCES purchase_orders(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    site_id UUID NOT NULL REFERENCES sites(id),
    vehicle_number VARCHAR(50),
    delivery_challan VARCHAR(100) NOT NULL,
    challan_date DATE NOT NULL,
    received_by VARCHAR(150) NOT NULL,
    inspection_status VARCHAR(50) DEFAULT 'ACCEPTED' CHECK (inspection_status IN ('PENDING', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED')),
    remarks TEXT,
    total_amount NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_received_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grn_id UUID NOT NULL REFERENCES goods_received_notes(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    item_name VARCHAR(200) NOT NULL,
    ordered_quantity NUMERIC(12,2) NOT NULL,
    previously_received NUMERIC(12,2) DEFAULT 0,
    current_received NUMERIC(12,2) NOT NULL,
    accepted_quantity NUMERIC(12,2) NOT NULL,
    rejected_quantity NUMERIC(12,2) DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    rate NUMERIC(12,2) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    rejection_reason TEXT
);

-- 15. DEBIT NOTE
CREATE TABLE IF NOT EXISTS debit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debit_note_number VARCHAR(50) UNIQUE NOT NULL,
    debit_note_date DATE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    po_id UUID REFERENCES purchase_orders(id),
    grn_id UUID REFERENCES goods_received_notes(id),
    bill_id UUID,
    reason VARCHAR(100) NOT NULL CHECK (reason IN ('Short Supply', 'Quality Issue', 'Rate Difference', 'Damaged Material', 'Excess Billing', 'Rejection', 'Other')),
    amount NUMERIC(15,2) NOT NULL,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    total NUMERIC(15,2) NOT NULL,
    remarks TEXT,
    status VARCHAR(30) DEFAULT 'SUBMITTED' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'ADJUSTED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debit_note_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debit_note_id UUID NOT NULL REFERENCES debit_notes(id) ON DELETE CASCADE,
    item_name VARCHAR(200) NOT NULL,
    quantity NUMERIC(12,2) DEFAULT 1,
    unit VARCHAR(20),
    rate NUMERIC(12,2) NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    reason TEXT
);

-- 16. PURCHASE BILL & 3-WAY MATCHING
CREATE TABLE IF NOT EXISTS purchase_bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_number VARCHAR(50) UNIQUE NOT NULL,
    bill_date DATE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    po_id UUID NOT NULL REFERENCES purchase_orders(id),
    grn_id UUID NOT NULL REFERENCES goods_received_notes(id),
    project_id UUID NOT NULL REFERENCES projects(id),
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    invoice_amount NUMERIC(15,2) NOT NULL,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    discount NUMERIC(12,2) DEFAULT 0,
    other_charges NUMERIC(12,2) DEFAULT 0,
    net_payable NUMERIC(15,2) NOT NULL,
    matching_status VARCHAR(50) DEFAULT 'MATCHED' CHECK (matching_status IN ('MATCHED', 'QTY_MISMATCH', 'RATE_MISMATCH', 'TAX_MISMATCH', 'EXCESS_BILLING', 'REQUIRES_OVERRIDE')),
    matching_discrepancies JSONB,
    paid_amount NUMERIC(15,2) DEFAULT 0,
    adjusted_amount NUMERIC(15,2) DEFAULT 0,
    outstanding_amount NUMERIC(15,2) NOT NULL,
    is_financially_posted BOOLEAN DEFAULT FALSE,
    status VARCHAR(30) DEFAULT 'PENDING_APPROVAL' CHECK (status IN ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID', 'PARTIALLY_PAID', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_vendor_invoice UNIQUE (vendor_id, invoice_number)
);

CREATE TABLE IF NOT EXISTS purchase_bill_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES purchase_bills(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    item_name VARCHAR(200) NOT NULL,
    ordered_qty NUMERIC(12,2) NOT NULL,
    received_qty NUMERIC(12,2) NOT NULL,
    billed_qty NUMERIC(12,2) NOT NULL,
    po_rate NUMERIC(12,2) NOT NULL,
    billed_rate NUMERIC(12,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    amount NUMERIC(15,2) NOT NULL
);

-- 17. FINANCIAL POSTINGS (DOUBLE ENTRY VOUCHERS)
CREATE TABLE IF NOT EXISTS financial_postings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posting_number VARCHAR(50) UNIQUE NOT NULL,
    posting_date DATE NOT NULL,
    document_type VARCHAR(50) NOT NULL, -- 'PURCHASE_BILL', 'PAYMENT', 'DEBIT_NOTE'
    document_number VARCHAR(50) NOT NULL,
    project_id UUID REFERENCES projects(id),
    vendor_id UUID REFERENCES vendors(id),
    total_amount NUMERIC(15,2) NOT NULL,
    status VARCHAR(30) DEFAULT 'POSTED',
    created_by VARCHAR(150),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_posting_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    posting_id UUID NOT NULL REFERENCES financial_postings(id) ON DELETE CASCADE,
    account_name VARCHAR(150) NOT NULL,
    account_code VARCHAR(50),
    debit NUMERIC(15,2) DEFAULT 0,
    credit NUMERIC(15,2) DEFAULT 0,
    cost_code VARCHAR(50),
    remarks TEXT
);

-- 18. PAYMENTS & KNOCKOFFS
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    project_id UUID REFERENCES projects(id),
    amount NUMERIC(15,2) NOT NULL,
    payment_mode VARCHAR(50) DEFAULT 'RTGS',
    reference_number VARCHAR(100),
    bank_account VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knockoffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bill_id UUID NOT NULL REFERENCES purchase_bills(id),
    payment_id UUID REFERENCES payments(id),
    debit_note_id UUID REFERENCES debit_notes(id),
    advance_payment_id UUID REFERENCES advance_payments(id),
    allocated_amount NUMERIC(15,2) NOT NULL,
    knockoff_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. AUDIT LOGS, ATTACHMENTS, NOTIFICATIONS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(200) NOT NULL,
    user_name VARCHAR(150),
    user_role VARCHAR(50),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    record_id VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL, -- 'VENDOR', 'PR', 'PO', 'GRN', 'BILL', 'DEBIT_NOTE'
    entity_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(150),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_role VARCHAR(50),
    recipient_email VARCHAR(200),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    document_type VARCHAR(50),
    document_id VARCHAR(100),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
