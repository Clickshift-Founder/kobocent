// Original soundtrack for each Kobocent film, composed in code (no samples, nothing licensed).
//   node music.mjs 1   → out/music-1.wav, timed to out/timeline-1.json (tap, typing and success sounds included)
// 1: afro-house groove with kalimba · 2: warm lo-fi with electric piano · 3: bright pop with an arpeggio
import fs from 'node:fs';
import path from 'node:path';

const v = Number(process.argv[2] || 1);
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const tl = JSON.parse(fs.readFileSync(path.join(here, 'out', `timeline-${v}.json`), 'utf8'));
const SR = 44100, DUR = tl.dur, END = tl.end, N = Math.ceil(DUR * SR);
const bus = () => [new Float32Array(N), new Float32Array(N)];
const drums = bus(), bass = bus(), keys = bus(), pad = bus(), fx = bus(), send = bus();

// deterministic noise
let seed = 1234 + v;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rnd() * 2 - 1;
// Films 4–6 reuse the three styles in new keys: 4 = pop in A, 5 = lo-fi in F, 6 = afro-house in B minor.
const STYLE = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 2, 6: 1, 7: 3, 8: 1, 9: 2, 10: 1, 11: 2, 12: 3, 13: 1 }[v];
const TR = { 4: -3, 5: 3, 6: 2, 7: 2, 8: -2, 9: -3, 10: 4, 11: 5, 12: 5, 13: -4 }[v] || 0;
const midi = (n) => 440 * Math.pow(2, (n + TR - 69) / 12);
const TAU = Math.PI * 2;

/** Render a voice: fn(i, tSec) → sample, for `len` seconds starting at `t0`, panned, into bus b (and reverb send). */
function voice(b, t0, len, fn, { gain = 1, pan = 0, rev = 0 } = {}) {
  const s0 = Math.round(t0 * SR), n = Math.round(len * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4), gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < n; i++) {
    const k = s0 + i; if (k < 0 || k >= N) continue;
    const x = fn(i, i / SR);
    b[0][k] += x * gl; b[1][k] += x * gr;
    if (rev) { send[0][k] += x * gl * rev; send[1][k] += x * gr * rev; }
  }
}
const lp = (cut) => { let y = 0; const a = 1 - Math.exp((-TAU * cut) / SR); return (x) => (y += a * (x - y)); };
const hp = (cut) => { const l = lp(cut); return (x) => x - l(x); };

/* ── instruments ── */
const kick = (t, g = 1) => voice(drums, t, 0.32, (i, x) => {
  const f = 46 + 110 * Math.exp(-x * 34); const ph = TAU * (46 * x + (110 / 34) * (1 - Math.exp(-x * 34)));
  return (Math.sin(ph) * Math.exp(-x * 9) + 0.25 * noise() * Math.exp(-x * 220)) * (f > 0 ? 1 : 0);
}, { gain: 0.95 * g });
const clap = (t, g = 1) => { const h = hp(900), l = lp(5200); voice(drums, t, 0.2, (i, x) => {
  const env = Math.exp(-x * 26) * (1 + 0.9 * Math.max(0, Math.sin(x * 380)) * (x < 0.03 ? 1 : 0));
  return l(h(noise())) * env; }, { gain: 0.5 * g, rev: 0.25 }); };
const rim = (t, g = 1) => voice(drums, t, 0.07, (i, x) => (Math.sin(TAU * 1700 * x) * 0.6 + noise() * 0.4) * Math.exp(-x * 90), { gain: 0.3 * g, pan: 0.2, rev: 0.2 });
const hat = (t, g = 1, open = false, pan = 0.25) => { const h = hp(7000); voice(drums, t, open ? 0.22 : 0.06, (i, x) => h(noise()) * Math.exp(-x * (open ? 16 : 75)), { gain: 0.14 * g, pan }); };
const shaker = (t, g = 1) => { const h = hp(4500), l = lp(9500); voice(drums, t, 0.08, (i, x) => l(h(noise())) * Math.sin(Math.min(1, x / 0.02) * Math.PI / 2) * Math.exp(-x * 45), { gain: 0.1 * g, pan: -0.3 }); };
// amapiano-style log drum: a sine that drops in pitch, lightly saturated
const logdrum = (t, note, len = 0.4, g = 1) => { const f0 = midi(note); let ph = 0; voice(bass, t, len, (i, x) => {
  const f = f0 * (1 + 0.5 * Math.exp(-x * 30)); ph += (TAU * f) / SR;
  return Math.tanh(2.2 * Math.sin(ph)) * Math.exp(-x * 5.5) * Math.min(1, x / 0.004); }, { gain: 0.5 * g }); };
const sub = (t, note, len, g = 1) => { const f = midi(note); const l = lp(420); voice(bass, t, len, (i, x) => {
  const e = Math.min(1, x / 0.01) * Math.min(1, (len - x) / 0.05);
  return l(Math.sin(TAU * f * x) + 0.35 * Math.sin(TAU * 2 * f * x) + 0.12 * Math.sign(Math.sin(TAU * f * x))) * e; }, { gain: 0.42 * g }); };
// kalimba / marimba: fundamental plus fast-decaying inharmonic partials
const kalimba = (t, note, g = 1, pan = 0) => { const f = midi(note); voice(keys, t, 0.9, (i, x) =>
  (Math.sin(TAU * f * x) * Math.exp(-x * 5) + 0.45 * Math.sin(TAU * f * 4.02 * x) * Math.exp(-x * 22) + 0.2 * Math.sin(TAU * f * 9.8 * x) * Math.exp(-x * 60)) * Math.min(1, x / 0.002),
  { gain: 0.3 * g, pan, rev: 0.35 }); };
// FM electric piano
const epiano = (t, note, len = 1.6, g = 1, pan = 0) => { const f = midi(note); voice(keys, t, len, (i, x) => {
  const idx = 2.2 * Math.exp(-x * 5) + 0.25; const trem = 1 + 0.08 * Math.sin(TAU * 4.6 * (t + x));
  return Math.sin(TAU * f * x + idx * Math.sin(TAU * f * x)) * Math.exp(-x * 1.7) * Math.min(1, x / 0.004) * trem * Math.min(1, (len - x) / 0.08); },
  { gain: 0.2 * g, pan, rev: 0.4 }); };
// bright pluck: two detuned saws through a closing filter
const pluck = (t, note, g = 1, pan = 0, len = 0.32) => { const f = midi(note); let y = 0; voice(keys, t, len, (i, x) => {
  const saw = (ff) => 2 * ((ff * x) % 1) - 1;
  const cut = 500 + 6500 * Math.exp(-x * 16); const a = 1 - Math.exp((-TAU * cut) / SR);
  y += a * ((saw(f) + saw(f * 1.006)) * 0.5 - y);
  return y * Math.exp(-x * 7) * Math.min(1, x / 0.003) * Math.min(1, (len - x) / 0.02); }, { gain: 0.26 * g, pan, rev: 0.3 }); };
const padChord = (t, notes, len, g = 1) => { for (const [j, n] of notes.entries()) { const f = midi(n); const l = lp(1500), l2 = lp(1500);
  voice(pad, t, len, (i, x) => { const saw = (ff, o) => 2 * ((ff * x + o) % 1) - 1;
    const e = Math.min(1, x / 0.35) * Math.min(1, (len - x) / 0.4);
    return l2(l((saw(f, 0) + saw(f * 1.004, 0.3) + saw(f * 0.996, 0.7)) / 3)) * e; }, { gain: 0.11 * g, pan: (j - 1) * 0.35, rev: 0.5 }); } };
const bell = (b, t, note, g = 1, pan = 0, dec = 5) => { const f = midi(note); voice(b, t, 1.2, (i, x) =>
  (Math.sin(TAU * f * x) + 0.4 * Math.sin(TAU * f * 2.76 * x) * Math.exp(-x * 8) + 0.2 * Math.sin(TAU * f * 5.4 * x) * Math.exp(-x * 14)) * Math.exp(-x * dec) * Math.min(1, x / 0.002),
  { gain: 0.22 * g, pan, rev: 0.5 }); };

/* ── sound effects, timed to the film ── */
const SFX = {
  tap: (t) => voice(fx, t, 0.06, (i, x) => (Math.sin(TAU * 1500 * x) * 0.7 + noise() * 0.5 * Math.exp(-x * 400)) * Math.exp(-x * 70), { gain: 0.34 }),
  key: (t) => { const f = 2100 + rnd() * 900; voice(fx, t, 0.03, (i, x) => (Math.sin(TAU * f * x) * 0.5 + noise() * 0.5) * Math.exp(-x * 160), { gain: 0.1, pan: rnd() * 0.6 - 0.3 }); },
  whoosh: (t) => { let y = 0; voice(fx, t - 0.12, 0.5, (i, x) => { const cut = 400 + 5200 * Math.sin((x / 0.5) * Math.PI); const a = 1 - Math.exp((-TAU * cut) / SR); y += a * (noise() - y); return y * Math.sin((x / 0.5) * Math.PI) ** 2; }, { gain: 0.22, rev: 0.3 }); },
  swish: (t) => { const h = hp(2500); voice(fx, t - 0.05, 0.25, (i, x) => h(noise()) * Math.sin((x / 0.25) * Math.PI) ** 2, { gain: 0.09, pan: 0.2 }); },
  pop: (t) => voice(fx, t, 0.09, (i, x) => Math.sin(TAU * (320 * x + 2200 * x * x)) * Math.exp(-x * 38), { gain: 0.3 }),
  ok: (t) => { bell(fx, t, 84, 0.7, -0.1, 12); bell(fx, t + 0.09, 88, 0.7, 0.1, 12); },
  coin: (t) => { bell(fx, t, 91, 0.75, 0.15, 9); bell(fx, t + 0.08, 96, 0.8, -0.15, 7); },
  ding: (t) => { bell(fx, t, 83, 0.9, 0, 6); bell(fx, t + 0.14, 88, 0.9, 0, 5); bell(fx, t + 0.28, 91, 0.8, 0, 4); },
  success: (t) => [72, 76, 79, 84].forEach((n, k) => bell(fx, t + k * 0.075, n + (STYLE === 1 ? -3 : STYLE === 2 ? 2 : 0), 1, (k - 1.5) * 0.25, 3.2)),
  impact: (t) => { voice(fx, t, 1.4, (i, x) => Math.sin(TAU * (38 * x + 30 * (1 - Math.exp(-x * 9)) / 9 * 9)) * Math.exp(-x * 3.2), { gain: 0.7 });
    const h = hp(3000); voice(fx, t, 1.8, (i, x) => h(noise()) * Math.exp(-x * 2.6), { gain: 0.16, rev: 0.6 }); },
};

/* ── the three tracks ── bars are sized so the end card lands exactly on a downbeat */
const BARS = v === 4 || v === 13 ? 14 : STYLE === 2 ? 10 : 12;   // film 4 is longer
const bar = END / BARS, beat = bar / 4, s16 = beat / 4;
const kicks = [];
const K = (t, g) => { if (t < END - 0.01) { kick(t, g); kicks.push(t); } };

if (STYLE === 1) {
  // A minor: Am7 · Fmaj7 · C · G — kalimba hook, log-drum bass, shaker, four-on-the-floor from bar 2
  const roots = [45, 41, 48, 43];
  const chords = [[57, 60, 64, 67], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67]];
  const hook = [[0, 76], [3, 72], [6, 74], [8, 76], [11, 79], [14, 74]];        // 16th positions, A minor pentatonic
  const hook2 = [[0, 81], [3, 79], [6, 76], [8, 74], [10, 76], [14, 72]];
  for (let b = 0; b < BARS; b++) {
    const t = b * bar, ch = chords[b % 4], r = roots[b % 4];
    padChord(t, ch.slice(0, 3), bar + 0.2, b < 1 ? 0.6 : 1);
    for (const [pos, n] of ((b + (v === 6 || v === 8 || v === 13 ? 1 : 0)) % 2 ? hook2 : hook)) kalimba(t + pos * s16, n, b < 1 ? 0.7 : 1, (pos % 4 - 1.5) * 0.25);
    for (const pos of [0, 6, 12]) kalimba(t + pos * s16, ch[(pos / 6) | 0] , 0.55, -0.4);
    if (b >= 1) for (let k = 0; k < 16; k++) shaker(t + k * s16 + (k % 2 ? s16 * 0.12 : 0), k % 4 === 2 ? 1 : 0.6);
    if (b >= 2) { for (let q = 0; q < 4; q++) K(t + q * beat); for (const pos of [3, 6, 10, 11, 14]) logdrum(t + pos * s16, r + (pos === 11 ? 12 : 0), 0.34, pos === 3 ? 1 : 0.85); for (let q = 0; q < 4; q++) hat(t + q * beat + beat / 2, 0.9, true); }
    else if (b === 1) { K(t); K(t + 2 * beat); logdrum(t + 14 * s16, r, 0.3, 0.8); }
    if (b >= 4) { clap(t + beat); clap(t + 3 * beat); }
    if (b === BARS - 1) for (let k = 8; k < 16; k++) clap(t + k * s16, 0.35 + (k - 8) * 0.08);   // fill into the end card
  }
}
if (STYLE === 2) {
  // D major lo-fi: Dmaj7 · Bm7 · Gmaj7 · A — electric piano, lazy drums, sub bass, a soft bell melody
  const chords = [[62, 66, 69, 73], [59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 67]];
  const roots = [38, 35, 43, 45];
  const mel = [[0, 81], [6, 78], [10, 76], [16, 74], [22, 78], [26, 81], [28, 83]];   // across two bars (32 sixteenths)
  for (let b = 0; b < BARS; b++) {
    const t = b * bar, ch = chords[b % 4], r = roots[b % 4], sw = s16 * 0.28;
    ch.forEach((n, k) => epiano(t + k * 0.018, n, bar * 0.95, 1, (k - 1.5) * 0.3));
    ch.slice(1).forEach((n, k) => epiano(t + 6 * s16 + sw + k * 0.015, n, bar * 0.5, 0.7, (k - 1) * 0.3));
    if (b % 2 === 0 && b >= 2) for (const [pos, n] of mel) bell(keys, t + pos * s16 + (pos % 2 ? sw : 0), n, 0.5, (pos % 8 - 3.5) * 0.12, 4);
    if (b >= 1) { K(t, 0.85); K(t + 2.5 * beat, 0.7); rim(t + beat, 1); rim(t + 3 * beat, 1); sub(t, r, beat * 1.8); sub(t + 2.5 * beat, r, beat * 1.3, 0.9);
      for (let k = 0; k < 8; k++) hat(t + k * (beat / 2) + (k % 2 ? sw * 2 : 0), k % 2 ? 0.55 : 0.8, false, 0.3); }
    if (b === BARS - 1) { rim(t + 3.5 * beat, 0.8); rim(t + 3.75 * beat, 1); }
  }
  // tape hiss / crackle bed
  const l = lp(3200); voice(pad, 0, END, () => l(noise()) * 0.5 + (rnd() < 0.0006 ? noise() * 6 : 0), { gain: 0.012 });
}
if (STYLE === 3) {
  // C major pop: C · G · Am · F — sixteenth-note arpeggio, side-chained pad, driving bass
  const chords = [[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [57, 60, 65, 69]];
  const roots = [36, 43, 45, 41];
  for (let b = 0; b < BARS; b++) {
    const t = b * bar, ch = chords[b % 4], r = roots[b % 4];
    padChord(t, [ch[0], ch[1], ch[2]], bar + 0.2, 1);
    const arp = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2];
    for (let k = 0; k < 16; k++) if (b >= 1 || k % 2 === 0) pluck(t + k * s16, ch[arp[k]] + 12, (k % 4 === 0 ? 1 : 0.7) * (b < 1 ? 0.7 : 1), ((k % 4) - 1.5) * 0.3);
    if (b >= 2) { for (let q = 0; q < 4; q++) { K(t + q * beat); hat(t + q * beat + beat / 2, 1, true); } for (let k = 0; k < 8; k++) sub(t + k * (beat / 2), r + (k === 7 ? 7 : 0), beat / 2 * 0.85, k % 2 ? 0.8 : 1); }
    else if (b === 1) { K(t); K(t + 2 * beat); sub(t, r, beat * 2); }
    if (b >= 4) { clap(t + beat, 0.9); clap(t + 3 * beat, 0.9); for (let k = 0; k < 16; k++) if (k % 2) hat(t + k * s16, 0.45); }
    if (b === BARS - 1) for (let k = 8; k < 16; k++) clap(t + k * s16, 0.3 + (k - 8) * 0.08);
  }
}

// End card: one held chord, a rising sparkle, no drums
{
  const tonic = STYLE === 1 ? [57, 64, 69, 72, 76] : STYLE === 2 ? [50, 57, 62, 66, 69] : [48, 55, 60, 64, 67];
  padChord(END, tonic.slice(0, 4), DUR - END, 1.5);
  tonic.concat(tonic.map((n) => n + 12)).forEach((n, k) => bell(keys, END + 0.5 + k * 0.16, n + 12, 0.6, (k % 3 - 1) * 0.4, 2.2));
}
for (const e of tl.sfx) if (SFX[e.k]) SFX[e.k](e.t);

/* ── side-chain, reverb, mix-down ── */
const duck = new Float32Array(N).fill(1);
for (const kt of kicks) { const s = Math.round(kt * SR); for (let i = 0; i < SR * 0.28 && s + i < N; i++) duck[s + i] = Math.min(duck[s + i], 1 - 0.6 * Math.exp(-(i / SR) / 0.085)); }
function reverb(inp) {   // small Schroeder reverb: four combs into two all-passes, per channel
  const outp = new Float32Array(N);
  for (const [d, g] of [[1557, 0.78], [1617, 0.77], [1491, 0.79], [1422, 0.8]]) { const buf = new Float32Array(d); let k = 0, lpz = 0;
    for (let i = 0; i < N; i++) { const y = buf[k]; lpz += 0.35 * (y - lpz); buf[k] = inp[i] + lpz * g; outp[i] += y * 0.25; k = (k + 1) % d; } }
  for (const d of [225, 556]) { const buf = new Float32Array(d); let k = 0; for (let i = 0; i < N; i++) { const b = buf[k]; const y = -0.5 * outp[i] + b; buf[k] = outp[i] + 0.5 * b; outp[i] = y; k = (k + 1) % d; } }
  return outp;
}
const wet = [reverb(send[0]), reverb(send[1].map((x, i) => (i > 23 ? send[1][i - 23] : 0)))];
const delaySamples = Math.round(s16 * 3 * SR);   // dotted-eighth echo on the lead
const mix = [new Float32Array(N), new Float32Array(N)];
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) {
  const echo = i >= delaySamples ? keys[1 - c][i - delaySamples] * 0.22 + (i >= 2 * delaySamples ? keys[c][i - 2 * delaySamples] * 0.1 : 0) : 0;
  mix[c][i] = drums[c][i] + bass[c][i] * (0.55 + 0.45 * duck[i]) + keys[c][i] + echo + pad[c][i] * duck[i] + fx[c][i] * 0.9 + wet[c][i] * 0.55;
}
let peak = 0; for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) { mix[c][i] = Math.tanh(mix[c][i] * 1.25); peak = Math.max(peak, Math.abs(mix[c][i])); }
const norm = 0.89 / peak;
const pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVEfmt ', 8); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { const t = i / SR; const fade = Math.min(1, t / 0.03) * Math.min(1, (DUR - t) / 1.4);
  for (let c = 0; c < 2; c++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mix[c][i] * norm * fade)) * 32767), 44 + i * 4 + c * 2); }
fs.writeFileSync(path.join(here, 'out', `music-${v}.wav`), pcm);
console.log(`music-${v}.wav: ${DUR}s, ${Math.round(240 / bar)} bpm, ${BARS} bars to the end card, ${tl.sfx.length} sound effects, peak ${peak.toFixed(2)}`);
