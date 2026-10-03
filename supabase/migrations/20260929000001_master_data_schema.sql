-- CivProcure Master Data PostgreSQL Schema & RLS Setup
-- Run this in your Supabase SQL Editor to enable all Master Data cloud persistence.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Projects Master
CREATE TABLE IF NOT EXISTS public.projects (
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
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Sites Master
CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    site_code VARCHAR(50) UNIQUE NOT NULL,
    site_name VARCHAR(200) NOT NULL,
    site_address TEXT NOT NULL,
    site_manager VARCHAR(150),
    contact_number VARCHAR(20),
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vendors Master
CREATE TABLE IF NOT EXISTS public.vendors (
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
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Items Master
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(200) NOT NULL,
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

-- 5. Cost Codes Master
CREATE TABLE IF NOT EXISTS public.cost_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Terms Master
CREATE TABLE IF NOT EXISTS public.terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_type VARCHAR(50) NOT NULL,
    term_title VARCHAR(200) NOT NULL,
    term_content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Approval Matrix Master
CREATE TABLE IF NOT EXISTS public.approval_matrix (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,
    min_amount NUMERIC(15,2) DEFAULT 0,
    max_amount NUMERIC(15,2) DEFAULT 999999999,
    approval_level INT NOT NULL,
    required_role VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Configuration
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_matrix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon and auth read-write for projects" ON public.projects;
CREATE POLICY "Allow anon and auth read-write for projects" ON public.projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth read-write for sites" ON public.sites;
CREATE POLICY "Allow anon and auth read-write for sites" ON public.sites FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth read-write for vendors" ON public.vendors;
CREATE POLICY "Allow anon and auth read-write for vendors" ON public.vendors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth read-write for items" ON public.items;
CREATE POLICY "Allow anon and auth read-write for items" ON public.items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth read-write for cost_codes" ON public.cost_codes;
CREATE POLICY "Allow anon and auth read-write for cost_codes" ON public.cost_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth read-write for terms" ON public.terms;
CREATE POLICY "Allow anon and auth read-write for terms" ON public.terms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon and auth read-write for approval_matrix" ON public.approval_matrix;
CREATE POLICY "Allow anon and auth read-write for approval_matrix" ON public.approval_matrix FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
