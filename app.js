/* Water Wobble — dim7.jp/pedals
   Page UI, language switch, and the Signal Lab (Web Audio simulation). */
'use strict';

// Shop links: fill in when the listings go live. Empty = "Coming soon".
const LINKS = {
  reverb: 'https://reverb.com/shop/aeroviewaudio',
};

/* ---------------- shared state (read by pedal3d.js) ---------------- */
const WW = window.WW = {
  knobs: { clear: 0.55, flow: 0.35, dive: 0.5, depth: 0.5 },
  on: true,
  listeners: new Set(),
  emit() { this.listeners.forEach(fn => fn(this)); },
};

/* ---------------- language ---------------- */
const JA = {
  'nav.play': '音', 'nav.model': '3D', 'nav.real': '動画', 'nav.specs': '仕様', 'nav.buy': '購入',
  'hero.kind': 'アナログ・コーラス／ビブラート',
  'hero.cta.play': '試聴', 'hero.cta.buy': '購入',
  'play.title': '音', 'play.window': 'シミュレーター',
  'src.riff1': 'リフ1', 'src.riff2': 'リフ2', 'src.arp': 'アルペジオ', 'src.chords': 'コード', 'src.long': 'ロングトーン',
  'preset.shimmer': 'さざ波', 'preset.lagoon': 'ラグーン', 'preset.seasick': '船酔い', 'preset.deep': '深く潜る',
  'model.title': '3D', 'model.loading': '3Dを読み込み中…', 'model.lights': '照明', 'model.spin': '自動回転',
  'model.view.hero': '正面', 'model.view.top': '真上', 'model.view.side': '横', 'model.view.night': '夜',
  'model.fail': 'この端末では3D表示を開けませんでした。',
  'real.title': '動画',
  'specs.title': '仕様',
  'specs.intro': 'Water Wobbleは、入ってきた音を2つに分けます。片方はそのまま、もう片方はBBD（アナログの遅延素子）を通り、遅れの長さを揺らすことで音程が上下します。DIVEで2つの割合を決め、混ぜればコーラス、揺れた音だけならビブラートになります。',
  'specs.circuit.k': '回路', 'specs.circuit.v': 'アナログ。BBD（バケツリレー素子）を三角波のLFOで揺らす',
  'specs.flow.k': 'FLOW', 'specs.flow.v': '揺れの速さ。ゆっくりした漂いから、細かいきらめきまで',
  'specs.depth.k': 'DEPTH', 'specs.depth.v': '音程が揺れる幅',
  'specs.dive.k': 'DIVE', 'specs.dive.v': '原音と揺れた音の割合。絞るとコーラス、上げきると揺れた音だけのビブラート',
  'specs.clear.k': 'CLEAR', 'specs.clear.v': '揺れた音の高音だけを調整。原音はそのまま',
  'specs.switch.k': 'フットスイッチ', 'specs.switch.v': 'ON／OFF。ONの間は内部の4つのLEDが点灯',
  'specs.power.k': '電源', 'specs.power.v': 'DC9V・センターマイナス。安定化されたペダル用電源で（別売）',
  'specs.jacks.k': 'ジャック', 'specs.jacks.v': '入力・出力（モノラル）は側面、電源は上面',
  'specs.size.k': '大きさ', 'specs.size.v': '約120 × 65 mm（ノブ・ジャックを除く）',
  'specs.build.k': '製造', 'specs.build.v': '日本で1台ずつ手組み。出荷前に全台を動作検査',
  'specs.tba': '消費電流・高さ・重さは、実測してから追記します。',
  'buy.title': '購入', 'buy.sub': '1台ずつ、シリアル番号つきで出品します。',
  'buy.open': 'ショップを開く →', 'buy.soon': '準備中',
  'foot.made': '日本で手組み',
  'foot.credits': '音のプレーヤーは回路設計をもとにしたシミュレーションで、実機の録音ではありません。ギターのフレーズは合成音、キャビネットIRはJester Dyne Brutal IR Pack（CC0）。3D：three.js（MIT）。',
  'aria.play': '再生', 'aria.stop': '停止',
};
const EN = {};
document.querySelectorAll('[data-i18n]').forEach(el => { EN[el.dataset.i18n] = el.innerHTML; });
Object.assign(EN, { 'model.fail': "3D couldn't start on this device.", 'aria.play': 'Play', 'aria.stop': 'Stop' });

let lang = 'en';
try { lang = localStorage.getItem('ww-lang') || ''; } catch (e) { lang = ''; }
// Default: Japanese only for visitors in Japan (judged by the device time zone), English everywhere else.
// A choice made with the language button is remembered.
if (!lang) {
  let tz = '';
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* old browser */ }
  lang = tz === 'Asia/Tokyo' ? 'ja' : 'en';
}

function t(key) { return (lang === 'ja' ? JA[key] : EN[key]) ?? EN[key] ?? key; }
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
  document.getElementById('lang').textContent = lang === 'ja' ? 'English' : '日本語';
  updatePlayButton();
  const msg = document.getElementById('msg3d');
  if (msg && msg.dataset.state === 'fail') msg.textContent = t('model.fail');
}
document.getElementById('lang').addEventListener('click', () => {
  lang = lang === 'ja' ? 'en' : 'ja';
  try { localStorage.setItem('ww-lang', lang); } catch (e) { /* private mode */ }
  applyLang();
});
window.WWt = t;

/* ---------------- sky bubbles ---------------- */
(function bubbles() {
  const box = document.querySelector('.bubbles');
  const n = window.innerWidth < 600 ? 10 : 18;
  for (let i = 0; i < n; i++) {
    const b = document.createElement('i');
    const s = 10 + Math.random() * 46;
    b.style.width = b.style.height = s + 'px';
    b.style.left = Math.random() * 100 + 'vw';
    b.style.animationDuration = 14 + Math.random() * 18 + 's';
    b.style.animationDelay = -Math.random() * 30 + 's';
    box.appendChild(b);
  }
})();

/* ---------------- shop links ---------------- */
for (const key of ['reverb']) {
  const a = document.getElementById('shop-' + key);
  if (LINKS[key]) a.href = LINKS[key];
  else {
    a.classList.add('soon');
    a.removeAttribute('href');
    a.setAttribute('aria-disabled', 'true');
  }
}

/* ---------------- videos: play only while visible ---------------- */
const vio = new IntersectionObserver(entries => {
  for (const e of entries) {
    const v = e.target;
    if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); }
    else v.pause();
  }
}, { threshold: 0.25 });
document.querySelectorAll('video').forEach(v => vio.observe(v));

/* ---------------- knob mapping (matches the R5 design ranges) ---------------- */
// FLOW: LFO about 0.09–4.8 Hz (triangle). DEPTH: delay swing. DIVE: linear dry/wet.
// CLEAR: wet low-pass. Values are approximations for listening, not measurements.
const map = {
  rate: k => 0.09 * Math.pow(4.8 / 0.09, k),
  swing: k => 0.00012 + 0.0042 * k * k,             // seconds of delay swing (small residual at 0)
  cutoff: k => 1100 * Math.pow(9000 / 1100, k),     // Hz
  wet: k => k,
};
const BASE_DELAY = 0.0075;
const SOURCES = {
  arp: 'assets/phrase-arp.m4a', chords: 'assets/phrase-chords.m4a',
  riff1: 'assets/phrase-riff1.m4a', riff2: 'assets/phrase-riff2.m4a', long: 'assets/phrase-long.m4a',
};

/* ---------------- knobs UI ---------------- */
const lab = document.getElementById('lab');
const pedal = document.getElementById('pedal');
const knobEls = [...pedal.querySelectorAll('.knob')];
const DEFAULTS = { ...WW.knobs };
const PRESETS = {
  shimmer: { flow: 0.62, depth: 0.22, dive: 0.38, clear: 0.75 },
  lagoon:  { flow: 0.34, depth: 0.5,  dive: 0.5,  clear: 0.55 },
  seasick: { flow: 0.55, depth: 0.85, dive: 1.0,  clear: 0.6 },
  deep:    { flow: 0.12, depth: 1.0,  dive: 0.88, clear: 0.2 },
};

function fmt(k, v) {
  if (k === 'flow') { const r = map.rate(v); return (r < 1 ? r.toFixed(2) : r.toFixed(1)) + ' Hz'; }
  return Math.round(v * 100) + '%';
}
function renderKnobs() {
  for (const el of knobEls) {
    const k = el.dataset.k, v = WW.knobs[k];
    el.style.setProperty('--v', v.toFixed(4));
    el.querySelector('.knob-cap').style.setProperty('--rot', (-135 + 270 * v) + 'deg');
    el.querySelector('.bubble').textContent = fmt(k, v);
    el.setAttribute('aria-valuenow', Math.round(v * 100));
    el.setAttribute('aria-valuetext', fmt(k, v));
  }
}
function setKnob(k, v) {
  WW.knobs[k] = Math.min(1, Math.max(0, v));
  renderKnobs();
  engine.update();
  WW.emit();
}
// the first touch of anything in the lab also starts the sound
function touched() {
  stopNudge();
  if (!engine.playing && !engine.starting) engine.start();
}
for (const el of knobEls) {
  const k = el.dataset.k;
  let startY = 0, startX = 0, startV = 0, id = null, lastTap = 0;
  // In-app browsers (Instagram, LINE…) can ignore touch-action and scroll or drag the page
  // while a knob is turned; cancelling the touch events here keeps the gesture on the knob.
  const hold = e => { if (e.cancelable) e.preventDefault(); };
  el.addEventListener('touchstart', hold, { passive: false });
  el.addEventListener('touchmove', hold, { passive: false });
  el.addEventListener('pointerdown', e => {
    id = e.pointerId; el.setPointerCapture(id);
    startY = e.clientY; startX = e.clientX; startV = WW.knobs[k];
    el.classList.add('dragging');
    const now = performance.now();
    if (now - lastTap < 320) setKnob(k, DEFAULTS[k]);
    lastTap = now;
    touched();
    e.preventDefault();
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== id) return;
    const d = (startY - e.clientY) + (e.clientX - startX) * 0.5;
    setKnob(k, startV + d / 180);
  });
  const end = e => { if (e.pointerId === id) { id = null; el.classList.remove('dragging'); } };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', e => { e.preventDefault(); setKnob(k, WW.knobs[k] - Math.sign(e.deltaY) * 0.03); }, { passive: false });
  el.addEventListener('keydown', e => {
    const step = e.shiftKey ? 0.1 : 0.02;
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') setKnob(k, WW.knobs[k] + step);
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') setKnob(k, WW.knobs[k] - step);
    else if (e.key === 'Home') setKnob(k, 0);
    else if (e.key === 'End') setKnob(k, 1);
    else return;
    e.preventDefault();
  });
}

// a one-time wiggle on FLOW when the lab first comes into view says "this turns"
let nudgeTimer = null;
function stopNudge() { clearTimeout(nudgeTimer); knobEls.forEach(el => el.classList.remove('nudge')); }
new IntersectionObserver((es, ob) => {
  if (!es[0].isIntersecting) return;
  ob.disconnect();
  const flow = pedal.querySelector('.knob[data-k="flow"]');
  // reduced motion: keep the chevrons shown (still) until the first touch instead of wiggling
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { flow.classList.add('nudge'); return; }
  setTimeout(() => {
    flow.classList.add('nudge');
    nudgeTimer = setTimeout(stopNudge, 4800);
  }, 500);
}, { threshold: 0.6 }).observe(pedal);

/* ---------------- on / bypass ---------------- */
const fsw = document.getElementById('footswitch');
const bigSwitch = document.getElementById('bigSwitch');
function setOn(on) {
  WW.on = on;
  pedal.dataset.on = String(on);
  lab.dataset.on = String(on);
  fsw.setAttribute('aria-pressed', String(on));
  bigSwitch.setAttribute('aria-checked', String(on));
  document.getElementById('stateLabel').textContent = on ? 'ON' : 'BYPASS';
  engine.update();
  WW.emit();
}
function toggleFromUser() {
  lab.classList.add('touched-fs');
  setOn(!WW.on);
  touched();
}
fsw.addEventListener('click', toggleFromUser);
bigSwitch.addEventListener('click', toggleFromUser);
WW.setOn = setOn;
WW.setKnob = setKnob;

document.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
  const p = PRESETS[b.dataset.preset];
  const from = { ...WW.knobs }, t0 = performance.now();
  document.querySelectorAll('[data-preset]').forEach(x => x.classList.toggle('active', x === b));
  if (!WW.on) setOn(true);
  (function step(now) {
    const a = Math.min(1, (now - t0) / 450), e = a * (2 - a);
    for (const k in p) WW.knobs[k] = from[k] + (p[k] - from[k]) * e;
    renderKnobs(); engine.update(); WW.emit();
    if (a < 1) requestAnimationFrame(step);
  })(t0);
  touched();
}));



/* ---------------- audio engine ---------------- */
const engine = {
  ctx: null, playing: false, starting: false, src: 'arp', buffers: {}, loading: {}, node: null,
  async init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    const ctx = this.ctx = new C({ latencyHint: 'interactive' });
    const n = this.n = {};
    n.input = ctx.createGain();
    // dry path (buffered when on, hard-wired when bypassed: both are just the dry signal here)
    n.dry = ctx.createGain();
    // wet path: anti-alias LPF → BBD delay (modulated) → soft saturation → CLEAR LPF → wet gain
    n.pre = ctx.createBiquadFilter(); n.pre.type = 'lowpass'; n.pre.frequency.value = 7000; n.pre.Q.value = 0.7;
    n.delay = ctx.createDelay(0.05); n.delay.delayTime.value = BASE_DELAY;
    n.lfo = ctx.createOscillator(); n.lfo.type = 'triangle';
    n.swing = ctx.createGain();
    n.lfo.connect(n.swing).connect(n.delay.delayTime);
    n.lfo.start();
    n.sat = ctx.createWaveShaper(); n.sat.curve = satCurve(); n.sat.oversample = '2x';
    n.post = ctx.createBiquadFilter(); n.post.type = 'lowpass'; n.post.Q.value = 0.6;
    n.post2 = ctx.createBiquadFilter(); n.post2.type = 'lowpass'; n.post2.frequency.value = 9000; n.post2.Q.value = 0.5;
    n.wet = ctx.createGain();
    n.input.connect(n.dry);
    n.input.connect(n.pre).connect(n.delay).connect(n.sat).connect(n.post).connect(n.post2).connect(n.wet);
    n.mix = ctx.createGain();
    n.dry.connect(n.mix); n.wet.connect(n.mix);
    // always through a clean amp → speaker cabinet (IR) → a small room
    n.ampIn = ctx.createGain(); n.ampIn.gain.value = 0.9;
    n.amp = ctx.createWaveShaper(); n.amp.curve = ampCurve(); n.amp.oversample = '2x';
    n.cab = ctx.createConvolver();
    n.cabGain = ctx.createGain(); n.cabGain.gain.value = 2.6;
    n.mix.connect(n.ampIn).connect(n.amp).connect(n.cab).connect(n.cabGain);
    n.room = ctx.createConvolver();
    n.room.buffer = roomIR(ctx);
    n.roomGain = ctx.createGain(); n.roomGain.gain.value = 0.22;
    n.cabGain.connect(n.room).connect(n.roomGain);
    n.out = ctx.createGain(); n.out.gain.value = 0.0;
    n.cabGain.connect(n.out); n.roomGain.connect(n.out);
    n.analyser = ctx.createAnalyser(); n.analyser.fftSize = 1024;
    n.out.connect(n.analyser);
    n.out.connect(ctx.destination);
    n.cab.buffer = await loadAudio('assets/ir-v30.wav');
    this.update(true);
  },
  buffer(name) {
    // phrases load on first use; all are levelled to the same loudness
    if (!this.loading[name]) {
      this.loading[name] = loadAudio(SOURCES[name]).then(buf => { levelRms(buf, 0.14, 0.95); return (this.buffers[name] = buf); });
    }
    return this.loading[name];
  },
  update(instant) {
    if (!this.ctx) return;
    const { n, ctx } = this, k = WW.knobs, now = ctx.currentTime, tc = instant ? 0 : 0.03;
    const on = WW.on;
    const set = (p, v) => tc ? p.setTargetAtTime(v, now, tc) : p.setValueAtTime(v, now);
    set(n.lfo.frequency, map.rate(k.flow));
    set(n.swing.gain, on ? map.swing(k.depth) : 0);
    set(n.post.frequency, map.cutoff(k.clear));
    const w = on ? map.wet(k.dive) : 0;
    set(n.wet.gain, w * 1.35);
    set(n.dry.gain, 1 - w);
  },
  async start() {
    this.starting = true;
    try {
      await this.init();
      if (this.ctx.state !== 'running') await this.ctx.resume();
      await this.connectSource();
      this.n.out.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.04);
      this.playing = true;
    } catch (err) {
      console.warn(err);
      this.playing = false;
    }
    this.starting = false;
    updatePlayButton();
    startWaterLoop();
  },
  stop() {
    if (!this.ctx) return;
    this.n.out.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    const node = this.node;
    setTimeout(() => { try { node && node.stop && node.stop(); } catch (e) {} if (node && node.disconnect) node.disconnect(); }, 200);
    this.node = null;
    this.playing = false;
    updatePlayButton();
  },
  async connectSource() {
    const src = this.src;
    const buf = await this.buffer(src);
    if (src !== this.src) return;                    // another source was picked while loading
    const next = this.ctx.createBufferSource();
    next.buffer = buf;
    next.loop = true;
    next.start();
    if (this.node) { try { this.node.stop && this.node.stop(); } catch (e) {} this.node.disconnect(); }
    this.node = next;
    this.node.connect(this.n.input);
  },
};

async function loadAudio(url) {
  const res = await fetch(url);
  const data = await res.arrayBuffer();
  return await new Promise((ok, ng) => engine.ctx.decodeAudioData(data, ok, ng));
}
function levelRms(buf, rmsTarget, peakMax) {
  let s = 0, p = 0, n = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) for (const x of buf.getChannelData(c)) { s += x * x; p = Math.max(p, Math.abs(x)); n++; }
  const rms = Math.sqrt(s / n);
  if (!rms) return;
  const g = Math.min(rmsTarget / rms, peakMax / p);
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= g; }
}
// A small, slightly dark room: a few early reflections, then a decaying noise tail
// (about 0.5 s to fade), decorrelated left/right so the amp sounds like it is in a room.
function roomIR(ctx) {
  const sr = ctx.sampleRate, len = Math.round(sr * 0.9);
  const ir = ctx.createBuffer(2, len, sr);
  const early = [[0.007, 0.5], [0.013, 0.35], [0.019, 0.3], [0.027, 0.22], [0.034, 0.18]];
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      lp += ((Math.random() * 2 - 1) - lp) * 0.35;        // darken the tail
      d[i] = t < 0.012 ? 0 : lp * Math.exp(-t / 0.075) * 0.5;
    }
    for (const [tt, g] of early) d[Math.round((tt + c * 0.0017) * sr)] += g * (c ? -1 : 1);
  }
  return ir;
}
function satCurve() {
  const c = new Float32Array(1024);
  for (let i = 0; i < c.length; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(1.6 * x) / Math.tanh(1.6); }
  return c;
}
function ampCurve() {
  const c = new Float32Array(2048);
  for (let i = 0; i < c.length; i++) { const x = i / 1023.5 - 1; c[i] = Math.tanh(1.2 * x + 0.05 * x * x) / Math.tanh(1.2); }
  return c;
}

const playBtn = document.getElementById('playBtn');
function updatePlayButton() {
  playBtn.classList.toggle('playing', engine.playing);
  playBtn.setAttribute('aria-label', t(engine.playing ? 'aria.stop' : 'aria.play'));
}
playBtn.addEventListener('click', () => { stopNudge(); engine.playing ? engine.stop() : engine.start(); });

const seg = document.getElementById('sourceSeg');
function selectSource(src, quiet) {
  engine.src = src;
  seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.src === src)));
  if (!quiet) { stopNudge(); engine.start(); }
}
seg.addEventListener('click', e => { const b = e.target.closest('button'); if (b) selectSource(b.dataset.src); });

/* ---------------- water visual ---------------- */
// The water surface shows the settings: level = DIVE, wobble = DEPTH, speed = FLOW,
// clarity = CLEAR, wave height = output level. In bypass the water drains and goes still.
const wc = document.getElementById('waterCanvas');
const wctx = wc.getContext('2d');
let wRunning = false, phase = 0, lastT = 0, level = 0, waterVisible = true, wetVis = WW.knobs.dive;
const lvlBuf = new Float32Array(1024);
const motes = Array.from({ length: 26 }, () => ({ x: Math.random(), y: Math.random(), r: 1 + Math.random() * 3, s: 0.2 + Math.random() * 0.6 }));
new IntersectionObserver(es => { waterVisible = es[0].isIntersecting; if (waterVisible) startWaterLoop(); }, {}).observe(wc);

function startWaterLoop() { if (!wRunning) { wRunning = true; lastT = performance.now(); requestAnimationFrame(drawWater); } }
function drawWater(now) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = wc.clientWidth, H = wc.clientHeight;
  if (wc.width !== Math.round(W * dpr) || wc.height !== Math.round(H * dpr)) { wc.width = Math.round(W * dpr); wc.height = Math.round(H * dpr); }
  wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  const k = WW.knobs, on = WW.on;
  phase += dt * map.rate(k.flow) * Math.PI * 2;
  if (engine.playing && engine.n) {
    engine.n.analyser.getFloatTimeDomainData(lvlBuf);
    let s = 0; for (let i = 0; i < lvlBuf.length; i++) s += lvlBuf[i] * lvlBuf[i];
    level += (Math.sqrt(s / lvlBuf.length) * 4 - level) * 0.2;
  } else level *= 0.94;

  wctx.clearRect(0, 0, W, H);
  const g = wctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#dff5ff'); g.addColorStop(1, '#a6e1ff');
  wctx.fillStyle = g; wctx.fillRect(0, 0, W, H);

  // the level eases to its target so switching on/off is visible as water filling or draining
  wetVis += ((on ? k.dive : 0) - wetVis) * Math.min(1, dt * 6);
  const surface = H * (0.84 - 0.6 * wetVis);
  const amp = (on ? 3 + 10 * k.depth : 1) * (0.5 + Math.min(1.5, level));
  const tri = p => { const x = (p / (Math.PI * 2)) % 1; return 4 * Math.abs(x - 0.5) - 1; };
  const clear = k.clear;
  const wave = (u, layer) => Math.sin(u * 9 + phase * (1 + layer * 0.3)) * amp * 0.6
    + tri(phase + u * 6 + layer) * amp * 0.5
    + Math.sin(u * 23 - now / 900) * (on ? 1.2 + level * 3 : 0.6);

  for (let layer = 2; layer >= 0; layer--) {
    const y0 = surface + layer * 12;
    wctx.beginPath();
    wctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) wctx.lineTo(x, y0 + wave(x / W, layer));
    wctx.lineTo(W, H); wctx.closePath();
    const wg = wctx.createLinearGradient(0, y0 - 20, 0, H);
    const a = 0.35 + layer * 0.15;
    wg.addColorStop(0, `rgba(${Math.round(60 + 120 * clear)},${Math.round(170 + 60 * clear)},255,${a})`);
    wg.addColorStop(1, `rgba(${Math.round(10 + 20 * clear)},${Math.round(60 + 60 * clear)},${Math.round(150 + 60 * clear)},${a + 0.25})`);
    wctx.fillStyle = wg; wctx.fill();
  }
  wctx.beginPath();
  for (let x = 0; x <= W; x += 4) { const y = surface + wave(x / W, 0); x ? wctx.lineTo(x, y) : wctx.moveTo(x, y); }
  wctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.4 * clear})`; wctx.lineWidth = 2; wctx.stroke();

  // bubbles under the surface; murkier when CLEAR is low
  for (const m of motes) {
    m.y -= dt * m.s * (on ? 0.15 + map.rate(k.flow) * 0.08 : 0.03);
    if (m.y < 0) { m.y = 1; m.x = Math.random(); }
    const py = surface + m.y * (H - surface);
    const px = m.x * W + Math.sin(phase + m.y * 8) * (on ? k.depth : 0) * 10;
    wctx.beginPath(); wctx.arc(px, py, m.r, 0, Math.PI * 2);
    wctx.fillStyle = `rgba(255,255,255,${0.25 + 0.5 * clear})`; wctx.fill();
  }
  if (clear < 0.5) { wctx.fillStyle = `rgba(20,60,90,${(0.5 - clear) * 0.35})`; wctx.fillRect(0, surface, W, H - surface); }

  if (waterVisible) {
    if (engine.playing || level > 0.002) requestAnimationFrame(drawWater);
    else setTimeout(() => requestAnimationFrame(drawWater), 50);   // idle: gentle motion at low cost
  } else wRunning = false;
}

/* ---------------- init ---------------- */
applyLang();
renderKnobs();
startWaterLoop();
