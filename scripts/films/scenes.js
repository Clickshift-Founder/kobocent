/* Kobocent films: deterministic scenes. window.seek(t) draws the frame at t seconds; window.VIDEO = { dur, sfx }.
   ?v=1 bills · ?v=2 withdraw · ?v=3 Kobo Pal · ?v=4 trading · ?v=5 Earn · ?v=6 cashback · ?v=7 send to wallet · ?v=8 first deposit · ?v=9 freeze and new wallet · ?v=10 send to bank · ?v=11 bridge · ?v=12 swap · ?v=13 crypto deposit. Every amount is an illustration (the end card says so). */
(() => {
  const V = Number(new URLSearchParams(location.search).get('v') || 1);
  const $ = (s, r = document) => r.querySelector(s);
  const c = (x) => Math.max(0, Math.min(1, x));
  const p = (t, a, b) => c((t - a) / (b - a));
  const out3 = (x) => 1 - Math.pow(1 - x, 3);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const back = (x) => { const s = 1.70158; const y = x - 1; return 1 + (s + 1) * y * y * y + s * y * y; };
  const lerp = (a, b, x) => a + (b - a) * x;
  const el = (html) => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
  const set = (node, o = 1, tr = '') => { node.style.opacity = o; node.style.transform = tr; };
  const naira = (n) => '₦' + Math.round(n).toLocaleString('en-NG');

  const I = {
    mark: (s = 26, col = '#C1502E') => `<svg width="${s}" height="${s}" viewBox="0 0 120 120"><g transform="translate(60,60)"><circle cx="-14" cy="0" r="30" fill="none" stroke="${col}" stroke-width="9"/><circle cx="26" cy="0" r="20" fill="${col}"/><circle cx="26" cy="0" r="6.5" fill="#F7F3EE"/></g></svg>`,
    svg: (d, s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`,
  };
  const ic = {
    bank: I.svg('<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 21h18"/>'),
    up: I.svg('<path d="M12 19V6"/><path d="M6 11l6-6 6 6"/><path d="M5 3h14"/>'),
    wallet: I.svg('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M16 12h3"/><path d="M3 9h13"/>'),
    bolt: I.svg('<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>'),
    swap: I.svg('<path d="M4 8h14l-3-3"/><path d="M20 16H6l3 3"/>'),
    leaf: I.svg('<path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14z"/><path d="M5 19l8-8"/>'),
    bridge: I.svg('<path d="M4 9h13l-3-3"/><path d="M20 15H7l3 3"/>'),
    chart: I.svg('<path d="M4 19h16"/><path d="M6 15l4-4 3 3 5-6"/>'),
    home: I.svg('<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>'),
    list: I.svg('<path d="M5 7h14M5 12h10M5 17h7"/>'),
    cup: I.svg('<path d="M8 4h8v6a4 4 0 01-8 0z"/><path d="M12 14v4M8 20h8"/>'),
    card: I.svg('<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18"/>'),
    cog: I.svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
    back: I.svg('<path d="M15 5l-7 7 7 7"/>', 20),
    chat: I.svg('<path d="M5 5h14v10H10l-5 4z"/>', 22),
    bell: I.svg('<path d="M6 16V11a6 6 0 0112 0v5l2 2H4z"/><path d="M10 20h4"/>', 22),
    check: (s = 46, col = '#58834C') => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`,
    send: I.svg('<path d="M5 12h13"/><path d="M13 6l6 6-6 6"/>', 20),
    phone: I.svg('<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>', 20),
    wifi: I.svg('<path d="M4 9a12 12 0 0116 0"/><path d="M7 13a7.5 7.5 0 0110 0"/><circle cx="12" cy="17" r="1"/>', 20),
    tv: I.svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M9 21h6"/>', 20),
    spark: I.svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>', 22),
  };
  const status = `<div class="status"><span>9:41</span><span style="display:flex;gap:6px;align-items:center"><svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#20211F"/><rect x="5" y="5" width="3" height="7" rx="1" fill="#20211F"/><rect x="10" y="2" width="3" height="10" rx="1" fill="#20211F"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#20211F"/></svg><svg width="26" height="13" viewBox="0 0 26 13"><rect x=".5" y=".5" width="22" height="12" rx="3.5" fill="none" stroke="#20211F"/><rect x="2" y="2" width="17" height="9" rx="2" fill="#20211F"/><rect x="24" y="4" width="2" height="5" rx="1" fill="#20211F"/></svg></span></div>`;

  const home = (bal) => el(`<div class="scr">${status}
    <div class="topbar"><div class="lock">${I.mark(26)}<span>Kobocent</span></div><div class="icons"><span style="color:#C1502E">${ic.chat}</span>${ic.bell}<div class="av">A</div></div></div>
    <div class="pad"><div class="hello">Good afternoon,</div><div class="name">Ada 👋</div>
      <div class="bal"><div class="r1"></div><div class="r2"></div><div class="lbl">Total balance</div><div class="amt">${bal}</div><div class="sub">Stablecoins ${bal}</div>
        <div class="btns"><div class="b1">+ Add money</div><div class="b2">Card</div></div></div>
      <div class="h">Move money</div>
      <div class="grid">
        <div class="act" data-k="bank"><div class="ic">${ic.up}</div>Send to<br>bank</div>
        <div class="act" data-k="wallet"><div class="ic">${ic.wallet}</div>Send to<br>wallet</div>
        <div class="act" data-k="bills"><div class="ic">${ic.bolt}</div>Pay bills</div>
        <div class="act" data-k="withdraw"><div class="ic">${ic.bank}</div>Withdraw</div>
        <div class="act" data-k="swap"><div class="ic">${ic.swap}</div>Swap</div>
        <div class="act" data-k="earn"><div class="ic">${ic.leaf}</div>Earn</div>
        <div class="act" data-k="bridge"><div class="ic">${ic.bridge}</div>Bridge</div>
        <div class="act" data-k="trade"><div class="ic">${ic.chart}</div>Trade</div>
      </div></div>
    <div class="tabs"><div class="on">${ic.home}Home</div><div>${ic.list}Activity</div><div>${ic.cup}Rewards</div><div>${ic.card}Card</div><div>${ic.cog}Settings</div></div>
  </div>`);

  /* ───────── shared stage ───────── */
  const screen = $('#screen'), tapEl = $('#tap'), caps = $('#caps');
  const SC = 1.7231;
  // centre of a node in app coordinates (measured once, with every screen at rest)
  const at = (node) => { const r = node.getBoundingClientRect(), g = screen.getBoundingClientRect(); return [(r.left + r.width / 2 - g.left) / SC, (r.top + r.height / 2 - g.top) / SC]; };
  const add = (node) => { screen.insertBefore(node, tapEl); return node; };
  const sfx = [];
  const taps = [];
  const tap = (time, node) => { taps.push({ time, xy: at(node) }); sfx.push({ t: time, k: 'tap' }); };
  const holds = [];
  const hold = (a, b, node) => { holds.push({ a, b, xy: at(node) }); sfx.push({ t: a, k: 'tap' }); };
  const typeSfx = (a, b, n) => { for (let i = 0; i < n; i++) sfx.push({ t: a + ((b - a) * i) / n, k: 'key' }); };
  const tapAt = (time, node) => { taps.push({ time, node }); sfx.push({ t: time, k: 'tap' }); };
  const holdAt = (a, b, node) => { holds.push({ a, b, node }); sfx.push({ t: a, k: 'tap' }); };

  function drawTap(t) {
    let o = 0, s = 1, x = 0, y = 0;
    for (const k of taps) if (k.node) { if (Math.abs(t - k.time) < 0.6) k.xy = at(k.node); if (!k.xy) k.xy = [0, 0]; }
    for (const k of holds) if (k.node) { if (t > k.a - 0.4 && t < k.b + 0.4) k.xy = at(k.node); if (!k.xy) k.xy = [0, 0]; }
    for (const k of taps) { const q = (t - k.time + 0.18) / 0.55; if (q > 0 && q < 1) { o = q < 0.3 ? q / 0.3 : 1 - (q - 0.3) / 0.7; s = q < 0.33 ? lerp(1.5, 0.82, q / 0.33) : lerp(0.82, 1.25, (q - 0.33) / 0.67); [x, y] = k.xy; } }
    for (const k of holds) { if (t > k.a - 0.2 && t < k.b + 0.3) { o = c((t - k.a + 0.2) / 0.2) * (1 - c((t - k.b) / 0.3)); s = 0.82 + 0.03 * Math.sin((t - k.a) * 9); [x, y] = k.xy; } }
    tapEl.style.opacity = o; tapEl.style.left = x + 'px'; tapEl.style.top = y + 'px'; tapEl.style.transform = `scale(${s})`;
  }
  const slide = (node, t, tin, prev) => {
    const q = out3(p(t, tin, tin + 0.5));
    set(node, t >= tin ? 1 : 0, `translateX(${lerp(390, 0, q)}px)`);
    node.style.visibility = t >= tin ? 'visible' : 'hidden';
    if (prev) set(prev, 1 - 0.35 * q, `translateX(${lerp(0, -90, q)}px)`);
  };
  const sheetIn = (dim, sh, t, tin, toff = 1e9) => {
    const q = out3(p(t, tin, tin + 0.45)) * (1 - p(t, toff, toff + 0.25));
    dim.style.opacity = q; dim.style.visibility = q > 0 ? 'visible' : 'hidden';
    set(sh, 1, `translateY(${lerp(110, 0, q)}%)`); sh.style.visibility = q > 0 ? 'visible' : 'hidden';
  };
  const pop = (node, t, tin, d = 0.45) => { const q = p(t, tin, tin + d); set(node, c(q * 3), `scale(${q <= 0 ? 0.6 : lerp(0.6, 1, back(q))})`); };
  const rise = (node, t, tin, d = 0.45, dy = 16) => { const q = out3(p(t, tin, tin + d)); set(node, q, `translateY(${lerp(dy, 0, q)}px)`); };

  /* ───────── the three films ───────── */
  let DUR = 30, HOOK = ['', ''], CAPS = [], END = 24.6, draw = () => {};

  if (V === 1) {
    HOOK = ['Light bill due?', 'Pay it from your dollars, in seconds.'];
    CAPS = [[3.1, 5.0, 'Step 1', 'Open <em>Pay bills</em>'], [5.0, 10.9, 'Step 2', 'Enter your meter.<br>We check the <em>name</em>.'], [10.9, 15.6, 'Step 3', 'See the exact cost.<br><em>No network fees.</em>'], [15.6, 20.2, 'Done', 'Paid. Your <em>token</em><br>is ready.'], [20.2, 24.5, 'Also', 'Airtime, data and TV<br>work the <em>same way</em>.']];
    const s1 = add(home('$248.60'));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Pay bills</div></div>
      <div class="seg"><div>Airtime</div><div>Data</div><div class="on">Electricity</div><div>Cable TV</div></div>
      <div class="field"><div class="eyebrow">Electricity company</div><div class="chips"><div class="chip on" style="flex:1.4">Abuja Electric</div><div class="chip">Prepaid</div></div></div>
      <div class="field"><div class="eyebrow">Meter number</div><div class="input focus"><span id="meter"></span><span class="caret" id="car1"></span></div>
        <div class="ok" id="vname">${ic.check(18)} ADA OKAFOR · Wuse, Abuja</div></div>
      <div class="field"><div class="eyebrow">Amount</div><div class="chips"><div class="chip">₦2,000</div><div class="chip" id="c5">₦5,000</div><div class="chip">₦10,000</div></div></div>
      <div class="dark" id="quote"><div style="font-size:13px;color:rgba(247,243,238,.7)">You pay</div><div class="big">$3.38 <span style="font-size:16px;font-weight:500">USDC</span></div>
        <dl><dt>Network fee</dt><dd>Covered by Kobocent</dd><dt>Cashback</dt><dd style="color:#E8895F">0.2% back</dd></dl></div>
      <div class="cta" id="rev">Review ₦5,000 electricity</div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const sh = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Review electricity</div>
      <dl class="rows"><dt>Company</dt><dd>Abuja Electric · Prepaid</dd><dt>Meter</dt><dd class="mono">0101 2345 678</dd><dt>Name</dt><dd>ADA OKAFOR</dd><dt>Electricity</dt><dd>₦5,000</dd></dl>
      <div class="line"></div>
      <dl class="rows"><dt>You pay</dt><dd class="mono">$3.38 USDC</dd><dt>Network fee</dt><dd>Covered by Kobocent</dd></dl>
      <div class="hold" id="hold"><div class="fill" id="fill"></div><span>Hold to pay ₦5,000</span></div><div class="hint">Press and hold so nothing is paid by accident.</div></div>`));
    const s4 = add(el(`<div class="scr">${status}<div class="done">
      <div class="tick" id="tick">${ic.check(50)}</div><div class="t" id="dt">₦5,000 electricity paid</div><div class="b" id="db">Abuja Electric · meter 0101 2345 678</div>
      <div class="token" id="tok"><div class="eyebrow">Your token</div><div class="n" id="tokn"></div></div>
      <div class="pill" id="cb">+ ₦10 cashback for next time</div>
      <div class="more" id="more"><div><span class="ic2">${ic.phone}</span>Airtime</div><div><span class="ic2">${ic.wifi}</span>Data</div><div><span class="ic2">${ic.tv}</span>Cable TV</div></div></div></div>`));
    const meter = $('#meter'), METER = '0101 2345 678', TOKEN = '4821 9930 1175 6642 0918';
    tap(4.35, $('[data-k=bills] .ic', s1)); tap(9.3, $('#c5')); tap(10.55, $('#rev')); hold(12.9, 15.2, $('#hold'));
    typeSfx(5.6, 7.5, 11); sfx.push({ t: 4.6, k: 'whoosh' }, { t: 8.25, k: 'ok' }, { t: 10.85, k: 'whoosh' }, { t: 15.45, k: 'success' }, { t: 18.3, k: 'coin' });
    draw = (t) => {
      slide(s2, t, 4.6, s1); if (t < 4.6) set(s1, 1, '');
      meter.textContent = METER.slice(0, Math.round(METER.length * p(t, 5.6, 7.5)));
      $('#car1').style.opacity = t < 8.2 && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      rise($('#vname'), t, 8.25, 0.4, 8);
      $('#c5').className = 'chip' + (t >= 9.35 ? ' on' : '');
      rise($('#quote'), t, 9.5, 0.45, 20);
      const r = $('#rev'); r.style.opacity = t >= 9.5 ? 1 : 0.4;
      r.textContent = t < 8.25 ? 'Check your meter' : t < 9.35 ? 'Choose an amount' : 'Review ₦5,000 electricity';
      sheetIn(dim, sh, t, 10.85, 15.45);
      $('#fill').style.width = 100 * p(t, 13.0, 15.2) + '%';
      slide(s4, t, 15.45, null);
      pop($('#tick'), t, 15.7); rise($('#dt'), t, 15.95); rise($('#db'), t, 16.1);
      rise($('#tok'), t, 16.4, 0.5, 24);
      $('#tokn').textContent = TOKEN.slice(0, Math.round(TOKEN.length * p(t, 16.7, 17.7)));
      pop($('#cb'), t, 18.3); rise($('#more'), t, 20.3, 0.5, 24);
    };
  }

  if (V === 2) {
    HOOK = ['Paid in dollars?', 'Land it in your bank, in minutes.'];
    CAPS = [[3.1, 5.0, 'Step 1', 'Tap <em>Withdraw</em>'], [5.0, 11.1, 'Step 2', 'Type the amount.<br>See the <em>exact naira</em>.'], [11.1, 15.8, 'Step 3', 'Check the name.<br><em>Hold to send.</em>'], [15.8, 20.4, 'Done', 'Sent. Usually there<br>in <em>minutes</em>.'], [20.4, 24.5, 'Plus', 'Every withdrawal<br>earns <em>cashback</em>.']];
    const s1 = add(home('$312.40'));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Withdraw to bank</div></div>
      <div class="sub2">USDC or USDT to naira, straight to your bank.</div>
      <div class="field"><div class="eyebrow">You withdraw</div><div class="input focus" style="height:64px;font-family:Fraunces,serif;font-weight:700;font-size:30px">$<span id="amt"></span><span class="caret" id="car2" style="height:30px"></span><span style="margin-left:auto;font-family:Inter;font-size:14px;font-weight:600;color:#6B5D52">USDC</span></div></div>
      <div class="field"><div class="eyebrow">To</div><div class="card" style="margin-top:8px;display:flex;align-items:center;gap:12px">
        <div style="width:42px;height:42px;border-radius:13px;background:rgba(193,80,46,.09);color:#C1502E;display:grid;place-items:center">${ic.bank}</div>
        <div style="flex:1"><div style="font-weight:600">GTBank · 0123456789</div><div class="ok" id="acct" style="margin-top:3px">${ic.check(16)} ADA OKAFOR</div></div><div style="color:#C1502E;font-weight:600;font-size:13.5px">Change</div></div></div>
      <div class="dark" id="q2"><div style="font-size:13px;color:rgba(247,243,238,.7)">You receive</div><div class="big" id="ngn">₦0</div>
        <dl><dt>Arrives</dt><dd>Usually within minutes</dd><dt>Network fee</dt><dd>Covered by Kobocent</dd><dt>Cashback</dt><dd style="color:#E8895F">0.2% back</dd></dl></div>
      <div class="cta" id="rev2">Review withdrawal</div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const sh = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Review withdrawal</div>
      <dl class="rows"><dt>You withdraw</dt><dd class="mono">$100.00 USDC</dd><dt>Bank</dt><dd>GTBank · 0123456789</dd><dt>Account name</dt><dd>ADA OKAFOR</dd></dl>
      <div class="line"></div>
      <dl class="rows"><dt>You receive</dt><dd style="font-weight:700;font-size:17px">₦148,000</dd><dt>Arrives</dt><dd>Usually within minutes</dd></dl>
      <div class="hold" id="hold2"><div class="fill" id="fill2"></div><span>Hold to send ₦148,000</span></div><div class="hint">Press and hold so nothing is sent by accident.</div></div>`));
    const s4 = add(el(`<div class="scr">${status}<div class="done">
      <div class="tick" id="tick2">${ic.check(50)}</div><div class="t" id="dt2">₦148,000 is on its way</div>
      <div class="b" id="db2">We’ve sent it to GTBank. It usually arrives within minutes.</div>
      <div class="token" id="ref" style="border-style:solid;border-color:#E4D8C6;text-align:left"><dl class="rows" style="margin-top:0"><dt>To</dt><dd>ADA OKAFOR</dd><dt>Reference</dt><dd class="mono">KC-7F3A-2291</dd><dt>Receipt</dt><dd style="color:#C1502E;font-weight:600">Download PDF</dd></dl></div>
      <div class="pill" id="cb2">+ ₦296 cashback for next time</div></div></div>`));
    const nt = add(el(`<div class="notif"><div class="app">₦</div><div><div class="tt">Bank alert</div><div class="bb">Credit: ₦148,000.00 · from Kobocent</div></div><div style="margin-left:auto;font-size:12px;color:#6B5D52">now</div></div>`));
    tap(4.35, $('[data-k=withdraw] .ic', s1)); tap(10.75, $('#rev2')); hold(13.2, 15.5, $('#hold2'));
    typeSfx(5.6, 6.5, 3); sfx.push({ t: 4.6, k: 'whoosh' }, { t: 8.4, k: 'ok' }, { t: 11.05, k: 'whoosh' }, { t: 15.75, k: 'success' }, { t: 18.2, k: 'ding' }, { t: 20.7, k: 'coin' });
    draw = (t) => {
      slide(s2, t, 4.6, s1); if (t < 4.6) set(s1, 1, '');
      $('#amt').textContent = '100'.slice(0, Math.round(3 * p(t, 5.6, 6.5)));
      $('#car2').style.opacity = t < 7 && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      rise($('#q2'), t, 6.5, 0.45, 20);
      $('#ngn').textContent = naira(148000 * io(p(t, 6.7, 7.9)));
      rise($('#acct'), t, 8.4, 0.4, 8);
      $('#rev2').style.opacity = t >= 6.6 ? 1 : 0.4;
      $('#rev2').textContent = t < 6.6 ? 'Enter an amount' : 'Review withdrawal';
      sheetIn(dim, sh, t, 11.05, 15.75);
      $('#fill2').style.width = 100 * p(t, 13.3, 15.5) + '%';
      slide(s4, t, 15.75, null);
      pop($('#tick2'), t, 16.0); rise($('#dt2'), t, 16.25); rise($('#db2'), t, 16.4); rise($('#ref'), t, 16.8, 0.5, 24);
      const q = out3(p(t, 18.2, 18.7)) * (1 - p(t, 23.6, 24.0));
      set(nt, q, `translateY(${lerp(-140, 0, q)}px)`);
      pop($('#cb2'), t, 20.7);
    };
  }

  if (V === 3) {
    DUR = 32; END = 26.4;
    HOOK = ['Stop tapping through menus.', 'Just say it.'];
    CAPS = [[3.1, 7.6, 'Kobo Pal', 'Type it like<br>a <em>text message</em>'], [7.6, 12.4, 'Pay', 'Check it. Confirm it.<br><em>Done.</em>'], [12.4, 18.2, 'Learn', 'Ask anything<br>about <em>your money</em>'], [18.2, 26.2, 'Protect', 'Lost your phone?<br><em>Freeze</em> in one tap.']];
    const M1 = 'Buy ₦1,000 airtime for 0801 234 5678', M2 = 'What is a stablecoin?', M3 = 'I lost my phone!';
    const chat = add(el(`<div class="chat">${status}
      <div class="chd"><div class="pal">${ic.spark}</div><div><div class="n">Kobo Pal</div><div class="s">● Online · @kobocentbot on Telegram</div></div></div>
      <div class="msgs" id="msgs">
        <div class="m p" data-a="3.0">Hi Ada 👋 What do you need?</div>
        <div class="m u" data-a="6.55">${M1}</div>
        <div class="m p" data-a="7.8">Got it. <b>₦1,000 airtime</b> to 0801&nbsp;234&nbsp;5678.<br>You pay <b>$0.68 USDC</b>. Network fee: covered.</div>
        <div class="btn" data-a="8.0" id="b1">✅ Confirm ₦1,000 airtime</div>
        <div class="m p" data-a="10.5">✅ Done. ₦1,000 airtime sent.<br>Receipt saved · <b>+₦2 cashback</b></div>
        <div class="m u" data-a="14.75">${M2}</div>
        <div class="m p" data-a="15.9">A digital dollar: steady like cash, fast like a message.</div>
        <div class="btn" data-a="16.1">📖 Read: What is a stablecoin?</div>
        <div class="m u" data-a="20.15">${M3}</div>
        <div class="m p" data-a="21.1">I’ve got you. Tap <b>Freeze my account</b> and no money can leave it, on any device.</div>
        <div class="btn" data-a="21.3" id="b3">🧊 Freeze my account</div>
        <div class="m p" data-a="23.9">🧊 Account frozen. Money can still come in.</div>
      </div>
      <div class="comp"><div class="tx" id="tx"></div><div class="send" id="snd">${ic.send}</div></div></div>`));
    const nodes = [...chat.querySelectorAll('[data-a]')].map((n) => ({ n, a: Number(n.dataset.a) }));
    const dots = el('<div class="dots"><i></i><i></i><i></i></div>');
    $('#msgs').appendChild(dots);
    const think = [[6.75, 7.8], [9.75, 10.5], [14.95, 15.9], [20.35, 21.1], [23.4, 23.9]];
    const typing = [[3.5, 6.3, M1], [12.7, 14.5, M2], [18.6, 19.9, M3]];
    // tap targets are measured with every message visible (the list is bottom-anchored, so measure per moment instead)
    const tapAt = (time, node) => { taps.push({ time, node }); sfx.push({ t: time, k: 'tap' }); };
    tapAt(6.5, $('#snd')); tapAt(9.6, $('#b1')); tapAt(14.7, $('#snd')); tapAt(20.1, $('#snd')); tapAt(23.2, $('#b3'));
    typing.forEach(([a, b, s]) => typeSfx(a, b, Math.round(s.length * 0.7)));
    sfx.push({ t: 7.8, k: 'pop' }, { t: 10.5, k: 'success' }, { t: 15.9, k: 'pop' }, { t: 21.1, k: 'pop' }, { t: 23.9, k: 'ok' });
    draw = (t) => {
      for (const { n, a } of nodes) {
        n.style.display = t >= a ? '' : 'none';
        const q = out3(p(t, a, a + 0.32)); set(n, q, `translateY(${lerp(14, 0, q)}px) scale(${lerp(0.96, 1, q)})`);
      }
      $('#b1').className = 'btn' + (t >= 9.65 ? ' on' : ''); $('#b3').className = 'btn' + (t >= 23.25 ? ' on' : '');
      const th = think.find(([a, b]) => t >= a && t < b);
      dots.style.display = th ? '' : 'none';
      if (th) [...dots.children].forEach((d, i) => { d.style.opacity = 0.35 + 0.65 * Math.max(0, Math.sin((t - th[0]) * 9 - i * 0.9)); });
      const ty = typing.find(([a, b]) => t >= a && t < b + 0.35);
      const tx = $('#tx');
      if (ty) { tx.className = 'tx'; tx.textContent = ty[2].slice(0, Math.round(ty[2].length * p(t, ty[0], ty[1]))); }
      else { tx.className = 'tx ph2'; tx.textContent = 'Message Kobo Pal'; }
      // resolve tap positions now that the layout for this moment is in place
      for (const k of taps) if (k.node && Math.abs(t - k.time) < 0.6) k.xy = at(k.node);
      for (const k of taps) if (!k.xy) k.xy = [0, 0];
    };
  }

  /* ───────── films 4–6 (2026-11-16): trading, Earn, cashback ───────── */
  const toggle = (id) => `<div class="tog" id="${id}"><i></i></div>`;
  const setTog = (node, on) => { node.className = 'tog' + (on ? ' on' : ''); };
  let FINE = null;

  if (V === 4) {
    // Mirrors the real flow (TradePanel + StrategyPanel): buy first, then the "Protect your ZURI" card —
    // suggested levels in one tap, or "Set my own levels" (take profit chips, trail, stop loss chips).
    DUR = 36; END = 30.4; FINE = 'Trading is risky. Not financial advice. Screens are illustrations.';
    HOOK = ['Don’t buy blind.', 'Check it. Buy it. Protect it.'];
    CAPS = [[3.1, 6.4, 'Step 1', 'Paste any <em>token</em>'], [6.4, 11.4, 'Step 2', 'Our read, scored<br><em>out of 100</em>'], [11.4, 18.6, 'Step 3', 'Buy with USDC.<br><em>Fee shown first.</em>'], [18.6, 21.4, 'Step 4', 'Protect it with the<br><em>suggested levels</em>'], [21.4, 26.2, 'Or', 'Set your own <em>take profit</em><br>and <em>stop loss</em>'], [26.2, 30.2, '24/7', 'At your target it <em>trails</em><br>the peak, then sells.']];
    const s0 = add(home('$186.20'));
    const s1 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Trade</div></div>
      <div class="sub2">Trade with USDC, USDT or SOL</div>
      <div class="field"><div class="input" id="srch" style="gap:10px"><span style="color:#6B5D52">${I.svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>', 20)}</span><span id="addr" class="mono" style="font-size:15px"></span><span id="addrph" style="color:#a39686;font-size:15px">Paste a token address</span></div></div>
      <div class="field" id="res"><div class="eyebrow">Result</div><div class="card" style="margin-top:8px;display:flex;align-items:center;gap:12px" id="row">
        <div class="tkn">Z</div><div style="flex:1"><div style="font-weight:700">ZURI</div><div style="font-size:12.5px;color:#6B5D52">Zuri · Solana</div></div>
        <div style="text-align:right"><div class="mono" style="font-weight:600">$0.0412</div><div style="font-size:12.5px;color:#58834C;font-weight:600">+4.2% today</div></div></div></div>
      <div class="field"><div class="eyebrow">Your tokens</div><div class="card" style="margin-top:8px;color:#6B5D52;font-size:13.5px">Nothing yet. Tokens you buy show up here.</div></div></div>`));
    const chipRow = (cols, items) => `<div class="cg" style="grid-template-columns:repeat(${cols},1fr)">${items.map(([id, label, sub]) => `<div class="chip2" ${id ? `id="${id}"` : ''}>${label}${sub ? `<small>${sub}</small>` : ''}</div>`).join('')}</div>`;
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph" style="position:relative;z-index:3"><div class="back">${ic.back}</div><div class="tkn" style="width:36px;height:36px;font-size:16px">Z</div><div class="t" style="font-size:21px">ZURI</div><div style="margin-left:auto;text-align:right"><div class="mono" style="font-weight:600;font-size:15px" id="hp">$0.0412</div><div style="font-size:11.5px;color:#58834C;font-weight:600" id="hc">+4.2% today</div></div></div>
      <div class="sa"><div id="pg">
        <div id="secA"><svg width="354" height="84" viewBox="0 0 354 92" style="margin-top:6px"><path id="ch1" d="M0 70 L30 66 L58 72 L90 58 L120 62 L150 48 L182 52 L212 38 L244 44 L276 30 L308 34 L354 20" fill="none" stroke="#C1502E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg></div>
        <div class="card" id="read" style="margin-top:8px"><div style="display:flex;align-items:center;gap:14px">
          <div class="gauge"><svg width="78" height="78" viewBox="0 0 78 78"><circle cx="39" cy="39" r="32" fill="none" stroke="#F0E6D8" stroke-width="8"/><circle id="arc" cx="39" cy="39" r="32" fill="none" stroke="#58834C" stroke-width="8" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90 39 39)"/></svg><div class="gn"><b id="sc">0</b><span>of 100</span></div></div>
          <div><div class="eyebrow">Our read right now</div><div style="font-weight:700;font-size:16px;margin-top:4px">Six live signals checked</div></div></div>
          <ul class="sig"><li id="g1">Liquidity $412K, locked</li><li id="g2">Top holder owns 3.1%</li><li id="g3">Buy pressure is rising</li><li id="g4">No red flags in the contract</li></ul></div>

        <div class="card" id="tp" style="margin-top:12px;padding:16px">
          <div class="seg" style="margin:0;grid-template-columns:1fr 1fr"><div class="on">Buy ZURI</div><div>Sell ZURI</div></div>
          <div class="lb4">Pay with</div>${chipRow(3, [['', 'USDC'], ['', 'USDT'], ['', 'SOL']]).replace('class="chip2"', 'class="chip2 on"')}
          <div class="lb4">Speed</div>${chipRow(2, [['', 'Normal', '1% fee'], ['', 'Ultra', 'MEV-protected, priority']]).replace('class="chip2"', 'class="chip2 on"')}
          <div class="amtbox" id="ab"><span class="display" style="font-size:34px;color:#6B5D52">$</span><span class="display" style="font-size:38px" id="a4"></span><span class="caret" id="car4" style="height:34px"></span><span style="margin-left:auto;font-weight:600;color:#6B5D52">USDC</span></div>
          <div class="pbtn" id="rvw">Review</div></div>

        <div class="card" id="prot" style="margin-top:12px;padding:16px">
          <div style="display:flex;gap:10px;align-items:center"><div style="width:40px;height:40px;border-radius:13px;background:rgba(193,80,46,.09);color:#C1502E;display:grid;place-items:center;flex:none">${I.svg('<path d="M12 3l7 3v5c0 5-3.500 8-7 10-3.500-2-7-5-7-10V6z"/>', 20)}</div>
            <div><div style="font-weight:700;font-size:16px">Protect your ZURI</div><div style="font-size:12.5px;color:#6B5D52">Checked every few seconds, 24/7 — even when your phone is off.</div></div></div>

          <div id="mSug"><div class="sug"><div style="font-size:12.5px;font-weight:700;color:#C1502E">Suggested for ZURI</div>
              <div class="lv"><span>Take profit</span><b class="mono" style="color:#58834C">$0.0515 · +25%</b></div>
              <div class="lv"><span>Then trail</span><b class="mono">15% below the peak</b></div>
              <div class="lv"><span>Stop loss</span><b class="mono" style="color:#B84A40">$0.0371 · −10%</b></div>
              <p>From the last 8 hours of 5-minute price action: the stop sits under the recent low, the target aims for 2.5× what the stop risks, and the trail is sized to how much ZURI usually swings.</p></div>
            <div class="pbtn" id="pw">Protect with these</div><div class="gbtn" id="own">Set my own levels</div>
            <p class="fine4">Suggestions read market data — never guarantees. 1% fee on the sale.</p></div>

          <div id="mOwn"><p class="fine4" style="margin-top:12px;font-size:12.5px">From your entry <b class="mono" style="color:#20211F">$0.0412</b> · now <span class="mono">$0.0412</span></p>
            <div class="seg" style="margin:8px 0 0"><div class="on">%</div><div>×</div><div>Price</div><div>MC</div></div>
            <div class="lv" style="margin-top:14px"><span style="font-weight:700;color:#20211F;font-size:14px">Take profit</span><b class="mono" style="color:#58834C" id="tpl"></b></div>
            ${chipRow(3, [['', '+25%'], ['tp50', '+50%'], ['', '2×'], ['', '3×'], ['', '5×'], ['', 'None']])}
            <div class="inp4">Or your own: % above your entry</div>
            <div class="lv" style="margin-top:12px"><span style="font-weight:700;color:#20211F;font-size:14px">Then trail <i style="font-style:normal;font-weight:400;color:#6B5D52;font-size:12px">— sell when it falls this far from its peak</i></span></div>
            ${chipRow(4, [['', '10%'], ['', '15%', 'suggested'], ['', '20%'], ['', '25%']]).replace('<div class="chip2" >15%', '<div class="chip2 on" >15%')}
            <div class="lv" style="margin-top:12px"><span style="font-weight:700;color:#20211F;font-size:14px">Stop loss</span><b class="mono" style="color:#B84A40" id="sll"></b></div>
            ${chipRow(5, [['', '−10%'], ['sl20', '−20%'], ['', '−30%'], ['', '−50%'], ['', 'None']])}
            <div class="inp4">Or your own: % below your entry</div>
            <div class="lb4" style="color:#20211F;font-weight:700;font-size:14px;text-transform:none;letter-spacing:0;font-family:Inter">When it sells, put the money in</div>
            ${chipRow(2, [['', 'USDC · no SOL needed'], ['', 'SOL']]).replace('class="chip2"', 'class="chip2 on"')}
            <div class="pbtn" id="pz">Protect ZURI</div>
            <p class="fine4">Fast markets can move past a level before the sale lands — a stop loss limits losses, it can’t guarantee the exact price. 1% fee on the sale.</p></div>

          <div id="mSt"><div class="stt"><div class="lv"><span>Status</span><b id="stat">Watching</b></div>
              <div class="lv"><span>Take profit</span><b class="mono">$0.0618 · +50%</b></div>
              <div class="lv"><span>Then sells when it falls</span><b class="mono">15% from the peak</b></div>
              <div class="lv"><span>Stop loss</span><b class="mono" style="color:#B84A40">$0.0330 · −20%</b></div>
              <div class="lv"><span>Sells into</span><b>USDC</b></div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px"><div class="gbtn" style="margin:0">Change</div><div class="gbtn" style="margin:0;color:#B84A40;border-color:rgba(184,74,64,.4)">Stop protecting</div></div></div>
        </div></div></div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const sh = add(el(`<div class="sheet"><div class="grab"></div>
      <div id="q4"><div class="t">Buy ZURI</div>
        <div style="margin-top:14px;font-size:12.5px;color:#6B5D52">You get about</div><div class="display" style="font-size:34px">480 ZURI</div>
        <dl class="rows"><dt>You pay</dt><dd class="mono">20.00 USDC</dd><dt>Fee</dt><dd class="mono">1% · $0.20</dd></dl>
        <p class="hint" style="text-align:left;margin-top:12px">Prices move fast. If what you get falls more than 3% before it sends, we stop and show you the new price.</p>
        <div class="hold" id="hold4"><div class="fill" id="fill4"></div><span>Hold to buy</span></div></div>
      <div id="o4" class="done" style="padding:10px 6px 0"><div class="tick" id="tick4">${ic.check(50)}</div><div class="t" style="font-size:27px">Bought ZURI</div><div class="b">480 ZURI for 20.00 USDC.</div><div class="pbtn" id="dn4" style="width:100%">Done</div></div></div>`));
    const pg = $('#pg'), yC = $('#tp').offsetTop - 6, modes = { s: $('#mSug'), o: $('#mOwn'), st: $('#mSt') };
    modes.o.style.display = 'none'; modes.st.style.display = 'none';
    const yD = $('#prot').offsetTop - 6;
    tap(3.75, $('[data-k=trade] .ic', s0)); tap(4.7, $('#srch')); tap(6.1, $('#row'));
    tapAt(12.4, $('#ab')); tapAt(14.0, $('#rvw')); holdAt(15.3, 16.9, $('#hold4')); tapAt(18.2, $('#dn4'));
    tapAt(21.4, $('#own')); tapAt(22.4, $('#tp50')); tapAt(23.8, $('#sl20')); tapAt(25.4, $('#pz'));
    typeSfx(12.7, 13.3, 2);
    sfx.push({ t: 3.95, k: 'whoosh' }, { t: 5.05, k: 'pop' }, { t: 5.5, k: 'ok' }, { t: 6.3, k: 'whoosh' }, { t: 8.2, k: 'ok' }, { t: 8.6, k: 'key' }, { t: 9.1, k: 'key' }, { t: 9.6, k: 'key' }, { t: 10.1, k: 'key' },
      { t: 11.6, k: 'swish' }, { t: 14.3, k: 'whoosh' }, { t: 17.05, k: 'success' }, { t: 18.8, k: 'swish' }, { t: 22.45, k: 'pop' }, { t: 23.85, k: 'pop' }, { t: 25.75, k: 'ok' }, { t: 29.0, k: 'coin' });
    draw = (t) => {
      slide(s1, t, 3.95, s0); if (t < 3.95) set(s0, 1, '');
      $('#srch').className = 'input' + (t >= 4.7 ? ' focus' : '');
      $('#addr').textContent = t >= 5.05 ? '7xKXt…Zuri9fQp' : ''; $('#addrph').style.display = t >= 5.05 ? 'none' : '';
      rise($('#res'), t, 5.45, 0.4, 14);
      slide(s2, t, 6.3, s1);
      $('#ch1').setAttribute('stroke-dashoffset', 1 - io(p(t, 6.6, 7.7)));
      const sc = Math.round(78 * io(p(t, 7.0, 8.2))); $('#sc').textContent = sc; $('#arc').setAttribute('stroke-dasharray', `${sc} 100`);
      [['#g1', 8.6], ['#g2', 9.1], ['#g3', 9.6], ['#g4', 10.1]].forEach(([s, a]) => rise($(s), t, a, 0.35, 10));
      // the page scrolls: down to the trade panel, then to the protect card, then a little further inside it
      const mode = t < 21.45 ? 's' : t < 25.75 ? 'o' : 'st';
      for (const k in modes) modes[k].style.display = k === mode ? '' : 'none';
      let y = lerp(0, yC, io(p(t, 11.4, 12.1)));
      y = lerp(y, yD, io(p(t, 18.6, 19.3)));
      y = lerp(y, yD + 190, io(p(t, 22.9, 23.5)));
      y = lerp(y, yD, io(p(t, 25.75, 26.2)));
      pg.style.transform = `translateY(${-y}px)`;
      $('#ab').className = 'amtbox' + (t >= 12.4 && t < 14.3 ? ' focus' : '');
      $('#a4').textContent = '20'.slice(0, Math.round(2 * p(t, 12.7, 13.3)));
      $('#car4').style.opacity = t >= 12.4 && t < 14 && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      $('#rvw').style.opacity = t >= 13.3 ? 1 : 0.4;
      sheetIn(dim, sh, t, 14.3, 18.3);
      const bought = t >= 17.05;
      $('#q4').style.display = bought ? 'none' : ''; $('#o4').style.display = bought ? '' : 'none';
      $('#fill4').style.width = 100 * p(t, 15.4, 16.9) + '%';
      pop($('#tick4'), t, 17.1);
      $('#tp50').className = 'chip2' + (t >= 22.45 ? ' on' : ''); $('#tpl').textContent = t >= 22.45 ? '$0.0618 · +50%' : '';
      $('#sl20').className = 'chip2' + (t >= 23.85 ? ' on' : ''); $('#sll').textContent = t >= 23.85 ? '$0.0330 · −20%' : '';
      $('#pz').style.opacity = t >= 22.45 ? 1 : 0.4;
      rise(modes.st, t, 25.75, 0.4, 14);
      const q = io(p(t, 26.6, 29.0)), pr = lerp(0.0412, 0.0618, q);
      $('#hp').textContent = '$' + pr.toFixed(4); $('#hc').textContent = '+' + (4.2 + 50 * q).toFixed(1) + '% today';
      const trailing = t >= 29.0;
      $('#stat').textContent = trailing ? 'Trailing — target reached' : 'Watching'; $('#stat').style.color = trailing ? '#58834C' : '';
    };
  }

  if (V === 5) {
    FINE = 'Rates can change and are not guaranteed. Screens are illustrations.';
    HOOK = ['Dollars sitting idle?', 'Put them to work.'];
    CAPS = [[3.1, 5.0, 'Step 1', 'Open <em>Earn</em>'], [5.0, 9.4, 'Step 2', 'Flexible or locked.<br><em>You choose.</em>'], [9.4, 15.3, 'Step 3', 'Stake any amount.<br><em>No network fees.</em>'], [15.3, 20.6, 'Watch', 'Earnings build<br><em>every hour</em>'], [20.6, 24.5, 'Yours', 'Withdraw <em>anytime</em>:<br>stake plus earnings.']];
    const s1 = add(home('$540.00'));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Earn</div></div>
      <div class="sub2">Put idle stablecoins to work. Earnings build every hour.</div>
      <div class="hero"><div class="r1"></div><div style="font-size:13.5px;opacity:.9">Earn up to</div><div class="display" style="font-size:42px;color:#fff">14% <span style="font-size:17px;font-weight:600;font-family:Inter">a year</span></div><div style="font-size:13.5px;opacity:.9;margin-top:4px;max-width:250px">on USDC, USDT or SOL. Pick a plan below.</div></div>
      <div class="plan" id="pf"><div><b>Flexible</b><span>Withdraw anytime</span><em>$100 earns ≈ $0.42 a month</em></div><div class="rt"><b>5%</b><span>a year · current rate</span></div></div>
      <div class="plan"><div><b>90-day lock</b><span>Locked 90 days</span><em>$100 earns ≈ $1.17 a month</em></div><div class="rt"><b>14%</b><span>a year · current rate</span></div></div>
      <div class="sub2" style="font-size:12.5px">Rates are what each plan pays today and can change.</div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const sh = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Flexible · 5%</div>
      <div class="eyebrow" style="margin-top:14px">Amount</div>
      <div class="input focus" style="height:62px;font-family:Fraunces,serif;font-weight:700;font-size:29px">$<span id="amt5"></span><span class="caret" id="car5" style="height:28px"></span><span style="margin-left:auto;font-family:Inter;font-size:14px;font-weight:600;color:#6B5D52">USDC</span></div>
      <dl class="rows" id="r5"><dt>Your stake</dt><dd class="mono">$200.00 USDC</dd><dt>Per day</dt><dd class="mono">≈ $0.027</dd><dt>Network fee</dt><dd>Covered by Kobocent</dd></dl>
      <div class="hint" style="text-align:left;margin-top:14px">Withdraw anytime, stake plus earnings. At today’s rate; rates can change.</div>
      <div class="hold" id="hold5"><div class="fill" id="fill5"></div><span>Hold to stake $200.00 USDC</span></div></div>`));
    const s4 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Earn</div></div>
      <div class="pad"><div class="eyebrow">Your positions</div>
        <div class="card" style="margin-top:10px;padding:18px" id="pos"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:700;font-size:16px">Flexible</div><div style="font-size:13px;color:#6B5D52">5% a year · Withdraw anytime</div></div><div class="daychip" id="day">Day 1</div></div>
          <div class="line"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px"><div><div class="eyebrow">Staked</div><div class="display" style="font-size:26px;margin-top:4px">$200.00</div></div><div><div class="eyebrow">Earned so far</div><div class="display" style="font-size:26px;margin-top:4px;color:#58834C" id="earned">$0.0000</div></div></div>
          <div class="barw"><i id="eb"></i></div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;color:#6B5D52;margin-top:8px"><span>Earning now</span><span>Added every hour</span></div></div>
        <div class="wd" id="wd">Withdraw</div>
        <div class="pill" id="got" style="margin-top:14px">You’ll receive about $200.82</div></div></div>`));
    tap(4.35, $('[data-k=earn] .ic', s1)); tap(8.85, $('#pf')); hold(12.7, 15.0, $('#hold5')); tap(20.9, $('#wd'));
    typeSfx(10.0, 10.9, 3); sfx.push({ t: 4.6, k: 'whoosh' }, { t: 9.15, k: 'whoosh' }, { t: 15.25, k: 'success' }, { t: 21.3, k: 'coin' });
    for (let k = 0; k < 10; k++) sfx.push({ t: 16.6 + k * 0.36, k: 'key' });
    draw = (t) => {
      slide(s2, t, 4.6, s1); if (t < 4.6) set(s1, 1, '');
      sheetIn(dim, sh, t, 9.15, 15.25);
      $('#amt5').textContent = '200'.slice(0, Math.round(3 * p(t, 10.0, 10.9)));
      $('#car5').style.opacity = t < 11.3 && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      rise($('#r5'), t, 11.1, 0.4, 12);
      $('#hold5').style.opacity = t >= 11.1 ? 1 : 0.4;
      $('#fill5').style.width = 100 * p(t, 12.8, 15.0) + '%';
      slide(s4, t, 15.25, null);
      rise($('#pos'), t, 15.5, 0.5, 24);
      const d = 1 + 29 * io(p(t, 16.4, 20.2));
      $('#day').textContent = 'Day ' + Math.round(d);
      $('#earned').textContent = '$' + ((200 * 0.05) / 365 * (d - 1 + p(t, 15.9, 16.4))).toFixed(4);
      $('#eb').style.width = 100 * ((d - 1) / 29) + '%';
      rise($('#wd'), t, 15.8, 0.5, 20);
      $('#wd').className = 'wd' + (t >= 20.95 ? ' on' : '');
      pop($('#got'), t, 21.3);
    };
  }

  if (V === 6) {
    HOOK = ['Every payment pays you back.', 'Here’s how to spend it.'];
    CAPS = [[3.1, 9.3, 'Earn it', '<em>0.2% back</em> on every<br>bill and withdrawal'], [9.3, 13.6, 'From ₦50', 'A switch appears<br>at <em>checkout</em>'], [13.6, 18.9, 'Use it', 'Turn it on.<br><em>Pay less.</em>'], [18.9, 24.5, 'Repeat', 'And every payment<br>earns <em>more</em>.']];
    const rowsData = [['bolt', 'Electricity', '₦5,000', 10, 4.0], ['bank', 'Withdrawal', '₦148,000', 296, 5.0], ['phone', 'Airtime', '₦1,000', 2, 6.0], ['up', 'Bank transfer', '₦25,000', 50, 7.0]];
    const s1 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Cashback</div></div>
      <div class="hero" style="margin-top:14px"><div class="r1"></div><div style="font-size:13.5px;opacity:.9">Your cashback</div><div class="display" style="font-size:46px;color:#fff" id="cbt">₦0</div><div style="font-size:13.5px;opacity:.9;margin-top:4px">0.2% of every bill, bank transfer and withdrawal</div></div>
      <div class="field"><div class="eyebrow">From your payments</div>
        ${rowsData.map(([i, n, a, c2], k) => `<div class="lrow" id="lr${k}"><div class="lic">${ic[i]}</div><div style="flex:1"><b>${n}</b><span>${a}</span></div><div class="plus">+₦${c2}</div></div>`).join('')}</div>
      <div style="display:flex;justify-content:center"><div class="pill" id="ready">${ic.check(18)} Ready to use at checkout</div></div></div>`));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Pay bills</div></div>
      <div class="seg"><div>Airtime</div><div>Data</div><div class="on">Electricity</div><div>Cable TV</div></div>
      <div class="field"><div class="eyebrow">Meter number</div><div class="input">0101 2345 678</div><div class="ok">${ic.check(18)} ADA OKAFOR · Wuse, Abuja</div></div>
      <div class="field"><div class="eyebrow">Amount</div><div class="chips"><div class="chip">₦2,000</div><div class="chip">₦5,000</div><div class="chip on">₦10,000</div></div></div>
      <div class="cta">Review ₦10,000 electricity</div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const sh = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Review electricity</div>
      <dl class="rows"><dt>Meter</dt><dd class="mono">0101 2345 678</dd><dt>Electricity</dt><dd>₦10,000</dd><dt>You pay</dt><dd class="mono"><s id="old" style="color:#6B5D52;margin-right:6px">$6.76</s><span id="pay">$6.76 USDC</span></dd><dt id="cbk">Cashback</dt><dd id="cbv" class="mono" style="color:#58834C">−$0.10</dd></dl>
      <div class="cbt" id="cbx"><div class="gift">${I.svg('<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M3 7h18v3H3z"/><path d="M12 7v13"/><path d="M12 7c-2-4-6-3-5-1s5 1 5 1c0 0 4 1 5-1s-3-3-5 1z"/>', 18)}</div>
        <div style="flex:1"><b>Use ₦150 cashback</b><span id="cbs">You have ₦358 spendable from your payments.</span></div>${toggle('t6')}</div>
      <div class="hold" id="hold6"><div class="fill" id="fill6"></div><span>Hold to pay ₦10,000</span></div><div class="hint">Press and hold so nothing is paid by accident.</div></div>`));
    const s4 = add(el(`<div class="scr">${status}<div class="done">
      <div class="tick" id="tick6">${ic.check(50)}</div><div class="t" id="dt6">₦10,000 electricity paid</div><div class="b" id="db6">Your cashback paid ₦150 of the fee.</div>
      <div class="token" id="left6" style="border-style:solid;border-color:#E4D8C6;text-align:left"><dl class="rows" style="margin-top:0"><dt>Cashback used</dt><dd style="color:#58834C;font-weight:700">₦150</dd><dt>New from this bill</dt><dd style="color:#58834C;font-weight:700">+₦20</dd><dt>Left for next time</dt><dd style="font-weight:700">₦228</dd></dl></div>
      <div class="pill" id="cb6">Every payment adds more</div></div></div>`));
    const totals = [[4.0, 0, 10], [5.0, 10, 306], [6.0, 306, 308], [7.0, 308, 358]];
    tap(14.2, $('#t6')); hold(16.3, 18.5, $('#hold6'));
    rowsData.forEach((r, k) => sfx.push({ t: r[4], k: 'coin' }));
    sfx.push({ t: 8.2, k: 'ok' }, { t: 9.5, k: 'whoosh' }, { t: 10.15, k: 'whoosh' }, { t: 14.3, k: 'pop' }, { t: 18.8, k: 'success' }, { t: 20.6, k: 'coin' });
    draw = (t) => {
      rowsData.forEach((r, k) => rise($('#lr' + k), t, r[4], 0.4, 16));
      let tot = 0; for (const [a, from, to] of totals) if (t >= a) tot = lerp(from, to, io(p(t, a, a + 0.7)));
      $('#cbt').textContent = '₦' + Math.round(tot);
      pop($('#ready'), t, 8.2);
      slide(s2, t, 9.5, s1); if (t < 9.5) set(s1, 1, '');
      sheetIn(dim, sh, t, 10.15, 18.8);
      const on = t >= 14.25;
      setTog($('#t6'), on); $('#cbx').className = 'cbt' + (on ? ' on' : '');
      $('#cbs').textContent = on ? 'You pay ₦150 less. ₦208 stays for next time.' : 'You have ₦358 spendable from your payments.';
      $('#old').style.display = on ? '' : 'none'; $('#pay').textContent = on ? '$6.66 USDC' : '$6.76 USDC';
      $('#cbk').style.display = $('#cbv').style.display = on ? '' : 'none';
      $('#fill6').style.width = 100 * p(t, 16.4, 18.5) + '%';
      slide(s4, t, 18.8, null);
      pop($('#tick6'), t, 19.05); rise($('#dt6'), t, 19.3); rise($('#db6'), t, 19.45); rise($('#left6'), t, 19.9, 0.5, 24); pop($('#cb6'), t, 20.6);
    };
  }

  /* ───────── films 7–9 (2026-11-17): send to any wallet, first deposit, freeze + move to a new wallet ───────── */
  if (V === 7) {
    FINE = 'Onchain transfers can’t be reversed. Screens are illustrations.';
    HOOK = ['Sending money abroad?', 'Dollars arrive in seconds.'];
    CAPS = [[3.1, 5.0, 'Step 1', 'Tap <em>Send to wallet</em>'], [5.0, 10.5, 'Step 2', 'Paste their address.<br>Pick the <em>network</em>.'], [10.5, 15.5, 'Step 3', 'Check the address.<br><em>Hold to send.</em>'], [15.5, 20.4, 'Done', 'Sent. Seconds<br>on <em>Solana</em>.'], [20.4, 24.5, 'Anywhere', 'Any wallet or exchange,<br>on <em>six networks</em>.']];
    const ADDR = 'DEMo7xKXtg2Cw87d97TXJSDpbD5jBkheZk9fQp';
    const s1 = add(home('$420.00'));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Send to wallet</div></div>
      <div class="sub2">Move crypto to any wallet or exchange — on six networks.</div>
      <div class="field"><div style="font-size:13px;color:#6B5D52">Network</div><div class="nets"><div class="on">Solana</div><div>Ethereum</div><div>BNB Chain</div><div>Polygon</div></div></div>
      <div class="field"><div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 14px"><div class="coin">$</div><div style="flex:1"><div style="font-weight:700;font-size:16px">USDC</div><div style="font-size:13px;color:#6B5D52">on Solana</div></div><div class="mono" style="font-size:13.5px;color:#6B5D52">420.00</div></div></div>
      <div class="field"><div class="card" style="padding:12px 14px"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:13px;color:#6B5D52">To</span><span class="pst" id="pst">Paste</span></div>
        <div class="mono" id="to7" style="font-size:13px;word-break:break-all;min-height:22px;margin-top:4px;color:#a39686">e.g. 7xKX…</div>
        <div class="ok" id="val7" style="font-size:13px">${ic.check(15)} Valid Solana address · new — double-check it</div></div></div>
      <div class="field"><div class="card" style="padding:10px 14px"><div style="font-size:13px;color:#6B5D52">Amount</div><div style="display:flex;align-items:baseline;gap:6px"><span class="display" style="font-size:36px" id="a7"></span><span class="caret" id="car7" style="height:32px"></span><span style="margin-left:auto;font-weight:600;color:#6B5D52">USDC</span></div></div></div>
      <div class="field" id="q7"><dl class="card rows" style="margin-top:0;font-size:13.5px"><dt>They receive</dt><dd class="mono" style="font-weight:700">49.25 USDC</dd><dt>Kobocent fee (1.5%)</dt><dd class="mono">0.75 USDC</dd></dl></div>
      <div class="cta" id="rv7">Review</div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const sh = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Review transfer</div>
      <div style="text-align:center;padding:10px 0 4px"><div style="font-size:13px;color:#6B5D52">They receive</div><div class="display" style="font-size:32px">49.25 USDC</div><div style="font-size:13px;color:#6B5D52">on Solana</div></div>
      <div class="card" style="padding:12px 14px"><div style="font-size:12px;color:#6B5D52">To</div><div class="mono" style="font-size:14px;word-break:break-all;line-height:1.5"><b style="color:#C1502E">DEMo7x</b>KXtg2Cw87d97TXJSDpbD5jBkhe<b style="color:#C1502E">Zk9fQp</b></div></div>
      <dl class="rows" style="margin-top:12px;font-size:13.5px"><dt>You send</dt><dd class="mono">50 USDC</dd><dt>Fee (1.5%)</dt><dd class="mono">0.75</dd></dl>
      <div class="chk" id="chk7"><i id="box7"></i><span>I’ve checked the first and last characters, and this is a <b>Solana</b> address. Transfers can’t be reversed.</span></div>
      <div class="hold" id="hold7"><div class="fill" id="fill7"></div><span id="hl7">Tick the box to continue</span></div></div>`));
    const s4 = add(el(`<div class="scr">${status}<div class="done">
      <div class="tick" id="tick7">${ic.check(50)}</div><div class="t" id="dt7">Sent</div><div class="b" id="db7">49.25 USDC is on its way on Solana.</div>
      <div class="token" id="ex7" style="border-style:solid;border-color:#E4D8C6;text-align:left"><dl class="rows" style="margin-top:0"><dt>To</dt><dd class="mono">DEMo7x…Zk9fQp</dd><dt>Arrives</dt><dd>Seconds on Solana</dd><dt>Proof</dt><dd style="color:#C1502E;font-weight:600">View on explorer</dd></dl></div>
      <div class="netp" id="np7">${['Solana', 'Ethereum', 'BNB Chain', 'Polygon', 'Arbitrum', 'Robinhood Chain'].map((n) => `<span>${n}</span>`).join('')}</div></div></div>`));
    tap(4.35, $('[data-k=wallet] .ic', s1)); tap(6.3, $('#pst')); tap(10.15, $('#rv7')); tap(12.3, $('#box7')); hold(13.3, 15.1, $('#hold7'));
    typeSfx(7.6, 8.3, 2);
    sfx.push({ t: 4.6, k: 'whoosh' }, { t: 6.35, k: 'pop' }, { t: 6.9, k: 'ok' }, { t: 10.45, k: 'whoosh' }, { t: 12.35, k: 'pop' }, { t: 15.4, k: 'success' }, { t: 20.6, k: 'coin' });
    draw = (t) => {
      slide(s2, t, 4.6, s1); if (t < 4.6) set(s1, 1, '');
      const pasted = t >= 6.35;
      $('#to7').textContent = pasted ? ADDR : 'e.g. 7xKX…'; $('#to7').style.color = pasted ? '#20211F' : '#a39686';
      rise($('#val7'), t, 6.9, 0.35, 8);
      $('#a7').textContent = '50'.slice(0, Math.round(2 * p(t, 7.6, 8.3)));
      $('#car7').style.opacity = t >= 7.3 && t < 9 && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      rise($('#q7'), t, 8.6, 0.4, 14);
      $('#rv7').style.opacity = t >= 8.6 ? 1 : 0.4;
      sheetIn(dim, sh, t, 10.45, 15.4);
      const ticked = t >= 12.35;
      $('#box7').className = ticked ? 'on' : ''; $('#hl7').textContent = ticked ? 'Hold to send' : 'Tick the box to continue'; $('#hold7').style.opacity = ticked ? 1 : 0.4;
      $('#fill7').style.width = 100 * p(t, 13.4, 15.1) + '%';
      slide(s4, t, 15.4, null);
      pop($('#tick7'), t, 15.65); rise($('#dt7'), t, 15.9); rise($('#db7'), t, 16.05); rise($('#ex7'), t, 16.5, 0.5, 24);
      [...$('#np7').children].forEach((n, k) => pop(n, t, 20.6 + k * 0.14, 0.4));
    };
  }

  if (V === 8) {
    HOOK = ['New to Kobocent?', 'Add money in three steps.'];
    CAPS = [[3.1, 5.0, 'Step 1', 'Tap <em>Add money</em>'], [5.0, 9.9, 'Step 2', 'Verify once. Get<br><em>your own</em> account number.'], [9.9, 15.4, 'Step 3', 'Transfer from<br><em>any bank app</em>'], [15.4, 20.0, 'Arrived', 'Naira in.<br><em>USDC out.</em>'], [20.0, 24.5, 'Ready', 'Now pay, send,<br>withdraw or <em>earn</em>.']];
    const s1 = add(home('$0.00'));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Add money</div></div>
      <div class="sub2">Send naira from any Nigerian bank app — it arrives in your wallet as USDC.</div>
      <div class="field"><div class="card" style="padding:18px"><div class="display" style="font-size:21px">Verify once with BVN or NIN</div>
        <div style="font-size:13.5px;color:#6B5D52;margin-top:6px;line-height:1.45">Nigerian rules require it to open an account in your name. Either one works.</div>
        <div class="seg" style="margin:14px 0 0;grid-template-columns:1fr 1fr"><div class="on">BVN</div><div>NIN</div></div>
        <div class="input focus" style="margin-top:12px;letter-spacing:.3em;font-size:20px"><span id="bvn"></span><span class="caret" id="car8"></span><span id="bph" style="letter-spacing:0;font-size:15px;color:#a39686">11-digit BVN</span></div>
        <div class="ok" style="font-size:12.5px">${I.svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>', 15)} Encrypted the moment it’s saved — never shown in full again.</div>
        <div style="font-size:12.5px;color:#6B5D52;margin-top:8px">Used only to open your account. We can’t move money with it.</div></div></div>
      <div class="cta" id="get8">Get your account number</div></div>`));
    const s3 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Add money</div></div>
      <div class="acct" id="ac8"><div class="c1"></div><div class="c2"></div><div style="font-size:13px;opacity:.8;font-weight:500">Your own account number</div>
        <div class="mono" style="font-size:33px;font-weight:600;letter-spacing:.08em;margin-top:10px">901 234 5678</div><div style="font-size:14px;opacity:.9;margin-top:8px">Kobocent - Ada Okafor</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px"><div class="ab1" id="cp8">Copy number</div><div class="ab2">Share details</div></div></div>
      <div class="field" id="st8"><div class="card" style="display:flex;gap:14px;align-items:center;padding:14px" id="stc"><div class="spin" id="sp8"></div><div><div style="font-weight:700;font-size:15px" id="s8t">Waiting for your transfer…</div><div style="font-size:13px;color:#6B5D52;margin-top:2px;line-height:1.4" id="s8b">Bank transfers usually land in 1–5 minutes.</div></div></div>
        <div class="pbtn" id="see8" style="margin-top:10px">See my balance</div></div>
      <div class="field" id="calc8"><div class="card" style="padding:14px 16px"><div class="eyebrow">If you send</div><div class="display" style="font-size:30px;margin-top:4px">₦50,000</div>
        <div class="nets" style="margin-top:8px"><div>₦5,000</div><div>₦10,000</div><div class="on">₦50,000</div><div>₦100,000</div></div>
        <div style="background:#20211F;color:#F7F3EE;border-radius:16px;padding:12px 14px;margin-top:10px"><div style="font-size:13px;opacity:.7">You receive</div><div class="display" style="font-size:27px;color:#F7F3EE">33.56 USDC</div></div>
        <div style="font-size:12px;color:#6B5D52;margin-top:8px;line-height:1.4">The estimate uses today’s rate; your USDC is priced when the transfer arrives.</div></div></div></div>`));
    const s5 = add(home('$33.56'));
    tap(4.35, $('.b1', s1)); tap(8.3, $('#get8')); tap(11.3, $('#cp8')); tapAt(19.5, $('#see8'));
    typeSfx(6.0, 7.4, 11);
    sfx.push({ t: 4.6, k: 'whoosh' }, { t: 9.75, k: 'whoosh' }, { t: 11.35, k: 'pop' }, { t: 15.5, k: 'ding' }, { t: 17.2, k: 'success' }, { t: 19.95, k: 'whoosh' }, { t: 20.9, k: 'coin' });
    draw = (t) => {
      slide(s2, t, 4.6, s1); if (t < 4.6) set(s1, 1, '');
      const n = Math.round(11 * p(t, 6.0, 7.4));
      $('#bvn').textContent = '•'.repeat(n); $('#bph').style.display = n ? 'none' : '';
      $('#car8').style.opacity = t < 8 && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      const opening = t >= 8.35;
      $('#get8').textContent = opening ? 'Opening your account…' : 'Get your account number'; $('#get8').style.opacity = n >= 11 ? (opening ? 0.75 : 1) : 0.4;
      slide(s3, t, 9.75, s2);
      rise($('#ac8'), t, 9.95, 0.5, 26); rise($('#calc8'), t, 10.3, 0.5, 26);
      $('#cp8').textContent = t >= 11.35 && t < 13.2 ? 'Copied ✓' : 'Copy number';
      // status card: hidden → waiting → arrived, converting → received
      $('#st8').style.display = t >= 12.6 ? '' : 'none'; rise($('#st8'), t, 12.6, 0.45, 18);
      const phase = t < 15.5 ? 0 : t < 17.2 ? 1 : 2;
      $('#s8t').textContent = ['Waiting for your transfer…', '₦50,000 arrived — sending your USDC…', '₦50,000 received'][phase];
      $('#s8b').textContent = ['Bank transfers usually land in 1–5 minutes.', 'Usually under a minute from here.', '33.56 USDC is in your wallet.'][phase];
      $('#sp8').className = phase === 2 ? 'spin okk' : 'spin'; $('#sp8').style.transform = phase === 2 ? '' : `rotate(${t * 300}deg)`;
      $('#stc').style.borderColor = phase === 2 ? '#58834C' : ''; $('#stc').style.background = phase === 2 ? 'rgba(88,131,76,.1)' : '';
      $('#see8').style.display = phase === 2 ? '' : 'none'; rise($('#see8'), t, 17.5, 0.4, 12);
      $('#calc8').style.display = t >= 17.2 ? 'none' : '';
      slide(s5, t, 19.95, null);
      const amt = $('.amt', s5), subl = $('.sub', s5), v8 = 33.56 * io(p(t, 20.4, 21.4));
      amt.textContent = '$' + v8.toFixed(2); subl.textContent = 'Stablecoins $' + v8.toFixed(2);
    };
  }

  if (V === 9) {
    DUR = 32; END = 26.4; FINE = 'A freeze stops moves made through Kobocent. Screens are illustrations.';
    HOOK = ['Phone lost or stolen?', 'Freeze your money in one tap.'];
    CAPS = [[3.1, 6.2, 'Step 1', 'Open <em>Account protection</em>'], [6.2, 12.2, 'Freeze', 'One tap. No money<br>can <em>leave</em>.'], [12.2, 17.6, 'Unfreeze', 'Only with your<br><em>security questions</em>'], [17.6, 26.2, 'Leaked phrase?', 'Move to a<br><em>new wallet</em>']];
    const rowS = (icn, t1, t2, id) => `<div class="srow" ${id ? `id="${id}"` : ''}><div class="lic">${icn}</div><div style="flex:1"><b>${t1}</b><span>${t2}</span></div><span style="color:#a39686">›</span></div>`;
    const shield = I.svg('<path d="M12 3l7 3v5c0 5-3.500 8-7 10-3.500-2-7-5-7-10V6z"/>', 20), snow = I.svg('<path d="M12 3v18M4.200 7.500l15.600 9M19.800 7.500l-15.600 9"/>', 20), keyI = I.svg('<circle cx="8" cy="14" r="4"/><path d="M11 11l8-8M16 6l3 3"/>', 20);
    const s1 = add(el(`<div class="scr">${status}
      <div class="pad" style="padding-top:8px"><div class="display" style="font-size:28px">Settings</div></div>
      <div class="field">${rowS(ic.card, 'Your profile', 'Name, photo and email')}${rowS(shield, 'Account protection', 'Freeze, security questions, new wallet', 'ap')}${rowS(ic.cog, 'App lock & sign-in', 'PIN and sign-in methods')}${rowS(ic.bell, 'Notifications', 'Money in, payments and bridges')}${rowS(ic.cup, 'Invite friends', 'Earn from their fees')}</div>
      <div class="tabs"><div>${ic.home}Home</div><div>${ic.list}Activity</div><div>${ic.cup}Rewards</div><div>${ic.card}Card</div><div class="on">${ic.cog}Settings</div></div></div>`));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Account protection</div></div>
      <div class="field" id="okc"><div class="card" style="padding:16px"><div style="display:flex;gap:12px;align-items:center"><div class="lic" style="background:rgba(193,80,46,.09);color:#C1502E">${snow}</div><div><b style="font-size:16px">Freeze my account</b><div style="font-size:13px;color:#6B5D52;line-height:1.4">Lost your phone? One tap stops all money leaving, everywhere.</div></div></div><div class="pbtn" id="fz">Freeze my account</div></div></div>
      <div class="field" id="frz"><div class="card" style="padding:16px;border-color:#6FA8C9;background:rgba(111,168,201,.12)"><div style="display:flex;gap:12px;align-items:center"><div class="lic" style="background:#3F7FA6;color:#fff">${snow}</div><div><b style="font-size:16px">Your account is frozen.</b><div style="font-size:13px;color:#6B5D52;line-height:1.4">No money can leave it, from the app or from Telegram.</div></div></div><div class="gbtn" id="uf" style="border-color:#3F7FA6;color:#3F7FA6">Unfreeze my account</div></div></div>
      <div class="field" id="open9"><div class="card" style="padding:14px 16px;border-color:#58834C;background:rgba(88,131,76,.1)"><b style="color:#58834C">Your account is open again</b><div style="font-size:13px;color:#6B5D52;margin-top:2px;line-height:1.4">For 24 hours, money can only go to banks and wallets you have paid before.</div></div></div>
      <div class="field"><div class="card" style="padding:16px"><div style="display:flex;gap:12px;align-items:center"><div class="lic" style="background:rgba(193,80,46,.09);color:#C1502E">${keyI}</div><div><b style="font-size:16px">Move to a new wallet</b><div style="font-size:13px;color:#6B5D52;line-height:1.4">Recovery phrase leaked? Get new keys and move your money there.</div></div></div><div class="gbtn" id="mv">Move to a new wallet</div>
        <div id="moved9" style="margin-top:12px;border-top:1px solid #E4D8C6;padding-top:12px;font-size:13.5px"><div style="color:#58834C;font-weight:700">${'✓'} Moved. Your old phrase no longer controls this account.</div><div style="margin-top:6px;color:#6B5D52">New onchain wallet: <span class="mono" style="color:#20211F">9fQp…D3mo</span></div><div style="color:#6B5D52">New 0x wallet: <span class="mono" style="color:#20211F">0x71…dEm0</span></div></div></div></div>
      <div class="field"><div class="card" style="padding:14px 16px;display:flex;align-items:center;gap:12px"><div class="lic">${shield}</div><div style="flex:1"><b>Security questions</b><span style="display:block;font-size:13px;color:#58834C;font-weight:600">Questions saved</span></div></div></div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const shA = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Freeze my account</div>
      <div class="eyebrow" style="margin-top:14px">Good to know first</div>
      <div class="gk"><b>Stops at once</b><span>Withdrawals, sends, bills, bridges, swaps, buying tokens and showing your recovery phrase, on every device.</span></div>
      <div class="gk"><b>Keeps working</b><span>Money coming in, and any stop loss, take profit or trailing exit you already set.</span></div>
      <div class="pbtn" id="fz2">Freeze my account</div></div>`));
    const shB = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Unfreeze</div>
      <div style="font-size:14px;color:#6B5D52;margin-top:8px;line-height:1.45">Answer your three security questions to open your account.</div>
      ${[1, 2, 3].map((k) => `<div class="input" style="margin-top:10px;height:48px;font-size:15px"><span style="color:#6B5D52;font-size:13px;margin-right:10px">Answer ${k}</span><span class="an" style="letter-spacing:.25em"></span></div>`).join('')}
      <div style="font-size:12.5px;color:#6B5D52;margin-top:8px">Capitals and spaces don’t matter.</div><div class="pbtn" id="ct9">Continue</div></div>`));
    const shC = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Move to a new wallet</div>
      <div id="mvA"><div class="gk" style="margin-top:14px"><b>What changes</b><span>New wallet addresses on every chain, and a new recovery phrase. Your old phrase stops controlling this account.</span></div>
        <div class="gk"><b>What stays</b><span>Your account, balance, tokens and history. Stop losses pause for a few minutes while it moves.</span></div>
        <div style="font-size:12.5px;color:#B84A40;margin-top:10px;line-height:1.4">You can’t undo this. Save your new recovery phrase, and give anyone who pays you your new address.</div>
        <div class="pbtn" id="ct9b">Continue</div></div>
      <div id="mvB" style="padding:20px 0 6px;text-align:center"><div style="font-weight:700;font-size:16px">Moving your money to new keys…</div><div class="barw" style="margin-top:16px"><i id="mb9" style="background:#C1502E"></i></div><div style="font-size:13px;color:#6B5D52;margin-top:10px">Usually a few minutes. You can leave this screen.</div></div></div>`));
    const ans = [...shB.querySelectorAll('.an')];
    tap(4.5, $('#ap')); tap(6.7, $('#fz')); tap(9.5, $('#fz2')); tapAt(12.6, $('#uf')); tap(16.0, $('#ct9')); tapAt(18.2, $('#mv')); tap(21.6, $('#ct9b'));
    typeSfx(13.6, 15.5, 12);
    sfx.push({ t: 4.75, k: 'whoosh' }, { t: 7.0, k: 'whoosh' }, { t: 9.75, k: 'ding' }, { t: 12.95, k: 'whoosh' }, { t: 16.3, k: 'success' }, { t: 18.55, k: 'whoosh' }, { t: 24.0, k: 'success' });
    draw = (t) => {
      slide(s2, t, 4.75, s1); if (t < 4.75) set(s1, 1, '');
      sheetIn(dim, shA, t, 7.0, 9.6);
      const frozen = t >= 9.75 && t < 16.3;
      $('#okc').style.display = frozen ? 'none' : ''; $('#frz').style.display = frozen ? '' : 'none';
      if (frozen) pop($('#frz'), t, 9.75, 0.45);
      const dimB = out3(p(t, 12.95, 13.4)) * (1 - p(t, 16.1, 16.35));
      const dimC = out3(p(t, 18.55, 19.0)) * (1 - p(t, 23.8, 24.05));
      if (t >= 12.9) { dim.style.opacity = Math.max(dimB, dimC); dim.style.visibility = Math.max(dimB, dimC) > 0 ? 'visible' : 'hidden'; }
      set(shB, 1, `translateY(${lerp(110, 0, dimB)}%)`); shB.style.visibility = dimB > 0 ? 'visible' : 'hidden';
      set(shC, 1, `translateY(${lerp(110, 0, dimC)}%)`); shC.style.visibility = dimC > 0 ? 'visible' : 'hidden';
      ans.forEach((a, k) => { a.textContent = '•'.repeat(Math.round(7 * p(t, 13.6 + k * 0.65, 14.2 + k * 0.65))); });
      $('#open9').style.display = t >= 16.3 && t < 24.0 ? '' : 'none'; rise($('#open9'), t, 16.3, 0.4, 12);
      const moving = t >= 21.65;
      $('#mvA').style.display = moving ? 'none' : ''; $('#mvB').style.display = moving ? '' : 'none';
      $('#mb9').style.width = 100 * io(p(t, 21.8, 23.7)) + '%';
      $('#moved9').style.display = t >= 24.0 ? '' : 'none'; rise($('#moved9'), t, 24.0, 0.45, 12);
      $('#mv').style.display = t >= 24.0 ? 'none' : '';
    };
  }

  /* ───────── films 10–13 (2026-11-17): send to bank, bridge, swap, crypto deposit. Built from the real screens:
     app/app/send, app/app/bridge, app/app/swap, components/app/ReceiveCrypto. ───────── */
  const pill = (sym, sub, col, id) => `<div class="tokp" ${id ? `id="${id}"` : ''}><i style="background:${col}">${sym === 'SOL' ? '◎' : sym === 'ETH' ? 'E' : '$'}</i><span>${sym}${sub ? `<small>${sub}</small>` : ''}</span></div>`;

  if (V === 10) {
    HOOK = ['Need to pay someone?', 'Send naira from your dollars.'];
    CAPS = [[3.1, 5.0, 'Step 1', 'Tap <em>Send to bank</em>'], [5.0, 11.2, 'Step 2', 'Their bank and number.<br>We check the <em>name</em>.'], [11.2, 15.4, 'Step 3', 'Type the naira.<br>See what <em>you pay</em>.'], [15.4, 20.0, 'Step 4', 'Review.<br><em>Hold to send.</em>'], [20.0, 24.5, 'Done', 'They get <em>naira</em>,<br>usually in minutes.']];
    const s1 = add(home('$186.40'));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Send to bank</div></div>
      <div class="sub2">Pay anyone in Nigeria from your USDC or USDT — they receive naira, usually in minutes.</div>
      <div class="field"><div class="card" style="padding:16px"><div class="eyebrow">1 · Their bank</div>
        <div id="bsrch"><div class="input" style="height:48px;font-size:15px;color:#a39686;margin-top:10px">Search — e.g. GTBank, Opay, Moniepoint</div>
          <div class="brow" id="bk"><i>AB</i><span>Access Bank</span><em>›</em></div><div class="brow"><i>GT</i><span>GTBank</span><em>›</em></div><div class="brow"><i>OP</i><span>Opay</span><em>›</em></div></div>
        <div id="bsel" class="bsel"><i>AB</i><span>Access Bank</span><em>Change</em></div></div></div>
      <div class="field"><div class="card" style="padding:16px" id="c2"><div class="eyebrow">2 · Account number</div>
        <div class="input" id="an" style="height:56px;margin-top:10px;font-family:'IBM Plex Mono',monospace;font-size:21px;letter-spacing:.12em"><span id="acn"></span><span class="caret" id="car10"></span></div>
        <div id="chk10" style="display:flex;gap:10px;align-items:center;color:#6B5D52;font-size:14px;margin-top:12px"><div class="spin" style="width:20px;height:20px;border-width:2px" id="sp10"></div>Checking with Access Bank…</div>
        <div id="nm10" class="nmok"><b>${ic.check(16, '#fff')}</b><div><div style="font-size:12.5px;color:#6B5D52">Account name</div><div style="font-weight:700">CHIDI EZE</div></div></div></div></div>
      <div class="cta" id="ct10">Continue</div></div>`));
    const s3 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Send to bank</div></div>
      <div class="field"><div class="card" style="display:flex;align-items:center;gap:12px;padding:12px 14px"><div class="bi">AB</div><div style="flex:1"><div style="font-size:12.5px;color:#6B5D52">Send to</div><div style="font-weight:700">CHIDI EZE</div><div style="font-size:13px;color:#6B5D52">Access Bank · 0123456789</div></div><span style="color:#C1502E;font-weight:600;font-size:13.5px">Change</span></div></div>
      <div class="field"><div class="card" style="padding:14px 16px"><div class="eyebrow">They receive</div><div style="display:flex;align-items:baseline;gap:4px;margin-top:4px"><span class="display" style="font-size:28px;color:#6B5D52">₦</span><span class="display" style="font-size:38px" id="ng10"></span><span class="caret" id="cr10" style="height:34px"></span></div></div></div>
      <div class="field"><div class="input" style="height:48px;font-size:14.5px;color:#a39686;margin-top:0">What’s it for? (optional)</div></div>
      <div class="dark" id="q10"><div style="font-size:13.5px;color:rgba(247,243,238,.7)">You pay</div><div class="big" style="font-size:34px">$17.23 <span style="font-size:15px;font-weight:500;font-family:Inter;opacity:.7">USDC</span></div>
        <dl><dt>Includes fee</dt><dd class="mono">$0.34</dd><dt>Rate</dt><dd class="mono">₦1,480 / $1</dd><dt>Cashback</dt><dd style="color:#E8895F">0.2% back</dd></dl></div>
      <div class="cta" id="rv10">Enter an amount</div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const sh = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Review payment</div>
      <div style="text-align:center;padding:10px 0 2px"><div style="font-size:13.5px;color:#6B5D52">Sending to CHIDI EZE</div><div class="display" style="font-size:40px">₦25,000</div><div style="font-size:13.5px;color:#6B5D52">Access Bank · 0123456789</div></div>
      <dl class="rows" style="background:#F0E6D8;border-radius:16px;padding:14px"><dt>You pay</dt><dd class="mono">$17.23 USDC</dd><dt>Fee</dt><dd class="mono">$0.34</dd></dl>
      <div class="hold" id="hold10"><div class="fill" id="fill10"></div><span>Hold to send ₦25,000</span></div><div class="hint">Press and hold so nothing is sent by accident.</div></div>`));
    const s5 = add(el(`<div class="scr">${status}<div class="done">
      <div class="tick" id="tk10">${ic.check(50)}</div><div class="t" id="d10">₦25,000 is on its way</div><div class="b" id="b10">To CHIDI EZE at Access Bank. It usually arrives within minutes.</div>
      <div class="pill" id="cb10">+ ₦50 cashback for next time</div>
      <div class="more" id="m10" style="flex-direction:column"><div style="flex-direction:row;justify-content:center;background:#C1502E;color:#fff;border-color:#C1502E;min-height:50px;align-items:center">View activity</div><div style="flex-direction:row;justify-content:center;min-height:46px;align-items:center">Send another</div></div></div></div>`));
    tap(4.35, $('[data-k=bank] .ic', s1)); tap(5.9, $('#bk')); tap(10.7, $('#ct10')); tap(14.9, $('#rv10')); hold(17.4, 19.6, $('#hold10'));
    typeSfx(6.9, 8.4, 10); typeSfx(12.0, 12.9, 5);
    sfx.push({ t: 4.6, k: 'whoosh' }, { t: 5.95, k: 'pop' }, { t: 9.6, k: 'ok' }, { t: 11.0, k: 'whoosh' }, { t: 15.2, k: 'whoosh' }, { t: 19.9, k: 'success' }, { t: 21.6, k: 'coin' });
    draw = (t) => {
      slide(s2, t, 4.6, s1); if (t < 4.6) set(s1, 1, '');
      const picked = t >= 5.95;
      $('#bsrch').style.display = picked ? 'none' : ''; $('#bsel').style.display = picked ? '' : 'none';
      $('#c2').style.opacity = picked ? 1 : 0.5; $('#an').className = 'input' + (picked && t < 9 ? ' focus' : '');
      $('#acn').textContent = '0123456789'.slice(0, Math.round(10 * p(t, 6.9, 8.4)));
      $('#car10').style.opacity = picked && t < 8.5 && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      const checking = t >= 8.5 && t < 9.6, named = t >= 9.6;
      $('#chk10').style.display = checking ? 'flex' : 'none'; $('#sp10').style.transform = `rotate(${t * 320}deg)`;
      $('#nm10').style.display = named ? 'flex' : 'none'; if (named) rise($('#nm10'), t, 9.6, 0.35, 10);
      $('#ct10').textContent = named ? 'Continue to CHIDI' : 'Continue'; $('#ct10').style.opacity = named ? 1 : 0.4;
      slide(s3, t, 11.0, s2);
      const typed = '25,000'.slice(0, Math.round(6 * p(t, 12.0, 12.9)));
      $('#ng10').textContent = typed; $('#cr10').style.opacity = t >= 11.5 && t < 13.5 && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      rise($('#q10'), t, 13.2, 0.45, 18);
      $('#rv10').textContent = t >= 13.2 ? 'Review ₦25,000 to CHIDI' : 'Enter an amount'; $('#rv10').style.opacity = t >= 13.2 ? 1 : 0.4;
      sheetIn(dim, sh, t, 15.2, 19.9);
      $('#fill10').style.width = 100 * p(t, 17.5, 19.6) + '%';
      slide(s5, t, 19.9, null);
      pop($('#tk10'), t, 20.15); rise($('#d10'), t, 20.4); rise($('#b10'), t, 20.55); pop($('#cb10'), t, 21.6); rise($('#m10'), t, 22.2, 0.45, 20);
    };
  }

  if (V === 11) {
    DUR = 32; END = 26.4; FINE = 'You see the exact fee before you confirm. Screens are illustrations.';
    HOOK = ['Crypto on another chain?', 'Bring it in, in one step.'];
    CAPS = [[3.1, 5.2, 'Step 1', 'Open <em>Bridge</em>'], [5.2, 10.6, 'Step 2', 'Pick what you hold.<br><em>Type the amount.</em>'], [10.6, 15.6, 'Step 3', 'See what arrives.<br><em>No gas to buy.</em>'], [15.6, 21.2, 'Moving', 'Track it,<br><em>step by step</em>'], [21.2, 26.2, 'Arrived', 'It’s USDC now.<br><em>Ready to use.</em>']];
    const s1 = add(home('$12.40'));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Bridge</div></div>
      <div class="sub2">Move your money between chains. Every fee comes out of what you move, so there’s no gas to buy.</div>
      <div class="seg" style="grid-template-columns:repeat(3,1fr)"><div class="on">Bridge in</div><div>Bridge out</div><div>Chain to chain</div></div>
      <div class="sub2" style="font-size:13px">Move USDT, USDC, ETH, BNB and more from another chain to USDC on Solana.</div>
      <div class="field" style="position:relative"><div class="card" style="padding:16px"><div style="display:flex;justify-content:space-between;font-size:13px;color:#6B5D52"><span>From · your 0x wallet</span><span>Balance 0.082 <b style="color:#C1502E">Max</b></span></div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px"><div style="flex:1;display:flex;align-items:baseline"><span class="display" style="font-size:36px" id="a11"></span><span class="caret" id="c11" style="height:32px"></span><span id="z11" class="display" style="font-size:36px;color:#E4D8C6">0</span></div>${pill('ETH', 'Arbitrum', '#28A0F0', 'pk11')}</div>
          <div id="u11"></div></div>
        <div class="flip">${I.svg('<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>', 20)}</div>
        <div class="card" style="padding:16px;margin-top:8px"><div style="font-size:13px;color:#6B5D52">To · USDC on Solana</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px"><div style="flex:1" class="display"><span style="font-size:36px" id="r11">0</span></div>${pill('USDC', 'Solana', '#2775CA')}</div></div></div>
      <div class="field" id="q11"><dl class="card rows" style="margin-top:0;font-size:13.5px"><dt>You receive</dt><dd class="mono" style="font-weight:700">≈ 146.70 USDC</dd><dt>Network fees</dt><dd>~$0.30 <span style="color:#6B5D52">· paid for you</span></dd><dt>Arrives in</dt><dd>about a minute</dd></dl></div>
      <div class="cta" id="rv11">Review bridge</div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const sh = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Review bridge</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:16px 0 6px"><div style="text-align:center"><div class="display" style="font-size:24px">0.05</div><div style="font-size:13px;color:#6B5D52">ETH · Arbitrum</div></div><span style="color:#C1502E">${ic.bridge}</span><div style="text-align:center"><div class="display" style="font-size:24px">≈ 146.70</div><div style="font-size:13px;color:#6B5D52">USDC · Kobocent</div></div></div>
      <dl class="rows" style="font-size:13.5px"><dt>Network fees</dt><dd>~$0.30 · paid for you</dd><dt>Arrives in</dt><dd>about a minute</dd></dl>
      <div class="hold" id="hold11"><div class="fill" id="fill11"></div><span>Hold to bridge</span></div></div>`));
    const s4 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Bridge</div></div>
      <div class="field"><div class="card" style="padding:22px 18px;text-align:center"><div class="bigic" id="bi11">${ic.bridge}</div>
        <div class="display" style="font-size:22px;margin-top:14px" id="h11">On its way</div><div style="font-size:14px;color:#6B5D52;margin-top:4px;line-height:1.4" id="p11">You can leave this screen — we’ll message you on Telegram when it lands.</div>
        <div class="steps"><div class="st" id="st1"><i></i><span>Sent 0.050000 ETH</span></div><div class="st" id="st2"><i></i><span>Crossing to Solana</span></div><div class="st" id="st3"><i></i><span id="st3t">USDC in your wallet</span></div></div>
        <div id="nx11"><div style="font-size:13px;color:#6B5D52;margin:16px 0 8px">What next?</div><div class="nx"><div>${ic.bank}Withdraw to bank</div><div>${ic.swap}Swap</div><div>${ic.up}Send to bank</div><div>${ic.wallet}Send to wallet</div></div></div></div></div></div>`));
    tap(4.5, $('[data-k=bridge] .ic', s1)); tap(6.2, $('#pk11')); tap(10.3, $('#rv11')); hold(13.3, 15.2, $('#hold11'));
    typeSfx(7.3, 8.3, 4);
    sfx.push({ t: 4.75, k: 'whoosh' }, { t: 6.25, k: 'pop' }, { t: 9.0, k: 'ok' }, { t: 10.6, k: 'whoosh' }, { t: 15.5, k: 'success' }, { t: 16.4, k: 'ok' }, { t: 21.2, k: 'ding' }, { t: 22.6, k: 'coin' });
    draw = (t) => {
      slide(s2, t, 4.75, s1); if (t < 4.75) set(s1, 1, '');
      const typed = '0.05'.slice(0, Math.round(4 * p(t, 7.3, 8.3)));
      $('#a11').textContent = typed; $('#z11').style.display = typed ? 'none' : ''; $('#c11').style.opacity = t >= 6.8 && t < 9 && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      $('#u11').style.opacity = t >= 8.4 ? 1 : 0;
      const rv = 146.7 * io(p(t, 8.5, 9.4)); $('#r11').textContent = rv ? '≈ ' + rv.toFixed(2) : '0'; $('#r11').style.color = rv ? '' : '#E4D8C6';
      rise($('#q11'), t, 9.0, 0.4, 14); $('#rv11').style.opacity = t >= 9.0 ? 1 : 0.4;
      sheetIn(dim, sh, t, 10.6, 15.5);
      $('#fill11').style.width = 100 * p(t, 13.4, 15.2) + '%';
      slide(s4, t, 15.5, null);
      const done = t >= 21.2;
      $('#st1').className = 'st' + (t >= 16.4 ? ' ok' : ' act'); $('#st2').className = 'st' + (done ? ' ok' : t >= 16.4 ? ' act' : ''); $('#st3').className = 'st' + (done ? ' ok' : '');
      [...s4.querySelectorAll('.st.act i')].forEach((n) => { n.style.transform = `rotate(${t * 320}deg)`; });
      [...s4.querySelectorAll('.st:not(.act) i')].forEach((n) => { n.style.transform = ''; });
      $('#h11').textContent = done ? 'Arrived' : 'On its way'; $('#p11').textContent = done ? 'Your USDC is ready to use.' : 'You can leave this screen — we’ll message you on Telegram when it lands.';
      $('#st3t').textContent = done ? '≈ 146.70 USDC in your wallet' : 'USDC in your wallet';
      $('#bi11').className = 'bigic' + (done ? ' ok' : ''); $('#bi11').innerHTML = done ? ic.check(34) : ic.bridge;
      $('#nx11').style.display = t >= 22.6 ? '' : 'none'; rise($('#nx11'), t, 22.6, 0.45, 16);
    };
  }

  if (V === 12) {
    HOOK = ['Need SOL? Or dollars back?', 'Swap in seconds.'];
    CAPS = [[3.1, 5.0, 'Step 1', 'Tap <em>Swap</em>'], [5.0, 10.4, 'Step 2', 'Type what you pay.<br>See what <em>you get</em>.'], [10.4, 15.4, 'Step 3', 'Fee included.<br><em>Network fee covered.</em>'], [15.4, 20.2, 'Done', 'Swapped in<br><em>seconds</em>'], [20.2, 24.5, 'Both ways', 'SOL, USDC and USDT.<br><em>Flip any time.</em>']];
    const s1 = add(home('$120.00'));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Swap</div></div>
      <div class="sub2">SOL ↔ USDC or USDT in seconds, at the best route we can find.</div>
      <div class="field" style="position:relative"><div class="card" style="padding:16px"><div style="display:flex;justify-content:space-between;font-size:13px;color:#6B5D52"><span>You pay</span><span>Balance 120.00 <b style="color:#C1502E">Max</b></span></div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px"><div style="flex:1;display:flex;align-items:baseline"><span class="display" style="font-size:38px" id="a12"></span><span class="caret" id="c12" style="height:34px"></span><span id="z12" class="display" style="font-size:38px;color:#E4D8C6">0</span></div>${pill('USDC', '', '#2775CA')}</div></div>
        <div class="flip" id="fl12">${I.svg('<path d="M8 4v16"/><path d="M4 16l4 4 4-4"/><path d="M16 20V4"/><path d="M12 8l4-4 4 4"/>', 20)}</div>
        <div class="card" style="padding:16px;margin-top:8px"><div style="font-size:13px;color:#6B5D52">You receive (estimate)</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px"><div style="flex:1" class="display"><span style="font-size:38px" id="r12">0</span></div>${pill('SOL', '', '#20211F')}</div></div></div>
      <div class="field" id="q12"><dl class="card rows" style="margin-top:0;font-size:13.5px"><dt>Rate</dt><dd class="mono">1 USDC ≈ 0.005942 SOL</dd><dt>Fee</dt><dd>1% (included)</dd><dt>At least</dt><dd class="mono">0.2912 SOL</dd><dt>Network fee</dt><dd style="color:#58834C">Covered by Kobocent</dd></dl></div>
      <div class="cta" id="rv12">Enter an amount</div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const sh = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Review swap</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:18px;padding:16px 0 8px"><div style="text-align:center"><div class="display" style="font-size:26px">50.00</div><div style="font-size:13px;color:#6B5D52">USDC</div></div><span style="color:#C1502E">${ic.swap}</span><div style="text-align:center"><div class="display" style="font-size:26px">≈ 0.2941</div><div style="font-size:13px;color:#6B5D52">SOL</div></div></div>
      <p class="hint" style="font-size:13px">You’ll get at least 0.2912 SOL; the final amount depends on the market at the moment of the swap.</p>
      <div class="hold" id="hold12"><div class="fill" id="fill12"></div><span>Hold to swap</span></div></div>`));
    const s4 = add(el(`<div class="scr">${status}<div class="done">
      <div class="tick" id="tk12">${ic.check(50)}</div><div class="t" id="d12">Swap complete</div><div class="b" id="b12">50.00 USDC → SOL. Your new balance shows on Home.</div>
      <div class="token" id="bal12" style="border-style:solid;border-color:#E4D8C6;text-align:left"><dl class="rows" style="margin-top:0"><dt>USDC</dt><dd class="mono">70.00</dd><dt>SOL</dt><dd class="mono" style="color:#58834C;font-weight:700">+0.2941</dd></dl></div>
      <div class="netp" id="tr12"><span>SOL → USDC</span><span>SOL → USDT</span><span>USDC → SOL</span><span>USDT → SOL</span></div>
      <div class="more" style="flex-direction:column" id="m12"><div style="flex-direction:row;justify-content:center;background:#C1502E;color:#fff;border-color:#C1502E;min-height:50px;align-items:center">Go to Home</div><div style="flex-direction:row;justify-content:center;min-height:46px;align-items:center">Swap again</div></div></div></div>`));
    tap(4.35, $('[data-k=swap] .ic', s1)); tap(10.1, $('#rv12')); hold(12.9, 14.9, $('#hold12'));
    typeSfx(6.2, 6.9, 2);
    sfx.push({ t: 4.6, k: 'whoosh' }, { t: 8.3, k: 'ok' }, { t: 10.4, k: 'whoosh' }, { t: 15.2, k: 'success' }, { t: 16.7, k: 'coin' }, { t: 20.4, k: 'pop' });
    draw = (t) => {
      slide(s2, t, 4.6, s1); if (t < 4.6) set(s1, 1, '');
      const typed = '50'.slice(0, Math.round(2 * p(t, 6.2, 6.9)));
      $('#a12').textContent = typed; $('#z12').style.display = typed ? 'none' : ''; $('#c12').style.opacity = t >= 5.6 && t < 8 && Math.floor(t * 2.2) % 2 === 0 ? 1 : 0;
      const rv = 0.2941 * io(p(t, 7.2, 8.2)); $('#r12').textContent = rv ? rv.toFixed(4) : '0'; $('#r12').style.color = rv ? '' : '#E4D8C6';
      rise($('#q12'), t, 8.3, 0.4, 14);
      $('#rv12').textContent = t >= 8.3 ? 'Review swap' : t >= 6.9 ? 'Finding the best route…' : 'Enter an amount'; $('#rv12').style.opacity = t >= 8.3 ? 1 : 0.4;
      sheetIn(dim, sh, t, 10.4, 15.2);
      $('#fill12').style.width = 100 * p(t, 13.0, 14.9) + '%';
      slide(s4, t, 15.2, null);
      pop($('#tk12'), t, 15.45); rise($('#d12'), t, 15.7); rise($('#b12'), t, 15.85); rise($('#bal12'), t, 16.4, 0.5, 22);
      [...$('#tr12').children].forEach((n, k) => pop(n, t, 20.4 + k * 0.16, 0.4));
      rise($('#m12'), t, 21.6, 0.45, 18);
    };
  }

  if (V === 13) {
    DUR = 34; END = 28.4; FINE = 'Always check the network before anyone sends. Screens are illustrations.';
    HOOK = ['Already hold crypto?', 'Bring it in from six networks.'];
    CAPS = [[3.1, 6.0, 'Step 1', '<em>Add money</em>, then<br>the <em>Crypto</em> tab'], [6.0, 11.6, 'Wallet 1', '<em>Solana</em>: USDC, USDT<br>and SOL'], [11.6, 18.2, 'Wallet 2', '<em>One address</em>,<br>five networks'], [18.2, 22.6, 'Arrived', 'Your crypto is<br><em>spendable balance</em>'], [22.6, 28.2, 'Use it', 'Pay, withdraw,<br><em>trade</em> or <em>earn</em>.']];
    const SOLA = 'DEMo7xKXtg2Cw87d97TXJSDpbD5jBkheZk9fQp', EVMA = '0x71C7dEm0a2B4c6D8e0F1a3B5c7D9e1F3a5dEm0';
    const acard = (id, tag, title, addr, note) => `<div class="card acard" id="${id}"><div class="eyebrow">${tag}</div><div class="display" style="font-size:17px;margin-top:4px;line-height:1.3">${title}</div>
        <div class="adr mono">${addr}</div><div style="display:flex;align-items:center;gap:14px;margin-top:12px"><div class="cpb" id="${id}c">Copy address</div><span style="font-size:14px;color:#6B5D52;font-weight:500">Share</span></div>
        <p style="font-size:12.5px;color:#6B5D52;line-height:1.5;margin-top:12px">${note}</p></div>`;
    const s1 = add(home('$0.00'));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph" style="position:relative;z-index:3"><div class="back">${ic.back}</div><div class="t">Add money</div></div>
      <div class="sa" style="top:104px"><div id="pg13" style="padding:0 18px 40px">
        <div style="font-size:13.5px;color:#6B5D52;line-height:1.4" id="sub13">Send naira from any Nigerian bank app — it arrives in your wallet as USDC.</div>
        <div class="seg" style="margin:14px 0 0;grid-template-columns:1fr 1fr"><div id="tb">Bank transfer (₦)</div><div id="tc">Crypto</div></div>
        <div id="bankv" class="card" style="margin-top:14px;padding:18px"><div class="display" style="font-size:20px">Verify once with BVN or NIN</div><div style="font-size:13.5px;color:#6B5D52;margin-top:6px;line-height:1.45">Nigerian rules require it to open an account in your name. Either one works.</div></div>
        <div id="cryv"><p style="font-size:14px;color:#6B5D52;line-height:1.5;margin-top:14px">Share an address to get paid in crypto. Always check the network before anyone sends.</p>
          ${acard('ac1', 'Best for USDC, USDT & SOL', 'Solana', SOLA, 'Send USDC or USDT on Solana (SPL), or SOL. Lands as spendable balance right away.')}
          ${acard('ac2', 'One address, five networks', 'Ethereum · BNB Chain · Polygon · Arbitrum · Robinhood', EVMA, 'Same address on every network listed. Choose the network carefully — Ethereum and Arbitrum both use ETH but are different networks. Once it lands you can spend it directly: Withdraw, Send and Bills pay from any chain.')}
        </div></div></div></div>`));
    const s3 = add(home('$0.00'));
    const uses = el(`<div class="uses"><div><b>${ic.bolt}</b>Pay bills from any chain</div><div><b>${ic.bank}</b>Withdraw to your bank</div><div><b>${ic.chart}</b>Trade on Solana and BNB Chain</div><div><b>${ic.leaf}</b>Earn on USDC, USDT or SOL</div></div>`);
    $('.pad', s3).appendChild(uses);
    [...s3.querySelectorAll('.h, .grid')].forEach((n) => { n.style.display = 'none'; });
    const nt = add(el(`<div class="notif"><div class="app" style="background:#C1502E">${I.mark(26, '#fff')}</div><div><div class="tt">Money in</div><div class="bb">200.00 USDT arrived on BNB Chain</div></div><div style="margin-left:auto;font-size:12px;color:#6B5D52">now</div></div>`));
    const pg = $('#pg13'), y2 = $('#ac2').offsetTop - 104;
    tap(4.2, $('.b1', s1)); tapAt(5.6, $('#tc')); tapAt(9.0, $('#ac1c')); tapAt(14.6, $('#ac2c'));
    sfx.push({ t: 4.45, k: 'whoosh' }, { t: 5.65, k: 'pop' }, { t: 9.05, k: 'ok' }, { t: 11.6, k: 'swish' }, { t: 14.65, k: 'ok' }, { t: 18.0, k: 'whoosh' }, { t: 18.6, k: 'ding' }, { t: 20.6, k: 'coin' });
    [23.0, 23.5, 24.0, 24.5].forEach((x) => sfx.push({ t: x, k: 'pop' }));
    draw = (t) => {
      slide(s2, t, 4.45, s1); if (t < 4.45) set(s1, 1, '');
      const crypto = t >= 5.65;
      $('#tb').className = crypto ? '' : 'on'; $('#tc').className = crypto ? 'on' : '';
      $('#bankv').style.display = crypto ? 'none' : ''; $('#cryv').style.display = crypto ? '' : 'none';
      $('#sub13').textContent = crypto ? 'Receive USDC, USDT, SOL or ETH from any wallet or exchange.' : 'Send naira from any Nigerian bank app — it arrives in your wallet as USDC.';
      if (crypto) { rise($('#ac1'), t, 5.8, 0.45, 20); rise($('#ac2'), t, 6.0, 0.45, 20); }
      pg.style.transform = `translateY(${-lerp(0, y2, io(p(t, 11.6, 12.4)))}px)`;
      $('#ac1c').textContent = t >= 9.05 && t < 11.4 ? 'Copied ✓' : 'Copy address'; $('#ac1').style.borderColor = t >= 6.4 && t < 11.6 ? '#C1502E' : '';
      $('#ac2c').textContent = t >= 14.65 && t < 17.6 ? 'Copied ✓' : 'Copy address'; $('#ac2').style.borderColor = t >= 12.4 && t < 18 ? '#C1502E' : '';
      slide(s3, t, 18.0, null);
      const n = out3(p(t, 18.6, 19.1)) * (1 - p(t, 22.2, 22.6)); set(nt, n, `translateY(${lerp(-140, 0, n)}px)`);
      const v = 200 * io(p(t, 19.6, 20.6));
      $('.amt', s3).textContent = '$' + v.toFixed(2); $('.sub', s3).textContent = 'Stablecoins $' + v.toFixed(2);
      [...uses.children].forEach((u, k) => rise(u, t, 23.0 + k * 0.5, 0.45, 18));
    };
  }

  /* ───────── captions, hook, phone, end card ───────── */
  const capEls = CAPS.map(([a, b, step, txt]) => { const n = el(`<div class="cap"><div class="step">${step}</div><div class="txt display">${txt}</div></div>`); caps.appendChild(n); return { n, a, b }; });
  if (FINE) $('#fine').textContent = FINE;
  $('#hk1').textContent = HOOK[0]; $('#hk2').textContent = HOOK[1];
  if (HOOK[0].length > 18) $('#hk1').style.fontSize = '118px';
  sfx.push({ t: 0.25, k: 'whoosh' }, { t: 2.55, k: 'whoosh' }, { t: END, k: 'impact' });
  capEls.forEach(({ a }) => sfx.push({ t: a, k: 'swish' }));

  const phone = $('#phone');
  window.seek = (t) => {
    // background drift
    $('#rA').style.transform = `translate(${20 * Math.sin(t * 0.25)}px, ${30 * Math.cos(t * 0.2)}px)`;
    $('#rB').style.transform = `translate(${-26 * Math.sin(t * 0.22)}px, ${-22 * Math.cos(t * 0.27)}px)`;
    $('#dA').style.transform = `translate(${14 * Math.cos(t * 0.3)}px, ${40 * Math.sin(t * 0.18)}px)`;
    // hook
    const ho = 1 - p(t, 2.35, 2.75);
    rise($('#hk0'), t, 0.15, 0.5, 30); rise($('#hk1'), t, 0.3, 0.6, 60); rise($('#hk2'), t, 1.0, 0.6, 60);
    $('#hook').style.opacity = ho; $('#hook').style.transform = `translateY(${lerp(0, -80, io(p(t, 2.35, 2.75)))}px)`;
    // phone
    const pin = out3(p(t, 2.55, 3.35));
    const fl = Math.sin(t * 0.9) * 6;
    set(phone, 1, `translateY(${lerp(1700, 0, pin) + fl}px) rotate(${lerp(4, 0, pin)}deg)`);
    $('#foot').style.opacity = pin;
    for (const { n, a, b } of capEls) { const q = out3(p(t, a, a + 0.4)) * (1 - p(t, b - 0.3, b)); set(n, q, `translateY(${lerp(34, 0, out3(p(t, a, a + 0.4)))}px)`); }
    draw(t); drawTap(t);
    // end card: circle wipe, then the lock-up
    const w = io(p(t, END, END + 0.7));
    $('#end').style.visibility = t >= END ? 'visible' : 'hidden';
    $('#wipe').style.transform = `scale(${lerp(0, 480, w)})`;
    pop($('#mark'), t, END + 0.45, 0.6); rise($('#e1'), t, END + 0.7, 0.55, 40); rise($('#e2'), t, END + 1.0, 0.55, 40);
    pop($('#e3'), t, END + 1.6, 0.55); rise($('#e4'), t, END + 2.1, 0.5, 20);
    $('#fine').style.opacity = p(t, END + 2.4, END + 2.9);
    const pulse = t > END + 2.4 ? 1 + 0.025 * Math.sin((t - END - 2.4) * 4.2) : null;
    if (pulse) $('#e3').style.transform = `scale(${pulse})`;
    $('#bar').style.width = (1080 * t) / DUR + 'px';
    $('#bar').style.background = t >= END + 0.5 ? '#fff' : '#C1502E';
  };
  window.VIDEO = { v: V, dur: DUR, end: END, sfx };
  window.seek(0);
})();
