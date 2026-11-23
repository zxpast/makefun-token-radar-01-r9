// Launch Radar v9's page. It reads window.RADAR (written beside dashboard/
// by main.ts) and renders the board, a protocol's detail view and the live
// set — no network, no framework, no fetch.
(function () {
  var DATA = window.RADAR;
  if (!DATA) {
    document.body.innerHTML = '<p style="padding:40px">Launch Radar needs data.js beside dashboard/.</p>';
    return;
  }

  var rows = DATA.rows;
  var bySlug = {};
  rows.forEach(function (r) { bySlug[r.slug] = r; });

  function money(v) {
    if (v === null || v === undefined) return '—';
    var a = Math.abs(v);
    if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return '$' + Math.round(v).toLocaleString('en-US');
    return '$' + v.toFixed(0);
  }

  function moneyFull(v) {
    if (v === null || v === undefined) return '—';
    return '$' + Math.round(v).toLocaleString('en-US');
  }

  function net(v) {
    if (v === null || v === undefined) return '—';
    var s = (v < 0 ? '−$' : '+$') + Math.abs(v).toFixed(2);
    return s;
  }

  function pct(v) {
    // change_7d arrives in PER CENT (the kit's own comment: "clamp(change_7d,
    // -60, 120) per cent") — it is displayed as it arrives, never scaled.
    if (v === null || v === undefined) return '—';
    return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function verdictCell(r) {
    var mark = r.robust ? ' <span class="robust-mark" title="Robust: the net at a $1,000 deposit is still positive">●</span>' : '';
    return '<span class="verdict ' + r.verdict + '">' + r.verdict + '</span>' + mark;
  }

  // --- the six numbers across the top ---
  function renderKpis() {
    var fit = DATA.fit;
    var verdicts = { FARM: 0, THIN: 0, SKIP: 0 };
    rows.forEach(function (r) { verdicts[r.verdict] = (verdicts[r.verdict] || 0) + 1; });
    var items = [
      ['Board', DATA.board_size + ' protocols', DATA.watchlist_size + ' watchlist + ' + DATA.early_size + ' early'],
      ['Total implied', money(DATA.total_implied_usd), 'all ' + DATA.board_size + ' rows, conditional'],
      ['Top implied', money(DATA.top_implied_usd), rows[0] ? rows[0].name : ''],
      ['Leave-one-out', 'RMSE ' + fit.loo_rmse.toFixed(4), 'refit 119 times, one held out'],
      ['Verdicts', verdicts.FARM + ' FARM', verdicts.THIN + ' THIN · ' + verdicts.SKIP + ' SKIP'],
      ['Category-blind', '×' + fit.category_blind_miss.toFixed(2), 'sector term dropped and refit'],
    ];
    document.getElementById('kpis').innerHTML = items.map(function (it) {
      return '<div><dt>' + esc(it[0]) + '</dt><dd>' + esc(it[1]) + '<small>' + esc(it[2]) + '</small></dd></div>';
    }).join('');
  }

  // --- the board ---
  var state = { q: '', watchOnly: false, cat: '', sort: 'rank' };

  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    var list = rows.filter(function (r) {
      if (state.watchOnly && !r.on_watchlist) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (q) {
        var hay = [r.name, r.slug, r.category || '', r.chains.join(' ')].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    if (state.sort === 'net') list.sort(function (a, b) { return b.net_cond - a.net_cond; });
    else if (state.sort === 'tvl') list.sort(function (a, b) { return b.tvl_usd - a.tvl_usd; });
    else if (state.sort === 'name') list.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
    else list.sort(function (a, b) { return a.rank - b.rank; });
    return list;
  }

  function rowHtml(r) {
    var chg = r.change_7d;
    var chgClass = chg === null ? '' : chg >= 0 ? 'pos' : 'neg';
    return '<tr class="clickable' + (r.on_watchlist ? ' watch' : '') + '" data-slug="' + esc(r.slug) + '">' +
      '<td class="num">' + r.rank + '</td>' +
      '<td><span class="name">' + esc(r.name) + (r.on_watchlist ? ' <span title="On the watchlist">★</span>' : '') + '</span>' +
      (r.age_days !== null ? ' <span class="age">' + r.age_days + 'd</span>' : '') + '</td>' +
      '<td class="cat">' + esc(r.category || '—') + '</td>' +
      '<td class="chains">' + esc(r.chains.slice(0, 3).join(', ') || '—') + '</td>' +
      '<td class="num">' + money(r.tvl_usd) + '</td>' +
      '<td class="num ' + chgClass + '">' + pct(chg) + '</td>' +
      '<td class="num">' + money(r.implied_value_usd) + '</td>' +
      '<td class="num">' + net(r.net_cond) + '</td>' +
      '<td class="num">' + (r.token_odds * 100).toFixed(0) + '%</td>' +
      '<td>' + verdictCell(r) + '</td></tr>';
  }

  function renderBoard() {
    var list = filteredRows();
    document.getElementById('rows').innerHTML = list.length
      ? list.map(rowHtml).join('')
      : '<tr><td colspan="10" class="empty">No protocol matches this filter.</td></tr>';
    document.getElementById('count').textContent = 'Showing ' + list.length + ' of ' + rows.length + ' protocols';
    var tbody = document.getElementById('rows');
    tbody.querySelectorAll('tr.clickable').forEach(function (tr) {
      tr.addEventListener('click', function () { showDetail(tr.getAttribute('data-slug')); });
    });
  }

  function renderCategories() {
    var cats = [];
    rows.forEach(function (r) { if (r.category && cats.indexOf(r.category) === -1) cats.push(r.category); });
    cats.sort();
    var sel = document.getElementById('cat');
    cats.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
  }

  // --- one protocol's detail view ---
  function showDetail(slug) {
    var r = bySlug[slug];
    if (!r) return;
    var m = r.model;
    var logTvl = Math.log10(r.tvl_usd);
    var slopeTerm = m.slope * logTvl;
    var econ = r.economics;
    var el = document.getElementById('detail');
    el.hidden = false;
    el.innerHTML =
      '<a class="back" href="#" id="backLink">&larr; Back to the board</a>' +
      '<h2>#' + r.rank + ' ' + esc(r.name) + '</h2>' +
      '<p class="sub">' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ') || 'no chain listed') +
      ' · TVL ' + money(r.tvl_usd) + ' · ' + (r.age_days !== null ? r.age_days + ' days old' : 'age unknown') +
      (r.on_watchlist ? ' · on the watchlist' : '') + '</p>' +
      '<h3>How the value is fitted</h3>' +
      '<p class="fitsteps">log<sub>10</sub>(mcap) = ' + m.intercept.toFixed(4) +
      ' + ' + m.slope.toFixed(2) + ' &times; log<sub>10</sub>(TVL ' + logTvl.toFixed(4) + ') = ' + slopeTerm.toFixed(4) +
      ' + sector ' + (m.sector_offset >= 0 ? '+' : '') + m.sector_offset.toFixed(4) +
      ' + mults ' + (m.mults >= 0 ? '+' : '') + m.mults.toFixed(4) +
      ' = ' + m.log10_implied.toFixed(4) + ' &rarr; implied ' + moneyFull(r.implied_value_usd) + '</p>' +
      '<p class="fitsteps">Multipliers: growth ' + m.growth_multiplier.toFixed(4) + ' &times; maturity ' + m.maturity_multiplier.toFixed(4) +
      ' &times; chains ' + m.chains_multiplier.toFixed(4) + ' (half-damped: 0.5 &times; log<sub>10</sub> of the product).</p>' +
      '<h3>What farming it is worth</h3>' +
      '<dl class="econ">' +
      '<div><dt>Deposit</dt><dd>' + moneyFull(econ.deposit_usd) + '<small>min(0.02% &times; TVL, $10,000)</small></dd></div>' +
      '<div><dt>Slice</dt><dd>' + moneyFull(econ.slice_usd) + '<small>10% of implied &times; deposit / TVL</small></dd></div>' +
      '<div><dt>Net (conditional)</dt><dd>' + net(r.net_cond) + '<small>slice &minus; $5 round trip</small></dd></div>' +
      '<div><dt>Net (expected)</dt><dd>' + net(r.net_ev) + '<small>slice &times; ' + (r.token_odds * 100).toFixed(0) + '% odds &minus; $5</small></dd></div>' +
      '<div><dt>Net at $1,000 deposit</dt><dd>' + net(econ.net_d1k) + '<small>' + (r.robust ? 'robust: still positive' : 'not robust') + '</small></dd></div>' +
      '<div><dt>Net at half value</dt><dd>' + net(econ.net_low) + '<small>slice halved &minus; $5</small></dd></div>' +
      '<div><dt>T-bill memo</dt><dd>' + moneyFull(econ.tbill_memo_usd) + '<small>4% a year over the hold window — a memo, not part of the net</small></dd></div>' +
      '<div><dt>Verdict</dt><dd>' + r.verdict + '<small>' + (r.verdict === 'FARM' ? 'net (cond.) &gt; $25 and net (expected) &gt; $0' : r.verdict === 'THIN' ? 'exactly one of the two holds' : 'neither holds') + '</small></dd></div>' +
      '</dl>' +
      '<h3>The farm plan — ten steps</h3>' +
      '<ol class="steps">' + r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<h3>Nearest by value</h3>' +
      '<div class="comps">' + r.comps.map(function (c) {
        return '<div><div class="cname">' + esc(c.name) + '</div><div class="cval">Implied ' + money(c.implied_value_usd) +
          ' · net (cond.) ' + net(c.net_cond) + ' · ' + c.verdict + '</div></div>';
      }).join('') + '</div>';
    document.getElementById('backLink').addEventListener('click', function (e) {
      e.preventDefault();
      el.hidden = true;
      document.getElementById('boardWrap').scrollIntoView();
    });
    el.scrollIntoView();
  }

  // --- the live set, at the market's own value ---
  function renderLive() {
    document.getElementById('liveRows').innerHTML = DATA.live.map(function (p) {
      var chg = p.change_7d;
      var chgClass = chg === null ? '' : chg >= 0 ? 'pos' : 'neg';
      return '<tr><td><span class="name">' + esc(p.name) + '<small>' + esc(p.slug) + '</small></span></td>' +
        '<td class="cat">' + esc(p.category || '—') + '</td>' +
        '<td class="num">' + money(p.tvl_usd) + '</td>' +
        '<td class="num">' + money(p.mcap_usd) + '</td>' +
        '<td class="num ' + chgClass + '">' + pct(chg) + '</td></tr>';
    }).join('');
  }

  // --- wire it up ---
  renderKpis();
  renderCategories();
  renderBoard();
  renderLive();
  document.getElementById('asOf').textContent = DATA.as_of;
  document.getElementById('source').textContent = DATA.source;

  document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value; renderBoard(); });
  document.getElementById('watchOnly').addEventListener('change', function (e) { state.watchOnly = e.target.checked; renderBoard(); });
  document.getElementById('cat').addEventListener('change', function (e) { state.cat = e.target.value; renderBoard(); });
  document.getElementById('sort').addEventListener('change', function (e) { state.sort = e.target.value; renderBoard(); });

  var params = new URLSearchParams(window.location.search);
  var detailSlug = params.get('detail');
  var filter = params.get('filter');
  if (filter === 'watchlist') {
    document.body.classList.add('filtered');
    state.watchOnly = true;
    document.getElementById('watchOnly').checked = true;
    renderBoard();
  }
  if (detailSlug && bySlug[detailSlug]) {
    document.body.classList.add('detail-only');
    showDetail(detailSlug);
  }
})();
