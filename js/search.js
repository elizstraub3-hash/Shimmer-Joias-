(function () {
  'use strict';

  const SEARCH_PRODUTOS = [
    { code: 'SH-1001', name: 'Anel Solitário', material: 'Pedra central 6mm · 12 laterais 1,25mm · Moissanites', preco: 'R$ 2.260,00', foto: 'images/SH-1001.jpg', categoria: 'aneis' },
    { code: 'SH-1005', name: 'Anel Esmeralda', material: 'Esmeraldas sintéticas · 14 pedras 1,25mm · Central 4mm', preco: 'R$ 1.550,00', foto: 'images/SH-1005.jpg', categoria: 'aneis' },
    { code: 'SH-1006', name: 'Anel Topo Redondo', material: '14 moissanites 1,25mm · Central 5,5mm', preco: 'R$ 1.999,00', foto: 'images/SH-1006.jpg', categoria: 'aneis' },
    { code: 'SH-1007', name: 'Par de Alianças', material: 'Feminina 5,5mm · 3 moissanites 1,25mm · Masculina 3mm', preco: 'R$ 5.700,00', foto: 'images/SH-1007.jpg', categoria: 'casamento' },
    { code: 'SH-1009', name: 'Aparador com Brilhantes', material: 'Meia aliança · Ouro 18k · Moissanites cravejadas', preco: 'R$ 1.526,00', foto: 'images/SH-1009.jpg', categoria: 'casamento' },
    { code: 'SH-1010', name: 'Par de Alianças Clássico', material: 'Ouro amarelo 18k polido · Design atemporal', preco: 'R$ 6.300,00', foto: 'images/SH-1010.jpg', categoria: 'casamento' },
    { code: 'SH-1011', name: 'Anel Maçom', material: 'Anel maçom · Ouro 18k', preco: 'R$ 13.600,00', foto: 'images/SH-1011.jpg', categoria: 'aneis-masculinos' },
    { code: 'SH-1012', name: 'Aparador Marquise', material: '5 navetes 2x5mm · 8 pedras 1,25mm · Moissanites', preco: 'R$ 3.400,00', foto: 'images/SH-1012.jpg', categoria: 'aparadores' },
    { code: 'SH-1013', name: 'Aparador Esmeralda', material: 'Esmeraldas e moissanites · Ouro 18k', preco: 'A consultar', foto: 'images/SH-1013.jpg', categoria: 'aparadores' },
    { code: 'SH-1014', name: 'Anel Solitário Clássico', material: 'Solitário · Pedra central 5mm · Moissanite', preco: 'R$ 999,00', foto: 'images/SH-1014.jpg', categoria: 'solitarios' },
    { code: 'SH-1015', name: 'Par de Alianças Lisas', material: 'Ouro amarelo 18k polido · Design clássico', preco: 'R$ 2.200,00', foto: 'images/SH-1015.jpg', categoria: 'casamento' },
    { code: 'SH-1016', name: 'Colar Grumet Masculino', material: 'Ouro 18k · Elo grumet', preco: 'R$ 64.800,00', foto: 'images/SH-1016.jpg', categoria: 'correntes' },
    { code: 'SH-1017', name: 'Pulseira Grumet', material: 'Ouro 18k · Elo grumet · Fecho caixa', preco: 'R$ 27.000,00', foto: 'images/SH-1017a.jpg', categoria: 'pulseiras-masculinas' },
    { code: 'SH-1018', name: 'Anel Solitário 7 Pedras', material: '14 moissanites 1,25mm · Central 4mm', preco: 'R$ 1.550,00', foto: 'images/SH-1018.jpg', categoria: 'aneis' },
    { code: 'SH-1019', name: 'Anel de Formatura', material: 'Formatura · 7 pedras 2mm · Pedra central personalizada por curso', preco: 'R$ 2.630,00', foto: 'images/SH-1019.jpg', categoria: 'aneis-formatura' },
    { code: 'SH-1020', name: 'Corrente Elo Cadeado Grossa', material: 'Ouro 18k', preco: 'R$ 23.400,00', foto: 'images/SH-1020.jpg', categoria: 'correntes' },
    { code: 'SH-1021', name: 'Corrente com Pingente Cruz', material: 'Ouro 18k', preco: 'R$ 12.000,00', foto: 'images/SH-1021.jpg', categoria: 'correntes' },
    { code: 'SH-1022', name: 'Corrente Elo Cadeado Fina', material: 'Ouro 18k', preco: 'R$ 9.000,00', foto: 'images/SH-1022.jpg', categoria: 'correntes' },
    { code: 'SH-1023', name: 'Corrente Elo Cartier', material: 'Ouro 18k', preco: 'A consultar', foto: 'images/SH-1023.jpg', categoria: 'correntes' },
    { code: 'SH-1024', name: 'Pingente Gota Esmeralda', material: 'Ouro 18k', preco: 'A consultar', foto: 'images/SH-1024.jpg', categoria: 'pingentes' },
    { code: 'SH-1025', name: 'Anel Solitário Delicado', material: 'Solitário · Pedra central 3mm · Moissanite', preco: 'R$ 999,00', foto: 'images/SH-1025.jpg', categoria: 'solitarios' },
    { code: 'SH-1026', name: 'Anel com Topázio Azul', material: 'Solitário · Zircônia azul 5mm', preco: 'R$ 999,00', foto: 'images/SH-1026.jpg', categoria: 'solitarios' },
    { code: 'SH-1027', name: 'Anel Solitário com Laterais', material: 'Pedra central 5mm · 2 laterais 1,25mm · Moissanites', preco: 'R$ 2.100,00', foto: 'images/SH-1027.jpg', categoria: 'aneis' },
    { code: 'SH-1028', name: 'Anel com Safira Azul', material: '14 pedras 1,25mm · Central 4mm · Safira sintética', preco: 'R$ 1.550,00', foto: 'images/SH-1028.jpg', categoria: 'aneis' },
    { code: 'SH-1029', name: 'Anel Chuveiro', material: 'Chuveiro · Ouro 18k · Diamantes', preco: 'R$ 3.390,00', foto: 'images/SH-1029.jpg', categoria: 'aneis' },
    { code: 'SH-1030', name: 'Aparador Meia Aliança', material: '8 pedras 2,50mm · Moissanite', preco: 'R$ 2.200,00', foto: 'images/SH-1030.jpg', categoria: 'aparadores' },
    { code: 'SH-1031', name: 'Anel Duplo com Rubi', material: 'Ruby natural 6x4mm · Ouro 18k', preco: 'R$ 1.500,00', foto: 'images/SH-1031.jpg', categoria: 'aneis' },
    { code: 'SH-1032', name: 'Anel com Aquamarine', material: 'Turmalina Paraíba natural 5mm · 14 moissanites 1,25mm', preco: 'R$ 3.600,00', foto: 'images/SH-1032.jpg', categoria: 'aneis' },
    { code: 'SH-1033', name: 'Aliança Trabalhada', material: 'Ouro 18k', preco: 'R$ 1.300,00', foto: 'images/SH-1033.jpg', categoria: 'casamento' },
    { code: 'SH-1034', name: 'Aparador Coração', material: 'Aparador formato coração · Ouro 18k', preco: 'R$ 1.400,00', foto: 'images/SH-1034.jpg', categoria: 'aparadores' },
    { code: 'SH-1035', name: 'Par de Alianças Largas Texturizadas', material: 'Ouro 18k', preco: 'R$ 7.000,00', foto: 'images/SH-1035.jpg', categoria: 'casamento' },
    { code: 'SH-1036', name: 'Conjunto Noivado (Solitário + Aliança)', material: 'Ouro 18k', preco: 'R$ 3.380,00', foto: 'images/SH-1036.jpg', categoria: 'casamento' },
    { code: 'SH-1037', name: 'Par de Alianças com Pedras', material: 'Ouro 18k', preco: 'R$ 19.480,00', foto: 'images/SH-1037.jpg', categoria: 'casamento' },
    { code: 'SH-1038', name: 'Pulseira Personalizada com Letras', material: 'Ouro 18k', preco: 'R$ 1.650,00', foto: 'images/SH-1038.jpg', categoria: 'pulseiras-femininas' },
    { code: 'SH-1039', name: 'Anel Solitário Oval', material: 'Pedra oval 5x7mm · Moissanite', preco: 'R$ 1.400,00', foto: 'images/SH-1039.jpg', categoria: 'solitarios' },
    { code: 'SH-1040', name: 'Par de Alianças Lisas', material: 'Ouro 18k', preco: 'A consultar', foto: 'images/SH-1040.jpg', categoria: 'casamento' },
    { code: 'SH-1041', name: 'Colar Pingente Coração', material: 'Ouro 18k', preco: 'R$ 3.000,00', foto: 'images/SH-1041.jpg', categoria: 'correntes-femininas' },
    { code: 'SH-1042', name: 'Colar Pingente Solitário', material: 'Ouro 18k', preco: 'R$ 2.000,00', foto: 'images/SH-1042.jpg', categoria: 'correntes-femininas' },
    { code: 'SH-1043', name: 'Colar Pingente Rosa com Halo', material: 'Ouro 18k', preco: 'R$ 2.859,00', foto: 'images/SH-1043.jpg', categoria: 'correntes-femininas' },
    { code: 'SH-1044', name: 'Anel com Topázio Azul e Laterais', material: 'Topázio sintético 6x8mm · 6 moissanites 2mm nas laterais', preco: 'R$ 2.550,00', foto: 'images/SH-1044.jpg', categoria: 'aneis' },
    { code: 'SH-1045', name: 'Anel Sinete Personalizado', material: 'Anel personalizado · Ouro 18k', preco: 'R$ 5.100,00', foto: 'images/SH-1045.jpg', categoria: 'aneis-masculinos' },
    { code: 'SH-1046', name: 'Anel São Bento', material: 'Ouro 18k', preco: 'R$ 15.300,00', foto: 'images/SH-1046.jpg', categoria: 'aneis-masculinos' },
    { code: 'SH-1047', name: 'Anel de Formatura', material: 'Formatura · Pedra central 6mm', preco: 'R$ 3.650,00', foto: 'images/SH-1047.jpg', categoria: 'aneis-formatura' },
    { code: 'SH-1048', name: 'Anel Oval com Laterais', material: 'Pedra oval 5x7mm · 2 laterais 1,25mm · Moissanite', preco: 'A consultar', foto: 'images/SH-1048.jpg', categoria: 'aneis' },
    { code: 'SH-1049', name: 'Pingente Nossa Senhora Aparecida', material: 'Ouro 18k', preco: 'R$ 3.950,00', foto: 'images/SH-1049.jpg', categoria: 'correntes-femininas' },
    { code: 'SH-1050', name: 'Anel de Formatura', material: 'Formatura · Pedra central 3mm · 6 laterais 1,75mm', preco: 'R$ 2.550,00', foto: 'images/SH-1050.jpg', categoria: 'aneis-formatura' },
    { code: 'SH-1051', name: 'Par de Alianças Modernas', material: 'Ouro 18k', preco: 'A consultar', foto: 'images/SH-1051.jpg', categoria: 'casamento' },
    { code: 'SH-1052', name: 'Par de Alianças Trabalhadas com Pedras', material: 'Ouro 18k', preco: 'R$ 7.560,00', foto: 'images/SH-1052.jpg', categoria: 'casamento' },
    { code: 'SH-1053', name: 'Brinco Pérola', material: 'Ouro 18k', preco: 'R$ 1.500,00', foto: 'images/SH-1053.jpg', categoria: 'brincos' },
    { code: 'SH-1054', name: 'Corrente de Homenagem Personalizada', material: 'Ouro 18k', preco: 'A consultar', foto: 'images/SH-1054.jpg', categoria: 'homenagem' },
    { code: 'SH-1055', name: 'Anel Exclusivo Cravejado', material: 'Anel personalizado · 10g · Todo cravejado com diamantes · Ouro 18k', preco: 'R$ 15.000,00', foto: 'images/SH-1055.jpg', categoria: 'aneis-exclusivos' },
    { code: 'SH-1056', name: 'Pulseira Exclusiva com Iniciais', material: 'Bracelete personalizado com iniciais · Ouro 18k', preco: 'A consultar', foto: 'images/SH-1056.jpg', categoria: 'pulseiras-femininas' },
  ];

  function getProdutos() {
    try {
      const stored = localStorage.getItem('shimmer_produtos');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return SEARCH_PRODUTOS;
  }

  function openSearch(e) {
    if (e) e.preventDefault();
    const overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(function () {
      var input = document.getElementById('search-input');
      if (input) input.focus();
    }, 60);
  }

  function closeSearch() {
    var overlay = document.getElementById('search-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    var input = document.getElementById('search-input');
    if (input) input.value = '';
    var results = document.getElementById('search-results');
    if (results) results.innerHTML = '';
  }

  function onInput() {
    var q = (document.getElementById('search-input').value || '').trim().toLowerCase();
    var results = document.getElementById('search-results');
    if (!results) return;
    if (!q || q.length < 1) { results.innerHTML = ''; return; }

    var produtos = getProdutos();
    var found = produtos.filter(function (p) {
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.material && p.material.toLowerCase().includes(q))
      );
    }).slice(0, 9);

    if (found.length === 0) {
      results.innerHTML = '<p class="search-empty">Nenhum produto encontrado para "' + q + '".</p>';
      return;
    }

    results.innerHTML = found.map(function (p) {
      var imgHtml = p.foto
        ? '<img src="' + p.foto + '" alt="' + p.name + '" loading="lazy" />'
        : '';
      return (
        '<a href="categoria.html?cat=' + p.categoria + '" class="search-result-item" onclick="document.getElementById(\'search-overlay\').classList.remove(\'active\');document.body.style.overflow=\'\';">' +
          '<div class="search-result-img">' + imgHtml + '</div>' +
          '<div class="search-result-info">' +
            '<span class="search-result-code">#' + p.code + '</span>' +
            '<span class="search-result-name">' + p.name + '</span>' +
            '<span class="search-result-preco">' + p.preco + '</span>' +
          '</div>' +
          '<svg class="search-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</a>'
      );
    }).join('');
  }

  function injectOverlay() {
    if (document.getElementById('search-overlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.className = 'search-overlay';
    overlay.innerHTML =
      '<div class="search-box">' +
        '<div class="search-input-wrap">' +
          '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
          '<input type="text" id="search-input" placeholder="Buscar por nome ou código — ex: SH-1014, Solitário..." autocomplete="off" />' +
          '<button id="search-close" aria-label="Fechar busca">✕</button>' +
        '</div>' +
        '<div id="search-results" class="search-results"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSearch();
    });
    document.getElementById('search-close').addEventListener('click', closeSearch);
    document.getElementById('search-input').addEventListener('input', onInput);
    document.getElementById('search-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = document.querySelector('.search-result-item');
        if (first) first.click();
      }
    });
  }

  function injectSearchBtn() {
    var navRight = document.querySelector('.nav-right');
    if (!navRight || document.querySelector('.search-trigger')) return;
    var btn = document.createElement('a');
    btn.href = '#';
    btn.className = 'nav-icon search-trigger';
    btn.setAttribute('aria-label', 'Buscar produto');
    btn.title = 'Buscar';
    btn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
        '<circle cx="11" cy="11" r="8"/>' +
        '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
      '</svg>';
    btn.addEventListener('click', openSearch);

    var cartBtn = navRight.querySelector('#cart-btn');
    if (cartBtn) {
      navRight.insertBefore(btn, cartBtn);
    } else {
      navRight.insertBefore(btn, navRight.firstChild);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectSearchBtn();
    injectOverlay();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSearch();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });
})();
