import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Send, FileText, CheckCircle2, Users, Calendar, Eye, MapPin, MessageSquare, Sparkles, Building, ArrowRight, ShieldCheck } from 'lucide-react';
import { db } from '../../lib/db';
import { RequestForQuotation, PurchaseRequisition, Vendor, Project, Site, TermItem } from '../../types';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { DocumentTimeline } from '../../components/common/DocumentTimeline';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export const RFQPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { showToast } = useNotifications();

  const [rfqs, setRfqs] = useState<RequestForQuotation[]>([]);
  const [prs, setPrs] = useState<PurchaseRequisition[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickVendorOpen, setIsQuickVendorOpen] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<RequestForQuotation | null>(null);

  // Quick Vendor Form State
  const [newVendorData, setNewVendorData] = useState({
    vendor_name: '',
    vendor_type: 'MANUFACTURER',
    gst_number: '',
    mobile: '',
    email: '',
    city: 'Mumbai',
    state: 'Maharashtra',
  });

  // Form State
  const [formData, setFormData] = useState({
    rfq_number: '',
    rfq_date: new Date().toISOString().split('T')[0],
    pr_id: '',
    project_id: '',
    site_id: '',
    submission_deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    delivery_location: '',
    commercial_terms: 'Payment: 30 Days after 3-way matching. Unloading at supplier scope.',
    selected_vendor_ids: [] as string[],
  });

  const loadData = async () => {
    const [rfqList, prList, vendList, projList, siteList, termList] = await Promise.all([
      db.getRFQs(),
      db.getPRs(),
      db.getVendors(),
      db.getProjects(),
      db.getSites(),
      db.getTerms(),
    ]);
    setRfqs(rfqList);
    setPrs(prList.filter(p => ['APPROVED', 'PARTIALLY_ORDERED'].includes(p.status)));
    setVendors(vendList);
    setProjects(projList);
    setSites(siteList);
    setTerms(termList);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen to ?from_pr=... parameter
  useEffect(() => {
    const fromPrId = searchParams.get('from_pr');
    if (fromPrId && prs.length > 0) {
      const match = prs.find(p => p.id === fromPrId);
      if (match) {
        handleOpenCreate(match);
      }
    }
  }, [searchParams, prs]);

  const handleOpenCreate = (targetPrOverride?: PurchaseRequisition) => {
    const targetPr = targetPrOverride || prs[0];
    const defaultProj = projects.find(p => p.id === targetPr?.project_id) || projects[0];
    const defaultSite = sites.find(s => s.id === targetPr?.site_id) || sites[0];

    const prSpecsNote = targetPr?.items?.map(it => `${it.item_name} (${it.quantity} ${it.uom}): ${it.specifications || 'Standard IS specification'}`).join('\n') || '';

    setFormData({
      rfq_number: `RFQ-2026-${(rfqs.length + 1).toString().padStart(4, '0')}`,
      rfq_date: new Date().toISOString().split('T')[0],
      pr_id: targetPr?.id || '',
      project_id: targetPr?.project_id || defaultProj?.id || '',
      site_id: targetPr?.site_id || defaultSite?.id || '',
      submission_deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      delivery_location: defaultSite?.site_address || 'Project Central Warehouse',
      commercial_terms: prSpecsNote ? `Technical Requirements:\n${prSpecsNote}\n\nCommercial Terms: Payment strictly within 30 days of 3-way matching. Unloading at supplier scope.` : 'Strict test certificates conforming to IS standards must be attached with quote. Payment within 30 days of GRN.',
      selected_vendor_ids: vendors.slice(0, 3).map(v => v.id),
    });
    setIsModalOpen(true);
  };

  const handleQuickAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorData.vendor_name) {
      showToast('Vendor Name is required', 'error');
      return;
    }
    try {
      const nextCode = `VND-${(vendors.length + 1).toString().padStart(3, '0')}`;
      const newV: Vendor = {
        id: `vnd-${Date.now()}`,
        vendor_code: nextCode,
        vendor_name: newVendorData.vendor_name,
        vendor_type: newVendorData.vendor_type,
        gst_number: newVendorData.gst_number || '27AABCV0000A1Z0',
        pan_number: 'AABCV0000A',
        contact_person: 'Procurement Contact',
        mobile: newVendorData.mobile || '+91 98000 00000',
        email: newVendorData.email || 'info@supplier.com',
        address: 'Industrial Area',
        state: newVendorData.state,
        city: newVendorData.city,
        pincode: '400001',
        bank_name: 'HDFC Bank',
        account_number: '50200000000',
        ifsc: 'HDFC0000123',
        payment_terms: '30 Days Net',
        credit_days: 30,
        vendor_rating: 4.5,
        status: 'ACTIVE',
      };
      await db.saveVendor(newV);
      showToast(`Supplier ${newV.vendor_name} registered!`, 'success');
      setVendors(prev => [...prev, newV]);
      setFormData(prev => ({
        ...prev,
        selected_vendor_ids: [...prev.selected_vendor_ids, newV.id],
      }));
      setIsQuickVendorOpen(false);
      setNewVendorData({
        vendor_name: '',
        vendor_type: 'MANUFACTURER',
        gst_number: '',
        mobile: '',
        email: '',
        city: 'Mumbai',
        state: 'Maharashtra',
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to add vendor', 'error');
    }
  };

  const handleInsertClause = (clauseText: string) => {
    setFormData(prev => ({
      ...prev,
      commercial_terms: prev.commercial_terms ? `${prev.commercial_terms}\n• ${clauseText}` : `• ${clauseText}`,
    }));
    showToast('Commercial clause inserted into RFQ terms', 'info');
  };

  const handleToggleVendor = (id: string) => {
    setFormData(prev => {
      const exists = prev.selected_vendor_ids.includes(id);
      return {
        ...prev,
        selected_vendor_ids: exists
          ? prev.selected_vendor_ids.filter(vId => vId !== id)
          : [...prev.selected_vendor_ids, id],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selected_vendor_ids.length === 0) {
      showToast('Select at least one vendor to solicit quotations from.', 'error');
      return;
    }

    const linkedPr = prs.find(p => p.id === formData.pr_id);
    const proj = projects.find(p => p.id === formData.project_id);
    const site = sites.find(s => s.id === formData.site_id);

    const rfqId = `rfq-${Date.now()}`;
    const rfqPayload: RequestForQuotation = {
      id: rfqId,
      rfq_number: formData.rfq_number,
      rfq_date: formData.rfq_date,
      pr_id: formData.pr_id,
      pr_number: linkedPr?.pr_number,
      project_id: formData.project_id,
      project_name: proj?.project_name,
      site_id: formData.site_id,
      site_name: site?.site_name,
      submission_deadline: formData.submission_deadline,
      delivery_location: formData.delivery_location,
      commercial_terms: formData.commercial_terms,
      status: 'SENT',
      created_by_id: user.id,
      created_by_name: user.full_name,
      vendors: formData.selected_vendor_ids.map(vId => {
        const v = vendors.find(x => x.id === vId);
        return {
          id: `rfqv-${Date.now()}-${vId}`,
          rfq_id: rfqId,
          vendor_id: vId,
          vendor_name: v?.vendor_name,
          has_responded: false,
        };
      }),
      items: linkedPr?.items?.map(it => ({
        id: `rfqi-${it.id}`,
        rfq_id: rfqId,
        item_id: it.item_id,
        item_name: it.item_name,
        uom: it.uom,
        quantity: it.quantity,
        target_rate: it.estimated_rate,
      })) || [],
      created_at: new Date().toISOString(),
    };

    await db.saveRFQ(rfqPayload);
    showToast(`RFQ ${rfqPayload.rfq_number} dispatched to ${formData.selected_vendor_ids.length} suppliers!`, 'success');
    setIsModalOpen(false);
    loadData();
  };

  const filtered = rfqs.filter(
    r =>
      r.rfq_number.toLowerCase().includes(search.toLowerCase()) ||
      r.project_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.pr_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Request for Quotation (RFQ)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Solicit commercial proposals from empanelled suppliers against approved purchase indents.
          </p>
        </div>
        {hasPermission('RFQ', 'CREATE') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Issue New RFQ
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search RFQ, indent reference, project..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total RFQs: <span className="font-bold text-slate-800">{filtered.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">RFQ Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Linked Indent (PR)</th>
                <th className="px-4 py-3">Project & Site</th>
                <th className="px-4 py-3">Invited Suppliers</th>
                <th className="px-4 py-3">Submission Deadline</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{r.rfq_number}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(r.rfq_date)}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{r.pr_number || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{r.project_name}</div>
                    <div className="text-[11px] text-slate-400">{r.site_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium text-slate-800">{r.vendors?.length || 0} Vendors</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{formatDate(r.submission_deadline)}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      onClick={() => navigate(`/procurement/quotations?rfq_id=${r.id}`)}
                      className="p-1 rounded-md text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      title="Enter / Record Supplier Quotation"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedRfq(r)}
                      className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                      title="Inspect RFQ"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RFQ Detail Modal */}
      {selectedRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                RFQ Scope & Invited Vendors: {selectedRfq.rfq_number}
              </h3>
              <button onClick={() => setSelectedRfq(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block">Project / Site</span>
                  <span className="font-semibold text-slate-800">{selectedRfq.project_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Submission Due</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedRfq.submission_deadline)}</span>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Invited Supplier Roster</span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {selectedRfq.vendors?.map(v => (
                    <div key={v.id} className="p-2.5 flex items-center justify-between">
                      <span className="font-medium text-slate-800">{v.vendor_name}</span>
                      <span className="text-[11px] text-blue-600 font-mono">Quotation Awaited</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Commercial Specifications</span>
                <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {selectedRfq.commercial_terms}
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedRfq(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create RFQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-800">
                Generate Request for Quotation (RFQ)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">RFQ Number</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.rfq_number}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Select Approved Indent (PR) *</label>
                  <select
                    required
                    value={formData.pr_id}
                    onChange={e => {
                      const pr = prs.find(p => p.id === e.target.value);
                      setFormData({
                        ...formData,
                        pr_id: e.target.value,
                        project_id: pr?.project_id || formData.project_id,
                        site_id: pr?.site_id || formData.site_id,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-blue-600"
                  >
                    <option value="">-- Choose PR Indent --</option>
                    {prs.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.pr_number} - {p.project_name} ({p.material_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Submission Deadline *</label>
                  <input
                    type="date"
                    required
                    value={formData.submission_deadline}
                    onChange={e => setFormData({ ...formData, submission_deadline: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Delivery Destination</label>
                  <input
                    type="text"
                    value={formData.delivery_location}
                    onChange={e => setFormData({ ...formData, delivery_location: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              {/* Multi-Vendor Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-600 font-semibold">
                    Select Vendors to Solicit Proposals From ({formData.selected_vendor_ids.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickVendorOpen(true)}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Quick Add Supplier
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                  {vendors.map(v => {
                    const checked = formData.selected_vendor_ids.includes(v.id);
                    return (
                      <div
                        key={v.id}
                        onClick={() => handleToggleVendor(v.id)}
                        className={`p-2 rounded-md border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          checked ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold' : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <div>{v.vendor_name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{v.city} • Rating: {v.vendor_rating}★</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          className="rounded text-blue-600"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-600 font-semibold">Commercial Terms & Instructions</label>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] text-slate-400">Insert Standard Clause:</span>
                    <select
                      onChange={e => {
                        if (e.target.value) {
                          handleInsertClause(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-[11px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-medium"
                    >
                      <option value="">+ Pick Standard Term</option>
                      {terms.map(t => (
                        <option key={t.id} value={t.term_content || t.term_text}>
                          [{t.term_type}] {t.term_title || t.term_code}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <textarea
                  rows={3}
                  value={formData.commercial_terms}
                  onChange={e => setFormData({ ...formData, commercial_terms: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 font-semibold rounded-lg"
                >
                  Dispatch RFQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Supplier Modal */}
      {isQuickVendorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Quick Register Supplier</h3>
              <button onClick={() => setIsQuickVendorOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleQuickAddVendor} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={newVendorData.vendor_name}
                  onChange={e => setNewVendorData({ ...newVendorData, vendor_name: e.target.value })}
                  placeholder="e.g. UltraTech Cement Ltd"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={newVendorData.gst_number}
                    onChange={e => setNewVendorData({ ...newVendorData, gst_number: e.target.value })}
                    placeholder="27AABCV..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Supplier Type</label>
                  <select
                    value={newVendorData.vendor_type}
                    onChange={e => setNewVendorData({ ...newVendorData, vendor_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    <option value="MANUFACTURER">MANUFACTURER</option>
                    <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                    <option value="CONTRACTOR">CONTRACTOR</option>
                    <option value="TRANSPORTER">TRANSPORTER</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Mobile / Phone</label>
                  <input
                    type="text"
                    value={newVendorData.mobile}
                    onChange={e => setNewVendorData({ ...newVendorData, mobile: e.target.value })}
                    placeholder="+91 ..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={newVendorData.city}
                    onChange={e => setNewVendorData({ ...newVendorData, city: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickVendorOpen(false)}
                  className="px-3 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-white bg-blue-600 hover:bg-blue-700 font-semibold rounded-lg"
                >
                  Save & Include in RFQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
