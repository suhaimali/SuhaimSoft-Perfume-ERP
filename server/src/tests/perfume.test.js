import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../scripts/seed.js';

describe('SuhaimSoft Perfume ERP API Integration Tests', () => {
  let adminToken = '';
  let cashierToken = '';
  let testVariantId = '';
  let testWarehouseId = '';

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await seedDatabase();

    // Login as Master Admin
    const adminRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@suhaimsoft.com',
      password: 'Admin@12345',
    });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.data.tokens.access;

    // Login as Cashier
    const cashierRes = await request(app).post('/api/v1/auth/login').send({
      email: 'cashier@suhaimsoft.com',
      password: 'Cashier@12345',
    });
    expect(cashierRes.status).toBe(200);
    cashierToken = cashierRes.body.data.tokens.access;
  }, 40000);

  afterAll(async () => {
    await disconnectDB();
  });

  it('1. GET /api/v1/dashboard returns database-backed metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overview.totalProducts).toBeGreaterThan(0);
    expect(res.body.data.overview.totalStockQty).toBeGreaterThan(0);
  });

  it('2. GET /api/v1/products returns seeded fragrances with variants', async () => {
    const res = await request(app)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    const prod = res.body.data.items[0];
    expect(prod.variants.length).toBeGreaterThan(0);
    testVariantId = prod.variants[0]._id;
  });

  it('3. GET /api/v1/warehouses returns default warehouse', async () => {
    const res = await request(app)
      .get('/api/v1/warehouses')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.warehouses.length).toBeGreaterThan(0);
    testWarehouseId = res.body.data.warehouses[0]._id;
  });

  it('4. POST /api/v1/sales/pos processes sale and deducts inventory', async () => {
    // Check initial stock
    const initialVariant = await request(app)
      .get('/api/v1/products/search?q=BR540-70ML')
      .set('Authorization', `Bearer ${adminToken}`);
    const v = initialVariant.body.data.variants[0];
    const initialQty = v.currentStock;

    // Process POS sale
    const saleRes = await request(app)
      .post('/api/v1/sales/pos')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        warehouseId: testWarehouseId,
        items: [{ variantId: v._id, quantity: 2 }],
        payments: [{ method: 'cash', amount: v.retailPrice * 2 }],
      });

    expect(saleRes.status).toBe(201);
    expect(saleRes.body.data.sale.invoiceNo).toMatch(/^INV-/);
    expect(saleRes.body.data.sale.paymentStatus).toBe('paid');

    // Verify stock was reduced by 2
    const afterVariant = await request(app)
      .get('/api/v1/products/search?q=BR540-70ML')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterVariant.body.data.variants[0].currentStock).toBe(initialQty - 2);
  });

  it('5. POST /api/v1/sales/pos rejects sales exceeding available stock', async () => {
    const res = await request(app)
      .post('/api/v1/sales/pos')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        warehouseId: testWarehouseId,
        items: [{ variantId: testVariantId, quantity: 99999 }], // massive qty
        payments: [{ method: 'cash', amount: 9999999 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('6. Cashier cannot access Master Admin settings', async () => {
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ currency: 'USD' });

    expect(res.status).toBe(403);
  });

  it('7. GET /api/v1/reports/profit-loss calculates gross & net profit correctly', async () => {
    const res = await request(app)
      .get('/api/v1/reports/profit-loss')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('revenue');
    expect(res.body.data).toHaveProperty('grossProfit');
    expect(res.body.data).toHaveProperty('totalOperatingExpenses');
    expect(res.body.data).toHaveProperty('netProfit');
  });
});
