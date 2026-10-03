import React, { useState, useEffect } from 'react';
import { Plus, Search, Star, Award, CheckCircle2, AlertTriangle, ShieldCheck, Edit2 } from 'lucide-react';
import { db } from '../../lib/db';
import { VendorEvaluation, Vendor, Project } from '../../types';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export const VendorEvaluationPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useNotifications();

  const [evaluations, setEvaluations] = useState<VendorEvaluation[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    vendor_id: '',
    project_id: '',
    price_competitiveness: 85,
    quality_compliance: 90,
    delivery_timeliness: 85,
    payment_terms_flexibility: 80,
    technical_capability: 90,
    past_performance: 85,
    safety_compliance: 95,
    remarks: 'Consistent delivery compliance on Grade 53 OPC batches with full lab test reports.',
  });

  const loadData = async () => {
    const [evalList, vendList, projList] = await Promise.all([
      db.getVendorEvaluations(),
      db.getVendors(),
      db.getProjects(),
    ]);
    setEvaluations(evalList);
    setVendors(vendList);
    setProjects(projList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      vendor_id: vendors[0]?.id || '',
      project_id: projects[0]?.id || '',
      price_competitiveness: 85,
      quality_compliance: 90,
      delivery_timeliness: 85,
      payment_terms_flexibility: 80,
      technical_capability: 90,
      past_performance: 85,
      safety_compliance: 95,
      remarks: 'Complies with all technical and QA/QC specifications.',
    });
    setIsModalOpen(true);
  };

  const calculateWeightedScore = () => {
    // Weights: Price 25%, Quality 25%, Delivery 20%, Payment 10%, Tech 10%, Safety 10%
    return (
      formData.price_competitiveness * 0.25 +
      formData.quality_compliance * 0.25 +
      formData.delivery_timeliness * 0.20 +
      formData.payment_terms_flexibility * 0.10 +
      formData.technical_capability * 0.10 +
      formData.safety_compliance * 0.10
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vend = vendors.find(v => v.id === formData.vendor_id);
    const score = Number(calculateWeightedScore().toFixed(1));

    let status: VendorEvaluation['status'] = 'RECOMMENDED';
    if (score < 60) status = 'REJECTED';
    else if (score < 75) status = 'CONDITIONAL';

    const payload: VendorEvaluation = {
      id: `ve-${Date.now()}`,
      vendor_id: formData.vendor_id,
      vendor_name: vend?.vendor_name,
      project_id: formData.project_id,
      evaluation_date: new Date().toISOString().split('T')[0],
      evaluated_by_id: user.id,
      evaluated_by_name: user.full_name,
      price_competitiveness: formData.price_competitiveness,
      quality_compliance: formData.quality_compliance,
      delivery_timeliness: formData.delivery_timeliness,
      payment_terms_flexibility: formData.payment_terms_flexibility,
      technical_capability: formData.technical_capability,
      past_performance: formData.past_performance,
      safety_compliance: formData.safety_compliance,
      total_score: score,
      status,
      remarks: formData.remarks,
      created_at: new Date().toISOString(),
    };

    await db.saveVendorEvaluation(payload);
    showToast(`Vendor Evaluation completed! Score: ${score}/100 (${status})`, 'success');
    setIsModalOpen(false);
    loadData();
  };

  const filtered = evaluations.filter(
    e =>
      e.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.status.toLowerCase().includes(search.toLowerCase()) ||
      e.evaluated_by_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Vendor Evaluation & Rating</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Objective supplier scorecard: Price competitiveness, Quality QA/QC, On-time delivery, and Safety.
          </p>
        </div>
        {hasPermission('VENDOR', 'CREATE') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Evaluate Supplier
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
              placeholder="Search vendor evaluation..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500">
            Total Evaluations: <span className="font-bold text-slate-800">{filtered.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Evaluation Date</th>
                <th className="px-4 py-3 text-center">Quality (25%)</th>
                <th className="px-4 py-3 text-center">Pricing (25%)</th>
                <th className="px-4 py-3 text-center">Delivery (20%)</th>
                <th className="px-4 py-3 text-center">Safety (10%)</th>
                <th className="px-4 py-3 text-center">Weighted Score</th>
                <th className="px-4 py-3 text-center">Recommendation</th>
                <th className="px-4 py-3">Evaluated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(ev => (
                <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{ev.vendor_name}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(ev.evaluation_date)}</td>
                  <td className="px-4 py-3 text-center font-mono">{ev.quality_compliance}%</td>
                  <td className="px-4 py-3 text-center font-mono">{ev.price_competitiveness}%</td>
                  <td className="px-4 py-3 text-center font-mono">{ev.delivery_timeliness}%</td>
                  <td className="px-4 py-3 text-center font-mono">{ev.safety_compliance}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {ev.total_score} / 100
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={ev.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ev.evaluated_by_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                Scorecard Evaluation for Supplier
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Select Vendor *</label>
                  <select
                    required
                    value={formData.vendor_id}
                    onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.vendor_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Project Context</label>
                  <select
                    value={formData.project_id}
                    onChange={e => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="font-semibold text-slate-700">Scoring Criteria (0 - 100)</div>

                <div className="flex items-center justify-between">
                  <span>Price Competitiveness (Weight: 25%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.price_competitiveness}
                    onChange={e => setFormData({ ...formData, price_competitiveness: Number(e.target.value) })}
                    className="w-20 p-1 border rounded text-right font-mono"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Quality Compliance & QA Reports (Weight: 25%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.quality_compliance}
                    onChange={e => setFormData({ ...formData, quality_compliance: Number(e.target.value) })}
                    className="w-20 p-1 border rounded text-right font-mono"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Delivery Timeliness & Transit SLA (Weight: 20%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.delivery_timeliness}
                    onChange={e => setFormData({ ...formData, delivery_timeliness: Number(e.target.value) })}
                    className="w-20 p-1 border rounded text-right font-mono"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Payment Terms & Credit Flexibility (Weight: 10%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.payment_terms_flexibility}
                    onChange={e => setFormData({ ...formData, payment_terms_flexibility: Number(e.target.value) })}
                    className="w-20 p-1 border rounded text-right font-mono"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Technical & Test Certificate Capability (Weight: 10%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.technical_capability}
                    onChange={e => setFormData({ ...formData, technical_capability: Number(e.target.value) })}
                    className="w-20 p-1 border rounded text-right font-mono"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span>Safety & Environmental Compliance (Weight: 10%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.safety_compliance}
                    onChange={e => setFormData({ ...formData, safety_compliance: Number(e.target.value) })}
                    className="w-20 p-1 border rounded text-right font-mono"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-800">
                  <span>Calculated Weighted Score:</span>
                  <span className="font-mono text-blue-600 text-sm">
                    {calculateWeightedScore().toFixed(1)} / 100
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Evaluation Remarks</label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
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
                  Save Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
