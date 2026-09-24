/* Admin console logic for Sri Mahalakshmi Pickles & Spices */

const STATUSES = ['Pending', 'Confirmed', 'Delivered'];
let ORDERS = [];
let PRODUCTS = [];
let ACTIVE_FILTER = 'All';
let ACTIVE_TAB = 'orders';
let PENDING_IMAGE_FILE = null; // File chosen but not yet uploaded, keyed by product id
let PENDING_IMAGE_PRODUCT_ID = null;

function getPassword() {
  return sessionStorage.getItem('smp_admin_pw') || '';
}
function setPassword(pw) {
  sessionStorage.setItem('smp_admin_pw', pw);
}
function clearPassword() {
  sessionStorage.removeItem('smp_admin_pw');
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function formatINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function priceForWeight(price500, weight) {
  if (weight === '250g') return Math.round(price500 * 0.55);
  if (weight === '1kg') return Math.round(price500 * 1.9);
  if (weight === '2kg') return Math.round(price500 * 3.6);
  return price500;
}

async function login(password) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  // A host that isn't actually running the Node server (e.g. plain static
  // hosting) will often answer every unknown route with a 200 HTML page.
  // Guard against treating that as a successful login.
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error("The site didn't return a valid login response — the Node/Express backend may not be running on this host.");
  }
  const data = await res.json().catch(() => ({}));
  return res.ok && data && data.ok === true;
}

async function fetchOrders() {
  const res = await fetch('/api/admin/orders', {
    headers: { 'x-admin-password': getPassword() },
  });
  if (res.status === 401) {
    const err = new Error('Unauthorized');
    err.authError = true;
    throw err;
  }
  if (!res.ok) throw new Error(`Server error (${res.status}). Is the site's Node server running?`);
  try {
    return await res.json();
  } catch {
    throw new Error("Unexpected response from server — this usually means the backend (Node/Express) isn't running on this host.");
  }
}

async function fetchProducts() {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}

async function updateStatus(orderId, status) {
  const res = await fetch(`/api/admin/orders/${orderId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': getPassword() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update status');
}

async function updateProductPrice(id, price500) {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': getPassword() },
    body: JSON.stringify({ price500 }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to save price');
  return res.json();
}

async function uploadProductImage(id, imageDataUrl) {
  const res = await fetch(`/api/admin/products/${id}/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': getPassword() },
    body: JSON.stringify({ imageDataUrl }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to upload image');
  return res.json();
}

async function updateProductDesc(id, desc) {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': getPassword() },
    body: JSON.stringify({ desc }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to save description');
  return res.json();
}

async function addProduct(data) {
  const res = await fetch('/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': getPassword() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to add product');
  return res.json();
}

async function deleteProduct(id) {
  const res = await fetch(`/api/admin/products/${id}`, {
    method: 'DELETE',
    headers: { 'x-admin-password': getPassword() },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete product');
  return res.json();
}

async function changePassword(currentPassword, newPassword) {
  const res = await fetch('/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-password': getPassword() },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to change password');
  return res.json();
}

async function removeProductImage(id) {
  const res = await fetch(`/api/admin/products/${id}/image`, {
    method: 'DELETE',
    headers: { 'x-admin-password': getPassword() },
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to remove image');
  return res.json();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showDashboard() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('dashboard').hidden = false;
  // Always land on the Orders tab after login.
  ACTIVE_TAB = 'orders';
  document.querySelectorAll('.admin-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === 'orders'));
  document.getElementById('ordersPanel').hidden = false;
  document.getElementById('productsPanel').hidden = true;
  document.getElementById('settingsPanel').hidden = true;
  refresh();
}
function showLogin(message) {
  document.getElementById('loginScreen').hidden = false;
  document.getElementById('dashboard').hidden = true;
  document.getElementById('loginError').textContent = message || '';
}

async function refresh() {
  try {
    ORDERS = await fetchOrders();
    PRODUCTS = await fetchProducts();
    renderStats();
    renderOrders();
    renderProducts();
  } catch (err) {
    if (err && err.authError) {
      // Only a real 401 from the server should log the admin out.
      clearPassword();
      showLogin('Session expired, please log in again.');
    } else {
      // Keep the saved password (it may still be correct) and surface the
      // real problem instead of silently bouncing back to a blank login form.
      showLogin(err.message || 'Could not load admin data. Please try again.');
    }
  }
}

function renderStats() {
  const total = ORDERS.length;
  const pending = ORDERS.filter((o) => o.status === 'Pending').length;
  const totalRevenue = ORDERS.reduce((s, o) => s + (o.total || 0), 0);
  const today = new Date().toDateString();
  const todayRevenue = ORDERS
    .filter((o) => new Date(o.placedAt).toDateString() === today)
    .reduce((s, o) => s + (o.total || 0), 0);

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="value">${total}</div><div class="label">Total orders</div></div>
    <div class="stat-card"><div class="value">${pending}</div><div class="label">Pending orders</div></div>
    <div class="stat-card"><div class="value">${formatINR(todayRevenue)}</div><div class="label">Today's revenue</div></div>
    <div class="stat-card"><div class="value">${formatINR(totalRevenue)}</div><div class="label">Total revenue</div></div>
  `;
}

function renderOrders() {
  const list = document.getElementById('ordersList');
  const filtered = ACTIVE_FILTER === 'All' ? ORDERS : ORDERS.filter((o) => o.status === ACTIVE_FILTER);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">No orders here yet.</div>`;
    return;
  }

  list.innerHTML = filtered.map((o) => {
    const c = o.customer || {};
    const online = o.paymentMethod && !['COD', 'WhatsApp'].includes(o.paymentMethod);
    const payBlock = online
      ? (o.txnRef
          ? `<p>${esc(o.paymentMethod)} <span class="pay-badge paid">Paid</span></p>
             <p style="margin-top:6px;">Txn ref: <span class="pay-ref">${esc(o.txnRef)}</span></p>
             ${o.duplicateTxn ? '<p class="pay-warn">⚠ This reference number was already used on another order.</p>' : ''}`
          : `<p>${esc(o.paymentMethod)}</p><p class="pay-warn">No transaction reference given.</p>`)
      : `<p>${esc(o.paymentMethod)} ${o.paymentMethod === 'COD' ? '<span class="pay-badge cod">Collect on delivery</span>' : ''}</p>`;
    return `
    <div class="order-card" data-order="${esc(o.orderId)}">
      <div class="order-top" data-toggle="${esc(o.orderId)}">
        <div>
          <div class="order-id">${esc(o.orderId)}</div>
          <div class="order-meta">${esc(c.name)} · ${esc(c.phone)} · ${esc(formatDate(o.placedAt))}</div>
        </div>
        <div style="text-align:right;">
          <div class="order-total">${formatINR(o.total)}</div>
          <span class="status-badge status-${esc(o.status)}">${esc(o.status)}</span>
        </div>
      </div>
      <div class="order-details" id="details-${esc(o.orderId)}">
        <div class="detail-grid">
          <div>
            <h4>Delivery address</h4>
            <p>${esc(c.houseNo)}, ${esc(c.area)}</p>
            <p>Pincode: ${esc(c.pincode)}</p>
          </div>
          <div>
            <h4>Payment</h4>
            ${payBlock}
            ${o.notes ? `<h4 style="margin-top:10px;">Notes</h4><p>${esc(o.notes)}</p>` : ''}
          </div>
        </div>
        <table class="items-table">
          <thead><tr><th>Item</th><th>Weight</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>
            ${(o.items || []).map((it) => `<tr><td>${esc(it.name)}</td><td>${esc(it.weight)}</td><td>${esc(it.qty)}</td><td>${formatINR(it.lineTotal)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="status-actions">
          ${STATUSES.map((s) => `<button data-status="${s}" data-order-id="${esc(o.orderId)}" class="${s === o.status ? 'current' : ''}">${s}</button>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-toggle]').forEach((el) => {
    el.addEventListener('click', () => {
      document.getElementById(`details-${el.dataset.toggle}`).classList.toggle('open');
    });
  });
  list.querySelectorAll('[data-status]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await updateStatus(btn.dataset.orderId, btn.dataset.status);
      } catch (err) {
        alert(err.message);
      }
      refresh();
    });
  });
}

function renderProducts() {
  const list = document.getElementById('productsList');
  if (PRODUCTS.length === 0) {
    list.innerHTML = `<div class="empty-state">No products found.</div>`;
    return;
  }

  list.innerHTML = PRODUCTS.map((p) => `
    <div class="product-card" data-product="${p.id}">
      <div class="product-photo" data-photo="${p.id}">
        ${p.image ? `<img src="/${esc(p.image)}" alt="${esc(p.name)}">` : `<span class="product-photo-placeholder">${p.category === 'podi' ? '🥣' : '🫙'}</span>`}
      </div>
      <div class="product-body">
        <div class="product-name-row">
          <strong>${esc(p.name)}</strong>
          <span class="category-chip">${esc(p.category)}</span>
        </div>
        <div class="product-photo-actions">
          <button type="button" class="btn btn-outline btn-sm" data-choose-photo="${p.id}">Upload photo</button>
          ${p.image ? `<button type="button" class="btn btn-outline btn-sm" data-remove-photo="${p.id}">Remove</button>` : ''}
        </div>
        <div class="product-price-row">
          <label>Price / 500g</label>
          <div class="price-input-wrap">
            <span>₹</span>
            <input type="number" min="1" step="1" class="price-input" data-price-input="${p.id}" value="${p.price500}">
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-save-price="${p.id}">Save</button>
        </div>
        <div class="derived-prices" id="derived-${p.id}">
          250g: ${formatINR(priceForWeight(p.price500, '250g'))} · 1kg: ${formatINR(priceForWeight(p.price500, '1kg'))} · 2kg: ${formatINR(priceForWeight(p.price500, '2kg'))}
        </div>
        <label class="desc-label">Description
          <textarea rows="2" class="desc-input" data-desc-input="${p.id}">${esc(p.desc || '')}</textarea>
        </label>
        <div class="product-footer-actions">
          <button type="button" class="btn btn-outline btn-sm" data-save-desc="${p.id}">Save description</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete-product="${p.id}">Delete product</button>
        </div>
        <div class="save-status" id="status-${p.id}"></div>
      </div>
    </div>
  `).join('');

  // Live-update the derived weight prices as the admin types.
  list.querySelectorAll('[data-price-input]').forEach((input) => {
    input.addEventListener('input', () => {
      const id = input.dataset.priceInput;
      const val = Number(input.value) || 0;
      document.getElementById(`derived-${id}`).textContent =
        `250g: ${formatINR(priceForWeight(val, '250g'))} · 1kg: ${formatINR(priceForWeight(val, '1kg'))} · 2kg: ${formatINR(priceForWeight(val, '2kg'))}`;
    });
  });

  list.querySelectorAll('[data-save-price]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.savePrice);
      const input = list.querySelector(`[data-price-input="${id}"]`);
      const statusEl = document.getElementById(`status-${id}`);
      const price500 = Number(input.value);
      if (!price500 || price500 <= 0) {
        statusEl.textContent = 'Enter a valid price.';
        statusEl.className = 'save-status error';
        return;
      }
      btn.disabled = true;
      statusEl.textContent = 'Saving…';
      statusEl.className = 'save-status';
      try {
        await updateProductPrice(id, price500);
        statusEl.textContent = 'Saved ✓';
        statusEl.className = 'save-status ok';
        const p = PRODUCTS.find((x) => x.id === id);
        if (p) p.price500 = price500;
      } catch (err) {
        statusEl.textContent = err.message || 'Failed to save.';
        statusEl.className = 'save-status error';
      } finally {
        btn.disabled = false;
      }
    });
  });

  list.querySelectorAll('[data-save-desc]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.saveDesc);
      const textarea = list.querySelector(`[data-desc-input="${id}"]`);
      const statusEl = document.getElementById(`status-${id}`);
      btn.disabled = true;
      statusEl.textContent = 'Saving…';
      statusEl.className = 'save-status';
      try {
        await updateProductDesc(id, textarea.value);
        statusEl.textContent = 'Saved ✓';
        statusEl.className = 'save-status ok';
        const p = PRODUCTS.find((x) => x.id === id);
        if (p) p.desc = textarea.value;
      } catch (err) {
        statusEl.textContent = err.message || 'Failed to save description.';
        statusEl.className = 'save-status error';
      } finally {
        btn.disabled = false;
      }
    });
  });

  list.querySelectorAll('[data-delete-product]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.deleteProduct);
      const p = PRODUCTS.find((x) => x.id === id);
      if (!confirm(`Delete "${p ? p.name : 'this product'}"? This cannot be undone.`)) return;
      const statusEl = document.getElementById(`status-${id}`);
      statusEl.textContent = 'Deleting…';
      statusEl.className = 'save-status';
      try {
        await deleteProduct(id);
        PRODUCTS = PRODUCTS.filter((x) => x.id !== id);
        renderProducts();
      } catch (err) {
        statusEl.textContent = err.message || 'Failed to delete product.';
        statusEl.className = 'save-status error';
      }
    });
  });

  list.querySelectorAll('[data-choose-photo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      PENDING_IMAGE_PRODUCT_ID = Number(btn.dataset.choosePhoto);
      document.getElementById('imageFileInput').click();
    });
  });

  list.querySelectorAll('[data-remove-photo]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.removePhoto);
      const statusEl = document.getElementById(`status-${id}`);
      statusEl.textContent = 'Removing photo…';
      statusEl.className = 'save-status';
      try {
        const { product } = await removeProductImage(id);
        const p = PRODUCTS.find((x) => x.id === id);
        if (p) delete p.image;
        renderProducts();
      } catch (err) {
        statusEl.textContent = err.message || 'Failed to remove photo.';
        statusEl.className = 'save-status error';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pw = document.getElementById('adminPassword').value;
    document.getElementById('loginError').textContent = '';
    try {
      const ok = await login(pw);
      if (ok) {
        setPassword(pw);
        showDashboard();
      } else {
        document.getElementById('loginError').textContent = 'Incorrect password. Try again.';
      }
    } catch (err) {
      document.getElementById('loginError').textContent = err.message || 'Login failed. Please try again.';
    }
  });

  document.getElementById('refreshBtn').addEventListener('click', refresh);
  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearPassword();
    showLogin();
  });

  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      ACTIVE_FILTER = chip.dataset.filter;
      renderOrders();
    });
  });

  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      ACTIVE_TAB = tab.dataset.tab;
      document.getElementById('ordersPanel').hidden = ACTIVE_TAB !== 'orders';
      document.getElementById('productsPanel').hidden = ACTIVE_TAB !== 'products';
      document.getElementById('settingsPanel').hidden = ACTIVE_TAB !== 'settings';
    });
  });

  document.getElementById('addProductBtn').addEventListener('click', () => {
    document.getElementById('addProductForm').hidden = false;
    document.getElementById('addProductBtn').hidden = true;
  });
  document.getElementById('cancelAddProduct').addEventListener('click', () => {
    document.getElementById('addProductForm').hidden = true;
    document.getElementById('addProductBtn').hidden = false;
    document.getElementById('addProductStatus').textContent = '';
  });
  document.getElementById('saveAddProduct').addEventListener('click', async () => {
    const name = document.getElementById('newProdName').value.trim();
    const category = document.getElementById('newProdCategory').value;
    const veg = document.getElementById('newProdVeg').value === 'true';
    const price500 = Number(document.getElementById('newProdPrice').value);
    const desc = document.getElementById('newProdDesc').value.trim();
    const statusEl = document.getElementById('addProductStatus');

    if (!name) { statusEl.textContent = 'Name is required.'; statusEl.className = 'save-status error'; return; }
    if (!price500 || price500 <= 0) { statusEl.textContent = 'Enter a valid price.'; statusEl.className = 'save-status error'; return; }

    statusEl.textContent = 'Adding…';
    statusEl.className = 'save-status';
    try {
      await addProduct({ name, category, veg, price500, desc });
      statusEl.textContent = 'Added ✓';
      statusEl.className = 'save-status ok';
      document.getElementById('newProdName').value = '';
      document.getElementById('newProdPrice').value = '';
      document.getElementById('newProdDesc').value = '';
      PRODUCTS = await fetchProducts();
      renderProducts();
      document.getElementById('addProductForm').hidden = true;
      document.getElementById('addProductBtn').hidden = false;
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to add product.';
      statusEl.className = 'save-status error';
    }
  });

  document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const statusEl = document.getElementById('passwordStatus');

    if (newPassword !== confirmPassword) {
      statusEl.textContent = 'New passwords do not match.';
      statusEl.className = 'save-status error';
      return;
    }
    statusEl.textContent = 'Updating…';
    statusEl.className = 'save-status';
    try {
      await changePassword(currentPassword, newPassword);
      setPassword(newPassword);
      statusEl.textContent = 'Password updated ✓';
      statusEl.className = 'save-status ok';
      e.target.reset();
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to update password.';
      statusEl.className = 'save-status error';
    }
  });

  document.getElementById('imageFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || PENDING_IMAGE_PRODUCT_ID == null) return;
    const id = PENDING_IMAGE_PRODUCT_ID;
    const statusEl = document.getElementById(`status-${id}`);
    if (file.size > 8 * 1024 * 1024) {
      statusEl.textContent = 'Image too large (max 8MB).';
      statusEl.className = 'save-status error';
      return;
    }
    statusEl.textContent = 'Uploading photo…';
    statusEl.className = 'save-status';
    try {
      const dataUrl = await fileToDataUrl(file);
      const { product } = await uploadProductImage(id, dataUrl);
      const p = PRODUCTS.find((x) => x.id === id);
      if (p) p.image = product.image;
      renderProducts();
      document.getElementById(`status-${id}`).textContent = 'Photo saved ✓';
      document.getElementById(`status-${id}`).className = 'save-status ok';
    } catch (err) {
      statusEl.textContent = err.message || 'Failed to upload photo.';
      statusEl.className = 'save-status error';
    }
  });

  if (getPassword()) {
    showDashboard();
  }
});