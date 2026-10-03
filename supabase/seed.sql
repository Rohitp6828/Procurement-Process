-- CivProcure - Comprehensive Seed Data
-- Realistic Civil Construction Projects, Vendors, Items, and Full Procurement Cycle

-- 1. ROLES
INSERT INTO roles (code, name, description) VALUES
('SUPER_ADMIN', 'Super Administrator', 'Full unrestricted enterprise control'),
('ADMIN', 'Administrator', 'Administrative system control and configuration'),
('PROJECT_ENGINEER', 'Project Engineer', 'Project planning, indenting, PR creation'),
('SITE_MANAGER', 'Site Manager', 'Site management, PR submission, initial inspection'),
('PROCUREMENT_MANAGER', 'Procurement Manager', 'Vendor shortlisting, RFQ, PO approval'),
('PROCUREMENT_EXECUTIVE', 'Procurement Executive', 'Quotation collation, PO generation'),
('STORE_MANAGER', 'Store Manager', 'Material receipt, GRN creation, inspection'),
('ACCOUNTS_MANAGER', 'Accounts Manager', 'Bill approval, financial posting, payments'),
('FINANCE_USER', 'Finance User', 'Payment entry, reconciliation, knockoff'),
('APPROVER', 'General Approver', 'Tiered workflow authorizations'),
('MANAGEMENT', 'Executive Management', 'Strategic oversight, high-value approvals, reports'),
('VIEWER', 'Auditor / Viewer', 'Read-only access to records and reports')
ON CONFLICT (code) DO NOTHING;

-- 2. MASTER: UNITS
INSERT INTO units (code, name) VALUES
('Nos', 'Numbers'),
('Kg', 'Kilograms'),
('MT', 'Metric Tonnes'),
('Cum', 'Cubic Metres'),
('Sqm', 'Square Metres'),
('Sqft', 'Square Feet'),
('Ltr', 'Litres'),
('Bag', 'Bags (50 Kg)'),
('Box', 'Boxes'),
('Set', 'Sets'),
('Day', 'Days'),
('Month', 'Months')
ON CONFLICT (code) DO NOTHING;

-- 3. MASTER: TAX RATES
INSERT INTO tax_rates (code, percentage, description) VALUES
('GST_0', 0.00, 'Exempted / Nil Rate'),
('GST_5', 5.00, '5% Goods & Services Tax'),
('GST_12', 12.00, '12% Goods & Services Tax'),
('GST_18', 18.00, '18% Standard GST Rate'),
('GST_28', 28.00, '28% Peak GST Rate')
ON CONFLICT (code) DO NOTHING;

-- 4. MASTER: COST CODES
INSERT INTO cost_codes (code, description, category) VALUES
('CC-CIVIL-01', 'Substructure & Foundation Concrete', 'CIVIL'),
('CC-CIVIL-02', 'Superstructure RCC & Reinforcement', 'CIVIL'),
('CC-CIVIL-03', 'Masonry & Plastering Works', 'CIVIL'),
('CC-MEP-01', 'Primary Electrical Conduits & Cables', 'MEP'),
('CC-MEP-02', 'Plumbing, Drainage & Sanitary Fitting', 'MEP'),
('CC-FIN-01', 'Flooring, Tiling & Cladding', 'FINISHING')
ON CONFLICT (code) DO NOTHING;

-- 5. MASTER: ITEM CATEGORIES
INSERT INTO item_categories (id, code, name, description) VALUES
('11111111-1111-1111-1111-111111111101', 'CIVIL', 'Civil & Structural Materials', 'Cement, Steel, Aggregates, Sand, Bricks'),
('11111111-1111-1111-1111-111111111102', 'MEP', 'Mechanical, Electrical & Plumbing', 'Conduits, Cables, SWR Pipes, Valves'),
('11111111-1111-1111-1111-111111111103', 'FINISHING', 'Finishing Materials', 'Vitrified tiles, paints, hardware'),
('11111111-1111-1111-1111-111111111104', 'CHEMICALS', 'Construction Chemicals', 'Superplasticizers, waterproof admixtures, curing agents')
ON CONFLICT (code) DO NOTHING;

-- 6. MASTER: ITEMS
INSERT INTO items (id, item_code, item_name, category_name, description, specification, unit, hsn_sac, gst_rate, standard_rate, reorder_level) VALUES
('22222222-2222-2222-2222-222222222201', 'ITM-CEM-01', 'Cement OPC 53 Grade', 'Civil & Structural Materials', 'UltraTech 53 Grade Ordinary Portland Cement', 'IS 269:2015 certified 50kg tamper-proof bags', 'Bag', '25232910', 28.00, 360.00, 500.00),
('22222222-2222-2222-2222-222222222202', 'ITM-STL-01', 'TMT Steel Rebars Fe 550D', 'Civil & Structural Materials', 'Tata Tiscon High Ductility Fe 550D 16mm', 'IS 1786 grade, corrosion resistant, standard lengths', 'MT', '72142090', 18.00, 64500.00, 20.00),
('22222222-2222-2222-2222-222222222203', 'ITM-SND-01', 'River Sand (Coarse Zone II)', 'Civil & Structural Materials', 'Washed natural river sand for RCC work', 'Zone II silt content < 3%', 'Cum', '25051000', 5.00, 1850.00, 100.00),
('22222222-2222-2222-2222-222222222204', 'ITM-AGG-01', 'Aggregate 20mm Blue Metal', 'Civil & Structural Materials', 'Machine crushed blue granite stone aggregate', 'Angular aggregate conforming to IS 383', 'Cum', '25171010', 5.00, 1200.00, 150.00),
('22222222-2222-2222-2222-222222222205', 'ITM-BRK-01', 'Wire-Cut Red Clay Bricks', 'Civil & Structural Materials', 'First class machine wire-cut burnt clay bricks', 'Crushing strength > 10.5 N/mm2, water absorption < 15%', 'Nos', '69010010', 12.00, 9.50, 10000.00),
('22222222-2222-2222-2222-222222222206', 'ITM-ELC-01', 'Electrical Armoured Cable 4C 16 sqmm', 'Mechanical, Electrical & Plumbing', 'Polycab XLPE Aluminium Armoured 1.1kV Cable', 'Conforming to IS 7098 Part 1', 'Mtr', '85444999', 18.00, 420.00, 200.00),
('22222222-2222-2222-2222-222222222207', 'ITM-PIP-01', 'PVC SWR Drainage Pipe 110mm', 'Mechanical, Electrical & Plumbing', 'Supreme Type B Ring-Fit 110mm 3m length', 'Conforming to IS 13592', 'Nos', '39172310', 18.00, 880.00, 50.00),
('22222222-2222-2222-2222-222222222208', 'ITM-TLE-01', 'Vitrified Floor Tiles 600x600mm', 'Finishing Materials', 'Kajaria Double Charged Vitrified Tiles Matt Finish', 'Grade 1 frost and stain resistant', 'Sqm', '69072100', 18.00, 650.00, 300.00),
('22222222-2222-2222-2222-222222222209', 'ITM-CHM-01', 'Concrete Superplasticizer Admixture', 'Construction Chemicals', 'Fosroc Conplast SP430 high range water reducer', 'Conforming to IS 9103 and ASTM C494 Type F', 'Ltr', '38244010', 18.00, 115.00, 400.00)
ON CONFLICT (item_code) DO NOTHING;

-- 7. MASTER: PROJECTS & SITES
INSERT INTO projects (id, project_code, project_name, client_name, project_type, location, start_date, end_date, project_manager, budget, status) VALUES
('33333333-3333-3333-3333-333333333301', 'PRJ-HWY-01', 'Highway Construction Project', 'National Highways Authority', 'Infrastructure - Expressways', 'Sector 82, Expressway Corridor, Pune', '2026-01-10', '2027-12-31', 'Vikramaditya Sharma', 85000000.00, 'ACTIVE'),
('33333333-3333-3333-3333-333333333302', 'PRJ-TWR-02', 'Residential Tower Project', 'Skyline Infra Developers', 'High-Rise Residential (G+32)', 'Plot 4A, Baner Hilltop, Pune', '2025-08-15', '2027-06-30', 'Ananya Deshmukh', 42000000.00, 'ACTIVE'),
('33333333-3333-3333-3333-333333333303', 'PRJ-BLD-03', 'Commercial Building Project', 'Apex Tech Parks Ltd', 'Commercial IT Park Complex', 'SEZ Tech Zone, Hinjewadi, Pune', '2026-02-01', '2028-01-31', 'Rajesh Kulkarni', 68000000.00, 'ACTIVE')
ON CONFLICT (project_code) DO NOTHING;

INSERT INTO sites (id, project_id, site_code, site_name, site_address, site_manager, contact_number, status) VALUES
('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 'SIT-HWY-NTH', 'Highway North Interchange Site', 'Km 42+500 Chakan Junction, Pune', 'Manoj Patil', '+91 98220 11223', 'ACTIVE'),
('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333302', 'SIT-TWR-T1', 'Tower A & B Foundation Site', 'Survey 104, Pan Card Club Road, Baner', 'Suresh Joshi', '+91 98220 44556', 'ACTIVE'),
('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333303', 'SIT-BLD-PH1', 'Commercial Podium & Basements Site', 'Phase 3 Hinjewadi IT Park, Pune', 'Deepak Verma', '+91 98220 77889', 'ACTIVE')
ON CONFLICT (site_code) DO NOTHING;

-- 8. MASTER: VENDORS
INSERT INTO vendors (id, vendor_code, vendor_name, vendor_type, gst_number, pan_number, contact_person, mobile, email, address, state, city, pincode, bank_name, account_number, ifsc, payment_terms, credit_days, vendor_rating, status) VALUES
('55555555-5555-5555-5555-555555555501', 'VND-001', 'ABC Cement Suppliers', 'MANUFACTURER', '27AABCU9603R1ZM', 'AABCU9603R', 'Arvind Singhania', '+91 98231 00112', 'arvind@abccement.com', 'Industrial Area Phase 2, Hadapsar', 'Maharashtra', 'Pune', '411028', 'HDFC Bank', '50200048192019', 'HDFC0000180', '30 Days Net', 30, 4.80, 'ACTIVE'),
('55555555-5555-5555-5555-555555555502', 'VND-002', 'XYZ Steel Traders', 'DISTRIBUTOR', '27AAACX8812K1ZT', 'AAACX8812K', 'Gaurav Agarwal', '+91 98232 44332', 'sales@xyzsteel.com', 'Steel Yard Market, Kalamboli', 'Maharashtra', 'Navi Mumbai', '410218', 'ICICI Bank', '004705008912', 'ICIC0000047', '15 Days Net', 15, 4.70, 'ACTIVE'),
('55555555-5555-5555-5555-555555555503', 'VND-003', 'National Electricals', 'DEALER', '27AABCN5541L1Z9', 'AABCN5541L', 'Sunil Mehta', '+91 98233 77665', 'contact@nationalelec.in', 'Budhwar Peth Electrical Market', 'Maharashtra', 'Pune', '411002', 'State Bank of India', '38920192841', 'SBIN0000455', '30 Days Net', 30, 4.30, 'ACTIVE'),
('55555555-5555-5555-5555-555555555504', 'VND-004', 'Prime Plumbing Solutions', 'SUPPLIER', '27AABCP3319M1Z4', 'AABCP3319M', 'Ramesh Jadhav', '+91 98234 99887', 'ramesh@primeplumb.in', 'Ganga Dham Commercial Complex, Market Yard', 'Maharashtra', 'Pune', '411037', 'Axis Bank', '918020038472918', 'UTIB0000212', '45 Days Net', 45, 4.50, 'ACTIVE')
ON CONFLICT (vendor_code) DO NOTHING;

-- 9. MASTER: APPROVAL MATRIX (Configurable threshold tiers)
INSERT INTO approval_matrix (module, min_amount, max_amount, approval_level, required_role) VALUES
('PR', 0.00, 50000.00, 1, 'SITE_MANAGER'),
('PR', 50001.00, 500000.00, 2, 'PROCUREMENT_MANAGER'),
('PR', 500001.00, 2500000.00, 3, 'PROJECT_ENGINEER'),
('PR', 2500001.00, 999999999.00, 4, 'MANAGEMENT'),
('PO', 0.00, 100000.00, 1, 'PROCUREMENT_MANAGER'),
('PO', 100001.00, 1000000.00, 2, 'APPROVER'),
('PO', 1000001.00, 999999999.00, 3, 'MANAGEMENT'),
('GRN', 0.00, 999999999.00, 1, 'STORE_MANAGER'),
('BILL', 0.00, 500000.00, 1, 'ACCOUNTS_MANAGER'),
('BILL', 500001.00, 999999999.00, 2, 'MANAGEMENT')
ON CONFLICT DO NOTHING;
