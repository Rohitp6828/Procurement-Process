import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Search, MessageSquare, Tag, CheckCircle2, XCircle, Eye, Calendar, DollarSign, BarChart3, Building } from 'lucide-react';
import { db } from '../../lib/db';
import { VendorQuotation, RequestForQuotation, Vendor, Item } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export const QuotationsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { showToast } = useNotifications();

  const [quotes, setQuotes] = useState<VendorQuotation[]>([]);
  const [rfqs, setRfqs] = useState<RequestForQuotation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickVendorOpen, setIsQuickVendorOpen] = useState(false);

  // Quick Vendor State
  const [quickVendor, setQuickVendor] = useState({
    vendor_name: '',
    vendor_type: 'MANUFACTURER',
    gst_number: '',
    city: 'Pune',
    mobile: '',
  });

  // Form State
  const [formData, setFormData] = useState({
    quotation_number: '',
    quotation_date: new Date().toISOString().split('T')[0],
    rfq_id: '',
    vendor_id: '',
    item_id: '',
    quantity: 1000,
    basic_rate: 340,
    discount_percent: 2,
    freight_amount: 15,
    packing_forwarding: 5,
    gst_percent: 28,
    payment_terms: '30 Days Net from GRN',
    delivery_period_days: 7,
    validity_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    remarks: 'Delivered at site in waterproof packaging.',
  });

  const loadData = async () => {
    const [qList, rfqList, vendList, itmList] = await Promise.all([
      db.getQuotations(),
      db.getRFQs(),
      db.getVendors(),
      db.getItems(),
    ]);
    setQuotes(qList);
    setRfqs(rfqList);
    setVendors(vendList);
    setItems(itmList);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Check ?rfq_id=... parameter
  useEffect(() => {
    const rfqId = searchParams.get('rfq_id');
    if (rfqId && rfqs.length > 0) {
      const match = rfqs.find(r => r.id === rfqId);
      if (match) {
        handleOpenCreate(match.id, match.selected_vendor_ids?.[0]);
      }
    }
  }, [searchParams, rfqs]);

  const calculateLandedRate = (
    basic: number,
    disc: number,
    freight: number,
    pf: number,
    gst: number
  ) => {
    const discounted = basic * (1 - disc / 100);
    const taxable = discounted + freight + pf;
    const tax = taxable * (gst / 100);
    return taxable + tax;
  };

  const handleOpenCreate = (prefillRfqId?: string, prefillVendorId?: string) => {
    const targetRfq = rfqs.find(r => r.id === prefillRfqId) || rfqs[0];
    const targetVendor = vendors.find(v => v.id === prefillVendorId) || vendors[0];

    setFormData({
      quotation_number: `QT-VND-${Date.now().toString().slice(-5)}`,
      quotation_date: new Date().toISOString().split('T')[0],
      rfq_id: targetRfq?.id || '',
      vendor_id: targetVendor?.id || vendors[0]?.id || '',
      item_id: items[0]?.id || '',
      quantity: 500,
      basic_rate: items[0]?.standard_rate || 350,
      discount_percent: 2,
      freight_amount: 12,
      packing_forwarding: 4,
      gst_percent: items[0]?.gst_rate || 28,
      payment_terms: targetVendor?.payment_terms || '30 Days Net from GRN',
      delivery_period_days: 5,
      validity_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      remarks: 'Standard ISI certified commercial proposal.',
    });
    setIsModalOpen(true);
  };

  const handleQuickAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVendor.vendor_name) return;
    try {
      const code = `VND-${(vendors.length + 1).toString().padStart(3, '0')}`;
      const v: Vendor = {
        id: `vnd-${Date.now()}`,
        vendor_code: code,
        vendor_name: quickVendor.vendor_name,
        vendor_type: quickVendor.vendor_type,
        gst_number: quickVendor.gst_number || '27AABCQ1111A1Z9',
        pan_number: 'AABCQ1111A',
        contact_person: 'Sales Lead',
        mobile: quickVendor.mobile || '+91 98111 22222',
        email: 'sales@supplier.com',
        address: 'Commercial Zone',
        state: 'Maharashtra',
        city: quickVendor.city,
        pincode: '411001',
        bank_name: 'ICICI Bank',
        account_number: '100200300400',
        ifsc: 'ICIC0000102',
        payment_terms: '30 Days Net',
        credit_days: 30,
        vendor_rating: 4.5,
        status: 'ACTIVE',
      };
      await db.saveVendor(v);
      setVendors(prev => [...prev, v]);
      setFormData(prev => ({ ...prev, vendor_id: v.id }));
      setIsQuickVendorOpen(false);
      showToast(`Supplier ${v.vendor_name} added!`, 'success');
      setQuickVendor({
        vendor_name: '',
        vendor_type: 'MANUFACTURER',
        gst_number: '',
        city: 'Pune',
        mobile: '',
      });
    } catch (err: any) {
      showToast(err.message || 'Failed to add vendor', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rfq = rfqs.find(r => r.id === formData.rfq_id);
    const vend = vendors.find(v => v.id === formData.vendor_id);
    const itm = items.find(i => i.id === formData.item_id);

    const landedRate = calculateLandedRate(
      formData.basic_rate,
      formData.discount_percent,
      formData.freight_amount,
      formData.packing_forwarding,
      formData.gst_percent
    );

    const totalAmt = landedRate * formData.quantity;

    const payload: VendorQuotation = {
      id: `vq-${Date.now()}`,
      quotation_number: formData.quotation_number,
      quotation_date: formData.quotation_date,
      rfq_id: formData.rfq_id,
      rfq_number: rfq?.rfq_number,
      vendor_id: formData.vendor_id,
      vendor_name: vend?.vendor_name,
      project_id: rfq?.project_id,
      basic_rate: formData.basic_rate,
      discount_percent: formData.discount_percent,
      freight_amount: formData.freight_amount,
      packing_forwarding: formData.packing_forwarding,
      gst_percent: formData.gst_percent,
      landed_rate: Number(landedRate.toFixed(2)),
      total_amount: Number(totalAmt.toFixed(2)),
      payment_terms: formData.payment_terms,
      delivery_period_days: formData.delivery_period_days,
      validity_date: formData.validity_date,
      status: 'SUBMITTED',
      remarks: formData.remarks,
      items: [
        {
          id: `vqi-${Date.now()}`,
          quotation_id: `vq-${Date.now()}`,
          item_id: formData.item_id,
          item_name: itm?.item_name || 'Material',
          uom: itm?.uom || 'Nos',
          quantity: formData.quantity,
          basic_rate: formData.basic_rate,
          landed_rate: Number(landedRate.toFixed(2)),
          total_amount: Number(totalAmt.toFixed(2)),
        },
      ],
      created_at: new Date().toISOString(),
    };

    await db.saveQuotation(payload);
    showToast(`Quotation ${payload.quotation_number} registered! Landed Rate: ${formatCurrency(landedRate)}`, 'success');
    setIsModalOpen(false);
    loadData();
  };

  const filtered = quotes.filter(
    q =>
      q.quotation_number.toLowerCase().includes(search.toLowerCase()) ||
      q.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.rfq_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Vendor Quotations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log supplier commercial proposals, landed rate breakdowns, and delivery SLAs.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/procurement/quotation-comparison')}
            className="inline-flex items-center px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs text-xs font-semibold rounded-lg transition-colors"
          >
            <BarChart3 className="h-4 w-4 mr-1.5 text-blue-600" />
            Comparative Statement (CS)
          </button>
          {hasPermission('QUOTATION', 'CREATE') && (
            <button
              onClick={() => handleOpenCreate()}
              className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Record Supplier Quote
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search quotation number, supplier..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total Quotations: <span className="font-bold text-slate-800">{filtered.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Quote Number</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">RFQ Reference</th>
                <th className="px-4 py-3 text-right">Basic Rate</th>
                <th className="px-4 py-3 text-right">Freight + P&F</th>
                <th className="px-4 py-3 text-right">Landed Rate</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">Payment Terms</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(q => (
                <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{q.quotation_number}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{q.vendor_name}</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{q.rfq_number || '-'}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(q.basic_rate)}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">
                    +{formatCurrency(q.freight_amount + q.packing_forwarding)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 bg-blue-50/40">
                    {formatCurrency(q.landed_rate)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                    {formatCurrency(q.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{q.payment_terms}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={q.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Quote Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-800">
                Log Supplier Quotation (Commercial Bid)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Quote Reference Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.quotation_number}
                    onChange={e => setFormData({ ...formData, quotation_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Linked RFQ *</label>
                  <select
                    required
                    value={formData.rfq_id}
                    onChange={e => setFormData({ ...formData, rfq_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-blue-600"
                  >
                    {rfqs.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.rfq_number} - {r.project_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-600 font-semibold">Bidding Supplier *</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickVendorOpen(true)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" /> Quick Add
                    </button>
                  </div>
                  <select
                    required
                    value={formData.vendor_id}
                    onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-800"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.vendor_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Item Being Quoted *</label>
                  <select
                    required
                    value={formData.item_id}
                    onChange={e => {
                      const it = items.find(i => i.id === e.target.value);
                      setFormData({
                        ...formData,
                        item_id: e.target.value,
                        basic_rate: it?.standard_rate || formData.basic_rate,
                        gst_percent: it?.gst_rate || formData.gst_percent,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {items.map(it => (
                      <option key={it.id} value={it.id}>{it.item_name} ({it.uom})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rate & Tax Computation Box */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="font-semibold text-slate-700">Commercial Rate Breakdown (Per Unit)</div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Basic Rate (₹) *</label>
                    <input
                      type="number"
                      required
                      value={formData.basic_rate}
                      onChange={e => setFormData({ ...formData, basic_rate: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-md p-1.5 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Discount %</label>
                    <input
                      type="number"
                      value={formData.discount_percent}
                      onChange={e => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-md p-1.5 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">GST Tax %</label>
                    <input
                      type="number"
                      value={formData.gst_percent}
                      onChange={e => setFormData({ ...formData, gst_percent: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-md p-1.5 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Freight (₹/Unit)</label>
                    <input
                      type="number"
                      value={formData.freight_amount}
                      onChange={e => setFormData({ ...formData, freight_amount: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-md p-1.5 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">P&F (₹/Unit)</label>
                    <input
                      type="number"
                      value={formData.packing_forwarding}
                      onChange={e => setFormData({ ...formData, packing_forwarding: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-md p-1.5 bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Quantity Quoted</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="w-full border border-slate-200 rounded-md p-1.5 bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500">Calculated Landed Rate:</span>
                    <span className="font-mono font-bold text-slate-900 ml-2 text-sm">
                      {formatCurrency(
                        calculateLandedRate(
                          formData.basic_rate,
                          formData.discount_percent,
                          formData.freight_amount,
                          formData.packing_forwarding,
                          formData.gst_percent
                        )
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Commitment:</span>
                    <span className="font-mono font-bold text-blue-600 ml-2 text-sm">
                      {formatCurrency(
                        calculateLandedRate(
                          formData.basic_rate,
                          formData.discount_percent,
                          formData.freight_amount,
                          formData.packing_forwarding,
                          formData.gst_percent
                        ) * formData.quantity
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Lead Time (Days to Site)</label>
                  <input
                    type="number"
                    value={formData.delivery_period_days}
                    onChange={e => setFormData({ ...formData, delivery_period_days: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
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
                  Save Supplier Quote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick Add Vendor Modal */}
      {isQuickVendorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Quick Add Supplier</h3>
              <button onClick={() => setIsQuickVendorOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleQuickAddVendor} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Company / Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={quickVendor.vendor_name}
                  onChange={e => setQuickVendor({ ...quickVendor, vendor_name: e.target.value })}
                  placeholder="e.g. Jindal Steel & Power Ltd"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={quickVendor.gst_number}
                    onChange={e => setQuickVendor({ ...quickVendor, gst_number: e.target.value })}
                    placeholder="27AABCJ..."
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Supplier Type</label>
                  <select
                    value={quickVendor.vendor_type}
                    onChange={e => setQuickVendor({ ...quickVendor, vendor_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    <option value="MANUFACTURER">MANUFACTURER</option>
                    <option value="DISTRIBUTOR">DISTRIBUTOR</option>
                    <option value="CONTRACTOR">CONTRACTOR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">City</label>
                  <input
                    type="text"
                    value={quickVendor.city}
                    onChange={e => setQuickVendor({ ...quickVendor, city: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={quickVendor.mobile}
                    onChange={e => setQuickVendor({ ...quickVendor, mobile: e.target.value })}
                    placeholder="+91..."
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
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
