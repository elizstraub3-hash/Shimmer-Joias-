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

// ===== MODAL CHECKOUT =====
const WA_NUMBER = '554199441433';
let _checkoutProduto = {};

const modalCheckout = document.getElementById('modal-checkout');
document.getElementById('checkout-close').addEventListener('click', () => { modalCheckout.style.display = 'none'; });
modalCheckout.addEventListener('click', (e) => { if (e.target === modalCheckout) modalCheckout.style.display = 'none'; });

document.querySelectorAll('.btn-sacola').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.produto-card');
    _checkoutProduto = {
      code: card.dataset.code || '',
      name: card.dataset.name || '',
      preco: card.dataset.preco || '',
    };
    document.getElementById('checkout-nome-produto').textContent = _checkoutProduto.name;
    document.getElementById('checkout-preco-produto').textContent = _checkoutProduto.preco;
    document.getElementById('checkout-code-produto').textContent = _checkoutProduto.code;
    document.getElementById('checkout-step1').style.display = 'flex';
    document.getElementById('checkout-info').style.display = 'none';
    document.querySelectorAll('.checkout-opcao').forEach(o => o.classList.remove('selected'));
    modalCheckout.style.display = 'flex';
  });
});

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
