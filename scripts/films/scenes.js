/* Kobocent films: deterministic scenes. window.seek(t) draws the frame at t seconds; window.VIDEO = { dur, sfx }.
   ?v=1 bills · ?v=2 withdraw · ?v=3 Kobo Pal · ?v=4 trading · ?v=5 Earn · ?v=6 cashback. Every amount is an illustration (the end card says so). */
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
        <div class="act"><div class="ic">${ic.up}</div>Send to<br>bank</div>
        <div class="act"><div class="ic">${ic.wallet}</div>Send to<br>wallet</div>
        <div class="act" data-k="bills"><div class="ic">${ic.bolt}</div>Pay bills</div>
        <div class="act" data-k="withdraw"><div class="ic">${ic.bank}</div>Withdraw</div>
        <div class="act"><div class="ic">${ic.swap}</div>Swap</div>
        <div class="act" data-k="earn"><div class="ic">${ic.leaf}</div>Earn</div>
        <div class="act"><div class="ic">${ic.bridge}</div>Bridge</div>
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

  function drawTap(t) {
    let o = 0, s = 1, x = 0, y = 0;
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
    DUR = 32; END = 26.4; FINE = 'Trading is risky. Not financial advice. Screens are illustrations.';
    HOOK = ['Don’t buy blind.', 'Check the token first.'];
    CAPS = [[3.1, 6.4, 'Step 1', 'Paste any <em>token</em>'], [6.4, 12.6, 'Step 2', 'Our read, scored<br><em>out of 100</em>'], [12.6, 16.2, 'Step 3', 'Buy with USDC.<br><em>No gas token.</em>'], [16.2, 20.6, 'Protect', 'Set your exit<br><em>before you enter</em>'], [20.6, 26.2, 'Automatic', 'It can sell for you,<br>at <em>your price</em>.']];
    const s0 = add(home('$186.20'));
    const s1 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="t">Trade</div></div>
      <div class="sub2">Trade with USDC, USDT or SOL</div>
      <div class="field"><div class="input" id="srch" style="gap:10px"><span style="color:#6B5D52">${I.svg('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>', 20)}</span><span id="addr" class="mono" style="font-size:15px"></span><span id="addrph" style="color:#a39686;font-size:15px">Paste a token address</span></div></div>
      <div class="field" id="res"><div class="eyebrow">Result</div><div class="card" style="margin-top:8px;display:flex;align-items:center;gap:12px" id="row">
        <div class="tkn">Z</div><div style="flex:1"><div style="font-weight:700">ZURI</div><div style="font-size:12.5px;color:#6B5D52">Zuri · Solana</div></div>
        <div style="text-align:right"><div class="mono" style="font-weight:600">$0.0412</div><div style="font-size:12.5px;color:#58834C;font-weight:600">+4.2% today</div></div></div></div>
      <div class="field"><div class="eyebrow">Your tokens</div><div class="card" style="margin-top:8px;color:#6B5D52;font-size:13.5px">Nothing yet. Tokens you buy show up here.</div></div></div>`));
    const s2 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="tkn" style="width:36px;height:36px;font-size:16px">Z</div><div><div class="t" style="font-size:21px">ZURI</div></div><div style="margin-left:auto;font-size:12px;font-weight:600;color:#6B5D52;border:1px solid #E4D8C6;border-radius:999px;padding:5px 10px">Solana</div></div>
      <div class="pad" style="padding-top:12px"><div class="display" style="font-size:36px">$0.0412</div><div style="color:#58834C;font-weight:600;font-size:13.5px;margin-top:2px">+4.2% today</div>
        <svg width="354" height="92" viewBox="0 0 354 92" style="margin-top:8px"><path id="ch1" d="M0 70 L30 66 L58 72 L90 58 L120 62 L150 48 L182 52 L212 38 L244 44 L276 30 L308 34 L354 20" fill="none" stroke="#C1502E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg></div>
      <div class="field" style="margin-top:8px"><div class="card" id="read"><div style="display:flex;align-items:center;gap:14px">
          <div class="gauge"><svg width="78" height="78" viewBox="0 0 78 78"><circle cx="39" cy="39" r="32" fill="none" stroke="#F0E6D8" stroke-width="8"/><circle id="arc" cx="39" cy="39" r="32" fill="none" stroke="#58834C" stroke-width="8" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90 39 39)"/></svg><div class="gn"><b id="sc">0</b><span>of 100</span></div></div>
          <div><div class="eyebrow">Our read right now</div><div style="font-weight:700;font-size:16px;margin-top:4px">Six live signals checked</div></div></div>
        <ul class="sig"><li id="g1">Liquidity $412K, locked</li><li id="g2">Top holder owns 3.1%</li><li id="g3">Buy pressure is rising</li><li id="g4">No red flags in the contract</li></ul></div></div>
      <div class="cta" id="buy">Buy ZURI</div></div>`));
    const dim = add(el('<div class="dim"></div>'));
    const sh = add(el(`<div class="sheet"><div class="grab"></div><div class="t">Buy ZURI</div>
      <div class="chips" style="margin-top:14px"><div class="chip">$10</div><div class="chip" id="c20">$20</div><div class="chip">$50</div></div>
      <dl class="rows" id="brows"><dt>You pay</dt><dd class="mono">$20.00 USDC</dd><dt>You get</dt><dd class="mono">≈ 480 ZURI</dd><dt>Network fee</dt><dd>Covered by Kobocent</dd></dl>
      <div class="line"></div>
      <div class="eyebrow" style="margin-top:14px">Protect your token</div>
      <div class="prow"><div><b>Take profit</b><span>Sell when it is up 25%</span></div>${toggle('t1')}</div>
      <div class="prow"><div><b>Stop loss</b><span>Sell if it drops 10%</span></div>${toggle('t2')}</div>
      <div class="hold" id="hold4"><div class="fill" id="fill4"></div><span>Hold to buy $20 of ZURI</span></div></div>`));
    const s4 = add(el(`<div class="scr">${status}
      <div class="ph"><div class="back">${ic.back}</div><div class="tkn" style="width:36px;height:36px;font-size:16px">Z</div><div class="t" style="font-size:21px">ZURI</div></div>
      <div class="pad" style="padding-top:12px"><div class="eyebrow">Your position</div><div class="display" style="font-size:38px;margin-top:4px" id="pv">$19.80</div>
        <div style="font-size:13.5px;color:#6B5D52;margin-top:2px">480 ZURI · price <span class="mono" id="pp">$0.0412</span></div>
        <svg width="354" height="110" viewBox="0 0 354 110" style="margin-top:10px"><line x1="0" y1="22" x2="354" y2="22" stroke="#58834C" stroke-width="1.5" stroke-dasharray="5 5"/><text x="354" y="15" text-anchor="end" font-size="11" fill="#58834C" font-family="Inter" font-weight="600">Take profit $0.0515</text>
          <line x1="0" y1="96" x2="354" y2="96" stroke="#B84A40" stroke-width="1.5" stroke-dasharray="5 5"/><text x="354" y="108" text-anchor="end" font-size="11" fill="#B84A40" font-family="Inter" font-weight="600">Stop loss $0.0371</text>
          <path id="ch2" d="M0 76 L34 72 L64 78 L98 66 L130 70 L162 56 L196 60 L228 46 L262 50 L296 36 L326 30 L354 22" fill="none" stroke="#C1502E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg>
        <div class="card" style="margin-top:12px;display:flex;gap:12px;align-items:center" id="prot"><div style="width:40px;height:40px;border-radius:13px;background:rgba(88,131,76,.14);display:grid;place-items:center">${ic.check(22)}</div>
          <div><div style="font-weight:700">Protected</div><div style="font-size:13px;color:#6B5D52">Take profit at $0.0515 · Stop loss at $0.0371</div></div></div>
        <div class="card" style="margin-top:10px;border-color:#58834C;background:rgba(88,131,76,.08)" id="sold"><div style="font-weight:700;color:#58834C">Sold at your take profit</div><div style="font-size:13px;color:#6B5D52;margin-top:2px">480 ZURI sold at $0.0515 · USDC is back in your balance</div></div></div></div>`));
    const nt = add(el(`<div class="notif"><div class="app" style="background:#C1502E">${I.mark(26, '#fff')}</div><div><div class="tt">Take profit reached</div><div class="bb">ZURI sold automatically at $0.0515</div></div><div style="margin-left:auto;font-size:12px;color:#6B5D52">now</div></div>`));
    tap(3.75, $('[data-k=trade] .ic', s0)); tap(4.7, $('#srch')); tap(6.1, $('#row')); tap(12.2, $('#buy')); tap(13.4, $('#c20')); tap(16.8, $('#t1')); tap(17.8, $('#t2')); hold(18.7, 20.3, $('#hold4'));
    sfx.push({ t: 3.95, k: 'whoosh' }, { t: 5.05, k: 'pop' }, { t: 5.5, k: 'ok' }, { t: 6.3, k: 'whoosh' }, { t: 8.6, k: 'ok' }, { t: 8.9, k: 'key' }, { t: 9.5, k: 'key' }, { t: 10.1, k: 'key' }, { t: 10.7, k: 'key' }, { t: 12.45, k: 'whoosh' }, { t: 20.55, k: 'success' }, { t: 23.6, k: 'ding' }, { t: 24.4, k: 'coin' });
    draw = (t) => {
      slide(s1, t, 3.95, s0); if (t < 3.95) set(s0, 1, '');
      $('#srch').className = 'input' + (t >= 4.7 ? ' focus' : '');
      $('#addr').textContent = t >= 5.05 ? '7xKXt…Zuri9fQp' : ''; $('#addrph').style.display = t >= 5.05 ? 'none' : '';
      rise($('#res'), t, 5.45, 0.4, 14);
      slide(s2, t, 6.3, s1);
      $('#ch1').setAttribute('stroke-dashoffset', 1 - io(p(t, 6.7, 8.0)));
      const sc = Math.round(78 * io(p(t, 7.3, 8.6))); $('#sc').textContent = sc; $('#arc').setAttribute('stroke-dasharray', `${sc} 100`);
      [['#g1', 8.9], ['#g2', 9.5], ['#g3', 10.1], ['#g4', 10.7]].forEach(([s, a]) => rise($(s), t, a, 0.35, 10));
      $('#buy').style.opacity = t >= 11 ? 1 : 0.4;
      sheetIn(dim, sh, t, 12.45, 20.55);
      $('#c20').className = 'chip' + (t >= 13.45 ? ' on' : '');
      rise($('#brows'), t, 13.6, 0.4, 12);
      setTog($('#t1'), t >= 16.85); setTog($('#t2'), t >= 17.85);
      $('#fill4').style.width = 100 * p(t, 18.8, 20.3) + '%';
      slide(s4, t, 20.55, null);
      const q = io(p(t, 21.3, 23.5));
      $('#ch2').setAttribute('stroke-dashoffset', 1 - q);
      const pr = lerp(0.0412, 0.0515, q); $('#pp').textContent = '$' + pr.toFixed(4); $('#pv').textContent = '$' + (480 * pr).toFixed(2);
      const n = out3(p(t, 23.6, 24.1)) * (1 - p(t, 25.8, 26.2)); set(nt, n, `translateY(${lerp(-140, 0, n)}px)`);
      $('#prot').style.display = t >= 24.3 ? 'none' : ''; $('#sold').style.display = t >= 24.3 ? '' : 'none'; rise($('#sold'), t, 24.3, 0.4, 14);
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
