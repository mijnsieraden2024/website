// ===== STATE =====
let products = [];
let cart = [];
let activeFilter = 'Alles';

const SHIPPING = {
  free_threshold: 15,
  standard: 2.95,
};

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupNav();
  setupCart();
  setupBurger();
});

// ===== LOAD PRODUCTS =====
async function loadProducts() {
  try {
    const res = await fetch('products.json');
    products = await res.json();
    buildCategories();
    renderProducts();
  } catch (e) {
    console.error('Kon producten niet laden:', e);
    document.getElementById('productGrid').innerHTML = '<p style="color:var(--warm-grey);text-align:center;grid-column:1/-1">Producten konden niet worden geladen.</p>';
  }
}

function buildCategories() {
  const types = ['Alles', ...new Set(products.map(p => p.type))];

  // Filter tabs
  const tabs = document.getElementById('filterTabs');
  tabs.innerHTML = types.map(t =>
    `<button class="filter-tab${t === 'Alles' ? ' active' : ''}" data-filter="${t}">${t}</button>`
  ).join('');
  tabs.addEventListener('click', e => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    tabs.querySelectorAll('.filter-tab').forEach(b => b.classList.toggle('active', b === btn));
    renderProducts();
  });

  // Dropdown
  const dropdown = document.getElementById('dropdownMenu');
  dropdown.innerHTML = types.map(t =>
    `<a href="#shop" class="dropdown-item" data-filter="${t}">${t === 'Alles' ? '✦ Alles' : t}</a>`
  ).join('');
  dropdown.addEventListener('click', e => {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    activeFilter = item.dataset.filter;
    tabs.querySelectorAll('.filter-tab').forEach(b =>
      b.classList.toggle('active', b.dataset.filter === activeFilter)
    );
    renderProducts();
  });
}

function renderProducts() {
  const grid = document.getElementById('productGrid');
  const filtered = activeFilter === 'Alles' ? products : products.filter(p => p.type === activeFilter);

  if (!filtered.length) {
    grid.innerHTML = '<p style="color:var(--warm-grey);text-align:center;grid-column:1/-1">Geen producten gevonden.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="product-img-wrap">
        <img src="${p.afbeelding}" alt="${p.naam}" loading="lazy"
          onerror="this.src='https://placehold.co/400x400/f5e6da/8c7b6e?text=${encodeURIComponent(p.naam)}'" />
        <span class="product-badge">${p.type}</span>
      </div>
      <div class="product-info">
        <div class="product-name">${p.naam}</div>
        <div class="product-type">${p.type}</div>
        <div class="product-footer">
          <span class="product-price">€${p.prijs.toFixed(2).replace('.', ',')}</span>
          <button class="add-btn" aria-label="Toevoegen aan mandje" onclick="addToCart(${p.id})">+</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== CART =====
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(i => i.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  updateCart();
  openCart();
  bumpCount();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  updateCart();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else updateCart();
}

function updateCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartCount').textContent = count;

  const itemsEl = document.getElementById('cartItems');
  const footerEl = document.getElementById('cartFooter');

  if (!cart.length) {
    itemsEl.innerHTML = '<p class="cart-empty">Je mandje is leeg.</p>';
    footerEl.style.display = 'none';
    return;
  }

  itemsEl.innerHTML = cart.map(i => `
    <div class="cart-item">
      <img class="cart-item-img" src="${i.afbeelding}" alt="${i.naam}"
        onerror="this.src='https://placehold.co/60x60/f5e6da/8c7b6e?text=?'" />
      <div class="cart-item-info">
        <div class="cart-item-name">${i.naam}</div>
        <div class="cart-item-type">${i.type}</div>
        <div class="cart-item-price">€${(i.prijs * i.qty).toFixed(2).replace('.', ',')}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty(${i.id}, -1)">−</button>
          <span class="qty-num">${i.qty}</span>
          <button class="qty-btn" onclick="changeQty(${i.id}, 1)">+</button>
          <button class="cart-item-remove" onclick="removeFromCart(${i.id})">✕ verwijder</button>
        </div>
      </div>
    </div>
  `).join('');

  const subtotal = cart.reduce((s, i) => s + i.prijs * i.qty, 0);
  const shipping = subtotal >= SHIPPING.free_threshold ? 0 : SHIPPING.standard;
  const total = subtotal + shipping;

  document.getElementById('cartSubtotal').textContent = `€${subtotal.toFixed(2).replace('.', ',')}`;
  document.getElementById('cartShipping').textContent = shipping === 0 ? 'Gratis 🎉' : `€${shipping.toFixed(2).replace('.', ',')}`;
  document.getElementById('cartTotal').textContent = `€${total.toFixed(2).replace('.', ',')}`;
  document.getElementById('shippingNote').textContent = shipping > 0
    ? `Nog €${(SHIPPING.free_threshold - subtotal).toFixed(2).replace('.', ',')} tot gratis verzending!`
    : 'Gratis verzending is van toepassing.';

  footerEl.style.display = 'block';
}

function openCart() {
  document.getElementById('cartSidebar').classList.add('open');
  document.getElementById('cartOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartSidebar').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function bumpCount() {
  const el = document.getElementById('cartCount');
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 300);
}

function setupCart() {
  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (!cart.length) return;
    closeCart();
    openOrderModal();
  });

  // Order form submit
  document.getElementById('orderForm').addEventListener('submit', function (e) {
    // Inject cart summary as hidden field
    const subtotal = cart.reduce((s, i) => s + i.prijs * i.qty, 0);
    const shipping = subtotal >= SHIPPING.free_threshold ? 0 : SHIPPING.standard;
    const total = subtotal + shipping;

    const lines = cart.map(i => `${i.qty}x ${i.naam} (${i.type}) = €${(i.prijs * i.qty).toFixed(2)}`).join('\n');
    const summary = `${lines}\n---\nSubtotaal: €${subtotal.toFixed(2)}\nVerzendkosten: €${shipping.toFixed(2)}\nTOTAAL: €${total.toFixed(2)}`;
    document.getElementById('orderDetailsInput').value = summary;
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeOrderModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeOrderModal();
  });
}

function openOrderModal() {
  const subtotal = cart.reduce((s, i) => s + i.prijs * i.qty, 0);
  const shipping = subtotal >= SHIPPING.free_threshold ? 0 : SHIPPING.standard;
  const total = subtotal + shipping;

  const lines = cart.map(i =>
    `<div class="sum-line"><span>${i.qty}x ${i.naam} <small style="color:var(--warm-grey)">(${i.type})</small></span><span>€${(i.prijs * i.qty).toFixed(2).replace('.', ',')}</span></div>`
  ).join('');

  document.getElementById('modalSummary').innerHTML = `
    <h4>Jouw bestelling</h4>
    ${lines}
    <div style="display:flex;justify-content:space-between;padding-top:10px;font-size:0.82rem;color:var(--warm-grey)">
      <span>Verzendkosten</span><span>${shipping === 0 ? 'Gratis' : '€' + shipping.toFixed(2).replace('.', ',')}</span>
    </div>
    <div class="sum-total"><span>Totaal</span><span>€${total.toFixed(2).replace('.', ',')}</span></div>
  `;

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeOrderModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ===== NAV SCROLL =====
function setupNav() {
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });
}

// ===== BURGER =====
function setupBurger() {
  const burger = document.getElementById('burger');
  const menu = document.getElementById('mobileMenu');
  burger.addEventListener('click', () => {
    menu.classList.toggle('open');
  });
  menu.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => menu.classList.remove('open'));
  });
}
