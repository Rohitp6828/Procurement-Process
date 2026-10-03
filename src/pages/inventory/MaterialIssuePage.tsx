import React, { useState, useEffect } from 'react';
import { Plus, Search, Send, FileText, CheckCircle2, UserCheck, HardHat, Calendar } from 'lucide-react';
import { db } from '../../lib/db';
import { MaterialIssue, Project, Site, Item } from '../../types';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export const MaterialIssuePage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const { showToast } = useNotifications();

  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    issue_number: '',
    issue_date: new Date().toISOString().split('T')[0],
    project_id: '',
    site_id: '',
    contractor_name: 'Shree Krishna Civil Contractors',
    issued_to_person: 'Ramesh K. (Site Foreman)',
    work_order_ref: 'WO-2026-089 (Basement 2 Concreting)',
    remarks: 'Discharged for Tower B 3rd Floor column casting.',
  });

  const [issueItems, setIssueItems] = useState<Array<{
    item_id: string;
    item_name: string;
    uom: string;
    quantity: number;
    remarks: string;
  }>>([]);

  const loadData = async () => {
    const [issList, projList, siteList, itmList] = await Promise.all([
      db.getMaterialIssues(),
      db.getProjects(),
      db.getSites(),
      db.getItems(),
    ]);
    setIssues(issList);
    setProjects(projList);
    setSites(siteList);
    setItems(itmList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    const nextNumber = `MIN-2026-${(issues.length + 1).toString().padStart(4, '0')}`;
    setFormData({
      issue_number: nextNumber,
      issue_date: new Date().toISOString().split('T')[0],
      project_id: projects[0]?.id || '',
      site_id: sites[0]?.id || '',
      contractor_name: 'Apex Structural Works LLP',
      issued_to_person: 'Suresh Patil (Site Engineer)',
      work_order_ref: 'WO-STR-042 (Podium Slab Concreting)',
      remarks: 'Issued against verified site consumption indent.',
    });

    if (items.length > 0) {
      setIssueItems([
        {
          item_id: items[0].id,
          item_name: items[0].item_name,
          uom: items[0].uom,
          quantity: 50,
          remarks: 'Tower A Foundation',
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleAddItemRow = () => {
    const it = items[0];
    setIssueItems([
      ...issueItems,
      {
        item_id: it?.id || '',
        item_name: it?.item_name || '',
        uom: it?.uom || 'Nos',
        quantity: 20,
        remarks: '',
      },
    ]);
  };

  const handleItemSelect = (index: number, itemId: string) => {
    const selected = items.find(i => i.id === itemId);
    if (!selected) return;
    const copy = [...issueItems];
    copy[index] = {
      ...copy[index],
      item_id: selected.id,
      item_name: selected.item_name,
      uom: selected.uom,
    };
    setIssueItems(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issueItems.length === 0) {
      showToast('Add at least one item to issue', 'error');
      return;
    }

    const proj = projects.find(p => p.id === formData.project_id);
    const site = sites.find(s => s.id === formData.site_id);
    const issueId = `min-${Date.now()}`;

    const newIssue: MaterialIssue = {
      id: issueId,
      issue_number: formData.issue_number,
      issue_date: formData.issue_date,
      project_id: formData.project_id,
      project_name: proj?.project_name,
      site_id: formData.site_id,
      site_name: site?.site_name,
      contractor_name: formData.contractor_name,
      issued_to_person: formData.issued_to_person,
      work_order_ref: formData.work_order_ref,
      status: 'ISSUED',
      remarks: formData.remarks,
      items: issueItems.map((it, idx) => ({
        id: `mini-${Date.now()}-${idx}`,
        issue_id: issueId,
        item_id: it.item_id,
        item_name: it.item_name,
        uom: it.uom,
        quantity: Number(it.quantity),
        remarks: it.remarks,
      })),
      created_at: new Date().toISOString(),
    };

    await db.saveMaterialIssue(newIssue);
    showToast(`Material Issue Note ${newIssue.issue_number} issued to ${newIssue.contractor_name}!`, 'success');
    setIsModalOpen(false);
    loadData();
  };

  const filtered = issues.filter(
    i =>
      i.issue_number.toLowerCase().includes(search.toLowerCase()) ||
      i.contractor_name.toLowerCase().includes(search.toLowerCase()) ||
      i.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Material Issue Notes (MIN)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Issue materials from site store to subcontractors and task work orders with automatic inventory deduction.
          </p>
        </div>
        {hasPermission('GRN', 'CREATE') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Issue to Contractor
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
              placeholder="Search MIN, contractor, project..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total Issues: <span className="font-bold text-slate-800">{filtered.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Issue Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Project & Site</th>
                <th className="px-4 py-3">Issued Contractor</th>
                <th className="px-4 py-3">Receiver / Foreman</th>
                <th className="px-4 py-3">Work Order Ref</th>
                <th className="px-4 py-3 text-center">Items Count</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(iss => (
                <tr key={iss.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{iss.issue_number}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(iss.issue_date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{iss.project_name}</div>
                    <div className="text-[11px] text-slate-400">{iss.site_name}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{iss.contractor_name}</td>
                  <td className="px-4 py-3 text-slate-700">{iss.issued_to_person}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{iss.work_order_ref}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-800 font-mono">
                    {iss.items?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={iss.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-800">
                Generate Material Issue Note (MIN)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">MIN Number</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.issue_number}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Issue Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Project & Site *</label>
                  <select
                    required
                    value={formData.project_id}
                    onChange={e => {
                      const pId = e.target.value;
                      const site = sites.find(s => s.project_id === pId) || sites[0];
                      setFormData({
                        ...formData,
                        project_id: pId,
                        site_id: site?.id || '',
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-800"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.project_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Work Order Reference</label>
                  <input
                    type="text"
                    value={formData.work_order_ref}
                    onChange={e => setFormData({ ...formData, work_order_ref: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Subcontractor / Agency *</label>
                  <input
                    type="text"
                    required
                    value={formData.contractor_name}
                    onChange={e => setFormData({ ...formData, contractor_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Recipient Foreman / Engineer *</label>
                  <input
                    type="text"
                    required
                    value={formData.issued_to_person}
                    onChange={e => setFormData({ ...formData, issued_to_person: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Issued Materials</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Material
                  </button>
                </div>

                <div className="space-y-2">
                  {issueItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Item *</label>
                        <select
                          value={item.item_id}
                          onChange={e => handleItemSelect(idx, e.target.value)}
                          className="w-full border border-slate-200 rounded-md p-1 text-xs"
                        >
                          {items.map(it => (
                            <option key={it.id} value={it.id}>
                              {it.item_code} - {it.item_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-400 mb-0.5">UOM</label>
                        <input
                          type="text"
                          readOnly
                          value={item.uom}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md p-1 text-xs text-center"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] text-slate-400 mb-0.5">Issue Quantity *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={e => {
                            const copy = [...issueItems];
                            copy[idx].quantity = Number(e.target.value);
                            setIssueItems(copy);
                          }}
                          className="w-full border border-slate-200 rounded-md p-1 font-mono text-xs text-right font-medium"
                        />
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setIssueItems(issueItems.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Issue Remarks & Execution Location</label>
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
                  Authorize Material Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
