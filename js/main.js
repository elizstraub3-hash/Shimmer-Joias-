// ===== HEADER SCROLL =====
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.08)';
  } else {
    header.style.boxShadow = 'none';
  }
});

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

// ===== BOTÃO SACOLA → WHATSAPP =====
const WA_NUMBER = '554199441433';
document.querySelectorAll('.btn-sacola').forEach(btn => {
  btn.addEventListener('click', () => {
    const card = btn.closest('.produto-card');
    const code = card.dataset.code || '';
    const name = card.dataset.name || '';
    const preco = card.dataset.preco || '';
    const msg = encodeURIComponent(
      `Olá! Tenho interesse no produto:\n\n🏷️ *${name}*\nCódigo: ${code}\nPreço: ${preco}\n\nGostaria de mais informações!`
    );
    window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
  });
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
