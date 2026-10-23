import bcrypt from 'bcryptjs';
import {
  User,
  Role,
  Branch,
  Warehouse,
  Brand,
  Category,
  Product,
  ProductVariant,
  Supplier,
  Customer,
  BusinessSetting,
  Coupon,
  Expense,
  Counter,
  Employee,
} from '../models/index.js';
import { DEFAULT_ROLES } from '../config/permissions.js';
import { adjustStock } from '../services/inventoryService.js';
import { processSale } from '../services/saleService.js';
import { receivePurchaseItems } from '../services/purchaseService.js';
import { getNextSequence } from '../services/sequenceService.js';
import { Purchase } from '../models/Transaction.js';
import { logger } from '../utils/logger.js';

export async function seedDatabase() {
  logger.info('Starting database seeding for SuhaimSoft Perfume ERP...');

  // 1. Settings
  let settings = await BusinessSetting.findOne({ key: 'default' });
  if (!settings) {
    settings = await BusinessSetting.create({
      key: 'default',
      business: {
        name: 'SuhaimSoft Perfumes',
        legalName: 'SuhaimSoft Luxury Fragrance Pvt Ltd',
        tagline: 'Manage Every Fragrance. Control Every Sale.',
        phone: '+91 98765 43210',
        email: 'contact@suhaimsoft.com',
        website: 'https://suhaimsoft.com',
        taxId: '27AABCU9603R1ZM',
        address: {
          line1: 'SuhaimSoft Galleria, MG Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India',
        },
      },
      currency: 'INR',
      currencySymbol: '₹',
      timezone: 'Asia/Kolkata',
    });
  }

  // 2. Default Branch & Warehouse
  let branch = await Branch.findOne({ code: 'HQ-STORE' });
  if (!branch) {
    branch = await Branch.create({
      name: 'SuhaimSoft Flagship Store',
      code: 'HQ-STORE',
      type: 'store',
      phone: '+91 98765 43210',
      email: 'store@suhaimsoft.com',
      isDefault: true,
      address: {
        line1: 'MG Road Flagship',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    });
  }

  let warehouse = await Warehouse.findOne({ code: 'HQ-MAIN' });
  if (!warehouse) {
    warehouse = await Warehouse.create({
      name: 'Flagship Main Stockroom',
      code: 'HQ-MAIN',
      branch: branch._id,
      type: 'store',
      isDefault: true,
    });
  }

  // 3. Roles
  for (const r of DEFAULT_ROLES) {
    const existing = await Role.findOne({ slug: r.slug });
    if (!existing) {
      await Role.create(r);
    }
  }

  const managerRole = await Role.findOne({ slug: 'manager' });
  const cashierRole = await Role.findOne({ slug: 'cashier' });

  // 4. Master Admin User
  let masterAdmin = await User.findOne({ email: 'admin@suhaimsoft.com' });
  if (!masterAdmin) {
    const passwordHash = await bcrypt.hash('Admin@12345', 10);
    masterAdmin = await User.create({
      name: 'Suhaim Ali VP',
      email: 'admin@suhaimsoft.com',
      passwordHash,
      phone: '+91 98765 00001',
      isMasterAdmin: true,
      branch: branch._id,
      status: 'active',
    });
    logger.info('Created Master Admin: admin@suhaimsoft.com / Admin@12345');
  }

  // Staff accounts
  let cashierUser = await User.findOne({ email: 'cashier@suhaimsoft.com' });
  if (!cashierUser) {
    const pass = await bcrypt.hash('Cashier@12345', 10);
    cashierUser = await User.create({
      name: 'Hamza Cashier',
      email: 'cashier@suhaimsoft.com',
      passwordHash: pass,
      phone: '+91 98765 00002',
      isMasterAdmin: false,
      role: cashierRole?._id,
      branch: branch._id,
      status: 'active',
    });
  }

  // 5. Brands
  const brandData = [
    { name: 'Roja Parfums', country: 'United Kingdom', description: 'Haute Parfumerie renowned for precious natural essences.' },
    { name: 'Maison Francis Kurkdjian', country: 'France', description: 'Contemporary luxury French fragrance house.' },
    { name: 'Tom Ford Private Blend', country: 'United States', description: 'Iconic bespoke and daring artisanal scents.' },
    { name: 'Creed', country: 'France', description: 'Historic master perfumer house crafting legendary infusions.' },
    { name: 'Dior Privée', country: 'France', description: 'Haute couture fragrance collection.' },
    { name: 'Ajmal Fragrances', country: 'United Arab Emirates', description: 'Premier oriental attars and pure oud oils.' },
  ];

  const brands = {};
  for (const b of brandData) {
    let doc = await Brand.findOne({ name: b.name });
    if (!doc) doc = await Brand.create(b);
    brands[b.name] = doc;
  }

  // 6. Fragrance Families & Categories
  const families = ['Oriental / Amber', 'Woody / Oud', 'Fresh / Aquatic', 'Gourmand', 'Floral', 'Aromatic Citrus'];
  const catDocs = {};
  for (const f of families) {
    let cat = await Category.findOne({ name: f, type: 'fragrance_family' });
    if (!cat) cat = await Category.create({ name: f, type: 'fragrance_family' });
    catDocs[f] = cat;
  }

  const concentrations = ['Extrait de Parfum', 'Eau de Parfum (EDP)', 'Eau de Toilette (EDT)', 'Pure Perfume Oil / Attar', 'Eau de Cologne'];
  for (const c of concentrations) {
    let cat = await Category.findOne({ name: c, type: 'concentration' });
    if (!cat) await Category.create({ name: c, type: 'concentration', description: 'Standard luxury perfume concentration' });
  }

  const bottleSizes = ['30ml Travel Flacon', '50ml Standard Flacon', '100ml Signature Bottle', '200ml Large Flacon', '12ml Crystal Attar Flacon'];
  for (const s of bottleSizes) {
    let cat = await Category.findOne({ name: s, type: 'bottle_size' });
    if (!cat) await Category.create({ name: s, type: 'bottle_size', description: 'Standard bottle volume' });
  }

  // 7. Suppliers
  let supplierA = await Supplier.findOne({ code: 'SUP-00001' });
  if (!supplierA) {
    supplierA = await Supplier.create({
      code: 'SUP-00001',
      name: 'Grasse Essence Imports',
      company: 'Grasse Aromatics Global',
      contactPerson: 'Henri Laurent',
      phone: '+33 493 001122',
      email: 'orders@grasse-essence.fr',
      outstandingBalance: 0,
      totalPurchased: 0,
    });
  }

  let supplierB = await Supplier.findOne({ code: 'SUP-00002' });
  if (!supplierB) {
    supplierB = await Supplier.create({
      code: 'SUP-00002',
      name: 'Emirates Oud & Attar Distro',
      company: 'Emirates Fragrance LLC',
      contactPerson: 'Tariq Al-Mansoor',
      phone: '+971 4 223344',
      email: 'tariq@emiratesoud.ae',
      outstandingBalance: 0,
      totalPurchased: 0,
    });
  }

  // 8. Customers
  let walkIn = await Customer.findOne({ phone: '9999999999' });
  if (!walkIn) {
    walkIn = await Customer.create({
      code: 'CUS-00001',
      name: 'Walk-in Retail Guest',
      phone: '9999999999',
      type: 'retail',
      loyaltyPoints: 120,
    });
  }

  let vipCustomer = await Customer.findOne({ email: 'rahul.mehta@example.com' });
  if (!vipCustomer) {
    vipCustomer = await Customer.create({
      code: 'CUS-00002',
      name: 'Rahul Mehta (VIP)',
      phone: '+91 98200 11223',
      email: 'rahul.mehta@example.com',
      type: 'retail',
      discountPercent: 5,
      loyaltyPoints: 340,
      totalSpent: 45000,
      outstandingBalance: 0,
    });
  }

  let wholesaleClient = await Customer.findOne({ company: 'Royal Palace Boutique' });
  if (!wholesaleClient) {
    wholesaleClient = await Customer.create({
      code: 'CUS-00003',
      name: 'Zameer Luxury Boutiques',
      phone: '+91 98111 88990',
      email: 'purchasing@zameerluxury.com',
      type: 'wholesale',
      creditLimit: 500000,
      outstandingBalance: 125000,
      totalSpent: 320000,
    });
  }

  // 9. Perfume Products & Variants
  const productsCatalog = [
    {
      name: 'Baccarat Rouge 540',
      perfumeCode: 'MFK-BR540',
      brand: brands['Maison Francis Kurkdjian']._id,
      fragranceName: 'Rouge 540 Extrait',
      fragranceFamily: catDocs['Oriental / Amber']._id,
      gender: 'unisex',
      description: 'Luminous and intense, with floral-amber and woody notes caressing the skin.',
      topNotes: 'Jasmine Grandiflorum, Saffron',
      heartNotes: 'Bitter Almond, Cedarwood',
      baseNotes: 'Musky Woody Accord, Ambergris',
      variants: [
        { sku: 'MFK-BR540-70ML', name: '70ml Extrait de Parfum', sizeMl: 70, concentration: 'Parfum', purchaseCost: 18500, retailPrice: 28500, wholesalePrice: 22000, openingStock: 18, minStock: 4 },
        { sku: 'MFK-BR540-200ML', name: '200ml Extrait de Parfum', sizeMl: 200, concentration: 'Parfum', purchaseCost: 38000, retailPrice: 56000, wholesalePrice: 44000, openingStock: 8, minStock: 2 },
      ],
    },
    {
      name: 'Aventus',
      perfumeCode: 'CRD-AVENTUS',
      brand: brands['Creed']._id,
      fragranceName: 'Aventus Eau de Parfum',
      fragranceFamily: catDocs['Aromatic Citrus']._id,
      gender: 'men',
      description: 'The legendary fragrance celebrating strength, power, and success with smoky pineapple and birch.',
      topNotes: 'Lemon, Pink Pepper, Apple, Bergamot, Blackcurrant',
      heartNotes: 'Pineapple, Jasmine, Indonesian Patchouli',
      baseNotes: 'Birch, Ambergris, Cedarwood, Oakmoss, Musk',
      variants: [
        { sku: 'CRD-AVN-50ML', name: '50ml Eau de Parfum', sizeMl: 50, concentration: 'EDP', purchaseCost: 14000, retailPrice: 22500, wholesalePrice: 17500, openingStock: 22, minStock: 5 },
        { sku: 'CRD-AVN-100ML', name: '100ml Eau de Parfum', sizeMl: 100, concentration: 'EDP', purchaseCost: 21000, retailPrice: 32000, wholesalePrice: 25000, openingStock: 35, minStock: 6 },
      ],
    },
    {
      name: 'Tobacco Vanille',
      perfumeCode: 'TF-TOBVAN',
      brand: brands['Tom Ford Private Blend']._id,
      fragranceName: 'Tobacco Vanille Private Blend',
      fragranceFamily: catDocs['Gourmand']._id,
      gender: 'unisex',
      description: 'Opulent, warm and iconic, an artisanal scent featuring tonka bean, vanilla, and cocoa.',
      topNotes: 'Tobacco Leaf, Spicy Notes',
      heartNotes: 'Vanilla, Cacao, Tonka Bean, Tobacco Blossom',
      baseNotes: 'Dried Fruits, Woody Notes',
      variants: [
        { sku: 'TF-TV-50ML', name: '50ml Eau de Parfum', sizeMl: 50, concentration: 'EDP', purchaseCost: 13500, retailPrice: 21500, wholesalePrice: 16500, openingStock: 15, minStock: 4 },
        { sku: 'TF-TV-100ML', name: '100ml Eau de Parfum', sizeMl: 100, concentration: 'EDP', purchaseCost: 21500, retailPrice: 31000, wholesalePrice: 24500, openingStock: 12, minStock: 3 },
      ],
    },
    {
      name: 'Elysium Pour Homme',
      perfumeCode: 'ROJA-ELYSIUM',
      brand: brands['Roja Parfums']._id,
      fragranceName: 'Elysium Parfum Cologne',
      fragranceFamily: catDocs['Fresh / Aquatic']._id,
      gender: 'men',
      description: 'Heroic and boundless, a legendary fresh blend created for the connoisseur.',
      topNotes: 'Grapefruit, Lemon, Bergamot, Lime, Thyme, Artemisia',
      heartNotes: 'Vetiver, Juniper Berries, Blackcurrant, Apple, Pink Pepper, Rose, Lily of the Valley',
      baseNotes: 'Ambergris, Leather, Benzoin, Vanilla, Labdanum',
      variants: [
        { sku: 'ROJA-ELY-100ML', name: '100ml Parfum Cologne', sizeMl: 100, concentration: 'Parfum', purchaseCost: 19500, retailPrice: 29500, wholesalePrice: 23500, openingStock: 14, minStock: 4 },
      ],
    },
    {
      name: 'Pure Dahn Al Oud Cambodi',
      perfumeCode: 'AJM-OUDCAM',
      brand: brands['Ajmal Fragrances']._id,
      fragranceName: 'Cambodi Royal Dehn Al Oud',
      fragranceFamily: catDocs['Woody / Oud']._id,
      gender: 'unisex',
      description: 'Aged 25-year pure Cambodian Agarwood oil distilled to perfection.',
      topNotes: 'Aged Cambodian Oud, Smokiness',
      heartNotes: 'Sweet Animalic Wood, Leather',
      baseNotes: 'Dense Balsamic Resins, Amber',
      variants: [
        { sku: 'AJM-DOC-12ML', name: '1 Tola (12ml) Pure Attar', sizeMl: 12, concentration: 'Attar', purchaseCost: 16000, retailPrice: 26000, wholesalePrice: 19500, openingStock: 25, minStock: 5 },
      ],
    },
    {
      name: 'Sauvage Elixir',
      perfumeCode: 'CD-SAUV-ELX',
      brand: brands['Dior Privée']._id,
      fragranceName: 'Sauvage Elixir',
      fragranceFamily: catDocs['Aromatic Citrus']._id,
      gender: 'men',
      description: 'Extraordinarily concentrated fragrance steeped in the iconic freshness of Sauvage with an intoxicating heart of spices.',
      topNotes: 'Nutmeg, Cinnamon, Cardamom, Grapefruit',
      heartNotes: 'Lavender',
      baseNotes: 'Licorice, Sandalwood, Amber, Patchouli, Haitian Vetiver',
      variants: [
        { sku: 'CD-SE-60ML', name: '60ml Elixir Parfum', sizeMl: 60, concentration: 'Parfum', purchaseCost: 9500, retailPrice: 15500, wholesalePrice: 12000, openingStock: 2, minStock: 5 }, // triggers low stock alert!
      ],
    },
  ];

  let sampleVariant = null;

  for (const item of productsCatalog) {
    let prod = await Product.findOne({ perfumeCode: item.perfumeCode });
    if (!prod) {
      prod = await Product.create({
        name: item.name,
        perfumeCode: item.perfumeCode,
        brand: item.brand,
        fragranceName: item.fragranceName,
        fragranceFamily: item.fragranceFamily,
        gender: item.gender,
        description: item.description,
        topNotes: item.topNotes,
        heartNotes: item.heartNotes,
        baseNotes: item.baseNotes,
        supplier: supplierA._id,
        createdBy: masterAdmin._id,
      });

      for (const v of item.variants) {
        let variant = await ProductVariant.findOne({ sku: v.sku });
        if (!variant) {
          variant = await ProductVariant.create({
            product: prod._id,
            name: v.name,
            sku: v.sku,
            barcode: `8901234${Math.floor(100000 + Math.random() * 900000)}`,
            concentration: v.concentration,
            sizeMl: v.sizeMl,
            purchaseCost: v.purchaseCost,
            retailPrice: v.retailPrice,
            wholesalePrice: v.wholesalePrice,
            taxRate: 18,
            taxInclusive: true,
            minStock: v.minStock,
            currentStock: 0,
            avgCost: v.purchaseCost,
          });

          if (!sampleVariant) sampleVariant = variant;

          if (v.openingStock > 0) {
            await adjustStock({
              variantId: variant._id,
              warehouseId: warehouse._id,
              quantity: v.openingStock,
              type: 'opening',
              reason: 'Opening balance stock',
              batchNo: 'BATCH-2026-01',
              unitCost: v.purchaseCost,
              refModel: 'Product',
              refId: prod._id,
              refNumber: prod.perfumeCode,
              user: masterAdmin,
            });
          }
        }
      }
    }
  }

  // 10. Sample Coupon
  const coupon = await Coupon.findOne({ code: 'ROYAL10' });
  if (!coupon) {
    await Coupon.create({
      code: 'ROYAL10',
      name: 'Royal Fragrance 10% Off',
      discountType: 'percent',
      value: 10,
      minPurchase: 10000,
      maxDiscount: 3000,
    });
  }

  // 11. Sample completed POS Sale
  const existingSale = await ProductVariant.findOne({ sku: 'CRD-AVN-100ML' });
  if (existingSale && existingSale.currentStock > 2) {
    try {
      await processSale({
        branchId: branch._id,
        warehouseId: warehouse._id,
        customerId: vipCustomer._id,
        customerName: vipCustomer.name,
        customerPhone: vipCustomer.phone,
        priceType: 'retail',
        items: [{ variantId: existingSale._id, quantity: 1, discount: 500 }],
        payments: [{ method: 'card', amount: 31500, reference: 'TXN-HDFC-99182' }],
        notes: 'VIP customer preferred packaging with ribbon',
        user: cashierUser,
      });
      logger.info('Sample POS Sale simulated and recorded.');
    } catch (e) {
      logger.warn('Sample sale notice:', e.message);
    }
  }

  // 12. Operating Expenses
  const expCount = await Expense.countDocuments();
  if (expCount === 0) {
    const expNum = await getNextSequence('expensePrefix', 'EXP-');
    await Expense.create({
      number: expNum,
      date: new Date(),
      category: 'rent',
      amount: 45000,
      paymentMethod: 'bank',
      reference: 'NEFT-STORE-RENT-OCT',
      payee: 'MG Road Commercial Properties',
      description: 'Monthly store lease for flagship showroom',
      branch: branch._id,
      createdBy: masterAdmin._id,
    });
  }

  // 13. Employees & Payroll Seeding
  const empCount = await Employee.countDocuments();
  if (empCount === 0) {
    await Employee.create([
      {
        employeeCode: 'EMP-001',
        name: 'Zaid Al-Mansoor',
        jobTitle: 'Senior Fragrance Consultant & Sommelier',
        department: 'Retail Sales',
        phone: '+91 98200 11223',
        email: 'zaid.mansoor@suhaimsoft.com',
        branch: branch._id,
        salary: 42000,
        advanceBalance: 8000,
        status: 'active',
        joinDate: new Date('2025-01-15'),
        bankAccount: 'HDFC0001829 - 50100482910291',
        borrowHistory: [
          {
            amount: 8000,
            date: new Date('2026-10-05'),
            reason: 'Medical advance for family prescription',
            status: 'pending',
            settledAmount: 0,
            paymentMethod: 'cash',
          },
        ],
        payrollHistory: [
          {
            month: 'September 2026',
            baseSalary: 42000,
            advanceDeduction: 0,
            bonus: 2500,
            netPaid: 44500,
            paymentDate: new Date('2026-09-30'),
            paymentMethod: 'bank',
            reference: 'NEFT-SAL-SEP-001',
          },
        ],
      },
      {
        employeeCode: 'EMP-002',
        name: 'Amina Sheikh',
        jobTitle: 'Master Perfumer & Olfactory Blender',
        department: 'Atelier & Blending',
        phone: '+91 98201 33445',
        email: 'amina.sheikh@suhaimsoft.com',
        branch: branch._id,
        salary: 58000,
        advanceBalance: 0,
        status: 'active',
        joinDate: new Date('2024-06-01'),
        bankAccount: 'ICIC0000492 - 049201948201',
        borrowHistory: [],
        payrollHistory: [
          {
            month: 'September 2026',
            baseSalary: 58000,
            advanceDeduction: 0,
            bonus: 5000,
            netPaid: 63000,
            paymentDate: new Date('2026-09-30'),
            paymentMethod: 'bank',
            reference: 'NEFT-SAL-SEP-002',
          },
        ],
      },
      {
        employeeCode: 'EMP-003',
        name: 'Karan Mehra',
        jobTitle: 'Lead Showroom Cashier & Billing Specialist',
        department: 'Retail Sales',
        phone: '+91 98202 55667',
        email: 'karan.mehra@suhaimsoft.com',
        branch: branch._id,
        salary: 28000,
        advanceBalance: 3000,
        status: 'active',
        joinDate: new Date('2025-08-10'),
        bankAccount: 'SBIN0004819 - 30194820194',
        borrowHistory: [
          {
            amount: 3000,
            date: new Date('2026-10-12'),
            reason: 'Festival travel advance',
            status: 'pending',
            settledAmount: 0,
            paymentMethod: 'cash',
          },
        ],
        payrollHistory: [
          {
            month: 'September 2026',
            baseSalary: 28000,
            advanceDeduction: 0,
            bonus: 1000,
            netPaid: 29000,
            paymentDate: new Date('2026-09-30'),
            paymentMethod: 'bank',
            reference: 'NEFT-SAL-SEP-003',
          },
        ],
      },
    ]);
  }

  logger.info('Database seeded successfully with realistic perfume business records.');
}
