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
document.getElementById('refresh-btn').addEventListener('click', () => {
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

const PRODUTOS_DEFAULT = [
  { code: 'SH-1001', name: 'Anel Solitário', colecao: 'Shimmer Joias', material: 'Pedra central 6mm · 12 laterais 1,25mm · Moissanites', preco: 'R$ 2.260,00', precoOld: 'R$ 2.909,00', badge: '-22%', foto: 'images/SH-1001.jpg', categoria: 'aneis' },
  { code: 'SH-1002', name: 'Colar Lágrima de Diamante', colecao: 'Coleção Aurora', material: 'Ouro 18k · Diamante 0,3ct', preco: 'R$ 3.200,00', precoOld: '', badge: '', foto: '', categoria: 'correntes-femininas' },
  { code: 'SH-1003', name: 'Brincos Argola Cravejada', colecao: 'Botânica', material: 'Ouro 18k · Brilhantes', preco: 'R$ 1.785,00', precoOld: 'R$ 2.100,00', badge: '-15%', foto: '', categoria: 'brincos' },
  { code: 'SH-1004', name: 'Pulseira Tennis Diamantes', colecao: 'Eternidade', material: 'Ouro 18k · Diamantes 2,0ct', preco: 'R$ 12.500,00', precoOld: '', badge: '', foto: '', categoria: 'pulseiras' },
  { code: 'SH-1005', name: 'Anel Esmeralda', colecao: 'Shimmer Joias', material: 'Esmeraldas sintéticas · 14 pedras 1,25mm · Central 4mm', preco: 'R$ 1.550,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1005.jpg', fotos: ['images/SH-1005.jpg', 'images/SH-1005b.jpg'], categoria: 'aneis' },
  { code: 'SH-1006', name: 'Anel Topo Redondo', colecao: 'Shimmer Joias', material: '14 moissanites 1,25mm · Central 5,5mm', preco: 'R$ 1.999,00', precoOld: '', badge: '', foto: 'images/SH-1006.jpg', categoria: 'aneis' },
  { code: 'SH-1007', name: 'Par de Alianças', colecao: 'Coleção Casamento', material: 'Feminina 5,5mm · 3 pedras moissanite 1,25mm · Masculina 3mm', preco: 'R$ 5.700,00', precoOld: '', badge: 'Destaque', foto: 'images/SH-1007.jpg', categoria: 'casamento' },
  { code: 'SH-1009', name: 'Meia Aliança com Brilhantes', colecao: 'Coleção Casamento', material: 'Meia aliança · Ouro 18k · Moissanites cravejadas', preco: 'R$ 1.526,00', precoOld: '', badge: '', foto: 'images/SH-1009.jpg', categoria: 'casamento' },
  { code: 'SH-1010', name: 'Par de Alianças Clássico', colecao: 'Coleção Casamento', material: 'Ouro amarelo 18k polido · Design atemporal', preco: 'R$ 6.300,00', precoOld: '', badge: '', foto: 'images/SH-1010.jpg', categoria: 'casamento' },
  { code: 'SH-1011', name: 'Anel Maçom', colecao: 'Sob Encomenda', material: 'Anel maçom · Ouro 18k', preco: 'R$ 13.600,00', precoOld: '', badge: 'Exclusivo', foto: 'images/SH-1011.jpg', categoria: 'aneis-masculinos' },
  { code: 'SH-1012', name: 'Meia Aliança Marquise', colecao: 'Shimmer Joias', material: '5 navetes 2x5mm · 8 pedras 1,25mm · Moissanites', preco: 'R$ 3.400,00', precoOld: '', badge: '', foto: 'images/SH-1012.jpg', categoria: 'aparadores' },
  { code: 'SH-1013', name: 'Meia Aliança Esmeralda', colecao: 'Shimmer Joias', material: 'Esmeraldas e moissanites · Ouro 18k', preco: 'R$ 2.160,00', precoOld: '', badge: '', foto: 'images/SH-1013.jpg', categoria: 'aparadores' },
  { code: 'SH-1014', name: 'Anel Solitário Clássico', colecao: 'Shimmer Joias', material: 'Solitário · Pedra central 5mm · Moissanite', preco: 'R$ 999,00', precoOld: 'R$ 1.200,00', badge: 'Solitário', foto: 'images/SH-1014.jpg', categoria: 'solitarios' },
  { code: 'SH-1016', name: 'Colar Grumet Masculino', colecao: 'Shimmer Joias', material: 'Ouro 18k · Elo grumet', preco: 'R$ 64.800,00', precoOld: '', badge: '', foto: 'images/SH-1016.jpg', categoria: 'correntes' },
  { code: 'SH-1017', name: 'Pulseira Grumet', colecao: 'Shimmer Joias', material: 'Ouro 18k · Elo grumet · Fecho caixa', preco: 'R$ 27.000,00', precoOld: '', badge: '', foto: 'images/SH-1017a.jpg', fotos: ['images/SH-1017a.jpg', 'images/SH-1017b.jpg'], categoria: 'pulseiras-masculinas' },
  { code: 'SH-1018', name: 'Anel Solitário 7 Pedras', colecao: 'Shimmer Joias', material: '14 moissanites 1,25mm · Central 4mm', preco: 'R$ 1.550,00', precoOld: 'R$ 1.700,00', badge: '-9%', foto: 'images/SH-1018.jpg', categoria: 'aneis' },
  { code: 'SH-1019', name: 'Anel de Formatura', colecao: 'Shimmer Joias', material: 'Formatura · 7 pedras 2mm · Pedra central personalizada por curso', preco: 'R$ 2.630,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1019.jpg', fotos: [], categoria: 'aneis-formatura' },
  { code: 'SH-1024', name: 'Pingente Gota Esmeralda', colecao: 'Shimmer Joias', material: 'Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Novo', foto: 'images/SH-1024.jpg', fotos: ['images/SH-1024.jpg', 'images/SH-1024b.jpg'], categoria: 'pingentes' },
  { code: 'SH-1025', name: 'Anel Solitário Delicado', colecao: 'Shimmer Joias', material: 'Solitário · Pedra central 3mm · Moissanite', preco: 'R$ 999,00', precoOld: 'R$ 1.200,00', badge: 'Solitário', foto: 'images/SH-1025.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1026', name: 'Anel com Topázio Azul', colecao: 'Shimmer Joias', material: 'Solitário · Zircônia azul 5mm', preco: 'R$ 999,00', precoOld: 'R$ 1.450,00', badge: 'Solitário', foto: 'images/SH-1026.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1027', name: 'Anel Solitário com Laterais', colecao: 'Shimmer Joias', material: 'Pedra central 5mm · 2 laterais 1,25mm · Moissanites', preco: 'R$ 2.100,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1027.jpg', fotos: [], categoria: 'aneis' },
  { code: 'SH-1028', name: 'Anel com Safira Azul', colecao: 'Shimmer Joias', material: '14 pedras 1,25mm · Central 4mm · Safira sintética', preco: 'R$ 1.550,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1028.jpg', fotos: [], categoria: 'aneis' },
  { code: 'SH-1029', name: 'Anel Chuveiro', colecao: 'Shimmer Joias', material: 'Chuveiro · Ouro 18k · Diamantes', preco: 'R$ 3.390,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1029.jpg', fotos: [], categoria: 'aneis' },
  { code: 'SH-1030', name: 'Meia Aliança', colecao: 'Shimmer Joias', material: '8 pedras 2,50mm · Moissanite', preco: 'R$ 2.200,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1030.jpg', fotos: [], categoria: 'aparadores' },
  { code: 'SH-1031', name: 'Anel Duplo com Rubi', colecao: 'Shimmer Joias', material: 'Ruby natural 6x4mm · Ouro 18k', preco: 'R$ 1.500,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1031.jpg', fotos: ['images/SH-1031.jpg'], categoria: 'aneis' },
  { code: 'SH-1032', name: 'Anel com Aquamarine', colecao: 'Shimmer Joias', material: 'Turmalina Paraíba natural 5mm · 14 moissanites 1,25mm', preco: 'R$ 3.600,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1032.jpg', fotos: [], categoria: 'aneis' },
  { code: 'SH-1033', name: 'Aparador Trabalhado', colecao: 'Shimmer Joias', material: 'Ouro 18k', preco: 'R$ 1.300,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1033.jpg', fotos: ['images/SH-1033.jpg', 'images/SH-1033b.jpg'], categoria: 'aparadores' },
  { code: 'SH-1034', name: 'Aparador Coração', colecao: 'Shimmer Joias', material: 'Aparador formato coração · Ouro 18k', preco: 'R$ 1.400,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1034.jpg', fotos: [], categoria: 'aparadores' },
  { code: 'SH-1035', name: 'Par de Alianças Largas Texturizadas', colecao: 'Coleção Casamento', material: 'Ouro 18k', preco: 'R$ 7.000,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1035.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1036', name: 'Conjunto Noivado (Solitário + Aliança)', colecao: 'Coleção Casamento', material: 'Ouro 18k', preco: 'R$ 3.380,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1036.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1037', name: 'Par de Alianças com Pedras', colecao: 'Coleção Casamento', material: 'Ouro 18k', preco: 'R$ 19.480,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1037.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1038', name: 'Pulseira Personalizada com Letras', colecao: 'Shimmer Joias', material: 'Ouro 18k', preco: 'R$ 1.650,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1038.jpg', fotos: [], categoria: 'pulseiras-femininas' },
  { code: 'SH-1039', name: 'Anel Solitário Oval', colecao: 'Shimmer Joias', material: 'Pedra oval 5x7mm · Moissanite', preco: 'R$ 1.550,00', precoOld: 'R$ 1.750,00', badge: 'Novo', foto: 'images/SH-1039.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1040', name: 'Par de Alianças Infinito', colecao: 'Coleção Casamento', material: 'Ouro 18k', preco: 'R$ 2.920,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1040.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1041', name: 'Colar Pingente Coração', colecao: 'Shimmer Joias', material: 'Ouro 18k', preco: 'R$ 3.000,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1041.jpg', fotos: [], categoria: 'correntes-femininas' },
  { code: 'SH-1042', name: 'Colar Pingente Solitário', colecao: 'Shimmer Joias', material: 'Ouro 18k', preco: 'R$ 2.000,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1042.jpg', fotos: [], categoria: 'correntes-femininas' },
  { code: 'SH-1043', name: 'Colar Pingente Rosa com Halo', colecao: 'Shimmer Joias', material: 'Ouro 18k', preco: 'R$ 2.859,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1043.jpg', fotos: [], categoria: 'correntes-femininas' },
  { code: 'SH-1044', name: 'Anel com Topázio Azul e Laterais', colecao: 'Shimmer Joias', material: 'Topázio sintético 6x8mm · 6 moissanites 2mm nas laterais', preco: 'R$ 2.550,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1044.jpg', fotos: ['images/SH-1044.jpg'], categoria: 'aneis' },
  { code: 'SH-1045', name: 'Anel Sinete Personalizado', colecao: 'Shimmer Joias', material: 'Anel personalizado · Ouro 18k', preco: 'R$ 5.100,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1045.jpg', fotos: ['images/SH-1045.jpg', 'images/SH-1045b.jpg'], categoria: 'aneis-masculinos' },
  { code: 'SH-1046', name: 'Anel São Bento', colecao: 'Shimmer Joias', material: 'Ouro 18k', preco: 'R$ 15.300,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1046.jpg', fotos: ['images/SH-1046.jpg', 'images/SH-1046b.jpg'], categoria: 'aneis-masculinos' },
  { code: 'SH-1047', name: 'Anel de Formatura', colecao: 'Shimmer Joias', material: 'Formatura · Pedra central 6mm', preco: 'R$ 7.000,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1047.jpg', fotos: [], categoria: 'aneis-formatura' },
  { code: 'SH-1048', name: 'Anel Oval com Laterais', colecao: 'Shimmer Joias', material: 'Pedra oval 5x7mm · 2 laterais 1,25mm · Moissanite', preco: 'R$ 1.750,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1048.jpg', fotos: [], categoria: 'aneis' },
  { code: 'SH-1049', name: 'Pingente Nossa Senhora Aparecida', colecao: 'Shimmer Joias', material: 'Ouro 18k', preco: 'R$ 3.950,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1049.jpg', fotos: ['images/SH-1049.jpg', 'images/SH-1049b.jpg'], categoria: 'correntes-femininas' },
  { code: 'SH-1050', name: 'Anel de Formatura', colecao: 'Shimmer Joias', material: 'Formatura · Pedra central 3mm · 6 laterais 1,75mm', preco: 'R$ 2.550,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1050.jpg', fotos: [], categoria: 'aneis-formatura' },
  { code: 'SH-1051', name: 'Par de Alianças Modernas', colecao: 'Coleção Casamento', material: 'Ouro 18k', preco: 'R$ 7.350,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1051.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1052', name: 'Par de Alianças Trabalhadas com Pedras', colecao: 'Coleção Casamento', material: 'Ouro 18k', preco: 'R$ 7.560,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1052.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1053', name: 'Brinco Pérola', colecao: 'Shimmer Joias', material: 'Ouro 18k', preco: 'R$ 1.500,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1053.jpg', fotos: [], categoria: 'brincos' },
  { code: 'SH-1054', name: 'Corrente de Homenagem Personalizada', colecao: 'Coleção Especial', material: 'Ouro 18k', preco: 'R$ 6.670,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1054.jpg', fotos: [], categoria: 'homenagem' },
  { code: 'SH-1020', name: 'Corrente Elo Cadeado Grossa', colecao: 'Coleção Masculina', material: 'Ouro 18k', preco: 'R$ 23.400,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1020.jpg', fotos: [], categoria: 'correntes' },
  { code: 'SH-1021', name: 'Corrente com Pingente Cruz', colecao: 'Coleção Masculina', material: 'Ouro 18k', preco: 'R$ 12.000,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1021.jpg', fotos: [], categoria: 'correntes' },
  { code: 'SH-1022', name: 'Corrente Elo Cadeado Fina', colecao: 'Shimmer Joias', material: 'Ouro 18k', preco: 'R$ 9.000,00', precoOld: '', badge: 'Novo', foto: 'images/SH-1022.jpg', fotos: [], categoria: 'correntes' },
  { code: 'SH-1055', name: 'Anel Exclusivo Cravejado', colecao: 'Anéis Exclusivos', material: 'Anel personalizado · 10g · Todo cravejado com diamantes · Ouro 18k', preco: 'R$ 15.000,00', precoOld: '', badge: 'Exclusivo', foto: 'images/SH-1055.jpg', fotos: ['images/SH-1055.jpg'], categoria: 'aneis-exclusivos' },
  { code: 'SH-1056', name: 'Pulseira Exclusiva com Iniciais', colecao: 'Pulseiras Femininas', material: 'Bracelete personalizado com iniciais · Ouro 18k', preco: 'R$ 14.400,00', precoOld: '', badge: 'Exclusivo', foto: 'images/SH-1056.jpg', fotos: ['images/SH-1056.jpg'], categoria: 'pulseiras-femininas' },
  { code: 'SH-1057', name: 'Anel Solitário Infinito', colecao: 'Shimmer Joias', material: 'Pedra central 4mm · Moissanite · Ouro 18k', preco: 'R$ 999,00', precoOld: '', badge: 'Solitário', foto: 'images/SH-1057.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1058', name: 'Par de Alianças Tradicional Abaulada', colecao: 'Tendências 2026', material: '5g o par · 2,5mm de largura · Altura 1,30mm · Ouro 18k', preco: 'R$ 3.650,00', precoOld: '', badge: 'Tendências 2026', foto: 'images/SH-1058.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1059', name: 'Par de Alianças Chanfrada', colecao: 'Tendências 2026', material: '9g o par · 4,80mm de largura · Ouro 18k', preco: 'R$ 6.600,00', precoOld: '', badge: 'Tendências 2026', foto: 'images/SH-1059.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1060', name: 'Anel Solitário Oval', colecao: 'Tendências 2026', material: 'Moissanite · Ouro 18k', preco: 'R$ 1.550,00', precoOld: '', badge: 'Tendências 2026', foto: 'images/SH-1060.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1061', name: 'Anel Solitário com Laterais', colecao: 'Shimmer Joias', material: 'Pedra central · Moissanites laterais · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1061.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1062', name: 'Anel Solitário com Laterais Cravejadas', colecao: 'Shimmer Joias', material: 'Pedra central · Laterais cravejadas · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1062.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1063', name: 'Anel Solitário Clássico Liso', colecao: 'Shimmer Joias', material: 'Pedra central redonda · Haste lisa · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1063.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1064', name: 'Anel Solitário Cravejado', colecao: 'Shimmer Joias', material: 'Pedra central · Haste cravejada com moissanites · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1064.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1065', name: 'Meia Aliança com Pedras', colecao: 'Shimmer Joias', material: 'Meia aliança · Moissanites · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Novo', foto: 'images/SH-1065.jpg', fotos: [], categoria: 'aparadores' },
  { code: 'SH-1066', name: 'Anel Solitário 6 Garras', colecao: 'Shimmer Joias', material: 'Pedra central · 6 garras · Haste fina · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1066.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1067', name: 'Anel Infinito com Pedras', colecao: 'Shimmer Joias', material: 'Símbolo infinito · Moissanites · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1067.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1068', name: 'Anel Solitário Haste Cravejada', colecao: 'Shimmer Joias', material: 'Pedra central · Haste cravejada com moissanites · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1068.jpg', fotos: [], categoria: 'solitarios' },
{ code: 'SH-1070', name: 'Par Alianças Texturizadas com Pedras', colecao: 'Shimmer Joias', material: 'Aliança texturizada · Moissanites · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Casamento', foto: 'images/SH-1070.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1071', name: 'Par Alianças Finas Lisas', colecao: 'Shimmer Joias', material: 'Aliança abaulada · Haste fina · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Casamento', foto: 'images/SH-1071.jpg', fotos: ['images/SH-1071a.jpg', 'images/SH-1071b.jpg'], categoria: 'casamento' },
  { code: 'SH-1072', name: 'Par Alianças Lisa e com Estrelas', colecao: 'Shimmer Joias', material: 'Aliança lisa · Aliança com estrelas cravejadas · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Casamento', foto: 'images/SH-1072.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1073', name: 'Par Alianças Chanfradas Lisas', colecao: 'Shimmer Joias', material: 'Aliança chanfrada · Lisa · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Casamento', foto: 'images/SH-1073.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1074', name: 'Par Alianças Clássicas', colecao: 'Shimmer Joias', material: 'Aliança abaulada · Acabamento polido · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Casamento', foto: 'images/SH-1074.jpg', fotos: [], categoria: 'casamento' },
  { code: 'SH-1075', name: 'Anel Solitário Oval Grande', colecao: 'Shimmer Joias', material: 'Pedra oval · Haste lisa · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1075.jpg', fotos: ['images/SH-1075a.jpg'], categoria: 'solitarios' },
  { code: 'SH-1076', name: 'Anel Solitário Haste Cravejada Premium', colecao: 'Shimmer Joias', material: 'Pedra central · Haste totalmente cravejada · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1076.jpg', fotos: ['images/SH-1076a.jpg', 'images/SH-1076b.jpg', 'images/SH-1076c.jpg', 'images/SH-1076d.jpg'], categoria: 'solitarios' },
  { code: 'SH-1077', name: 'Anel Solitário Oval Haste Lisa', colecao: 'Shimmer Joias', material: 'Pedra oval · Haste fina lisa · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1077.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1078', name: 'Anel Solitário Clássico', colecao: 'Shimmer Joias', material: 'Pedra central · Haste lisa fina · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Solitário', foto: 'images/SH-1078.jpg', fotos: [], categoria: 'solitarios' },
  { code: 'SH-1079', name: 'Conjunto Solitário e Aliança', colecao: 'Shimmer Joias', material: 'Anel solitário + aliança · Ouro 18k', preco: 'A consultar', precoOld: '', badge: 'Casamento', foto: 'images/SH-1079.jpg', fotos: ['images/SH-1079a.jpg'], categoria: 'casamento' },
];

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
      <div class="produto-admin-img">
        ${p.foto ? `<img src="${p.foto}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : `<div style="width:100%;height:100%;background:linear-gradient(135deg,#f5f0e8,#e8dcc8);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px">💎</div>`}
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
  if (idx >= 0) { produtos[idx] = novo; } else { produtos.push(novo); }
  saveProdutos(produtos);
  fecharModalProduto();
  renderProdutosAdmin();
  alert('✅ Produto salvo! As alterações aparecem no site ao recarregar.');
}

// ===== INIT =====
loadSavedConfig();
loadRealData().then(() => {
  populateOverview();
});
renderProdutosAdmin();
