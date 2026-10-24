/* Water Wobble — hero logo sway.
   The hero logo is redrawn on a canvas in thin horizontal strips shifted by slow sine
   waves, so it sways like something seen through a water surface. Pointer movement or
   a tap stirs it up; it settles back on its own. The plain <img> stays underneath for
   layout, alt text and devices set to reduce motion. */
'use strict';
(function () {
  const slot = document.querySelector('[data-logo="hero"]');
  const img = slot && slot.querySelector('img');
  if (!img) return;
  // reduced motion: keep the still logo (?motion=1 forces the sway, for checking)
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches && !/[?&]motion=1/.test(location.search)) return;
  (img.complete ? Promise.resolve() : img.decode()).then(() => ripple(slot, img)).catch(() => {});

  function ripple(slot, img) {
    const PAD_X = 0.05, PAD_Y = 0.08;                 // room for the sway, as a share of the logo size
    const cv = document.createElement('canvas');
    cv.className = 'logo-ripple';
    cv.setAttribute('aria-hidden', 'true');
    slot.appendChild(cv);
    const ctx = cv.getContext('2d');
    const src = document.createElement('canvas');
    const sctx = src.getContext('2d');
    let W = 0, H = 0, dpr = 1, px = 0, py = 0;
    let energy = 0.6, pv = 0.5, visible = true, last = performance.now(), t = 0;

    function layout() {
      const r = img.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
      px = Math.round(W * PAD_X); py = Math.round(H * PAD_Y);
      src.width = W; src.height = H;
      sctx.clearRect(0, 0, W, H);
      sctx.drawImage(img, 0, 0, W, H);
      cv.width = W + px * 2; cv.height = H + py * 2;
      Object.assign(cv.style, {
        left: -r.width * PAD_X + 'px', top: -r.height * PAD_Y + 'px',
        width: r.width * (1 + PAD_X * 2) + 'px', height: r.height * (1 + PAD_Y * 2) + 'px',
      });
      slot.classList.add('rippling');
    }

    function frame(now) {
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      energy *= Math.pow(0.35, dt);                    // stirring settles in a few seconds
      const A = W * (0.0045 + 0.012 * energy);          // horizontal sway
      const B = H * (0.006 + 0.01 * energy);            // gentle rise and fall
      const step = Math.max(1, Math.round(dpr * 1.5));
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (let y = 0; y < H; y += step) {
        const v = y / H;
        const local = Math.exp(-((v - pv) ** 2) / 0.06);    // stronger near where it was stirred
        const dx = A * (Math.sin(v * 8.5 + t * 1.5) + 0.45 * Math.sin(v * 21 - t * 2.6))
          + W * 0.012 * energy * local * Math.sin(v * 14 - t * 6);
        const dy = B * Math.sin(t * 1.1 + v * 4.2);
        ctx.drawImage(src, 0, y, W, step, px + dx, py + y + dy, W, step + 1);
      }
      requestAnimationFrame(frame);
    }

    function stir(e, amount) {
      const r = slot.getBoundingClientRect();
      pv = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      energy = Math.min(1.2, energy + amount);
    }
    slot.addEventListener('pointermove', e => stir(e, 0.04));
    slot.addEventListener('pointerdown', e => stir(e, 0.7));

    new ResizeObserver(layout).observe(img);
    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (visible) { last = performance.now(); requestAnimationFrame(frame); }
    }).observe(slot);
    layout();
  }
})();
