// ===== DASHBOARD CONFIG =====
const CONFIG_KEY = 'shimmer_dashboard_config';

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); } catch { return {}; }
}
function saveConfig(data) {
  const existing = loadConfig();
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...existing, ...data }));
}

// ===== META GRAPH API — chamadas reais =====
const GRAPH = 'https://graph.facebook.com/v25.0';

async function apiFetch(path, token) {
  try {
    const res = await fetch(`${GRAPH}${path}&access_token=${token}`);
    const json = await res.json();
    if (!res.ok || json.error) return { __error: json.error || { message: 'Erro desconhecido' } };
    return json;
  } catch { return null; }
}

async function loadRealInstagramData() {
  const cfg = loadConfig();
  const token = cfg.token_instagram || cfg.token_facebook;
  if (!token) return null;

  let igProfile = null;

  // Token Instagram Business (IGAAV...) — chama /me diretamente
  if (token.startsWith('IGAAV') || token.startsWith('IGQ') || token.startsWith('EAA')) {
    const me = await apiFetch('/me?fields=id,username,followers_count,media_count,follows_count,biography', token);
    if (me && !me.__error && me.followers_count !== undefined) {
      // Se media_count não veio, busca via /me/media
      if (!me.media_count) {
        const mediaResp = await apiFetch('/me/media?fields=id&limit=100', token);
        if (mediaResp && !mediaResp.__error && mediaResp.data) {
          me.media_count = mediaResp.data.length;
          // Verifica se há mais páginas
          if (mediaResp.paging && mediaResp.paging.next) {
            me.media_count = me.media_count + '+';
          }
        }
      }
      igProfile = me;
    }
  }

  // Fallback: token do Facebook — busca via Page ID com nested fields
  const PAGE_ID = '232048553323097';
  if (!igProfile) {
    const pageWithIg = await apiFetch(`/${PAGE_ID}?fields=instagram_business_account{username,followers_count,media_count,follows_count}`, token);
    if (pageWithIg && !pageWithIg.__error && pageWithIg.instagram_business_account) {
      igProfile = pageWithIg.instagram_business_account;
    }
  }

  // Fallback: /me/accounts
  if (!igProfile) {
    const accounts = await apiFetch('/me/accounts?fields=name,instagram_business_account{username,followers_count,media_count,follows_count}', token);
    if (accounts && !accounts.__error && accounts.data) {
      for (const pg of accounts.data) {
        if (pg.instagram_business_account) { igProfile = pg.instagram_business_account; break; }
      }
    }
  }

  if (!igProfile) {
    showInstagramNotLinkedBanner();
    return null;
  }

  // Busca insights de crescimento de seguidores
  let newToday = 0, newMonth = 0, newYear = 0;
  const igId = igProfile.id;
  if (igId) {
    const now = Math.floor(Date.now() / 1000);
    const since30 = now - 86400 * 30;
    const since365 = now - 86400 * 365;

    const insightsMonth = await apiFetch(
      `/${igId}/insights?metric=follower_count&period=day&since=${since30}&until=${now}`,
      token
    );
    if (insightsMonth && !insightsMonth.__error && insightsMonth.data && insightsMonth.data[0]) {
      const vals = insightsMonth.data[0].values || [];
      newToday = vals[vals.length - 1]?.value || 0;
      newMonth = vals.reduce((s, v) => s + (v.value || 0), 0);
    }

    const insightsYear = await apiFetch(
      `/${igId}/insights?metric=follower_count&period=day&since=${since365}&until=${now}`,
      token
    );
    if (insightsYear && !insightsYear.__error && insightsYear.data && insightsYear.data[0]) {
      const vals = insightsYear.data[0].values || [];
      newYear = vals.reduce((s, v) => s + (v.value || 0), 0);
    }
  }

  return {
    username: '@' + (igProfile.username || 'shimmer_joias'),
    totalFollowers: igProfile.followers_count || 3770,
    posts: igProfile.media_count ?? 0,
    following: igProfile.follows_count || 0,
    newToday,
    newMonth,
    newYear,
    engagement: '—',
    real: true,
  };
}

async function loadRealFacebookData() {
  const cfg = loadConfig();
  const token = cfg.token_facebook || cfg.token_instagram;
  if (!token) return null;

  // Tenta primeiro como User Token (lista páginas gerenciadas)
  const accounts = await apiFetch('/me/accounts?fields=name,fan_count,followers_count', token);
  let page = null;

  if (accounts && !accounts.__error && accounts.data && accounts.data.length) {
    page = accounts.data[0];
  } else {
    // Page Access Token: /me já retorna os dados da página diretamente
    const me = await apiFetch('/me?fields=name,fan_count,followers_count', token);
    if (!me) return null;
    if (me.__error) { showTokenExpiredBanner(me.__error.message); return null; }
    page = me;
  }

  if (!page) return null;
  const followers = page.followers_count || page.fan_count || 0;

  return {
    pageName: page.name || 'Shimmer Joias',
    totalFollowers: followers,
    likes: page.fan_count || followers,
    newToday: 0,
    newMonth: 0,
    newYear: 0,
    reach: '—',
    real: true,
  };
}

async function loadRealData() {
  const [igReal, fbReal] = await Promise.all([loadRealInstagramData(), loadRealFacebookData()]);
  if (igReal) {
    mockData.instagram = { ...mockData.instagram, ...igReal };
    showApiStatus('instagram', true);
  }
  if (fbReal) {
    mockData.facebook = { ...mockData.facebook, ...fbReal };
    showApiStatus('facebook', true);
  }
  if (!igReal && !fbReal) {
    const cfg = loadConfig();
    if (cfg.token_facebook || cfg.token_instagram) {
      showTokenExpiredBanner('Token expirado ou sem permissão.');
    }
  }
}

function showInstagramNotLinkedBanner() {
  if (document.getElementById('ig-not-linked-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'ig-not-linked-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#e67e22;color:#fff;padding:14px 20px;text-align:center;z-index:9999;font-size:13px;font-weight:600;';
  banner.innerHTML = `📷 Instagram não vinculado como conta Business à Página do Facebook. <span style="font-weight:400">Acesse: Configurações da Página → Instagram → Conectar conta</span> <button onclick="document.getElementById('ig-not-linked-banner').remove()" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;margin-left:12px;">✕</button>`;
  document.body.prepend(banner);
}

function showTokenExpiredBanner(msg) {
  const existing = document.getElementById('token-expired-banner');
  if (existing) return;
  const banner = document.createElement('div');
  banner.id = 'token-expired-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c0392b;color:#fff;padding:14px 20px;text-align:center;z-index:9999;font-size:13px;font-weight:600;';
  banner.innerHTML = `⚠️ Token da API expirado ou inválido (${msg}). <a href="https://developers.facebook.com/tools/explorer" target="_blank" style="color:#fff;text-decoration:underline;margin-left:8px;">Gerar novo token →</a> <button onclick="document.getElementById('token-expired-banner').remove()" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;margin-left:12px;">✕</button>`;
  document.body.prepend(banner);
}

function showApiStatus(platform, connected) {
  const notices = document.querySelectorAll('.api-notice');
  notices.forEach(n => {
    if (connected && n.closest(`#panel-${platform}`)) {
      n.style.background = '#f0fdf4';
      n.style.borderColor = 'rgba(39,174,96,0.4)';
      n.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#27ae60" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> <b>API conectada!</b> Mostrando dados reais da sua conta.`;
    }
  });
}

// ===== DATE =====
const dateEl = document.getElementById('topbar-date');
if (dateEl) {
  const now = new Date();
  dateEl.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

// ===== MOCK DATA — substitua por chamadas reais às APIs =====
const mockData = {
  instagram: {
    username: '@shimmer_joias',
    totalFollowers: 3770,
    newToday: 0,
    newMonth: 0,
    newYear: 0,
    posts: 0,
    following: 0,
    engagement: '—',
  },
  facebook: {
    pageName: 'Shimmer Joias',
    totalFollowers: 8432,
    newToday: 8,
    newMonth: 147,
    newYear: 890,
    likes: 8150,
    reach: '12.4K',
  },
  whatsapp: {
    totalConversations: 156,
    newToday: 12,
    unread: 7,
    responseRate: '94%',
    avgResponseTime: '8 min',
  },
  ads: {
    totalThisMonth: 'R$ 2.480,00',
    today: 'R$ 82,00',
    roi: '3.2x',
    meta: 1800,
    google: 480,
    tiktok: 200,
    impressions: '48.2K',
    clicks: '1.840',
    cpc: 'R$ 1,35',
    conversions: 38,
    costPerConversion: 'R$ 65,26',
  }
};

const mockConversations = {
  instagram: [
    { id: 1, name: 'Ana Carolina S.', initials: 'AC', preview: 'Olá! Vocês têm o anel solitário em ouro rosa?', time: '10:32', unread: 2, msgs: [
      { text: 'Olá! Vocês têm o anel solitário em ouro rosa?', from: 'received', time: '10:30' },
      { text: 'Vi no perfil de vocês e fiquei apaixonada!', from: 'received', time: '10:31' },
    ]},
    { id: 2, name: 'Patricia Lima', initials: 'PL', preview: 'Qual o prazo de entrega para BH?', time: '09:15', unread: 0, msgs: [
      { text: 'Boa tarde! Qual o prazo de entrega para BH?', from: 'received', time: '09:14' },
      { text: 'Olá Patricia! Para Belo Horizonte o prazo é de 3 a 5 dias úteis com frete expresso. 😊', from: 'sent', time: '09:16' },
      { text: 'Perfeito! Obrigada!', from: 'received', time: '09:18' },
    ]},
    { id: 3, name: 'Mariana Ramos', initials: 'MR', preview: 'Vocês fazem personalização de alianças?', time: 'Ontem', unread: 1, msgs: [
      { text: 'Oi! Vocês fazem personalização de alianças?', from: 'received', time: 'Ontem 16:45' },
    ]},
    { id: 4, name: 'Juliana Costa', initials: 'JC', preview: 'Que linda essa pulseira tennis! Tem parcelas?', time: 'Ontem', unread: 0, msgs: [
      { text: 'Que linda essa pulseira tennis! Tem parcelamento?', from: 'received', time: 'Ontem 14:20' },
      { text: 'Oi Juliana! Sim, parcelamos em até 12x sem juros no cartão de crédito! 💛', from: 'sent', time: 'Ontem 14:35' },
    ]},
    { id: 5, name: 'Fernanda Alves', initials: 'FA', preview: 'Boa tarde! Gostaria de saber sobre...', time: 'Seg', unread: 0, msgs: [
      { text: 'Boa tarde! Gostaria de informações sobre a coleção Aurora', from: 'received', time: 'Seg 11:00' },
      { text: 'Olá! A coleção Aurora é nossa mais recente e está disponível em ouro 18k com diamantes. Posso te enviar o catálogo completo?', from: 'sent', time: 'Seg 11:10' },
    ]},
  ],
  whatsapp: [
    { id: 1, name: 'Carlos Rodrigues', initials: 'CR', preview: 'Quero comprar o anel de noivado', time: '11:02', unread: 3, phone: '(11) 98765-4321', msgs: [
      { text: 'Olá! Vi vocês no Instagram', from: 'received', time: '10:58' },
      { text: 'Quero comprar um anel de noivado especial', from: 'received', time: '10:59' },
      { text: 'Orçamento de quanto?', from: 'received', time: '11:02' },
    ]},
    { id: 2, name: 'Roberta Mendes', initials: 'RM', preview: 'Meu pedido chegou! Amei muito 😍', time: '10:45', unread: 0, phone: '(21) 99234-5678', msgs: [
      { text: 'Meu pedido chegou! Amei muito 😍', from: 'received', time: '10:43' },
      { text: 'Que alegria Roberta! Fico muito feliz que gostou! 💛✨', from: 'sent', time: '10:45' },
    ]},
    { id: 3, name: 'Thiago Santos', initials: 'TS', preview: 'Tem colar de diamante entre 1500 e 2000?', time: '09:30', unread: 1, phone: '(31) 97654-3210', msgs: [
      { text: 'Bom dia! Tem colar de diamante entre R$ 1.500 e R$ 2.000?', from: 'received', time: '09:30' },
    ]},
    { id: 4, name: 'Luciana Ferreira', initials: 'LF', preview: 'Posso retirar na loja?', time: 'Ontem', unread: 0, phone: '(11) 96543-2109', msgs: [
      { text: 'Olá! Posso retirar na loja física?', from: 'received', time: 'Ontem 15:00' },
      { text: 'Olá Luciana! Sim, trabalhamos com retirada em loja também. Nosso endereço é Rua das Joias, 123 - São Paulo. Horário: seg-sex 10h-18h, sáb 10h-14h', from: 'sent', time: 'Ontem 15:12' },
    ]},
  ],
  facebook: [
    { id: 1, name: 'Sandra Oliveira', initials: 'SO', preview: 'Olá! Vocês entregam em todo o Brasil?', time: '14:22', unread: 1, msgs: [
      { text: 'Olá! Vocês entregam em todo o Brasil?', from: 'received', time: '14:22' },
    ]},
    { id: 2, name: 'Ricardo Nunes', initials: 'RN', preview: 'Qual a diferença entre ouro 18k e 14k?', time: '12:55', unread: 0, msgs: [
      { text: 'Boa tarde! Qual a diferença entre ouro 18k e 14k?', from: 'received', time: '12:52' },
      { text: 'Boa tarde Ricardo! O ouro 18k tem 75% de ouro puro, sendo mais durável e brilhante. O 14k tem 58,5% e é ligeiramente mais acessível. Para joias finas, recomendamos sempre o 18k! ✨', from: 'sent', time: '12:58' },
    ]},
    { id: 3, name: 'Camila Duarte', initials: 'CD', preview: 'Tienen alianzas para boda?', time: 'Ontem', unread: 0, msgs: [
      { text: 'Bom dia! Vocês têm alianças de casamento?', from: 'received', time: 'Ontem 10:10' },
      { text: 'Oi Camila! Temos uma linha completa de alianças em ouro 18k, com vários modelos e possibilidade de personalização! Posso te enviar o catálogo?', from: 'sent', time: 'Ontem 10:25' },
    ]},
  ],
};

// ===== POPULATE OVERVIEW =====
function populateOverview() {
  // Instagram stats
  document.getElementById('ig-followers').textContent = mockData.instagram.totalFollowers.toLocaleString('pt-BR');
  document.getElementById('ig-today').textContent = `+${mockData.instagram.newToday}`;
  document.getElementById('ig-month').textContent = `+${mockData.instagram.newMonth}`;
  document.getElementById('ig-year').textContent = `+${mockData.instagram.newYear}`;

  // WhatsApp stats
  document.getElementById('wa-msgs').textContent = mockData.whatsapp.totalConversations;
  document.getElementById('wa-today').textContent = mockData.whatsapp.newToday;
  document.getElementById('wa-unread').textContent = mockData.whatsapp.unread;
  document.getElementById('wa-rate').textContent = mockData.whatsapp.responseRate;

  // Facebook stats
  document.getElementById('fb-followers').textContent = mockData.facebook.totalFollowers.toLocaleString('pt-BR');
  document.getElementById('fb-today').textContent = `+${mockData.facebook.newToday}`;
  document.getElementById('fb-month').textContent = `+${mockData.facebook.newMonth}`;
  document.getElementById('fb-year').textContent = `+${mockData.facebook.newYear}`;

  // Ads stats
  document.getElementById('ads-total').textContent = mockData.ads.totalThisMonth;
  document.getElementById('ads-today').textContent = mockData.ads.today;
  document.getElementById('ads-month').textContent = mockData.ads.totalThisMonth;
  document.getElementById('ads-roi').textContent = mockData.ads.roi;

  // Chart
  buildFollowersChart();

  // Resumo
  const resumo = document.getElementById('resumo-list');
  const resumoItems = [
    { label: 'Novos seguidores (mês)', value: `+${mockData.instagram.newMonth + mockData.facebook.newMonth}`, cls: 'green' },
    { label: 'Conversas abertas', value: mockData.whatsapp.totalConversations, cls: '' },
    { label: 'Msgs não respondidas', value: mockData.whatsapp.unread, cls: mockData.whatsapp.unread > 5 ? 'orange' : '' },
    { label: 'Investimento (mês)', value: mockData.ads.totalThisMonth, cls: '' },
    { label: 'ROI estimado', value: mockData.ads.roi, cls: 'green' },
  ];
  resumo.innerHTML = resumoItems.map(i =>
    `<div class="resumo-item"><span class="ri-label">${i.label}</span><span class="ri-value ${i.cls}">${i.value}</span></div>`
  ).join('');

  // Recent messages
  const msgsEl = document.getElementById('overview-msgs');
  const allMsgs = [
    ...mockConversations.instagram.slice(0, 2).map(c => ({ ...c, type: 'ig' })),
    ...mockConversations.whatsapp.slice(0, 2).map(c => ({ ...c, type: 'wa' })),
    ...mockConversations.facebook.slice(0, 1).map(c => ({ ...c, type: 'fb' })),
  ].slice(0, 5);
  msgsEl.innerHTML = allMsgs.map(m => `
    <div class="msg-preview-item">
      <div class="msg-avatar ${m.type}">${m.initials}</div>
      <div class="msg-body">
        <div class="msg-name">${m.name}</div>
        <div class="msg-text">${m.preview}</div>
      </div>
      <div class="msg-meta">
        <div class="msg-time">${m.time}</div>
        ${m.unread ? `<div class="unread-badge ${m.type}">${m.unread}</div>` : ''}
      </div>
    </div>
  `).join('');

  // Spend
  const spendEl = document.getElementById('spend-list');
  const metaPct = Math.round((mockData.ads.meta / (mockData.ads.meta + mockData.ads.google + mockData.ads.tiktok)) * 100);
  const googlePct = Math.round((mockData.ads.google / (mockData.ads.meta + mockData.ads.google + mockData.ads.tiktok)) * 100);
  const tiktokPct = 100 - metaPct - googlePct;
  spendEl.innerHTML = `
    <div class="spend-item">
      <div class="spend-name"><span>Meta Ads (IG + FB)</span><span>R$ ${mockData.ads.meta.toLocaleString('pt-BR')}</span></div>
      <div class="spend-bar-wrap"><div class="spend-bar meta" style="width:${metaPct}%"></div></div>
    </div>
    <div class="spend-item">
      <div class="spend-name"><span>Google Ads</span><span>R$ ${mockData.ads.google.toLocaleString('pt-BR')}</span></div>
      <div class="spend-bar-wrap"><div class="spend-bar google" style="width:${googlePct}%"></div></div>
    </div>
    <div class="spend-item">
      <div class="spend-name"><span>TikTok Ads</span><span>R$ ${mockData.ads.tiktok.toLocaleString('pt-BR')}</span></div>
      <div class="spend-bar-wrap"><div class="spend-bar tiktok" style="width:${tiktokPct}%"></div></div>
    </div>
  `;
}

function buildFollowersChart() {
  const chartEl = document.getElementById('followers-chart');
  if (!chartEl) return;
  const days = ['01', '05', '10', '15', '20', '25', '30'];
  const igData = [28, 45, 22, 60, 38, 52, 41];
  const fbData = [8, 12, 6, 18, 11, 15, 14];
  const maxVal = Math.max(...igData, ...fbData);
  chartEl.innerHTML = days.map((day, i) => `
    <div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:2px">
      <div class="chart-bar" style="height:${(igData[i]/maxVal)*140}px" data-val="+${igData[i]} IG" title="${day}/06 +${igData[i]} IG"></div>
      <div class="chart-bar fb" style="height:${(fbData[i]/maxVal)*140}px" data-val="+${fbData[i]} FB" title="${day}/06 +${fbData[i]} FB"></div>
      <span style="font-size:9px;color:#bbb;margin-top:4px">${day}</span>
    </div>
  `).join('');
}

// ===== POPULATE INSTAGRAM =====
function populateInstagram() {
  document.getElementById('ig-account-stats').textContent = `${mockData.instagram.totalFollowers.toLocaleString('pt-BR')} seguidores · ${mockData.instagram.posts} publicações`;
  document.getElementById('ig-new-today').textContent = `+${mockData.instagram.newToday}`;
  document.getElementById('ig-new-month').textContent = `+${mockData.instagram.newMonth}`;
  document.getElementById('ig-new-year').textContent = `+${mockData.instagram.newYear}`;
  document.getElementById('ig-total').textContent = mockData.instagram.totalFollowers.toLocaleString('pt-BR');

  const quickStats = document.getElementById('ig-quick-stats');
  quickStats.innerHTML = `
    <div class="quick-stat"><span class="quick-stat-val">${mockData.instagram.posts}</span><span class="quick-stat-label">Posts</span></div>
    <div class="quick-stat"><span class="quick-stat-val">${mockData.instagram.engagement}</span><span class="quick-stat-label">Engajamento</span></div>
    <div class="quick-stat"><span class="quick-stat-val">${mockData.instagram.following}</span><span class="quick-stat-label">Seguindo</span></div>
  `;

  buildConvList('ig', mockConversations.instagram, 'ig-conv-list', 'ig-conv-detail');
}

// ===== POPULATE WHATSAPP =====
function populateWhatsApp() {
  document.getElementById('wa-conv-today').textContent = mockData.whatsapp.newToday;
  document.getElementById('wa-unread-total').textContent = mockData.whatsapp.unread;
  document.getElementById('wa-resp-rate').textContent = mockData.whatsapp.responseRate;
  document.getElementById('wa-avg-time').textContent = mockData.whatsapp.avgResponseTime;

  const quickStats = document.getElementById('wa-quick-stats');
  quickStats.innerHTML = `
    <div class="quick-stat"><span class="quick-stat-val">${mockData.whatsapp.totalConversations}</span><span class="quick-stat-label">Total Convs</span></div>
    <div class="quick-stat"><span class="quick-stat-val">${mockData.whatsapp.unread}</span><span class="quick-stat-label">Não lidas</span></div>
    <div class="quick-stat"><span class="quick-stat-val">${mockData.whatsapp.responseRate}</span><span class="quick-stat-label">Taxa resp.</span></div>
  `;

  buildConvList('wa', mockConversations.whatsapp, 'wa-conv-list', 'wa-conv-detail');
}

// ===== POPULATE FACEBOOK =====
function populateFacebook() {
  document.getElementById('fb-account-stats').textContent = `${mockData.facebook.totalFollowers.toLocaleString('pt-BR')} seguidores · ${mockData.facebook.likes.toLocaleString('pt-BR')} curtidas`;
  document.getElementById('fb-new-today').textContent = `+${mockData.facebook.newToday}`;
  document.getElementById('fb-new-month').textContent = `+${mockData.facebook.newMonth}`;
  document.getElementById('fb-new-year').textContent = `+${mockData.facebook.newYear}`;
  document.getElementById('fb-total').textContent = mockData.facebook.totalFollowers.toLocaleString('pt-BR');

  const quickStats = document.getElementById('fb-quick-stats');
  quickStats.innerHTML = `
    <div class="quick-stat"><span class="quick-stat-val">${mockData.facebook.likes.toLocaleString('pt-BR')}</span><span class="quick-stat-label">Curtidas</span></div>
    <div class="quick-stat"><span class="quick-stat-val">${mockData.facebook.reach}</span><span class="quick-stat-label">Alcance</span></div>
  `;

  buildConvList('fb', mockConversations.facebook, 'fb-conv-list', 'fb-conv-detail');
}

// ===== BUILD CONVERSATION LIST =====
function buildConvList(type, convs, listId, detailId) {
  const listEl = document.getElementById(listId);
  const detailEl = document.getElementById(detailId);
  listEl.innerHTML = convs.map(c => `
    <div class="conv-item ${c.unread > 0 ? 'unread' : ''}" data-id="${c.id}" data-type="${type}">
      <div class="conv-av" style="${avatarColor(c.name)}">${c.initials}</div>
      <div class="conv-info">
        <div class="conv-name">${c.name}</div>
        <div class="conv-preview">${c.preview}</div>
      </div>
      <div class="conv-right">
        <div class="conv-time">${c.time}</div>
        ${c.unread > 0 ? `<div class="conv-badge ${type}">${c.unread}</div>` : ''}
      </div>
    </div>
  `).join('');

  listEl.querySelectorAll('.conv-item').forEach(item => {
    item.addEventListener('click', () => {
      listEl.querySelectorAll('.conv-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      item.classList.remove('unread');
      const badge = item.querySelector('.conv-badge');
      if (badge) badge.remove();
      const conv = convs.find(c => c.id === parseInt(item.dataset.id));
      openConversation(conv, type, detailEl);
    });
  });
}

function avatarColor(name) {
  const colors = [
    'background:linear-gradient(135deg,#667eea,#764ba2)',
    'background:linear-gradient(135deg,#f093fb,#f5576c)',
    'background:linear-gradient(135deg,#4facfe,#00f2fe)',
    'background:linear-gradient(135deg,#43e97b,#38f9d7)',
    'background:linear-gradient(135deg,#fa709a,#fee140)',
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return colors[idx];
}

function openConversation(conv, type, detailEl) {
  detailEl.innerHTML = `
    <div class="conv-detail-header">
      <div class="cdh-av" style="${avatarColor(conv.name)}">${conv.initials}</div>
      <div>
        <div class="cdh-name">${conv.name}</div>
        <div class="cdh-status">${conv.phone || 'Mensagem direta'}</div>
      </div>
    </div>
    <div class="conv-messages" id="conv-msgs-${conv.id}">
      ${conv.msgs.map(m => `
        <div>
          <div class="bubble ${m.from}">${m.text}</div>
          <div class="bubble-time" style="${m.from === 'sent' ? 'text-align:right' : ''}">${m.time}</div>
        </div>
      `).join('')}
    </div>
    <div class="conv-input-area">
      <input type="text" placeholder="Digite uma mensagem..." id="msg-input-${conv.id}" />
      <button class="conv-send-btn" onclick="sendMsg(${conv.id}, '${type}')">Enviar</button>
    </div>
  `;
  const msgs = detailEl.querySelector(`#conv-msgs-${conv.id}`);
  if (msgs) msgs.scrollTop = msgs.scrollHeight;

  const input = detailEl.querySelector(`#msg-input-${conv.id}`);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMsg(conv.id, type);
    });
  }
}

function sendMsg(convId, type) {
  const input = document.getElementById(`msg-input-${convId}`);
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  input.value = '';
  const msgs = document.getElementById(`conv-msgs-${convId}`);
  if (!msgs) return;
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  const bubble = document.createElement('div');
  bubble.innerHTML = `<div class="bubble sent">${escapeHtml(text)}</div><div class="bubble-time" style="text-align:right">${time}</div>`;
  msgs.appendChild(bubble);
  msgs.scrollTop = msgs.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===== POPULATE TRAFEGO =====
function populateTrafego() {
  document.getElementById('trafego-big').textContent = mockData.ads.totalThisMonth;
  document.getElementById('trafego-period').textContent = 'Junho 2026';

  const total = mockData.ads.meta + mockData.ads.google + mockData.ads.tiktok;
  const platforms = [
    { name: 'Meta Ads', value: mockData.ads.meta, pct: Math.round(mockData.ads.meta/total*100), color: 'linear-gradient(to right,#f09433,#bc1888)' },
    { name: 'Google Ads', value: mockData.ads.google, pct: Math.round(mockData.ads.google/total*100), color: 'linear-gradient(to right,#fbbc04,#ea4335)' },
    { name: 'TikTok Ads', value: mockData.ads.tiktok, pct: Math.round(mockData.ads.tiktok/total*100), color: 'linear-gradient(to right,#010101,#69C9D0)' },
  ];
  document.getElementById('trafego-platforms').innerHTML = platforms.map(p => `
    <div class="trafego-plat">
      <span class="tp-name">${p.name}</span>
      <div class="tp-bar-wrap"><div class="tp-bar" style="width:${p.pct}%;background:${p.color}"></div></div>
      <span class="tp-value">R$ ${p.value.toLocaleString('pt-BR')}</span>
    </div>
  `).join('');

  const metricas = [
    { label: 'Impressões', value: mockData.ads.impressions },
    { label: 'Cliques', value: mockData.ads.clicks },
    { label: 'CPC Médio', value: mockData.ads.cpc },
    { label: 'Conversões', value: mockData.ads.conversions, cls: 'green' },
    { label: 'Custo por Conversão', value: mockData.ads.costPerConversion },
    { label: 'ROI Estimado', value: mockData.ads.roi, cls: 'green' },
  ];
  document.getElementById('metricas-list').innerHTML = metricas.map(m => `
    <div class="metrica-item">
      <span class="m-label">${m.label}</span>
      <span class="m-value ${m.cls || ''}">${m.value}</span>
    </div>
  `).join('');

  // Trafego chart
  const chartEl = document.getElementById('trafego-chart');
  if (chartEl) {
    const data = [68, 72, 85, 90, 78, 82, 95, 88, 76, 84, 92, 80, 75, 88, 94, 78, 82, 90, 86, 74, 80, 92, 88, 76, 82, 86, 90, 94, 80, 82];
    const maxVal = Math.max(...data);
    chartEl.innerHTML = data.map((v, i) => `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
        <div class="chart-bar" style="height:${(v/maxVal)*140}px;background:linear-gradient(to top,var(--gold),rgba(201,168,76,0.3))" data-val="R$${v}" title="Dia ${i+1}: R$ ${v}"></div>
      </div>
    `).join('');
  }

  // Campanhas
  const campanhas = [
    { name: 'Coleção Aurora - Remarketing', plat: 'Meta Ads', budget: 'R$ 800', spent: 'R$ 612', result: '18 vendas', status: 'active' },
    { name: 'Anéis de Noivado - Prospecção', plat: 'Meta Ads', budget: 'R$ 600', spent: 'R$ 488', result: '12 vendas', status: 'active' },
    { name: 'Shimmer Joias - Pesquisa', plat: 'Google Ads', budget: 'R$ 480', spent: 'R$ 380', result: '8 vendas', status: 'active' },
    { name: 'Black Friday Preview', plat: 'TikTok Ads', budget: 'R$ 200', spent: 'R$ 200', result: 'Encerrada', status: 'ended' },
  ];
  const table = document.getElementById('campanhas-table');
  table.innerHTML = `
    <div class="table-header"><span>Campanha</span><span>Plataforma</span><span>Orçamento</span><span>Gasto</span><span>Resultado</span><span>Status</span></div>
    ${campanhas.map(c => `
      <div class="table-row">
        <span style="font-weight:500">${c.name}</span>
        <span style="color:#666;font-size:12px">${c.plat}</span>
        <span>${c.budget}</span>
        <span>${c.spent}</span>
        <span>${c.result}</span>
        <span><span class="status-badge ${c.status}">${c.status === 'active' ? 'Ativa' : c.status === 'paused' ? 'Pausada' : 'Encerrada'}</span></span>
      </div>
    `).join('')}
  `;
}

// ===== NAVIGATION =====
const navItems = document.querySelectorAll('.nav-item');
const panels = document.querySelectorAll('.panel');
const pageTitle = document.getElementById('page-title');
const titles = { overview: 'Visão Geral', instagram: 'Instagram', whatsapp: 'WhatsApp', facebook: 'Facebook', produtos: 'Produtos', trafego: 'Tráfego Pago', config: 'Configurações' };

function switchPanel(panelName) {
  navItems.forEach(n => n.classList.remove('active'));
  panels.forEach(p => p.classList.remove('active'));
  const nav = document.querySelector(`[data-panel="${panelName}"]`);
  const panel = document.getElementById(`panel-${panelName}`);
  if (nav) nav.classList.add('active');
  if (panel) panel.classList.add('active');
  if (pageTitle) pageTitle.textContent = titles[panelName] || panelName;

  if (panelName === 'overview') populateOverview();
  if (panelName === 'instagram') populateInstagram();
  if (panelName === 'whatsapp') populateWhatsApp();
  if (panelName === 'facebook') populateFacebook();
  if (panelName === 'trafego') populateTrafego();
  if (panelName === 'produtos') renderProdutosAdmin();
}

navItems.forEach(item => {
  item.addEventListener('click', () => switchPanel(item.dataset.panel));
});

// Panel link buttons
document.querySelectorAll('[data-panel-link]').forEach(btn => {
  btn.addEventListener('click', () => switchPanel(btn.dataset.panelLink));
});

// ===== FILTER TABS =====
document.querySelectorAll('.filter-tabs').forEach(tabs => {
  tabs.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
});

// ===== CHANGE PASSWORD =====
const formChangePass = document.getElementById('form-change-password');
if (formChangePass) {
  formChangePass.addEventListener('submit', (e) => {
    e.preventDefault();
    const old = document.getElementById('old-pass').value;
    const newP = document.getElementById('new-pass').value;
    const conf = document.getElementById('conf-pass').value;
    const msgEl = document.getElementById('pass-msg');
    const config = loadConfig();
    const currentPass = config.senha || 'shimmer2026';

    if (old !== currentPass) {
      msgEl.className = 'pass-msg error';
      msgEl.textContent = 'Senha atual incorreta.';
      return;
    }
    if (newP.length < 6) {
      msgEl.className = 'pass-msg error';
      msgEl.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
      return;
    }
    if (newP !== conf) {
      msgEl.className = 'pass-msg error';
      msgEl.textContent = 'As senhas não coincidem.';
      return;
    }
    saveConfig({ senha: newP });
    msgEl.className = 'pass-msg success';
    msgEl.textContent = 'Senha alterada com sucesso!';
    formChangePass.reset();
  });
}

// ===== SAVE METAS =====
const formMetas = document.getElementById('form-metas');
if (formMetas) {
  formMetas.addEventListener('submit', (e) => {
    e.preventDefault();
    saveConfig({
      meta_ig: document.getElementById('meta-ig').value,
      meta_fb: document.getElementById('meta-fb').value,
      meta_budget: document.getElementById('meta-budget').value,
    });
    alert('Metas salvas com sucesso!');
  });
}

// ===== SAVE INFO =====
const formInfo = document.getElementById('form-info');
if (formInfo) {
  formInfo.addEventListener('submit', (e) => {
    e.preventDefault();
    saveConfig({
      store_name: document.getElementById('store-name').value,
      store_wa: document.getElementById('store-wa').value,
      store_email: document.getElementById('store-email').value,
      store_ig: document.getElementById('store-ig').value,
    });
    alert('Informações salvas com sucesso!');
  });
}

// ===== SAVE TOKEN =====
function saveToken(platform) {
  const tokenEl = document.getElementById(`${platform === 'instagram' ? 'ig' : platform === 'whatsapp' ? 'wa' : 'fb'}-token`);
  if (!tokenEl || !tokenEl.value.trim()) {
    alert('Por favor, insira o token antes de conectar.');
    return;
  }
  saveConfig({ [`token_${platform}`]: tokenEl.value.trim() });
  tokenEl.value = '';
  tokenEl.placeholder = '••••••••••••• (salvo)';
  const statusId = platform === 'instagram' ? 'ig-status' : platform === 'facebook' ? 'fb-status' : 'wa-status';
  setIntegStatus(statusId, true);
  // Recarrega dados reais com novo token
  loadRealData().then(() => {
    populateOverview();
    const active = document.querySelector('.panel.active');
    if (active) switchPanel(active.id.replace('panel-', ''));
    alert(`✅ Token do ${platform} salvo e conectado! O painel será atualizado com seus dados reais.`);
  });
}

// ===== REFRESH =====
const refreshBtn = document.getElementById('refresh-btn');
if (refreshBtn) refreshBtn.addEventListener('click', () => {
  const active = document.querySelector('.panel.active');
  if (active) {
    const id = active.id.replace('panel-', '');
    switchPanel(id);
  }
});

// ===== LOAD CONFIG SAVED =====
function setIntegStatus(id, hasToken) {
  const el = document.getElementById(id);
  if (!el) return;
  if (hasToken) {
    el.className = 'integ-status connected';
    el.textContent = '✓ Token salvo';
  } else {
    el.className = 'integ-status disconnected';
    el.textContent = '✗ Não conectado';
  }
}

function loadSavedConfig() {
  const cfg = loadConfig();
  if (cfg.store_name) { const el = document.getElementById('store-name'); if (el) el.value = cfg.store_name; }
  if (cfg.store_wa) { const el = document.getElementById('store-wa'); if (el) el.value = cfg.store_wa; }
  if (cfg.store_email) { const el = document.getElementById('store-email'); if (el) el.value = cfg.store_email; }
  if (cfg.store_ig) { const el = document.getElementById('store-ig'); if (el) el.value = cfg.store_ig; }
  if (cfg.meta_ig) { const el = document.getElementById('meta-ig'); if (el) el.value = cfg.meta_ig; }
  if (cfg.meta_fb) { const el = document.getElementById('meta-fb'); if (el) el.value = cfg.meta_fb; }
  if (cfg.meta_budget) { const el = document.getElementById('meta-budget'); if (el) el.value = cfg.meta_budget; }

  // Populate token fields (masked) and status badges
  const igEl = document.getElementById('ig-token');
  const fbEl = document.getElementById('fb-token');
  const waEl = document.getElementById('wa-token');
  const igToken = cfg.token_instagram || '';
  const fbToken = cfg.token_facebook || '';
  const waToken = cfg.token_whatsapp || '';
  if (igEl && igToken) igEl.placeholder = '••••••••••••• (salvo)';
  if (fbEl && fbToken) fbEl.placeholder = '••••••••••••• (salvo)';
  if (waEl && waToken) waEl.placeholder = '••••••••••••• (salvo)';
  setIntegStatus('ig-status', !!igToken);
  setIntegStatus('fb-status', !!fbToken);
  setIntegStatus('wa-status', !!waToken);
}

// ===== TEST TOKEN =====
async function testToken(platform) {
  const cfg = loadConfig();
  const token = platform === 'instagram'
    ? (cfg.token_instagram || cfg.token_facebook)
    : platform === 'facebook'
    ? (cfg.token_facebook || cfg.token_instagram)
    : cfg.token_whatsapp;

  if (!token) {
    alert('Nenhum token salvo. Insira e clique em Conectar primeiro.');
    return;
  }

  const result = await apiFetch('/me?fields=id,name', token);
  if (result && result.id) {
    alert(`✅ Token válido! Conectado como: ${result.name || result.id}`);
  } else {
    alert('❌ Token inválido ou expirado. Gere um novo token no Meta for Developers e reconecte.');
  }
}

// ===== PRODUTOS =====
const PRODUTOS_KEY = 'shimmer_produtos';

const PRODUTOS_DEFAULT = (window.SHIMMER_PRODUTOS || []);

function getProdutos() {
  try { return JSON.parse(localStorage.getItem(PRODUTOS_KEY)) || PRODUTOS_DEFAULT; } catch { return PRODUTOS_DEFAULT; }
}
function saveProdutos(produtos) {
  localStorage.setItem(PRODUTOS_KEY, JSON.stringify(produtos));
}

function renderProdutosAdmin() {
  const lista = document.getElementById('produtos-lista');
  if (!lista) return;
  const produtos = getProdutos();
  lista.innerHTML = produtos.map(p => `
    <div class="produto-admin-item" data-code="${p.code}">
      <div class="produto-admin-img${p.foto ? ' has-foto' : ''}"${p.foto ? ` onclick="abrirZoomProduto('${p.code}')" title="Ver foto ampliada"` : ''}>
        ${p.foto ? `<img src="${p.foto}" alt="${p.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:8px"><span class="produto-admin-zoom-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg></span>` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#f5f0e8,#e8dcc8);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px">💎</div>`}
      </div>
      <div class="produto-admin-info">
        <span class="produto-admin-code">${p.code}</span>
        <strong>${p.name}</strong>
        <span>${p.colecao} · ${p.material}</span>
        <span class="produto-admin-preco">${p.preco}${p.precoOld ? ` <s style="color:#bbb;font-size:12px">${p.precoOld}</s>` : ''}</span>
        ${p.badge ? `<span class="produto-admin-badge">${p.badge}</span>` : ''}
      </div>
      <div class="produto-admin-actions">
        <button class="btn-sm" onclick="editarProduto('${p.code}')">Editar</button>
        <button class="btn-sm btn-sm-outline" onclick="deletarProduto('${p.code}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

let _editCode = null;
function abrirModalProduto(code = null) {
  _editCode = code;
  const modal = document.getElementById('modal-produto');
  const titulo = document.getElementById('modal-produto-titulo');
  if (code) {
    const p = getProdutos().find(x => x.code === code);
    if (!p) return;
    titulo.textContent = 'Editar Produto';
    document.getElementById('edit-code').value = p.code;
    document.getElementById('edit-name').value = p.name;
    document.getElementById('edit-colecao').value = p.colecao;
    document.getElementById('edit-material').value = p.material;
    document.getElementById('edit-preco').value = p.preco;
    document.getElementById('edit-preco-old').value = p.precoOld || '';
    document.getElementById('edit-badge').value = p.badge || '';
    document.getElementById('edit-foto').value = p.foto || '';
    document.getElementById('edit-categoria').value = p.categoria || 'aneis';
  } else {
    titulo.textContent = 'Novo Produto';
    ['edit-code','edit-name','edit-colecao','edit-material','edit-preco','edit-preco-old','edit-badge','edit-foto','edit-categoria'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('edit-categoria').value = 'aneis';
  }
  atualizarPreviewFoto();
  modal.style.display = 'flex';
}

function fecharModalProduto() {
  document.getElementById('modal-produto').style.display = 'none';
}

function editarProduto(code) { abrirModalProduto(code); }

function deletarProduto(code) {
  if (!confirm(`Excluir o produto ${code}?`)) return;
  const produtos = getProdutos().filter(p => p.code !== code);
  saveProdutos(produtos);
  renderProdutosAdmin();
}

function salvarProduto() {
  const novo = {
    code: document.getElementById('edit-code').value.trim(),
    name: document.getElementById('edit-name').value.trim(),
    colecao: document.getElementById('edit-colecao').value.trim(),
    material: document.getElementById('edit-material').value.trim(),
    preco: document.getElementById('edit-preco').value.trim(),
    precoOld: document.getElementById('edit-preco-old').value.trim(),
    badge: document.getElementById('edit-badge').value.trim(),
    foto: document.getElementById('edit-foto').value.trim(),
    categoria: document.getElementById('edit-categoria').value,
  };
  if (!novo.code || !novo.name || !novo.preco) { alert('Preencha código, nome e preço.'); return; }
  let produtos = getProdutos();
  const idx = produtos.findIndex(p => p.code === (_editCode || novo.code));
  if (idx >= 0) {
    // mantém campos extras (ex.: galeria "fotos") que o formulário não edita
    const anterior = produtos[idx];
    if (anterior.foto !== novo.foto && Array.isArray(anterior.fotos) && anterior.fotos.length) {
      novo.fotos = [novo.foto, ...anterior.fotos.filter(f => f !== anterior.foto && f !== novo.foto)].filter(Boolean);
    }
    produtos[idx] = { ...anterior, ...novo };
  } else { produtos.push(novo); }
  saveProdutos(produtos);
  fecharModalProduto();
  renderProdutosAdmin();
  alert('✅ Produto salvo! As alterações aparecem no site ao recarregar.');
}


// ===== ZOOM DE FOTO (painel) =====
function atualizarPreviewFoto() {
  const box = document.getElementById('edit-foto-preview');
  if (!box) return;
  const url = document.getElementById('edit-foto').value.trim();
  if (url) {
    box.innerHTML = `<img src="${url}" alt="Foto do produto" onerror="this.parentNode.classList.add('erro')"><span class="edit-foto-preview-hint">Toque para ampliar</span>`;
    box.classList.remove('erro');
    box.style.display = 'block';
  } else {
    box.innerHTML = '';
    box.style.display = 'none';
  }
}
document.addEventListener('input', e => { if (e.target && e.target.id === 'edit-foto') atualizarPreviewFoto(); });

function abrirZoomDoModal() {
  const url = document.getElementById('edit-foto').value.trim();
  if (!url) return;
  const code = document.getElementById('edit-code').value.trim();
  const p = getProdutos().find(x => x.code === (_editCode || code));
  const fotos = p && p.foto === url && Array.isArray(p.fotos) && p.fotos.length ? p.fotos : [url];
  abrirZoom({ fotos, titulo: document.getElementById('edit-name').value.trim(), code, info: '', podeEditar: false });
}

function abrirZoomProduto(code) {
  const p = getProdutos().find(x => x.code === code);
  if (!p || !p.foto) return;
  const fotos = Array.isArray(p.fotos) && p.fotos.length ? p.fotos : [p.foto];
  abrirZoom({
    fotos, code: p.code, titulo: p.name,
    info: [p.material, p.preco].filter(Boolean).join(' · '),
    podeEditar: true,
  });
}

const _zoom = { fotos: [], i: 0, scale: 1, x: 0, y: 0, code: null, pointers: new Map(), startDist: 0, startScale: 1, lastTap: 0, dragStart: null };

function montarZoomDom() {
  let el = document.getElementById('foto-zoom');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'foto-zoom';
  el.className = 'foto-zoom';
  el.innerHTML = `
    <div class="foto-zoom-top">
      <div class="foto-zoom-titulo"><span id="fz-code"></span><strong id="fz-nome"></strong><small id="fz-info"></small></div>
      <button class="foto-zoom-btn" onclick="fecharZoom()" aria-label="Fechar">✕</button>
    </div>
    <div class="foto-zoom-stage" id="fz-stage">
      <img id="fz-img" alt="" draggable="false" />
      <button class="foto-zoom-nav prev" id="fz-prev" onclick="zoomNav(-1)" aria-label="Foto anterior">‹</button>
      <button class="foto-zoom-nav next" id="fz-next" onclick="zoomNav(1)" aria-label="Próxima foto">›</button>
    </div>
    <div class="foto-zoom-bottom">
      <div class="foto-zoom-dots" id="fz-dots"></div>
      <div class="foto-zoom-ctrls">
        <button class="foto-zoom-btn" onclick="zoomPor(-0.5)" aria-label="Diminuir zoom">−</button>
        <button class="foto-zoom-btn" onclick="zoomReset()" aria-label="Tamanho original">1:1</button>
        <button class="foto-zoom-btn" onclick="zoomPor(0.5)" aria-label="Aumentar zoom">+</button>
        <button class="foto-zoom-editar" id="fz-editar" onclick="zoomEditar()">Editar produto</button>
      </div>
      <p class="foto-zoom-dica">Pinça ou toque duplo para ampliar · arraste para mover</p>
    </div>`;
  document.body.appendChild(el);

  const stage = el.querySelector('#fz-stage');
  stage.addEventListener('pointerdown', zoomPointerDown);
  stage.addEventListener('pointermove', zoomPointerMove);
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => stage.addEventListener(t, zoomPointerUp));
  stage.addEventListener('wheel', e => { e.preventDefault(); zoomPor(e.deltaY < 0 ? 0.25 : -0.25); }, { passive: false });
  stage.addEventListener('click', e => { if (e.target === stage && _zoom.scale === 1) fecharZoom(); });
  document.addEventListener('keydown', e => {
    if (!el.classList.contains('open')) return;
    if (e.key === 'Escape') fecharZoom();
    if (e.key === 'ArrowLeft') zoomNav(-1);
    if (e.key === 'ArrowRight') zoomNav(1);
  });
  return el;
}

function abrirZoom({ fotos, code, titulo, info, podeEditar }) {
  const el = montarZoomDom();
  _zoom.fotos = fotos; _zoom.i = 0; _zoom.code = code;
  document.getElementById('fz-code').textContent = code || '';
  document.getElementById('fz-nome').textContent = titulo || '';
  document.getElementById('fz-info').textContent = info || '';
  document.getElementById('fz-editar').style.display = podeEditar ? '' : 'none';
  mostrarFotoZoom();
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function fecharZoom() {
  const el = document.getElementById('foto-zoom');
  if (!el) return;
  el.classList.remove('open');
  if (document.getElementById('modal-produto').style.display !== 'flex') document.body.style.overflow = '';
}

function zoomEditar() {
  const code = _zoom.code;
  fecharZoom();
  abrirModalProduto(code);
}

function mostrarFotoZoom() {
  const img = document.getElementById('fz-img');
  img.src = _zoom.fotos[_zoom.i];
  img.alt = document.getElementById('fz-nome').textContent;
  const multi = _zoom.fotos.length > 1;
  document.getElementById('fz-prev').style.display = multi ? '' : 'none';
  document.getElementById('fz-next').style.display = multi ? '' : 'none';
  document.getElementById('fz-dots').innerHTML = multi
    ? _zoom.fotos.map((_, k) => `<span class="${k === _zoom.i ? 'on' : ''}"></span>`).join('') + `<em>${_zoom.i + 1}/${_zoom.fotos.length}</em>`
    : '';
  zoomReset();
}

function zoomNav(d) {
  if (_zoom.fotos.length < 2) return;
  _zoom.i = (_zoom.i + d + _zoom.fotos.length) % _zoom.fotos.length;
  mostrarFotoZoom();
}

function aplicarZoom() {
  const img = document.getElementById('fz-img');
  if (_zoom.scale <= 1) { _zoom.scale = 1; _zoom.x = 0; _zoom.y = 0; }
  // limita o arraste para a foto não sumir da tela
  const stage = document.getElementById('fz-stage');
  const maxX = (img.offsetWidth * _zoom.scale - stage.clientWidth) / 2;
  const maxY = (img.offsetHeight * _zoom.scale - stage.clientHeight) / 2;
  _zoom.x = Math.max(-Math.max(maxX, 0), Math.min(Math.max(maxX, 0), _zoom.x));
  _zoom.y = Math.max(-Math.max(maxY, 0), Math.min(Math.max(maxY, 0), _zoom.y));
  img.style.transform = `translate(${_zoom.x}px, ${_zoom.y}px) scale(${_zoom.scale})`;
  img.classList.toggle('zoomed', _zoom.scale > 1);
}

function zoomPor(delta) {
  _zoom.scale = Math.min(5, Math.max(1, _zoom.scale + delta));
  aplicarZoom();
}

function zoomReset() {
  _zoom.scale = 1; _zoom.x = 0; _zoom.y = 0;
  aplicarZoom();
}

function zoomPointerDown(e) {
  if (e.target.closest('button')) return;
  e.currentTarget.setPointerCapture(e.pointerId);
  _zoom.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (_zoom.pointers.size === 2) {
    const [a, b] = [..._zoom.pointers.values()];
    _zoom.startDist = Math.hypot(a.x - b.x, a.y - b.y);
    _zoom.startScale = _zoom.scale;
    _zoom.dragStart = null;
  } else if (_zoom.pointers.size === 1) {
    _zoom.dragStart = { x: e.clientX, y: e.clientY, ox: _zoom.x, oy: _zoom.y, t: Date.now() };
    const agora = Date.now();
    if (agora - _zoom.lastTap < 300) {
      // toque duplo: alterna entre 1x e 2.5x
      if (_zoom.scale > 1) zoomReset(); else { _zoom.scale = 2.5; aplicarZoom(); }
      _zoom.lastTap = 0;
    } else {
      _zoom.lastTap = agora;
    }
  }
}

function zoomPointerMove(e) {
  if (!_zoom.pointers.has(e.pointerId)) return;
  _zoom.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (_zoom.pointers.size === 2 && _zoom.startDist) {
    const [a, b] = [..._zoom.pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    _zoom.scale = Math.min(5, Math.max(1, _zoom.startScale * dist / _zoom.startDist));
    aplicarZoom();
  } else if (_zoom.pointers.size === 1 && _zoom.dragStart && _zoom.scale > 1) {
    _zoom.x = _zoom.dragStart.ox + (e.clientX - _zoom.dragStart.x);
    _zoom.y = _zoom.dragStart.oy + (e.clientY - _zoom.dragStart.y);
    aplicarZoom();
  }
}

function zoomPointerUp(e) {
  if (!_zoom.pointers.has(e.pointerId)) return;
  _zoom.pointers.delete(e.pointerId);
  // deslizar para o lado troca de foto quando não está ampliado
  if (_zoom.pointers.size === 0 && _zoom.dragStart && _zoom.scale === 1) {
    const dx = e.clientX - _zoom.dragStart.x;
    if (Math.abs(dx) > 60 && Date.now() - _zoom.dragStart.t < 600) zoomNav(dx < 0 ? 1 : -1);
  }
  if (_zoom.pointers.size < 2) _zoom.startDist = 0;
  if (_zoom.pointers.size === 1) {
    const [p] = [..._zoom.pointers.values()];
    _zoom.dragStart = { x: p.x, y: p.y, ox: _zoom.x, oy: _zoom.y, t: Date.now() };
  } else if (_zoom.pointers.size === 0) {
    _zoom.dragStart = null;
  }
}

// ===== INIT =====
loadSavedConfig();
loadRealData().then(() => {
  populateOverview();
});
renderProdutosAdmin();

// ===== BACKUP & RESTORE =====
function exportBackup() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('shimmer_')) {
      try { data[key] = JSON.parse(localStorage.getItem(key)); }
      catch { data[key] = localStorage.getItem(key); }
    }
  }
  if (Object.keys(data).length === 0) {
    alert('Nenhum dado encontrado para salvar. Use o painel para registrar configurações primeiro.');
    return;
  }
  const payload = JSON.stringify({ version: 1, date: new Date().toISOString(), data }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shimmer-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  localStorage.setItem('shimmer_last_backup', new Date().toISOString());
  const btn = document.getElementById('btn-export-backup');
  if (btn) { const orig = btn.textContent; btn.textContent = '✓ Salvo!'; setTimeout(() => { btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Backup'; }, 2500); }
}

function importBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result);
        if (!backup.data || typeof backup.data !== 'object') throw new Error('Formato inválido');
        const keys = Object.keys(backup.data);
        if (keys.length === 0) throw new Error('Backup vazio');
        const dateStr = backup.date ? new Date(backup.date).toLocaleString('pt-BR') : 'desconhecida';
        const ok = confirm(`Restaurar backup de ${dateStr}?\n(${keys.length} itens: ${keys.join(', ')})\n\nOs dados atuais serão substituídos.`);
        if (!ok) return;
        keys.forEach(key => {
          localStorage.setItem(key, JSON.stringify(backup.data[key]));
        });
        alert('✅ Backup restaurado! A página será recarregada.');
        location.reload();
      } catch (err) {
        alert('❌ Arquivo inválido: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}
