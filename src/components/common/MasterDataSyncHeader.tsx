import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, UploadCloud, DownloadCloud, Code2, Check, AlertCircle, CheckCircle2, Copy, X } from 'lucide-react';
import { db } from '../../lib/db';
import { isSupabaseConfigured, supabaseUrl, checkTableStatus, subscribeToMasterTable, MasterTableName } from '../../lib/supabase';
import { useNotifications } from '../../contexts/NotificationContext';

interface MasterDataSyncHeaderProps {
  tableName: MasterTableName;
  title: string;
  totalRecords: number;
  onRefresh: () => void | Promise<void>;
}

export const MasterDataSyncHeader: React.FC<MasterDataSyncHeaderProps> = ({
  tableName,
  title,
  totalRecords,
  onRefresh,
}) => {
  const { showToast } = useNotifications();
  const [cloudStatus, setCloudStatus] = useState<{
    exists: boolean;
    count: number;
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const checkStatus = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      const res = await checkTableStatus(tableName);
      setCloudStatus({
        exists: res.exists,
        count: res.count,
        message: res.message,
      });
    } catch {
      setCloudStatus({ exists: false, count: 0, message: 'Status check failed' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();

    // Subscribe to realtime updates for this master table
    const unsubscribe = subscribeToMasterTable(tableName, () => {
      showToast(`Realtime update received from Supabase for ${title}!`, 'info');
      onRefresh();
      checkStatus();
    });

    return () => {
      unsubscribe();
    };
  }, [tableName]);

  const handlePushToCloud = async () => {
    setIsSyncing(true);
    try {
      const res = await db.syncAllMasterDataToSupabase();
      const tableRes = res.results[tableName];
      if (tableRes && !tableRes.error) {
        showToast(`Successfully synced ${tableRes.count} ${title} records to Supabase!`, 'success');
      } else if (tableRes?.error) {
        showToast(`Supabase sync note: ${tableRes.error}`, 'error');
      } else {
        showToast(`Master data sync completed to Supabase.`, 'success');
      }
      await onRefresh();
      await checkStatus();
    } catch (err: any) {
      showToast(err.message || 'Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setIsSyncing(true);
    try {
      await onRefresh();
      await checkStatus();
      showToast(`Pulled latest ${title} records from Supabase!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to pull data', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const copySqlMigration = () => {
    const sqlText = `-- CivProcure PostgreSQL Master Data Migration
-- Run in your Supabase SQL Editor:
-- File in workspace: /supabase/migrations/20260929000001_master_data_schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table definition for: ${tableName}
-- (Run the complete script in /supabase/migrations/20260929000001_master_data_schema.sql to create all tables & RLS policies at once)`;
    navigator.clipboard.writeText(sqlText);
    setCopied(true);
    showToast('SQL snippet copied to clipboard!', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyFullMasterSql = () => {
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

-- Enable RLS and add open access policies for web client
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
    showToast('Full Master Data SQL migration copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const projectDomain = supabaseUrl.replace('https://', '').split('.')[0] || 'fzcoetqhebjuhzvrefcc';

  return (
    <>
      <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/50 rounded-xl border border-blue-100 p-3 sm:p-3.5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status info */}
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-2xs shrink-0">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">
                  Supabase Cloud Connection: {title}
                </span>
                {cloudStatus?.exists ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                    Live Synced ({cloudStatus.count} in Supabase)
                  </span>
                ) : isSupabaseConfigured ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
                    Supabase Connected (Pending Migration)
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                    Local Storage Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Target table: <span className="font-mono text-blue-700 bg-blue-50 px-1 py-0.2 rounded font-semibold">{tableName}</span>
                {' · '}Project: <span className="font-mono text-slate-600">{projectDomain}</span>
                {' · '}Local Cache: <span className="font-semibold text-slate-700">{totalRecords} records</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handlePushToCloud}
              disabled={isSyncing}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              title="Upload and upsert current master records into Supabase cloud table"
            >
              <UploadCloud className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              Push to Cloud
            </button>

            <button
              onClick={handlePullFromCloud}
              disabled={isSyncing}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
              title="Pull latest live data from Supabase cloud database"
            >
              <DownloadCloud className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
              Pull from Cloud
            </button>

            <button
              onClick={() => setShowSqlModal(true)}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
              title="View or copy SQL schema for Supabase SQL Editor"
            >
              <Code2 className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              SQL Setup
            </button>
          </div>
        </div>
      </div>

      {/* SQL Migration Instructions Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">
                  Supabase Master Data Setup & Schema
                </h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 leading-relaxed">
                <p className="font-semibold mb-1">How to complete Supabase Master Data table setup:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Open your Supabase Dashboard: <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-mono">https://supabase.com/dashboard</a></li>
                  <li>Select your project (<code className="bg-blue-100 px-1 py-0.5 rounded font-mono">{projectDomain}</code>) and open the <strong>SQL Editor</strong>.</li>
                  <li>Click <strong>Copy Full Master Data SQL</strong> below, paste it into the editor, and click <strong>Run</strong>.</li>
                  <li>Return here and click <strong>Push to Cloud</strong> to seed all master records!</li>
                </ol>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700">Master Data Schema (All 7 Master Tables & RLS):</span>
                  <button
                    onClick={copyFullMasterSql}
                    className="inline-flex items-center px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Full Master Data SQL'}
                  </button>
                </div>
                <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono max-h-56 overflow-y-auto whitespace-pre leading-relaxed">
{`-- Run in Supabase SQL Editor:
-- Creates: projects, sites, vendors, items, cost_codes, terms, approval_matrix
-- With RLS policies for instant web access

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Projects
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

-- 2. Sites
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

-- (Click "Copy Full Master Data SQL" button above for the complete script with all tables & RLS)`}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowSqlModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Close
                </button>
                <button
                  onClick={copyFullMasterSql}
                  className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copy SQL Script
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
