// Sri Mahalakshmi Pickles & Spices — backend server
// Express + MongoDB Atlas (data) + Cloudinary (product photos).
// All secrets come from environment variables (.env locally, Render dashboard online).

require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 5000;

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ADMIN_DIR = path.join(PUBLIC_DIR, 'admin');
const DATA_DIR = path.join(__dirname, '..', 'data'); // only used for one-time import of old JSON data
const CLOUDINARY_FOLDER = 'pickles';

// ---------- config checks ----------
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI environment variable. Set it in .env (local) or Render → Environment.');
  process.exit(1);
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn('WARNING: Cloudinary variables are missing — photo upload will fail.');
}

// Fallback password used only until a password is saved from the admin console Settings tab.
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mahalakshmi123';

// ---------- MongoDB models ----------
const productSchema = new mongoose.Schema({
  id: { type: Number, unique: true, required: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['pickle', 'podi'], required: true },
  veg: { type: Boolean, default: true },
  price500: { type: Number, required: true },
  desc: { type: String, default: '' },
  image: { type: String },   // Cloudinary URL
  imageId: { type: String }, // Cloudinary public_id (needed to delete)
}, { strict: false });
const Product = mongoose.model('Product', productSchema);

const orderSchema = new mongoose.Schema({
  orderId: { type: String, unique: true, required: true },
  placedAt: { type: String, required: true },
  status: { type: String, default: 'Pending' },
  customer: { type: Object, required: true },
  items: { type: Array, default: [] },
  total: { type: Number, default: 0 },
  paymentMethod: { type: String, default: 'COD' },
  notes: { type: String, default: '' },
});
const Order = mongoose.model('Order', orderSchema);

const adminSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'admin' },
  passwordHash: String,
});
const Admin = mongoose.model('Admin', adminSchema);

const HIDE = '-_id -__v';

// ---------- password hashing ----------
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
async function getStoredPasswordHash() {
  const doc = await Admin.findOne({ key: 'admin' }).lean();
  return doc && doc.passwordHash ? doc.passwordHash : null;
}
async function checkAdminPassword(supplied) {
  const stored = await getStoredPasswordHash();
  if (stored) return verifyPassword(supplied, stored);
  return String(supplied || '').trim() === DEFAULT_ADMIN_PASSWORD;
}
async function setAdminPassword(newPassword) {
  await Admin.findOneAndUpdate(
    { key: 'admin' },
    { key: 'admin', passwordHash: hashPassword(String(newPassword).trim()) },
    { upsert: true }
  );
}

// ---------- helpers ----------
function priceForWeight(price500, weight) {
  if (weight === '250g') return Math.round(price500 * 0.55);
  if (weight === '1kg') return Math.round(price500 * 1.9);
  if (weight === '2kg') return Math.round(price500 * 3.6);
  return price500;
}

// Wrap async route handlers so errors return JSON instead of crashing the server.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
  console.error(err);
  res.status(500).json({ error: 'Server error. Please try again.' });
});

const requireAdmin = wrap(async (req, res, next) => {
  const supplied = req.headers['x-admin-password'] || req.query.password;
  if (!(await checkAdminPassword(supplied))) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }
  next();
});

async function deleteCloudinaryImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.error('Cloudinary delete failed:', err.message);
  }
}

// ---------- middleware ----------
app.set('trust proxy', 1);
app.use(express.json({ limit: '12mb' })); // base64 product photos

app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});
app.use(express.static(PUBLIC_DIR));

// ---------- API ----------

// Product catalogue
app.get('/api/products', wrap(async (req, res) => {
  const products = await Product.find().select(HIDE).sort({ id: 1 }).lean();
  res.json(products);
}));

// Admin login check
app.post('/api/admin/login', wrap(async (req, res) => {
  const { password } = req.body || {};
  if (await checkAdminPassword(password)) return res.json({ ok: true });
  res.status(401).json({ ok: false, error: 'Wrong password' });
}));

// Admin: change password
app.post('/api/admin/change-password', requireAdmin, wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!(await checkAdminPassword(currentPassword))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || String(newPassword).length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters' });
  }
  await setAdminPassword(newPassword);
  res.json({ ok: true });
}));

// Create a new order (website checkout)
app.post('/api/orders', wrap(async (req, res) => {
  const { customer, items, paymentMethod, notes } = req.body || {};

  if (!customer || !customer.name || !customer.phone || !customer.houseNo ||
      !customer.area || !customer.pincode) {
    return res.status(400).json({ error: 'Missing required customer details' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const products = await Product.find().lean();
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

  const created = await Order.create({
    orderId: 'SMP' + Date.now(),
    placedAt: new Date().toISOString(),
    status: 'Pending',
    customer,
    items: lineItems,
    total,
    paymentMethod: paymentMethod || 'COD',
    notes: notes || '',
  });
  const order = created.toObject();
  delete order._id; delete order.__v;
  res.status(201).json({ ok: true, order });
}));

// Admin: list all orders (newest first)
app.get('/api/admin/orders', requireAdmin, wrap(async (req, res) => {
  const orders = await Order.find().select(HIDE).sort({ placedAt: -1 }).lean();
  res.json(orders);
}));

// Admin: update order status
app.patch('/api/admin/orders/:orderId', requireAdmin, wrap(async (req, res) => {
  const { status } = req.body || {};
  if (!['Pending', 'Confirmed', 'Delivered'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  const order = await Order.findOneAndUpdate(
    { orderId: req.params.orderId },
    { status },
    { new: true }
  ).select(HIDE).lean();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ ok: true, order });
}));

// Admin: update a product
app.patch('/api/admin/products/:id', requireAdmin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { name, price500, desc, category, veg } = req.body || {};
  const update = {};

  if (name !== undefined && String(name).trim()) update.name = String(name).trim();
  if (desc !== undefined) update.desc = String(desc);
  if (category !== undefined && ['pickle', 'podi'].includes(category)) update.category = category;
  if (veg !== undefined) update.veg = Boolean(veg);
  if (price500 !== undefined) {
    const n = Number(price500);
    if (!Number.isFinite(n) || n <= 0) {
      return res.status(400).json({ error: 'price500 must be a positive number' });
    }
    update.price500 = Math.round(n);
  }

  const product = await Product.findOneAndUpdate({ id }, update, { new: true }).select(HIDE).lean();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ ok: true, product });
}));

// Admin: add a new product
app.post('/api/admin/products', requireAdmin, wrap(async (req, res) => {
  const { name, category, veg, price500, desc } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
  if (!['pickle', 'podi'].includes(category)) return res.status(400).json({ error: 'category must be "pickle" or "podi"' });
  const price = Number(price500);
  if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'price500 must be a positive number' });

  const last = await Product.findOne().sort({ id: -1 }).lean();
  const newId = last ? last.id + 1 : 1;
  const created = await Product.create({
    id: newId,
    name: String(name).trim(),
    category,
    veg: veg === undefined ? true : Boolean(veg),
    price500: Math.round(price),
    desc: desc ? String(desc) : '',
  });
  const product = created.toObject();
  delete product._id; delete product.__v;
  res.status(201).json({ ok: true, product });
}));

// Admin: delete a product (and its Cloudinary photo)
app.delete('/api/admin/products/:id', requireAdmin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const product = await Product.findOneAndDelete({ id }).lean();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  await deleteCloudinaryImage(product.imageId);
  res.json({ ok: true });
}));

// Admin: upload/replace a product photo -> Cloudinary
// Body: { imageDataUrl: "data:image/jpeg;base64,...." }
app.post('/api/admin/products/:id/image', requireAdmin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const { imageDataUrl } = req.body || {};
  const existing = await Product.findOne({ id }).lean();
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const match = /^data:(image\/(png|jpe?g|webp));base64,(.+)$/.exec(imageDataUrl || '');
  if (!match) {
    return res.status(400).json({ error: 'imageDataUrl must be a base64 PNG, JPEG or WEBP image' });
  }
  if (Buffer.byteLength(match[3], 'base64') > 8 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image too large (max 8MB)' });
  }

  let result;
  try {
    result = await cloudinary.uploader.upload(imageDataUrl, {
      folder: CLOUDINARY_FOLDER,
      public_id: `product-${id}`,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    });
  } catch (err) {
    console.error('Cloudinary upload failed:', err.message);
    return res.status(502).json({ error: 'Image upload to Cloudinary failed. Check Cloudinary settings.' });
  }

  const product = await Product.findOneAndUpdate(
    { id },
    { image: result.secure_url, imageId: result.public_id },
    { new: true }
  ).select(HIDE).lean();
  res.json({ ok: true, product });
}));

// Admin: remove a product photo
app.delete('/api/admin/products/:id/image', requireAdmin, wrap(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await Product.findOne({ id }).lean();
  if (!existing) return res.status(404).json({ error: 'Product not found' });
  await deleteCloudinaryImage(existing.imageId);
  const product = await Product.findOneAndUpdate(
    { id },
    { $unset: { image: '', imageId: '' } },
    { new: true }
  ).select(HIDE).lean();
  res.json({ ok: true, product });
}));

// ---------- 404 handling ----------
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((req, res) => res.status(404).send('404 — page not found'));

// ---------- one-time import of old data (only runs when the collection is empty) ----------
function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf-8').trim();
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Could not read', file, err.message);
    return null;
  }
}

async function seedProducts() {
  if ((await Product.countDocuments()) > 0) return;
  const list = readJSON(path.join(DATA_DIR, 'products.json'));
  if (!Array.isArray(list) || !list.length) {
    console.log('No products in database and no data/products.json to import — add products from the admin console.');
    return;
  }
  console.log(`Importing ${list.length} products from data/products.json into MongoDB...`);
  for (const p of list) {
    let image, imageId;
    // If the old product had a local photo, upload it to Cloudinary once.
    if (p.image && !/^https?:/.test(p.image)) {
      const localFile = path.join(PUBLIC_DIR, p.image.split('?')[0]);
      if (fs.existsSync(localFile)) {
        try {
          const r = await cloudinary.uploader.upload(localFile, {
            folder: CLOUDINARY_FOLDER, public_id: `product-${p.id}`, overwrite: true,
          });
          image = r.secure_url; imageId = r.public_id;
        } catch (err) {
          console.error(`Photo upload failed for product ${p.id}:`, err.message);
        }
      }
    } else if (p.image) {
      image = p.image;
    }
    await Product.create({
      id: p.id, name: p.name, category: p.category, veg: p.veg !== false,
      price500: p.price500, desc: p.desc || '', image, imageId,
    });
  }
  console.log('Product import done.');
}

async function seedOrders() {
  if ((await Order.countDocuments()) > 0) return;
  const list = readJSON(path.join(DATA_DIR, 'orders.json'));
  if (!Array.isArray(list) || !list.length) return;
  console.log(`Importing ${list.length} old orders into MongoDB...`);
  await Order.insertMany(list, { ordered: false }).catch((e) => console.error('Order import issue:', e.message));
}

// ---------- start ----------
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await seedProducts();
    await seedOrders();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Admin console: /admin/`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
