import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2, Plus, Search, Edit2, Trash2, Filter,
  FileSpreadsheet, ShieldCheck, CheckCircle2, BookOpen,
  Package, Layers, Sparkles, AlertCircle, ArrowUpRight
} from 'lucide-react';
import { db } from '../../lib/db';
import { MaterialSpecification, Item } from '../../types';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { BulkExcelUploadModal } from '../../components/common/BulkExcelUploadModal';

export const SpecificationsMasterPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { showToast } = useNotifications();

  const [specs, setSpecs] = useState<MaterialSpecification[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<MaterialSpecification | null>(null);

  const [formData, setFormData] = useState({
    spec_code: '',
    title: '',
    category: 'Steel & Metals',
    standard_code: 'IS 1786:2008',
    grade: 'Fe 550D',
    technical_parameters: '',
    test_certificates_required: 'Manufacturer Test Certificate (MTC) with heat number & chemical batch report.',
    sampling_frequency: '1 test set for every 20 MT.',
    packaging_delivery_terms: 'Commercial straight lengths tied with steel strapping and tagged.',
    is_active: true,
  });

  const loadData = async () => {
    const [specList, itmList] = await Promise.all([
      db.getSpecifications(),
      db.getItems(),
    ]);
    setSpecs(specList);
    setItems(itmList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = ['ALL', ...Array.from(new Set(specs.map(s => s.category).filter(Boolean)))];

  const handleOpenCreate = () => {
    setEditingSpec(null);
    setFormData({
      spec_code: `SPEC-CIV-${(specs.length + 1).toString().padStart(2, '0')}`,
      title: '',
      category: 'Steel & Metals',
      standard_code: 'IS 1786:2008',
      grade: 'Fe 550D',
      technical_parameters: '',
      test_certificates_required: 'Manufacturer Test Certificate (MTC) with heat number & physical test report.',
      sampling_frequency: '1 sample set per 25 MT.',
      packaging_delivery_terms: 'Delivered in standard bundle weights with proper waterproof protection.',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (spec: MaterialSpecification) => {
    setEditingSpec(spec);
    setFormData({
      spec_code: spec.spec_code,
      title: spec.title,
      category: spec.category,
      standard_code: spec.standard_code,
      grade: spec.grade || '',
      technical_parameters: spec.technical_parameters,
      test_certificates_required: spec.test_certificates_required,
      sampling_frequency: spec.sampling_frequency || '',
      packaging_delivery_terms: spec.packaging_delivery_terms || '',
      is_active: spec.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.spec_code || !formData.title || !formData.technical_parameters) {
      showToast('Spec Code, Title, and Technical Parameters are required.', 'error');
      return;
    }

    try {
      const payload: MaterialSpecification = {
        id: editingSpec ? editingSpec.id : `spec-${Date.now()}`,
        ...formData,
      };
      await db.saveSpecification(payload);
      showToast(`Specification ${payload.spec_code} saved successfully!`, 'success');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to save specification', 'error');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete specification ${code}?`)) {
      return;
    }
    try {
      await db.deleteSpecification(id);
      showToast(`Specification ${code} deleted`, 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete specification', 'error');
    }
  };

  const filtered = specs.filter(s => {
    const matchesSearch =
      s.spec_code.toLowerCase().includes(search.toLowerCase()) ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.standard_code.toLowerCase().includes(search.toLowerCase()) ||
      (s.grade || '').toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Technical Specifications Master
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              IS / ASTM Standards
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain engineering standards, quality tolerances, testing regimes, and test certificate requirements for materials.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="inline-flex items-center px-3.5 py-2 border border-slate-200 bg-white hover:bg-slate-50 shadow-2xs text-xs font-semibold rounded-lg text-emerald-700 hover:text-emerald-800 transition-colors"
            title="Bulk upload specifications from Excel spreadsheet"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5 text-emerald-600" />
            Bulk Upload (Excel)
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Specification
          </button>
        </div>
      </div>

      {/* Navigation Tabs between Item Master and Specifications Master */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <Link
          to="/masters/items"
          className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Package className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
          Item / Material Master
        </Link>
        <Link
          to="/masters/specifications"
          className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs"
        >
          <FileCheck2 className="w-3.5 h-3.5 mr-1.5 text-white" />
          Specifications Master ({specs.length})
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by IS code, title, grade, or spec code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Active Specifications: <span className="font-bold text-slate-800">{filtered.length}</span> of {specs.length}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Category:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium shrink-0 transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Specifications Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            No technical specifications found matching your query.
          </div>
        ) : (
          filtered.map(spec => {
            const conformingItems = items.filter(
              i =>
                (i.specification && i.specification.toLowerCase().includes(spec.standard_code.toLowerCase())) ||
                (spec.grade && i.item_name.toLowerCase().includes(spec.grade.toLowerCase()))
            );

            return (
              <div
                key={spec.id}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {spec.spec_code}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />
                          {spec.standard_code}
                        </span>
                        {spec.grade && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                            {spec.grade}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-2 leading-snug">
                        {spec.title}
                      </h3>
                      <span className="text-[11px] font-medium text-slate-500">
                        Category: {spec.category}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(spec)}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100"
                        title="Edit Specification"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(spec.id, spec.spec_code)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Delete Specification"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Technical Limits */}
                  <div className="mt-3 bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-2">
                    <div>
                      <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider mb-0.5">
                        Technical Tolerances & Parameters:
                      </span>
                      <p className="text-slate-800 font-sans leading-relaxed">
                        {spec.technical_parameters}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-600 block">Mandatory Quality Gate:</span>
                        <span className="text-slate-700">{spec.test_certificates_required}</span>
                      </div>
                      {spec.sampling_frequency && (
                        <div>
                          <span className="font-semibold text-slate-600 block">Sampling Frequency:</span>
                          <span className="text-slate-700">{spec.sampling_frequency}</span>
                        </div>
                      )}
                    </div>

                    {spec.packaging_delivery_terms && (
                      <div className="pt-2 border-t border-slate-200 text-[11px]">
                        <span className="font-semibold text-slate-600 block">Packaging & Transport Norms:</span>
                        <span className="text-slate-700">{spec.packaging_delivery_terms}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with conforming items */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Conforming Master Items: <strong className="text-slate-800 font-semibold">{conformingItems.length}</strong>
                  </span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    spec.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {spec.is_active ? 'ACTIVE STANDARD' : 'RETIRED'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Specification Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <h3 className="text-sm font-bold text-slate-800">
                {editingSpec ? `Edit Specification: ${editingSpec.spec_code}` : 'Add Engineering Material Specification'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Specification Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.spec_code}
                    onChange={e => setFormData({ ...formData, spec_code: e.target.value })}
                    placeholder="e.g. SPEC-STL-01"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Material Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  >
                    <option value="Steel & Metals">Steel & Metals</option>
                    <option value="Cement & Binders">Cement & Binders</option>
                    <option value="Aggregates">Aggregates & Sand</option>
                    <option value="Concrete">Concrete & Admixtures</option>
                    <option value="Masonry & Bricks">Masonry & Blocks</option>
                    <option value="Plumbing & Drainage">Plumbing & Drainage</option>
                    <option value="Electrical & MEP">Electrical & MEP</option>
                    <option value="Finishing Materials">Finishing Materials</option>
                    <option value="General Materials">General Materials</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Specification Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. High Yield Strength Deformed TMT Steel Reinforcement Rebars"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Governing Standard / IS Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.standard_code}
                    onChange={e => setFormData({ ...formData, standard_code: e.target.value })}
                    placeholder="e.g. IS 1786:2008 / ASTM A615"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Grade / Strength Class</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={e => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="e.g. Fe 550D / Grade 53 / Zone II"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Technical Parameters & Quality Limits *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.technical_parameters}
                  onChange={e => setFormData({ ...formData, technical_parameters: e.target.value })}
                  placeholder="Detail chemical composition, proof stress, tensile strength, elongation, compressive strength, tolerances..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Mandatory Gate Test Certificates</label>
                <input
                  type="text"
                  value={formData.test_certificates_required}
                  onChange={e => setFormData({ ...formData, test_certificates_required: e.target.value })}
                  placeholder="e.g. Manufacturer Test Certificate (MTC), 180° cold bend, chemical batch analysis"
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Sampling & Testing Frequency</label>
                  <input
                    type="text"
                    value={formData.sampling_frequency}
                    onChange={e => setFormData({ ...formData, sampling_frequency: e.target.value })}
                    placeholder="e.g. 1 sample set per 20 MT"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Packaging & Transport Norms</label>
                  <input
                    type="text"
                    value={formData.packaging_delivery_terms}
                    onChange={e => setFormData({ ...formData, packaging_delivery_terms: e.target.value })}
                    placeholder="e.g. Bundled with ID tags, shrink-wrapped pallets"
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-slate-700 font-medium">
                  Active Specification (Available for Item Master and Procurement selection)
                </label>
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
                  Save Specification
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
        masterType="specifications"
        onSuccess={loadData}
      />
    </div>
  );
};
