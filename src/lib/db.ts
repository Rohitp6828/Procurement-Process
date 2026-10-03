// CivProcure – Unified Data Access & Business Engine
// Provides complete relational database operations, audit logging, 3-way matching,
// approval engine workflows, and live Supabase synchronization.

import { supabase, isSupabaseConfigured } from './supabase';
import {
  Project, Site, Vendor, VendorEvaluation, Item, MaterialSpecification, CostCode, TermItem,
  ApprovalMatrixTier, ApprovalTransaction, PurchaseRequisition, PRItem,
  RFQ, VendorQuotation, QuotationComparison, SupplierShortlist,
  PurchaseOrder, POItem, POVersion, AdvancePayment, GoodsReceivedNote,
  DebitNote, PurchaseBill, FinancialPosting, Payment, Knockoff,
  AuditLog, Notification, UserRole, StockLedger, MaterialIssue, MaterialTransfer
} from '../types';
import { generateDocNumber, round } from './utils';

// Local storage storage keys
const STORAGE_PREFIX = 'civprocure_db_';

function getStored<T>(key: string, defaultVal: T): T {
  if (typeof window === 'undefined') return defaultVal;
  const data = localStorage.getItem(STORAGE_PREFIX + key);
  if (!data) return defaultVal;
  try {
    return JSON.parse(data);
  } catch {
    return defaultVal;
  }
}

function setStored<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(val));
}

export function toValidUUID(id?: string): string {
  if (!id) return '00000000-0000-4000-8000-000000000000';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  const knownMap: Record<string, string> = {
    'prj-1': '33333333-3333-3333-3333-333333333301',
    'prj-2': '33333333-3333-3333-3333-333333333302',
    'prj-3': '33333333-3333-3333-3333-333333333303',
    'sit-1': '44444444-4444-4444-4444-444444444401',
    'sit-2': '44444444-4444-4444-4444-444444444402',
    'sit-3': '44444444-4444-4444-4444-444444444403',
    'vnd-1': '55555555-5555-5555-5555-555555555501',
    'vnd-2': '55555555-5555-5555-5555-555555555502',
    'vnd-3': '55555555-5555-5555-5555-555555555503',
    'vnd-4': '55555555-5555-5555-5555-555555555504',
    'itm-1': '22222222-2222-2222-2222-222222222201',
    'itm-2': '22222222-2222-2222-2222-222222222202',
    'itm-3': '22222222-2222-2222-2222-222222222203',
    'itm-4': '22222222-2222-2222-2222-222222222204',
    'itm-5': '22222222-2222-2222-2222-222222222205',
    'itm-6': '22222222-2222-2222-2222-222222222206',
    'itm-7': '22222222-2222-2222-2222-222222222207',
    'itm-8': '22222222-2222-2222-2222-222222222208',
    'itm-9': '22222222-2222-2222-2222-222222222209',
    'cc-1': '66666666-6666-6666-6666-666666666601',
    'cc-2': '66666666-6666-6666-6666-666666666602',
    'cc-3': '66666666-6666-6666-6666-666666666603',
    'cc-4': '66666666-6666-6666-6666-666666666604',
    'cc-5': '66666666-6666-6666-6666-666666666605',
    'cc-6': '66666666-6666-6666-6666-666666666606',
    't-1': '77777777-7777-7777-7777-777777777701',
    't-2': '77777777-7777-7777-7777-777777777702',
    't-3': '77777777-7777-7777-7777-777777777703',
    't-4': '77777777-7777-7777-7777-777777777704',
    'am-1': '88888888-8888-8888-8888-888888888801',
    'am-2': '88888888-8888-8888-8888-888888888802',
    'am-3': '88888888-8888-8888-8888-888888888803',
    'am-4': '88888888-8888-8888-8888-888888888804',
    'am-5': '88888888-8888-8888-8888-888888888805',
    'am-6': '88888888-8888-8888-8888-888888888806',
    'am-7': '88888888-8888-8888-8888-888888888807',
    'am-8': '88888888-8888-8888-8888-888888888808',
    'am-9': '88888888-8888-8888-8888-888888888809',
    'am-10': '88888888-8888-8888-8888-888888888810',
  };
  if (knownMap[id]) return knownMap[id];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex.padEnd(12, '0').slice(0, 12)}`;
}


// -------------------------------------------------------------
// INITIAL SEED DATA
// -------------------------------------------------------------
const INITIAL_PROJECTS: Project[] = [
  {
    id: 'prj-1',
    project_code: 'PRJ-HWY-01',
    project_name: 'Highway Construction Project',
    client_name: 'National Highways Authority of India',
    project_type: 'Expressway & Bridges',
    location: 'Sector 82, Expressway Corridor, Pune',
    start_date: '2026-01-10',
    end_date: '2027-12-31',
    project_manager: 'Vikramaditya Sharma',
    budget: 85000000,
    status: 'ACTIVE',
  },
  {
    id: 'prj-2',
    project_code: 'PRJ-TWR-02',
    project_name: 'Residential Tower Project',
    client_name: 'Skyline Infra Developers',
    project_type: 'High-Rise Residential (G+32)',
    location: 'Plot 4A, Baner Hilltop, Pune',
    start_date: '2025-08-15',
    end_date: '2027-06-30',
    project_manager: 'Ananya Deshmukh',
    budget: 42000000,
    status: 'ACTIVE',
  },
  {
    id: 'prj-3',
    project_code: 'PRJ-BLD-03',
    project_name: 'Commercial Building Project',
    client_name: 'Apex Tech Parks Ltd',
    project_type: 'Commercial IT Park Complex',
    location: 'Phase 3 Hinjewadi IT Park, Pune',
    start_date: '2026-02-01',
    end_date: '2028-01-31',
    project_manager: 'Rajesh Kulkarni',
    budget: 68000000,
    status: 'ACTIVE',
  },
];

const INITIAL_SITES: Site[] = [
  {
    id: 'sit-1',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    site_code: 'SIT-HWY-NTH',
    site_name: 'Highway North Interchange Site',
    site_address: 'Km 42+500 Chakan Junction, Pune',
    site_manager: 'Manoj Patil',
    contact_number: '+91 98220 11223',
    status: 'ACTIVE',
  },
  {
    id: 'sit-2',
    project_id: 'prj-2',
    project_name: 'Residential Tower Project',
    site_code: 'SIT-TWR-T1',
    site_name: 'Tower A & B Foundation Site',
    site_address: 'Survey 104, Pan Card Club Road, Baner',
    site_manager: 'Suresh Joshi',
    contact_number: '+91 98220 44556',
    status: 'ACTIVE',
  },
  {
    id: 'sit-3',
    project_id: 'prj-3',
    project_name: 'Commercial Building Project',
    site_code: 'SIT-BLD-PH1',
    site_name: 'Commercial Podium & Basements Site',
    site_address: 'Phase 3 Hinjewadi IT Park, Pune',
    site_manager: 'Deepak Verma',
    contact_number: '+91 98220 77889',
    status: 'ACTIVE',
  },
];

const INITIAL_VENDORS: Vendor[] = [
  {
    id: 'vnd-1',
    vendor_code: 'VND-001',
    vendor_name: 'ABC Cement Suppliers',
    vendor_type: 'MANUFACTURER',
    gst_number: '27AABCU9603R1ZM',
    pan_number: 'AABCU9603R',
    contact_person: 'Arvind Singhania',
    mobile: '+91 98231 00112',
    email: 'arvind@abccement.com',
    address: 'Industrial Area Phase 2, Hadapsar',
    state: 'Maharashtra',
    city: 'Pune',
    pincode: '411028',
    bank_name: 'HDFC Bank',
    account_number: '50200048192019',
    ifsc: 'HDFC0000180',
    payment_terms: '30 Days Net',
    credit_days: 30,
    vendor_rating: 4.8,
    status: 'ACTIVE',
  },
  {
    id: 'vnd-2',
    vendor_code: 'VND-002',
    vendor_name: 'XYZ Steel Traders',
    vendor_type: 'DISTRIBUTOR',
    gst_number: '27AAACX8812K1ZT',
    pan_number: 'AAACX8812K',
    contact_person: 'Gaurav Agarwal',
    mobile: '+91 98232 44332',
    email: 'sales@xyzsteel.com',
    address: 'Steel Yard Market, Kalamboli',
    state: 'Maharashtra',
    city: 'Navi Mumbai',
    pincode: '410218',
    bank_name: 'ICICI Bank',
    account_number: '004705008912',
    ifsc: 'ICIC0000047',
    payment_terms: '15 Days Net',
    credit_days: 15,
    vendor_rating: 4.7,
    status: 'ACTIVE',
  },
  {
    id: 'vnd-3',
    vendor_code: 'VND-003',
    vendor_name: 'National Electricals',
    vendor_type: 'DEALER',
    gst_number: '27AABCN5541L1Z9',
    pan_number: 'AABCN5541L',
    contact_person: 'Sunil Mehta',
    mobile: '+91 98233 77665',
    email: 'contact@nationalelec.in',
    address: 'Budhwar Peth Electrical Market',
    state: 'Maharashtra',
    city: 'Pune',
    pincode: '411002',
    bank_name: 'State Bank of India',
    account_number: '38920192841',
    ifsc: 'SBIN0000455',
    payment_terms: '30 Days Net',
    credit_days: 30,
    vendor_rating: 4.3,
    status: 'ACTIVE',
  },
  {
    id: 'vnd-4',
    vendor_code: 'VND-004',
    vendor_name: 'Prime Plumbing Solutions',
    vendor_type: 'SUPPLIER',
    gst_number: '27AABCP3319M1Z4',
    pan_number: 'AABCP3319M',
    contact_person: 'Ramesh Jadhav',
    mobile: '+91 98234 99887',
    email: 'ramesh@primeplumb.in',
    address: 'Market Yard Commercial Complex',
    state: 'Maharashtra',
    city: 'Pune',
    pincode: '411037',
    bank_name: 'Axis Bank',
    account_number: '918020038472918',
    ifsc: 'UTIB0000212',
    payment_terms: '45 Days Net',
    credit_days: 45,
    vendor_rating: 4.5,
    status: 'ACTIVE',
  },
];

const INITIAL_ITEMS: Item[] = [
  {
    id: 'itm-1',
    item_code: '000001',
    item_name: 'Cement OPC 53 Grade',
    category_name: 'Civil & Structural Materials',
    description: 'UltraTech 53 Grade Ordinary Portland Cement',
    specification: 'IS 269:2015 certified 50kg bags',
    unit: 'Bag',
    hsn_sac: '25232910',
    gst_rate: 28,
    standard_rate: 360,
    reorder_level: 500,
    is_active: true,
  },
  {
    id: 'itm-2',
    item_code: '000002',
    item_name: 'TMT Steel Rebars Fe 550D',
    category_name: 'Civil & Structural Materials',
    description: 'Tata Tiscon High Ductility Fe 550D 16mm',
    specification: 'IS 1786 grade, standard bundles',
    unit: 'MT',
    hsn_sac: '72142090',
    gst_rate: 18,
    standard_rate: 64500,
    reorder_level: 20,
    is_active: true,
  },
  {
    id: 'itm-3',
    item_code: '000003',
    item_name: 'River Sand (Coarse Zone II)',
    category_name: 'Civil & Structural Materials',
    description: 'Washed natural river sand for RCC work',
    specification: 'Zone II silt content < 3%',
    unit: 'Cum',
    hsn_sac: '25051000',
    gst_rate: 5,
    standard_rate: 1850,
    reorder_level: 100,
    is_active: true,
  },
  {
    id: 'itm-4',
    item_code: '000004',
    item_name: 'Aggregate 20mm Blue Metal',
    category_name: 'Civil & Structural Materials',
    description: 'Machine crushed blue granite stone aggregate',
    specification: 'Angular aggregate conforming to IS 383',
    unit: 'Cum',
    hsn_sac: '25171010',
    gst_rate: 5,
    standard_rate: 1200,
    reorder_level: 150,
    is_active: true,
  },
  {
    id: 'itm-5',
    item_code: '000005',
    item_name: 'Wire-Cut Red Clay Bricks',
    category_name: 'Civil & Structural Materials',
    description: 'First class machine wire-cut burnt clay bricks',
    specification: 'Crushing strength > 10.5 N/mm2',
    unit: 'Nos',
    hsn_sac: '69010010',
    gst_rate: 12,
    standard_rate: 9.5,
    reorder_level: 10000,
    is_active: true,
  },
  {
    id: 'itm-6',
    item_code: '000006',
    item_name: 'Electrical Armoured Cable 4C 16 sqmm',
    category_name: 'Mechanical, Electrical & Plumbing',
    description: 'Polycab XLPE Aluminium Armoured 1.1kV Cable',
    specification: 'Conforming to IS 7098 Part 1',
    unit: 'Box',
    hsn_sac: '85444999',
    gst_rate: 18,
    standard_rate: 4200,
    reorder_level: 20,
    is_active: true,
  },
  {
    id: 'itm-7',
    item_code: '000007',
    item_name: 'PVC SWR Drainage Pipe 110mm',
    category_name: 'Mechanical, Electrical & Plumbing',
    description: 'Supreme Type B Ring-Fit 110mm 3m length',
    specification: 'Conforming to IS 13592',
    unit: 'Nos',
    hsn_sac: '39172310',
    gst_rate: 18,
    standard_rate: 880,
    reorder_level: 50,
    is_active: true,
  },
  {
    id: 'itm-8',
    item_code: '000008',
    item_name: 'Vitrified Floor Tiles 600x600mm',
    category_name: 'Finishing Materials',
    description: 'Kajaria Double Charged Vitrified Tiles Matt Finish',
    specification: 'Grade 1 frost and stain resistant',
    unit: 'Sqm',
    hsn_sac: '69072100',
    gst_rate: 18,
    standard_rate: 650,
    reorder_level: 300,
    is_active: true,
  },
  {
    id: 'itm-9',
    item_code: '000009',
    item_name: 'Concrete Superplasticizer Admixture',
    category_name: 'Construction Chemicals',
    description: 'Fosroc Conplast SP430 high range water reducer',
    specification: 'Conforming to IS 9103 and ASTM C494 Type F',
    unit: 'Ltr',
    hsn_sac: '38244010',
    gst_rate: 18,
    standard_rate: 115,
    reorder_level: 400,
    is_active: true,
  },
];

const INITIAL_SPECIFICATIONS: MaterialSpecification[] = [
  {
    id: 'spec-1',
    spec_code: 'SPEC-STL-01',
    title: 'High Yield Strength Deformed TMT Steel Reinforcement Rebars',
    category: 'Steel & Metals',
    standard_code: 'IS 1786:2008',
    grade: 'Fe 550D',
    technical_parameters: '0.2% Proof Stress/Yield Stress Min 550 N/mm²; Tensile Strength Min 600 N/mm²; TS/YS Ratio ≥ 1.08; Total Elongation at fracture Min 16%; Carbon Max 0.25%, Sulphur Max 0.040%, Phosphorus Max 0.040%.',
    test_certificates_required: 'Manufacturer Test Certificate (MTC) with heat number, chemical batch analysis, 180° cold bend & re-bend test report.',
    sampling_frequency: '1 set of 3 test specimens for every 20 MT or part thereof per diameter size.',
    packaging_delivery_terms: 'Supplied in standard 12m commercial lengths, straight bundles, tied with minimum 4 steel wire bands and tagged with heat no.',
    is_active: true,
  },
  {
    id: 'spec-2',
    spec_code: 'SPEC-CEM-01',
    title: 'Ordinary Portland Cement (OPC) 53 Grade',
    category: 'Cement & Binders',
    standard_code: 'IS 12269:2013 / IS 269:2015',
    grade: 'Grade 53',
    technical_parameters: 'Compressive Strength: 72±1h ≥ 27 MPa, 168±2h ≥ 37 MPa, 672±4h ≥ 53 MPa; Initial Setting Time Min 30 mins, Final Setting Time Max 600 mins; Fineness (Blaine) Min 225 m²/kg; Soundness (Le-Chatelier) Max 10 mm.',
    test_certificates_required: 'Weekly factory composite test certificate showing 3, 7 and 28-day strength along with chemical analysis (loss on ignition, insoluble residue).',
    sampling_frequency: '1 grab sample per 50 MT or 1 sample per consignment/truck.',
    packaging_delivery_terms: 'Packed in sound 50 kg HDPE/PP moisture-proof laminated bags with factory ISI mark & manufacturing week embossed.',
    is_active: true,
  },
  {
    id: 'spec-3',
    spec_code: 'SPEC-AGG-01',
    title: 'Coarse Aggregate for Structural Concrete (20mm Graded Nominal)',
    category: 'Aggregates',
    standard_code: 'IS 383:2016 (Table 2 & 7)',
    grade: '20mm Graded',
    technical_parameters: '100% passing 40mm sieve, 85-100% passing 20mm, 0-20% passing 10mm, 0-5% passing 4.75mm; Aggregate Crushing Value Max 30%; Impact Value Max 30%; Flakiness & Elongation Combined Index Max 35%.',
    test_certificates_required: 'Gradation sieve analysis, aggregate crushing value, specific gravity, water absorption (<2.0%), and soundness test.',
    sampling_frequency: '1 sieve analysis test per 100 Cum delivered to batching plant.',
    packaging_delivery_terms: 'Bulk delivery in clean tippers, free from organic impurities, clay lumps, adherent coatings, and decomposed rock.',
    is_active: true,
  },
  {
    id: 'spec-4',
    spec_code: 'SPEC-SND-01',
    title: 'Natural River Sand for Reinforced Concrete (Zone II)',
    category: 'Aggregates',
    standard_code: 'IS 383:2016 (Table 4 Zone II)',
    grade: 'Zone II Coarse Sand',
    technical_parameters: 'Passing 10mm: 100%; Passing 4.75mm: 90-100%; Passing 2.36mm: 75-100%; Passing 1.18mm: 55-90%; Passing 600 micron: 35-59%; Passing 300 micron: 8-30%; Passing 150 micron: 0-10%; Fineness Modulus 2.6 to 2.9; Silt & Clay Content Max 3.0% by volume.',
    test_certificates_required: 'Sieve analysis gradation curve, silt jar test on every tipper, chloride (<0.06%) & sulphate (<0.5%) content report.',
    sampling_frequency: 'Silt test for each truck load; Full grading and fineness modulus once per 50 Cum.',
    packaging_delivery_terms: 'Supplied washed, clean, free from shells, vegetative matter, and saline deposits.',
    is_active: true,
  },
  {
    id: 'spec-5',
    spec_code: 'SPEC-RMC-01',
    title: 'Design Mix Ready Mixed Concrete (RMC) M25 Grade with Retarded Set',
    category: 'Concrete',
    standard_code: 'IS 456:2000 & IS 4926:2003',
    grade: 'M25 (25 N/mm² @ 28 Days)',
    technical_parameters: 'Characteristic compressive strength 25 MPa at 28 days (tested on 150mm cubes); Target mean strength 31.6 MPa; Slump at pour point 120 ± 25 mm; Maximum Water-Cement ratio 0.50; Minimum cement content 300 kg/m³; Max aggregate size 20mm down.',
    test_certificates_required: 'Transit mixer batch computerised delivery ticket (containing batch time, water added, admixture dose), 7-day and 28-day cube compressive strength report.',
    sampling_frequency: '6 cubes per 50 m³ or minimum 6 cubes per day of concreting (3 for 7-day, 3 for 28-day).',
    packaging_delivery_terms: 'Delivered in revolving transit mixer trucks; maximum discharge time 90 minutes from batching plant water addition.',
    is_active: true,
  },
  {
    id: 'spec-6',
    spec_code: 'SPEC-AAC-01',
    title: 'Precast Autoclaved Aerated Concrete (AAC) Masonry Blocks',
    category: 'Masonry & Bricks',
    standard_code: 'IS 2185 (Part 3):1984 / IS 12894',
    grade: 'Grade 1 (Density 551 - 650 kg/m³)',
    technical_parameters: 'Compressive strength Min 4.0 N/mm²; Oven-dry density 551 to 650 kg/m³; Drying shrinkage Max 0.05%; Thermal conductivity 0.16 W/m-K; Dimensional tolerance: Length ±5mm, Height ±3mm, Width ±3mm.',
    test_certificates_required: 'Batch test certificate for density, compressive strength, moisture content, and dimensional accuracy.',
    sampling_frequency: '1 set of 5 blocks tested per 1000 blocks or per trailer consignment.',
    packaging_delivery_terms: 'Delivered shrink-wrapped on wooden pallets to prevent corner breakage and moisture absorption during transit.',
    is_active: true,
  },
  {
    id: 'spec-7',
    spec_code: 'SPEC-PMP-01',
    title: 'Chlorinated Polyvinyl Chloride (CPVC) Pressure Pipes & Fittings',
    category: 'Plumbing & Drainage',
    standard_code: 'IS 15778 / ASTM D2846',
    grade: 'SDR 11 Class 1',
    technical_parameters: 'Working pressure 27.6 bar at 23°C and 6.9 bar at 82°C; Suitable for hot & cold potable water distribution; Tensile strength Min 55 MPa; Vicat Softening Temp Min 103°C; Complete non-toxic NSF-61 lead-free certification.',
    test_certificates_required: 'BIS license certificate, burst pressure test report, tensile strength, and impact resistance certification.',
    sampling_frequency: '1 sample test per 500 lengths of pipe.',
    packaging_delivery_terms: 'Supplied in 3m or 5m standard lengths with protective end caps, branded with standard SDR rating & pressure specs.',
    is_active: true,
  },
  {
    id: 'spec-8',
    spec_code: 'SPEC-ELE-01',
    title: 'FRLS Copper Armoured Multi-Core Power Cable 1.1 kV',
    category: 'Electrical & MEP',
    standard_code: 'IS 694:2010 / IS 1554 (Part 1)',
    grade: '1100 Volts FRLS',
    technical_parameters: 'Stranded electrolytic grade annealed high-conductivity bare copper conductor; Cross-linked polyethylene (XLPE) insulation; Galvanized steel wire armouring; Flame Retardant Low Smoke (FRLS) outer PVC sheath with Oxygen Index > 29% and Smoke Density < 60%.',
    test_certificates_required: 'Type test certificate and routine test certificate for conductor resistance, high voltage breakdown (3 kV for 5 mins), oxygen index, and flammability.',
    sampling_frequency: '1 test piece from every delivered wooden drum.',
    packaging_delivery_terms: 'Supplied on heavy-duty wooden drums of 500m length with both ends sealed against moisture entry.',
    is_active: true,
  }
];

const INITIAL_COST_CODES: CostCode[] = [
  { id: 'cc-1', code: 'CC-CIVIL-01', description: 'Substructure & Foundation Concrete', category: 'CIVIL' },
  { id: 'cc-2', code: 'CC-CIVIL-02', description: 'Superstructure RCC & Reinforcement', category: 'CIVIL' },
  { id: 'cc-3', code: 'CC-CIVIL-03', description: 'Masonry & Plastering Works', category: 'CIVIL' },
  { id: 'cc-4', code: 'CC-MEP-01', description: 'Primary Electrical Conduits & Cables', category: 'MEP' },
  { id: 'cc-5', code: 'CC-MEP-02', description: 'Plumbing, Drainage & Sanitary Fitting', category: 'MEP' },
  { id: 'cc-6', code: 'CC-FIN-01', description: 'Flooring, Tiling & Cladding', category: 'FINISHING' },
];

const INITIAL_APPROVAL_MATRIX: ApprovalMatrixTier[] = [
  { id: 'am-1', module: 'PR', min_amount: 0, max_amount: 50000, approval_level: 1, required_role: 'SITE_MANAGER' },
  { id: 'am-2', module: 'PR', min_amount: 50001, max_amount: 500000, approval_level: 2, required_role: 'PROCUREMENT_MANAGER' },
  { id: 'am-3', module: 'PR', min_amount: 500001, max_amount: 2500000, approval_level: 3, required_role: 'PROJECT_ENGINEER' },
  { id: 'am-4', module: 'PR', min_amount: 2500001, max_amount: 999999999, approval_level: 4, required_role: 'MANAGEMENT' },
  { id: 'am-5', module: 'PO', min_amount: 0, max_amount: 100000, approval_level: 1, required_role: 'PROCUREMENT_MANAGER' },
  { id: 'am-6', module: 'PO', min_amount: 100001, max_amount: 1000000, approval_level: 2, required_role: 'APPROVER' },
  { id: 'am-7', module: 'PO', min_amount: 1000001, max_amount: 999999999, approval_level: 3, required_role: 'MANAGEMENT' },
  { id: 'am-8', module: 'GRN', min_amount: 0, max_amount: 999999999, approval_level: 1, required_role: 'STORE_MANAGER' },
  { id: 'am-9', module: 'BILL', min_amount: 0, max_amount: 500000, approval_level: 1, required_role: 'ACCOUNTS_MANAGER' },
  { id: 'am-10', module: 'BILL', min_amount: 500001, max_amount: 999999999, approval_level: 2, required_role: 'MANAGEMENT' },
];

const INITIAL_TERMS: TermItem[] = [
  { id: 't-1', term_type: 'PAYMENT', term_title: 'Standard Payment Terms', term_content: '30 days net from the date of physical receipt of materials and verified invoice submission.', is_default: true },
  { id: 't-2', term_type: 'DELIVERY', term_title: 'Site Delivery & Unloading', term_content: 'FOR Destination (Construction Site) inclusive of freight, transit insurance, and mechanical unloading.', is_default: true },
  { id: 't-3', term_type: 'WARRANTY', term_title: 'Manufacturer Guarantee', term_content: 'Material must comply strictly with relevant BIS / ASTM specifications along with Mill Test Certificates.', is_default: true },
  { id: 't-4', term_type: 'INSPECTION', term_title: 'Site Quality Inspection', term_content: 'Initial visual check upon arrival; acceptance subject to 7-day laboratory cube/tensile test clearance.', is_default: true },
];

// Initial Transactional Records
const INITIAL_PRS: PurchaseRequisition[] = [
  {
    id: 'pr-1',
    pr_number: 'PR/2026/000001',
    pr_date: '2026-08-20',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    site_id: 'sit-1',
    site_name: 'Highway North Interchange Site',
    department: 'Civil Engineering',
    requested_by: 'Vikramaditya Sharma',
    required_date: '2026-09-10',
    priority: 'HIGH',
    purpose: 'Urgent cement requisition for Pier P3 & P4 concrete pouring',
    remarks: 'Approved by Site Engineer, lab test required',
    subtotal: 360000,
    tax_amount: 100800,
    estimated_total: 460800,
    current_approval_level: 2,
    status: 'APPROVED',
    created_at: '2026-08-20T09:00:00Z',
    updated_at: '2026-08-21T14:30:00Z',
    items: [
      {
        id: 'pri-1',
        pr_id: 'pr-1',
        item_id: 'itm-1',
        item_name: 'Cement OPC 53 Grade',
        quantity: 1000,
        ordered_quantity: 1000,
        unit: 'Bag',
        estimated_rate: 360,
        estimated_amount: 360000,
        cost_code: 'CC-CIVIL-01',
        budget: 500000,
      },
    ],
  },
  {
    id: 'pr-2',
    pr_number: 'PR/2026/000002',
    pr_date: '2026-08-22',
    project_id: 'prj-2',
    project_name: 'Residential Tower Project',
    site_id: 'sit-2',
    site_name: 'Tower A & B Foundation Site',
    department: 'Structural Engineering',
    requested_by: 'Ananya Deshmukh',
    required_date: '2026-09-15',
    priority: 'URGENT',
    purpose: 'TMT Reinforcement Steel for Tower A Podium Raft Slab',
    remarks: 'Tata Tiscon Fe 550D preferred',
    subtotal: 1290000,
    tax_amount: 232200,
    estimated_total: 1522200,
    current_approval_level: 3,
    status: 'APPROVED',
    created_at: '2026-08-22T10:15:00Z',
    updated_at: '2026-08-23T11:00:00Z',
    items: [
      {
        id: 'pri-2',
        pr_id: 'pr-2',
        item_id: 'itm-2',
        item_name: 'TMT Steel Rebars Fe 550D',
        quantity: 20,
        ordered_quantity: 20,
        unit: 'MT',
        estimated_rate: 64500,
        estimated_amount: 1290000,
        cost_code: 'CC-CIVIL-02',
        budget: 2000000,
      },
    ],
  },
  {
    id: 'pr-3',
    pr_number: 'PR/2026/000003',
    pr_date: '2026-09-01',
    project_id: 'prj-3',
    project_name: 'Commercial Building Project',
    site_id: 'sit-3',
    site_name: 'Commercial Podium & Basements Site',
    department: 'MEP Department',
    requested_by: 'Deepak Verma',
    required_date: '2026-09-25',
    priority: 'MEDIUM',
    purpose: 'Electrical cables and conduit boxes for basement parking lighting',
    remarks: 'Standard ISI grade specs',
    subtotal: 84000,
    tax_amount: 15120,
    estimated_total: 99120,
    current_approval_level: 2,
    status: 'PENDING_APPROVAL',
    created_at: '2026-09-01T08:30:00Z',
    updated_at: '2026-09-01T08:30:00Z',
    items: [
      {
        id: 'pri-3',
        pr_id: 'pr-3',
        item_id: 'itm-6',
        item_name: 'Electrical Armoured Cable 4C 16 sqmm',
        quantity: 20,
        ordered_quantity: 0,
        unit: 'Box',
        estimated_rate: 4200,
        estimated_amount: 84000,
        cost_code: 'CC-MEP-01',
        budget: 120000,
      },
    ],
  },
];

const INITIAL_RFQS: RFQ[] = [
  {
    id: 'rfq-1',
    rfq_number: 'RFQ/2026/000001',
    rfq_date: '2026-08-22',
    pr_id: 'pr-1',
    pr_number: 'PR/2026/000001',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    site_id: 'sit-1',
    site_name: 'Highway North Interchange Site',
    submission_deadline: '2026-08-26',
    terms: 'FOR Site Delivery, 30 Days Credit',
    delivery_location: 'Chakan Junction Site Store',
    status: 'COMPLETED',
    created_at: '2026-08-22T14:00:00Z',
    vendors: [
      { id: 'rfqv-1', rfq_id: 'rfq-1', vendor_id: 'vnd-1', vendor_name: 'ABC Cement Suppliers', status: 'RESPONDED', sent_at: '2026-08-22T14:05:00Z', responded_at: '2026-08-24T11:00:00Z' },
      { id: 'rfqv-2', rfq_id: 'rfq-1', vendor_id: 'vnd-4', vendor_name: 'Prime Plumbing Solutions', status: 'RESPONDED', sent_at: '2026-08-22T14:05:00Z', responded_at: '2026-08-25T09:30:00Z' },
    ],
    items: [
      { id: 'rfqi-1', rfq_id: 'rfq-1', item_id: 'itm-1', item_name: 'Cement OPC 53 Grade', quantity: 1000, unit: 'Bag', required_date: '2026-09-10' },
    ],
  },
];

const INITIAL_QUOTATIONS: VendorQuotation[] = [
  {
    id: 'qt-1',
    quotation_number: 'QT/2026/000001',
    quotation_date: '2026-08-24',
    vendor_id: 'vnd-1',
    vendor_name: 'ABC Cement Suppliers',
    rfq_id: 'rfq-1',
    rfq_number: 'RFQ/2026/000001',
    valid_until: '2026-09-20',
    currency: 'INR',
    payment_terms: '30 Days Net',
    delivery_terms: 'FOR Destination',
    freight: 5000,
    discount: 10000,
    tax_amount: 96600,
    other_charges: 0,
    net_amount: 441600,
    status: 'ACCEPTED',
    created_at: '2026-08-24T11:00:00Z',
    items: [
      { id: 'qti-1', quotation_id: 'qt-1', item_id: 'itm-1', item_name: 'Cement OPC 53 Grade', quantity: 1000, unit: 'Bag', rate: 350, discount_pct: 2.8, tax_pct: 28, amount: 350000, delivery_time: '3 Days' },
    ],
  },
  {
    id: 'qt-2',
    quotation_number: 'QT/2026/000002',
    quotation_date: '2026-08-25',
    vendor_id: 'vnd-4',
    vendor_name: 'Prime Plumbing Solutions',
    rfq_id: 'rfq-1',
    rfq_number: 'RFQ/2026/000001',
    valid_until: '2026-09-15',
    currency: 'INR',
    payment_terms: '45 Days Net',
    delivery_terms: 'Ex-Warehouse',
    freight: 12000,
    discount: 0,
    tax_amount: 100800,
    other_charges: 2000,
    net_amount: 474800,
    status: 'REJECTED',
    created_at: '2026-08-25T09:30:00Z',
    items: [
      { id: 'qti-2', quotation_id: 'qt-2', item_id: 'itm-1', item_name: 'Cement OPC 53 Grade', quantity: 1000, unit: 'Bag', rate: 360, discount_pct: 0, tax_pct: 28, amount: 360000, delivery_time: '7 Days' },
    ],
  },
];

const INITIAL_COMPARISONS: QuotationComparison[] = [
  {
    id: 'qc-1',
    comparison_number: 'CS/2026/000001',
    rfq_id: 'rfq-1',
    rfq_number: 'RFQ/2026/000001',
    comparison_date: '2026-08-26',
    prepared_by: 'Procurement Executive (Sneha Patil)',
    selected_vendor_id: 'vnd-1',
    selected_vendor_name: 'ABC Cement Suppliers',
    remarks: 'ABC Cement offers lowest rate (L1) ₹350/bag with prompt 3-day delivery and manufacturer warranty.',
    status: 'APPROVED',
    approved_by: 'Procurement Manager (Arun Kadam)',
    approved_at: '2026-08-26T16:00:00Z',
    items: [
      {
        id: 'qci-1',
        comparison_id: 'qc-1',
        item_id: 'itm-1',
        item_name: 'Cement OPC 53 Grade',
        quantity: 1000,
        unit: 'Bag',
        lowest_rate: 350,
        selected_vendor_id: 'vnd-1',
        selected_rate: 350,
        rates_by_vendor: {
          'vnd-1': { rate: 350, amount: 350000, vendor_name: 'ABC Cement Suppliers' },
          'vnd-4': { rate: 360, amount: 360000, vendor_name: 'Prime Plumbing Solutions' },
        },
      },
    ],
  },
];

const INITIAL_SHORTLISTS: SupplierShortlist[] = [
  {
    id: 'ss-1',
    pr_id: 'pr-1',
    rfq_id: 'rfq-1',
    quotation_id: 'qt-1',
    vendor_id: 'vnd-1',
    vendor_name: 'ABC Cement Suppliers',
    selected_items_summary: '1,000 Bags Cement OPC 53 Grade @ ₹350/bag',
    selected_amount: 441600,
    selection_reason: 'L1 Lowest bidder with excellent BIS certified quality rating (4.8/5.0).',
    approved_by: 'Arun Kadam (Procurement Manager)',
    approval_date: '2026-08-26',
    created_at: '2026-08-26T17:00:00Z',
  },
];

const INITIAL_POS: PurchaseOrder[] = [
  {
    id: 'po-1',
    po_number: 'PO/2026/000001',
    po_date: '2026-08-27',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    site_id: 'sit-1',
    site_name: 'Highway North Interchange Site',
    vendor_id: 'vnd-1',
    vendor_name: 'ABC Cement Suppliers',
    pr_id: 'pr-1',
    pr_number: 'PR/2026/000001',
    rfq_id: 'rfq-1',
    quotation_id: 'qt-1',
    payment_terms: '30 Days Net from GRN date',
    delivery_terms: 'FOR Destination, unloading included',
    delivery_address: 'Km 42+500 Chakan Junction, Pune - 410501',
    expected_delivery_date: '2026-09-05',
    currency: 'INR',
    remarks: 'Test certificates to accompany delivery challan',
    subtotal: 350000,
    discount: 10000,
    freight: 5000,
    other_charges: 0,
    cgst: 48300,
    sgst: 48300,
    igst: 0,
    round_off: 0,
    grand_total: 441600,
    advance_paid: 50000,
    version: 1,
    status: 'PARTIALLY_RECEIVED',
    created_by: 'Arun Kadam',
    created_at: '2026-08-27T10:00:00Z',
    updated_at: '2026-08-28T12:00:00Z',
    items: [
      {
        id: 'poi-1',
        po_id: 'po-1',
        item_id: 'itm-1',
        item_name: 'Cement OPC 53 Grade',
        specification: 'UltraTech 53 Grade OPC in 50kg bags',
        quantity: 1000,
        received_quantity: 600,
        billed_quantity: 600,
        unit: 'Bag',
        rate: 350,
        discount_pct: 2.8,
        tax_pct: 28,
        amount: 350000,
      },
    ],
  },
  {
    id: 'po-2',
    po_number: 'PO/2026/000002',
    po_date: '2026-08-29',
    project_id: 'prj-2',
    project_name: 'Residential Tower Project',
    site_id: 'sit-2',
    site_name: 'Tower A & B Foundation Site',
    vendor_id: 'vnd-2',
    vendor_name: 'XYZ Steel Traders',
    pr_id: 'pr-2',
    pr_number: 'PR/2026/000002',
    payment_terms: '15 Days Net against MTC',
    delivery_terms: 'FOR Site Baner',
    delivery_address: 'Plot 4A, Baner Hilltop, Pune - 411045',
    expected_delivery_date: '2026-09-12',
    currency: 'INR',
    remarks: 'Tata Tiscon Fe 550D test certified lots only',
    subtotal: 1290000,
    discount: 0,
    freight: 15000,
    other_charges: 0,
    cgst: 117450,
    sgst: 117450,
    igst: 0,
    round_off: 0,
    grand_total: 1539900,
    advance_paid: 200000,
    version: 1,
    status: 'APPROVED',
    created_by: 'Arun Kadam',
    created_at: '2026-08-29T11:30:00Z',
    updated_at: '2026-08-30T15:00:00Z',
    items: [
      {
        id: 'poi-2',
        po_id: 'po-2',
        item_id: 'itm-2',
        item_name: 'TMT Steel Rebars Fe 550D',
        specification: 'Tata Tiscon Fe 550D 16mm bundles',
        quantity: 20,
        received_quantity: 0,
        billed_quantity: 0,
        unit: 'MT',
        rate: 64500,
        discount_pct: 0,
        tax_pct: 18,
        amount: 1290000,
      },
    ],
  },
];

const INITIAL_ADVANCES: AdvancePayment[] = [
  {
    id: 'adv-1',
    advance_number: 'ADV/2026/000001',
    po_id: 'po-1',
    po_number: 'PO/2026/000001',
    vendor_id: 'vnd-1',
    vendor_name: 'ABC Cement Suppliers',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    amount: 50000,
    payment_date: '2026-08-28',
    payment_mode: 'RTGS',
    reference_number: 'HDFCR2026082800192',
    bank_name: 'HDFC Bank Corporate A/C',
    remarks: 'Mobilization advance against PO/2026/000001',
    status: 'PAID',
    created_at: '2026-08-28T14:00:00Z',
  },
  {
    id: 'adv-2',
    advance_number: 'ADV/2026/000002',
    po_id: 'po-2',
    po_number: 'PO/2026/000002',
    vendor_id: 'vnd-2',
    vendor_name: 'XYZ Steel Traders',
    project_id: 'prj-2',
    project_name: 'Residential Tower Project',
    amount: 200000,
    payment_date: '2026-08-30',
    payment_mode: 'RTGS',
    reference_number: 'ICICR2026083000941',
    bank_name: 'ICICI Bank Operating A/C',
    remarks: 'Advance for mill lot booking',
    status: 'PAID',
    created_at: '2026-08-30T10:00:00Z',
  },
];

const INITIAL_GRNS: GoodsReceivedNote[] = [
  {
    id: 'grn-1',
    grn_number: 'GRN/2026/000001',
    grn_date: '2026-09-02',
    po_id: 'po-1',
    po_number: 'PO/2026/000001',
    vendor_id: 'vnd-1',
    vendor_name: 'ABC Cement Suppliers',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    site_id: 'sit-1',
    site_name: 'Highway North Interchange Site',
    vehicle_number: 'MH-12-RN-4820',
    delivery_challan: 'DC-ABC-2026-904',
    challan_date: '2026-09-02',
    received_by: 'Manoj Patil (Site Store Manager)',
    inspection_status: 'PARTIALLY_ACCEPTED',
    remarks: '600 bags received in first lot; 20 bags found torn/damaged during transit unloading.',
    total_amount: 203000,
    status: 'APPROVED',
    created_at: '2026-09-02T16:00:00Z',
    items: [
      {
        id: 'grni-1',
        grn_id: 'grn-1',
        item_id: 'itm-1',
        item_name: 'Cement OPC 53 Grade',
        ordered_quantity: 1000,
        previously_received: 0,
        current_received: 600,
        accepted_quantity: 580,
        rejected_quantity: 20,
        unit: 'Bag',
        rate: 350,
        amount: 203000,
        rejection_reason: '20 bags damaged/punctured in truck transit with cement caking',
      },
    ],
  },
];

const INITIAL_DEBIT_NOTES: DebitNote[] = [
  {
    id: 'dn-1',
    debit_note_number: 'DN/2026/000001',
    debit_note_date: '2026-09-03',
    vendor_id: 'vnd-1',
    vendor_name: 'ABC Cement Suppliers',
    po_id: 'po-1',
    po_number: 'PO/2026/000001',
    grn_id: 'grn-1',
    grn_number: 'GRN/2026/000001',
    reason: 'Damaged Material',
    amount: 7000,
    tax_amount: 1960,
    total: 8960,
    remarks: 'Debit for 20 transit-damaged cement bags rejected at site during GRN inspection.',
    status: 'APPROVED',
    created_at: '2026-09-03T11:00:00Z',
    items: [
      { id: 'dni-1', debit_note_id: 'dn-1', item_name: 'Cement OPC 53 Grade (Torn/Caked)', quantity: 20, unit: 'Bag', rate: 350, amount: 7000, reason: 'Transit puncture damage' },
    ],
  },
];

const INITIAL_BILLS: PurchaseBill[] = [
  {
    id: 'pb-1',
    bill_number: 'PB/2026/000001',
    bill_date: '2026-09-03',
    vendor_id: 'vnd-1',
    vendor_name: 'ABC Cement Suppliers',
    po_id: 'po-1',
    po_number: 'PO/2026/000001',
    grn_id: 'grn-1',
    grn_number: 'GRN/2026/000001',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    invoice_number: 'INV-ABC-2026-881',
    invoice_date: '2026-09-02',
    invoice_amount: 210000,
    tax_amount: 58800,
    discount: 5000,
    other_charges: 0,
    net_payable: 263800,
    matching_status: 'MATCHED',
    matching_discrepancies: [],
    paid_amount: 50000,
    adjusted_amount: 8960,
    outstanding_amount: 204840,
    is_financially_posted: true,
    status: 'APPROVED',
    created_at: '2026-09-03T14:30:00Z',
    items: [
      {
        id: 'pbi-1',
        bill_id: 'pb-1',
        item_id: 'itm-1',
        item_name: 'Cement OPC 53 Grade',
        ordered_qty: 1000,
        received_qty: 580,
        billed_qty: 600,
        po_rate: 350,
        billed_rate: 350,
        unit: 'Bag',
        amount: 210000,
      },
    ],
  },
];

const INITIAL_POSTINGS: FinancialPosting[] = [
  {
    id: 'post-1',
    posting_number: 'JV/2026/000001',
    posting_date: '2026-09-03',
    document_type: 'PURCHASE_BILL',
    document_number: 'PB/2026/000001',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    vendor_id: 'vnd-1',
    vendor_name: 'ABC Cement Suppliers',
    total_amount: 263800,
    status: 'POSTED',
    created_by: 'Rahul Soni (Accounts Manager)',
    created_at: '2026-09-03T16:00:00Z',
    entries: [
      { id: 'pe-1', posting_id: 'post-1', account_name: 'Substructure Concrete Material Purchase A/C', account_code: 'GL-5001', debit: 205000, credit: 0, cost_code: 'CC-CIVIL-01' },
      { id: 'pe-2', posting_id: 'post-1', account_name: 'Input CGST Recoverable A/C', account_code: 'GL-1402', debit: 29400, credit: 0 },
      { id: 'pe-3', posting_id: 'post-1', account_name: 'Input SGST Recoverable A/C', account_code: 'GL-1403', debit: 29400, credit: 0 },
      { id: 'pe-4', posting_id: 'post-1', account_name: 'ABC Cement Suppliers Payable A/C', account_code: 'GL-2101', debit: 0, credit: 263800 },
    ],
  },
];

const INITIAL_AUDIT: AuditLog[] = [
  { id: 'aud-1', user_email: 'tester3506@gmail.com', user_name: 'Super Admin', user_role: 'SUPER_ADMIN', module: 'PR', action: 'CREATE', record_id: 'PR/2026/000001', timestamp: '2026-08-20T09:00:00Z' },
  { id: 'aud-2', user_email: 'tester3506@gmail.com', user_name: 'Super Admin', user_role: 'SUPER_ADMIN', module: 'PR', action: 'APPROVE', record_id: 'PR/2026/000001', timestamp: '2026-08-21T14:30:00Z' },
  { id: 'aud-3', user_email: 'tester3506@gmail.com', user_name: 'Super Admin', user_role: 'SUPER_ADMIN', module: 'PO', action: 'CREATE', record_id: 'PO/2026/000001', timestamp: '2026-08-27T10:00:00Z' },
  { id: 'aud-4', user_email: 'tester3506@gmail.com', user_name: 'Super Admin', user_role: 'SUPER_ADMIN', module: 'GRN', action: 'APPROVE', record_id: 'GRN/2026/000001', timestamp: '2026-09-02T16:00:00Z' },
  { id: 'aud-5', user_email: 'tester3506@gmail.com', user_name: 'Super Admin', user_role: 'SUPER_ADMIN', module: 'BILL', action: 'APPROVE', record_id: 'PB/2026/000001', timestamp: '2026-09-03T14:30:00Z' },
  { id: 'aud-6', user_email: 'tester3506@gmail.com', user_name: 'Super Admin', user_role: 'SUPER_ADMIN', module: 'POSTING', action: 'CREATE', record_id: 'JV/2026/000001', timestamp: '2026-09-03T16:00:00Z' },
];

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 'notif-1', title: 'New PR Pending Approval', message: 'PR/2026/000003 for Commercial Building Project requires level 2 approval.', document_type: 'PR', document_id: 'pr-3', is_read: false, created_at: '2026-09-01T08:35:00Z' },
  { id: 'notif-2', title: 'Goods Received (GRN Approved)', message: 'GRN/2026/000001 (580 Bags Cement) verified and cleared for billing at Chakan site.', document_type: 'GRN', document_id: 'grn-1', is_read: false, created_at: '2026-09-02T16:10:00Z' },
  { id: 'notif-3', title: 'Debit Note DN/2026/000001 Issued', message: 'Debit Note ₹8,960 generated against ABC Cement for damaged material.', document_type: 'DEBIT_NOTE', document_id: 'dn-1', is_read: true, created_at: '2026-09-03T11:05:00Z' },
];

const INITIAL_VENDOR_EVALUATIONS: VendorEvaluation[] = [
  {
    id: 've-1',
    vendor_id: 'vnd-1',
    vendor_name: 'ABC Cement Suppliers',
    project_id: 'prj-1',
    evaluation_date: '2026-08-20',
    price_score: 92,
    quality_score: 94,
    delivery_score: 88,
    experience_score: 90,
    financial_score: 95,
    technical_score: 90,
    price_competitiveness: 92,
    quality_compliance: 94,
    delivery_timeliness: 88,
    documentation_accuracy: 95,
    safety_compliance: 90,
    overall_score: 91.8,
    status: 'APPROVED',
    evaluated_by: 'Vikramaditya Sharma',
    remarks: 'Consistent delivery compliance on Grade 53 OPC batches with full lab test reports.',
  },
  {
    id: 've-2',
    vendor_id: 'vnd-2',
    vendor_name: 'Apex Steel Industries',
    project_id: 'prj-1',
    evaluation_date: '2026-08-22',
    price_score: 86,
    quality_score: 96,
    delivery_score: 90,
    experience_score: 95,
    financial_score: 92,
    technical_score: 94,
    price_competitiveness: 86,
    quality_compliance: 96,
    delivery_timeliness: 90,
    documentation_accuracy: 92,
    safety_compliance: 95,
    overall_score: 92.1,
    status: 'APPROVED',
    evaluated_by: 'Manoj Patil',
    remarks: 'Approved primary mill for Fe500D rebars with mill test certificates.',
  },
];

const INITIAL_STOCK_LEDGER: StockLedger[] = [
  {
    id: 'stk-1',
    item_id: 'itm-1',
    item_code: '000001',
    item_name: 'Cement OPC 53 Grade',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    site_id: 'sit-1',
    site_name: 'Highway North Interchange Site',
    storage_location: 'Central Covered Godown - Bay A1',
    bin_rack: 'Bay A1 - Pallet Row 4',
    uom: 'Bag',
    current_quantity: 580,
    reorder_level: 200,
    average_rate: 350,
    total_valuation: 203000,
    updated_at: '2026-09-02T16:00:00Z',
  },
  {
    id: 'stk-2',
    item_id: 'itm-2',
    item_code: '000002',
    item_name: 'TMT Steel Bars 16mm Fe500D',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    site_id: 'sit-1',
    site_name: 'Highway North Interchange Site',
    storage_location: 'Open Yard 1 - Heavy Rebar Rack B3',
    bin_rack: 'Rebar Stacking Bay B-03',
    uom: 'MT',
    current_quantity: 45,
    reorder_level: 15,
    average_rate: 58000,
    total_valuation: 2610000,
    updated_at: '2026-09-01T11:00:00Z',
  },
  {
    id: 'stk-3',
    item_id: 'itm-3',
    item_code: '000003',
    item_name: 'Coarse Sand (River Sand Grade 2)',
    project_id: 'prj-2',
    project_name: 'Residential Tower Project',
    site_id: 'sit-2',
    site_name: 'Tower A & B Foundation Site',
    storage_location: 'Aggregate Yard - Pit Sand Bay 2',
    bin_rack: 'Sand Bunker 02',
    uom: 'Brass',
    current_quantity: 12,
    reorder_level: 20,
    average_rate: 7200,
    total_valuation: 86400,
    updated_at: '2026-09-03T09:30:00Z',
  },
  {
    id: 'stk-4',
    item_id: 'itm-4',
    item_code: '000004',
    item_name: 'Crushed Stone Aggregate 20mm',
    project_id: 'prj-2',
    project_name: 'Residential Tower Project',
    site_id: 'sit-2',
    site_name: 'Tower A & B Foundation Site',
    storage_location: 'Aggregate Yard - Bunker 4',
    bin_rack: 'Gravel Stockpile Zone 4',
    uom: 'Brass',
    current_quantity: 85,
    reorder_level: 25,
    average_rate: 4100,
    total_valuation: 348500,
    updated_at: '2026-09-02T14:20:00Z',
  },
  {
    id: 'stk-5',
    item_id: 'itm-5',
    item_code: '000005',
    item_name: 'Ready Mix Concrete (RMC) M25',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    site_id: 'sit-1',
    site_name: 'Highway North Interchange Site',
    storage_location: 'Batching Plant Silo 1',
    bin_rack: 'Silo Discharge Bay 1',
    uom: 'Cum',
    current_quantity: 0,
    reorder_level: 10,
    average_rate: 4600,
    total_valuation: 0,
    updated_at: '2026-09-01T17:00:00Z',
  },
  {
    id: 'stk-6',
    item_id: 'itm-6',
    item_code: '000006',
    item_name: 'Finolex 4 Sqmm FRLS Copper Wire',
    project_id: 'prj-3',
    project_name: 'Commercial Building Project',
    site_id: 'sit-3',
    site_name: 'Commercial Tower Phase 1',
    storage_location: 'Electrical Store - Rack E2',
    bin_rack: 'Rack E2 - Shelf 04',
    uom: 'Coil',
    current_quantity: 140,
    reorder_level: 30,
    average_rate: 2850,
    total_valuation: 399000,
    updated_at: '2026-09-03T10:15:00Z',
  },
  {
    id: 'stk-7',
    item_id: 'itm-7',
    item_code: '000007',
    item_name: 'Astral CPVC Heavy Pipe 1.5 inch',
    project_id: 'prj-2',
    project_name: 'Residential Tower Project',
    site_id: 'sit-2',
    site_name: 'Tower A & B Foundation Site',
    storage_location: 'Plumbing Yard - Stacking Bin P4',
    bin_rack: 'Bin P4 - Heavy Conduit Rack',
    uom: 'Meter',
    current_quantity: 18,
    reorder_level: 50,
    average_rate: 420,
    total_valuation: 7560,
    updated_at: '2026-09-02T12:00:00Z',
  },
  {
    id: 'stk-8',
    item_id: 'itm-8',
    item_code: '000008',
    item_name: 'Kajaria Vitrified Floor Tiles 600x600',
    project_id: 'prj-3',
    project_name: 'Commercial Building Project',
    site_id: 'sit-3',
    site_name: 'Commercial Tower Phase 1',
    storage_location: 'Finishing Store - Pallet Zone F1',
    bin_rack: 'Pallet Stack F1-08',
    uom: 'Box',
    current_quantity: 320,
    reorder_level: 100,
    average_rate: 890,
    total_valuation: 284800,
    updated_at: '2026-09-03T15:45:00Z',
  },
];

const INITIAL_MATERIAL_ISSUES: MaterialIssue[] = [
  {
    id: 'iss-1',
    issue_number: 'MIN/2026/000001',
    issue_date: '2026-09-03',
    project_id: 'prj-1',
    project_name: 'Highway Construction Project',
    site_id: 'sit-1',
    site_name: 'Highway North Interchange Site',
    contractor_name: 'Shree Krishna Civil Contractors',
    issued_to_person: 'Ramesh K. (Site Foreman)',
    work_order_ref: 'WO-2026-089 (Basement 2 Concreting)',
    status: 'ISSUED',
    remarks: 'Issued 50 bags cement for pier cap casting',
    items: [
      {
        id: 'isi-1',
        issue_id: 'iss-1',
        item_id: 'itm-1',
        item_name: 'Cement OPC 53 Grade',
        uom: 'Bag',
        quantity: 50,
        remarks: 'Batch inspected & approved',
      },
    ],
    created_at: '2026-09-03T11:00:00Z',
  },
];

const INITIAL_MATERIAL_TRANSFERS: MaterialTransfer[] = [
  {
    id: 'trf-1',
    transfer_number: 'MTN/2026/000001',
    transfer_date: '2026-09-02',
    from_project_id: 'prj-1',
    from_project_name: 'Highway Construction Project',
    from_site_id: 'sit-1',
    from_site_name: 'Highway North Interchange Site',
    to_project_id: 'prj-2',
    to_project_name: 'Residential Tower Project',
    to_site_id: 'sit-2',
    to_site_name: 'Tower A & B Foundation Site',
    vehicle_number: 'MH-12-RN-9921',
    driver_name: 'Kailash Yadav',
    dispatch_gate_pass_no: 'DGP/2026/00042',
    status: 'RECEIVED',
    receipt_date: '2026-09-02T16:30:00Z',
    remarks: 'Inter-site steel rebar balance transfer',
    items: [
      {
        id: 'mti-1',
        transfer_id: 'trf-1',
        item_id: 'itm-2',
        item_name: 'TMT Steel Bars 16mm Fe500D',
        uom: 'MT',
        dispatched_quantity: 5,
        received_quantity: 5,
      },
    ],
    created_at: '2026-09-02T09:00:00Z',
  },
];

// -------------------------------------------------------------
// DATABASE SERVICE API
// -------------------------------------------------------------
export const db = {
  // Sync Status
  isLiveSupabase: () => isSupabaseConfigured,

  // Projects
  getProjects: async (): Promise<Project[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('project_code', { ascending: true });
        if (!error && data && data.length > 0) {
          setStored('projects', data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase getProjects error, using local cache:', err);
      }
    }
    return getStored('projects', INITIAL_PROJECTS);
  },
  saveProject: async (project: Project): Promise<Project> => {
    const list = getStored('projects', INITIAL_PROJECTS);
    const validId = toValidUUID(project.id || `prj-${Date.now()}`);
    const normalizedProject: Project = {
      ...project,
      id: validId,
      updated_at: new Date().toISOString(),
    };
    const index = list.findIndex(p => p.id === project.id || p.id === validId || p.project_code === project.project_code);
    if (index >= 0) {
      list[index] = normalizedProject;
    } else {
      normalizedProject.created_at = new Date().toISOString();
      list.push(normalizedProject);
    }
    setStored('projects', list);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          id: validId,
          project_code: normalizedProject.project_code,
          project_name: normalizedProject.project_name,
          client_name: normalizedProject.client_name,
          project_type: normalizedProject.project_type,
          location: normalizedProject.location,
          start_date: normalizedProject.start_date,
          end_date: normalizedProject.end_date || null,
          project_manager: normalizedProject.project_manager,
          budget: Number(normalizedProject.budget || 0),
          status: normalizedProject.status,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('projects').upsert(payload, { onConflict: 'project_code' });
        if (error) console.warn('Supabase saveProject upsert error:', error.message);
      } catch (err) {
        console.warn('Supabase saveProject exception:', err);
      }
    }

    await db.addAuditLog('PROJECT', index >= 0 ? 'UPDATE' : 'CREATE', project.project_code, null, normalizedProject);
    return normalizedProject;
  },
  deleteProject: async (id: string): Promise<boolean> => {
    const list = getStored('projects', INITIAL_PROJECTS);
    const validId = toValidUUID(id);
    const filtered = list.filter(p => p.id !== id && p.id !== validId);
    setStored('projects', filtered);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('projects').delete().or(`id.eq.${id},id.eq.${validId}`);
      } catch (err) {
        console.warn('Supabase deleteProject error:', err);
      }
    }
    await db.addAuditLog('PROJECT', 'DELETE', id, null, null);
    return true;
  },

  // Sites
  getSites: async (projectId?: string): Promise<Site[]> => {
    const siteList = getStored('sites', INITIAL_SITES);
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('sites').select('*').order('site_code', { ascending: true });
        if (projectId && projectId !== 'ALL') {
          query = query.eq('project_id', toValidUUID(projectId));
        }
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const projects = await db.getProjects();
          const enriched: Site[] = data.map(s => {
            const p = projects.find(pr => pr.id === s.project_id || toValidUUID(pr.id) === s.project_id);
            return { ...s, project_name: s.project_name || p?.project_name };
          });
          setStored('sites', enriched);
          return (projectId && projectId !== 'ALL') 
            ? enriched.filter(s => s.project_id === projectId || s.project_id === toValidUUID(projectId)) 
            : enriched;
        }
      } catch (err) {
        console.warn('Supabase getSites error, using local cache:', err);
      }
    }
    if (projectId && projectId !== 'ALL') {
      return siteList.filter(s => s.project_id === projectId || s.project_id === toValidUUID(projectId));
    }
    return siteList;
  },
  saveSite: async (site: Site): Promise<Site> => {
    const list = getStored('sites', INITIAL_SITES);
    const validId = toValidUUID(site.id || `sit-${Date.now()}`);
    const validProjectId = toValidUUID(site.project_id);
    const normalizedSite: Site = {
      ...site,
      id: validId,
      project_id: validProjectId,
    };
    const index = list.findIndex(s => s.id === site.id || s.id === validId || s.site_code === site.site_code);
    if (index >= 0) {
      list[index] = normalizedSite;
    } else {
      list.push(normalizedSite);
    }
    setStored('sites', list);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          id: validId,
          project_id: validProjectId,
          site_code: normalizedSite.site_code,
          site_name: normalizedSite.site_name,
          site_address: normalizedSite.site_address,
          site_manager: normalizedSite.site_manager,
          contact_number: normalizedSite.contact_number || null,
          status: normalizedSite.status,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('sites').upsert(payload, { onConflict: 'site_code' });
        if (error) console.warn('Supabase saveSite upsert error:', error.message);
      } catch (err) {
        console.warn('Supabase saveSite exception:', err);
      }
    }

    await db.addAuditLog('SITE', index >= 0 ? 'UPDATE' : 'CREATE', site.site_code, null, normalizedSite);
    return normalizedSite;
  },
  deleteSite: async (id: string): Promise<boolean> => {
    const list = getStored('sites', INITIAL_SITES);
    const validId = toValidUUID(id);
    const filtered = list.filter(s => s.id !== id && s.id !== validId);
    setStored('sites', filtered);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('sites').delete().or(`id.eq.${id},id.eq.${validId}`);
      } catch (err) {
        console.warn('Supabase deleteSite error:', err);
      }
    }
    await db.addAuditLog('SITE', 'DELETE', id, null, null);
    return true;
  },

  // Vendors
  getVendors: async (): Promise<Vendor[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .order('vendor_code', { ascending: true });
        if (!error && data && data.length > 0) {
          setStored('vendors', data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase getVendors error, using local cache:', err);
      }
    }
    return getStored('vendors', INITIAL_VENDORS);
  },
  saveVendor: async (vendor: Vendor): Promise<Vendor> => {
    const list = getStored('vendors', INITIAL_VENDORS);
    const validId = toValidUUID(vendor.id || `vnd-${Date.now()}`);
    const normalizedVendor: Vendor = {
      ...vendor,
      id: validId,
    };
    const index = list.findIndex(v => v.id === vendor.id || v.id === validId || v.vendor_code === vendor.vendor_code);
    if (index >= 0) {
      list[index] = normalizedVendor;
    } else {
      list.push(normalizedVendor);
    }
    setStored('vendors', list);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          id: validId,
          vendor_code: normalizedVendor.vendor_code,
          vendor_name: normalizedVendor.vendor_name,
          vendor_type: normalizedVendor.vendor_type || 'SUPPLIER',
          gst_number: normalizedVendor.gst_number || null,
          pan_number: normalizedVendor.pan_number || null,
          contact_person: normalizedVendor.contact_person || null,
          mobile: normalizedVendor.mobile || null,
          email: normalizedVendor.email || null,
          address: normalizedVendor.address || null,
          state: normalizedVendor.state || null,
          city: normalizedVendor.city || null,
          pincode: normalizedVendor.pincode || null,
          bank_name: normalizedVendor.bank_name || null,
          account_number: normalizedVendor.account_number || null,
          ifsc: normalizedVendor.ifsc || null,
          payment_terms: normalizedVendor.payment_terms || null,
          credit_days: Number(normalizedVendor.credit_days || 30),
          vendor_rating: Number(normalizedVendor.vendor_rating || 4.0),
          status: normalizedVendor.status || 'ACTIVE',
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('vendors').upsert(payload, { onConflict: 'vendor_code' });
        if (error) console.warn('Supabase saveVendor upsert error:', error.message);
      } catch (err) {
        console.warn('Supabase saveVendor exception:', err);
      }
    }

    await db.addAuditLog('VENDOR', index >= 0 ? 'UPDATE' : 'CREATE', vendor.vendor_code, null, normalizedVendor);
    return normalizedVendor;
  },
  deleteVendor: async (id: string): Promise<boolean> => {
    const list = getStored('vendors', INITIAL_VENDORS);
    const validId = toValidUUID(id);
    const filtered = list.filter(v => v.id !== id && v.id !== validId);
    setStored('vendors', filtered);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('vendors').delete().or(`id.eq.${id},id.eq.${validId}`);
      } catch (err) {
        console.warn('Supabase deleteVendor error:', err);
      }
    }
    await db.addAuditLog('VENDOR', 'DELETE', id, null, null);
    return true;
  },

  // Items
  getItems: async (): Promise<Item[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('items')
          .select('*')
          .order('item_code', { ascending: true });
        if (!error && data && data.length > 0) {
          const normalized: Item[] = data.map(item => ({
            ...item,
            uom: item.unit || item.uom,
            specifications: item.specification || item.specifications,
            category: item.category_name || item.category,
            hsn_code: item.hsn_sac || item.hsn_code,
            status: item.is_active ? 'ACTIVE' : 'INACTIVE',
          }));
          setStored('items', normalized);
          return normalized;
        }
      } catch (err) {
        console.warn('Supabase getItems error, using local cache:', err);
      }
    }
    return getStored('items', INITIAL_ITEMS);
  },
  saveItem: async (item: Item): Promise<Item> => {
    const list = getStored('items', INITIAL_ITEMS);
    const validId = toValidUUID(item.id || `itm-${Date.now()}`);
    const normalizedItem: Item = {
      ...item,
      id: validId,
      unit: item.unit || item.uom || 'Nos',
      uom: item.uom || item.unit || 'Nos',
      specification: item.specification || item.specifications || '',
      specifications: item.specifications || item.specification || '',
      category_name: item.category_name || item.category || 'General',
      category: item.category || item.category_name || 'General',
      hsn_sac: item.hsn_sac || item.hsn_code || '',
      hsn_code: item.hsn_code || item.hsn_sac || '',
      is_active: item.is_active ?? (item.status !== 'INACTIVE'),
      status: item.status || (item.is_active === false ? 'INACTIVE' : 'ACTIVE'),
    };
    const index = list.findIndex(i => i.id === item.id || i.id === validId || i.item_code === item.item_code);
    if (index >= 0) {
      list[index] = normalizedItem;
    } else {
      list.push(normalizedItem);
    }
    setStored('items', list);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          id: validId,
          item_code: normalizedItem.item_code,
          item_name: normalizedItem.item_name,
          category_name: normalizedItem.category_name,
          description: normalizedItem.description || null,
          specification: normalizedItem.specification || null,
          unit: normalizedItem.unit,
          hsn_sac: normalizedItem.hsn_sac || null,
          gst_rate: Number(normalizedItem.gst_rate || 18),
          standard_rate: Number(normalizedItem.standard_rate || 0),
          reorder_level: Number(normalizedItem.reorder_level || 0),
          is_active: normalizedItem.is_active,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('items').upsert(payload, { onConflict: 'item_code' });
        if (error) console.warn('Supabase saveItem upsert error:', error.message);
      } catch (err) {
        console.warn('Supabase saveItem exception:', err);
      }
    }

    await db.addAuditLog('ITEM', index >= 0 ? 'UPDATE' : 'CREATE', item.item_code, null, normalizedItem);
    return normalizedItem;
  },
  deleteItem: async (id: string): Promise<boolean> => {
    const list = getStored('items', INITIAL_ITEMS);
    const validId = toValidUUID(id);
    const filtered = list.filter(i => i.id !== id && i.id !== validId);
    setStored('items', filtered);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('items').delete().or(`id.eq.${id},id.eq.${validId}`);
      } catch (err) {
        console.warn('Supabase deleteItem error:', err);
      }
    }
    await db.addAuditLog('ITEM', 'DELETE', id, null, null);
    return true;
  },
  getNextItemCode: async (): Promise<string> => {
    const list = await db.getItems();
    let maxNum = 0;
    for (const it of list) {
      const numericDigits = it.item_code ? it.item_code.replace(/\D/g, '') : '';
      if (numericDigits) {
        const val = parseInt(numericDigits, 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    }
    const nextVal = maxNum + 1;
    return nextVal.toString().padStart(6, '0');
  },
  formatNumericItemCode: (input: string | number): string => {
    const digits = String(input ?? '').replace(/\D/g, '');
    const num = parseInt(digits, 10);
    if (isNaN(num)) return '000001';
    return num.toString().padStart(6, '0');
  },

  // Material & Engineering Specifications Master
  getSpecifications: async (): Promise<MaterialSpecification[]> => {
    return getStored('specifications', INITIAL_SPECIFICATIONS);
  },
  saveSpecification: async (spec: MaterialSpecification): Promise<MaterialSpecification> => {
    const list = getStored('specifications', INITIAL_SPECIFICATIONS);
    const validId = spec.id || `spec-${Date.now()}`;
    const normalized: MaterialSpecification = {
      ...spec,
      id: validId,
      spec_code: spec.spec_code ? spec.spec_code.toUpperCase().trim() : `SPEC-${Date.now().toString().slice(-4)}`,
      is_active: spec.is_active ?? true,
      updated_at: new Date().toISOString(),
    };
    const index = list.findIndex(s => s.id === spec.id || s.spec_code.toUpperCase() === normalized.spec_code);
    if (index >= 0) {
      list[index] = normalized;
    } else {
      list.push({ ...normalized, created_at: new Date().toISOString() });
    }
    setStored('specifications', list);
    await db.addAuditLog('SPECIFICATION', index >= 0 ? 'UPDATE' : 'CREATE', normalized.spec_code, null, normalized);
    return normalized;
  },
  deleteSpecification: async (id: string): Promise<boolean> => {
    const list = getStored('specifications', INITIAL_SPECIFICATIONS);
    const filtered = list.filter(s => s.id !== id && s.spec_code !== id);
    setStored('specifications', filtered);
    await db.addAuditLog('SPECIFICATION', 'DELETE', id, null, null);
    return true;
  },

  // Cost Codes
  getCostCodes: async (): Promise<CostCode[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('cost_codes')
          .select('*')
          .order('code', { ascending: true });
        if (!error && data && data.length > 0) {
          const normalized: CostCode[] = data.map(c => ({
            ...c,
            name: c.description || c.name,
            is_active: c.is_active ?? true,
          }));
          setStored('cost_codes', normalized);
          return normalized;
        }
      } catch (err) {
        console.warn('Supabase getCostCodes error, using local cache:', err);
      }
    }
    return getStored('cost_codes', INITIAL_COST_CODES);
  },
  saveCostCode: async (costCode: CostCode): Promise<CostCode> => {
    const list = getStored('cost_codes', INITIAL_COST_CODES);
    const validId = toValidUUID(costCode.id || `cc-${Date.now()}`);
    const normalized: CostCode = {
      ...costCode,
      id: validId,
      description: costCode.description || costCode.name || '',
      name: costCode.name || costCode.description || '',
    };
    const index = list.findIndex(c => c.id === costCode.id || c.id === validId || c.code === costCode.code);
    if (index >= 0) {
      list[index] = normalized;
    } else {
      list.push(normalized);
    }
    setStored('cost_codes', list);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          id: validId,
          code: normalized.code,
          description: normalized.description,
          category: normalized.category || 'CIVIL',
        };
        const { error } = await supabase.from('cost_codes').upsert(payload, { onConflict: 'code' });
        if (error) console.warn('Supabase saveCostCode upsert error:', error.message);
      } catch (err) {
        console.warn('Supabase saveCostCode exception:', err);
      }
    }

    return normalized;
  },
  deleteCostCode: async (id: string): Promise<boolean> => {
    const list = getStored('cost_codes', INITIAL_COST_CODES);
    const validId = toValidUUID(id);
    const filtered = list.filter(c => c.id !== id && c.id !== validId);
    setStored('cost_codes', filtered);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('cost_codes').delete().or(`id.eq.${id},id.eq.${validId}`);
      } catch (err) {
        console.warn('Supabase deleteCostCode error:', err);
      }
    }
    return true;
  },

  // Terms Master
  getTerms: async (): Promise<TermItem[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('terms')
          .select('*')
          .order('term_type', { ascending: true });
        if (!error && data && data.length > 0) {
          const normalized: TermItem[] = data.map(t => ({
            ...t,
            term_code: t.term_code || t.term_title,
            term_text: t.term_content || t.term_text,
          }));
          setStored('terms', normalized);
          return normalized;
        }
      } catch (err) {
        console.warn('Supabase getTerms error, using local cache:', err);
      }
    }
    return getStored('terms', INITIAL_TERMS);
  },
  saveTerm: async (term: TermItem): Promise<TermItem> => {
    const list = getStored('terms', INITIAL_TERMS);
    const validId = toValidUUID(term.id || `term-${Date.now()}`);
    const normalized: TermItem = {
      ...term,
      id: validId,
      term_title: term.term_title || term.term_code || 'General Term',
      term_content: term.term_content || term.term_text || '',
      term_code: term.term_code || term.term_title || 'TRM',
      term_text: term.term_text || term.term_content || '',
    };
    const index = list.findIndex(t => t.id === term.id || t.id === validId);
    if (index >= 0) {
      list[index] = normalized;
    } else {
      list.push(normalized);
    }
    setStored('terms', list);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          id: validId,
          term_type: normalized.term_type,
          term_title: normalized.term_title,
          term_content: normalized.term_content,
          is_default: Boolean(normalized.is_default),
        };
        const { error } = await supabase.from('terms').upsert(payload);
        if (error) console.warn('Supabase saveTerm upsert error:', error.message);
      } catch (err) {
        console.warn('Supabase saveTerm exception:', err);
      }
    }

    return normalized;
  },
  deleteTerm: async (id: string): Promise<boolean> => {
    const list = getStored('terms', INITIAL_TERMS);
    const validId = toValidUUID(id);
    const filtered = list.filter(t => t.id !== id && t.id !== validId);
    setStored('terms', filtered);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('terms').delete().or(`id.eq.${id},id.eq.${validId}`);
      } catch (err) {
        console.warn('Supabase deleteTerm error:', err);
      }
    }
    return true;
  },

  // Approval Matrix
  getApprovalMatrix: async (): Promise<ApprovalMatrixTier[]> => db.getApprovalMatrices(),
  getApprovalMatrices: async (): Promise<ApprovalMatrixTier[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('approval_matrix')
          .select('*')
          .order('approval_level', { ascending: true });
        if (!error && data && data.length > 0) {
          const normalized: ApprovalMatrixTier[] = data.map(m => ({
            ...m,
            document_type: m.module || m.document_type || 'PO',
            module: m.module || m.document_type || 'PO',
            approver_role: m.required_role || m.approver_role,
            required_role: m.required_role || m.approver_role,
          }));
          setStored('approval_matrix', normalized);
          return normalized;
        }
      } catch (err) {
        console.warn('Supabase getApprovalMatrix error, using local cache:', err);
      }
    }
    return getStored('approval_matrix', INITIAL_APPROVAL_MATRIX);
  },
  saveApprovalMatrix: async (tier: ApprovalMatrixTier): Promise<ApprovalMatrixTier> => {
    const list = getStored('approval_matrix', INITIAL_APPROVAL_MATRIX);
    const validId = toValidUUID(tier.id || `mat-${Date.now()}`);
    const normalized: ApprovalMatrixTier = {
      ...tier,
      id: validId,
      module: tier.module || tier.document_type || 'PO',
      document_type: tier.document_type || tier.module || 'PO',
      required_role: tier.required_role || tier.approver_role,
      approver_role: tier.approver_role || tier.required_role,
    };
    const index = list.findIndex(m => m.id === tier.id || m.id === validId);
    if (index >= 0) {
      list[index] = normalized;
    } else {
      list.push(normalized);
    }
    setStored('approval_matrix', list);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          id: validId,
          module: normalized.module,
          min_amount: Number(normalized.min_amount || 0),
          max_amount: Number(normalized.max_amount || 999999999),
          approval_level: Number(normalized.approval_level || 1),
          required_role: normalized.required_role,
        };
        const { error } = await supabase.from('approval_matrix').upsert(payload);
        if (error) console.warn('Supabase saveApprovalMatrix upsert error:', error.message);
      } catch (err) {
        console.warn('Supabase saveApprovalMatrix exception:', err);
      }
    }

    return normalized;
  },
  deleteApprovalMatrix: async (id: string): Promise<boolean> => {
    const list = getStored('approval_matrix', INITIAL_APPROVAL_MATRIX);
    const validId = toValidUUID(id);
    const filtered = list.filter(m => m.id !== id && m.id !== validId);
    setStored('approval_matrix', filtered);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('approval_matrix').delete().or(`id.eq.${id},id.eq.${validId}`);
      } catch (err) {
        console.warn('Supabase deleteApprovalMatrix error:', err);
      }
    }
    return true;
  },

  // Vendor Evaluations
  getVendorEvaluations: async (): Promise<VendorEvaluation[]> => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('vendor_evaluations')
          .select('*')
          .order('evaluation_date', { ascending: false });
        if (!error && data && data.length > 0) {
          setStored('vendor_evaluations', data);
          return data;
        }
      } catch (err) {
        console.warn('Supabase getVendorEvaluations error, using local cache:', err);
      }
    }
    return getStored('vendor_evaluations', INITIAL_VENDOR_EVALUATIONS);
  },
  saveVendorEvaluation: async (evaluation: VendorEvaluation): Promise<VendorEvaluation> => {
    const list = getStored('vendor_evaluations', INITIAL_VENDOR_EVALUATIONS);
    const validId = toValidUUID(evaluation.id || `ve-${Date.now()}`);
    const validVendorId = toValidUUID(evaluation.vendor_id);
    const normalized: VendorEvaluation = {
      ...evaluation,
      id: validId,
      vendor_id: validVendorId,
    };
    const index = list.findIndex(e => e.id === evaluation.id || e.id === validId);
    if (index >= 0) {
      list[index] = normalized;
    } else {
      list.push(normalized);
    }
    setStored('vendor_evaluations', list);

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          id: validId,
          vendor_id: validVendorId,
          evaluation_date: normalized.evaluation_date,
          price_score: Number(normalized.price_score || 0),
          quality_score: Number(normalized.quality_score || 0),
          delivery_score: Number(normalized.delivery_score || 0),
          experience_score: Number(normalized.experience_score || 0),
          financial_score: Number(normalized.financial_score || 0),
          technical_score: Number(normalized.technical_score || 0),
          overall_score: Number(normalized.overall_score || 0),
          evaluated_by: normalized.evaluated_by || null,
          remarks: normalized.remarks || null,
        };
        const { error } = await supabase.from('vendor_evaluations').upsert(payload);
        if (error) console.warn('Supabase saveVendorEvaluation error:', error.message);
      } catch (err) {
        console.warn('Supabase saveVendorEvaluation exception:', err);
      }
    }

    await db.addAuditLog('VENDOR_EVALUATION', index >= 0 ? 'UPDATE' : 'CREATE', evaluation.vendor_name || evaluation.vendor_id, null, normalized);
    return normalized;
  },

  // -------------------------------------------------------------
  // MASTER DATA CLOUD SYNC ENGINE
  // -------------------------------------------------------------
  syncAllMasterDataToSupabase: async (): Promise<{
    success: boolean;
    results: Record<string, { count: number; error?: string }>;
  }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, results: { all: { count: 0, error: 'Supabase is not configured' } } };
    }

    const results: Record<string, { count: number; error?: string }> = {};

    // 1. Projects first (sites depend on projects)
    try {
      const projects = getStored('projects', INITIAL_PROJECTS);
      const rows = projects.map(p => ({
        id: toValidUUID(p.id),
        project_code: p.project_code,
        project_name: p.project_name,
        client_name: p.client_name,
        project_type: p.project_type,
        location: p.location,
        start_date: p.start_date,
        end_date: p.end_date || null,
        project_manager: p.project_manager,
        budget: Number(p.budget || 0),
        status: p.status,
      }));
      const { error } = await supabase.from('projects').upsert(rows, { onConflict: 'project_code' });
      results.projects = { count: rows.length, error: error?.message };
    } catch (err: any) {
      results.projects = { count: 0, error: err.message };
    }

    // 2. Sites
    try {
      const sites = getStored('sites', INITIAL_SITES);
      const rows = sites.map(s => ({
        id: toValidUUID(s.id),
        project_id: toValidUUID(s.project_id),
        site_code: s.site_code,
        site_name: s.site_name,
        site_address: s.site_address,
        site_manager: s.site_manager,
        contact_number: s.contact_number || null,
        status: s.status,
      }));
      const { error } = await supabase.from('sites').upsert(rows, { onConflict: 'site_code' });
      results.sites = { count: rows.length, error: error?.message };
    } catch (err: any) {
      results.sites = { count: 0, error: err.message };
    }

    // 3. Vendors
    try {
      const vendors = getStored('vendors', INITIAL_VENDORS);
      const rows = vendors.map(v => ({
        id: toValidUUID(v.id),
        vendor_code: v.vendor_code,
        vendor_name: v.vendor_name,
        vendor_type: v.vendor_type || 'SUPPLIER',
        gst_number: v.gst_number || null,
        pan_number: v.pan_number || null,
        contact_person: v.contact_person || null,
        mobile: v.mobile || null,
        email: v.email || null,
        address: v.address || null,
        state: v.state || null,
        city: v.city || null,
        pincode: v.pincode || null,
        bank_name: v.bank_name || null,
        account_number: v.account_number || null,
        ifsc: v.ifsc || null,
        payment_terms: v.payment_terms || null,
        credit_days: Number(v.credit_days || 30),
        vendor_rating: Number(v.vendor_rating || 4.0),
        status: v.status || 'ACTIVE',
      }));
      const { error } = await supabase.from('vendors').upsert(rows, { onConflict: 'vendor_code' });
      results.vendors = { count: rows.length, error: error?.message };
    } catch (err: any) {
      results.vendors = { count: 0, error: err.message };
    }

    // 4. Items
    try {
      const items = getStored('items', INITIAL_ITEMS);
      const rows = items.map(i => ({
        id: toValidUUID(i.id),
        item_code: i.item_code,
        item_name: i.item_name,
        category_name: i.category_name || i.category || 'General',
        description: i.description || null,
        specification: i.specification || i.specifications || null,
        unit: i.unit || i.uom || 'Nos',
        hsn_sac: i.hsn_sac || i.hsn_code || null,
        gst_rate: Number(i.gst_rate || 18),
        standard_rate: Number(i.standard_rate || 0),
        reorder_level: Number(i.reorder_level || 0),
        is_active: i.is_active ?? (i.status !== 'INACTIVE'),
      }));
      const { error } = await supabase.from('items').upsert(rows, { onConflict: 'item_code' });
      results.items = { count: rows.length, error: error?.message };
    } catch (err: any) {
      results.items = { count: 0, error: err.message };
    }

    // 5. Cost Codes
    try {
      const costCodes = getStored('cost_codes', INITIAL_COST_CODES);
      const rows = costCodes.map(c => ({
        id: toValidUUID(c.id),
        code: c.code,
        description: c.description || c.name || '',
        category: c.category || 'CIVIL',
      }));
      const { error } = await supabase.from('cost_codes').upsert(rows, { onConflict: 'code' });
      results.cost_codes = { count: rows.length, error: error?.message };
    } catch (err: any) {
      results.cost_codes = { count: 0, error: err.message };
    }

    // 6. Terms
    try {
      const terms = getStored('terms', INITIAL_TERMS);
      const rows = terms.map(t => ({
        id: toValidUUID(t.id),
        term_type: t.term_type,
        term_title: t.term_title || t.term_code || 'General',
        term_content: t.term_content || t.term_text || '',
        is_default: Boolean(t.is_default),
      }));
      const { error } = await supabase.from('terms').upsert(rows);
      results.terms = { count: rows.length, error: error?.message };
    } catch (err: any) {
      results.terms = { count: 0, error: err.message };
    }

    // 7. Approval Matrix
    try {
      const matrix = getStored('approval_matrix', INITIAL_APPROVAL_MATRIX);
      const rows = matrix.map(m => ({
        id: toValidUUID(m.id),
        module: m.module || m.document_type || 'PO',
        min_amount: Number(m.min_amount || 0),
        max_amount: Number(m.max_amount || 999999999),
        approval_level: Number(m.approval_level || 1),
        required_role: m.required_role || m.approver_role || 'APPROVER',
      }));
      const { error } = await supabase.from('approval_matrix').upsert(rows);
      results.approval_matrix = { count: rows.length, error: error?.message };
    } catch (err: any) {
      results.approval_matrix = { count: 0, error: err.message };
    }

    const hasErrors = Object.values(results).some(r => Boolean(r.error));
    return { success: !hasErrors, results };
  },

  syncAllMasterDataFromSupabase: async (): Promise<{
    success: boolean;
    results: Record<string, { count: number; error?: string }>;
  }> => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, results: { all: { count: 0, error: 'Supabase is not configured' } } };
    }

    const results: Record<string, { count: number; error?: string }> = {};

    try {
      const p = await db.getProjects();
      results.projects = { count: p.length };
    } catch (e: any) {
      results.projects = { count: 0, error: e.message };
    }
    try {
      const s = await db.getSites();
      results.sites = { count: s.length };
    } catch (e: any) {
      results.sites = { count: 0, error: e.message };
    }
    try {
      const v = await db.getVendors();
      results.vendors = { count: v.length };
    } catch (e: any) {
      results.vendors = { count: 0, error: e.message };
    }
    try {
      const i = await db.getItems();
      results.items = { count: i.length };
    } catch (e: any) {
      results.items = { count: 0, error: e.message };
    }
    try {
      const c = await db.getCostCodes();
      results.cost_codes = { count: c.length };
    } catch (e: any) {
      results.cost_codes = { count: 0, error: e.message };
    }
    try {
      const t = await db.getTerms();
      results.terms = { count: t.length };
    } catch (e: any) {
      results.terms = { count: 0, error: e.message };
    }
    try {
      const m = await db.getApprovalMatrices();
      results.approval_matrix = { count: m.length };
    } catch (e: any) {
      results.approval_matrix = { count: 0, error: e.message };
    }

    return { success: true, results };
  },

  // Purchase Requisitions
  getPRs: async (): Promise<PurchaseRequisition[]> => {
    return getStored('prs', INITIAL_PRS);
  },
  getPRById: async (id: string): Promise<PurchaseRequisition | undefined> => {
    const list = await db.getPRs();
    return list.find(p => p.id === id || p.pr_number === id);
  },
  savePR: async (pr: PurchaseRequisition): Promise<PurchaseRequisition> => {
    const list = getStored('prs', INITIAL_PRS);
    const index = list.findIndex(p => p.id === pr.id);
    if (index >= 0) {
      list[index] = { ...pr, updated_at: new Date().toISOString() };
    } else {
      const count = list.length + 1;
      const num = pr.pr_number || generateDocNumber('PR', count);
      pr = { ...pr, id: pr.id || `pr-${Date.now()}`, pr_number: num, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      list.push(pr);
    }
    setStored('prs', list);
    await db.addAuditLog('PR', index >= 0 ? 'UPDATE' : 'CREATE', pr.pr_number, null, pr);
    return pr;
  },
  updatePRStatus: async (id: string, status: PurchaseRequisition['status'], approverName: string, role: string, comments = ''): Promise<PurchaseRequisition> => {
    const list = getStored('prs', INITIAL_PRS);
    const pr = list.find(p => p.id === id);
    if (!pr) throw new Error('PR not found');
    const oldStatus = pr.status;
    pr.status = status;
    pr.updated_at = new Date().toISOString();
    setStored('prs', list);
    await db.addAuditLog('PR', `STATUS_${status}`, pr.pr_number, { status: oldStatus }, { status, approver: approverName, comments });
    return pr;
  },

  // RFQ
  getRFQs: async (): Promise<RFQ[]> => getStored('rfqs', INITIAL_RFQS),
  saveRFQ: async (rfq: RFQ): Promise<RFQ> => {
    const list = getStored('rfqs', INITIAL_RFQS);
    const index = list.findIndex(r => r.id === rfq.id);
    if (index >= 0) {
      list[index] = rfq;
    } else {
      const num = rfq.rfq_number || generateDocNumber('RFQ', list.length + 1);
      rfq = { ...rfq, id: rfq.id || `rfq-${Date.now()}`, rfq_number: num, created_at: new Date().toISOString() };
      list.push(rfq);
    }
    setStored('rfqs', list);
    await db.addAuditLog('RFQ', index >= 0 ? 'UPDATE' : 'CREATE', rfq.rfq_number, null, rfq);
    return rfq;
  },

  // Vendor Quotations
  getQuotations: async (rfqId?: string): Promise<VendorQuotation[]> => {
    const list = getStored('quotations', INITIAL_QUOTATIONS);
    if (rfqId) return list.filter(q => q.rfq_id === rfqId);
    return list;
  },
  saveQuotation: async (quotation: VendorQuotation): Promise<VendorQuotation> => {
    const list = getStored('quotations', INITIAL_QUOTATIONS);
    const index = list.findIndex(q => q.id === quotation.id);
    if (index >= 0) {
      list[index] = quotation;
    } else {
      const num = quotation.quotation_number || generateDocNumber('QT', list.length + 1);
      quotation = { ...quotation, id: quotation.id || `qt-${Date.now()}`, quotation_number: num, created_at: new Date().toISOString() };
      list.push(quotation);
    }
    setStored('quotations', list);
    await db.addAuditLog('QUOTATION', index >= 0 ? 'UPDATE' : 'CREATE', quotation.quotation_number, null, quotation);
    return quotation;
  },

  // Quotation Comparison & Shortlist
  getComparisons: async (): Promise<QuotationComparison[]> => getStored('comparisons', INITIAL_COMPARISONS),
  saveComparison: async (comp: QuotationComparison): Promise<QuotationComparison> => {
    const list = getStored('comparisons', INITIAL_COMPARISONS);
    const index = list.findIndex(c => c.id === comp.id);
    if (index >= 0) {
      list[index] = comp;
    } else {
      const num = comp.comparison_number || generateDocNumber('CS', list.length + 1);
      comp = { ...comp, id: comp.id || `qc-${Date.now()}`, comparison_number: num };
      list.push(comp);
    }
    setStored('comparisons', list);
    await db.addAuditLog('COMPARISON', index >= 0 ? 'UPDATE' : 'CREATE', comp.comparison_number, null, comp);
    return comp;
  },
  getShortlists: async (): Promise<SupplierShortlist[]> => getStored('shortlists', INITIAL_SHORTLISTS),
  saveShortlist: async (shortlist: SupplierShortlist): Promise<SupplierShortlist> => {
    const list = getStored('shortlists', INITIAL_SHORTLISTS);
    list.push({ ...shortlist, id: shortlist.id || `ss-${Date.now()}`, created_at: new Date().toISOString() });
    setStored('shortlists', list);
    await db.addAuditLog('SHORTLIST', 'CREATE', shortlist.vendor_name, null, shortlist);
    return shortlist;
  },

  // Purchase Orders (PO)
  getPOs: async (): Promise<PurchaseOrder[]> => getStored('pos', INITIAL_POS),
  getPOById: async (id: string): Promise<PurchaseOrder | undefined> => {
    const list = await db.getPOs();
    return list.find(p => p.id === id || p.po_number === id);
  },
  savePO: async (po: PurchaseOrder): Promise<PurchaseOrder> => {
    const list = getStored('pos', INITIAL_POS);
    const index = list.findIndex(p => p.id === po.id);
    if (index >= 0) {
      list[index] = { ...po, updated_at: new Date().toISOString() };
    } else {
      const num = po.po_number || generateDocNumber('PO', list.length + 1);
      po = { ...po, id: po.id || `po-${Date.now()}`, po_number: num, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      list.push(po);
    }
    setStored('pos', list);
    await db.addAuditLog('PO', index >= 0 ? 'UPDATE' : 'CREATE', po.po_number, null, po);
    return po;
  },
  amendPO: async (poId: string, amendmentReason: string, newPOData: Partial<PurchaseOrder>, user: string): Promise<PurchaseOrder> => {
    const list = getStored('pos', INITIAL_POS);
    const po = list.find(p => p.id === poId);
    if (!po) throw new Error('PO not found');
    const oldSnapshot = JSON.parse(JSON.stringify(po));
    const nextVersion = (po.version || 1) + 1;
    const amendNumber = `${po.po_number}-A0${nextVersion - 1}`;

    const versions = getStored<POVersion[]>('po_versions', []);
    const changedFields = Object.keys(newPOData);
    versions.push({
      id: `pov-${Date.now()}`,
      po_id: po.id,
      version_number: nextVersion,
      amendment_number: amendNumber,
      amendment_reason: amendmentReason,
      previous_snapshot: oldSnapshot,
      new_snapshot: { ...po, ...newPOData, version: nextVersion },
      changed_fields: changedFields,
      amended_by: user,
      amended_at: new Date().toISOString(),
    });
    setStored('po_versions', versions);

    Object.assign(po, newPOData, { version: nextVersion, updated_at: new Date().toISOString() });
    setStored('pos', list);
    await db.addAuditLog('PO', 'AMEND', amendNumber, { reason: amendmentReason, old: oldSnapshot }, po);
    return po;
  },
  getPOVersions: async (poId: string): Promise<POVersion[]> => {
    const versions = getStored<POVersion[]>('po_versions', []);
    return versions.filter(v => v.po_id === poId);
  },

  // Advance Payments
  getAdvances: async (poId?: string): Promise<AdvancePayment[]> => {
    const list = getStored('advances', INITIAL_ADVANCES);
    if (poId) return list.filter(a => a.po_id === poId);
    return list;
  },
  saveAdvance: async (adv: AdvancePayment): Promise<AdvancePayment> => {
    const list = getStored('advances', INITIAL_ADVANCES);
    const num = adv.advance_number || generateDocNumber('ADV', list.length + 1);
    const newAdv = { ...adv, id: adv.id || `adv-${Date.now()}`, advance_number: num, created_at: new Date().toISOString() };
    list.push(newAdv);
    setStored('advances', list);

    // Update PO advance paid
    const pos = getStored('pos', INITIAL_POS);
    const targetPO = pos.find(p => p.id === adv.po_id);
    if (targetPO) {
      targetPO.advance_paid = (targetPO.advance_paid || 0) + adv.amount;
      setStored('pos', pos);
    }

    await db.addAuditLog('ADVANCE', 'CREATE', num, null, newAdv);
    return newAdv;
  },

  // Goods Received Note (GRN)
  getGRNs: async (): Promise<GoodsReceivedNote[]> => getStored('grns', INITIAL_GRNS),
  getGRNById: async (id: string): Promise<GoodsReceivedNote | undefined> => {
    const list = await db.getGRNs();
    return list.find(g => g.id === id || g.grn_number === id);
  },
  saveGRN: async (grn: GoodsReceivedNote): Promise<GoodsReceivedNote> => {
    const list = getStored('grns', INITIAL_GRNS);
    const index = list.findIndex(g => g.id === grn.id);
    if (index >= 0) {
      list[index] = grn;
    } else {
      const num = grn.grn_number || generateDocNumber('GRN', list.length + 1);
      grn = { ...grn, id: grn.id || `grn-${Date.now()}`, grn_number: num, created_at: new Date().toISOString() };
      list.push(grn);
    }
    setStored('grns', list);

    // Update PO item received quantities based on all GRNs for this PO
    const pos = getStored('pos', INITIAL_POS);
    const targetPO = pos.find(p => p.id === grn.po_id);
    if (targetPO) {
      const poGrns = list.filter(g => g.po_id === targetPO.id && g.status !== 'REJECTED');
      targetPO.items.forEach(poItem => {
        let totalAccepted = 0;
        poGrns.forEach(g => {
          const matched = g.items?.find(gi => gi.item_id === poItem.item_id || gi.item_name === poItem.item_name);
          if (matched) {
            totalAccepted += (matched.accepted_quantity ?? matched.received_quantity ?? 0);
          }
        });
        poItem.received_quantity = totalAccepted;
        poItem.balance_quantity = Math.max(0, poItem.quantity - totalAccepted);
      });
      const allReceived = targetPO.items.every(pi => pi.received_quantity >= pi.quantity);
      const anyReceived = targetPO.items.some(pi => pi.received_quantity > 0);
      targetPO.status = allReceived ? 'FULLY_RECEIVED' : anyReceived ? 'PARTIALLY_RECEIVED' : targetPO.status;
      setStored('pos', pos);
    }

    // If GRN is approved, update Stock Ledger with accepted stock and storage locations
    if (grn.status === 'APPROVED') {
      const stocks = getStored<StockLedger[]>('stock_ledger', INITIAL_STOCK_LEDGER);
      grn.items?.forEach(grnItem => {
        const accepted = grnItem.accepted_quantity || 0;
        if (accepted > 0) {
          const match = stocks.find(
            s => (s.item_id === grnItem.item_id || s.item_name === grnItem.item_name) &&
                 (s.project_id === grn.project_id || s.site_id === grn.site_id)
          ) || stocks.find(s => s.item_id === grnItem.item_id || s.item_name === grnItem.item_name);

          const loc = grnItem.storage_location || grn.store_location || 'Central Yard Store';
          if (match) {
            match.current_quantity += accepted;
            match.total_valuation = match.current_quantity * (match.average_rate || 350);
            if (loc) match.storage_location = loc;
            match.updated_at = new Date().toISOString();
          } else {
            stocks.push({
              id: `stk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              item_id: grnItem.item_id || `itm-${Date.now()}`,
              item_code: `MAT-GEN-${Date.now().toString().slice(-3)}`,
              item_name: grnItem.item_name,
              project_id: grn.project_id,
              project_name: grn.project_name,
              site_id: grn.site_id,
              site_name: grn.site_name,
              storage_location: loc,
              uom: grnItem.uom || grnItem.unit || 'Nos',
              current_quantity: accepted,
              reorder_level: 20,
              average_rate: grnItem.rate || 350,
              total_valuation: accepted * (grnItem.rate || 350),
              updated_at: new Date().toISOString(),
            });
          }
        }
      });
      setStored('stock_ledger', stocks);
    }
    await db.addAuditLog('GRN', index >= 0 ? 'UPDATE' : 'CREATE', grn.grn_number, null, grn);
    return grn;
  },

  // Debit Notes
  getDebitNotes: async (): Promise<DebitNote[]> => getStored('debit_notes', INITIAL_DEBIT_NOTES),
  saveDebitNote: async (dn: DebitNote): Promise<DebitNote> => {
    const list = getStored('debit_notes', INITIAL_DEBIT_NOTES);
    const num = dn.debit_note_number || generateDocNumber('DN', list.length + 1);
    const newDN = { ...dn, id: dn.id || `dn-${Date.now()}`, debit_note_number: num, created_at: new Date().toISOString() };
    list.push(newDN);
    setStored('debit_notes', list);
    await db.addAuditLog('DEBIT_NOTE', 'CREATE', num, null, newDN);
    return newDN;
  },

  // Purchase Bills & 3-Way Matching Engine
  getBills: async (): Promise<PurchaseBill[]> => getStored('bills', INITIAL_BILLS),
  getBillById: async (id: string): Promise<PurchaseBill | undefined> => {
    const list = await db.getBills();
    return list.find(b => b.id === id || b.bill_number === id);
  },
  validateThreeWayMatching: (
    po: PurchaseOrder,
    grn: GoodsReceivedNote,
    billItems: Array<{ item_name: string; billed_qty: number; billed_rate: number }>
  ) => {
    const discrepancies: Array<{ type: string; message: string; severity: 'warning' | 'error' }> = [];

    billItems.forEach(bItem => {
      const grnItem = grn.items.find(gi => gi.item_name === bItem.item_name);
      const poItem = po.items.find(pi => pi.item_name === bItem.item_name);

      if (!grnItem) {
        discrepancies.push({
          type: 'UNRECEIVED_ITEM',
          message: `Item "${bItem.item_name}" has no corresponding receipt in GRN ${grn.grn_number}.`,
          severity: 'error',
        });
        return;
      }

      // Quantity check: Billed Qty vs GRN Accepted Qty
      if (bItem.billed_qty > grnItem.accepted_quantity) {
        discrepancies.push({
          type: 'QTY_MISMATCH',
          message: `Excess Billing: Billed ${bItem.billed_qty} ${grnItem.unit} exceeds GRN accepted ${grnItem.accepted_quantity} ${grnItem.unit}.`,
          severity: 'error',
        });
      }

      // Rate check: Billed Rate vs PO Agreed Rate
      if (poItem && bItem.billed_rate > poItem.rate) {
        discrepancies.push({
          type: 'RATE_MISMATCH',
          message: `Rate Mismatch: Invoiced rate ₹${bItem.billed_rate} exceeds PO rate ₹${poItem.rate}.`,
          severity: 'error',
        });
      }
    });

    let matchingStatus: PurchaseBill['matching_status'] = 'MATCHED';
    if (discrepancies.some(d => d.type === 'QTY_MISMATCH')) matchingStatus = 'QTY_MISMATCH';
    else if (discrepancies.some(d => d.type === 'RATE_MISMATCH')) matchingStatus = 'RATE_MISMATCH';

    return { matchingStatus, discrepancies };
  },
  saveBill: async (bill: PurchaseBill): Promise<PurchaseBill> => {
    const list = getStored('bills', INITIAL_BILLS);
    const index = list.findIndex(b => b.id === bill.id);
    if (index >= 0) {
      list[index] = bill;
    } else {
      const num = bill.bill_number || generateDocNumber('PB', list.length + 1);
      bill = { ...bill, id: bill.id || `pb-${Date.now()}`, bill_number: num, created_at: new Date().toISOString() };
      list.push(bill);
    }
    setStored('bills', list);
    await db.addAuditLog('PURCHASE_BILL', index >= 0 ? 'UPDATE' : 'CREATE', bill.bill_number, null, bill);
    return bill;
  },

  // Financial Postings (General Ledger JVs)
  getFinancialPostings: async (): Promise<FinancialPosting[]> => getStored('postings', INITIAL_POSTINGS),
  createFinancialPostingForBill: async (bill: PurchaseBill, user: string): Promise<FinancialPosting> => {
    const list = getStored('postings', INITIAL_POSTINGS);
    const postNum = `JV/${new Date().getFullYear()}/${String(list.length + 1).padStart(6, '0')}`;

    const taxableAmount = bill.invoice_amount - bill.discount;
    const gstHalf = round((bill.tax_amount || 0) / 2);

    const entries = [
      {
        id: `pe-${Date.now()}-1`,
        posting_id: postNum,
        account_name: 'Civil Works Material Purchase A/C',
        account_code: 'GL-5001',
        debit: taxableAmount,
        credit: 0,
        cost_code: 'CC-CIVIL-01',
      },
      {
        id: `pe-${Date.now()}-2`,
        posting_id: postNum,
        account_name: 'Input CGST Recoverable A/C',
        account_code: 'GL-1402',
        debit: gstHalf,
        credit: 0,
      },
      {
        id: `pe-${Date.now()}-3`,
        posting_id: postNum,
        account_name: 'Input SGST Recoverable A/C',
        account_code: 'GL-1403',
        debit: gstHalf,
        credit: 0,
      },
      {
        id: `pe-${Date.now()}-4`,
        posting_id: postNum,
        account_name: `${bill.vendor_name} Payable A/C`,
        account_code: 'GL-2101',
        debit: 0,
        credit: bill.net_payable,
      },
    ];

    const posting: FinancialPosting = {
      id: `post-${Date.now()}`,
      posting_number: postNum,
      posting_date: new Date().toISOString().split('T')[0],
      document_type: 'PURCHASE_BILL',
      document_number: bill.bill_number,
      project_id: bill.project_id,
      project_name: bill.project_name,
      vendor_id: bill.vendor_id,
      vendor_name: bill.vendor_name,
      total_amount: bill.net_payable,
      status: 'POSTED',
      created_by: user,
      created_at: new Date().toISOString(),
      entries,
    };

    list.push(posting);
    setStored('postings', list);

    // Mark bill as financially posted
    const bills = getStored('bills', INITIAL_BILLS);
    const b = bills.find(item => item.id === bill.id);
    if (b) {
      b.is_financially_posted = true;
      setStored('bills', bills);
    }

    await db.addAuditLog('POSTING', 'CREATE', postNum, null, posting);
    return posting;
  },

  // Payments & Knockoffs
  getPayments: async (): Promise<Payment[]> => getStored('payments', []),
  savePayment: async (payment: Payment): Promise<Payment> => {
    const list = getStored('payments', []);
    const num = payment.payment_number || generateDocNumber('PAY', list.length + 1);
    const newPayment = { ...payment, id: payment.id || `pay-${Date.now()}`, payment_number: num, created_at: new Date().toISOString() };
    list.push(newPayment);
    setStored('payments', list);
    await db.addAuditLog('PAYMENT', 'CREATE', num, null, newPayment);
    return newPayment;
  },
  getKnockoffs: async (): Promise<Knockoff[]> => getStored('knockoffs', []),
  saveKnockoff: async (knockoff: Knockoff): Promise<Knockoff> => {
    const list = getStored('knockoffs', []);
    const newK = { ...knockoff, id: knockoff.id || `kno-${Date.now()}`, created_at: new Date().toISOString() };
    list.push(newK);
    setStored('knockoffs', list);

    // Adjust Bill outstanding
    const bills = getStored('bills', INITIAL_BILLS);
    const bill = bills.find(b => b.id === knockoff.bill_id);
    if (bill) {
      bill.adjusted_amount = (bill.adjusted_amount || 0) + knockoff.allocated_amount;
      bill.outstanding_amount = Math.max(0, bill.net_payable - (bill.paid_amount || 0) - bill.adjusted_amount);
      if (bill.outstanding_amount === 0) bill.status = 'PAID';
      else bill.status = 'PARTIALLY_PAID';
      setStored('bills', bills);
    }

    await db.addAuditLog('KNOCKOFF', 'ALLOCATE', knockoff.bill_id, null, knockoff);
    return newK;
  },

  // Audit Logs
  getAuditLogs: async (module?: string, recordId?: string): Promise<AuditLog[]> => {
    const list = getStored('audit_logs', INITIAL_AUDIT);
    if (!module && !recordId) return list;
    return list.filter(l => {
      if (module && l.module !== module) return false;
      if (recordId && l.record_id !== recordId) return false;
      return true;
    });
  },
  addAuditLog: async (module: string, action: string, recordId: string, oldValue?: any, newValue?: any, user = 'Current User') => {
    const list = getStored('audit_logs', INITIAL_AUDIT);
    list.unshift({
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_email: 'tester3506@gmail.com',
      user_name: user,
      user_role: 'SUPER_ADMIN',
      module,
      action,
      record_id: recordId,
      old_value: oldValue,
      new_value: newValue,
      timestamp: new Date().toISOString(),
    });
    setStored('audit_logs', list.slice(0, 200)); // Cap to 200 records
  },

  // Notifications
  getNotifications: async (): Promise<Notification[]> => getStored('notifications', INITIAL_NOTIFICATIONS),
  markNotificationRead: async (id: string) => {
    const list = getStored('notifications', INITIAL_NOTIFICATIONS);
    const item = list.find(n => n.id === id);
    if (item) {
      item.is_read = true;
      setStored('notifications', list);
    }
  },

  // Store Inventory & Stock Ledger
  getStockLedger: async (): Promise<StockLedger[]> => {
    return getStored('stock_ledger', INITIAL_STOCK_LEDGER);
  },
  saveStockLedger: async (entry: StockLedger): Promise<StockLedger> => {
    const list = getStored('stock_ledger', INITIAL_STOCK_LEDGER);
    const index = list.findIndex(s => s.id === entry.id);
    if (index >= 0) {
      list[index] = { ...entry, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...entry, id: entry.id || `stk-${Date.now()}`, updated_at: new Date().toISOString() });
    }
    setStored('stock_ledger', list);
    return entry;
  },

  // Material Issues (MIN)
  getMaterialIssues: async (): Promise<MaterialIssue[]> => {
    return getStored('material_issues', INITIAL_MATERIAL_ISSUES);
  },
  saveMaterialIssue: async (issue: MaterialIssue): Promise<MaterialIssue> => {
    const list = getStored('material_issues', INITIAL_MATERIAL_ISSUES);
    const num = issue.issue_number || generateDocNumber('MIN', list.length + 1);
    const newIssue = {
      ...issue,
      id: issue.id || `iss-${Date.now()}`,
      issue_number: num,
      created_at: issue.created_at || new Date().toISOString(),
    };
    list.unshift(newIssue);
    setStored('material_issues', list);

    // Deduct quantity from Stock Ledger
    const stocks = getStored('stock_ledger', INITIAL_STOCK_LEDGER);
    newIssue.items.forEach(itm => {
      const stk = stocks.find(s => s.item_id === itm.item_id || s.item_name === itm.item_name);
      if (stk) {
        stk.current_quantity = Math.max(0, stk.current_quantity - itm.quantity);
        stk.total_valuation = stk.current_quantity * stk.average_rate;
        stk.updated_at = new Date().toISOString();
      }
    });
    setStored('stock_ledger', stocks);

    await db.addAuditLog('MATERIAL_ISSUE', 'CREATE', num, null, newIssue);
    return newIssue;
  },

  // Material Transfers (MTN)
  getMaterialTransfers: async (): Promise<MaterialTransfer[]> => {
    return getStored('material_transfers', INITIAL_MATERIAL_TRANSFERS);
  },
  saveMaterialTransfer: async (transfer: MaterialTransfer): Promise<MaterialTransfer> => {
    const list = getStored('material_transfers', INITIAL_MATERIAL_TRANSFERS);
    const num = transfer.transfer_number || generateDocNumber('MTN', list.length + 1);
    const newTrf = {
      ...transfer,
      id: transfer.id || `trf-${Date.now()}`,
      transfer_number: num,
      created_at: transfer.created_at || new Date().toISOString(),
    };
    list.unshift(newTrf);
    setStored('material_transfers', list);
    await db.addAuditLog('MATERIAL_TRANSFER', 'CREATE', num, null, newTrf);
    return newTrf;
  },

  // Multi-tier Approval Engine
  processApproval: async (
    module: string,
    docId: string,
    docNumber: string,
    currentLevel?: number,
    action: 'APPROVE' | 'REJECT' | 'RETURN' = 'APPROVE',
    comments = '',
    userId?: string,
    userName?: string,
    userRole?: string
  ) => {
    const approverName = userName || 'Current Approver';
    const role = userRole || 'APPROVER';
    const level = currentLevel || 1;

    // Log approval transaction
    await db.addAuditLog(module, action, docNumber, null, {
      level,
      action,
      comments,
      approver: approverName,
      role,
    });

    if (module === 'PO') {
      const pos = getStored('pos', INITIAL_POS);
      const po = pos.find(p => p.id === docId || p.po_number === docNumber);
      if (po) {
        if (action === 'APPROVE') {
          po.status = 'APPROVED';
          po.current_approval_level = (po.current_approval_level || 1) + 1;
        } else if (action === 'REJECT') {
          po.status = 'REJECTED';
        }
        setStored('pos', pos);
      }
    } else if (module === 'PR') {
      const prs = getStored('prs', INITIAL_PRS);
      const pr = prs.find(p => p.id === docId || p.pr_number === docNumber);
      if (pr) {
        if (action === 'APPROVE') {
          pr.status = 'APPROVED';
          pr.current_approval_level = (pr.current_approval_level || 1) + 1;
        } else if (action === 'REJECT') {
          pr.status = 'REJECTED';
        }
        setStored('prs', prs);
      }
    } else if (module === 'COMPARISON') {
      const comps = getStored('comparisons', INITIAL_COMPARISONS);
      const c = comps.find(item => item.id === docId || item.comparison_number === docNumber);
      if (c) {
        c.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        c.approved_by = approverName;
        c.approved_at = new Date().toISOString();
        setStored('comparisons', comps);
      }
    }
  },

  // Reset demo data
  resetToDefaults: () => {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    window.location.reload();
  },
};
