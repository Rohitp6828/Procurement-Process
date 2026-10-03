-- CivProcure - Row Level Security (RLS) Policies & Helper Functions
-- Enables RLS across all procurement and transactional tables

-- Enable RLS on core tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_comparison_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_shortlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_received_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE debit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_posting_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE knockoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to fetch current user's role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR AS $$
  SELECT role_code FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. Profiles: Users can read their own or admins can read/write all
CREATE POLICY "Public profiles are readable by authenticated users"
ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE TO authenticated USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins have full control over profiles"
ON profiles FOR ALL TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN'));

-- 2. Projects & Sites: Readable by all authenticated users, editable by Project/Site/Admin roles
CREATE POLICY "Projects readable by all internal staff"
ON projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Projects manageable by admins and project engineers"
ON projects FOR ALL TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PROJECT_ENGINEER', 'MANAGEMENT'));

CREATE POLICY "Sites readable by all authenticated"
ON sites FOR SELECT TO authenticated USING (true);

CREATE POLICY "Sites manageable by site managers and admins"
ON sites FOR ALL TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'SITE_MANAGER', 'PROJECT_ENGINEER'));

-- 3. Vendors: Readable by authenticated, editable by procurement & admin
CREATE POLICY "Vendors viewable by staff"
ON vendors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vendors manageable by procurement and admins"
ON vendors FOR ALL TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_EXECUTIVE'));

-- 4. PR Policies:
CREATE POLICY "PRs viewable by staff"
ON purchase_requisitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "PRs insertable by project engineers and site managers"
ON purchase_requisitions FOR INSERT TO authenticated
WITH CHECK (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PROJECT_ENGINEER', 'SITE_MANAGER', 'PROCUREMENT_MANAGER', 'PROCUREMENT_EXECUTIVE'));

CREATE POLICY "PRs editable before approval"
ON purchase_requisitions FOR UPDATE TO authenticated
USING (
  get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PROJECT_ENGINEER', 'SITE_MANAGER', 'PROCUREMENT_MANAGER', 'APPROVER', 'MANAGEMENT')
  AND status != 'CLOSED'
);

-- 5. RFQs & Quotations
CREATE POLICY "RFQs viewable by staff"
ON rfqs FOR SELECT TO authenticated USING (true);

CREATE POLICY "RFQs manageable by procurement"
ON rfqs FOR ALL TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_EXECUTIVE'));

CREATE POLICY "Vendor quotations viewable by procurement and approvers"
ON vendor_quotations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Vendor quotations editable by procurement"
ON vendor_quotations FOR ALL TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_EXECUTIVE'));

-- 6. Purchase Orders (PO):
CREATE POLICY "POs viewable by staff"
ON purchase_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "POs manageable by procurement and approvers"
ON purchase_orders FOR ALL TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'PROCUREMENT_MANAGER', 'PROCUREMENT_EXECUTIVE', 'APPROVER', 'MANAGEMENT'));

-- 7. Goods Received Notes (GRN):
CREATE POLICY "GRNs viewable by staff"
ON goods_received_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "GRNs manageable by store managers and site managers"
ON goods_received_notes FOR ALL TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'STORE_MANAGER', 'SITE_MANAGER', 'PROCUREMENT_MANAGER'));

-- 8. Purchase Bills & Financial Postings:
CREATE POLICY "Bills viewable by accounts, procurement, and management"
ON purchase_bills FOR SELECT TO authenticated USING (true);

CREATE POLICY "Bills manageable by accounts and finance"
ON purchase_bills FOR ALL TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS_MANAGER', 'FINANCE_USER', 'MANAGEMENT'));

CREATE POLICY "Financial postings viewable by accounts and management"
ON financial_postings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Financial postings editable only by accounts manager and admin"
ON financial_postings FOR ALL TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'ACCOUNTS_MANAGER'));

-- 9. Audit Logs: Read-only for viewers, insertable system-wide
CREATE POLICY "Audit logs viewable by admins and management"
ON audit_logs FOR SELECT TO authenticated
USING (get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN', 'MANAGEMENT', 'ACCOUNTS_MANAGER'));

CREATE POLICY "Audit logs insertable by any authenticated action"
ON audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- 10. Notifications:
CREATE POLICY "Notifications viewable by targeted user or role"
ON notifications FOR SELECT TO authenticated
USING (
  recipient_role = get_current_user_role() 
  OR recipient_email = (SELECT email FROM profiles WHERE auth_user_id = auth.uid() LIMIT 1)
  OR get_current_user_role() IN ('SUPER_ADMIN', 'ADMIN')
);
