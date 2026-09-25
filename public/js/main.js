/* =========================================================
   Sri Mahalakshmi Pickles & Spices — storefront logic
   Edit the CONFIG block below to update contact & payment info.
   ========================================================= */

const CONFIG = {
  businessName: 'Sri Mahalakshmi Pickles & Spices',
  phones: ['8790387333', '6281245345'],
  whatsappNumber: '918790387333', // country code + number, no + or spaces
  upiId: '9492503366@ptsbi', // <-- your real UPI ID (used for every online payment method)
  phonepeQrImage: 'images/phonepe-qr.jpg', // scan-to-pay QR shown at checkout
  payeeName: 'Manne Sai Praneetha Chowdary',
};

const WEIGHTS = ['250g', '500g', '1kg', '2kg'];

function priceForWeight(price500, weight) {
  if (weight === '250g') return Math.round(price500 * 0.55);
  if (weight === '1kg') return Math.round(price500 * 1.9);
  if (weight === '2kg') return Math.round(price500 * 3.6);
  return price500;
}

function formatINR(n) {
  return '₹' + n.toLocaleString('en-IN');
}

/* ---------- icon generators (no external images needed) ---------- */
const JAR_COLORS = ['#7A1E17', '#8C2A1E', '#5C1712', '#9A3327', '#6B1F16'];
const BOWL_COLORS = ['#E0A62B', '#C9941F', '#D9A93C', '#B98A1A', '#EFC15C'];

/* Distinct illustrated fillings for specific pickles, drawn inside the jar
   window (roughly x:30-70, y:44-84) instead of the generic dot pattern. */
function fillingFor(name) {
  switch (name) {
    case 'Chicken Pickle':
      return `
        <g>
          <path d="M50 47c9 0 15 7 15 15 0 9-7 17-15 20-3-8 1-13 4-16-6 2-13-2-13-10 0-5 4-9 9-9z" fill="#C97A3D"/>
          <path d="M50 47c-9 0-15 7-15 15 0 9 7 17 15 20 3-8-1-13-4-16 6 2 13-2 13-10 0-5-4-9-9-9z" fill="#E29A56"/>
          <rect x="46" y="78" width="8" height="14" rx="3" fill="#FDF6E3"/>
          <circle cx="43" cy="90" r="3" fill="#FDF6E3"/>
          <circle cx="57" cy="90" r="3" fill="#FDF6E3"/>
        </g>`;
    case 'Mutton Pickle':
      return `
        <g>
          <path d="M34 56c4-8 14-11 22-8 9 3 13 12 10 20-2 6-8 9-14 9-3 7-10 9-15 5-6-5-6-13-3-19-3-2-4-5 0-7z" fill="#A5432F"/>
          <path d="M60 58c6 3 9 10 6 16-2 5-8 7-13 5" fill="none" stroke="#7C2E1E" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="63" cy="52" r="6" fill="#FDF6E3"/>
        </g>`;
    case 'Prawn Pickle':
      return `
        <g>
          <path d="M32 68c2-16 16-26 32-24 3 6-1 10-5 12 5 1 8 5 6 10-2 4-7 5-10 3 2 5-1 9-6 9-10 0-19-4-17-10z" fill="#E8845C"/>
          <path d="M40 56c6-4 14-6 20-4" fill="none" stroke="#C55A34" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M37 63c6-3 14-4 20-2" fill="none" stroke="#C55A34" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M60 44c3-3 8-4 11-2-2 4-6 6-9 6z" fill="#E8845C"/>
        </g>`;
    case 'Drumstick Pickle':
      return `
        <g>
          <rect x="33" y="45" width="9" height="42" rx="4.5" fill="#6FA84A" transform="rotate(-8 37 66)"/>
          <rect x="47" y="42" width="9" height="46" rx="4.5" fill="#7FB958" transform="rotate(-2 51 65)"/>
          <rect x="61" y="47" width="9" height="40" rx="4.5" fill="#6FA84A" transform="rotate(6 65 67)"/>
        </g>`;
    case 'Garlic Pickle':
      return `
        <g>
          <path d="M50 46c11 0 18 9 18 20 0 12-9 20-18 20s-18-8-18-20c0-11 7-20 18-20z" fill="#F5EFDD"/>
          <path d="M50 46v40M42 50c0 12 0 28 0 36M58 50c0 12 0 28 0 36" stroke="#D9CFA8" stroke-width="1.6"/>
          <path d="M46 46c1-5 2-8 4-10M54 46c-1-5-2-8-4-10" stroke="#D9CFA8" stroke-width="2" stroke-linecap="round" fill="none"/>
        </g>`;
    case 'Ginger Pickle':
      return `
        <g>
          <path d="M35 70c-2-8 3-15 10-16-2-5 2-10 8-9 1-6 8-9 13-5 6 4 5 12 0 16 4 3 4 9-1 12-1 6-8 9-13 6-6 4-15 2-17-4z" fill="#E4B25E"/>
          <path d="M40 58c3-2 7-2 9 0M52 52c3-1 6 0 8 2" stroke="#C4923C" stroke-width="1.6" stroke-linecap="round" fill="none"/>
        </g>`;
    case 'Green Chilli Pickle':
      return `
        <g>
          <path d="M60 46c3-4 8-6 12-5-1 4-4 7-8 8z" fill="#3E8E41"/>
          <path d="M62 49c-10 2-22 12-25 24-2 8 2 14 9 13 12-2 21-16 23-27 1-5 0-8-7-10z" fill="#57A94A"/>
          <path d="M40 68c4-6 10-10 16-12" stroke="#3E8E41" stroke-width="1.6" stroke-linecap="round" fill="none"/>
        </g>`;
    case 'Amla Pickle':
      return `
        <g>
          <circle cx="50" cy="66" r="18" fill="#B7C95A"/>
          <path d="M32 60c6-3 30-3 36 0M33 72c6 3 28 3 34 0" stroke="#93A83E" stroke-width="1.6" fill="none"/>
          <circle cx="50" cy="47" r="3" fill="#6E8A2E"/>
        </g>`;
    case 'Coriander Pickle':
      return `
        <g>
          <path d="M50 88V50" stroke="#4C7A34" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M50 52c-6-2-11-8-10-14 6 1 11 6 10 14zM50 52c6-2 11-8 10-14-6 1-11 6-10 14zM50 62c-7-1-13-6-13-12 7 0 13 5 13 12zM50 62c7-1 13-6 13-12-7 0-13 5-13 12z" fill="#5C9440"/>
        </g>`;
    case 'Cucumber Pickle':
      return `
        <g>
          <circle cx="42" cy="58" r="10" fill="#B9DE8C"/>
          <circle cx="42" cy="58" r="10" fill="none" stroke="#7FAE55" stroke-width="1.6"/>
          <circle cx="61" cy="70" r="10" fill="#B9DE8C"/>
          <circle cx="61" cy="70" r="10" fill="none" stroke="#7FAE55" stroke-width="1.6"/>
          <g fill="#6E9A48"><circle cx="39" cy="55" r="1.3"/><circle cx="45" cy="60" r="1.3"/><circle cx="43" cy="63" r="1.3"/>
            <circle cx="58" cy="67" r="1.3"/><circle cx="64" cy="72" r="1.3"/><circle cx="60" cy="74" r="1.3"/></g>
        </g>`;
    case 'Eggplant Pickle':
      return `
        <g>
          <path d="M40 56c4-8 16-8 20 0 4 8 0 22-10 26-10-4-14-18-10-26z" fill="#6E4A80"/>
          <path d="M45 52c2-4 8-4 10 0" stroke="#4C7A34" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        </g>`;
    case 'Lemon Pickle':
      return `
        <g>
          <circle cx="50" cy="66" r="17" fill="#F2C744"/>
          <path d="M50 49v34M35 66h30" stroke="#D9A824" stroke-width="1.4"/>
          <path d="M50 49c5 5 8 11 8 17s-3 12-8 17c-5-5-8-11-8-17s3-12 8-17z" fill="none" stroke="#D9A824" stroke-width="1.2"/>
        </g>`;
    case 'Onion Pickle':
      return `
        <g>
          <path d="M50 48c10 0 16 9 16 19 0 11-7 20-16 20s-16-9-16-20c0-10 6-19 16-19z" fill="#C87BAE"/>
          <path d="M50 48c5 6 8 13 8 19 0 7-3 14-8 19-5-5-8-12-8-19 0-6 3-13 8-19z" fill="#DB98C4"/>
          <path d="M50 42c-1 3-1 5 0 8M50 42c1 3 1 5 0 8" stroke="#8C5A78" stroke-width="1.6" fill="none"/>
        </g>`;
    case 'Pepper Pickle':
      return `
        <g fill="#2E2620">
          <circle cx="40" cy="56" r="3.4"/><circle cx="50" cy="52" r="3.4"/><circle cx="60" cy="57" r="3.4"/>
          <circle cx="44" cy="65" r="3.4"/><circle cx="56" cy="66" r="3.4"/><circle cx="50" cy="75" r="3.4"/>
          <circle cx="38" cy="74" r="3.4"/><circle cx="62" cy="74" r="3.4"/>
        </g>`;
    case 'Red Chilli Pickle':
      return `
        <g>
          <path d="M60 46c3-4 8-6 12-5-1 4-4 7-8 8z" fill="#8E1F1F"/>
          <path d="M62 49c-10 2-22 12-25 24-2 8 2 14 9 13 12-2 21-16 23-27 1-5 0-8-7-10z" fill="#C0392B"/>
          <path d="M40 68c4-6 10-10 16-12" stroke="#8E1F1F" stroke-width="1.6" stroke-linecap="round" fill="none"/>
        </g>`;
    case 'Sweet Mustard Pickle':
      return `
        <g fill="#B8862E">
          <circle cx="40" cy="56" r="2.8"/><circle cx="50" cy="52" r="2.8"/><circle cx="60" cy="57" r="2.8"/>
          <circle cx="44" cy="65" r="2.8"/><circle cx="56" cy="66" r="2.8"/><circle cx="50" cy="75" r="2.8"/>
          <circle cx="36" cy="66" r="2.8"/><circle cx="64" cy="66" r="2.8"/><circle cx="50" cy="60" r="2.8"/>
        </g>`;
    case 'Tamarind Pickle':
      return `
        <g>
          <path d="M34 58c8-8 24-8 32 0 4 10 0 24-16 26-16-2-20-16-16-26z" fill="#6B4226"/>
          <path d="M40 54c6 6 14 6 20 0" stroke="#8C5A34" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        </g>`;
    case 'Tomato Pickle':
      return `
        <g>
          <circle cx="50" cy="68" r="17" fill="#D9432E"/>
          <path d="M43 53c2-4 5-6 7-6s5 2 7 6" stroke="#4C7A34" stroke-width="2.4" stroke-linecap="round" fill="none"/>
          <circle cx="50" cy="52" r="3" fill="#5C9440"/>
        </g>`;
    case 'Mango Pickle':
      return `
        <g>
          <path d="M38 54c4-6 12-9 18-6 8 4 11 14 7 23-4 9-14 14-22 10-8-4-9-16-3-27z" fill="#E4A72B"/>
          <path d="M45 50c2-3 5-4 7-3" stroke="#7FA83E" stroke-width="2" stroke-linecap="round" fill="none"/>
        </g>`;
    default:
      return null;
  }
}

/* Distinct colours + a small motif for each podi/karam, drawn inside the
   bowl window instead of the generic dot pattern. */
function podiStyleFor(name) {
  switch (name) {
    case 'Karam Podi':
      return { base: '#E2703B', speckle: '#B94A24' };
    case 'Avise Ginjala Karam Podi':
      return { base: '#8A4A2E', speckle: '#5E2E1A' };
    case 'Coconut Powder':
      return { base: '#F5F0DE', speckle: '#DDD3B0' };
    case 'Kandi Podi':
      return { base: '#E6B23C', speckle: '#B98620' };
    case 'Karivepaku Podi':
      return { base: '#4C7A34', speckle: '#345620' };
    case 'Kottimira Podi':
      return { base: '#9DAE55', speckle: '#758434' };
    case 'Verusenga Podi':
      return { base: '#C68A4E', speckle: '#9A6531' };
    case 'Munaaguku Karam':
      return { base: '#3E6B2E', speckle: '#294B1E' };
    case 'Nuvvula Podi':
      return { base: '#D8CBA6', speckle: '#2E2620' };
    default:
      return { base: '#FCEFC7', speckle: '#7A1E17' };
  }
}

function iconFor(product, index) {
  if (product.category === 'podi') {
    const c = BOWL_COLORS[index % BOWL_COLORS.length];
    const style = podiStyleFor(product.name);
    return `<svg viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="50" cy="80" rx="34" ry="7" fill="#12314A" opacity=".1"/>
      <path d="M18 46h64c0 20-14 34-32 34S18 66 18 46z" fill="${c}"/>
      <ellipse cx="50" cy="46" rx="32" ry="9" fill="${style.base}"/>
      <g fill="${style.speckle}" opacity=".9">
        <circle cx="38" cy="45" r="2.2"/><circle cx="47" cy="42" r="2.2"/>
        <circle cx="56" cy="45" r="2.2"/><circle cx="63" cy="47" r="2.2"/>
        <circle cx="43" cy="48" r="2.2"/><circle cx="52" cy="49" r="2.2"/>
        <circle cx="60" cy="49" r="2.2"/><circle cx="35" cy="48" r="2.2"/>
      </g>
    </svg>`;
  }
  const c = JAR_COLORS[index % JAR_COLORS.length];
  const nonveg = product.veg === false;
  const custom = fillingFor(product.name);
  const filling = custom || `
    <g fill="#FDF6E3" opacity=".95">
      <circle cx="42" cy="58" r="2.6"/><circle cx="52" cy="66" r="2.6"/>
      <circle cx="60" cy="56" r="2.6"/><circle cx="64" cy="70" r="2.6"/>
      <circle cx="46" cy="74" r="2.6"/>
    </g>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <ellipse cx="50" cy="88" rx="30" ry="6" fill="#12314A" opacity=".1"/>
    <path d="M28 38h44v40a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10V38z" fill="${c}"/>
    <path d="M28 38h44v10H28z" fill="#0D5A8F"/>
    <rect x="22" y="30" width="56" height="8" rx="3" fill="#12314A"/>
    <rect x="38" y="16" width="24" height="15" rx="4" fill="#12314A"/>
    <rect x="41" y="12" width="18" height="6" rx="3" fill="${nonveg ? '#C0392B' : '#2E7D46'}"/>
    <clipPath id="jarclip-${product.id}"><path d="M28 38h44v40a10 10 0 0 1-10 10H38a10 10 0 0 1-10-10V38z"/></clipPath>
    <g clip-path="url(#jarclip-${product.id})">${filling}</g>
  </svg>`;
}

/* ---------- state ---------- */
let PRODUCTS = [];
// cart: { id: { weight, qty } }
let CART = JSON.parse(localStorage.getItem('smp_cart') || '{}');
let CHECKOUT_CHANNEL = null; // 'whatsapp' | 'website'
let SELECTED_PAYMENT = 'COD';
let CATEGORY_FILTER = 'all'; // 'all' | 'vegPickle' | 'nonvegPickle' | 'podi'

function saveCart() {
  localStorage.setItem('smp_cart', JSON.stringify(CART));
}

/* ---------- fetch products & render ---------- */
async function loadProducts() {
  try {
    const res = await fetch('/api/products');
    PRODUCTS = await res.json();
  } catch (err) {
    console.error('Could not load products', err);
    PRODUCTS = [];
  }
  renderGrid('pickle', 'pickleGrid');
  renderGrid('podi', 'podiGrid');
  renderCart();
}

function renderGrid(category, containerId) {
  const container = document.getElementById(containerId);
  let items = PRODUCTS.filter((p) => p.category === category);
  if (category === 'pickle' && CATEGORY_FILTER === 'vegPickle') items = items.filter((p) => p.veg !== false);
  if (category === 'pickle' && CATEGORY_FILTER === 'nonvegPickle') items = items.filter((p) => p.veg === false);
  container.innerHTML = items.map((p, i) => cardTemplate(p, i)).join('');

  items.forEach((p) => {
    const card = container.querySelector(`[data-card="${p.id}"]`);
    if (!card) return;
    const state = { weight: '250g', qty: 1 };

    const weightPills = card.querySelectorAll('.weight-pill');
    const priceEl = card.querySelector('.price');
    const qtyValueEl = card.querySelector('.qty-value');
    const addBtn = card.querySelector('.add-btn');

    function updatePrice() {
      priceEl.innerHTML = formatINR(priceForWeight(p.price500, state.weight)) +
        ` <small>/ ${state.weight}</small>`;
    }
    updatePrice();

    weightPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        weightPills.forEach((x) => x.classList.remove('active'));
        pill.classList.add('active');
        state.weight = pill.dataset.weight;
        updatePrice();
      });
    });

    card.querySelector('.qty-minus').addEventListener('click', () => {
      state.qty = Math.max(1, state.qty - 1);
      qtyValueEl.textContent = state.qty;
    });
    card.querySelector('.qty-plus').addEventListener('click', () => {
      state.qty = Math.min(20, state.qty + 1);
      qtyValueEl.textContent = state.qty;
    });

    addBtn.addEventListener('click', () => {
      addToCart(p.id, state.weight, state.qty);
      addBtn.textContent = 'Added ✓';
      addBtn.classList.add('added');
      setTimeout(() => {
        addBtn.textContent = 'Add to cart';
        addBtn.classList.remove('added');
      }, 1200);
    });
  });
}

function cardTemplate(p, i) {
  const vegClass = p.veg === false ? 'nonveg' : 'veg';
  const media = p.image
    ? `<img class="card-photo" src="/${p.image}" alt="${p.name}" loading="lazy">`
    : iconFor(p, i);
  return `
  <div class="card" data-card="${p.id}">
    <div class="card-media" style="background:${p.category === 'podi' ? '#FCEFC7' : '#E7F2DD'}">
      <span class="veg-dot ${vegClass}" title="${p.veg === false ? 'Non-vegetarian' : 'Vegetarian'}"></span>
      ${media}
    </div>
    <h3>${p.name}</h3>
    <p class="desc">${p.desc}</p>
    <div class="weight-row">
      ${WEIGHTS.map((w, idx) => `<button type="button" class="weight-pill ${idx === 0 ? 'active' : ''}" data-weight="${w}">${w}</button>`).join('')}
    </div>
    <p class="min-order-note">Minimum order: 250g</p>
    <div class="price-row">
      <span class="price"></span>
      <div class="qty-control">
        <button type="button" class="qty-btn qty-minus" aria-label="Decrease quantity">−</button>
        <span class="qty-value">1</span>
        <button type="button" class="qty-btn qty-plus" aria-label="Increase quantity">+</button>
      </div>
    </div>
    <div class="card-footer">
      <button type="button" class="add-btn">Add to cart</button>
    </div>
  </div>`;
}

/* ---------- cart logic ---------- */
function addToCart(id, weight, qty) {
  const key = id + '__' + weight;
  if (CART[key]) {
    CART[key].qty += qty;
  } else {
    CART[key] = { id, weight, qty };
  }
  saveCart();
  renderCart();
  openCart();
}

function changeCartQty(key, delta) {
  if (!CART[key]) return;
  CART[key].qty += delta;
  if (CART[key].qty <= 0) delete CART[key];
  saveCart();
  renderCart();
}

function removeFromCart(key) {
  delete CART[key];
  saveCart();
  renderCart();
}

function cartLines() {
  return Object.entries(CART).map(([key, entry]) => {
    const product = PRODUCTS.find((p) => p.id === entry.id);
    const unitPrice = product ? priceForWeight(product.price500, entry.weight) : 0;
    return {
      key,
      id: entry.id,
      name: product ? product.name : 'Item',
      weight: entry.weight,
      qty: entry.qty,
      unitPrice,
      lineTotal: unitPrice * entry.qty,
      category: product ? product.category : 'pickle',
      veg: product ? product.veg : true,
    };
  });
}

function cartCount() {
  return Object.values(CART).reduce((sum, e) => sum + e.qty, 0);
}
function cartTotal() {
  return cartLines().reduce((sum, l) => sum + l.lineTotal, 0);
}

function renderCart() {
  document.getElementById('cartCount').textContent = cartCount();
  const lines = cartLines();
  const container = document.getElementById('cartItems');

  if (lines.length === 0) {
    container.innerHTML = `<div class="cart-empty">
      <svg viewBox="0 0 100 100"><path d="M20 20h10l8 45a8 8 0 0 0 8 6h30a8 8 0 0 0 8-6l6-30H34" stroke="#2B1B12" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p>Your cart is empty.<br>Add a pickle or podi to get started.</p>
    </div>`;
  } else {
    container.innerHTML = lines.map((l, i) => {
      const idx = PRODUCTS.findIndex((p) => p.id === l.id);
      return `
      <div class="cart-item">
        <div class="mini-media" style="background:${l.category === 'podi' ? '#FCEFC7' : '#E7F2DD'}">
          ${iconFor({ category: l.category, veg: l.veg }, idx >= 0 ? idx : i)}
        </div>
        <div>
          <div class="cart-item-name">${l.name}</div>
          <div class="cart-item-meta">${l.weight}</div>
          <button class="remove-link" data-remove="${l.key}">Remove</button>
        </div>
        <div class="cart-item-right">
          <div class="cart-item-price">${formatINR(l.lineTotal)}</div>
          <div class="cart-item-qty">
            <button class="qty-btn" data-minus="${l.key}" aria-label="Decrease quantity">−</button>
            <span class="qty-value">${l.qty}</span>
            <button class="qty-btn" data-plus="${l.key}" aria-label="Increase quantity">+</button>
          </div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-minus]').forEach((btn) =>
      btn.addEventListener('click', () => changeCartQty(btn.dataset.minus, -1)));
    container.querySelectorAll('[data-plus]').forEach((btn) =>
      btn.addEventListener('click', () => changeCartQty(btn.dataset.plus, 1)));
    container.querySelectorAll('[data-remove]').forEach((btn) =>
      btn.addEventListener('click', () => removeFromCart(btn.dataset.remove)));
  }

  document.getElementById('cartTotal').textContent = formatINR(cartTotal());
  const hasItems = lines.length > 0;
  document.getElementById('whatsappOrderBtn').disabled = !hasItems;
  document.getElementById('websiteOrderBtn').disabled = !hasItems;
}

/* ---------- cart drawer open/close ---------- */
function openCart() {
  document.getElementById('cartDrawer').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
}
function closeCart() {
  document.getElementById('cartDrawer').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
}

/* ---------- checkout modal ---------- */
function openCheckout(channel) {
  if (cartLines().length === 0) return;
  CHECKOUT_CHANNEL = channel;
  SELECTED_PAYMENT = 'COD';
  renderCheckoutForm();
  document.getElementById('checkoutOverlay').classList.add('open');
}
function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('open');
}

function renderCheckoutForm() {
  const modal = document.getElementById('checkoutModal');
  const isWebsite = CHECKOUT_CHANNEL === 'website';

  modal.innerHTML = `
    <div class="modal-head">
      <h3>${isWebsite ? 'Place your order' : 'Order details for WhatsApp'}</h3>
      <button class="modal-close" id="checkoutCloseBtn" aria-label="Close">&times;</button>
    </div>
    <form id="checkoutForm">
      <div class="field">
        <label for="custName">Full name</label>
        <input type="text" id="custName" required placeholder="Your name">
      </div>
      <div class="field">
        <label for="custPhone">Phone number</label>
        <input type="tel" id="custPhone" required pattern="[0-9]{10}" maxlength="10" placeholder="10-digit mobile number">
      </div>
      <div class="field-row">
        <div class="field">
          <label for="custHouse">House / flat no.</label>
          <input type="text" id="custHouse" required placeholder="e.g. 12-34">
        </div>
        <div class="field">
          <label for="custPincode">Pincode</label>
          <input type="text" id="custPincode" required pattern="[0-9]{6}" maxlength="6" placeholder="6-digit pincode">
        </div>
      </div>
      <div class="field">
        <label for="custArea">Area / street / landmark</label>
        <input type="text" id="custArea" required placeholder="Area, street, city">
      </div>

      ${isWebsite ? `
      <div class="field">
        <label>Payment method</label>
        <div class="payment-options" id="paymentOptions">
          ${paymentOptionHTML('COD', 'Cash on delivery')}
          ${paymentOptionHTML('UPI', 'UPI (GPay / any app)')}
          ${paymentOptionHTML('Paytm', 'Paytm')}
          ${paymentOptionHTML('PhonePe', 'PhonePe')}
        </div>
        <div class="upi-note" id="paymentNote"></div>
      </div>` : `
      <div class="upi-note">You'll confirm the order and payment details directly with us on WhatsApp after sending your list.</div>`}

      <div class="field">
        <label for="custNotes">Order notes (optional)</label>
        <textarea id="custNotes" rows="2" placeholder="Less spicy, deliver after 6pm, etc."></textarea>
      </div>

      <button type="submit" class="btn ${isWebsite ? 'btn-primary' : 'btn-whatsapp'} btn-block">
        ${isWebsite ? 'Confirm order' : 'Send order on WhatsApp'}
      </button>
    </form>
  `;

  document.getElementById('checkoutCloseBtn').addEventListener('click', closeCheckout);

  if (isWebsite) {
    updatePaymentNote();
    document.querySelectorAll('#paymentOptions .payment-option').forEach((opt) => {
      opt.addEventListener('click', () => {
        SELECTED_PAYMENT = opt.dataset.value;
        document.querySelectorAll('#paymentOptions .payment-option').forEach((o) => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
        updatePaymentNote();
      });
    });
  }

  document.getElementById('checkoutForm').addEventListener('submit', handleCheckoutSubmit);
}

function paymentOptionHTML(value, label) {
  const selected = value === SELECTED_PAYMENT ? 'selected' : '';
  const checked = value === SELECTED_PAYMENT ? 'checked' : '';
  return `<label class="payment-option ${selected}" data-value="${value}">
    <input type="radio" name="payment" value="${value}" ${checked}>
    ${label}
  </label>`;
}

function updatePaymentNote() {
  const note = document.getElementById('paymentNote');
  if (!note) return;
  const qr = `<div class="qr-pay-box">
      <img src="${CONFIG.phonepeQrImage}" alt="Scan to pay QR code" class="qr-pay-img">
      <div class="qr-pay-text">
        <div>Scan &amp; pay using any UPI app</div>
        <div class="qr-pay-id">${CONFIG.upiId}</div>
        <div class="qr-pay-name">${CONFIG.payeeName}</div>
      </div>
    </div>`;
  if (SELECTED_PAYMENT === 'COD') {
    note.innerHTML = `<strong>Cash on delivery.</strong> Pay in cash when your order arrives.`;
  } else if (SELECTED_PAYMENT === 'UPI') {
    note.innerHTML = `<strong>Pay by UPI</strong> to <strong>${CONFIG.upiId}</strong>. After you confirm the order you'll get a "Pay now" button that opens your UPI app, plus the QR code below to scan.${qr}`;
  } else if (SELECTED_PAYMENT === 'Paytm') {
    note.innerHTML = `<strong>Pay via Paytm</strong> to <strong>${CONFIG.upiId}</strong>. After you confirm the order you'll get a "Pay now" button, plus the QR code below to scan.${qr}`;
  } else if (SELECTED_PAYMENT === 'PhonePe') {
    note.innerHTML = `<strong>Pay via PhonePe</strong> to <strong>${CONFIG.upiId}</strong>. After you confirm the order you'll get a "Pay now" button, plus the QR code below to scan.${qr}`;
  }
}

/* Builds a standard NPCI UPI "collect" deep link (upi://pay?...). This is
   the universal link format every UPI app (GPay, PhonePe, Paytm, BHIM, etc.)
   understands, so it's far more reliable than any single app's own custom
   scheme (e.g. Paytm's paytmmp:// links are frequently blocked by the OS or
   the app itself when opened from a browser). Tapping it on a phone with a
   UPI app installed shows the app's own "choose app to pay with" sheet (or
   opens the customer's default UPI app directly) with the amount already
   filled in — it is not a certified Payment Gateway, so there's no live
   confirmation back to this site; the order is still confirmed manually via
   the WhatsApp screenshot, same as the QR flow. */
function genericUpiLink(amount, note) {
  const params = `pa=${encodeURIComponent(CONFIG.upiId)}&pn=${encodeURIComponent(CONFIG.payeeName || CONFIG.businessName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;
  return `upi://pay?${params}`;
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const customer = {
    name: document.getElementById('custName').value.trim(),
    phone: document.getElementById('custPhone').value.trim(),
    houseNo: document.getElementById('custHouse').value.trim(),
    pincode: document.getElementById('custPincode').value.trim(),
    area: document.getElementById('custArea').value.trim(),
  };
  const notes = document.getElementById('custNotes') ? document.getElementById('custNotes').value.trim() : '';
  const lines = cartLines();

  if (CHECKOUT_CHANNEL === 'whatsapp') {
    // Save the order for the admin console too, then open WhatsApp
    await submitOrder(customer, lines, 'WhatsApp', notes, { silent: true });
    const msg = buildWhatsAppMessage(customer, lines, notes);
    window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`, '_blank');
    clearCartAndClose();
    return;
  }

  // website order
  const result = await submitOrder(customer, lines, SELECTED_PAYMENT, notes, { silent: false });
  if (result && result.ok) {
    renderSuccessScreen(result.order);
    CART = {};
    saveCart();
    renderCart();
  } else if (result) {
    showCheckoutError(result.error || 'Could not place your order. Please check your details and try again.');
  }
}

function showCheckoutError(message) {
  const form = document.getElementById('checkoutForm');
  if (!form) return;
  let errEl = document.getElementById('checkoutFormError');
  if (!errEl) {
    errEl = document.createElement('p');
    errEl.id = 'checkoutFormError';
    errEl.className = 'checkout-form-error';
    form.insertBefore(errEl, form.firstChild);
  }
  errEl.textContent = message;
}

function buildWhatsAppMessage(customer, lines, notes) {
  let msg = `Hi ${CONFIG.businessName}! I'd like to place an order:\n\n`;
  lines.forEach((l) => {
    msg += `• ${l.name} — ${l.weight} x${l.qty} = ${formatINR(l.lineTotal)}\n`;
  });
  msg += `\nTotal: ${formatINR(lines.reduce((s, l) => s + l.lineTotal, 0))}\n\n`;
  msg += `Name: ${customer.name}\nPhone: ${customer.phone}\nHouse No: ${customer.houseNo}\nArea: ${customer.area}\nPincode: ${customer.pincode}\n`;
  if (notes) msg += `Notes: ${notes}\n`;
  return msg;
}

async function submitOrder(customer, lines, paymentMethod, notes, opts) {
  const payload = {
    customer,
    items: lines.map((l) => ({ id: l.id, weight: l.weight, qty: l.qty })),
    paymentMethod,
    notes,
  };
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!opts || !opts.silent) return data;
    return data;
  } catch (err) {
    console.error('Order submit failed', err);
    if (!opts || !opts.silent) {
      alert('Could not reach the server to save your order. Please try again or order via WhatsApp.');
    }
    return null;
  }
}

function renderSuccessScreen(order) {
  const modal = document.getElementById('checkoutModal');
  const onlineMethods = { UPI: 'UPI app', Paytm: 'Paytm', PhonePe: 'PhonePe' };
  const isOnlinePayment = Object.prototype.hasOwnProperty.call(onlineMethods, order.paymentMethod);
  modal.innerHTML = `
    <div class="order-success">
      <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#4B6642"/><path d="M30 52l14 14 26-30" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h3>Order placed!</h3>
      <p>We've received your order and will confirm it shortly on call or WhatsApp.</p>
      <div class="order-id">${order.orderId}</div>
      <p style="font-size:.85rem;color:var(--ink-soft);">Payment method: <strong>${order.paymentMethod}</strong> · Total: <strong>${formatINR(order.total)}</strong></p>
      ${isOnlinePayment ? `
      <button type="button" class="btn btn-primary btn-block" id="upiPayBtn" style="margin-top:14px;">
        Pay ${formatINR(order.total)} now via ${onlineMethods[order.paymentMethod]}
      </button>
      <div class="qr-pay-box" style="margin-top:10px;">
        <img src="${CONFIG.phonepeQrImage}" alt="Scan to pay QR code" class="qr-pay-img">
        <div class="qr-pay-text">
          <div>Or scan with any UPI app</div>
          <div class="qr-pay-id">${CONFIG.upiId}</div>
          <div class="qr-pay-name">${CONFIG.payeeName}</div>
        </div>
      </div>
      <button type="button" class="btn btn-outline btn-block" id="copyUpiBtn" style="margin-top:10px;">
        📋 Copy UPI ID (${CONFIG.upiId})
      </button>
      <p class="upi-note" id="copyUpiStatus" style="margin-top:8px;">After paying, please send us a screenshot on WhatsApp so we can confirm your order.</p>
      ` : ''}
      <button class="btn btn-primary btn-block" id="successCloseBtn" style="margin-top:16px;">Done</button>
    </div>
  `;
  document.getElementById('successCloseBtn').addEventListener('click', () => {
    closeCheckout();
    closeCart();
  });

  if (isOnlinePayment) {
    document.getElementById('upiPayBtn').addEventListener('click', () => {
      const amount = order.total.toFixed(2);
      const link = genericUpiLink(amount, `Order ${order.orderId}`);
      // Standard upi://pay intent — works with GPay, PhonePe, Paytm, BHIM
      // and any other NPCI-compliant UPI app installed on the phone. On a
      // desktop browser (no UPI app to catch the link) nothing will open,
      // which is expected — the "Copy UPI ID" button and QR code above are
      // the fallback for that case.
      window.location.href = link;
    });

    document.getElementById('copyUpiBtn').addEventListener('click', async () => {
      const statusEl = document.getElementById('copyUpiStatus');
      try {
        await navigator.clipboard.writeText(CONFIG.upiId);
        statusEl.textContent = 'UPI ID copied! Paste it in your UPI app to pay, then send us a screenshot on WhatsApp.';
      } catch {
        statusEl.textContent = `Please copy manually: ${CONFIG.upiId}`;
      }
    });
  }
}

function clearCartAndClose() {
  CART = {};
  saveCart();
  renderCart();
  closeCheckout();
  closeCart();
}

/* ---------- wire up static UI ---------- */
function applyCategoryFilter(cat) {
  CATEGORY_FILTER = cat;
  const picklesSection = document.getElementById('pickles');
  const podiSection = document.getElementById('podi');
  const allBtn = document.getElementById('categoryAllBtn');

  document.querySelectorAll('.category-card[data-cat]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });

  if (cat === 'all') {
    picklesSection.hidden = false;
    podiSection.hidden = false;
    allBtn.hidden = true;
  } else if (cat === 'podi') {
    picklesSection.hidden = true;
    podiSection.hidden = false;
    allBtn.hidden = false;
  } else {
    // vegPickle / nonvegPickle
    picklesSection.hidden = false;
    podiSection.hidden = true;
    allBtn.hidden = false;
  }

  renderGrid('pickle', 'pickleGrid');
  renderGrid('podi', 'podiGrid');

  const target = cat === 'podi' ? podiSection : (cat === 'all' ? document.getElementById('pickles') : picklesSection);
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();

  document.getElementById('cartOpenBtn').addEventListener('click', openCart);
  document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  document.getElementById('checkoutOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'checkoutOverlay') closeCheckout();
  });

  document.getElementById('whatsappOrderBtn').addEventListener('click', () => openCheckout('whatsapp'));
  document.getElementById('websiteOrderBtn').addEventListener('click', () => openCheckout('website'));

  const waLink = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent('Hi ' + CONFIG.businessName + ', I would like to know more about your pickles.')}`;
  document.getElementById('whatsappFab').setAttribute('href', waLink);
  document.getElementById('footerWhatsapp').setAttribute('href', waLink);
  document.getElementById('footerWhatsapp').setAttribute('target', '_blank');

  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen);
  });
  mainNav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => mainNav.classList.remove('open')));

  document.querySelectorAll('#categoryCards .category-card').forEach((btn) => {
    btn.addEventListener('click', () => applyCategoryFilter(btn.dataset.cat));
  });
  document.querySelectorAll('a[href="#pickles"], a[href="#podi"]').forEach((a) => {
    a.addEventListener('click', () => applyCategoryFilter('all'));
  });

  loadProducts();
});
