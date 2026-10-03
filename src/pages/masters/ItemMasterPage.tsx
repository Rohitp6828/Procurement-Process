import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit2, Trash2, Package, Tag, Layers, AlertTriangle, FileSpreadsheet, RefreshCw, Hash, FileCheck2, ShieldCheck } from 'lucide-react';
import { db } from '../../lib/db';
import { Item, MaterialSpecification } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { MasterDataSyncHeader } from '../../components/common/MasterDataSyncHeader';
import { BulkExcelUploadModal } from '../../components/common/BulkExcelUploadModal';

export const ItemMasterPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useNotifications();
  const [items, setItems] = useState<Item[]>([]);
  const [specs, setSpecs] = useState<MaterialSpecification[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [formData, setFormData] = useState({
    item_code: '000001',
    item_name: '',
    category: 'Cement',
    sub_category: 'OPC Grade',
    uom: 'Bags',
    specifications: '',
    hsn_code: '252329',
    gst_rate: 28,
    standard_rate: 380,
    reorder_level: 500,
    status: 'ACTIVE' as Item['status'],
  });

  const loadData = async () => {
    const [itemList, specList] = await Promise.all([
      db.getItems(),
      db.getSpecifications(),
    ]);
    setItems(itemList);
    setSpecs(specList);
  };
  const loadItems = loadData;

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = async () => {
    setEditingItem(null);
    const nextCode = await db.getNextItemCode();
    setFormData({
      item_code: nextCode,
      item_name: '',
      category: 'Steel',
      sub_category: 'TMT Bars',
      uom: 'MT',
      specifications: 'Fe 550D TMT Reinforcement Steel conforming to IS:1786',
      hsn_code: '721420',
      gst_rate: 18,
      standard_rate: 65000,
      reorder_level: 50,
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  const handleGenerateNumericCode = async () => {
    const nextCode = await db.getNextItemCode();
    setFormData(prev => ({ ...prev, item_code: nextCode }));
    showToast(`Generated next numeric item code: ${nextCode}`, 'info');
  };

  const handleOpenEdit = (it: Item) => {
    setEditingItem(it);
    setFormData({
      item_code: it.item_code,
      item_name: it.item_name,
      category: it.category,
      sub_category: it.sub_category || '',
      uom: it.uom,
      specifications: it.specifications || '',
      hsn_code: it.hsn_code,
      gst_rate: it.gst_rate,
      standard_rate: it.standard_rate,
      reorder_level: it.reorder_level,
      status: it.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_name || !formData.item_code) {
      showToast('Item Code and Item Name are required.', 'error');
      return;
    }

    try {
      // Normalize to 6-digit numeric item code
      const numericCode = db.formatNumericItemCode(formData.item_code);

      const payload: Item = {
        id: editingItem ? editingItem.id : `itm-${Date.now()}`,
        ...formData,
        item_code: numericCode,
      };

      await db.saveItem(payload);
      showToast(`Item ${payload.item_name} [${numericCode}] saved successfully!`, 'success');
      setIsModalOpen(false);
      loadItems();
    } catch (err: any) {
      showToast(err.message || 'Failed to save item', 'error');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete item ${code}? This will remove it from local cache and Supabase.`)) {
      return;
    }
    try {
      await db.deleteItem(id);
      showToast(`Item ${code} deleted`, 'info');
      loadItems();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete item', 'error');
    }
  };

  const filtered = items.filter(
    i =>
      i.item_name.toLowerCase().includes(search.toLowerCase()) ||
      i.item_code.toLowerCase().includes(search.toLowerCase()) ||
      (i.category || i.category_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.hsn_code || i.hsn_sac || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Item Master & Specifications</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage construction materials, UOM standards, HSN codes, GST tax brackets, and reorder levels.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {hasPermission('ITEM', 'CREATE') && (
            <>
              <button
                onClick={() => setIsBulkUploadOpen(true)}
                className="inline-flex items-center px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs text-xs font-semibold rounded-lg text-emerald-700 hover:text-emerald-800 transition-colors"
                title="Bulk upload materials and items from Excel spreadsheet (.xlsx, .xls, .csv)"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
                Bulk Upload (Excel)
              </button>

              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Material / Item
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs between Item Master and Specifications Master */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <Link
          to="/masters/items"
          className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs"
        >
          <Package className="w-3.5 h-3.5 mr-1.5 text-white" />
          Item / Material Master ({items.length})
        </Link>
        <Link
          to="/masters/specifications"
          className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <FileCheck2 className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          Specifications Master ({specs.length})
        </Link>
      </div>

      {/* Supabase Master Data Sync Bar */}
      <MasterDataSyncHeader
        tableName="items"
        title="Items"
        totalRecords={items.length}
        onRefresh={loadData}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by code, item name, HSN, category..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Total Items: <span className="font-bold text-slate-800">{filtered.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Item Code</th>
                <th className="px-4 py-3">Item Name & Specs</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">UOM</th>
                <th className="px-4 py-3">HSN / SAC</th>
                <th className="px-4 py-3 text-right">GST Rate</th>
                <th className="px-4 py-3 text-right">Standard Rate</th>
                <th className="px-4 py-3 text-right">Reorder Level</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(it => (
                <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-blue-600">{it.item_code}</td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-semibold text-slate-900">{it.item_name}</div>
                    <div className="text-[11px] text-slate-400 truncate">{it.specifications}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {it.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{it.uom}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">{it.hsn_code}</td>
                  <td className="px-4 py-3 text-right font-medium">{it.gst_rate}%</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(it.standard_rate)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-600">
                    {it.reorder_level} {it.uom}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={it.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenEdit(it)}
                      className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-slate-100 mr-1"
                      title="Edit Item"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    {hasPermission('ITEM', 'DELETE') && (
                      <button
                        onClick={() => handleDelete(it.id, it.item_code)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {editingItem ? 'Edit Item Master' : 'Create New Material / Item'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-600 font-semibold flex items-center gap-1">
                      <Hash className="w-3 h-3 text-blue-600" />
                      Item Code (6-Digit Numeric) *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateNumericCode}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                      title="Generate next sequential numeric code (000000 - 999999)"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Auto-Gen
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000001"
                    value={formData.item_code}
                    onChange={e => {
                      const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData({ ...formData, item_code: onlyDigits });
                    }}
                    onBlur={e => {
                      if (e.target.value) {
                        const formatted = db.formatNumericItemCode(e.target.value);
                        setFormData({ ...formData, item_code: formatted });
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-sm tracking-widest font-bold text-blue-700 bg-blue-50/40 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Numeric 6-digit code format (e.g. 000001 to 999999)
                  </span>
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Category *</label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Unit of Measure (UOM) *</label>
                  <select
                    value={formData.uom}
                    onChange={e => setFormData({ ...formData, uom: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    <option value="Bags">Bags (Cement)</option>
                    <option value="MT">MT (Metric Ton - Steel/Aggregates)</option>
                    <option value="Cum">Cum (Cubic Meter - RMC/Sand)</option>
                    <option value="Sqft">Sqft (Tiles, Flooring, Granite)</option>
                    <option value="Nos">Nos (Blocks, Doors, Fixtures)</option>
                    <option value="Rmt">Rmt (Pipes, Conduit, Railing)</option>
                    <option value="Kg">Kg (Hardware, Binding Wire)</option>
                    <option value="Ltr">Ltr (Paints, Waterproofing Chemicals)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Conforming Engineering Standard / Spec
                  </label>
                  <span className="text-[10px] text-slate-400">Pulls from Specifications Master</span>
                </div>
                <select
                  onChange={e => {
                    const selected = specs.find(s => s.id === e.target.value);
                    if (selected) {
                      setFormData(prev => ({
                        ...prev,
                        category: selected.category || prev.category,
                        specifications: `${selected.standard_code} ${selected.grade ? selected.grade + ' ' : ''}- ${selected.title}. Parameters: ${selected.technical_parameters.slice(0, 140)}...`,
                      }));
                      showToast(`Applied standard: ${selected.standard_code}`, 'info');
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50 mb-2 text-slate-700"
                >
                  <option value="">-- Link to Specifications Master (IS/ASTM Code) --</option>
                  {specs.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.spec_code} • {s.standard_code} ({s.grade || s.category}) - {s.title}
                    </option>
                  ))}
                </select>

                <label className="block text-slate-600 font-semibold mb-1">Technical Specifications Details</label>
                <textarea
                  rows={2}
                  value={formData.specifications}
                  onChange={e => setFormData({ ...formData, specifications: e.target.value })}
                  placeholder="Detail conforming IS standard, grades, testing requirements..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">HSN / SAC Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.hsn_code}
                    onChange={e => setFormData({ ...formData, hsn_code: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">GST Tax Rate (%)</label>
                  <select
                    value={formData.gst_rate}
                    onChange={e => setFormData({ ...formData, gst_rate: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    <option value="0">0%</option>
                    <option value="5">5% (Sand, Aggregates, Bricks)</option>
                    <option value="12">12%</option>
                    <option value="18">18% (Steel, RMC, Fixtures, Chemicals)</option>
                    <option value="28">28% (Cement)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Standard Estimated Rate (₹)</label>
                  <input
                    type="number"
                    value={formData.standard_rate}
                    onChange={e => setFormData({ ...formData, standard_rate: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Min Reorder Level</label>
                  <input
                    type="number"
                    value={formData.reorder_level}
                    onChange={e => setFormData({ ...formData, reorder_level: Number(e.target.value) })}
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
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Excel Upload Modal */}
      <BulkExcelUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        masterType="items"
        onSuccess={loadItems}
      />
    </div>
  );
};
