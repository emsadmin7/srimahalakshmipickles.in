/* Admin console logic for Sri Mahalakshmi Pickles & Spices */

const STATUSES = ['Pending', 'Confirmed', 'Delivered'];
let ORDERS = [];
let PRODUCTS = [];
let ACTIVE_FILTER = 'All';
let ACTIVE_TAB = 'orders';
let ADMIN_PRODUCT_FILTER = 'all'; // 'all' | 'vegPickle' | 'nonvegPickle' | 'podi'
let PENDING_IMAGE_FILE = null; // File chosen but not yet uploaded, keyed by product id
let PENDING_IMAGE_PRODUCT_ID = null;
let dailyChartInstance = null;
let statusChartInstance = null;
let topProductsChartInstance = null;
const OPEN_ORDERS = new Set();
const LS_SEEN = 'smp_last_seen_order';
const LS_SOUND = 'smp_sound_on';
const BASE_TITLE = 'Admin Console — Sri Mahalakshmi Pickles & Spices';
let LAST_SEEN_TS = null;
let KNOWN_IDS = new Set();
let FIRST_LOAD_DONE = false;
let POLL_TIMER = null;
let NEW_QUEUE = [];
let DOG_TIMER = null;
let SOUND_ON = true;

function getPassword() {
  return sessionStorage.getItem('smp_admin_pw') || '';
}
function setPassword(pw) {
  sessionStorage.setItem('smp_admin_pw', pw);
}
function clearPassword() {
  sessionStorage.removeItem('smp_admin_pw');
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
  if (!res.ok) throw new Error('Could not update the order status');
  return res.json();
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

function switchTab(name) {
  ACTIVE_TAB = name;
  document.querySelectorAll('.admin-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  ['overview', 'orders', 'notifications', 'products', 'settings'].forEach((p) => {
    const el = document.getElementById(p + 'Panel');
    if (el) el.hidden = p !== name;
  });
  // A canvas that was hidden reports zero size, so redraw charts when shown.
  if (name === 'overview') renderOverview();
  if (name === 'notifications') renderNotifications();
}

function showDashboard() {
  document.getElementById('loginScreen').hidden = true;
  document.getElementById('dashboard').hidden = false;
  try { SOUND_ON = localStorage.getItem(LS_SOUND) !== '0'; } catch { SOUND_ON = true; }
  document.getElementById('soundToggle').checked = SOUND_ON;
  FIRST_LOAD_DONE = false;
  switchTab('overview');
  if (!document.getElementById('dateFrom').value) setDatePreset('30');
  refresh();
  startPolling();
}
function showLogin(message) {
  stopPolling();
  document.getElementById('loginScreen').hidden = false;
  document.getElementById('dashboard').hidden = true;
  document.getElementById('loginError').textContent = message || '';
}

function startPolling() {
  stopPolling();
  POLL_TIMER = setInterval(pollOrders, 15000); // check for new orders every 15 seconds
}
function stopPolling() {
  if (POLL_TIMER) clearInterval(POLL_TIMER);
  POLL_TIMER = null;
}

function loadLastSeen() {
  try { const v = localStorage.getItem(LS_SEEN); return v ? Number(v) : null; } catch { return null; }
}
function saveLastSeen(ts) {
  try { localStorage.setItem(LS_SEEN, String(ts)); } catch { /* ignore */ }
}
function newestOrderTs() {
  return ORDERS.reduce((m, o) => Math.max(m, new Date(o.placedAt).getTime()), 0);
}
function unreadOrders() {
  return ORDERS.filter((o) => new Date(o.placedAt).getTime() > (LAST_SEEN_TS || 0));
}

// Takes a fresh orders list, works out which orders are new since we last
// looked, refreshes every view and (optionally) announces them with the dog.
function ingestOrders(fresh) {
  const newOnes = FIRST_LOAD_DONE ? fresh.filter((o) => !KNOWN_IDS.has(o.orderId)) : [];
  ORDERS = fresh;
  fresh.forEach((o) => KNOWN_IDS.add(o.orderId));

  if (!FIRST_LOAD_DONE) {
    FIRST_LOAD_DONE = true;
    LAST_SEEN_TS = loadLastSeen();
    if (LAST_SEEN_TS === null) { // very first visit: don't flood with old orders
      LAST_SEEN_TS = newestOrderTs();
      saveLastSeen(LAST_SEEN_TS);
    }
    const missed = unreadOrders();
    if (missed.length) {
      NEW_QUEUE = missed.sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));
      showDog();
    }
  } else if (newOnes.length) {
    newOnes.sort((a, b) => new Date(a.placedAt) - new Date(b.placedAt));
    NEW_QUEUE = NEW_QUEUE.concat(newOnes);
    playDing();
    showDog();
  }
  renderAll();
}

function renderAll() {
  renderStats();
  renderOrders();
  renderNotifications();
  updateBadges();
  if (ACTIVE_TAB === 'overview') renderOverview();
}

async function pollOrders() {
  try {
    ingestOrders(await fetchOrders());
  } catch (err) {
    if (err && err.authError) {
      clearPassword();
      showLogin('Session expired, please log in again.');
    }
    // network hiccup: stay quiet and try again on the next tick
  }
}

async function refresh() {
  try {
    const fresh = await fetchOrders();
    PRODUCTS = await fetchProducts();
    ingestOrders(fresh);
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

const isConfirmedLike = (o) => o.status === 'Confirmed' || o.status === 'Delivered';

function renderStats() {
  const total = ORDERS.length;
  const pending = ORDERS.filter((o) => o.status === 'Pending').length;
  const confirmed = ORDERS.filter(isConfirmedLike);
  const totalRevenue = confirmed.reduce((s, o) => s + (o.total || 0), 0);
  const today = new Date().toDateString();
  const todayRevenue = confirmed
    .filter((o) => new Date(o.placedAt).toDateString() === today)
    .reduce((s, o) => s + (o.total || 0), 0);

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="value">${total}</div><div class="label">Total orders</div></div>
    <div class="stat-card ${pending ? 'attention' : ''}"><div class="value">${pending}</div><div class="label">Pending (need a call)</div></div>
    <div class="stat-card"><div class="value">${formatINR(todayRevenue)}</div><div class="label">Today's confirmed revenue</div></div>
    <div class="stat-card"><div class="value">${formatINR(totalRevenue)}</div><div class="label">Total confirmed revenue</div></div>
  `;
}

// ---------- notifications + animated dog ----------

function updateBadges() {
  const n = unreadOrders().length;
  ['bellBadge', 'tabBadge'].forEach((id) => {
    const el = document.getElementById(id);
    el.textContent = n > 99 ? '99+' : String(n);
    el.hidden = n === 0;
  });
  document.title = n ? `(${n}) New order! — ${BASE_TITLE}` : BASE_TITLE;
}

function renderNotifications() {
  const list = document.getElementById('notificationsList');
  if (!list) return;
  const recent = ORDERS.slice().sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt)).slice(0, 40);
  if (!recent.length) {
    list.innerHTML = '<div class="empty-state">No orders yet. New orders will appear here.</div>';
    return;
  }
  const seen = LAST_SEEN_TS || 0;
  list.innerHTML = recent.map((o) => {
    const unread = new Date(o.placedAt).getTime() > seen;
    const count = (o.items || []).reduce((s, it) => s + (it.qty || 0), 0);
    return `
      <div class="notif-item ${unread ? 'unread' : ''}" data-open-order="${o.orderId}">
        <div class="notif-icon">${unread ? '🐶' : '🛒'}</div>
        <div class="notif-body">
          <div class="notif-title">New order from ${escapeHtml(o.customer.name)}${unread ? '<span class="new-pill">NEW</span>' : ''}</div>
          <div class="notif-meta">${escapeHtml(o.customer.phone)} · ${count} item${count === 1 ? '' : 's'} · ${formatDate(o.placedAt)}</div>
        </div>
        <div class="notif-side">
          <div class="notif-total">${formatINR(o.total)}</div>
          <span class="status-badge status-${o.status}">${o.status}</span>
        </div>
      </div>`;
  }).join('');
  list.querySelectorAll('[data-open-order]').forEach((el) => {
    el.addEventListener('click', () => openOrder(el.dataset.openOrder));
  });
}

function markAllRead() {
  LAST_SEEN_TS = Math.max(newestOrderTs(), LAST_SEEN_TS || 0);
  saveLastSeen(LAST_SEEN_TS);
  hideDog();
  renderNotifications();
  updateBadges();
}

function openOrder(orderId) {
  hideDog();
  ACTIVE_FILTER = 'All';
  document.querySelectorAll('.filter-chip').forEach((c) => c.classList.toggle('active', c.dataset.filter === 'All'));
  OPEN_ORDERS.add(orderId);
  switchTab('orders');
  renderOrders();
  const card = document.querySelector(`[data-order="${orderId}"]`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function showDog() {
  const box = document.getElementById('dogAlert');
  if (!box || !NEW_QUEUE.length) return;
  const newest = NEW_QUEUE[NEW_QUEUE.length - 1];
  const more = NEW_QUEUE.length - 1;
  const count = (newest.items || []).reduce((s, it) => s + (it.qty || 0), 0);
  document.getElementById('dogText').textContent = `${newest.customer.name} · ${formatINR(newest.total)}`;
  document.getElementById('dogSub').textContent =
    `${count} item${count === 1 ? '' : 's'}${more > 0 ? ` · +${more} more new order${more === 1 ? '' : 's'}` : ''}`;
  box.dataset.orderId = newest.orderId;
  box.classList.remove('show');
  void box.offsetWidth; // restart the run-in animation
  box.classList.add('show');
  const bell = document.getElementById('bellBtn');
  bell.classList.remove('ringing'); void bell.offsetWidth; bell.classList.add('ringing');
  clearTimeout(DOG_TIMER);
  DOG_TIMER = setTimeout(hideDog, 20000);
}
function hideDog() {
  const box = document.getElementById('dogAlert');
  if (box) box.classList.remove('show');
  NEW_QUEUE = [];
  clearTimeout(DOG_TIMER);
}

function playDing() {
  if (!SOUND_ON) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    [880, 1175, 1568].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(gain); gain.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      osc.start(t); osc.stop(t + 0.42);
    });
    setTimeout(() => ctx.close && ctx.close(), 1200);
  } catch { /* sound is optional */ }
}

// ---------- dashboard: date range + analytics + charts ----------

function isoDateOnly(d) {
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

function formatDayLabel(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// Quick presets: today, yesterday, N days, this month, last month, all time.
function setDatePreset(range) {
  const now = new Date();
  let from = null;
  let to = new Date(now);
  if (range === 'today') {
    from = new Date(now);
  } else if (range === 'yesterday') {
    from = new Date(now); from.setDate(from.getDate() - 1);
    to = new Date(from);
  } else if (range === 'thisMonth') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (range === 'lastMonth') {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (range !== 'all') {
    from = new Date(now); from.setDate(from.getDate() - (Number(range) - 1));
  }
  document.getElementById('dateFrom').value = from ? isoDateOnly(from) : '';
  document.getElementById('dateTo').value = isoDateOnly(to);
  document.querySelectorAll('.date-chip').forEach((c) => c.classList.toggle('active', c.dataset.range === String(range)));
}

function rangeBounds(fromStr, toStr) {
  const toDate = toStr ? new Date(`${toStr}T23:59:59.999`) : new Date();
  let fromDate;
  if (fromStr) {
    fromDate = new Date(`${fromStr}T00:00:00`);
  } else if (ORDERS.length) {
    const earliestMs = ORDERS.reduce((min, o) => Math.min(min, new Date(o.placedAt).getTime()), Infinity);
    fromDate = new Date(earliestMs);
    fromDate.setHours(0, 0, 0, 0);
  } else {
    fromDate = new Date(toDate);
    fromDate.setHours(0, 0, 0, 0);
  }
  return { fromDate, toDate };
}

function ordersBetween(fromDate, toDate) {
  return ORDERS.filter((o) => {
    const t = new Date(o.placedAt).getTime();
    return t >= fromDate.getTime() && t <= toDate.getTime();
  });
}

function summarize(list) {
  const confirmed = list.filter(isConfirmedLike);
  const revenue = confirmed.reduce((s, o) => s + (o.total || 0), 0);
  return { orders: list.length, confirmed: confirmed.length, revenue };
}

// Builds the buckets (hourly for a single day, otherwise daily), status
// breakdown and top products for the orders inside the chosen range.
function computeAnalytics(fromStr, toStr) {
  const { fromDate, toDate } = rangeBounds(fromStr, toStr);
  const inRange = ordersBetween(fromDate, toDate);
  const sameDay = isoDateOnly(fromDate) === isoDateOnly(toDate);

  const buckets = new Map(); // key -> { label, Pending, Confirmed, Delivered, revenue }
  const blank = (label) => ({ label, Pending: 0, Confirmed: 0, Delivered: 0, revenue: 0 });
  let keyOf;

  if (sameDay) {
    for (let h = 0; h < 24; h++) buckets.set(h, blank(`${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`));
    keyOf = (o) => new Date(o.placedAt).getHours();
  } else {
    const MAX_DAYS = 90; // keep "All time" readable
    const dayStart = new Date(fromDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(toDate); dayEnd.setHours(0, 0, 0, 0);
    let dayCount = Math.round((dayEnd - dayStart) / 86400000) + 1;
    if (dayCount > MAX_DAYS) {
      dayStart.setTime(dayEnd.getTime() - (MAX_DAYS - 1) * 86400000);
      dayCount = MAX_DAYS;
    }
    const cursor = new Date(dayStart);
    for (let i = 0; i < dayCount; i++) {
      const k = isoDateOnly(cursor);
      buckets.set(k, blank(formatDayLabel(k)));
      cursor.setDate(cursor.getDate() + 1);
    }
    keyOf = (o) => isoDateOnly(new Date(o.placedAt));
  }

  const statusCounts = { Pending: 0, Confirmed: 0, Delivered: 0 };
  const productRevenue = new Map();

  inRange.forEach((o) => {
    const b = buckets.get(keyOf(o));
    if (b) {
      b[o.status] = (b[o.status] || 0) + 1;
      if (isConfirmedLike(o)) b.revenue += o.total || 0;
    }
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    if (isConfirmedLike(o)) {
      (o.items || []).forEach((it) => {
        productRevenue.set(it.name, (productRevenue.get(it.name) || 0) + (it.lineTotal || 0));
      });
    }
  });

  const rows = Array.from(buckets.values());
  const topProducts = Array.from(productRevenue.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const current = summarize(inRange);

  // Compare with the previous period of the same length (not for "All time").
  let previous = null;
  if (fromStr) {
    const span = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - span);
    previous = summarize(ordersBetween(prevFrom, prevTo));
  }

  const avgOrder = current.confirmed ? Math.round(current.revenue / current.confirmed) : 0;
  return { rows, sameDay, statusCounts, topProducts, current, previous, avgOrder, fromDate, toDate };
}

function deltaHTML(cur, prev) {
  if (prev === null || prev === undefined) return '';
  if (prev === 0 && cur === 0) return '<span class="delta flat">— same as previous period</span>';
  if (prev === 0) return '<span class="delta up">▲ new vs previous period</span>';
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return '<span class="delta flat">— same as previous period</span>';
  return `<span class="delta ${pct > 0 ? 'up' : 'down'}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs previous period</span>`;
}

function renderOverview() {
  const panel = document.getElementById('overviewPanel');
  if (!panel || typeof Chart === 'undefined') return; // Chart.js failed to load (e.g. offline) — skip charts quietly.

  const fromVal = document.getElementById('dateFrom').value;
  const toVal = document.getElementById('dateTo').value;
  const a = computeAnalytics(fromVal, toVal);
  const pendingInRange = a.statusCounts.Pending || 0;

  const fmt = (d) => d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  document.getElementById('dateRangeLabel').textContent =
    a.sameDay ? `· ${fmt(a.fromDate)}` : `· ${fmt(a.fromDate)} → ${fmt(a.toDate)}`;
  document.getElementById('dailyChartTitle').textContent =
    a.sameDay ? 'Orders by hour & confirmed revenue' : 'Orders by day & confirmed revenue';

  document.getElementById('overviewStatsRow').innerHTML = `
    <div class="stat-card"><div class="value">${a.current.orders}</div><div class="label">Orders in range</div>${deltaHTML(a.current.orders, a.previous && a.previous.orders)}</div>
    <div class="stat-card"><div class="value">${formatINR(a.current.revenue)}</div><div class="label">Confirmed revenue</div>${deltaHTML(a.current.revenue, a.previous && a.previous.revenue)}</div>
    <div class="stat-card"><div class="value">${formatINR(a.avgOrder)}</div><div class="label">Avg. confirmed order</div></div>
    <div class="stat-card ${pendingInRange ? 'attention' : ''}"><div class="value">${pendingInRange}</div><div class="label">Pending — waiting for confirmation</div></div>
  `;

  const labels = a.rows.map((r) => r.label);
  const gridColor = 'rgba(34,51,26,.08)';

  if (dailyChartInstance) dailyChartInstance.destroy();
  dailyChartInstance = new Chart(document.getElementById('dailyChart').getContext('2d'), {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Pending', data: a.rows.map((r) => r.Pending), backgroundColor: 'rgba(224,166,43,.85)', stack: 'orders', yAxisID: 'y', order: 2 },
        { type: 'bar', label: 'Confirmed', data: a.rows.map((r) => r.Confirmed), backgroundColor: 'rgba(46,125,70,.85)', stack: 'orders', yAxisID: 'y', order: 2 },
        { type: 'bar', label: 'Delivered', data: a.rows.map((r) => r.Delivered), backgroundColor: 'rgba(46,90,138,.85)', stack: 'orders', borderRadius: 4, yAxisID: 'y', order: 2 },
        {
          type: 'line', label: 'Confirmed revenue (₹)', data: a.rows.map((r) => r.revenue),
          borderColor: '#7A1E17', backgroundColor: 'rgba(122,30,23,.12)', tension: 0.35, fill: true,
          pointRadius: 3, yAxisID: 'y1', order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom' } },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: gridColor }, title: { display: true, text: 'Orders' } },
        y1: { stacked: false, beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Revenue (₹)' } },
      },
    },
  });

  if (statusChartInstance) statusChartInstance.destroy();
  const statusLabels = Object.keys(a.statusCounts);
  statusChartInstance = new Chart(document.getElementById('statusChart').getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: statusLabels,
      datasets: [{
        data: statusLabels.map((k) => a.statusCounts[k]),
        backgroundColor: ['#E0A62B', '#2E7D46', '#2E5A8A'],
        borderWidth: 0,
      }],
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } } },
  });

  if (topProductsChartInstance) topProductsChartInstance.destroy();
  topProductsChartInstance = new Chart(document.getElementById('topProductsChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: a.topProducts.length ? a.topProducts.map(([name]) => name) : ['No confirmed orders yet'],
      datasets: [{
        label: 'Revenue (₹)',
        data: a.topProducts.length ? a.topProducts.map(([, rev]) => rev) : [0],
        backgroundColor: 'rgba(224,166,43,.85)',
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, grid: { color: gridColor } }, y: { grid: { display: false } } },
    },
  });
}

function renderOrders() {
  const list = document.getElementById('ordersList');
  const filtered = ACTIVE_FILTER === 'All' ? ORDERS : ORDERS.filter((o) => o.status === ACTIVE_FILTER);

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">No orders here yet.</div>`;
    return;
  }

  list.innerHTML = filtered.map((o) => `
    <div class="order-card" data-order="${o.orderId}">
      <div class="order-top" data-toggle="${o.orderId}">
        <div>
          <div class="order-id">${o.orderId}</div>
          <div class="order-meta">${escapeHtml(o.customer.name)} · ${escapeHtml(o.customer.phone)} · ${formatDate(o.placedAt)}</div>
        </div>
        <div style="text-align:right;">
          <div class="order-total">${formatINR(o.total)}</div>
          <span class="status-badge status-${o.status}">${o.status}</span>
        </div>
      </div>
      <div class="order-details ${OPEN_ORDERS.has(o.orderId) ? 'open' : ''}" id="details-${o.orderId}">
        <div class="detail-grid">
          <div>
            <h4>Delivery address</h4>
            <p>${escapeHtml(o.customer.houseNo)}, ${escapeHtml(o.customer.area)}</p>
            <p>Pincode: ${escapeHtml(o.customer.pincode)}</p>
            <p><a href="tel:${escapeHtml(o.customer.phone)}">📞 Call ${escapeHtml(o.customer.phone)}</a></p>
          </div>
          <div>
            <h4>Order source</h4>
            <p>${escapeHtml(o.paymentMethod)}</p>
            ${o.notes ? `<h4 style="margin-top:10px;">Notes</h4><p>${escapeHtml(o.notes)}</p>` : ''}
          </div>
        </div>
        <table class="items-table">
          <thead><tr><th>Item</th><th>Weight</th><th>Qty</th><th>Amount</th></tr></thead>
          <tbody>
            ${o.items.map((it) => `<tr><td>${escapeHtml(it.name)}</td><td>${it.weight}</td><td>${it.qty}</td><td>${formatINR(it.lineTotal)}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="status-actions">
          ${STATUSES.map((st) => `<button data-status="${st}" data-order-id="${o.orderId}" class="${st === o.status ? 'current' : ''}">${st}</button>`).join('')}
        </div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-toggle]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.dataset.toggle;
      const open = document.getElementById(`details-${id}`).classList.toggle('open');
      if (open) OPEN_ORDERS.add(id); else OPEN_ORDERS.delete(id);
    });
  });
  list.querySelectorAll('[data-status]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const order = ORDERS.find((o) => o.orderId === btn.dataset.orderId);
      if (!order || order.status === btn.dataset.status) return;
      const previous = order.status;
      order.status = btn.dataset.status;
      renderAll(); // graphs, counters and revenue update immediately
      try {
        await updateStatus(order.orderId, order.status);
      } catch (err) {
        order.status = previous; // save failed — put it back
        renderAll();
        alert(err.message || 'Could not update the order status. Please try again.');
      }
    });
  });
}

function renderProducts() {
  const list = document.getElementById('productsList');
  let items = PRODUCTS;
  if (ADMIN_PRODUCT_FILTER === 'vegPickle') items = items.filter((p) => p.category === 'pickle' && p.veg !== false);
  if (ADMIN_PRODUCT_FILTER === 'nonvegPickle') items = items.filter((p) => p.category === 'pickle' && p.veg === false);
  if (ADMIN_PRODUCT_FILTER === 'podi') items = items.filter((p) => p.category === 'podi');

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state">No products in this category.</div>`;
    return;
  }

  list.innerHTML = items.map((p) => `
    <div class="product-card" data-product="${p.id}">
      <div class="product-photo" data-photo="${p.id}">
        ${p.image ? `<img src="${/^https?:/.test(p.image) ? p.image : '/' + p.image}" alt="${p.name}">` : `<span class="product-photo-placeholder">${p.category === 'podi' ? '🥣' : '🫙'}</span>`}
      </div>
      <div class="product-body">
        <div class="product-name-row">
          <strong>${p.name}</strong>
          <span class="category-chip">${p.category}</span>
          ${p.category === 'pickle' ? `<span class="veg-dot ${p.veg === false ? 'nonveg' : 'veg'}" title="${p.veg === false ? 'Non-veg' : 'Veg'}"></span>` : ''}
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
          <textarea rows="2" class="desc-input" data-desc-input="${p.id}">${p.desc || ''}</textarea>
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

  document.getElementById('bellBtn').addEventListener('click', () => switchTab('notifications'));
  document.getElementById('markAllReadBtn').addEventListener('click', markAllRead);
  document.getElementById('dogCloseBtn').addEventListener('click', hideDog);
  document.getElementById('dogViewBtn').addEventListener('click', () => {
    const id = document.getElementById('dogAlert').dataset.orderId;
    if (id) openOrder(id);
  });
  document.getElementById('soundToggle').addEventListener('change', (e) => {
    SOUND_ON = e.target.checked;
    try { localStorage.setItem(LS_SOUND, SOUND_ON ? '1' : '0'); } catch { /* ignore */ }
    if (SOUND_ON) playDing();
  });

  document.querySelectorAll('.filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      ACTIVE_FILTER = chip.dataset.filter;
      renderOrders();
    });
  });

  document.querySelectorAll('.product-filter-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.product-filter-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      ADMIN_PRODUCT_FILTER = chip.dataset.pfilter;
      renderProducts();
    });
  });

  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  document.querySelectorAll('.date-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      setDatePreset(chip.dataset.range);
      renderOverview();
    });
  });
  document.getElementById('applyDateRange').addEventListener('click', () => {
    document.querySelectorAll('.date-chip').forEach((c) => c.classList.remove('active'));
    renderOverview();
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

  /* ---------- website logo ---------- */
  const logoBox = document.getElementById('logoPreviewBox');
  const logoStatus = document.getElementById('logoStatus');
  const logoRemoveBtn = document.getElementById('logoRemoveBtn');
  function showLogo(url) {
    if (url) {
      logoBox.innerHTML = '';
      const img = document.createElement('img');
      img.src = url; img.alt = 'Website logo';
      logoBox.appendChild(img);
      logoRemoveBtn.hidden = false;
    } else {
      logoBox.innerHTML = '<span class="muted">No logo uploaded</span>';
      logoRemoveBtn.hidden = true;
    }
  }
  fetch('/api/settings').then((r) => r.json()).then((d) => showLogo(d.logoUrl)).catch(() => {});
  document.getElementById('logoUploadBtn').addEventListener('click', () => document.getElementById('logoFileInput').click());
  document.getElementById('logoFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    logoStatus.textContent = 'Uploading…'; logoStatus.className = 'save-status';
    try {
      const imageDataUrl = await fileToDataUrl(file);
      const res = await fetch('/api/admin/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': getPassword() },
        body: JSON.stringify({ imageDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      showLogo(data.logoUrl);
      logoStatus.textContent = 'Logo updated ✓'; logoStatus.className = 'save-status ok';
    } catch (err) {
      logoStatus.textContent = err.message || 'Upload failed'; logoStatus.className = 'save-status error';
    }
  });
  logoRemoveBtn.addEventListener('click', async () => {
    logoStatus.textContent = 'Removing…'; logoStatus.className = 'save-status';
    try {
      const res = await fetch('/api/admin/logo', { method: 'DELETE', headers: { 'x-admin-password': getPassword() } });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      showLogo('');
      logoStatus.textContent = 'Logo removed ✓'; logoStatus.className = 'save-status ok';
    } catch (err) {
      logoStatus.textContent = err.message; logoStatus.className = 'save-status error';
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
