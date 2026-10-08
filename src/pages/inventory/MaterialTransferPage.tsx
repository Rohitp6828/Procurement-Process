import React, { useState, useEffect } from 'react';
import { Plus, Search, Truck, ArrowRight, CheckCircle2, Eye, ShieldCheck, MapPin } from 'lucide-react';
import { db } from '../../lib/db';
import { MaterialTransfer, Project, Site, Item } from '../../types';
import { formatDate } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CustomSelect } from '../../components/common/CustomSelect';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

export const MaterialTransferPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useNotifications();

  const [transfers, setTransfers] = useState<MaterialTransfer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    transfer_number: '',
    transfer_date: new Date().toISOString().split('T')[0],
    from_project_id: '',
    from_site_id: '',
    to_project_id: '',
    to_site_id: '',
    vehicle_number: 'MH-14-BN-2940',
    driver_name: 'Satish Shinde (Mobile: +91 98221 00291)',
    dispatch_gate_pass_no: `GP-DIS-${Date.now().toString().slice(-4)}`,
    remarks: 'Inter-project transfer to meet immediate concrete pour schedule.',
  });

  const [transferItems, setTransferItems] = useState<Array<{
    item_id: string;
    item_name: string;
    uom: string;
    dispatched_quantity: number;
  }>>([]);

  const loadData = async () => {
    const [tList, projList, siteList, itmList] = await Promise.all([
      db.getMaterialTransfers(),
      db.getProjects(),
      db.getSites(),
      db.getItems(),
    ]);
    setTransfers(tList);
    setProjects(projList);
    setSites(siteList);
    setItems(itmList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    const nextNumber = `MTN-2026-${(transfers.length + 1).toString().padStart(4, '0')}`;
    const p1 = projects[0];
    const p2 = projects[1] || projects[0];

    setFormData({
      transfer_number: nextNumber,
      transfer_date: new Date().toISOString().split('T')[0],
      from_project_id: p1?.id || '',
      from_site_id: sites.find(s => s.project_id === p1?.id)?.id || sites[0]?.id || '',
      to_project_id: p2?.id || '',
      to_site_id: sites.find(s => s.project_id === p2?.id)?.id || sites[1]?.id || '',
      vehicle_number: 'MH-12-PQ-9912',
      driver_name: 'Dnyaneshwar More (+91 97665 11928)',
      dispatch_gate_pass_no: `GP-OUT-${Date.now().toString().slice(-4)}`,
      remarks: 'Urgent stock transfer approved by Project Director.',
    });

    if (items.length > 0) {
      setTransferItems([
        {
          item_id: items[0].id,
          item_name: items[0].item_name,
          uom: items[0].uom,
          dispatched_quantity: 150,
        },
      ]);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.from_site_id === formData.to_site_id) {
      showToast('Source and destination sites must be different', 'error');
      return;
    }

    const fromProj = projects.find(p => p.id === formData.from_project_id);
    const fromSite = sites.find(s => s.id === formData.from_site_id);
    const toProj = projects.find(p => p.id === formData.to_project_id);
    const toSite = sites.find(s => s.id === formData.to_site_id);
    const mtnId = `mtn-${Date.now()}`;

    const newTransfer: MaterialTransfer = {
      id: mtnId,
      transfer_number: formData.transfer_number,
      transfer_date: formData.transfer_date,
      from_project_id: formData.from_project_id,
      from_project_name: fromProj?.project_name,
      from_site_id: formData.from_site_id,
      from_site_name: fromSite?.site_name,
      to_project_id: formData.to_project_id,
      to_project_name: toProj?.project_name,
      to_site_id: formData.to_site_id,
      to_site_name: toSite?.site_name,
      vehicle_number: formData.vehicle_number,
      driver_name: formData.driver_name,
      dispatch_gate_pass_no: formData.dispatch_gate_pass_no,
      status: 'IN_TRANSIT',
      remarks: formData.remarks,
      items: transferItems.map((ti, idx) => ({
        id: `mtni-${Date.now()}-${idx}`,
        transfer_id: mtnId,
        item_id: ti.item_id,
        item_name: ti.item_name,
        uom: ti.uom,
        dispatched_quantity: Number(ti.dispatched_quantity),
        received_quantity: 0,
      })),
      created_at: new Date().toISOString(),
    };

    await db.saveMaterialTransfer(newTransfer);
    showToast(`Transfer Note ${newTransfer.transfer_number} dispatched with Gate Pass!`, 'success');
    setIsModalOpen(false);
    loadData();
  };

  const handleAcknowledgeReceipt = async (transfer: MaterialTransfer) => {
    const updated: MaterialTransfer = {
      ...transfer,
      status: 'RECEIVED',
      receipt_date: new Date().toISOString().split('T')[0],
      items: transfer.items?.map(it => ({
        ...it,
        received_quantity: it.dispatched_quantity,
      })),
    };
    await db.saveMaterialTransfer(updated);
    showToast(`Transfer ${transfer.transfer_number} acknowledged & inwarded at destination!`, 'success');
    loadData();
  };

  const filtered = transfers.filter(
    t =>
      t.transfer_number.toLowerCase().includes(search.toLowerCase()) ||
      t.from_project_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.to_project_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.vehicle_number.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Inter-Site Material Transfers (MTN)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Transfer surplus stock between project sites with transit e-gate pass and destination acknowledgment.
          </p>
        </div>
        {hasPermission('GRN', 'CREATE') && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Dispatch Inter-Site Transfer
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
              placeholder="Search transfer, vehicle, project..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total Transfers: <span className="font-bold text-slate-800">{filtered.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Transfer Number</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Dispatching Site</th>
                <th className="px-4 py-3">Receiving Site</th>
                <th className="px-4 py-3">Vehicle & Gate Pass</th>
                <th className="px-4 py-3 text-center">Items</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-600">{t.transfer_number}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(t.transfer_date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div>{t.from_project_name}</div>
                    <div className="text-[10px] text-slate-400">{t.from_site_name}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div>{t.to_project_name}</div>
                    <div className="text-[10px] text-slate-400">{t.to_site_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-slate-800">{t.vehicle_number}</div>
                    <div className="text-[10px] text-slate-400">{t.dispatch_gate_pass_no}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">
                    {t.items?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.status === 'IN_TRANSIT' && (
                      <button
                        onClick={() => handleAcknowledgeReceipt(t)}
                        className="inline-flex items-center px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Inward Receipt
                      </button>
                    )}
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
                Dispatch Inter-Site Material Transfer (MTN)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Transfer Number</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.transfer_number}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono bg-slate-50 text-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Transfer Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.transfer_date}
                    onChange={e => setFormData({ ...formData, transfer_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Dispatching Source Site *</label>
                  <CustomSelect
                    options={sites.map(s => ({ label: `${s.site_name} (${s.site_code})`, value: s.id }))}
                    value={formData.from_site_id}
                    onChange={siteId => {
                      const site = sites.find(s => s.id === siteId);
                      setFormData({
                        ...formData,
                        from_site_id: siteId,
                        from_project_id: site?.project_id || '',
                      });
                    }}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Receiving Destination Site *</label>
                  <CustomSelect
                    options={sites.map(s => ({ label: `${s.site_name} (${s.site_code})`, value: s.id }))}
                    value={formData.to_site_id}
                    onChange={siteId => {
                      const site = sites.find(s => s.id === siteId);
                      setFormData({
                        ...formData,
                        to_site_id: siteId,
                        to_project_id: site?.project_id || '',
                      });
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Vehicle Plate Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.vehicle_number}
                    onChange={e => setFormData({ ...formData, vehicle_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Driver Details</label>
                  <input
                    type="text"
                    value={formData.driver_name}
                    onChange={e => setFormData({ ...formData, driver_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Gate Pass Number</label>
                  <input
                    type="text"
                    value={formData.dispatch_gate_pass_no}
                    onChange={e => setFormData({ ...formData, dispatch_gate_pass_no: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
              </div>

              {/* Items */}
              <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-slate-50">
                <span className="font-bold text-slate-700 block">Consigned Materials for Transfer</span>
                <div className="space-y-2">
                  {transferItems.map((item, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-8">
                        <CustomSelect
                          options={items.map(it => ({ label: `${it.item_name} (${it.uom})`, value: it.id }))}
                          value={item.item_id}
                          onChange={itemId => {
                            const it = items.find(x => x.id === itemId);
                            const copy = [...transferItems];
                            copy[idx] = { ...copy[idx], item_id: it!.id, item_name: it!.item_name, uom: it!.uom };
                            setTransferItems(copy);
                          }}
                          className="w-full"
                        />
                      </div>

                      <div className="col-span-4">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Dispatch Qty"
                          value={item.dispatched_quantity}
                          onChange={e => {
                            const copy = [...transferItems];
                            copy[idx].dispatched_quantity = Number(e.target.value);
                            setTransferItems(copy);
                          }}
                          className="w-full border border-slate-200 rounded-md p-1 font-mono text-xs text-right font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Transfer Remarks</label>
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
                  Authorize Gate Pass & Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};