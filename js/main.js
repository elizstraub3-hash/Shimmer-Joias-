// ===== HEADER SCROLL =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.style.boxShadow = window.scrollY > 60 ? '0 2px 20px rgba(0,0,0,0.08)' : 'none';
});

// ===== MENU MOBILE =====
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobile-menu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
  });
  // Fecha ao clicar em qualquer link do menu
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
    });
  });
}

// ===== SCROLL REVEAL =====
const revealEls = document.querySelectorAll(
  '.categoria-card, .colecao-main, .colecao-card, .produto-card, .diferencial, .depoimento-card, .sobre-frame, .sobre-stats, .sobre-texto'
);
revealEls.forEach((el, i) => {
  el.classList.add('reveal');
  el.classList.add(`reveal-delay-${(i % 4) + 1}`);
});
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
revealEls.forEach(el => revealObserver.observe(el));

// ===== CONTACT FORM =====
const formContato = document.getElementById('formContato');
if (formContato) {
  formContato.addEventListener('submit', (e) => {
    e.preventDefault();
    showToast('Mensagem enviada! Entraremos em contato em breve.', 'success');
    formContato.reset();
  });
}

// ===== TOAST =====
function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.4s';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

// ===== SECRET DASHBOARD TRIGGER (10 clicks on ✦) =====
const secretTrigger = document.getElementById('secret-trigger');
const modalSenha = document.getElementById('modal-senha');
const modalClose = document.getElementById('modal-close');
const formSenha = document.getElementById('form-senha');
const inputSenha = document.getElementById('input-senha');
const senhaErro = document.getElementById('senha-erro');

// Senha padrão — altere aqui ou configure via painel
const SENHA_PAINEL = 'shimmer2026';

let clickCount = 0;
let clickTimer = null;

secretTrigger.addEventListener('click', () => {
  clickCount++;
  secretTrigger.classList.add('triggered');
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => {
    clickCount = 0;
    secretTrigger.classList.remove('triggered');
  }, 3000);

  if (clickCount >= 10) {
    clickCount = 0;
    clearTimeout(clickTimer);
    secretTrigger.classList.remove('triggered');
    openModalSenha();
  }
});

function openModalSenha() {
  modalSenha.style.display = 'flex';
  inputSenha.value = '';
  senhaErro.textContent = '';
  setTimeout(() => inputSenha.focus(), 100);
}

function closeModalSenha() {
  modalSenha.style.display = 'none';
}

modalClose.addEventListener('click', closeModalSenha);
modalSenha.addEventListener('click', (e) => {
  if (e.target === modalSenha) closeModalSenha();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModalSenha();
});

formSenha.addEventListener('submit', (e) => {
  e.preventDefault();
  const senha = inputSenha.value.trim();
  if (senha === SENHA_PAINEL) {
    closeModalSenha();
    window.open('dashboard.html', '_blank');
  } else {
    senhaErro.textContent = 'Senha incorreta. Tente novamente.';
    inputSenha.value = '';
    inputSenha.focus();
    inputSenha.style.borderColor = '#c0392b';
    setTimeout(() => { inputSenha.style.borderColor = ''; }, 2000);
  }
});

// ===== CARRINHO =====
const WA_NUMBER = '554199441433';
let shimmerCart = JSON.parse(localStorage.getItem('shimmer_cart') || '[]');

function cartParsePreco(p) {
  if (!p || p === 'A consultar') return null;
  return parseFloat(p.replace(/[R$\s.]/g, '').replace(',', '.'));
}
function cartFmt(v) {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function cartSave() { localStorage.setItem('shimmer_cart', JSON.stringify(shimmerCart)); }

function cartUpdateBadge() {
  const total = shimmerCart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? 'flex' : 'none';
  });
}

function cartOpen() {
  document.getElementById('cart-overlay')?.classList.add('open');
  document.getElementById('cart-drawer')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function cartClose() {
  document.getElementById('cart-overlay')?.classList.remove('open');
  document.getElementById('cart-drawer')?.classList.remove('open');
  document.body.style.overflow = '';
}

function cartRender() {
  const itemsEl = document.getElementById('cart-items');
  const emptyEl = document.getElementById('cart-empty');
  const footerEl = document.getElementById('cart-footer');
  const countEl = document.getElementById('cart-count-label');
  const subtotalEl = document.getElementById('cart-subtotal-value');
  if (!itemsEl) return;

  const totalItems = shimmerCart.reduce((s, i) => s + i.qty, 0);
  if (countEl) countEl.textContent = totalItems === 1 ? '1 item' : `${totalItems} itens`;

  if (shimmerCart.length === 0) {
    itemsEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    if (footerEl) footerEl.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  if (footerEl) footerEl.style.display = 'block';

  itemsEl.innerHTML = shimmerCart.map(item => `
    <div class="cart-item">
      ${item.img ? `<img src="${item.img}" alt="${item.name}" class="cart-item-img" />` : '<div class="cart-item-img"></div>'}
      <div class="cart-item-body">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-code">#${item.code}</div>
        <div class="cart-item-preco">${item.preco}</div>
        <div class="cart-item-controls">
          <button class="cart-qty-btn" onclick="cartChangeQty('${item.code}',-1)">−</button>
          <span class="cart-qty-num">${item.qty}</span>
          <button class="cart-qty-btn" onclick="cartChangeQty('${item.code}',1)">+</button>
          <button class="cart-item-remove" onclick="cartRemove('${item.code}')" title="Remover">×</button>
        </div>
      </div>
    </div>
  `).join('');

  let total = 0; let hasConsultar = false;
  shimmerCart.forEach(i => { const v = cartParsePreco(i.preco); if (v) total += v * i.qty; else hasConsultar = true; });
  if (subtotalEl) subtotalEl.textContent = total > 0 ? cartFmt(total) + (hasConsultar ? ' + consultar' : '') : 'A consultar';
}

function cartAdd(code, name, preco, img) {
  const ex = shimmerCart.find(i => i.code === code);
  if (ex) ex.qty++; else shimmerCart.push({ code, name, preco, img: img || '', qty: 1 });
  cartSave(); cartUpdateBadge(); cartRender(); cartOpen();
  showToast(`${name} adicionada à sacola!`, 'success');
}

function cartRemove(code) {
  shimmerCart = shimmerCart.filter(i => i.code !== code);
  cartSave(); cartUpdateBadge(); cartRender();
}

function cartChangeQty(code, delta) {
  const item = shimmerCart.find(i => i.code === code);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cartRemove(code); else { cartSave(); cartUpdateBadge(); cartRender(); }
}

function checkoutCart() {
  if (!shimmerCart.length) return;
  let msg = 'Olá! Quero finalizar meu pedido:\n\n';
  shimmerCart.forEach(i => { msg += `*${i.name}* (#${i.code})\nPreço: ${i.preco}${i.qty > 1 ? ` × ${i.qty}` : ''}\n\n`; });
  let total = 0; let hasC = false;
  shimmerCart.forEach(i => { const v = cartParsePreco(i.preco); if (v) total += v * i.qty; else hasC = true; });
  if (total > 0) msg += `Subtotal: ${cartFmt(total)}${hasC ? ' + itens a consultar' : ''}\n\n`;
  msg += 'Pode me informar as opções de envio para meu CEP?';
  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
}

// btn-sacola → carrinho
document.querySelectorAll('.btn-sacola').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const card = btn.closest('.produto-card');
    if (!card) return;
    const img = card.querySelector('.produto-img-foto')?.dataset.gallery?.split(',')[0] || '';
    cartAdd(card.dataset.code || '', card.dataset.name || '', card.dataset.preco || 'A consultar', img);
  });
});

// Promo button
function abrirCheckoutPromo(btn) {
  cartAdd(btn.dataset.code, btn.dataset.name, btn.dataset.preco, `images/${btn.dataset.code}.jpg`);
}

// cart UI events
document.getElementById('cart-btn')?.addEventListener('click', (e) => { e.preventDefault(); cartOpen(); });
document.getElementById('cart-close')?.addEventListener('click', cartClose);
document.getElementById('cart-overlay')?.addEventListener('click', cartClose);

cartUpdateBadge();
cartRender();

function escolherEntrega(tipo) {
  document.getElementById('checkout-step1').style.display = 'none';
  document.getElementById('checkout-info').style.display = 'flex';

  const msgEl = document.getElementById('checkout-msg-entrega');
  const waBtn = document.getElementById('checkout-wa-btn');
  let msgWA = '';

  if (tipo === 'entrega') {
    msgEl.innerHTML = `
      <strong>Entrega segura para todo o Brasil</strong>
      <p>Enviamos pelos Correios com rastreamento e embalagem especial, ou pessoalmente na região de Curitiba.</p>
      <p style="font-size:11px;color:#aaa;margin-top:6px">Frete combinado via WhatsApp.</p>`;
    msgWA = `Olá! Quero finalizar meu pedido com entrega:\n\n*${_checkoutProduto.name}*\nCódigo: ${_checkoutProduto.code}\nPreço: ${_checkoutProduto.preco}\n\nPode me informar as opções de frete?`;
  } else {
    msgEl.innerHTML = `
      <strong>Retirada em Curitiba</strong>
      <p>Combinamos dia e horário de retirada pelo WhatsApp após a confirmação do pedido.</p>`;
    msgWA = `Olá! Quero finalizar meu pedido com retirada:\n\n*${_checkoutProduto.name}*\nCódigo: ${_checkoutProduto.code}\nPreço: ${_checkoutProduto.preco}\n\nQuando posso retirar?`;
  }

  waBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msgWA)}`;
}

function voltarCheckout() {
  document.getElementById('checkout-step1').style.display = 'flex';
  document.getElementById('checkout-info').style.display = 'none';
}

// ===== CAROUSEL DEPOIMENTOS =====
const depCarousel = document.getElementById('depoimentos-carousel');
const depPrev = document.getElementById('dep-prev');
const depNext = document.getElementById('dep-next');
if (depCarousel && depPrev && depNext) {
  const cardWidth = () => {
    const c = depCarousel.querySelector('.depoimento-card');
    return c ? c.offsetWidth + 20 : 340;
  };
  depPrev.addEventListener('click', () => depCarousel.scrollBy({ left: -cardWidth(), behavior: 'smooth' }));
  depNext.addEventListener('click', () => depCarousel.scrollBy({ left: cardWidth(), behavior: 'smooth' }));
}

// ===== PARCELAMENTO NOS CARDS =====
document.querySelectorAll('.produto-card').forEach(card => {
  const preco = card.dataset.preco;
  if (!preco || preco === 'A consultar') return;
  const val = parseFloat(preco.replace(/[R$\s.]/g, '').replace(',', '.'));
  if (isNaN(val) || val <= 0) return;
  const parcela = (val / 10).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const info = card.querySelector('.produto-info');
  if (!info) return;
  const p = document.createElement('p');
  p.className = 'produto-parcela';
  p.textContent = `ou 10x sem juros de R$ ${parcela}`;
  info.appendChild(p);
  const pix = document.createElement('p');
  pix.className = 'produto-pix';
  pix.textContent = '5% de desconto no Pix';
  info.appendChild(pix);
});

// ===== SMOOTH ANCHOR SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ===== LIGHTBOX =====
(function () {
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbCounter = document.getElementById('lb-counter');
  const lbPrev = document.getElementById('lb-prev');
  const lbNext = document.getElementById('lb-next');
  if (!lb) return;

  let gallery = [];
  let current = 0;

  function openLightbox(imgs, index) {
    gallery = imgs;
    current = index;
    showFrame();
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lb.classList.remove('active');
    document.body.style.overflow = '';
  }

  function showFrame() {
    lbImg.src = gallery[current];
    lbImg.alt = '';
    if (gallery.length > 1) {
      lbCounter.textContent = `${current + 1} / ${gallery.length}`;
      lbPrev.style.display = 'flex';
      lbNext.style.display = 'flex';
    } else {
      lbCounter.textContent = '';
      lbPrev.style.display = 'none';
      lbNext.style.display = 'none';
    }
  }

  function prev() { current = (current - 1 + gallery.length) % gallery.length; showFrame(); }
  function next() { current = (current + 1) % gallery.length; showFrame(); }

  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  document.getElementById('lb-overlay').addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', prev);
  lbNext.addEventListener('click', next);
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });

  function bindCards(scope) {
    (scope || document).querySelectorAll('.produto-img-foto').forEach(imgDiv => {
      imgDiv.addEventListener('click', (e) => {
        if (e.target.closest('.produto-hover-btn')) return;
        const gallery = imgDiv.dataset.gallery
          ? imgDiv.dataset.gallery.split(',')
          : [imgDiv.querySelector('img').src];
        openLightbox(gallery, 0);
      });
    });
  }
  bindCards();
  window._bindLightboxCards = bindCards;
})();
