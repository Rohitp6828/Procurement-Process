import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet, Upload, Download, AlertTriangle, CheckCircle2,
  X, RefreshCw, Layers, FileText, Check, AlertCircle, Info
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { db } from '../../lib/db';
import { useNotifications } from '../../contexts/NotificationContext';
import { Item, MaterialSpecification, Vendor, Project, Site, CostCode, TermItem } from '../../types';

export type MasterDataType = 'items' | 'specifications' | 'vendors' | 'projects' | 'sites' | 'cost_codes' | 'terms';

interface ColumnDef {
  key: string;
  label: string;
  required?: boolean;
  example: string | number;
  aliases?: string[];
  description?: string;
}

interface MasterConfig {
  title: string;
  singular: string;
  columns: ColumnDef[];
  sampleData: Record<string, any>[];
  transformRow: (raw: Record<string, any>, existingList?: any[]) => any;
  saveBatch: (records: any[]) => Promise<{ inserted: number; updated: number }>;
}

export interface BulkExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterType: MasterDataType;
  onSuccess: () => void;
  projectsList?: Project[]; // Helpful for Sites import which references project
}

export const BulkExcelUploadModal: React.FC<BulkExcelUploadModalProps> = ({
  isOpen,
  onClose,
  masterType,
  onSuccess,
  projectsList = [],
}) => {
  const { showToast } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<{ row: number; error: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState<{ inserted: number; updated: number; failed: number } | null>(null);

  // Configuration for each Master Data type
  const configs: Record<MasterDataType, MasterConfig> = {
    items: {
      title: 'Item / Material Master',
      singular: 'Item',
      columns: [
        { key: 'item_code', label: 'Item Code (6-Digit Numeric)', required: true, example: '000001', aliases: ['item code', 'itemcode', 'code', 'material code', 'item no'] },
        { key: 'item_name', label: 'Item Name', required: true, example: 'UltraTech OPC 53 Cement', aliases: ['item name', 'itemname', 'name', 'material name', 'description'] },
        { key: 'category', label: 'Category', required: false, example: 'Civil & Structural Materials', aliases: ['category_name', 'category name', 'cat'] },
        { key: 'sub_category', label: 'Sub Category', required: false, example: 'Cement & Binders', aliases: ['sub category', 'sub-category'] },
        { key: 'uom', label: 'Unit / UOM', required: true, example: 'Bag', aliases: ['unit', 'measurement unit'] },
        { key: 'specifications', label: 'Specifications', required: false, example: 'IS:269 certified 50kg bag', aliases: ['spec', 'specification'] },
        { key: 'hsn_code', label: 'HSN / SAC', required: false, example: '252329', aliases: ['hsn', 'hsn_sac', 'hsn sac'] },
        { key: 'gst_rate', label: 'GST Rate (%)', required: false, example: 28, aliases: ['gst', 'gst rate', 'tax rate'] },
        { key: 'standard_rate', label: 'Standard Rate (₹)', required: false, example: 380, aliases: ['rate', 'unit rate', 'price'] },
        { key: 'reorder_level', label: 'Reorder Level', required: false, example: 200, aliases: ['reorder', 'min stock', 'safety stock'] },
      ],
      sampleData: [
        {
          item_code: '000001',
          item_name: 'UltraTech OPC 53 Grade Cement',
          category: 'Civil Materials',
          sub_category: 'Cement',
          uom: 'Bag',
          specifications: 'IS 269:2015 50kg bags',
          hsn_code: '252329',
          gst_rate: 28,
          standard_rate: 380,
          reorder_level: 500,
        },
        {
          item_code: '000002',
          item_name: 'TMT Steel Rebars 16mm Fe550D',
          category: 'Civil Materials',
          sub_category: 'Reinforcement Steel',
          uom: 'MT',
          specifications: 'Tata Tiscon Fe550D conforming to IS:1786',
          hsn_code: '721420',
          gst_rate: 18,
          standard_rate: 64500,
          reorder_level: 25,
        },
        {
          item_code: '000003',
          item_name: 'River Sand Zone II Coarse',
          category: 'Aggregates',
          sub_category: 'Sand',
          uom: 'Cum',
          specifications: 'Washed Zone II river sand for RCC',
          hsn_code: '250510',
          gst_rate: 5,
          standard_rate: 1850,
          reorder_level: 100,
        },
      ],
      transformRow: (raw) => {
        const rawCode = String(raw.item_code || '').trim();
        const numericCode = rawCode ? rawCode.replace(/\D/g, '').padStart(6, '0') : '';

        return {
          id: `itm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          item_code: numericCode || String(raw.item_code || '').trim(),
          item_name: String(raw.item_name || '').trim(),
          category: String(raw.category || 'General').trim(),
          category_name: String(raw.category || 'General').trim(),
          sub_category: String(raw.sub_category || '').trim(),
          uom: String(raw.uom || 'Nos').trim(),
          unit: String(raw.uom || 'Nos').trim(),
          specifications: String(raw.specifications || '').trim(),
          specification: String(raw.specifications || '').trim(),
          hsn_code: String(raw.hsn_code || '').trim(),
          hsn_sac: String(raw.hsn_code || '').trim(),
          gst_rate: Number(raw.gst_rate) || 18,
          standard_rate: Number(raw.standard_rate) || 0,
          reorder_level: Number(raw.reorder_level) || 0,
          status: 'ACTIVE',
          is_active: true,
        };
      },
      saveBatch: async (records: Item[]) => {
        let inserted = 0;
        let updated = 0;
        const existing = await db.getItems();
        for (const item of records) {
          const match = existing.find(e => e.item_code.toLowerCase() === item.item_code.toLowerCase());
          if (match) {
            await db.saveItem({ ...match, ...item, id: match.id });
            updated++;
          } else {
            await db.saveItem(item);
            inserted++;
          }
        }
        return { inserted, updated };
      },
    },

    specifications: {
      title: 'Technical & Engineering Specifications',
      singular: 'Specification',
      columns: [
        { key: 'spec_code', label: 'Spec Code', required: true, example: 'SPEC-STL-01', aliases: ['code', 'specification code', 'spec no'] },
        { key: 'title', label: 'Specification Title', required: true, example: 'High Yield Strength TMT Rebars', aliases: ['name', 'title', 'spec name', 'material'] },
        { key: 'category', label: 'Category', required: true, example: 'Steel & Metals', aliases: ['material category', 'group'] },
        { key: 'standard_code', label: 'Governing Standard / IS Code', required: true, example: 'IS 1786:2008', aliases: ['is code', 'standard', 'astm', 'din'] },
        { key: 'grade', label: 'Grade / Strength', required: false, example: 'Fe 550D', aliases: ['grade', 'class'] },
        { key: 'technical_parameters', label: 'Technical Tolerances & Limits', required: true, example: 'Yield Strength >= 550 N/mm2, Elongation >= 16%', aliases: ['parameters', 'tolerances', 'limits'] },
        { key: 'test_certificates_required', label: 'Mandatory Test Certificates', required: false, example: 'MTC with heat no, cold bend test', aliases: ['mtc', 'tests required', 'certificates'] },
        { key: 'sampling_frequency', label: 'Sampling Frequency', required: false, example: '1 test set per 20 MT', aliases: ['frequency', 'sampling'] },
        { key: 'packaging_delivery_terms', label: 'Packaging & Delivery Norms', required: false, example: '12m straight bundles with wire straps', aliases: ['packaging', 'delivery condition'] },
      ],
      sampleData: [
        {
          spec_code: 'SPEC-STL-01',
          title: 'High Yield Strength Deformed TMT Steel Reinforcement Rebars',
          category: 'Steel & Metals',
          standard_code: 'IS 1786:2008',
          grade: 'Fe 550D',
          technical_parameters: 'Proof Stress Min 550 N/mm²; Tensile Strength Min 600 N/mm²; Elongation Min 16%; Carbon Max 0.25%.',
          test_certificates_required: 'MTC with heat number, chemical batch analysis, cold bend & re-bend test.',
          sampling_frequency: '1 set of 3 test specimens per 20 MT.',
          packaging_delivery_terms: '12m standard lengths, bundled & tagged.',
        },
        {
          spec_code: 'SPEC-CEM-01',
          title: 'Ordinary Portland Cement (OPC) 53 Grade',
          category: 'Cement & Binders',
          standard_code: 'IS 12269:2013',
          grade: 'Grade 53',
          technical_parameters: 'Compressive Strength: 72h >= 27 MPa, 168h >= 37 MPa, 672h >= 53 MPa; Blaine Fineness Min 225 m²/kg.',
          test_certificates_required: 'Factory weekly composite test certificate with 3, 7, 28 day strength.',
          sampling_frequency: '1 sample per 50 MT.',
          packaging_delivery_terms: '50kg HDPE laminated moisture-proof bags.',
        },
      ],
      transformRow: (raw) => {
        return {
          id: `spec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          spec_code: String(raw.spec_code || '').trim().toUpperCase(),
          title: String(raw.title || '').trim(),
          category: String(raw.category || 'General').trim(),
          standard_code: String(raw.standard_code || 'IS Standard').trim(),
          grade: String(raw.grade || '').trim(),
          technical_parameters: String(raw.technical_parameters || '').trim(),
          test_certificates_required: String(raw.test_certificates_required || 'Standard MTC').trim(),
          sampling_frequency: String(raw.sampling_frequency || '').trim(),
          packaging_delivery_terms: String(raw.packaging_delivery_terms || '').trim(),
          is_active: true,
        };
      },
      saveBatch: async (records: MaterialSpecification[]) => {
        let inserted = 0;
        let updated = 0;
        const existing = await db.getSpecifications();
        for (const spec of records) {
          const match = existing.find(e => e.spec_code.toLowerCase() === spec.spec_code.toLowerCase());
          if (match) {
            await db.saveSpecification({ ...match, ...spec, id: match.id });
            updated++;
          } else {
            await db.saveSpecification(spec);
            inserted++;
          }
        }
        return { inserted, updated };
      },
    },

    vendors: {
      title: 'Vendor / Supplier Master',
      singular: 'Vendor',
      columns: [
        { key: 'vendor_code', label: 'Vendor Code', required: true, example: 'VND-005', aliases: ['vendor code', 'vendorcode', 'supplier code', 'code'] },
        { key: 'vendor_name', label: 'Vendor Name', required: true, example: 'Shree Cement Corporation', aliases: ['vendor name', 'vendorname', 'supplier name', 'company'] },
        { key: 'vendor_type', label: 'Vendor Type', required: false, example: 'MANUFACTURER', aliases: ['type', 'category'] },
        { key: 'gst_number', label: 'GSTIN', required: false, example: '27AABCU1234F1Z5', aliases: ['gst', 'gstin', 'gst number'] },
        { key: 'pan_number', label: 'PAN Number', required: false, example: 'AABCU1234F', aliases: ['pan', 'pan number'] },
        { key: 'contact_person', label: 'Contact Person', required: false, example: 'Rajesh Singhal', aliases: ['contact', 'contact person', 'person'] },
        { key: 'mobile', label: 'Mobile / Phone', required: false, example: '+91 98220 55443', aliases: ['phone', 'contact number', 'mobile number'] },
        { key: 'email', label: 'Email Address', required: false, example: 'rajesh@shreecement.com', aliases: ['mail', 'email id'] },
        { key: 'city', label: 'City', required: false, example: 'Pune', aliases: ['town'] },
        { key: 'state', label: 'State', required: false, example: 'Maharashtra', aliases: ['province'] },
        { key: 'payment_terms', label: 'Payment Terms', required: false, example: '30 Days Net', aliases: ['terms', 'credit terms'] },
        { key: 'credit_days', label: 'Credit Days', required: false, example: 30, aliases: ['credit', 'days'] },
      ],
      sampleData: [
        {
          vendor_code: 'VND-005',
          vendor_name: 'Shree Cement Corporation Ltd',
          vendor_type: 'MANUFACTURER',
          gst_number: '27AABCU1234F1Z5',
          pan_number: 'AABCU1234F',
          contact_person: 'Rajesh Singhal',
          mobile: '+91 98220 55443',
          email: 'rajesh@shreecement.com',
          city: 'Pune',
          state: 'Maharashtra',
          payment_terms: '30 Days Net',
          credit_days: 30,
        },
        {
          vendor_code: 'VND-006',
          vendor_name: 'Kamdhenu Steel & Alloys',
          vendor_type: 'DISTRIBUTOR',
          gst_number: '27AAACK5521M1Z8',
          pan_number: 'AAACK5521M',
          contact_person: 'Anil Agarwal',
          mobile: '+91 98221 66778',
          email: 'sales@kamdhenusteel.in',
          city: 'Navi Mumbai',
          state: 'Maharashtra',
          payment_terms: '15 Days Net',
          credit_days: 15,
        },
      ],
      transformRow: (raw) => ({
        id: `vnd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        vendor_code: String(raw.vendor_code || '').trim(),
        vendor_name: String(raw.vendor_name || '').trim(),
        vendor_type: String(raw.vendor_type || 'SUPPLIER').toUpperCase().trim(),
        gst_number: String(raw.gst_number || '').trim().toUpperCase(),
        pan_number: String(raw.pan_number || '').trim().toUpperCase(),
        contact_person: String(raw.contact_person || '').trim(),
        mobile: String(raw.mobile || '').trim(),
        email: String(raw.email || '').trim().toLowerCase(),
        city: String(raw.city || 'Pune').trim(),
        state: String(raw.state || 'Maharashtra').trim(),
        address: String(raw.address || raw.city || 'Market Yard').trim(),
        pincode: String(raw.pincode || '411001').trim(),
        payment_terms: String(raw.payment_terms || '30 Days Net').trim(),
        credit_days: Number(raw.credit_days) || 30,
        vendor_rating: Number(raw.vendor_rating) || 4.5,
        status: 'ACTIVE',
      }),
      saveBatch: async (records: Vendor[]) => {
        let inserted = 0;
        let updated = 0;
        const existing = await db.getVendors();
        for (const v of records) {
          const match = existing.find(e => e.vendor_code.toLowerCase() === v.vendor_code.toLowerCase());
          if (match) {
            await db.saveVendor({ ...match, ...v, id: match.id });
            updated++;
          } else {
            await db.saveVendor(v);
            inserted++;
          }
        }
        return { inserted, updated };
      },
    },

    projects: {
      title: 'Project Master',
      singular: 'Project',
      columns: [
        { key: 'project_code', label: 'Project Code', required: true, example: 'PRJ-104', aliases: ['project code', 'projectcode', 'code'] },
        { key: 'project_name', label: 'Project Name', required: true, example: 'Metro Rail Corridor Phase 2', aliases: ['project name', 'projectname', 'title'] },
        { key: 'client_name', label: 'Client / Authority', required: true, example: 'Maha Metro Rail Corp', aliases: ['client', 'authority', 'customer'] },
        { key: 'project_type', label: 'Project Type', required: false, example: 'Infrastructure & Rail', aliases: ['type', 'category'] },
        { key: 'location', label: 'Location / City', required: false, example: 'Pune - Hinjewadi', aliases: ['city', 'site location'] },
        { key: 'start_date', label: 'Start Date (YYYY-MM-DD)', required: false, example: '2026-04-01', aliases: ['start', 'commencement date'] },
        { key: 'end_date', label: 'Target Completion Date', required: false, example: '2028-12-31', aliases: ['end', 'completion date'] },
        { key: 'project_manager', label: 'Project Manager', required: false, example: 'Sanjeev Deshmukh', aliases: ['pm', 'manager'] },
        { key: 'budget', label: 'Total Budget (₹)', required: false, example: 95000000, aliases: ['cost', 'estimated cost'] },
      ],
      sampleData: [
        {
          project_code: 'PRJ-104',
          project_name: 'Metro Rail Corridor Phase 2',
          client_name: 'Maha Metro Rail Corp Ltd',
          project_type: 'Infrastructure & Rail',
          location: 'Pune - Hinjewadi',
          start_date: '2026-04-01',
          end_date: '2028-12-31',
          project_manager: 'Sanjeev Deshmukh',
          budget: 95000000,
        },
        {
          project_code: 'PRJ-105',
          project_name: 'Lakeview Luxury Enclave',
          client_name: 'Prestige Group Developers',
          project_type: 'High-Rise Residential',
          location: 'Baner, Pune',
          start_date: '2026-05-15',
          end_date: '2029-06-30',
          project_manager: 'Sunil Rathi',
          budget: 62000000,
        },
      ],
      transformRow: (raw) => ({
        id: `prj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        project_code: String(raw.project_code || '').trim(),
        project_name: String(raw.project_name || '').trim(),
        client_name: String(raw.client_name || 'Client Corporation').trim(),
        project_type: String(raw.project_type || 'Civil Construction').trim(),
        location: String(raw.location || 'Pune').trim(),
        start_date: String(raw.start_date || new Date().toISOString().split('T')[0]).trim(),
        end_date: String(raw.end_date || '').trim(),
        project_manager: String(raw.project_manager || 'Site Lead').trim(),
        budget: Number(raw.budget) || 10000000,
        status: 'ACTIVE',
      }),
      saveBatch: async (records: Project[]) => {
        let inserted = 0;
        let updated = 0;
        const existing = await db.getProjects();
        for (const p of records) {
          const match = existing.find(e => e.project_code.toLowerCase() === p.project_code.toLowerCase());
          if (match) {
            await db.saveProject({ ...match, ...p, id: match.id });
            updated++;
          } else {
            await db.saveProject(p);
            inserted++;
          }
        }
        return { inserted, updated };
      },
    },

    sites: {
      title: 'Site & Warehouse Master',
      singular: 'Site',
      columns: [
        { key: 'site_code', label: 'Site Code', required: true, example: 'SIT-METRO-01', aliases: ['site code', 'sitecode', 'code'] },
        { key: 'site_name', label: 'Site / Yard Name', required: true, example: 'Hinjewadi Station Site & Yard', aliases: ['site name', 'sitename', 'yard'] },
        { key: 'project_code', label: 'Parent Project Code or Name', required: true, example: 'PRJ-104', aliases: ['project code', 'project_name', 'project'] },
        { key: 'site_address', label: 'Site Physical Address', required: false, example: 'Survey 48, Rajiv Gandhi Infotech Park', aliases: ['address', 'location'] },
        { key: 'site_manager', label: 'Site Engineer / Manager', required: false, example: 'Vikas Kadam', aliases: ['manager', 'incharge', 'engineer'] },
        { key: 'contact_number', label: 'Site Phone', required: false, example: '+91 98224 88990', aliases: ['phone', 'mobile'] },
      ],
      sampleData: [
        {
          site_code: 'SIT-METRO-01',
          site_name: 'Hinjewadi Station Site & Yard',
          project_code: 'PRJ-104',
          site_address: 'Survey 48, Rajiv Gandhi Infotech Park, Hinjewadi',
          site_manager: 'Vikas Kadam',
          contact_number: '+91 98224 88990',
        },
        {
          site_code: 'SIT-RES-02',
          site_name: 'Tower C & D Substructure Site',
          project_code: 'PRJ-105',
          site_address: 'Plot 12, Baner Hill Road, Pune',
          site_manager: 'Ramesh Thorat',
          contact_number: '+91 98224 11224',
        },
      ],
      transformRow: (raw) => {
        // Resolve project_id from project_code or project_name
        const projMatch = projectsList.find(
          p => p.project_code.toLowerCase() === String(raw.project_code || '').toLowerCase() ||
               p.project_name.toLowerCase().includes(String(raw.project_code || '').toLowerCase())
        );

        return {
          id: `sit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          site_code: String(raw.site_code || '').trim(),
          site_name: String(raw.site_name || '').trim(),
          project_id: projMatch ? projMatch.id : (projectsList[0]?.id || `prj-1`),
          project_name: projMatch ? projMatch.project_name : (projectsList[0]?.project_name || 'Highway Construction Project'),
          site_address: String(raw.site_address || 'Main Project Worksite').trim(),
          site_manager: String(raw.site_manager || 'Site Lead').trim(),
          contact_number: String(raw.contact_number || '').trim(),
          status: 'ACTIVE',
        };
      },
      saveBatch: async (records: Site[]) => {
        let inserted = 0;
        let updated = 0;
        const existing = await db.getSites();
        for (const s of records) {
          const match = existing.find(e => e.site_code.toLowerCase() === s.site_code.toLowerCase());
          if (match) {
            await db.saveSite({ ...match, ...s, id: match.id });
            updated++;
          } else {
            await db.saveSite(s);
            inserted++;
          }
        }
        return { inserted, updated };
      },
    },

    cost_codes: {
      title: 'Cost Code Master',
      singular: 'Cost Code',
      columns: [
        { key: 'code', label: 'Cost Code', required: true, example: 'CC-CIV-005', aliases: ['code', 'cost code', 'costcode', 'budget code'] },
        { key: 'name', label: 'Description / Activity Name', required: true, example: 'Prestressed Concrete Girder Casting', aliases: ['description', 'name', 'activity'] },
        { key: 'category', label: 'Discipline / Category', required: false, example: 'Civil & Structural', aliases: ['category', 'discipline', 'department'] },
      ],
      sampleData: [
        { code: 'CC-CIV-005', name: 'Prestressed Concrete Girder Casting', category: 'Civil & Structural' },
        { code: 'CC-ELE-002', name: 'Substation Transformer & Cabling', category: 'Electrical & MEP' },
        { code: 'CC-FIN-003', name: 'Exterior Facade & Curtain Glazing', category: 'Finishing & Architectural' },
      ],
      transformRow: (raw) => ({
        id: `cc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        code: String(raw.code || '').trim(),
        name: String(raw.name || raw.description || '').trim(),
        description: String(raw.name || raw.description || '').trim(),
        category: String(raw.category || 'Civil Works').trim(),
        is_active: true,
      }),
      saveBatch: async (records: CostCode[]) => {
        let inserted = 0;
        let updated = 0;
        const existing = await db.getCostCodes();
        for (const c of records) {
          const match = existing.find(e => e.code.toLowerCase() === c.code.toLowerCase());
          if (match) {
            await db.saveCostCode({ ...match, ...c, id: match.id });
            updated++;
          } else {
            await db.saveCostCode(c);
            inserted++;
          }
        }
        return { inserted, updated };
      },
    },

    terms: {
      title: 'Terms & Conditions Master',
      singular: 'Term',
      columns: [
        { key: 'term_title', label: 'Term Title', required: true, example: 'Testing & Mill Inspection Certificate', aliases: ['title', 'term title', 'code', 'term_code'] },
        { key: 'term_type', label: 'Type (PO / RFQ / PAYMENT / GENERAL)', required: false, example: 'PO', aliases: ['type', 'term type'] },
        { key: 'term_content', label: 'Full Term / Clause Content', required: true, example: 'Manufacturer test certificate (MTC) must accompany every delivery truck before gate entry.', aliases: ['content', 'text', 'clause', 'term_text'] },
        { key: 'is_default', label: 'Default for New Orders (TRUE/FALSE)', required: false, example: 'TRUE', aliases: ['default', 'is default'] },
      ],
      sampleData: [
        {
          term_title: 'Testing & Mill Inspection Certificate',
          term_type: 'PO',
          term_content: 'Manufacturer test certificate (MTC) must accompany every delivery truck before gate entry.',
          is_default: 'TRUE',
        },
        {
          term_title: 'Retention Money Deduction Clause',
          term_type: 'PAYMENT',
          term_content: '5% retention will be deducted from each running tax invoice and released after 6 months defect liability period.',
          is_default: 'FALSE',
        },
      ],
      transformRow: (raw) => ({
        id: `trm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        term_title: String(raw.term_title || raw.term_code || '').trim(),
        term_code: String(raw.term_title || raw.term_code || '').trim(),
        term_type: String(raw.term_type || 'PO').toUpperCase().trim(),
        term_content: String(raw.term_content || raw.term_text || '').trim(),
        term_text: String(raw.term_content || raw.term_text || '').trim(),
        is_default: String(raw.is_default || '').toUpperCase() === 'TRUE' || raw.is_default === true,
      }),
      saveBatch: async (records: TermItem[]) => {
        let inserted = 0;
        let updated = 0;
        const existing = await db.getTerms();
        for (const t of records) {
          const match = existing.find(e => (e.term_title || e.term_code).toLowerCase() === (t.term_title || t.term_code).toLowerCase());
          if (match) {
            await db.saveTerm({ ...match, ...t, id: match.id });
            updated++;
          } else {
            await db.saveTerm(t);
            inserted++;
          }
        }
        return { inserted, updated };
      },
    },
  };

  const currentConfig = configs[masterType];

  if (!isOpen) return null;

  // Download official sample Excel template
  const handleDownloadSample = () => {
    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(currentConfig.sampleData);
      
      // Auto-fit column widths
      const colWidths = currentConfig.columns.map(col => ({
        wch: Math.max(col.label.length, 16),
      }));
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      const filename = `${masterType}_bulk_upload_template.xlsx`;
      XLSX.writeFile(wb, filename);
      showToast(`Sample template ${filename} downloaded!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate template', 'error');
    }
  };

  // Helper to map spreadsheet headers to config keys
  const mapHeaderToKey = (header: string): string | null => {
    const cleanHeader = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    for (const col of currentConfig.columns) {
      const cleanColKey = col.key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanColLabel = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanHeader === cleanColKey || cleanHeader === cleanColLabel) {
        return col.key;
      }
      if (col.aliases) {
        for (const alias of col.aliases) {
          if (cleanHeader === alias.toLowerCase().replace(/[^a-z0-9]/g, '')) {
            return col.key;
          }
        }
      }
    }
    return null;
  };

  // Process chosen file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const selectedFile = files[0];
    processSelectedFile(selectedFile);
  };

  const processSelectedFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setValidationErrors([]);
    setImportSummary(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('Workbook contains no worksheets.');
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (rawRows.length === 0) {
        throw new Error('No rows found in the uploaded spreadsheet.');
      }

      // Map headers dynamically
      const errors: { row: number; error: string }[] = [];
      const transformedRows = rawRows.map((rawRow, idx) => {
        const mappedRow: Record<string, any> = {};
        Object.keys(rawRow).forEach(origKey => {
          const targetKey = mapHeaderToKey(origKey);
          if (targetKey) {
            mappedRow[targetKey] = rawRow[origKey];
          } else {
            mappedRow[origKey] = rawRow[origKey];
          }
        });

        // Validate required fields
        currentConfig.columns.forEach(col => {
          if (col.required && (!mappedRow[col.key] || String(mappedRow[col.key]).trim() === '')) {
            errors.push({
              row: idx + 2, // Excel row index
              error: `Missing required field "${col.label}"`,
            });
          }
        });

        return currentConfig.transformRow(mappedRow);
      });

      setParsedRows(transformedRows);
      setValidationErrors(errors);
      showToast(`Parsed ${transformedRows.length} rows from ${selectedFile.name}!`, 'info');
    } catch (err: any) {
      console.error('File parsing error:', err);
      showToast(err.message || 'Failed to read Excel file', 'error');
      setFile(null);
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Perform bulk import
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsUploading(true);
    setImportProgress({ current: 0, total: parsedRows.length });

    try {
      const result = await currentConfig.saveBatch(parsedRows);
      setImportSummary({
        inserted: result.inserted,
        updated: result.updated,
        failed: 0,
      });

      showToast(`Bulk Upload Successful: ${result.inserted} added, ${result.updated} updated!`, 'success');
      onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Bulk upload failed', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedRows([]);
    setValidationErrors([]);
    setImportSummary(null);
    setImportProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-slate-50 to-blue-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                Bulk Upload {currentConfig.title} from Excel
              </h3>
              <p className="text-xs text-slate-500">
                Upload .xlsx, .xls, or .csv files to insert new {currentConfig.singular.toLowerCase()} records or update existing ones by code.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Step 1: Download Template Banner */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 text-xs">Step 1: Download Sample Excel Template</h4>
                <p className="text-[11px] text-blue-700/90 mt-0.5 leading-relaxed">
                  Use our standardized template pre-configured with the exact column headers ({currentConfig.columns.map(c => c.label).slice(0, 4).join(', ')}...) and sample entries.
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadSample}
              className="inline-flex items-center justify-center px-3.5 py-2 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-100/60 border border-blue-300 rounded-lg shadow-2xs transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Excel Template
            </button>
          </div>

          {/* Step 2: Upload Dropzone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                <Upload className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Step 2: Choose or Drop your Excel Sheet (.xlsx, .xls, .csv)
              </h4>
              {file && (
                <button
                  onClick={handleReset}
                  className="text-rose-600 hover:text-rose-700 font-semibold text-[11px]"
                >
                  Clear & Choose Another File
                </button>
              )}
            </div>

            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processSelectedFile(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-xl p-8 text-center cursor-pointer transition-all bg-slate-50/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-inner">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <p className="font-semibold text-slate-800 text-sm">
                  Click to browse or drag and drop your spreadsheet here
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                      <span>{file.name}</span>
                      <span className="text-[10px] font-mono font-normal text-slate-400">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Parsed <strong>{parsedRows.length}</strong> {currentConfig.singular.toLowerCase()} records
                      {validationErrors.length > 0 ? (
                        <span className="text-amber-600 ml-2 font-medium">
                          ⚠️ {validationErrors.length} required field {validationErrors.length === 1 ? 'issue' : 'issues'}
                        </span>
                      ) : (
                        <span className="text-emerald-600 ml-2 font-medium">
                          ✓ All required columns present
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 space-y-1">
              <div className="font-bold flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-600 shrink-0" />
                Validation Warnings ({validationErrors.length})
              </div>
              <ul className="list-disc list-inside text-[11px] max-h-24 overflow-y-auto space-y-0.5 text-amber-900/90 pl-1">
                {validationErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>Row {err.row}: {err.error}</li>
                ))}
                {validationErrors.length > 5 && (
                  <li>...and {validationErrors.length - 5} more issues. Please check your data before uploading.</li>
                )}
              </ul>
            </div>
          )}

          {/* Step 3: Parsed Data Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center">
                  <Layers className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Step 3: Preview Data to be Imported ({parsedRows.length} Records)
                </h4>
                <span className="text-[11px] text-slate-400">
                  Showing first {Math.min(parsedRows.length, 5)} rows
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      {currentConfig.columns.slice(0, 6).map((c, i) => (
                        <th key={i} className="px-3 py-2 whitespace-nowrap">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-mono text-slate-400">{idx + 1}</td>
                        {currentConfig.columns.slice(0, 6).map((c, cIdx) => (
                          <td key={cIdx} className="px-3 py-1.5 font-medium text-slate-700 whitespace-nowrap">
                            {String(row[c.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Success Summary */}
          {importSummary && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-emerald-200 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">Import Processed Successfully!</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    <strong>{importSummary.inserted}</strong> new records created · <strong>{importSummary.updated}</strong> existing records updated
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition-colors shadow-2xs"
              >
                Close & View Records
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {parsedRows.length > 0 ? (
              <span>Ready to import <strong>{parsedRows.length}</strong> {currentConfig.singular.toLowerCase()} records into the database.</span>
            ) : (
              <span>Select an Excel file to begin bulk processing.</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 font-medium rounded-lg shadow-2xs transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={parsedRows.length === 0 || isUploading}
              className="inline-flex items-center px-4 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none font-semibold rounded-lg shadow-2xs transition-colors"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Importing Records...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Import {parsedRows.length > 0 ? `${parsedRows.length} ` : ''}Records
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
