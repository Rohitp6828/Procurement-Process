import React, { useState, useEffect } from 'react';
import { Database, CheckCircle, AlertCircle, Copy, Check, RefreshCw, X, UploadCloud, DownloadCloud, Code2, Server } from 'lucide-react';
import { testSupabaseConnection, isSupabaseConfigured, supabaseUrl, checkAllMasterTables, MasterTableName, TableStatus } from '../../lib/supabase';
import { db } from '../../lib/db';
import { useNotifications } from '../../contexts/NotificationContext';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useNotifications();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'sql' | 'sync'>('tables');
  const [tableStatuses, setTableStatuses] = useState<Record<MasterTableName, TableStatus> | null>(null);
  const [checkingTables, setCheckingTables] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadTableStatuses = async () => {
    if (!isSupabaseConfigured) return;
    setCheckingTables(true);
    try {
      const res = await checkAllMasterTables();
      setTableStatuses(res);
    } catch (err: any) {
      console.warn('Failed to load table statuses:', err);
    } finally {
      setCheckingTables(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTableStatuses();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
      if (res.success) {
        showToast('Connected to Supabase PostgreSQL database!', 'success');
      } else {
        showToast(res.message, 'error');
      }
      await loadTableStatuses();
    } finally {
      setTesting(false);
    }
  };

  const handlePushAll = async () => {
    setSyncing(true);
    try {
      const res = await db.syncAllMasterDataToSupabase();
      if (res.success) {
        showToast('All Master Data successfully synced to Supabase!', 'success');
      } else {
        const errors = Object.entries(res.results)
          .filter(([_, v]) => v.error)
          .map(([k, v]) => `${k}: ${v.error}`)
          .join(', ');
        showToast(`Sync completed with notes: ${errors || 'Tables pending migration in Supabase'}`, 'info');
      }
      await loadTableStatuses();
    } catch (err: any) {
      showToast(err.message || 'Bulk sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handlePullAll = async () => {
    setSyncing(true);
    try {
      await db.syncAllMasterDataFromSupabase();
      showToast('Master Data successfully refreshed from Supabase!', 'success');
      await loadTableStatuses();
    } catch (err: any) {
      showToast(err.message || 'Bulk pull failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyMigrations = () => {
    const fullSql = `-- CivProcure Complete Master Data Schema & RLS Setup
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

-- Enable RLS and add public access policies for web app client
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read-write for projects" ON public.projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for sites" ON public.sites FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for vendors" ON public.vendors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for items" ON public.items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for cost_codes" ON public.cost_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for terms" ON public.terms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for approval_matrix" ON public.approval_matrix FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
`;
    navigator.clipboard.writeText(fullSql);
    setCopied(true);
    showToast('Complete Master Data SQL script copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const projectDomain = supabaseUrl.replace('https://', '').split('.')[0] || 'fzcoetqhebjuhzvrefcc';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                Supabase Master Data & Database Status
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Project: {projectDomain}.supabase.co
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('tables')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'tables'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Master Data Tables ({tableStatuses ? (Object.values(tableStatuses) as TableStatus[]).filter(t => t.exists).length : 0}/7 Synced)
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'sync'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Cloud Bulk Sync & Backup
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === 'sql'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            SQL Migration Scripts
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Tab 1: Master Tables Status */}
          {activeTab === 'tables' && (
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 rounded-lg bg-blue-50/60 border border-blue-100">
                <div className="p-2 rounded-full bg-blue-100 text-blue-600 shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">
                    Live Master Data Synchronization Engine
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    All 7 Master Data entities (Projects, Sites, Vendors, Items, Cost Codes, Terms, Approval Matrix) are connected to Supabase with real-time listeners and instant local caching.
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Master Data Tables Status in Supabase:</span>
                  <button
                    onClick={loadTableStatuses}
                    disabled={checkingTables}
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${checkingTables ? 'animate-spin' : ''}`} />
                    Refresh Status
                  </button>
                </div>

                <div className="divide-y divide-slate-100 text-xs">
                  {[
                    { key: 'projects', label: 'Projects Master', desc: 'Budgets, locations, project managers' },
                    { key: 'sites', label: 'Site Management', desc: 'Site addresses, site managers, contacts' },
                    { key: 'vendors', label: 'Vendor Master', desc: 'GST, bank accounts, ratings, credit terms' },
                    { key: 'items', label: 'Item & Specs Master', desc: 'UOM, HSN codes, GST rates, reorder levels' },
                    { key: 'cost_codes', label: 'Cost Codes & WBS', desc: 'Work breakdown structures and budget codes' },
                    { key: 'terms', label: 'Terms Master', desc: 'Commercial clauses, delivery & warranty rules' },
                    { key: 'approval_matrix', label: 'Approval Matrix', desc: 'Tiered role authorization thresholds' },
                  ].map(t => {
                    const st = tableStatuses ? tableStatuses[t.key as MasterTableName] : null;
                    return (
                      <div key={t.key} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50">
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center space-x-2">
                            <span>{t.label}</span>
                            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-normal">
                              {t.key}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{t.desc}</div>
                        </div>
                        <div className="text-right">
                          {checkingTables ? (
                            <span className="text-slate-400 text-xs">Checking...</span>
                          ) : st?.exists ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                              {st.count} rows synced
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                              Pending Migration
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Bulk Sync */}
          {activeTab === 'sync' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <h4 className="font-bold text-slate-800">Master Data Cloud Synchronization</h4>
                <p className="text-slate-600 leading-relaxed">
                  Use these bulk sync actions to keep your live Supabase cloud database and local ERP cache completely synchronized.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                    <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <UploadCloud className="w-4 h-4 text-blue-600" />
                      <span>Push All to Supabase</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Uploads and upserts all projects, sites, vendors, items, cost codes, terms, and approval matrices to the cloud database.
                    </p>
                    <button
                      onClick={handlePushAll}
                      disabled={syncing}
                      className="w-full mt-2 inline-flex items-center justify-center px-3 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      <UploadCloud className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-bounce' : ''}`} />
                      {syncing ? 'Syncing...' : 'Push All Master Data'}
                    </button>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-2">
                    <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <DownloadCloud className="w-4 h-4 text-emerald-600" />
                      <span>Pull All from Supabase</span>
                    </div>
                    <p className="text-slate-500 text-[11px]">
                      Fetches latest live records from the Supabase PostgreSQL database and refreshes local ERP memory.
                    </p>
                    <button
                      onClick={handlePullAll}
                      disabled={syncing}
                      className="w-full mt-2 inline-flex items-center justify-center px-3 py-2 text-xs font-semibold rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <DownloadCloud className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      {syncing ? 'Pulling...' : 'Pull All Master Data'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: SQL Migration */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 text-xs text-blue-900 leading-relaxed space-y-1.5">
                <div className="font-bold">Instructions to run in Supabase SQL Editor:</div>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Open Supabase Dashboard: <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-mono">https://supabase.com/dashboard</a></li>
                  <li>Click on your project (<code className="font-mono bg-blue-100 px-1 py-0.2 rounded">{projectDomain}</code>) &gt; <strong>SQL Editor</strong></li>
                  <li>Click "Copy Full Master Data SQL" below, paste and click <strong>Run</strong>.</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700">Schema File: supabase/migrations/20260929000001_master_data_schema.sql</span>
                  <button
                    onClick={handleCopyMigrations}
                    className="inline-flex items-center px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Full SQL'}
                  </button>
                </div>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono max-h-60 overflow-y-auto whitespace-pre leading-relaxed">
{`-- CivProcure Master Data PostgreSQL Schema & RLS Setup
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE IF NOT EXISTS public.cost_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_type VARCHAR(50) NOT NULL,
    term_title VARCHAR(200) NOT NULL,
    term_content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE POLICY "Allow anon read-write for projects" ON public.projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for sites" ON public.sites FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for vendors" ON public.vendors FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for items" ON public.items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for cost_codes" ON public.cost_codes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for terms" ON public.terms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon read-write for approval_matrix" ON public.approval_matrix FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);`}
                </div>
              </div>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="font-semibold">{testResult.success ? 'Connection Verified' : 'Connection Notice'}</div>
              <div className="mt-0.5">{testResult.message}</div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              onClick={handleCopyMigrations}
              className="inline-flex items-center px-3 py-2 border border-slate-300 shadow-xs text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50"
            >
              {copied ? <Check className="w-4 h-4 mr-1.5 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1.5 text-slate-500" />}
              {copied ? 'Copied!' : 'Copy SQL Schema'}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center px-3.5 py-2 border border-slate-200 shadow-xs text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Testing...' : 'Test Connection'}
              </button>

              <button
                onClick={handlePushAll}
                disabled={syncing}
                className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                Sync Master Data Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
