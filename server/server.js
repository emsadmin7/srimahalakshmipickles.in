// Sri Mahalakshmi Pickles & Spices — backend server
// Simple Express server: serves the website, stores orders in a JSON file,
// and powers a small admin console to view incoming orders.

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, '..', 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');

// Fallback password if no password has ever been set in the admin console.
// Once the admin changes the password via Settings, it's stored (hashed) in
// data/admin.json and this fallback is no longer used.
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mahalakshmi123';

// ---------- password hashing (no extra dependencies needed) ----------
function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(String(password || '').trim(), salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
  } catch {
    return false;
  }
}
function getStoredPasswordHash() {
  const stored = readJSON(ADMIN_FILE, null);
  if (stored && stored.passwordHash) return stored.passwordHash;
  return null;
}
function checkAdminPassword(supplied) {
  const stored = getStoredPasswordHash();
  if (stored) return verifyPassword(supplied, stored);
  // No custom password set yet — fall back to the default/env password.
  return String(supplied || '').trim() === DEFAULT_ADMIN_PASSWORD;
}
function setAdminPassword(newPassword) {
  writeJSON(ADMIN_FILE, { passwordHash: hashPassword(String(newPassword).trim()) });
}

// ---------- helpers ----------

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf-8').trim();
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read', file, err.message);
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function priceForWeight(price500, weight) {
  // weight: '250g' | '500g' | '1kg' | '2kg'
  if (weight === '250g') return Math.round(price500 * 0.55);
  if (weight === '1kg') return Math.round(price500 * 1.9);
  if (weight === '2kg') return Math.round(price500 * 3.6);
  return price500;
}

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

function requireAdmin(req, res, next) {
  const supplied = req.headers['x-admin-password'] || req.query.password;
  if (!checkAdminPassword(supplied)) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  next();
}

if (!fs.existsSync(ORDERS_FILE)) writeJSON(ORDERS_FILE, []);
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

// ---------- middleware ----------
app.use(express.json({ limit: '12mb' })); // raised so base64 product photos fit
app.use(express.static(path.join(__dirname, '..', 'public')));

// ---------- API ----------

// Product catalogue
app.get('/api/products', (req, res) => {
  const products = readJSON(PRODUCTS_FILE, []);
  res.json(products);
});

// Admin login check
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (checkAdminPassword(password)) return res.json({ ok: true });
  res.status(401).json({ ok: false, error: 'Wrong password' });
});

// Admin: change the admin password (must supply the current password)
app.post('/api/admin/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!checkAdminPassword(currentPassword)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || String(newPassword).length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }
  setAdminPassword(newPassword);
  res.json({ ok: true });
});

// Create a new order (from the website checkout flow)
app.post('/api/orders', (req, res) => {
  const { customer, items, paymentMethod, notes, txnRef } = req.body || {};

  if (!customer || !customer.name || !customer.phone || !customer.houseNo ||
      !customer.area || !customer.pincode) {
    return res.status(400).json({ error: 'Missing required customer details' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const products = readJSON(PRODUCTS_FILE, []);
  let total = 0;
  let invalidItem = false;
  const lineItems = items.map((it) => {
    const product = products.find((p) => p.id === it.id);
    if (!product) invalidItem = true;
    const qty = Number(it.qty);
    const validQty = Number.isFinite(qty) && qty > 0 ? Math.round(qty) : 0;
    if (!validQty) invalidItem = true;
    const unitPrice = product ? priceForWeight(product.price500, it.weight) : 0;
    const lineTotal = unitPrice * validQty;
    total += lineTotal;
    return {
      id: it.id,
      name: product ? product.name : 'Unknown item',
      weight: it.weight,
      qty: validQty,
      unitPrice,
      lineTotal,
    };
  });

  if (invalidItem) {
    return res.status(400).json({ error: 'One or more items in your cart are no longer available. Please refresh the page and try again.' });
  }

  const orders = readJSON(ORDERS_FILE, []);

  // Online payments (UPI / Paytm / PhonePe): the customer pays first, then
  // enters the transaction reference (UTR) number as proof of payment.
  const method = paymentMethod || 'COD';
  const isOnline = ['UPI', 'Paytm', 'PhonePe'].includes(method);
  let cleanRef = '';
  let duplicateTxn = false;
  if (isOnline) {
    cleanRef = String(txnRef || '').trim().replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9]{8,30}$/.test(cleanRef)) {
      return res.status(400).json({ error: 'Please enter a valid transaction reference number (8-30 letters/digits) from your payment app.' });
    }
    duplicateTxn = orders.some((o) => o.txnRef && o.txnRef === cleanRef);
  }

  const order = {
    orderId: 'SMP' + Date.now(),
    placedAt: new Date().toISOString(),
    status: 'Pending',
    customer,
    items: lineItems,
    total,
    paymentMethod: method,
    txnRef: cleanRef,
    duplicateTxn,
    notes: notes || '',
  };
  orders.unshift(order);
  writeJSON(ORDERS_FILE, orders);

  res.status(201).json({ ok: true, order });
});

// Admin: list all orders
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  res.json(orders);
});

// Admin: update order status
app.patch('/api/admin/orders/:orderId', requireAdmin, (req, res) => {
  const { status } = req.body || {};
  if (!['Pending', 'Confirmed', 'Delivered'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const orders = readJSON(ORDERS_FILE, []);
  const idx = orders.findIndex((o) => o.orderId === req.params.orderId);
  if (idx === -1) return res.status(404).json({ error: 'Order not found' });
  orders[idx].status = status;
  writeJSON(ORDERS_FILE, orders);
  res.json({ ok: true, order: orders[idx] });
});

// Admin: update a product's name/price/description/category/veg
app.patch('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name, price500, desc, category, veg } = req.body || {};
  const products = readJSON(PRODUCTS_FILE, []);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  if (name !== undefined && String(name).trim()) products[idx].name = String(name).trim();
  if (desc !== undefined) products[idx].desc = String(desc);
  if (category !== undefined && ['pickle', 'podi'].includes(category)) products[idx].category = category;
  if (veg !== undefined) products[idx].veg = Boolean(veg);
  if (price500 !== undefined) {
    const n = Number(price500);
    if (!Number.isFinite(n) || n <= 0) {
      return res.status(400).json({ error: 'price500 must be a positive number' });
    }
    products[idx].price500 = Math.round(n);
  }

  writeJSON(PRODUCTS_FILE, products);
  res.json({ ok: true, product: products[idx] });
});

// Admin: add a brand-new product
app.post('/api/admin/products', requireAdmin, (req, res) => {
  const { name, category, veg, price500, desc } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  if (!['pickle', 'podi'].includes(category)) return res.status(400).json({ error: 'category must be "pickle" or "podi"' });
  const price = Number(price500);
  if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'price500 must be a positive number' });

  const products = readJSON(PRODUCTS_FILE, []);
  const newId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;
  const product = {
    id: newId,
    name: String(name).trim(),
    category,
    veg: veg === undefined ? true : Boolean(veg),
    price500: Math.round(price),
    desc: desc ? String(desc) : '',
  };
  products.push(product);
  writeJSON(PRODUCTS_FILE, products);
  res.status(201).json({ ok: true, product });
});

// Admin: delete a product (and its photo, if any)
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const products = readJSON(PRODUCTS_FILE, []);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  ['png', 'jpg', 'jpeg', 'webp'].forEach((e) => {
    const old = path.join(IMAGES_DIR, `product-${id}.${e}`);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  });

  products.splice(idx, 1);
  writeJSON(PRODUCTS_FILE, products);
  res.json({ ok: true });
});

// Admin: upload/replace a product's photo.
// Body: { imageDataUrl: "data:image/jpeg;base64,...." }
app.post('/api/admin/products/:id/image', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { imageDataUrl } = req.body || {};
  const products = readJSON(PRODUCTS_FILE, []);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  const match = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/.exec(imageDataUrl || '');
  if (!match) {
    return res.status(400).json({ error: 'imageDataUrl must be a base64 PNG, JPEG or WEBP image' });
  }
  const mime = match[1];
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const buffer = Buffer.from(match[3], 'base64');
  if (buffer.length > 8 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image too large (max 8MB)' });
  }

  // Remove any previous image file for this product (any extension) before saving the new one.
  ['png', 'jpg', 'jpeg', 'webp'].forEach((e) => {
    const old = path.join(IMAGES_DIR, `product-${id}.${e}`);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  });

  const filename = `product-${id}.${ext}`;
  fs.writeFileSync(path.join(IMAGES_DIR, filename), buffer);

  products[idx].image = `images/${filename}?v=${Date.now()}`;
  writeJSON(PRODUCTS_FILE, products);
  res.json({ ok: true, product: products[idx] });
});

// Admin: remove a product's photo (falls back to the illustrated icon)
app.delete('/api/admin/products/:id/image', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const products = readJSON(PRODUCTS_FILE, []);
  const idx = products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  ['png', 'jpg', 'jpeg', 'webp'].forEach((e) => {
    const old = path.join(IMAGES_DIR, `product-${id}.${e}`);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  });
  delete products[idx].image;
  writeJSON(PRODUCTS_FILE, products);
  res.json({ ok: true, product: products[idx] });
});

app.listen(PORT, () => {
  console.log(`Sri Mahalakshmi Pickles & Spices server running at http://localhost:${PORT}`);
  console.log(`Admin console:  http://localhost:${PORT}/admin/`);
  if (getStoredPasswordHash()) {
    console.log('Admin password: a custom password is set (changed via the admin console Settings tab).');
  } else {
    console.log(`Admin password: ${DEFAULT_ADMIN_PASSWORD} (change via ADMIN_PASSWORD env var, or set a new one from the admin console once logged in)`);
  }
});