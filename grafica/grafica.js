/* =====================================================================
   PAINEL DA GRÁFICA — clientes, produtos, vendas, estoque e fechamento
   Dados salvos no localStorage do navegador (com backup em .json).
   ===================================================================== */

const STORAGE_KEY = 'grafica_painel_v1';
const FORMAS = ['Dinheiro', 'Pix', 'Cartão de débito', 'Cartão de crédito', 'Boleto', 'Transferência'];
const CANAIS = ['Loja física', 'WhatsApp', 'Instagram', 'Site', 'Indicação', 'Outro'];
const CATEGORIAS_PRODUTO = ['Cartões de visita', 'Panfletos e flyers', 'Banners e lonas', 'Adesivos', 'Personalizados', 'Papelaria', 'Convites', 'Placas e fachadas', 'Serviços de arte', 'Impressões e cópias', 'Outros'];
const CATEGORIAS_ESTOQUE = ['Papéis', 'Lonas e vinis', 'Tintas e toners', 'Blanks (canecas, camisetas…)', 'Acabamento', 'Embalagens', 'Outros'];
const UNIDADES = ['un', 'cento', 'milheiro', 'm²', 'm', 'folha', 'resma', 'rolo', 'pacote', 'caixa', 'kg', 'L', 'hora'];
const STATUS_PADRAO = ['Aguardando arte', 'Arte em aprovação', 'Em produção', 'Pronto p/ retirada', 'Entregue'];

/* ---------------------------- DADOS ---------------------------- */

function dbVazio() {
  return {
    versao: 1,
    config: { nome: 'Minha Gráfica', telefone: '', endereco: '', cnpj: '', chavePix: '', fundoCaixa: 100, statusProducao: STATUS_PADRAO.slice() },
    clientes: [], produtos: [], estoque: [], movimentos: [], vendas: [], caixa: [], fechamentos: [],
    seq: { venda: 1 },
    ultimoBackup: null,
  };
}

let db = carregar();

function carregar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return dbVazio();
    return Object.assign(dbVazio(), JSON.parse(raw));
  } catch (e) {
    console.error(e);
    return dbVazio();
  }
}
function salvar() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); }
  catch (e) { alert('Não foi possível salvar os dados neste navegador. Faça um backup agora.'); }
}

/* ---------------------------- UTIL ---------------------------- */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const r2 = v => Math.round(v * 100) / 100;
const brl = v => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtQtd = v => (v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function hoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function fmtData(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
function diaSemana(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}
function opts(lista, sel, vazio) {
  return (vazio !== undefined ? `<option value="">${esc(vazio)}</option>` : '') +
    lista.map(o => {
      const [v, t] = Array.isArray(o) ? o : [o, o];
      return `<option value="${esc(v)}"${String(v) === String(sel ?? '') ? ' selected' : ''}>${esc(t)}</option>`;
    }).join('');
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 2600);
}
function soDigitos(s) { return String(s || '').replace(/\D/g, ''); }
function linkWhats(tel) {
  let d = soDigitos(tel);
  if (!d) return '';
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}`;
}
const ICON = {
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/></svg>',
  view: '<svg viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  pay: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>',
  print: '<svg viewBox="0 0 24 24"><path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="8" rx="2"/><path d="M6 14h12v8H6z"/></svg>',
  in: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  out: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  hist: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  wa: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 01-13.5 7.8L3 21l1.2-4.4A9 9 0 1121 12z"/></svg>',
  boleto: '<svg viewBox="0 0 24 24"><path d="M3 5v14M6 5v14M9 5v14M13 5v14M15 5v14M18 5v14M21 5v14"/></svg>',
};

/* ------------------------- REGRAS DE NEGÓCIO ------------------------- */

const getCliente = id => db.clientes.find(c => c.id === id);
const getProduto = id => db.produtos.find(p => p.id === id);
const getItem = id => db.estoque.find(i => i.id === id);

function totalPago(v) { return r2((v.pagamentos || []).reduce((s, p) => s + num(p.valor), 0)); }
function saldoVenda(v) { return r2(v.total - totalPago(v)); }
function statusFinal() { const s = db.config.statusProducao; return s[s.length - 1]; }
const ehOrc = v => v.tipo === 'orcamento';
const pedidos = () => db.vendas.filter(v => !ehOrc(v));
/* orcamento | recusado | andamento | feito */
function situacao(v) {
  if (ehOrc(v)) return v.recusado ? 'recusado' : 'orcamento';
  return v.status === statusFinal() ? 'feito' : 'andamento';
}
function atualizarFeito(v) { v.feitoEm = !ehOrc(v) && v.status === statusFinal() ? (v.feitoEm || hoje()) : null; }
function nomeCliente(v) { const c = getCliente(v.clienteId); return c ? c.nome : (v.clienteNome || 'Balcão'); }

/* Estoque: cada movimento guarda o delta (+ entrada, − saída). */
function movimentar(itemId, delta, motivo, extra = {}) {
  const item = getItem(itemId);
  if (!item || !delta) return;
  item.qtd = r2(num(item.qtd) + delta);
  db.movimentos.push({ id: uid(), itemId, delta: r2(delta), motivo, data: hoje(), criadoEm: new Date().toISOString(), ...extra });
}
function baixarEstoqueVenda(v) {
  if (ehOrc(v)) return;
  v.itens.forEach(it => {
    const p = getProduto(it.produtoId);
    if (p && p.estoqueItemId && getItem(p.estoqueItemId)) {
      movimentar(p.estoqueItemId, -(num(it.qtd) * (num(p.consumo) || 1)), `Venda nº ${v.numero} — ${p.nome}`, { vendaId: v.id });
    }
  });
}
function estornarEstoqueVenda(vendaId) {
  db.movimentos.filter(m => m.vendaId === vendaId).forEach(m => {
    const item = getItem(m.itemId);
    if (item) item.qtd = r2(num(item.qtd) - m.delta);
  });
  db.movimentos = db.movimentos.filter(m => m.vendaId !== vendaId);
}
function nivelEstoque(i) {
  if (num(i.qtd) <= 0) return 'zerado';
  if (num(i.qtd) <= num(i.minimo)) return 'baixo';
  return 'ok';
}

/* Fechamento de um dia */
function resumoDia(data) {
  const vendas = pedidos().filter(v => v.data === data);
  const faturado = r2(vendas.reduce((s, v) => s + v.total, 0));
  const porForma = {}; let recebido = 0;
  pedidos().forEach(v => (v.pagamentos || []).forEach(p => {
    if (p.data === data) { porForma[p.forma] = r2((porForma[p.forma] || 0) + num(p.valor)); recebido = r2(recebido + num(p.valor)); }
  }));
  const porCanal = {};
  vendas.forEach(v => { porCanal[v.canal] = r2((porCanal[v.canal] || 0) + v.total); });
  const lanc = db.caixa.filter(c => c.data === data);
  const soma = (fn) => r2(lanc.filter(fn).reduce((s, c) => s + num(c.valor), 0));
  const despesas = soma(c => c.tipo === 'despesa');
  const despesasDinheiro = soma(c => c.tipo === 'despesa' && c.forma === 'Dinheiro');
  const sangrias = soma(c => c.tipo === 'sangria');
  const suprimentos = soma(c => c.tipo === 'suprimento');
  const aReceberGerado = r2(vendas.reduce((s, v) => s + Math.max(0, v.total - (v.pagamentos || []).filter(p => p.data === data).reduce((a, p) => a + num(p.valor), 0)), 0));
  const fech = db.fechamentos.find(f => f.data === data);
  const fundo = fech ? fech.fundo : num(db.config.fundoCaixa);
  const dinheiroEsperado = r2(fundo + (porForma['Dinheiro'] || 0) + suprimentos - sangrias - despesasDinheiro);
  return { vendas, faturado, qtdVendas: vendas.length, ticket: vendas.length ? r2(faturado / vendas.length) : 0, porForma, recebido, porCanal, lanc, despesas, despesasDinheiro, sangrias, suprimentos, aReceberGerado, fundo, dinheiroEsperado, fech };
}

/* ---------------------------- NAVEGAÇÃO ---------------------------- */

const TITULOS = { inicio: 'Início', vendas: 'Pedidos e orçamentos', semanal: 'Relatório semanal', clientes: 'Clientes', produtos: 'Produtos', estoque: 'Estoque', fechamento: 'Fechamento de caixa', config: 'Configurações' };
let painelAtual = 'inicio';

function irPara(p) {
  painelAtual = p;
  $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.panel === p));
  $$('.panel').forEach(s => s.classList.toggle('active', s.id === 'panel-' + p));
  $('#page-title').textContent = TITULOS[p];
  $('#sidebar').classList.remove('open');
  try { localStorage.setItem(STORAGE_KEY + '_painel', p); } catch (e) {}
  render();
  window.scrollTo(0, 0);
}

function render() {
  $('#brand-nome').textContent = db.config.nome || 'Minha Gráfica';
  document.title = `Painel — ${db.config.nome || 'Gráfica'}`;
  renderBackupInfo();
  ({ inicio: renderInicio, vendas: renderVendas, semanal: renderSemanal, clientes: renderClientes, produtos: renderProdutos, estoque: renderEstoque, fechamento: renderFechamento, config: renderConfig })[painelAtual]();
}

/* ------------------------------ INÍCIO ------------------------------ */

function renderInicio() {
  const h = hoje();
  const r = resumoDia(h);
  const abertas = pedidos().filter(v => saldoVenda(v) > 0.009);
  const orcAbertos = db.vendas.filter(v => situacao(v) === 'orcamento');
  const aReceber = r2(abertas.reduce((s, v) => s + saldoVenda(v), 0));
  const boletosVencidos = abertas.flatMap(boletosAbertos).filter(b => statusBoleto(b) === 'vencido').length;
  const fim = statusFinal();
  const emAndamento = pedidos().filter(v => v.status !== fim);
  const baixos = db.estoque.filter(i => nivelEstoque(i) !== 'ok');

  $('#kpis').innerHTML = `
    <div class="kpi"><span>Vendido hoje</span><strong>${brl(r.faturado)}</strong><small>${r.qtdVendas} venda(s) · ticket ${brl(r.ticket)}</small></div>
    <div class="kpi"><span>Recebido hoje</span><strong>${brl(r.recebido)}</strong><small>entrou no caixa</small></div>
    <div class="kpi ${aReceber > 0 ? 'is-warn' : ''}"><span>A receber</span><strong>${brl(aReceber)}</strong><small>${abertas.length} pedido(s) em aberto${boletosVencidos ? ` · <b style="color:var(--bad)">${boletosVencidos} boleto(s) vencido(s)</b>` : ''}</small></div>
    <div class="kpi clicavel" onclick="abrirAba('andamento')" title="Ver pedidos em andamento"><span>Pedidos em andamento</span><strong>${emAndamento.length}</strong><small>${orcAbertos.length} orçamento(s) aguardando resposta</small></div>
    <div class="kpi ${baixos.length ? 'is-bad' : ''}"><span>Estoque baixo</span><strong>${baixos.length}</strong><small>item(ns) para repor</small></div>`;

  renderChart7d();

  const entregas = emAndamento.slice().sort((a, b) => (a.entrega || '9999').localeCompare(b.entrega || '9999')).slice(0, 6);
  $('#lista-entregas').innerHTML = entregas.length ? `<div class="mini-list">${entregas.map(v => {
    const atrasado = v.entrega && v.entrega < h;
    const hojeEnt = v.entrega === h;
    return `<div class="mi"><div><b>nº ${v.numero} · ${esc(nomeCliente(v))}</b><small>${esc(resumoItens(v))}</small></div>
      <div style="text-align:right"><span class="badge ${atrasado ? 'bad' : hojeEnt ? 'warn' : ''}">${v.entrega ? (atrasado ? 'Atrasado · ' : hojeEnt ? 'Hoje · ' : '') + fmtData(v.entrega) : 'sem prazo'}</span><br><small>${esc(v.status)}</small></div></div>`;
  }).join('')}</div>` : `<div class="empty">Nenhum pedido pendente 🎉</div>`;

  $('#lista-estoque-baixo').innerHTML = baixos.length ? `<div class="mini-list">${baixos.slice(0, 6).map(i =>
    `<div class="mi"><div><b>${esc(i.nome)}</b><small>mínimo ${fmtQtd(i.minimo)} ${esc(i.unidade)}</small></div>
     <span class="badge ${nivelEstoque(i) === 'zerado' ? 'bad' : 'warn'}">${fmtQtd(i.qtd)} ${esc(i.unidade)}</span></div>`).join('')}</div>`
    : `<div class="empty">Estoque em dia</div>`;

  // boletos vencidos e que vencem hoje primeiro
  const prioridade = v => { const s = boletosAbertos(v).map(statusBoleto); return s.includes('vencido') ? 0 : s.includes('hoje') ? 1 : s.length ? 2 : 3; };
  const rec = abertas.slice().sort((a, b) => prioridade(a) - prioridade(b) || a.data.localeCompare(b.data)).slice(0, 6);
  $('#lista-receber').innerHTML = rec.length ? `<div class="mini-list">${rec.map(v =>
    `<div class="mi"><div><b>nº ${v.numero} · ${esc(nomeCliente(v))}</b><small>venda em ${fmtData(v.data)} · pago ${brl(totalPago(v))} de ${brl(v.total)}</small>
       ${boletosAbertos(v).map(b => badgeBoleto(b, v.id)).join(' ')}</div>
     <div class="actions"><button class="icon-btn" title="Cobrar no WhatsApp" onclick="cobrarWhats('${v.id}')">${ICON.wa}</button>
     <button class="btn btn-ghost btn-sm" onclick="abrirPagamento('${v.id}')">Receber ${brl(saldoVenda(v))}</button></div></div>`).join('')}</div>`
    : `<div class="empty">Nada a receber</div>`;

  if (!db.vendas.length && !db.produtos.length && !db.clientes.length) {
    $('#lista-entregas').innerHTML = `<div class="empty">Seu painel está vazio.<br><br>
      <button class="btn btn-primary" onclick="irPara('produtos')">Cadastrar primeiro produto</button>
      <button class="btn btn-ghost" onclick="carregarExemplos()">Ver com dados de exemplo</button></div>`;
  }
}

function resumoItens(v) {
  return v.itens.map(i => `${fmtQtd(i.qtd)}× ${i.descricao}`).join(', ');
}

function renderChart7d() {
  const h = hoje();
  const dias = [...Array(7)].map((_, i) => addDias(h, i - 6));
  const vals = dias.map(d => r2(pedidos().filter(v => v.data === d).reduce((s, v) => s + v.total, 0)));
  const max = Math.max(...vals, 1);
  const iMax = vals.indexOf(Math.max(...vals));
  $('#chart-7d').innerHTML = `
    <div class="chart-plot" role="img" aria-label="Vendas dos últimos 7 dias">
      <div class="chart-grid"><i></i><i></i><i></i><i></i></div>
      ${dias.map((d, i) => `<div class="chart-col${d === h ? ' today' : ''}" data-tip="${fmtData(d)} · ${brl(vals[i])}">
        ${(i === iMax && vals[i] > 0) || (d === h && vals[i] > 0) ? `<span class="chart-val" style="bottom:calc(${vals[i] / max * 100}% + 4px)">${brl(vals[i]).replace(',00', '')}</span>` : ''}
        <div class="chart-bar" style="height:${vals[i] / max * 100}%"></div></div>`).join('')}
    </div>
    <div class="chart-labels">${dias.map(d => `<span class="${d === h ? 'today' : ''}">${d === h ? 'hoje' : diaSemana(d)}</span>`).join('')}</div>`;
  ligarTooltips($('#chart-7d'));
}
function ligarTooltips(root) {
  const tip = $('#tooltip');
  $$('[data-tip]', root).forEach(el => {
    el.addEventListener('mousemove', e => { tip.textContent = el.dataset.tip; tip.hidden = false; tip.style.left = (e.clientX + 12) + 'px'; tip.style.top = (e.clientY - 34) + 'px'; });
    el.addEventListener('mouseleave', () => tip.hidden = true);
  });
}

/* ------------------------------ VENDAS ------------------------------ */

let abaPedidos = 'todos';
const ABAS = [
  ['todos', 'Todos'],
  ['orcamento', 'Orçamentos'],
  ['andamento', 'Em andamento'],
  ['feito', 'Feitos'],
];
function abrirAba(aba) {
  abaPedidos = aba;
  if (painelAtual !== 'vendas') irPara('vendas'); else renderVendas();
}

function renderVendas() {
  const selStatus = $('#f-venda-status');
  const atual = selStatus.value;
  selStatus.innerHTML = opts(db.config.statusProducao, atual, 'Produção: todos');

  const q = norm($('#f-venda-busca').value);
  const fp = $('#f-venda-pag').value, fs = selStatus.value, de = $('#f-venda-de').value, ate = $('#f-venda-ate').value;
  const filtrados = db.vendas.filter(v => {
    if (q && !norm(`${v.numero} ${nomeCliente(v)} ${resumoItens(v)} ${v.obs || ''}`).includes(q)) return false;
    if (fp === 'aberto' && (ehOrc(v) || saldoVenda(v) <= 0.009)) return false;
    if (fp === 'pago' && (ehOrc(v) || saldoVenda(v) > 0.009)) return false;
    if (fs && (ehOrc(v) || v.status !== fs)) return false;
    if (de && v.data < de) return false;
    if (ate && v.data > ate) return false;
    return true;
  });
  const naAba = (v, aba) => aba === 'todos' || situacao(v) === aba || (aba === 'orcamento' && situacao(v) === 'recusado');
  $('#tabs-pedidos').innerHTML = ABAS.map(([k, t]) =>
    `<button class="tab${abaPedidos === k ? ' active' : ''}" role="tab" aria-selected="${abaPedidos === k}" onclick="abrirAba('${k}')">${t}<span class="count">${filtrados.filter(v => naAba(v, k)).length}</span></button>`).join('');
  const lista = filtrados.filter(v => naAba(v, abaPedidos))
    .sort((a, b) => abaPedidos === 'andamento'
      ? (a.entrega || '9999').localeCompare(b.entrega || '9999') || a.numero - b.numero
      : b.data.localeCompare(a.data) || b.numero - a.numero);

  const t = $('#tabela-vendas');
  if (!lista.length) {
    const vazio = { todos: 'Nenhum pedido registrado ainda. Clique em <b>+ Nova venda</b> ou <b>+ Orçamento</b>.', orcamento: 'Nenhum orçamento. Clique em <b>+ Orçamento</b> para criar um.', andamento: 'Nenhum pedido em andamento 🎉', feito: 'Nenhum pedido concluído ainda.' }[abaPedidos];
    t.innerHTML = `<tbody><tr><td class="empty">${filtrados.length || abaPedidos !== 'todos' ? (db.vendas.length ? 'Nada aqui com esses filtros.' : vazio) : vazio}</td></tr></tbody>`;
    $('#vendas-rodape').innerHTML = '';
    return;
  }
  const status = db.config.statusProducao;
  const h = hoje();
  t.innerHTML = `<thead><tr><th>Nº</th><th>Data</th><th>Cliente</th><th>Itens</th><th class="num">Total</th><th class="num">Saldo</th><th>Situação</th><th></th></tr></thead>
  <tbody>${lista.map(v => {
    const sit = situacao(v);
    const saldo = saldoVenda(v);
    let situacaoHtml, acoes = '';
    if (sit === 'orcamento' || sit === 'recusado') {
      const vencido = sit === 'orcamento' && v.validade && v.validade < h;
      situacaoHtml = sit === 'recusado'
        ? '<span class="badge bad">Orçamento recusado</span>'
        : `<span class="badge orc">Orçamento</span>${v.validade ? `<span class="sub-line">${vencido ? 'venceu' : 'válido até'} ${fmtData(v.validade)}</span>` : ''}`;
      if (sit === 'orcamento') acoes = `<button class="btn btn-primary btn-sm" title="Cliente aprovou: virar pedido" onclick="aprovarOrcamento('${v.id}')">Aprovar</button>
        <button class="icon-btn" title="Cliente recusou" onclick="recusarOrcamento('${v.id}')">✕</button>`;
      else acoes = `<button class="btn btn-ghost btn-sm" title="Reabrir orçamento" onclick="recusarOrcamento('${v.id}', true)">Reabrir</button>`;
    } else {
      const idx = status.indexOf(v.status);
      const cls = sit === 'feito' ? 'good' : idx <= 0 ? '' : 'info';
      const atrasado = sit === 'andamento' && v.entrega && v.entrega < h;
      situacaoHtml = `<button class="badge ${cls}" title="Clique para avançar a etapa" onclick="avancarStatus('${v.id}')">${sit === 'feito' ? '✓ ' : ''}${esc(v.status)} ›</button>
        ${sit === 'feito' && v.feitoEm ? `<span class="sub-line">feito em ${fmtData(v.feitoEm)}</span>` : ''}${atrasado ? '<span class="sub-line" style="color:var(--bad)">entrega atrasada</span>' : ''}`;
      if (sit === 'andamento') acoes = `<button class="icon-btn" title="Marcar como feito" onclick="concluirPedido('${v.id}')">✓</button>`;
      if (saldo > 0.009) acoes += `<button class="icon-btn" title="Registrar pagamento" onclick="abrirPagamento('${v.id}')">${ICON.pay}</button>
        <button class="icon-btn" title="Boleto" onclick="abrirBoletos('${v.id}')">${ICON.boleto}</button>
        <button class="icon-btn" title="Cobrar no WhatsApp" onclick="cobrarWhats('${v.id}')">${ICON.wa}</button>`;
    }
    return `<tr>
      <td class="strong">${v.numero}</td>
      <td>${fmtData(v.data)}${!ehOrc(v) && v.entrega ? `<span class="sub-line">entrega ${fmtData(v.entrega)}</span>` : ''}</td>
      <td>${esc(nomeCliente(v))}<span class="sub-line">${esc(v.canal)}</span></td>
      <td style="max-width:260px">${esc(resumoItens(v))}</td>
      <td class="num strong">${brl(v.total)}</td>
      <td class="num">${ehOrc(v) ? '<span class="muted">—</span>' : saldo > 0.009 ? `<span class="badge bad">${brl(saldo)}</span>` : '<span class="badge good">Pago</span>'}${boletosAbertos(v).map(b => `<br>${badgeBoleto(b, v.id)}`).join('')}</td>
      <td>${situacaoHtml}</td>
      <td><div class="actions">
        ${acoes}
        <button class="icon-btn" title="Imprimir ${ehOrc(v) ? 'orçamento' : 'pedido'}" onclick="imprimirPedido('${v.id}')">${ICON.print}</button>
        <button class="icon-btn" title="Editar" onclick="abrirVenda('${v.id}')">${ICON.edit}</button>
        <button class="icon-btn" title="Excluir" onclick="excluirVenda('${v.id}')">${ICON.del}</button>
      </div></td></tr>`;
  }).join('')}</tbody>`;
  const peds = lista.filter(v => !ehOrc(v)), orcs = lista.filter(ehOrc);
  const tot = r2(peds.reduce((s, v) => s + v.total, 0));
  const sal = r2(peds.reduce((s, v) => s + Math.max(0, saldoVenda(v)), 0));
  $('#vendas-rodape').innerHTML = (peds.length ? `<span>${peds.length} pedido(s)</span><span>Total: <b>${brl(tot)}</b></span><span>Em aberto: <b>${brl(sal)}</b></span>` : '') +
    (orcs.some(v => !v.recusado) ? `<span>Orçamentos em aberto: <b>${brl(orcs.filter(v => !v.recusado).reduce((s, v) => s + v.total, 0))}</b></span>` : '');
}
function concluirPedido(id) {
  const v = db.vendas.find(x => x.id === id);
  v.status = statusFinal();
  atualizarFeito(v);
  salvar(); render();
  toast(`Pedido nº ${v.numero} marcado como feito ✓`);
}
function aprovarOrcamento(id) {
  const v = db.vendas.find(x => x.id === id);
  if (!confirm(`Aprovar o orçamento nº ${v.numero} (${brl(v.total)})?\nEle vira um pedido com data de hoje, entra nas vendas e dá baixa no estoque.`)) return;
  v.tipo = 'pedido';
  v.dataOrcamento = v.data;
  v.data = hoje();
  v.status = db.config.statusProducao[0];
  v.recusado = false;
  const prazo = Math.max(0, ...v.itens.map(i => num(getProduto(i.produtoId)?.prazo)));
  if (!v.entrega && prazo) v.entrega = addDias(hoje(), prazo);
  baixarEstoqueVenda(v);
  salvar();
  abaPedidos = 'andamento';
  render();
  toast(`Orçamento aprovado → pedido nº ${v.numero}`);
  if (confirm('Deseja registrar um pagamento (sinal) agora?')) abrirPagamento(v.id);
}
function recusarOrcamento(id, reabrir) {
  const v = db.vendas.find(x => x.id === id);
  v.recusado = !reabrir;
  salvar(); render();
  toast(reabrir ? 'Orçamento reaberto' : 'Orçamento marcado como recusado');
}
function limparFiltrosVenda() {
  ['#f-venda-busca', '#f-venda-pag', '#f-venda-status', '#f-venda-de', '#f-venda-ate'].forEach(s => $(s).value = '');
  renderVendas();
}
function filtrarAReceber() {
  limparFiltrosVenda();
  $('#f-venda-pag').value = 'aberto';
  abaPedidos = 'todos';
  irPara('vendas');
}
function avancarStatus(id) {
  const v = db.vendas.find(x => x.id === id);
  const s = db.config.statusProducao;
  const i = s.indexOf(v.status);
  v.status = s[(i + 1) % s.length];
  atualizarFeito(v);
  salvar(); render();
  toast(`Pedido nº ${v.numero}: ${v.status}`);
}
function excluirVenda(id) {
  const v = db.vendas.find(x => x.id === id);
  if (!confirm(ehOrc(v) ? `Excluir o orçamento nº ${v.numero}?` : `Excluir a venda nº ${v.numero}? O estoque consumido será devolvido.`)) return;
  estornarEstoqueVenda(id);
  db.vendas = db.vendas.filter(x => x.id !== id);
  salvar(); render(); toast('Venda excluída');
}

function abrirVenda(id, tipoInicial) {
  const v = id ? db.vendas.find(x => x.id === id) : null;
  const tipoAtual = v ? (v.tipo || 'pedido') : (tipoInicial || 'pedido');
  const ativos = db.produtos.filter(p => p.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome));
  const cli = v ? getCliente(v.clienteId) : null;
  abrirModal('', `
    <form id="form-venda" class="form">
      ${v && !ehOrc(v) ? '' : `<div class="seg" role="radiogroup" aria-label="Tipo">
        <label><input type="radio" name="tipo" value="orcamento" ${tipoAtual === 'orcamento' ? 'checked' : ''} /><span>Orçamento</span></label>
        <label><input type="radio" name="tipo" value="pedido" ${tipoAtual === 'pedido' ? 'checked' : ''} /><span>Venda / pedido</span></label>
      </div>`}
      <div class="row">
        <label>Cliente
          <input name="cliente" list="dl-clientes" placeholder="Digite o nome ou deixe vazio (balcão)" value="${esc(cli ? cli.nome : (v?.clienteNome || ''))}" autocomplete="off" />
          <datalist id="dl-clientes">${db.clientes.map(c => `<option value="${esc(c.nome)}">${esc(c.whatsapp || c.doc || '')}</option>`).join('')}</datalist>
        </label>
        <label>Canal<select name="canal">${opts(CANAIS, v?.canal || 'Loja física')}</select></label>
      </div>
      <div class="row">
        <label><span id="lbl-data">Data da venda</span><input type="date" name="data" value="${v?.data || hoje()}" required /></label>
        <label class="so-orc">Válido até<input type="date" name="validade" value="${v?.validade || addDias(hoje(), 7)}" /></label>
        <label class="so-ped">Prazo de entrega<input type="date" name="entrega" value="${v?.entrega || ''}" /></label>
        <label class="so-ped">Produção<select name="status">${opts(db.config.statusProducao, v?.status || db.config.statusProducao[0])}</select></label>
      </div>
      <fieldset><legend>Itens</legend>
        <div class="item-row item-head"><span>Produto</span><span>Descrição</span><span>Qtd</span><span>Preço un.</span><span style="text-align:right">Subtotal</span><span></span></div>
        <div class="itens" id="venda-itens"></div>
        <div><button type="button" class="btn btn-ghost btn-sm" id="add-item">+ Adicionar item</button></div>
      </fieldset>
      <fieldset class="so-ped"><legend>Pagamentos recebidos</legend>
        <div class="itens" id="venda-pags"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn btn-ghost btn-sm" id="add-pag">+ Adicionar pagamento</button>
          <button type="button" class="btn btn-ghost btn-sm" id="pag-50">Sinal de 50%</button>
          <button type="button" class="btn btn-ghost btn-sm" id="pag-total">Receber total</button>
        </div>
      </fieldset>
      <div class="row">
        <label>Desconto (R$)<input type="number" step="0.01" min="0" name="desconto" value="${v?.desconto || ''}" /></label>
        <div class="totais" id="venda-totais"></div>
      </div>
      <label>Observações (arte, acabamento, cores…)<textarea name="obs" rows="2">${esc(v?.obs || '')}</textarea></label>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="fecharModal()">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-salvar-venda"></button>
      </div>
    </form>`, true);

  const f = $('#form-venda');
  const boxItens = $('#venda-itens'), boxPags = $('#venda-pags');
  const tipoForm = () => f.querySelector('input[name=tipo]:checked')?.value || tipoAtual;
  function aplicarTipo() {
    const orc = tipoForm() === 'orcamento';
    $$('.so-orc', f).forEach(el => el.hidden = !orc);
    $$('.so-ped', f).forEach(el => el.hidden = orc);
    $('#lbl-data').textContent = orc ? 'Data do orçamento' : 'Data da venda';
    $('#modal-title').textContent = v
      ? `Editar ${ehOrc(v) ? 'orçamento' : 'pedido'} nº ${v.numero}${ehOrc(v) && !orc ? ' → aprovar como pedido' : ''}`
      : (orc ? 'Novo orçamento' : 'Nova venda');
    $('#btn-salvar-venda').textContent = v ? (ehOrc(v) && !orc ? 'Aprovar e salvar pedido' : 'Salvar alterações') : (orc ? 'Salvar orçamento' : 'Registrar venda');
    calc();
  }
  $$('input[name=tipo]', f).forEach(r => r.addEventListener('change', aplicarTipo));

  function addItem(it = {}) {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <select class="i-prod">${opts(ativos.map(p => [p.id, `${p.nome} (${brl(p.preco)}/${p.unidade})`]), it.produtoId, '— item avulso —')}</select>
      <input class="i-desc item-desc" placeholder="Descrição" value="${esc(it.descricao || '')}" required />
      <input class="i-qtd" type="number" step="any" min="0" value="${it.qtd ?? 1}" required title="Quantidade" />
      <input class="i-preco" type="number" step="0.01" min="0" value="${it.preco ?? ''}" placeholder="0,00" required title="Preço unitário" />
      <span class="sub">—</span>
      <button type="button" class="icon-btn" title="Remover">${ICON.del}</button>`;
    $('.i-prod', row).addEventListener('change', e => {
      const p = getProduto(e.target.value);
      if (p) { $('.i-desc', row).value = p.nome; $('.i-preco', row).value = p.preco; }
      calc();
    });
    $('.icon-btn', row).addEventListener('click', () => { row.remove(); calc(); });
    row.addEventListener('input', calc);
    boxItens.appendChild(row);
  }
  function addPag(p = {}) {
    const row = document.createElement('div');
    row.className = 'pag-row';
    row.innerHTML = `
      <input class="p-data" type="date" value="${p.data || hoje()}" required title="Data do pagamento" />
      <select class="p-forma">${opts(FORMAS, p.forma || 'Pix')}</select>
      <input class="p-valor" type="number" step="0.01" min="0" value="${p.valor ?? ''}" placeholder="Valor" required />
      <button type="button" class="icon-btn" title="Remover">${ICON.del}</button>`;
    $('.icon-btn', row).addEventListener('click', () => { row.remove(); calc(); });
    row.addEventListener('input', calc);
    boxPags.appendChild(row);
    return row;
  }
  function totalAtual() {
    const bruto = $$('.item-row:not(.item-head)', boxItens).reduce((s, r) => s + num($('.i-qtd', r).value) * num($('.i-preco', r).value), 0);
    return r2(Math.max(0, bruto - num(f.desconto.value)));
  }
  function pagoAtual() { return r2($$('.p-valor', boxPags).reduce((s, i) => s + num(i.value), 0)); }
  function calc() {
    let bruto = 0;
    $$('.item-row:not(.item-head)', boxItens).forEach(r => {
      const st = num($('.i-qtd', r).value) * num($('.i-preco', r).value);
      bruto += st; $('.sub', r).textContent = brl(st);
    });
    const total = totalAtual(), pago = pagoAtual(), saldo = r2(total - pago);
    $('#venda-totais').innerHTML = `
      <div><span>Subtotal</span><span>${brl(bruto)}</span></div>
      <div class="total"><span>Total</span><span>${brl(total)}</span></div>
      ${tipoForm() === 'orcamento' ? '' : `<div><span>Pago</span><span>${brl(pago)}</span></div>
      <div class="${saldo > 0.009 ? 'saldo-aberto' : ''}"><span>${saldo < -0.009 ? 'Troco / excedente' : 'Falta receber'}</span><span>${brl(Math.abs(saldo))}</span></div>`}`;
  }
  function preencherPag(valor) {
    // usa uma linha vazia (ou cria) e completa até o pago somar "valor"
    const row = $$('.pag-row', boxPags).find(r => !num($('.p-valor', r).value)) || addPag();
    const outros = r2(pagoAtual() - num($('.p-valor', row).value));
    $('.p-valor', row).value = Math.max(0, r2(valor - outros)).toFixed(2);
    calc();
  }

  (v ? v.itens : [{}]).forEach(addItem);
  (v ? v.pagamentos : []).forEach(addPag);
  $('#add-item').onclick = () => addItem();
  $('#add-pag').onclick = () => { addPag(); calc(); };
  $('#pag-total').onclick = () => preencherPag(totalAtual());
  $('#pag-50').onclick = () => preencherPag(r2(totalAtual() / 2));
  f.desconto.addEventListener('input', calc);
  aplicarTipo();

  f.addEventListener('submit', e => {
    e.preventDefault();
    const itens = $$('.item-row:not(.item-head)', boxItens).map(r => ({
      produtoId: $('.i-prod', r).value || null,
      descricao: $('.i-desc', r).value.trim(),
      qtd: num($('.i-qtd', r).value),
      preco: num($('.i-preco', r).value),
    })).filter(i => i.descricao && i.qtd > 0);
    if (!itens.length) return alert('Adicione pelo menos um item.');
    const orc = tipoForm() === 'orcamento';
    const pagamentos = orc ? [] : $$('.pag-row', boxPags).map(r => ({
      id: uid(), data: $('.p-data', r).value || hoje(), forma: $('.p-forma', r).value, valor: num($('.p-valor', r).value),
    })).filter(p => p.valor > 0);
    const total = totalAtual();
    if (r2(pagamentos.reduce((s, p) => s + p.valor, 0)) > total + 0.009 &&
        !confirm('Os pagamentos somam mais que o total da venda. Salvar mesmo assim?')) return;

    // cliente: existente pelo nome, ou cria automaticamente
    const nomeCli = f.cliente.value.trim();
    let clienteId = null, clienteNome = '';
    if (nomeCli) {
      let c = db.clientes.find(c => norm(c.nome) === norm(nomeCli));
      if (!c) {
        c = { id: uid(), nome: nomeCli, tipo: 'PF', doc: '', whatsapp: '', email: '', endereco: '', origem: f.canal.value, obs: '', criadoEm: hoje() };
        db.clientes.push(c);
        toast(`Cliente "${nomeCli}" cadastrado automaticamente`);
      }
      clienteId = c.id; clienteNome = c.nome;
    }

    const dados = {
      tipo: orc ? 'orcamento' : 'pedido',
      clienteId, clienteNome, canal: f.canal.value, data: f.data.value, entrega: orc ? '' : f.entrega.value,
      validade: orc ? f.validade.value : (v?.validade || ''),
      status: orc ? db.config.statusProducao[0] : f.status.value,
      itens, desconto: num(f.desconto.value), total, pagamentos, obs: f.obs.value.trim(),
    };
    const aprovando = v && ehOrc(v) && !orc;
    if (aprovando) { dados.dataOrcamento = v.data; dados.recusado = false; }
    if (v) {
      estornarEstoqueVenda(v.id);
      Object.assign(v, dados);
      atualizarFeito(v);
      baixarEstoqueVenda(v);
    } else {
      const nova = { id: uid(), numero: db.seq.venda++, criadoEm: new Date().toISOString(), ...dados };
      atualizarFeito(nova);
      db.vendas.push(nova);
      baixarEstoqueVenda(nova);
    }
    if (!v) abaPedidos = orc ? 'orcamento' : abaPedidos;
    salvar(); fecharModal(); render();
    toast(aprovando ? 'Orçamento aprovado e virou pedido' : v ? 'Alterações salvas' : orc ? 'Orçamento salvo' : 'Venda registrada');
  });
}

function abrirPagamento(id) {
  const v = db.vendas.find(x => x.id === id);
  const saldo = saldoVenda(v);
  abrirModal(`Receber — venda nº ${v.numero}`, `
    <form id="form-pag" class="form">
      <div class="totais">
        <div><span>Cliente</span><span>${esc(nomeCliente(v))}</span></div>
        <div><span>Total da venda</span><span>${brl(v.total)}</span></div>
        <div><span>Já pago</span><span>${brl(totalPago(v))}</span></div>
        <div class="saldo-aberto"><span>Falta receber</span><span>${brl(saldo)}</span></div>
      </div>
      <div class="row">
        <label>Valor<input type="number" step="0.01" min="0.01" name="valor" value="${saldo.toFixed(2)}" required /></label>
        <label>Forma<select name="forma">${opts(FORMAS, 'Pix')}</select></label>
        <label>Data<input type="date" name="data" value="${hoje()}" required /></label>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" type="submit">Confirmar recebimento</button>
      </div>
    </form>`);
  $('#form-pag').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    v.pagamentos.push({ id: uid(), data: f.data.value, forma: f.forma.value, valor: num(f.valor.value) });
    salvar(); fecharModal(); render(); toast('Pagamento registrado');
  });
}

function imprimirPedido(id) {
  const v = db.vendas.find(x => x.id === id);
  const c = getCliente(v.clienteId);
  const cfg = db.config;
  const orc = ehOrc(v);
  const nomeDoc = orc ? 'ORÇAMENTO' : 'PEDIDO';
  const w = window.open('', '_blank');
  if (!w) return alert('Permita pop-ups para imprimir.');
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${orc ? 'Orçamento' : 'Pedido'} ${v.numero}</title>
  <style>body{font-family:Inter,Arial,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#111;font-size:13px}
  h1{font-size:18px;margin:0}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{padding:7px;border-bottom:1px solid #ddd;text-align:left}
  .r{text-align:right}.head{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:12px}
  .tot td{font-weight:700;font-size:15px;border:0}.box{border:1px solid #ddd;border-radius:6px;padding:10px;margin-top:10px}
  .ass{margin-top:50px;display:flex;gap:40px}.ass div{flex:1;border-top:1px solid #111;text-align:center;padding-top:4px}</style></head><body>
  <div class="head"><div><h1>${esc(cfg.nome)}</h1>${cfg.cnpj ? `<div>CNPJ ${esc(cfg.cnpj)}</div>` : ''}<div>${esc(cfg.telefone)}</div><div>${esc(cfg.endereco)}</div></div>
  <div style="text-align:right"><h1>${nomeDoc} Nº ${v.numero}</h1><div>Data: ${fmtData(v.data)}</div>${orc && v.validade ? `<div>Válido até: <b>${fmtData(v.validade)}</b></div>` : ''}${!orc && v.entrega ? `<div>Entrega: <b>${fmtData(v.entrega)}</b></div>` : ''}</div></div>
  <div><b>Cliente:</b> ${esc(nomeCliente(v))}${c?.doc ? ` · ${esc(c.doc)}` : ''}${c?.whatsapp ? ` · ${esc(c.whatsapp)}` : ''}</div>
  <table><thead><tr><th>Descrição</th><th class="r">Qtd</th><th class="r">Unit.</th><th class="r">Subtotal</th></tr></thead><tbody>
  ${v.itens.map(i => `<tr><td>${esc(i.descricao)}</td><td class="r">${fmtQtd(i.qtd)}</td><td class="r">${brl(i.preco)}</td><td class="r">${brl(i.qtd * i.preco)}</td></tr>`).join('')}
  ${v.desconto ? `<tr><td colspan="3" class="r">Desconto</td><td class="r">− ${brl(v.desconto)}</td></tr>` : ''}
  <tr class="tot"><td colspan="3" class="r">TOTAL</td><td class="r">${brl(v.total)}</td></tr>
  ${orc ? '' : `<tr><td colspan="3" class="r">Pago</td><td class="r">${brl(totalPago(v))}</td></tr>
  <tr><td colspan="3" class="r"><b>Falta pagar</b></td><td class="r"><b>${brl(Math.max(0, saldoVenda(v)))}</b></td></tr>`}</tbody></table>
  ${v.obs ? `<div class="box"><b>Observações:</b> ${esc(v.obs)}</div>` : ''}
  ${orc ? `<div class="box">Prazo de produção a partir da aprovação da arte e do pagamento do sinal.${v.validade ? ` Valores válidos até ${fmtData(v.validade)}.` : ''}</div>` : ''}
  ${!orc && saldoVenda(v) > 0.009 && cfg.chavePix ? `<div class="box"><b>Pagamento por Pix:</b> chave ${esc(cfg.chavePix)}</div>` : ''}
  <div class="ass"><div>${esc(cfg.nome)}</div><div>${orc ? 'De acordo — cliente' : 'Cliente'}</div></div>
  <script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

/* ------------------------- BOLETOS E COBRANÇA ------------------------- */
// O boleto é emitido no app do banco; aqui fica registrado para controlar
// vencimento, cobrança e baixa.

const boletosAbertos = v => (v.boletos || []).filter(b => !b.pago);
function statusBoleto(b) {
  if (b.pago) return 'pago';
  const h = hoje();
  return b.vencimento < h ? 'vencido' : b.vencimento === h ? 'hoje' : 'aberto';
}
function badgeBoleto(b, vendaId) {
  const s = statusBoleto(b);
  const cls = { vencido: 'bad', hoje: 'warn', aberto: 'info', pago: 'good' }[s];
  const txt = { vencido: `Boleto vencido ${fmtData(b.vencimento).slice(0, 5)}`, hoje: 'Boleto vence hoje', aberto: `Boleto vence ${fmtData(b.vencimento).slice(0, 5)}`, pago: 'Boleto pago' }[s];
  return `<button class="badge ${cls}" title="Ver boleto" onclick="abrirBoletos('${vendaId}')">${txt}</button>`;
}

function abrirBoletos(id) {
  const v = db.vendas.find(x => x.id === id);
  v.boletos = v.boletos || [];
  const saldo = saldoVenda(v);
  const emAberto = r2(boletosAbertos(v).reduce((s, b) => s + num(b.valor), 0));
  const sugerido = Math.max(0, r2(saldo - emAberto));
  abrirModal(`Boletos — pedido nº ${v.numero}`, `
    <div class="totais" style="margin-bottom:14px">
      <div><span>Cliente</span><span>${esc(nomeCliente(v))}</span></div>
      <div><span>Falta receber</span><span>${brl(saldo)}</span></div>
      <div><span>Em boletos abertos</span><span>${brl(emAberto)}</span></div>
    </div>
    ${v.boletos.length ? `<div class="mini-list" style="margin-bottom:16px">${v.boletos.map(b => `
      <div class="mi"><div>
        <b>${brl(num(b.valor))} · vence ${fmtData(b.vencimento)}</b>
        <small>${b.pago ? `pago em ${fmtData(b.pagoEm)}` : esc(b.banco || '')}${b.codigo ? ` · <span class="nowrap">${esc(b.codigo.length > 40 ? b.codigo.slice(0, 40) + '…' : b.codigo)}</span>` : ''}</small>
      </div><div class="actions">
        ${badgeBoleto(b, v.id).replace(/onclick="[^"]*"/, '')}
        ${b.pago ? '' : `
          <button class="btn btn-primary btn-sm" onclick="boletoPago('${v.id}','${b.id}')">Pago</button>
          <button class="icon-btn" title="Cobrar no WhatsApp" onclick="cobrarWhats('${v.id}','${b.id}')">${ICON.wa}</button>
          ${b.codigo ? `<button class="icon-btn" title="Copiar link / linha digitável" onclick="copiarCodigo('${v.id}','${b.id}')">⧉</button>` : ''}`}
        <button class="icon-btn" title="Excluir registro" onclick="excluirBoleto('${v.id}','${b.id}')">${ICON.del}</button>
      </div></div>`).join('')}</div>` : ''}
    ${saldo > 0.009 ? `
    <form id="form-boleto" class="form">
      <h3 style="font-size:14px">Registrar boleto emitido</h3>
      <p class="hint" style="margin:0">Emita o boleto no app do seu banco e cole aqui o link ou a linha digitável. O painel avisa no vencimento e monta a mensagem de cobrança.</p>
      <div class="row">
        <label>Valor (R$)<input name="valor" type="number" step="0.01" min="0.01" value="${(sugerido || saldo).toFixed(2)}" required /></label>
        <label>Vencimento<input name="vencimento" type="date" value="${addDias(hoje(), 3)}" required /></label>
        <label>Banco / conta<input name="banco" value="${esc(db.config.bancoBoleto || '')}" placeholder="Ex.: Inter, Cora, Asaas" /></label>
      </div>
      <label>Link do boleto ou linha digitável<textarea name="codigo" rows="2" placeholder="Cole aqui o link ou o código de barras"></textarea></label>
      <label class="check"><input type="checkbox" name="enviar" checked /> Abrir o WhatsApp para enviar ao cliente</label>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="fecharModal()">Fechar</button>
        <button class="btn btn-primary" type="submit">Salvar boleto</button>
      </div>
    </form>` : '<div class="form-actions"><button class="btn btn-ghost" onclick="fecharModal()">Fechar</button></div>'}`, true);
  const f = $('#form-boleto');
  if (f) f.addEventListener('submit', e => {
    e.preventDefault();
    const b = { id: uid(), valor: num(f.valor.value), vencimento: f.vencimento.value, banco: f.banco.value.trim(), codigo: f.codigo.value.trim(), criadoEm: hoje(), pago: false };
    v.boletos.push(b);
    if (b.banco) db.config.bancoBoleto = b.banco;
    salvar(); render();
    if (f.enviar.checked) cobrarWhats(v.id, b.id);
    abrirBoletos(v.id);
    toast('Boleto registrado');
  });
}
function boletoPago(vid, bid) {
  const v = db.vendas.find(x => x.id === vid);
  const b = v.boletos.find(x => x.id === bid);
  const data = prompt('Data do pagamento (dd/mm/aaaa):', fmtData(hoje()));
  if (data === null) return;
  const m = data.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : hoje();
  b.pago = true; b.pagoEm = iso;
  v.pagamentos.push({ id: uid(), data: iso, forma: 'Boleto', valor: num(b.valor), boletoId: b.id });
  salvar(); render(); abrirBoletos(vid);
  toast(`Boleto de ${brl(num(b.valor))} baixado como pago`);
}
function excluirBoleto(vid, bid) {
  const v = db.vendas.find(x => x.id === vid);
  const b = v.boletos.find(x => x.id === bid);
  if (!confirm(b.pago ? 'Excluir este boleto? O pagamento lançado por ele também será removido.' : 'Excluir o registro deste boleto? (Lembre de cancelar no banco também.)')) return;
  v.pagamentos = v.pagamentos.filter(p => p.boletoId !== bid);
  v.boletos = v.boletos.filter(x => x.id !== bid);
  salvar(); render(); abrirBoletos(vid);
}
function copiarCodigo(vid, bid) {
  const b = db.vendas.find(x => x.id === vid).boletos.find(x => x.id === bid);
  navigator.clipboard?.writeText(b.codigo).then(() => toast('Copiado!'), () => prompt('Copie o código:', b.codigo));
}

function mensagemCobranca(v, b) {
  const cfg = db.config;
  const c = getCliente(v.clienteId);
  const nome = c?.tipo === 'PJ' ? c.nome : (nomeCliente(v) || '').split(' ')[0]; // empresa: nome completo
  const ola = nome && nome !== 'Balcão' ? `Olá, ${nome}! Tudo bem?` : 'Olá! Tudo bem?';
  const de = `Aqui é da ${cfg.nome || 'gráfica'}.`;
  const pix = cfg.chavePix ? `\n\nSe preferir, pode pagar por Pix — chave: ${cfg.chavePix}` : '';
  if (b) {
    const s = statusBoleto(b);
    const corpo = s === 'vencido'
      ? `Passando para lembrar que o boleto do pedido nº ${v.numero}, no valor de ${brl(num(b.valor))}, venceu em ${fmtData(b.vencimento)}.`
      : s === 'hoje'
        ? `Passando para lembrar que o boleto do pedido nº ${v.numero}, no valor de ${brl(num(b.valor))}, vence hoje.`
        : `Segue o boleto do pedido nº ${v.numero}, no valor de ${brl(num(b.valor))}, com vencimento em ${fmtData(b.vencimento)}.`;
    return `${ola} ${de}\n\n${corpo}${b.codigo ? `\n\n${b.codigo}` : ''}${pix}${s === 'vencido' ? '\n\nSe já pagou, por favor desconsidere esta mensagem. Obrigada!' : '\n\nQualquer dúvida, estou à disposição. Obrigada!'}`;
  }
  return `${ola} ${de}\n\nO pedido nº ${v.numero} (${resumoItens(v)}) está com saldo de ${brl(saldoVenda(v))} em aberto.${cfg.chavePix ? `\n\nPode pagar por Pix — chave: ${cfg.chavePix}` : '\n\nMe avisa a melhor forma de pagamento pra você?'}\n\nObrigada!`;
}
function cobrarWhats(vid, bid) {
  const v = db.vendas.find(x => x.id === vid);
  const b = bid ? (v.boletos || []).find(x => x.id === bid) : boletosAbertos(v)[0];
  const tel = linkWhats(getCliente(v.clienteId)?.whatsapp);
  const texto = encodeURIComponent(mensagemCobranca(v, b));
  window.open(tel ? `${tel}?text=${texto}` : `https://wa.me/?text=${texto}`, '_blank', 'noopener');
}

/* ----------------------------- CLIENTES ----------------------------- */

function statsCliente(id) {
  const vs = pedidos().filter(v => v.clienteId === id);
  return {
    orcamentos: db.vendas.filter(v => v.clienteId === id && ehOrc(v)).length,
    qtd: vs.length,
    total: r2(vs.reduce((s, v) => s + v.total, 0)),
    devendo: r2(vs.reduce((s, v) => s + Math.max(0, saldoVenda(v)), 0)),
    ultima: vs.map(v => v.data).sort().pop() || null,
    vendas: vs,
  };
}

function renderClientes() {
  const sel = $('#f-cli-origem'); const atual = sel.value;
  sel.innerHTML = opts(CANAIS, atual, 'Origem: todas');
  const q = norm($('#f-cli-busca').value), fo = sel.value;
  const lista = db.clientes.filter(c =>
    (!q || norm(`${c.nome} ${c.doc} ${c.whatsapp} ${c.email}`).includes(q) || (soDigitos(q) && soDigitos(`${c.doc}${c.whatsapp}`).includes(soDigitos(q)))) &&
    (!fo || c.origem === fo)
  ).sort((a, b) => a.nome.localeCompare(b.nome));
  const t = $('#tabela-clientes');
  if (!lista.length) { t.innerHTML = `<tbody><tr><td class="empty">${db.clientes.length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}</td></tr></tbody>`; return; }
  t.innerHTML = `<thead><tr><th>Cliente</th><th>Contato</th><th>Origem</th><th class="num">Pedidos</th><th class="num">Total comprado</th><th>Última compra</th><th class="num">Em aberto</th><th></th></tr></thead>
  <tbody>${lista.map(c => {
    const s = statsCliente(c.id);
    const wa = linkWhats(c.whatsapp);
    return `<tr>
      <td><span class="strong">${esc(c.nome)}</span><span class="sub-line">${esc(c.tipo)}${c.doc ? ' · ' + esc(c.doc) : ''}</span></td>
      <td>${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="link">${esc(c.whatsapp)}</a>` : '—'}${c.email ? `<span class="sub-line">${esc(c.email)}</span>` : ''}</td>
      <td>${esc(c.origem || '—')}</td>
      <td class="num">${s.qtd}</td>
      <td class="num strong">${brl(s.total)}</td>
      <td>${fmtData(s.ultima)}</td>
      <td class="num">${s.devendo > 0 ? `<span class="badge bad">${brl(s.devendo)}</span>` : '—'}</td>
      <td><div class="actions">
        <button class="icon-btn" title="Ver histórico" onclick="verCliente('${c.id}')">${ICON.view}</button>
        <button class="icon-btn" title="Editar" onclick="abrirCliente('${c.id}')">${ICON.edit}</button>
        <button class="icon-btn" title="Excluir" onclick="excluirCliente('${c.id}')">${ICON.del}</button>
      </div></td></tr>`;
  }).join('')}</tbody>`;
}

function abrirCliente(id) {
  const c = id ? getCliente(id) : {};
  abrirModal(id ? 'Editar cliente' : 'Novo cliente', `
    <form id="form-cliente" class="form">
      <label>Nome / Razão social<input name="nome" value="${esc(c.nome || '')}" required /></label>
      <div class="row">
        <label>Tipo<select name="tipo">${opts([['PF', 'Pessoa física'], ['PJ', 'Empresa (PJ)']], c.tipo || 'PF')}</select></label>
        <label>CPF / CNPJ<input name="doc" value="${esc(c.doc || '')}" /></label>
      </div>
      <div class="row">
        <label>WhatsApp<input name="whatsapp" value="${esc(c.whatsapp || '')}" placeholder="(00) 00000-0000" inputmode="tel" /></label>
        <label>E-mail<input name="email" type="email" value="${esc(c.email || '')}" /></label>
      </div>
      <div class="row">
        <label>Endereço<input name="endereco" value="${esc(c.endereco || '')}" /></label>
        <label>Como conheceu / origem<select name="origem">${opts(CANAIS, c.origem || 'Loja física')}</select></label>
      </div>
      <label>Observações (preferências, segmento, aniversário…)<textarea name="obs" rows="2">${esc(c.obs || '')}</textarea></label>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" type="submit">Salvar</button>
      </div>
    </form>`);
  $('#form-cliente').addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    d.nome = d.nome.trim();
    if (db.clientes.some(x => x.id !== id && norm(x.nome) === norm(d.nome)) && !confirm('Já existe um cliente com esse nome. Salvar mesmo assim?')) return;
    if (id) Object.assign(c, d); else db.clientes.push({ id: uid(), criadoEm: hoje(), ...d });
    salvar(); fecharModal(); render(); toast('Cliente salvo');
  });
}
function verCliente(id) {
  const c = getCliente(id), s = statsCliente(id);
  const wa = linkWhats(c.whatsapp);
  abrirModal(c.nome, `
    <div class="kpis kpis-3" style="margin-bottom:16px">
      <div class="kpi"><span>Pedidos</span><strong>${s.qtd}</strong><small>${s.orcamentos} orçamento(s) pedido(s)</small></div>
      <div class="kpi"><span>Total comprado</span><strong>${brl(s.total)}</strong><small>ticket médio ${brl(s.qtd ? s.total / s.qtd : 0)}</small></div>
      <div class="kpi ${s.devendo ? 'is-bad' : ''}"><span>Em aberto</span><strong>${brl(s.devendo)}</strong></div>
    </div>
    <p class="muted">${esc([c.tipo, c.doc, c.whatsapp, c.email, c.endereco].filter(Boolean).join(' · '))}</p>
    ${c.obs ? `<p class="hint">${esc(c.obs)}</p>` : ''}
    <div class="table-wrap"><table class="table">
      ${s.vendas.length ? `<thead><tr><th>Nº</th><th>Data</th><th>Itens</th><th class="num">Total</th><th class="num">Saldo</th></tr></thead><tbody>
      ${s.vendas.sort((a, b) => b.data.localeCompare(a.data)).map(v => `<tr><td>${v.numero}</td><td>${fmtData(v.data)}</td><td>${esc(resumoItens(v))}</td><td class="num">${brl(v.total)}</td><td class="num">${saldoVenda(v) > 0.009 ? brl(saldoVenda(v)) : '—'}</td></tr>`).join('')}</tbody>`
      : '<tbody><tr><td class="empty">Ainda sem compras.</td></tr></tbody>'}
    </table></div>
    <div class="form-actions" style="margin-top:14px">
      ${wa ? `<a class="btn btn-ghost" href="${wa}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>` : ''}
      <button class="btn btn-primary" onclick="fecharModal();abrirVenda();setTimeout(()=>{document.querySelector('#form-venda').cliente.value=${esc(JSON.stringify(c.nome))}},0)">+ Nova venda para este cliente</button>
    </div>`, true);
}
function excluirCliente(id) {
  const c = getCliente(id), s = statsCliente(id);
  if (!confirm(`Excluir ${c.nome}?${s.qtd ? `\nAs ${s.qtd} venda(s) dele(a) continuam registradas com o nome.` : ''}`)) return;
  db.vendas.forEach(v => { if (v.clienteId === id) { v.clienteId = null; v.clienteNome = c.nome; } });
  db.clientes = db.clientes.filter(x => x.id !== id);
  salvar(); render(); toast('Cliente excluído');
}

/* ----------------------------- PRODUTOS ----------------------------- */

function margem(p) { return num(p.preco) > 0 ? (num(p.preco) - num(p.custo)) / num(p.preco) : 0; }

function renderProdutos() {
  const sel = $('#f-prod-cat'); const atual = sel.value;
  const cats = [...new Set([...CATEGORIAS_PRODUTO, ...db.produtos.map(p => p.categoria)])].filter(Boolean);
  sel.innerHTML = opts(cats, atual, 'Categoria: todas');
  const q = norm($('#f-prod-busca').value), fc = sel.value;
  const lista = db.produtos.filter(p => (!q || norm(`${p.nome} ${p.categoria} ${p.obs}`).includes(q)) && (!fc || p.categoria === fc))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nome.localeCompare(b.nome));
  const t = $('#tabela-produtos');
  if (!lista.length) { t.innerHTML = `<tbody><tr><td class="empty">${db.produtos.length ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}</td></tr></tbody>`; return; }
  const vendidos = {};
  pedidos().forEach(v => v.itens.forEach(i => { if (i.produtoId) vendidos[i.produtoId] = (vendidos[i.produtoId] || 0) + num(i.qtd); }));
  t.innerHTML = `<thead><tr><th>Produto</th><th>Categoria</th><th class="num">Custo</th><th class="num">Preço</th><th class="num">Margem</th><th>Prazo</th><th>Baixa no estoque</th><th class="num">Vendidos</th><th></th></tr></thead>
  <tbody>${lista.map(p => {
    const m = margem(p);
    const item = getItem(p.estoqueItemId);
    return `<tr style="${p.ativo === false ? 'opacity:.5' : ''}">
      <td><span class="strong">${esc(p.nome)}</span><span class="sub-line">por ${esc(p.unidade)}${p.ativo === false ? ' · inativo' : ''}</span></td>
      <td>${esc(p.categoria)}</td>
      <td class="num">${brl(num(p.custo))}</td>
      <td class="num strong">${brl(num(p.preco))}</td>
      <td class="num"><span class="badge ${m < .3 ? 'bad' : m < .5 ? 'warn' : 'good'}">${(m * 100).toFixed(0)}%</span></td>
      <td class="nowrap">${p.prazo ? esc(p.prazo) + (p.prazo == 1 ? ' dia' : ' dias') : '—'}</td>
      <td>${item ? `${fmtQtd(p.consumo || 1)} ${esc(item.unidade)} de ${esc(item.nome)}` : '<span class="muted">—</span>'}</td>
      <td class="num">${fmtQtd(vendidos[p.id] || 0)}</td>
      <td><div class="actions">
        <button class="icon-btn" title="Editar" onclick="abrirProduto('${p.id}')">${ICON.edit}</button>
        <button class="icon-btn" title="Excluir" onclick="excluirProduto('${p.id}')">${ICON.del}</button>
      </div></td></tr>`;
  }).join('')}</tbody>`;
}

function abrirProduto(id) {
  const p = id ? getProduto(id) : { ativo: true, unidade: 'un', categoria: CATEGORIAS_PRODUTO[0] };
  const cats = [...new Set([...CATEGORIAS_PRODUTO, ...db.produtos.map(x => x.categoria)])].filter(Boolean);
  abrirModal(id ? 'Editar produto' : 'Novo produto', `
    <form id="form-produto" class="form">
      <label>Nome do produto<input name="nome" value="${esc(p.nome || '')}" placeholder="Ex.: Cartão de visita 4x4 couchê 300g fosco" required /></label>
      <div class="row">
        <label>Categoria<input name="categoria" list="dl-cats" value="${esc(p.categoria || '')}" required /><datalist id="dl-cats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label>Vendido por<select name="unidade">${opts(UNIDADES, p.unidade)}</select></label>
        <label>Prazo de produção (dias)<input name="prazo" type="number" min="0" value="${esc(p.prazo || '')}" /></label>
      </div>
      <div class="row">
        <label>Custo (R$)<input name="custo" type="number" step="0.01" min="0" value="${p.custo ?? ''}" placeholder="material + impressão + acabamento" /></label>
        <label>Preço de venda (R$)<input name="preco" type="number" step="0.01" min="0" value="${p.preco ?? ''}" required /></label>
        <label>Calcular preço p/ margem de<input id="margem-alvo" type="number" min="1" max="95" placeholder="% ex.: 60" /></label>
      </div>
      <div class="calc" id="prod-calc"></div>
      <fieldset><legend>Baixa automática no estoque (opcional)</legend>
        <div class="row">
          <label>Ao vender, consome o item<select name="estoqueItemId">${opts(db.estoque.map(i => [i.id, `${i.nome} (${i.unidade})`]), p.estoqueItemId, '— não controla estoque —')}</select></label>
          <label>Quantidade consumida por unidade vendida<input name="consumo" type="number" step="any" min="0" value="${p.consumo ?? 1}" /></label>
        </div>
        <small class="muted">Ex.: "Caneca personalizada" consome 1 un de "Caneca branca 325ml". Produtos sob demanda (banner, cartão) podem ficar sem vínculo.</small>
      </fieldset>
      <label>Observações (especificações, acabamentos)<textarea name="obs" rows="2">${esc(p.obs || '')}</textarea></label>
      <label class="check"><input type="checkbox" name="ativo" ${p.ativo !== false ? 'checked' : ''} /> Produto ativo (aparece nas vendas)</label>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" type="submit">Salvar</button>
      </div>
    </form>`, true);
  const f = $('#form-produto');
  const calc = () => {
    const c = num(f.custo.value), pr = num(f.preco.value);
    if (!pr) { $('#prod-calc').innerHTML = 'Informe custo e preço para ver a margem.'; return; }
    const m = (pr - c) / pr, mk = c ? pr / c : 0;
    $('#prod-calc').innerHTML = `Lucro por unidade: <b>${brl(pr - c)}</b> · Margem: <b style="color:var(--${m < .3 ? 'bad' : m < .5 ? 'warn' : 'good'})">${(m * 100).toFixed(1)}%</b>${c ? ` · Markup: <b>${mk.toFixed(2)}×</b> o custo` : ''}`;
  };
  f.addEventListener('input', calc);
  $('#margem-alvo').addEventListener('input', e => {
    const m = num(e.target.value) / 100, c = num(f.custo.value);
    if (c && m > 0 && m < 1) { f.preco.value = (c / (1 - m)).toFixed(2); calc(); }
  });
  calc();
  f.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const dados = { nome: d.nome.trim(), categoria: d.categoria.trim(), unidade: d.unidade, prazo: d.prazo, custo: num(d.custo), preco: num(d.preco),
      estoqueItemId: d.estoqueItemId || null, consumo: num(d.consumo) || 1, obs: d.obs, ativo: !!f.ativo.checked };
    if (id) Object.assign(p, dados); else db.produtos.push({ id: uid(), ...dados });
    salvar(); fecharModal(); render(); toast('Produto salvo');
  });
}
function excluirProduto(id) {
  const p = getProduto(id);
  const usado = db.vendas.some(v => v.itens.some(i => i.produtoId === id));
  if (usado) {
    if (confirm(`"${p.nome}" já aparece em vendas. Em vez de excluir, deseja desativá-lo (some da lista de vendas, mas mantém o histórico)?`)) {
      p.ativo = false; salvar(); render(); toast('Produto desativado');
    }
    return;
  }
  if (!confirm(`Excluir "${p.nome}"?`)) return;
  db.produtos = db.produtos.filter(x => x.id !== id);
  salvar(); render(); toast('Produto excluído');
}

/* ------------------------------ ESTOQUE ------------------------------ */

function renderEstoque() {
  const baixos = db.estoque.filter(i => nivelEstoque(i) === 'baixo').length;
  const zerados = db.estoque.filter(i => nivelEstoque(i) === 'zerado').length;
  const valor = r2(db.estoque.reduce((s, i) => s + Math.max(0, num(i.qtd)) * num(i.custo), 0));
  $('#kpis-estoque').innerHTML = `
    <div class="kpi"><span>Valor parado em estoque</span><strong>${brl(valor)}</strong><small>${db.estoque.length} item(ns) cadastrados</small></div>
    <div class="kpi ${baixos ? 'is-warn' : ''}"><span>Abaixo do mínimo</span><strong>${baixos}</strong><small>repor em breve</small></div>
    <div class="kpi ${zerados ? 'is-bad' : ''}"><span>Zerados</span><strong>${zerados}</strong><small>sem material</small></div>`;

  const sel = $('#f-est-cat'); const atual = sel.value;
  const cats = [...new Set([...CATEGORIAS_ESTOQUE, ...db.estoque.map(i => i.categoria)])].filter(Boolean);
  sel.innerHTML = opts(cats, atual, 'Categoria: todas');
  const q = norm($('#f-est-busca').value), fc = sel.value, soBaixo = $('#f-est-baixo').checked;
  const ordem = { zerado: 0, baixo: 1, ok: 2 };
  const lista = db.estoque.filter(i => (!q || norm(`${i.nome} ${i.fornecedor} ${i.categoria}`).includes(q)) && (!fc || i.categoria === fc) && (!soBaixo || nivelEstoque(i) !== 'ok'))
    .sort((a, b) => ordem[nivelEstoque(a)] - ordem[nivelEstoque(b)] || a.nome.localeCompare(b.nome));
  const t = $('#tabela-estoque');
  if (!lista.length) { t.innerHTML = `<tbody><tr><td class="empty">${db.estoque.length ? 'Nenhum item encontrado.' : 'Cadastre seus insumos (papéis, lonas, tintas) e produtos de revenda (canecas, camisetas…).'}</td></tr></tbody>`; return; }
  t.innerHTML = `<thead><tr><th>Item</th><th>Categoria</th><th class="num">Quantidade</th><th class="num">Mínimo</th><th>Situação</th><th class="num">Custo un.</th><th>Fornecedor</th><th></th></tr></thead>
  <tbody>${lista.map(i => {
    const n = nivelEstoque(i);
    return `<tr>
      <td class="strong">${esc(i.nome)}</td>
      <td>${esc(i.categoria)}</td>
      <td class="num strong">${fmtQtd(i.qtd)} ${esc(i.unidade)}</td>
      <td class="num">${fmtQtd(i.minimo)}</td>
      <td><span class="badge ${n === 'ok' ? 'good' : n === 'baixo' ? 'warn' : 'bad'}">${n === 'ok' ? '✓ OK' : n === 'baixo' ? '▲ Baixo' : '✕ Zerado'}</span></td>
      <td class="num">${brl(num(i.custo))}</td>
      <td>${esc(i.fornecedor || '—')}</td>
      <td><div class="actions">
        <button class="icon-btn" title="Entrada (compra)" onclick="abrirMovimento('${i.id}','entrada')">${ICON.in}</button>
        <button class="icon-btn" title="Saída / perda / ajuste" onclick="abrirMovimento('${i.id}','saida')">${ICON.out}</button>
        <button class="icon-btn" title="Histórico" onclick="verMovimentos('${i.id}')">${ICON.hist}</button>
        <button class="icon-btn" title="Editar" onclick="abrirItemEstoque('${i.id}')">${ICON.edit}</button>
        <button class="icon-btn" title="Excluir" onclick="excluirItemEstoque('${i.id}')">${ICON.del}</button>
      </div></td></tr>`;
  }).join('')}</tbody>`;
}

function abrirItemEstoque(id) {
  const i = id ? getItem(id) : { unidade: 'un', categoria: CATEGORIAS_ESTOQUE[0] };
  const cats = [...new Set([...CATEGORIAS_ESTOQUE, ...db.estoque.map(x => x.categoria)])].filter(Boolean);
  abrirModal(id ? 'Editar item de estoque' : 'Novo item de estoque', `
    <form id="form-item" class="form">
      <label>Nome do item<input name="nome" value="${esc(i.nome || '')}" placeholder="Ex.: Papel couchê 300g A3" required /></label>
      <div class="row">
        <label>Categoria<input name="categoria" list="dl-cats-est" value="${esc(i.categoria || '')}" required /><datalist id="dl-cats-est">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label>Unidade<select name="unidade">${opts(UNIDADES, i.unidade)}</select></label>
      </div>
      <div class="row">
        ${id ? '' : `<label>Quantidade atual<input name="qtd" type="number" step="any" value="0" /></label>`}
        <label>Estoque mínimo (alerta)<input name="minimo" type="number" step="any" min="0" value="${i.minimo ?? ''}" /></label>
        <label>Custo por unidade (R$)<input name="custo" type="number" step="0.01" min="0" value="${i.custo ?? ''}" /></label>
      </div>
      <label>Fornecedor<input name="fornecedor" value="${esc(i.fornecedor || '')}" /></label>
      ${id ? '<small class="muted">Para mudar a quantidade, use os botões de entrada / saída — assim fica registrado no histórico.</small>' : ''}
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" type="submit">Salvar</button>
      </div>
    </form>`);
  $('#form-item').addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    const dados = { nome: d.nome.trim(), categoria: d.categoria.trim(), unidade: d.unidade, minimo: num(d.minimo), custo: num(d.custo), fornecedor: d.fornecedor };
    if (id) Object.assign(i, dados);
    else {
      const novo = { id: uid(), qtd: 0, ...dados };
      db.estoque.push(novo);
      if (num(d.qtd)) movimentar(novo.id, num(d.qtd), 'Estoque inicial');
    }
    salvar(); fecharModal(); render(); toast('Item salvo');
  });
}
function abrirMovimento(id, tipo) {
  const i = getItem(id);
  const entrada = tipo === 'entrada';
  abrirModal(`${entrada ? 'Entrada' : 'Saída / ajuste'} — ${i.nome}`, `
    <form id="form-mov" class="form">
      <p class="muted" style="margin:0">Estoque atual: <b>${fmtQtd(i.qtd)} ${esc(i.unidade)}</b></p>
      <div class="row">
        ${entrada ? '' : `<label>Tipo<select name="modo">${opts([['saida', 'Saída / consumo / perda'], ['ajuste', 'Ajuste: contei e o estoque real é…']], 'saida')}</select></label>`}
        <label id="lbl-qtd">Quantidade (${esc(i.unidade)})<input name="qtd" type="number" step="any" min="0" required /></label>
        ${entrada ? `<label>Custo por unidade nesta compra (R$)<input name="custo" type="number" step="0.01" min="0" value="${i.custo ?? ''}" /></label>` : ''}
      </div>
      <label>Motivo / observação<input name="motivo" placeholder="${entrada ? 'Ex.: Compra NF 1234 — fornecedor' : 'Ex.: Perda na impressão, uso interno…'}" /></label>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" type="submit">Confirmar</button>
      </div>
    </form>`);
  const f = $('#form-mov');
  if (f.modo) f.modo.addEventListener('change', () => {
    $('#lbl-qtd').firstChild.textContent = f.modo.value === 'ajuste' ? `Quantidade real contada (${i.unidade})` : `Quantidade (${i.unidade})`;
  });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const q = num(f.qtd.value);
    if (entrada) {
      if (num(f.custo.value)) i.custo = num(f.custo.value);
      movimentar(id, q, f.motivo.value || 'Entrada / compra');
    } else if (f.modo.value === 'ajuste') {
      movimentar(id, r2(q - num(i.qtd)), f.motivo.value || 'Ajuste de inventário');
    } else {
      movimentar(id, -q, f.motivo.value || 'Saída manual');
    }
    salvar(); fecharModal(); render(); toast('Estoque atualizado');
  });
}
function verMovimentos(id) {
  const i = getItem(id);
  const movs = db.movimentos.filter(m => m.itemId === id).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  abrirModal(`Histórico — ${i.nome}`, `<div class="table-wrap"><table class="table">
    ${movs.length ? `<thead><tr><th>Data</th><th>Movimento</th><th class="num">Qtd</th></tr></thead><tbody>
    ${movs.map(m => `<tr><td>${fmtData(m.data)}</td><td>${esc(m.motivo)}</td><td class="num"><span class="badge ${m.delta > 0 ? 'good' : 'bad'}">${m.delta > 0 ? '+' : ''}${fmtQtd(m.delta)} ${esc(i.unidade)}</span></td></tr>`).join('')}</tbody>`
    : '<tbody><tr><td class="empty">Sem movimentações.</td></tr></tbody>'}</table></div>`, true);
}
function excluirItemEstoque(id) {
  const i = getItem(id);
  if (!confirm(`Excluir "${i.nome}" do estoque? Produtos vinculados deixarão de dar baixa.`)) return;
  db.estoque = db.estoque.filter(x => x.id !== id);
  db.movimentos = db.movimentos.filter(m => m.itemId !== id);
  db.produtos.forEach(p => { if (p.estoqueItemId === id) p.estoqueItemId = null; });
  salvar(); render(); toast('Item excluído');
}

/* ------------------------------ SEMANAL ------------------------------ */

let semanaInicio = null; // segunda-feira da semana aberta

function inicioSemana(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // segunda = 0
  return addDias(iso, -dow);
}
function mudarSemana(n) {
  semanaInicio = n === 0 ? inicioSemana(hoje()) : addDias(semanaInicio || inicioSemana(hoje()), 7 * n);
  renderSemanal();
}
function resumoSemana(ini, nDias = 7) {
  const fim = addDias(ini, nDias - 1);
  const dentro = d => d && d >= ini && d <= fim;
  const peds = pedidos().filter(v => dentro(v.data));
  const vendido = r2(peds.reduce((s, v) => s + v.total, 0));
  let recebido = 0;
  pedidos().forEach(v => (v.pagamentos || []).forEach(p => { if (dentro(p.data)) recebido += num(p.valor); }));
  recebido = r2(recebido);
  const despesas = r2(db.caixa.filter(c => c.tipo === 'despesa' && dentro(c.data)).reduce((s, c) => s + num(c.valor), 0));
  // orçamentos criados na semana (inclusive os que já viraram pedido)
  const orcs = db.vendas.filter(v => dentro(ehOrc(v) ? v.data : v.dataOrcamento));
  const aprovados = orcs.filter(v => !ehOrc(v)).length;
  const recusados = orcs.filter(v => ehOrc(v) && v.recusado).length;
  const feitos = pedidos().filter(v => dentro(v.feitoEm)).length;
  const produtos = {};
  peds.forEach(v => v.itens.forEach(i => {
    const k = i.descricao;
    produtos[k] = produtos[k] || { nome: k, qtd: 0, valor: 0 };
    produtos[k].qtd += num(i.qtd); produtos[k].valor += num(i.qtd) * num(i.preco);
  }));
  return {
    ini, fim, peds, vendido, recebido, despesas, saldo: r2(recebido - despesas),
    ticket: peds.length ? r2(vendido / peds.length) : 0,
    orcs: orcs.length, aprovados, recusados,
    conversao: orcs.length ? aprovados / orcs.length : null,
    feitos,
    top: Object.values(produtos).sort((a, b) => b.valor - a.valor).slice(0, 5),
  };
}
function variacao(atual, anterior, parcial) {
  const ref = parcial ? 'mesmo período da semana passada' : 'semana anterior';
  if (!anterior) return atual ? `<span class="delta">sem vendas no ${ref}</span>` : '';
  const p = (atual - anterior) / anterior * 100;
  return `<span class="delta">${p >= 0 ? '▲' : '▼'} ${Math.abs(p).toFixed(0)}% vs ${ref}</span>`;
}
function fmtSemana(ini) {
  const fim = addDias(ini, 6);
  return `${fmtData(ini).slice(0, 5)} a ${fmtData(fim)}`;
}

function renderSemanal() {
  if (!semanaInicio) semanaInicio = inicioSemana(hoje());
  const ini = semanaInicio;
  const atualSemana = inicioSemana(hoje());
  const s = resumoSemana(ini);
  // semana em curso: compara com os mesmos dias da semana passada (seg→hoje)
  const parcial = ini === atualSemana;
  const diasCorridos = parcial ? (new Date().getDay() + 6) % 7 + 1 : 7;
  const ant = resumoSemana(addDias(ini, -7), diasCorridos);
  $('#semana-titulo').textContent = `Semana de ${fmtSemana(ini)}${ini === atualSemana ? ' (atual)' : ''}`;

  const dias = [...Array(7)].map((_, i) => addDias(ini, i));
  const linhas = dias.map(d => {
    const r = resumoDia(d);
    return { d, n: r.qtdVendas, vendido: r.faturado, recebido: r.recebido, despesas: r.despesas, fechado: !!r.fech, futuro: d > hoje() };
  });

  $('#semana-conteudo').innerHTML = `
    <div class="kpis kpis-4" style="margin-bottom:14px">
      <div class="kpi"><span>Vendido na semana</span><strong>${brl(s.vendido)}</strong>${variacao(s.vendido, ant.vendido, parcial)}</div>
      <div class="kpi"><span>Recebido</span><strong>${brl(s.recebido)}</strong><small>entrou no caixa</small></div>
      <div class="kpi"><span>Despesas</span><strong>${brl(s.despesas)}</strong><small>lançadas no fechamento</small></div>
      <div class="kpi ${s.saldo < 0 ? 'is-bad' : ''}"><span>Saldo da semana</span><strong>${brl(s.saldo)}</strong><small>recebido − despesas</small></div>
    </div>
    <div class="kpis kpis-4" style="margin-bottom:18px">
      <div class="kpi"><span>Pedidos fechados</span><strong>${s.peds.length}</strong><small>ticket médio ${brl(s.ticket)}</small></div>
      <div class="kpi"><span>Orçamentos feitos</span><strong>${s.orcs}</strong><small>${s.aprovados} aprovado(s) · ${s.recusados} recusado(s)</small></div>
      <div class="kpi ${s.conversao !== null && s.conversao < .3 ? 'is-warn' : ''}"><span>Conversão de orçamentos</span><strong>${s.conversao === null ? '—' : (s.conversao * 100).toFixed(0) + '%'}</strong><small>orçamentos que viraram pedido</small></div>
      <div class="kpi"><span>Pedidos feitos</span><strong>${s.feitos}</strong><small>concluídos nesta semana</small></div>
    </div>
    <div class="grid-2">
      <div class="box">
        <h4>Dia a dia</h4>
        <div class="table-wrap" style="margin:0;padding:0"><table class="table">
          <thead><tr><th>Dia</th><th class="num">Pedidos</th><th class="num">Vendido</th><th class="num">Recebido</th><th class="num">Despesas</th><th>Caixa</th></tr></thead>
          <tbody>${linhas.map(l => `<tr class="clicavel" title="Abrir fechamento do dia" onclick="abrirFechamento('${l.d}')">
            <td class="strong">${diaSemana(l.d)} <span class="muted">${fmtData(l.d).slice(0, 5)}</span></td>
            <td class="num">${l.n || '<span class="muted">—</span>'}</td>
            <td class="num">${l.vendido ? brl(l.vendido) : '<span class="muted">—</span>'}</td>
            <td class="num">${l.recebido ? brl(l.recebido) : '<span class="muted">—</span>'}</td>
            <td class="num">${l.despesas ? brl(l.despesas) : '<span class="muted">—</span>'}</td>
            <td>${l.fechado ? '<span class="badge good">✓ Fechado</span>' : l.futuro ? '' : (l.n || l.recebido) ? '<span class="badge warn">Aberto</span>' : '<span class="muted small">sem movimento</span>'}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><td>Total</td><td class="num">${s.peds.length}</td><td class="num">${brl(s.vendido)}</td><td class="num">${brl(s.recebido)}</td><td class="num">${brl(s.despesas)}</td><td></td></tr></tfoot>
        </table></div>
      </div>
      <div class="box">
        <h4>Mais vendidos da semana</h4>
        ${s.top.length ? s.top.map((p, i) => `<div class="line"><span>${i + 1}. ${esc(p.nome)}<span class="sub-line">${fmtQtd(p.qtd)} vendido(s)</span></span><span>${brl(p.valor)}</span></div>`).join('')
          : '<div class="muted">Nenhuma venda nesta semana.</div>'}
      </div>
    </div>`;

  const semanas = [...Array(8)].map((_, i) => resumoSemana(addDias(atualSemana, -7 * i)));
  $('#tabela-semanas').innerHTML = `<thead><tr><th>Semana</th><th class="num">Pedidos</th><th class="num">Vendido</th><th class="num">Recebido</th><th class="num">Saldo</th><th class="num">Orçamentos</th><th class="num">Conversão</th><th class="num">Feitos</th></tr></thead>
    <tbody>${semanas.map(w => `<tr class="clicavel${w.ini === ini ? ' atual' : ''}" onclick="semanaInicio='${w.ini}';renderSemanal();window.scrollTo(0,0)">
      <td class="strong nowrap">${fmtSemana(w.ini)}${w.ini === atualSemana ? ' <span class="badge info">atual</span>' : ''}</td>
      <td class="num">${w.peds.length}</td><td class="num">${brl(w.vendido)}</td><td class="num">${brl(w.recebido)}</td><td class="num">${brl(w.saldo)}</td>
      <td class="num">${w.orcs}</td><td class="num">${w.conversao === null ? '—' : (w.conversao * 100).toFixed(0) + '%'}</td><td class="num">${w.feitos}</td></tr>`).join('')}</tbody>`;
}
function abrirFechamento(data) {
  $('#fech-data').value = data;
  irPara('fechamento');
}

/* ---------------------------- FECHAMENTO ---------------------------- */

function renderFechamento() {
  const inp = $('#fech-data');
  if (!inp.value) inp.value = hoje();
  const data = inp.value;
  const r = resumoDia(data);
  const fechado = !!r.fech;
  $('#fech-status').innerHTML = fechado
    ? `<span class="badge good">✓ Caixa fechado em ${new Date(r.fech.fechadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>`
    : `<span class="badge warn">Caixa aberto</span>`;

  const formas = FORMAS.filter(f => r.porForma[f]).concat(Object.keys(r.porForma).filter(f => !FORMAS.includes(f)));
  const tipoNome = { despesa: 'Despesa', sangria: 'Sangria (retirada)', suprimento: 'Suprimento (reforço)' };
  const contado = fechado ? r.fech.contado : '';

  $('#fech-conteudo').innerHTML = `
    <h2 style="margin-bottom:14px">Fechamento de ${fmtData(data)} <span class="muted small">(${diaSemana(data)})</span></h2>
    <div class="kpis kpis-4" style="margin-bottom:18px">
      <div class="kpi"><span>Vendido no dia</span><strong>${brl(r.faturado)}</strong><small>${r.qtdVendas} venda(s)</small></div>
      <div class="kpi"><span>Ticket médio</span><strong>${brl(r.ticket)}</strong></div>
      <div class="kpi"><span>Recebido no dia</span><strong>${brl(r.recebido)}</strong><small>inclui pagamentos de vendas antigas</small></div>
      <div class="kpi"><span>Saldo do dia</span><strong>${brl(r.recebido - r.despesas)}</strong><small>recebido − despesas</small></div>
    </div>
    <div class="fech-grid">
      <div class="box">
        <h4>Recebimentos por forma</h4>
        ${formas.length ? formas.map(f => `<div class="line"><span>${esc(f)}</span><span>${brl(r.porForma[f])}</span></div>`).join('') : '<div class="muted">Nenhum recebimento.</div>'}
        <div class="line total"><span>Total recebido</span><span>${brl(r.recebido)}</span></div>
        ${r.aReceberGerado > 0 ? `<div class="line"><span class="muted">Vendido hoje e ainda a receber</span><span class="muted">${brl(r.aReceberGerado)}</span></div>` : ''}
      </div>
      <div class="box">
        <h4>Vendas por canal</h4>
        ${Object.keys(r.porCanal).length ? Object.entries(r.porCanal).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<div class="line"><span>${esc(c)}</span><span>${brl(v)}</span></div>`).join('') : '<div class="muted">Nenhuma venda.</div>'}
      </div>
      <div class="box">
        <h4>Despesas, sangrias e suprimentos</h4>
        ${r.lanc.length ? r.lanc.map(l => `<div class="line ${l.tipo !== 'suprimento' ? 'neg' : ''}"><span>${tipoNome[l.tipo]}${l.descricao ? ' — ' + esc(l.descricao) : ''}<span class="sub-line">${esc(l.forma || 'Dinheiro')}</span></span>
          <span>${l.tipo === 'suprimento' ? '+' : '−'} ${brl(num(l.valor))} ${fechado ? '' : `<button class="icon-btn" title="Remover" onclick="excluirLancamento('${l.id}')">${ICON.del}</button>`}</span></div>`).join('') : '<div class="muted">Nenhum lançamento.</div>'}
      </div>
      <div class="box">
        <h4>Dinheiro na gaveta</h4>
        <div class="line"><span>Fundo de caixa (troco inicial)</span><span>${brl(r.fundo)}</span></div>
        <div class="line"><span>+ Recebido em dinheiro</span><span>${brl(r.porForma['Dinheiro'] || 0)}</span></div>
        <div class="line"><span>+ Suprimentos</span><span>${brl(r.suprimentos)}</span></div>
        <div class="line neg"><span>− Sangrias</span><span>${brl(r.sangrias)}</span></div>
        <div class="line neg"><span>− Despesas pagas em dinheiro</span><span>${brl(r.despesasDinheiro)}</span></div>
        <div class="line total"><span>Deveria ter na gaveta</span><span>${brl(r.dinheiroEsperado)}</span></div>
      </div>
    </div>
    <div class="conferencia">
      <div class="row">
        <label>Fundo de caixa do dia<input type="number" step="0.01" min="0" id="fech-fundo" value="${r.fundo}" ${fechado ? 'disabled' : ''} /></label>
        <label>Valor contado na gaveta<input type="number" step="0.01" min="0" id="fech-contado" value="${contado}" placeholder="conte o dinheiro" ${fechado ? 'disabled' : ''} /></label>
        <div><span class="muted small">Diferença</span><div id="fech-diff" class="diff">—</div></div>
      </div>
      <label>Observações do dia<textarea id="fech-obs" rows="2" ${fechado ? 'disabled' : ''}>${esc(r.fech?.obs || '')}</textarea></label>
      <div class="form-actions">
        ${fechado ? `<button class="btn btn-ghost" onclick="reabrirCaixa('${data}')">Reabrir caixa</button>`
                  : `<button class="btn btn-primary" onclick="fecharCaixa('${data}')">✓ Fechar caixa do dia</button>`}
      </div>
    </div>`;

  const atualizarDiff = () => {
    const fundo = num($('#fech-fundo').value);
    const esperado = r2(r.dinheiroEsperado - r.fundo + fundo);
    const c = $('#fech-contado').value;
    const el = $('#fech-diff');
    if (c === '') { el.textContent = '—'; el.className = 'diff'; return; }
    const d = r2(num(c) - esperado);
    el.textContent = d === 0 ? 'Bateu! ✓' : `${d > 0 ? 'Sobra' : 'Falta'} ${brl(Math.abs(d))}`;
    el.className = 'diff ' + (d === 0 ? 'ok' : d > 0 ? 'sobra' : 'falta');
  };
  if (!fechado) {
    $('#fech-fundo').addEventListener('input', () => { atualizarDiff(); });
    $('#fech-contado').addEventListener('input', atualizarDiff);
  }
  atualizarDiff();

  const hist = db.fechamentos.slice().sort((a, b) => b.data.localeCompare(a.data));
  $('#tabela-fechamentos').innerHTML = hist.length ? `<thead><tr><th>Dia</th><th class="num">Vendido</th><th class="num">Recebido</th><th class="num">Despesas</th><th class="num">Esperado gaveta</th><th class="num">Contado</th><th>Diferença</th><th></th></tr></thead>
    <tbody>${hist.map(f => `<tr>
      <td class="strong">${fmtData(f.data)}</td><td class="num">${brl(f.faturado)}</td><td class="num">${brl(f.recebido)}</td><td class="num">${brl(f.despesas)}</td>
      <td class="num">${brl(f.esperado)}</td><td class="num">${brl(f.contado)}</td>
      <td><span class="badge ${f.diferenca === 0 ? 'good' : f.diferenca > 0 ? 'warn' : 'bad'}">${f.diferenca === 0 ? 'OK' : (f.diferenca > 0 ? '+' : '−') + ' ' + brl(Math.abs(f.diferenca))}</span></td>
      <td><button class="link" onclick="document.getElementById('fech-data').value='${f.data}';renderFechamento();window.scrollTo(0,0)">abrir</button></td></tr>`).join('')}</tbody>`
    : '<tbody><tr><td class="empty">Nenhum caixa fechado ainda.</td></tr></tbody>';
}

function fecharCaixa(data) {
  const fundo = num($('#fech-fundo').value);
  const cont = $('#fech-contado').value;
  if (cont === '' && !confirm('Você não informou o valor contado na gaveta. Fechar mesmo assim?')) return;
  db.fechamentos = db.fechamentos.filter(f => f.data !== data);
  db.fechamentos.push({ id: uid(), data, fundo, contado: 0, fechadoEm: new Date().toISOString() }); // fundo do dia entra no cálculo
  const r = resumoDia(data);
  const contado = cont === '' ? r.dinheiroEsperado : num(cont);
  Object.assign(r.fech, {
    contado, esperado: r.dinheiroEsperado, diferenca: r2(contado - r.dinheiroEsperado), faturado: r.faturado, recebido: r.recebido,
    despesas: r.despesas, porForma: r.porForma, qtdVendas: r.qtdVendas, obs: $('#fech-obs').value.trim(),
  });
  salvar(); render();
  toast('Caixa fechado. Que tal fazer o backup agora?');
}
function reabrirCaixa(data) {
  if (!confirm('Reabrir o caixa deste dia? O fechamento salvo será desfeito.')) return;
  db.fechamentos = db.fechamentos.filter(f => f.data !== data);
  salvar(); render();
}
function abrirLancamento() {
  const data = $('#fech-data').value || hoje();
  if (db.fechamentos.some(f => f.data === data)) return alert('O caixa deste dia já está fechado. Reabra para lançar.');
  abrirModal('Lançamento no caixa — ' + fmtData(data), `
    <form id="form-lanc" class="form">
      <div class="row">
        <label>Tipo<select name="tipo">${opts([['despesa', 'Despesa (conta, compra, frete…)'], ['sangria', 'Sangria (retirada de dinheiro)'], ['suprimento', 'Suprimento (colocar troco)']], 'despesa')}</select></label>
        <label>Valor (R$)<input name="valor" type="number" step="0.01" min="0.01" required /></label>
        <label id="lbl-forma">Pago com<select name="forma">${opts(FORMAS, 'Dinheiro')}</select></label>
      </div>
      <label>Descrição<input name="descricao" placeholder="Ex.: Motoboy, conta de luz, depósito no banco…" /></label>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" onclick="fecharModal()">Cancelar</button>
        <button class="btn btn-primary" type="submit">Lançar</button>
      </div>
    </form>`);
  const f = $('#form-lanc');
  f.tipo.addEventListener('change', () => { $('#lbl-forma').hidden = f.tipo.value !== 'despesa'; });
  f.addEventListener('submit', e => {
    e.preventDefault();
    db.caixa.push({ id: uid(), data, tipo: f.tipo.value, valor: num(f.valor.value), forma: f.tipo.value === 'despesa' ? f.forma.value : 'Dinheiro', descricao: f.descricao.value.trim() });
    salvar(); fecharModal(); render(); toast('Lançamento registrado');
  });
}
function excluirLancamento(id) {
  if (!confirm('Remover este lançamento?')) return;
  db.caixa = db.caixa.filter(c => c.id !== id);
  salvar(); render();
}

/* ------------------------------ CONFIG ------------------------------ */

function renderConfig() {
  const f = $('#form-config');
  f.nome.value = db.config.nome || '';
  f.telefone.value = db.config.telefone || '';
  f.endereco.value = db.config.endereco || '';
  f.cnpj.value = db.config.cnpj || '';
  f.chavePix.value = db.config.chavePix || '';
  f.fundoCaixa.value = db.config.fundoCaixa ?? '';
  f.statusProducao.value = db.config.statusProducao.join('\n');
}
function salvarConfig(e) {
  e.preventDefault();
  const f = e.target;
  const status = f.statusProducao.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (status.length < 2) return alert('Informe pelo menos 2 etapas de produção.');
  const antigos = db.config.statusProducao;
  Object.assign(db.config, { nome: f.nome.value.trim(), telefone: f.telefone.value.trim(), endereco: f.endereco.value.trim(), cnpj: f.cnpj.value.trim(), chavePix: f.chavePix.value.trim(), fundoCaixa: num(f.fundoCaixa.value), statusProducao: status });
  db.vendas.forEach(v => { if (!status.includes(v.status)) v.status = antigos.indexOf(v.status) === antigos.length - 1 ? status[status.length - 1] : status[0]; });
  salvar(); render(); toast('Configurações salvas');
}

/* ------------------------------ BACKUP ------------------------------ */

function baixarArquivo(nome, conteudo, tipo) {
  const blob = new Blob([conteudo], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportBackup() {
  db.ultimoBackup = new Date().toISOString();
  salvar();
  baixarArquivo(`backup-grafica-${hoje()}.json`, JSON.stringify(db, null, 2), 'application/json');
  renderBackupInfo();
  toast('Backup baixado — guarde em local seguro');
}
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const dados = JSON.parse(reader.result);
      if (!dados || !Array.isArray(dados.vendas) || !dados.config) throw new Error('formato');
      if (!confirm(`Restaurar este backup?\n${dados.clientes.length} clientes · ${dados.produtos.length} produtos · ${dados.vendas.length} vendas\n\nOs dados atuais deste navegador serão substituídos.`)) return;
      db = Object.assign(dbVazio(), dados);
      salvar(); render(); toast('Backup restaurado');
    } catch (e) { alert('Arquivo inválido. Escolha um backup .json gerado por este painel.'); }
  };
  reader.readAsText(file);
}
function renderBackupInfo() {
  const info = $('#backup-info'), alerta = $('#backup-alert');
  const temDados = db.vendas.length || db.clientes.length || db.produtos.length;
  if (!db.ultimoBackup) {
    info.textContent = 'Nenhum backup feito ainda';
  } else {
    const dias = Math.floor((Date.now() - new Date(db.ultimoBackup)) / 864e5);
    info.textContent = `Último backup: ${dias === 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`}`;
  }
  const atrasado = temDados && (!db.ultimoBackup || Date.now() - new Date(db.ultimoBackup) > 7 * 864e5);
  alerta.hidden = !atrasado;
  if (atrasado) alerta.innerHTML = `⚠ ${db.ultimoBackup ? 'Seu último backup tem mais de 7 dias.' : 'Você ainda não fez nenhum backup.'} Se o navegador for limpo, os dados se perdem. <button class="btn btn-ghost btn-sm" onclick="exportBackup()">Fazer backup agora</button>`;
}
function exportCSV(tipo) {
  const linhas = [];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const n = v => (v || 0).toFixed(2).replace('.', ',');
  if (tipo === 'vendas') {
    linhas.push(['Nº', 'Tipo', 'Data', 'Cliente', 'Canal', 'Itens', 'Desconto', 'Total', 'Pago', 'Saldo', 'Produção', 'Entrega'].map(q).join(';'));
    db.vendas.slice().sort((a, b) => a.numero - b.numero).forEach(v => linhas.push([v.numero, { orcamento: 'Orçamento', recusado: 'Orçamento recusado', andamento: 'Em andamento', feito: 'Feito' }[situacao(v)], fmtData(v.data), nomeCliente(v), v.canal, resumoItens(v), n(v.desconto), n(v.total), n(totalPago(v)), n(saldoVenda(v)), v.status, fmtData(v.entrega)].map(q).join(';')));
  } else {
    linhas.push(['Nome', 'Tipo', 'CPF/CNPJ', 'WhatsApp', 'E-mail', 'Endereço', 'Origem', 'Pedidos', 'Total comprado', 'Última compra', 'Obs'].map(q).join(';'));
    db.clientes.forEach(c => { const s = statsCliente(c.id); linhas.push([c.nome, c.tipo, c.doc, c.whatsapp, c.email, c.endereco, c.origem, s.qtd, n(s.total), fmtData(s.ultima), c.obs].map(q).join(';')); });
  }
  baixarArquivo(`${tipo}-${hoje()}.csv`, '﻿' + linhas.join('\r\n'), 'text/csv;charset=utf-8');
}
function apagarTudo() {
  if (!confirm('Apagar TODOS os dados deste painel? Faça um backup antes!')) return;
  if (prompt('Digite APAGAR para confirmar') !== 'APAGAR') return;
  db = dbVazio(); salvar(); irPara('inicio'); toast('Dados apagados');
}

/* --------------------------- DADOS EXEMPLO --------------------------- */

function carregarExemplos() {
  if ((db.vendas.length || db.clientes.length || db.produtos.length) && !confirm('Isso vai SUBSTITUIR os dados atuais por dados de exemplo. Continuar?')) return;
  const cfg = db.config;
  db = dbVazio(); db.config = cfg;
  const est = (nome, categoria, unidade, qtd, minimo, custo, fornecedor) => { const i = { id: uid(), nome, categoria, unidade, qtd, minimo, custo, fornecedor }; db.estoque.push(i); return i; };
  const papel = est('Papel couchê 300g SRA3', 'Papéis', 'folha', 420, 200, 0.85, 'Distribuidora Papel Bom');
  const lona = est('Lona 440g fosca (rolo 1,40m)', 'Lonas e vinis', 'm²', 26, 25, 9.5, 'Lonas Sul');
  const vinil = est('Vinil adesivo branco brilho', 'Lonas e vinis', 'm²', 32, 15, 7.2, 'Lonas Sul');
  const caneca = est('Caneca branca cerâmica 325ml', 'Blanks (canecas, camisetas…)', 'un', 24, 12, 6.9, 'Sublima Mais');
  const camiseta = est('Camiseta poliéster branca M', 'Blanks (canecas, camisetas…)', 'un', 23, 10, 14.5, 'Sublima Mais');
  est('Toner preto', 'Tintas e toners', 'un', 2, 1, 189, 'Office Supri');

  const prod = (nome, categoria, unidade, custo, preco, prazo, item, consumo) => { const p = { id: uid(), nome, categoria, unidade, custo, preco, prazo, estoqueItemId: item?.id || null, consumo: consumo || 1, obs: '', ativo: true }; db.produtos.push(p); return p; };
  const cartao = prod('Cartão de visita 4x4 couchê 300g (milheiro)', 'Cartões de visita', 'milheiro', 62, 149, 3, papel, 42);
  const flyer = prod('Flyer A5 4x0 couchê 115g (milheiro)', 'Panfletos e flyers', 'milheiro', 95, 179, 4);
  const banner = prod('Banner lona 440g com bastão e cordão', 'Banners e lonas', 'm²', 24, 65, 2, lona, 1);
  const adesivo = prod('Adesivo vinil recortado', 'Adesivos', 'm²', 19, 55, 2, vinil, 1);
  const canecaP = prod('Caneca personalizada sublimação', 'Personalizados', 'un', 11.5, 35, 2, caneca, 1);
  const camisetaP = prod('Camiseta personalizada sublimação', 'Personalizados', 'un', 21, 45, 3, camiseta, 1);
  const arte = prod('Criação de arte simples', 'Serviços de arte', 'un', 0, 60, 1);
  prod('Impressão A4 colorida', 'Impressões e cópias', 'un', 0.45, 2, 0);

  const cli = (nome, tipo, doc, whatsapp, origem, obs = '') => { const c = { id: uid(), nome, tipo, doc, whatsapp, email: '', endereco: '', origem, obs, criadoEm: hoje() }; db.clientes.push(c); return c; };
  const c1 = cli('Padaria Pão Dourado', 'PJ', '12.345.678/0001-90', '(11) 98888-1111', 'Loja física', 'Pede panfleto todo mês');
  const c2 = cli('Ana Paula Ribeiro', 'PF', '', '(11) 97777-2222', 'Instagram', 'Aniversário da filha em dezembro');
  const c3 = cli('Studio Bella Estética', 'PJ', '98.765.432/0001-10', '(11) 96666-3333', 'WhatsApp');
  const c4 = cli('Carlos Mendes', 'PF', '', '(11) 95555-4444', 'Indicação');

  const st = db.config.statusProducao, FEITO = st[st.length - 1];
  // [diasAtrás, cliente, canal, itens, pagamentos[[fração, forma, diasAtrásDoPagamento?]], etapa, prazoDias, extra]
  const venda = (diasAtras, c, canal, itens, pagos, status, entregaDias, extra = {}) => {
    const data = addDias(hoje(), -diasAtras);
    const total = r2(itens.reduce((s, [p, q]) => s + p.preco * q, 0));
    const v = { id: uid(), numero: db.seq.venda++, criadoEm: new Date().toISOString(), tipo: 'pedido', clienteId: c?.id || null, clienteNome: c?.nome || '', canal, data,
      entrega: entregaDias != null ? addDias(data, entregaDias) : '', status, itens: itens.map(([p, q]) => ({ produtoId: p.id, descricao: p.nome, qtd: q, preco: p.preco })),
      desconto: 0, total, pagamentos: pagos.map(([frac, forma, d]) => ({ id: uid(), data: d != null ? addDias(hoje(), -d) : data, forma, valor: r2(total * frac) })), obs: '', ...extra };
    if (v.status === FEITO) v.feitoEm = v.entrega && v.entrega < hoje() ? v.entrega : data;
    db.vendas.push(v); baixarEstoqueVenda(v);
    return v;
  };
  const orcamento = (diasAtras, c, canal, itens, extra = {}) => venda(diasAtras, c, canal, itens, [], st[0], null,
    { tipo: 'orcamento', validade: addDias(hoje(), 7 - diasAtras), ...extra });
  // semanas anteriores
  venda(20, c3, 'WhatsApp', [[cartao, 1]], [[1, 'Pix']], FEITO, 3);
  venda(18, c1, 'Loja física', [[flyer, 2]], [[1, 'Pix']], FEITO, 4);
  orcamento(17, c4, 'Indicação', [[banner, 4]], { recusado: true });
  venda(15, null, 'Loja física', [[adesivo, 2]], [[1, 'Dinheiro']], FEITO, 1);
  venda(13, c2, 'Instagram', [[canecaP, 4]], [[1, 'Pix']], FEITO, 2, { dataOrcamento: addDias(hoje(), -14) });
  venda(11, c3, 'WhatsApp', [[banner, 2], [arte, 1]], [[1, 'Cartão de crédito']], FEITO, 2);
  orcamento(10, c1, 'WhatsApp', [[cartao, 2]], { recusado: true });
  venda(9, null, 'Loja física', [[cartao, 0.5]], [[1, 'Cartão de débito']], FEITO, 3);
  // esta semana / últimos dias
  venda(6, c1, 'Loja física', [[flyer, 2]], [[1, 'Pix']], FEITO, 4);
  venda(5, c2, 'Instagram', [[canecaP, 6], [arte, 1]], [[1, 'Cartão de crédito']], FEITO, 2, { dataOrcamento: addDias(hoje(), -6) });
  venda(4, null, 'Loja física', [[adesivo, 1.5]], [[1, 'Dinheiro']], FEITO, 0);
  venda(3, c3, 'WhatsApp', [[cartao, 1], [banner, 2]], [[0.5, 'Pix'], [0.5, 'Pix', 0]], st[2], 3);
  venda(2, c4, 'Indicação', [[camisetaP, 12]], [[0.5, 'Pix']], st[2], 5, { dataOrcamento: addDias(hoje(), -3),
    boletos: [{ id: uid(), valor: 270, vencimento: addDias(hoje(), 3), banco: 'Inter', codigo: '', criadoEm: addDias(hoje(), -2), pago: false }] });
  venda(1, c1, 'WhatsApp', [[banner, 3]], [], st[1], 2, {
    boletos: [{ id: uid(), valor: 195, vencimento: addDias(hoje(), -1), banco: 'Inter', codigo: '', criadoEm: addDias(hoje(), -1), pago: false }] });
  venda(0, c2, 'Loja física', [[canecaP, 2]], [[1, 'Dinheiro']], st[0], 2);
  venda(0, null, 'Loja física', [[cartao, 0.5]], [[1, 'Cartão de débito']], st[0], 3);
  orcamento(2, c3, 'WhatsApp', [[adesivo, 3], [arte, 1]]);
  orcamento(1, null, 'Instagram', [[camisetaP, 30]], { clienteNome: 'Igreja Nova Vida' });
  orcamento(0, c4, 'WhatsApp', [[flyer, 5]]);
  db.caixa.push({ id: uid(), data: addDias(hoje(), -8), tipo: 'despesa', valor: 380, forma: 'Pix', descricao: 'Compra de lona' });
  db.caixa.push({ id: uid(), data: addDias(hoje(), -3), tipo: 'despesa', valor: 120, forma: 'Pix', descricao: 'Conta de internet' });
  db.caixa.push({ id: uid(), data: hoje(), tipo: 'despesa', valor: 25, forma: 'Dinheiro', descricao: 'Motoboy entrega' });
  salvar(); irPara('inicio'); toast('Dados de exemplo carregados');
}

/* ------------------------------ MODAL ------------------------------ */

function abrirModal(titulo, html, largo) {
  $('#modal-title').textContent = titulo;
  $('#modal-body').innerHTML = html;
  $('.modal').classList.toggle('wide', !!largo);
  $('#modal').hidden = false;
  const first = $('#modal-body input:not([type=hidden]):not([disabled]), #modal-body select');
  if (first && window.innerWidth > 860) setTimeout(() => first.focus(), 30);
}
function fecharModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }

/* ------------------------------ INIT ------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
  const dt = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#topbar-date').textContent = dt.charAt(0).toUpperCase() + dt.slice(1);
  $$('.nav-item').forEach(b => b.addEventListener('click', () => irPara(b.dataset.panel)));
  $('#menu-btn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') fecharModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) fecharModal(); });

  ['#f-venda-busca', '#f-venda-pag', '#f-venda-status', '#f-venda-de', '#f-venda-ate'].forEach(s => $(s).addEventListener('input', renderVendas));
  ['#f-cli-busca', '#f-cli-origem'].forEach(s => $(s).addEventListener('input', renderClientes));
  ['#f-prod-busca', '#f-prod-cat'].forEach(s => $(s).addEventListener('input', renderProdutos));
  ['#f-est-busca', '#f-est-cat', '#f-est-baixo'].forEach(s => $(s).addEventListener('input', renderEstoque));
  $('#fech-data').addEventListener('change', renderFechamento);
  $('#form-config').addEventListener('submit', salvarConfig);
  $('#input-restore').addEventListener('change', e => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ''; });

  let inicial = 'inicio';
  try { inicial = localStorage.getItem(STORAGE_KEY + '_painel') || 'inicio'; } catch (e) {}
  irPara(TITULOS[inicial] ? inicial : 'inicio');
});
