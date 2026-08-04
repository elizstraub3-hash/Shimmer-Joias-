(function () {
  const WPP = '554199441433';

  const modalHTML = `
<div id="produto-modal" class="pm-overlay" role="dialog" aria-modal="true">
  <div class="pm-box">
    <button class="pm-close" id="pm-close" aria-label="Fechar">×</button>
    <div class="pm-gallery">
      <div class="pm-img-main">
        <img id="pm-img" src="" alt="" />
      </div>
      <div class="pm-thumbs" id="pm-thumbs"></div>
    </div>
    <div class="pm-info">
      <div class="pm-meta">
        <span id="pm-code" class="pm-code"></span>
        <span id="pm-colecao" class="pm-colecao-tag"></span>
      </div>
      <h2 id="pm-name" class="pm-name"></h2>
      <p id="pm-material" class="pm-material"></p>
      <div class="pm-preco-wrap">
        <p id="pm-preco" class="pm-preco"></p>
        <p id="pm-parcel" class="pm-parcel"></p>
      </div>
      <div class="pm-actions">
        <button class="pm-btn-sacola" id="pm-sacola">Adicionar à Sacola</button>
        <a id="pm-wpp" href="#" target="_blank" rel="noopener" class="pm-btn-wpp">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.5 2C6.262 2 2 6.262 2 11.5c0 1.91.553 3.685 1.508 5.183L2 22l5.47-1.487A9.459 9.459 0 0011.5 21c5.238 0 9.5-4.262 9.5-9.5S16.738 2 11.5 2zm0 17.4c-1.703 0-3.285-.48-4.618-1.313l-.33-.196-3.424.931.931-3.371-.215-.347A7.872 7.872 0 013.6 11.5C3.6 7.14 7.14 3.6 11.5 3.6c4.36 0 7.9 3.54 7.9 7.9 0 4.36-3.54 7.9-7.9 7.9z"/></svg>
          Falar no WhatsApp
        </a>
      </div>
      <p class="pm-garantia">✦ Garantia vitalícia &nbsp;·&nbsp; Ouro 18k certificado &nbsp;·&nbsp; Entrega segura</p>
    </div>
  </div>
</div>`;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const overlay = document.getElementById('produto-modal');
  const closeBtn = document.getElementById('pm-close');

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  function close() {
    overlay.classList.remove('pm-open');
    document.body.style.overflow = '';
  }

  function calcParcela(preco) {
    if (!preco || preco === 'A consultar') return '';
    const num = parseFloat(preco.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());
    if (isNaN(num)) return '';
    const p = (num / 10).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `ou 10× de R$ ${p} sem juros`;
  }

  function setThumb(src) {
    const img = document.getElementById('pm-img');
    img.style.opacity = '0';
    setTimeout(() => { img.src = src; img.style.opacity = '1'; }, 150);
  }

  document.addEventListener('click', e => {
    if (e.target.closest('.btn-sacola') || e.target.closest('.pm-overlay')) return;
    const card = e.target.closest('.produto-card');
    if (!card) return;

    const code    = card.dataset.code || '';
    const name    = card.dataset.name || '';
    const preco   = card.dataset.preco || '';
    const mainImg = card.querySelector('.produto-img img')?.src || '';
    const galleryAttr = card.querySelector('[data-gallery]')?.dataset.gallery || '';
    const material = card.querySelector('.produto-material')?.textContent || '';
    const colecao  = card.querySelector('.produto-colecao')?.textContent
                  || card.querySelector('.produto-badge')?.textContent || '';

    // Build gallery: main image + any extra fotos from data-gallery (comma-separated)
    const extras = galleryAttr ? galleryAttr.split(',').map(s => s.trim()).filter(Boolean) : [];
    const gallery = [mainImg, ...extras.filter(s => s !== mainImg)];

    // Main image
    const pmImg = document.getElementById('pm-img');
    pmImg.src = mainImg;
    pmImg.alt = name;
    pmImg.style.opacity = '1';

    // Thumbnails
    const thumbsEl = document.getElementById('pm-thumbs');
    thumbsEl.innerHTML = '';
    if (gallery.length > 1) {
      gallery.forEach((src, i) => {
        const t = document.createElement('button');
        t.className = 'pm-thumb' + (i === 0 ? ' active' : '');
        t.innerHTML = `<img src="${src}" alt="${name} foto ${i+1}" />`;
        t.addEventListener('click', () => {
          thumbsEl.querySelectorAll('.pm-thumb').forEach(b => b.classList.remove('active'));
          t.classList.add('active');
          setThumb(src);
        });
        thumbsEl.appendChild(t);
      });
    }

    document.getElementById('pm-code').textContent = '#' + code;
    document.getElementById('pm-colecao').textContent = colecao;
    document.getElementById('pm-name').textContent = name;
    document.getElementById('pm-material').textContent = material;

    const precoEl = document.getElementById('pm-preco');
    precoEl.textContent = preco;
    precoEl.className = 'pm-preco' + (preco === 'A consultar' ? ' sem-avista' : '');

    document.getElementById('pm-parcel').textContent = calcParcela(preco);

    const msg = encodeURIComponent(`Olá! Tenho interesse no produto *${name}* (${code}). Poderia me passar mais informações?`);
    document.getElementById('pm-wpp').href = `https://wa.me/${WPP}?text=${msg}`;

    // Sacola
    const sacola = document.getElementById('pm-sacola');
    sacola.textContent = 'Adicionar à Sacola';
    sacola.onclick = () => {
      const cartKey = 'shimmer_cart';
      const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
      const idx = cart.findIndex(i => i.code === code);
      if (idx > -1) cart[idx].qty++;
      else cart.push({ code, name, preco, foto: mainImg, qty: 1 });
      localStorage.setItem(cartKey, JSON.stringify(cart));
      const total = cart.reduce((s, i) => s + i.qty, 0);
      const badge = document.getElementById('cart-badge');
      if (badge) { badge.textContent = total; badge.style.display = total > 0 ? 'flex' : 'none'; }
      sacola.textContent = 'Adicionado! ✓';
      setTimeout(() => { sacola.textContent = 'Adicionar à Sacola'; }, 1800);
    };

    overlay.classList.add('pm-open');
    document.body.style.overflow = 'hidden';
  });

  // Make all cards show pointer cursor
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.produto-card').forEach(c => c.style.cursor = 'pointer');
  });
})();
