(function () {
  'use strict';

  var SEARCH_PRODUTOS = (window.SHIMMER_PRODUTOS || []);

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
        '<a href="categoria.html?cat=' + (p.categoria || '').split(',')[0].trim() + '" class="search-result-item" onclick="document.getElementById(\'search-overlay\').classList.remove(\'active\');document.body.style.overflow=\'\';">' +
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

  // Allow other UI (footer bar, etc.) to open the site-wide search
  window.shimmerOpenSearch = openSearch;

  function wireFooterSearch() {
    document.querySelectorAll('.footer-search[data-search-trigger]').forEach(function (el) {
      if (el.dataset.wired) return;
      el.dataset.wired = '1';
      el.addEventListener('click', openSearch);
      var inp = el.querySelector('input');
      if (inp) inp.addEventListener('focus', openSearch);
    });
  }

  function isHomePage() {
    var p = location.pathname.split('/').pop();
    return p === '' || p === 'index.html';
  }

  document.addEventListener('DOMContentLoaded', function () {
    // Lupa no cabeçalho apenas na home; nas demais páginas há a busca da
    // categoria (na própria página) e a busca no rodapé.
    if (isHomePage()) injectSearchBtn();
    injectOverlay();
    wireFooterSearch();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSearch();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });
})();
