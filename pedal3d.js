/* Water Wobble — interactive 3D model (three.js r158, global build).
   Built from the R5 layout (mm): case 65 x 120 x 39.8, pots at (±15.5, 43) and (±15.5, 15),
   footswitch (0, −45), LEDs (±21.5, ±42.5), jacks on the sides at y −17.
   Three.js axes: x right, y up (top face at y = 0), z toward the footswitch end. */
'use strict';
(function () {
  const stage = document.getElementById('stage3d');
  const canvas = document.getElementById('canvas3d');
  const msg = document.getElementById('msg3d');
  let started = false;

  const io = new IntersectionObserver(es => {
    if (es[0].isIntersecting && !started) { started = true; io.disconnect(); boot(); }
  }, { rootMargin: '200px' });
  io.observe(stage);

  function fail(e) {
    console.warn(e);
    msg.dataset.state = 'fail';
    document.getElementById('gesture3d').classList.add('gone');
    msg.textContent = (window.WWt || (k => k))('model.fail');
  }

  function boot() {
    if (!window.THREE) return fail('three.js missing');
    try { build(); } catch (e) { fail(e); }
  }

  function build() {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 5, 3000);

    // sky-gradient environment for reflections and transmission
    const pmrem = new THREE.PMREMGenerator(renderer);
    function skyEnv(night) {
      const s = new THREE.Scene();
      const geo = new THREE.SphereGeometry(50, 32, 16);
      const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { night: { value: night ? 1 : 0 } },
        vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
        fragmentShader: `varying vec3 p; uniform float night;
          void main(){
            float h = p.y;
            vec3 day = mix(vec3(0.92,0.97,1.0), vec3(0.18,0.5,0.95), smoothstep(0.05,0.9,h));
            day = mix(vec3(0.12,0.16,0.24), day, smoothstep(-0.12,0.04,h));
            day += vec3(1.0) * pow(max(dot(p, normalize(vec3(0.5,0.8,0.3))),0.0), 60.0) * 3.0;
            day += vec3(1.0) * smoothstep(0.08,0.0,abs(h-0.3)) * 0.6 * step(0.0, p.x);
            day += vec3(0.9,0.95,1.0) * smoothstep(0.06,0.0,abs(p.x+0.6)) * step(0.1,h) * 0.8;
            vec3 nt = mix(vec3(0.02,0.04,0.12), vec3(0.05,0.1,0.3), smoothstep(-0.2,0.8,h));
            nt += vec3(0.3,0.5,1.0) * pow(max(dot(p, normalize(vec3(-0.4,0.6,0.5))),0.0), 30.0);
            gl_FragColor = vec4(mix(day, nt, night), 1.0);
          }`,
      });
      s.add(new THREE.Mesh(geo, mat));
      const rt = pmrem.fromScene(s, 0.02);
      geo.dispose(); mat.dispose();
      return rt.texture;
    }
    const envDay = skyEnv(false), envNight = skyEnv(true);
    scene.environment = envDay;

    const hemi = new THREE.HemisphereLight(0xdff4ff, 0x6a8fb0, 0.6);
    const fill = new THREE.PointLight(0xffffff, 2600, 160, 2); fill.position.set(0, -10, 0); scene.add(fill);   // lights the parts inside the shell
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(120, 260, 140);
    scene.add(sun);

    const pedal = new THREE.Group();
    scene.add(pedal);

    // ---- enclosure ----
    const W = 65, L = 120, H = 39.8, R = 6.5;
    function rounded(w, l, r) {
      const s = new THREE.Shape(), x = -w / 2, y = -l / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + l - r); s.quadraticCurveTo(x + w, y + l, x + w - r, y + l);
      s.lineTo(x + r, y + l); s.quadraticCurveTo(x, y + l, x, y + l - r);
      s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      return s;
    }
    const bevel = 2.2;
    const caseGeo = new THREE.ExtrudeGeometry(rounded(W - bevel * 2, L - bevel * 2, R - bevel), {
      depth: H - bevel * 2 - 3, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 5, curveSegments: 14,
    });
    caseGeo.rotateX(-Math.PI / 2);           // extrude along +y
    caseGeo.translate(0, -(H - bevel) + 3, 0);
    const caseMat = new THREE.MeshPhysicalMaterial({
      color: 0x3a66f2, metalness: 0, roughness: 0.1, transmission: 0.92, thickness: 3, ior: 1.585,
      clearcoat: 1, clearcoatRoughness: 0.05, attenuationColor: new THREE.Color(0x2448d8), attenuationDistance: 60,
      envMapIntensity: 0.9, side: THREE.FrontSide,
    });
    const shell = new THREE.Mesh(caseGeo, caseMat);
    pedal.add(shell);

    // lid (bottom plate)
    const lidGeo = new THREE.ExtrudeGeometry(rounded(W - 1, L - 1, R), { depth: 3, bevelEnabled: false, curveSegments: 14 });
    lidGeo.rotateX(-Math.PI / 2); lidGeo.translate(0, -H, 0);
    pedal.add(new THREE.Mesh(lidGeo, new THREE.MeshStandardMaterial({ color: 0x0d1c5c, roughness: 0.5, metalness: 0.1 })));

    // ---- inside: board, parts and wiring from the R5 layout (assets/parts.json) ----
    // Generic shapes only (boxes, cylinders, tubes), seen through the translucent case.
    const P = (x, y, z) => new THREE.Vector3(x, z, -y);           // layout mm → scene
    let ledSpots = null;
    fetch('assets/parts.json').then(r => r.json()).then(data => {
      const inner = new THREE.Group();
      const matCache = {};
      const matFor = name => matCache[name] || (matCache[name] = (() => {
        const metal = name === 'metal' || name === 'brass' || name === 'lead';
        return new THREE.MeshStandardMaterial({ color: new THREE.Color(data.mats[name]), metalness: metal ? 0.85 : 0.05, roughness: metal ? 0.35 : 0.6 });
      })());
      // PCB: outline extruded, dark solder mask
      const b = data.board;
      const shape = new THREE.Shape(b.outline.map(([x, y]) => new THREE.Vector2(x, y)));
      const pcbGeo = new THREE.ExtrudeGeometry(shape, { depth: b.thickness, bevelEnabled: false });
      pcbGeo.rotateX(-Math.PI / 2); pcbGeo.translate(0, b.top - b.thickness, 0);
      inner.add(new THREE.Mesh(pcbGeo, new THREE.MeshStandardMaterial({ color: 0x0f2a33, roughness: 0.45, metalness: 0.15 })));
      // instanced boxes and cylinders, one draw call per material (and axis)
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3();
      function instanced(geo, items, mat, place) {
        const mesh = new THREE.InstancedMesh(geo, mat, items.length);
        items.forEach((it, i) => { place(it); mesh.setMatrixAt(i, m4.compose(P(it[0], it[1], it[2]), q, sc)); });
        inner.add(mesh);
      }
      const byKey = (list, keyOf) => list.reduce((acc, it) => ((acc[keyOf(it)] = acc[keyOf(it)] || []).push(it), acc), {});
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);
      const boxGroups = byKey(data.boxes, it => it[7]);
      for (const mi in boxGroups) instanced(boxGeo, boxGroups[mi], matFor(data.matNames[mi]), it => {
        q.setFromEuler(e.set(0, it[6] * Math.PI / 180, 0)); sc.set(it[3], it[5], it[4]);
      });
      const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 20);
      const cylGroups = byKey(data.cyls, it => it[6] + ':' + it[5]);
      for (const key in cylGroups) {
        const [mi, axis] = key.split(':').map(Number);
        instanced(cylGeo, cylGroups[key], matFor(data.matNames[mi]), it => {
          q.setFromEuler(axis === 0 ? e.set(0, 0, Math.PI / 2) : axis === 1 ? e.set(Math.PI / 2, 0, 0) : e.set(0, 0, 0));
          sc.set(it[3], it[4], it[3]);
        });
      }
      // wires
      for (const w of data.wires) {
        const curve = new THREE.CatmullRomCurve3(w.p.map(pt => P(pt[0], pt[1], pt[2])));
        inner.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, w.r, 6), matFor(data.matNames[w.m])));
      }
      pedal.add(inner);
      // LEDs sit where the layout puts them
      ledSpots = data.spheres.map(sp => P(sp[0], sp[1], sp[2]));
      leds.forEach((l, i) => {
        const p = ledSpots[i]; if (!p) return;
        l.bulb.position.copy(p); l.light.position.set(p.x, p.y + 2, p.z); l.sp.position.set(p.x, p.y + 4, p.z);
      });
      needs = true;
    }).catch(err => console.warn('parts', err));

    // top artwork (transparent PNG/WebP) as a decal on the top face
    const tex = new THREE.TextureLoader().load('assets/face.webp', t => { t.colorSpace = THREE.SRGBColorSpace; render(); });
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const art = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, L - 1), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.35, metalness: 0, depthWrite: false }));
    art.rotation.x = -Math.PI / 2; art.position.y = 0.05;
    pedal.add(art);

    // ---- hardware ----
    const chrome = new THREE.MeshStandardMaterial({ color: 0xe8edf3, metalness: 1, roughness: 0.18, envMapIntensity: 1.3 });
    const chromeSoft = new THREE.MeshStandardMaterial({ color: 0xd5dbe4, metalness: 1, roughness: 0.32 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x14203a, roughness: 0.6 });

    function knob() {
      const g = new THREE.Group();
      const prof = [[0, 0], [8.2, 0], [8.6, 0.6], [8.6, 3], [8.0, 3.6], [7.6, 12], [7.0, 13.2], [5.2, 13.8], [0, 13.9]].map(([r, y]) => new THREE.Vector2(r, y));
      const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), chrome);
      g.add(body);
      // knurl ridges
      const ridgeGeo = new THREE.BoxGeometry(0.6, 8, 0.8);
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2, r = 7.75;
        const m = new THREE.Mesh(ridgeGeo, chromeSoft);
        m.position.set(Math.cos(a) * r, 8, Math.sin(a) * r); m.rotation.y = -a; g.add(m);
      }
      const line = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 4.6), dark);
      line.position.set(0, 13.95, -3.0); g.add(line);
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 1.4, 6), chromeSoft);
      nut.position.y = -0.2; g.add(nut);
      return g;
    }
    const knobDefs = { clear: [-15.5, 43], flow: [15.5, 43], dive: [-15.5, 15], depth: [15.5, 15] };
    const knobs = {};
    for (const k in knobDefs) {
      const [x, y] = knobDefs[k];
      const m = knob(); m.position.set(x, 0.6, -y); pedal.add(m); knobs[k] = m;
    }

    // footswitch
    const fs = new THREE.Group();
    const fsBody = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [7, 0], [7, 2], [6.2, 2.6], [3.8, 3], [3.8, 9], [5.6, 9.4], [5.8, 11], [5, 12], [0, 12.2]].map(([r, y]) => new THREE.Vector2(r, y)), 40), chrome);
    fs.add(fsBody);
    const fsNut = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.2, 2, 6), chromeSoft); fsNut.position.y = 1; fs.add(fsNut);
    fs.position.set(0, 0, 45); pedal.add(fs);

    // jacks and DC (nuts on the case walls)
    function jack(x, z, rotY) {
      const g = new THREE.Group();
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 2.5, 6), chromeSoft); nut.rotation.z = Math.PI / 2; g.add(nut);
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 4, 24, 1, true), chrome); sleeve.rotation.z = Math.PI / 2; sleeve.position.x = 1.2; g.add(sleeve);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), new THREE.MeshBasicMaterial({ color: 0x05070c })); hole.rotation.y = Math.PI / 2; hole.position.x = 3.25; g.add(hole);
      g.position.set(x, -14, z); g.rotation.y = rotY; return g;
    }
    pedal.add(jack(-32.6, 17, Math.PI));  // OUT (left)
    pedal.add(jack(32.6, 17, 0));         // IN (right)
    const dc = jack(0, -60.6, Math.PI / 2); dc.position.y = -16; dc.scale.setScalar(0.85); pedal.add(dc);   // same height as the DC jack body in the layout (z = −16)

    // ---- LEDs ----
    const leds = [];
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(170,200,255,.9)'); g.addColorStop(0.45, 'rgba(80,120,255,.35)'); g.addColorStop(1, 'rgba(60,100,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    [[-21.5, 42.5], [21.5, 42.5], [-21.5, -42.5], [21.5, -42.5]].forEach(([x, y]) => {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x9fbaff, emissiveIntensity: 3 }));
      bulb.position.set(x, -6, -y); pedal.add(bulb);
      const light = new THREE.PointLight(0x7aa0ff, 900, 90, 2);
      light.position.set(x, -8, -y); pedal.add(light);
      // glow drawn after the case (transmission only shows opaque objects behind it)
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0.9 }));
      sp.scale.set(30, 30, 1); sp.position.set(x, -5, -y); sp.renderOrder = 10; pedal.add(sp);
      leds.push({ bulb, light, sp });
    });

    // soft shadow on the "ground"
    const shadowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 10, 64, 64, 64);
      g.addColorStop(0, 'rgba(0,40,100,.45)'); g.addColorStop(1, 'rgba(0,40,100,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
    })();
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(130, 190), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -H - 0.5; pedal.add(shadow);
    const ledPool = new THREE.Mesh(new THREE.PlaneGeometry(150, 210), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.35 }));
    ledPool.rotation.x = -Math.PI / 2; ledPool.position.y = -H - 0.4; pedal.add(ledPool);

    pedal.position.y = H / 2 - 4;

    // ---- view state ----
    const view = { theta: 0.55, phi: 0.95, dist: 300, tTheta: 0.55, tPhi: 0.95, tDist: 300 };
    const VIEWS = { hero: [0.55, 0.95, 300], top: [0, 0.02, 320], side: [Math.PI / 2, 1.38, 270], night: [-0.6, 1.05, 280] };
    let auto = true, lightsOverride = null, night = false, idleSince = 0, needs = true;

    function setLights() {
      const on = lightsOverride ?? (window.WW ? WW.on : true);
      for (const l of leds) {
        l.light.visible = on; l.sp.visible = on;
        l.bulb.material.emissiveIntensity = on ? 3 : 0.05;
      }
      ledPool.visible = on;
      caseMat.emissive = new THREE.Color(on ? 0x0a1a66 : 0x000000);
      document.getElementById('v-lights').setAttribute('aria-pressed', String(on));
      needs = true;
    }
    function syncKnobs() {
      if (!window.WW) return;
      for (const k in knobs) knobs[k].rotation.y = -((-135 + 270 * WW.knobs[k]) * Math.PI / 180);
      needs = true;
    }
    if (window.WW) WW.listeners.add(() => { if (lightsOverride === null) setLights(); syncKnobs(); });

    function setNight(n) {
      night = n;
      stage.classList.toggle('night', n);
      scene.environment = n ? envNight : envDay;
      hemi.intensity = n ? 0.08 : 0.6;
      fill.intensity = n ? 500 : 2600;
      sun.intensity = n ? 0.15 : 1.6;
      renderer.toneMappingExposure = n ? 1.2 : 1.05;
      shadow.visible = !n;
      needs = true;
    }

    document.getElementById('v-lights').addEventListener('click', () => {
      const cur = lightsOverride ?? (window.WW ? WW.on : true);
      // the Lights button drives the same footswitch state so the Signal Lab stays in sync
      if (window.WW && WW.setOn) { lightsOverride = null; WW.setOn(!cur); }
      else { lightsOverride = !cur; setLights(); }
    });
    const spinBtn = document.getElementById('v-spin');
    spinBtn.addEventListener('click', () => { auto = !auto; spinBtn.setAttribute('aria-pressed', String(auto)); needs = true; });
    stage.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
      const v = VIEWS[b.dataset.view];
      view.tTheta = nearestAngle(view.theta, v[0]); view.tPhi = v[1]; view.tDist = v[2];
      setNight(b.dataset.view === 'night');
      if (b.dataset.view === 'night' && window.WW && !WW.on) WW.setOn(true);
      idleSince = performance.now(); needs = true;
    }));
    function nearestAngle(from, to) { const d = ((to - from) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI; return from + d; }

    // ---- pointer orbit / pinch zoom ----
    const pts = new Map();
    let lastPinch = 0;
    canvas.addEventListener('pointerdown', e => { document.getElementById('gesture3d').classList.add('gone'); canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); idleSince = performance.now(); });
    canvas.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId);
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 1) {
        view.tTheta -= dx * 0.008; view.tPhi = Math.min(1.5, Math.max(0.02, view.tPhi - dy * 0.006));
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinch) view.tDist = Math.min(600, Math.max(140, view.tDist * lastPinch / d));
        lastPinch = d;
      }
      idleSince = performance.now(); needs = true;
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) lastPinch = 0; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      view.tDist = Math.min(600, Math.max(140, view.tDist * (1 + Math.sign(e.deltaY) * 0.08)));
      idleSince = performance.now(); needs = true;
    }, { passive: false });

    // ---- loop ----
    let visible = true;
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(tick); }).observe(stage);
    const ro = new ResizeObserver(() => { needs = true; resize(); });
    ro.observe(stage);
    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      view.fit = w / h < 0.9 ? 1.35 : 1;  // pull back on tall phone screens
    }
    resize();

    let last = performance.now();
    function tick(now) {
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (auto && pts.size === 0 && now - idleSince > 2500) { view.tTheta += dt * 0.35; needs = true; }
      const e = 1 - Math.pow(0.0015, dt);
      const moving = Math.abs(view.tTheta - view.theta) + Math.abs(view.tPhi - view.phi) + Math.abs(view.tDist - view.dist) > 1e-4;
      view.theta += (view.tTheta - view.theta) * e;
      view.phi += (view.tPhi - view.phi) * e;
      view.dist += (view.tDist - view.dist) * e;
      if (moving || needs) {
        const d = view.dist * (view.fit || 1);
        camera.position.set(Math.sin(view.theta) * Math.sin(view.phi) * d, Math.cos(view.phi) * d, Math.cos(view.theta) * Math.sin(view.phi) * d);
        camera.lookAt(0, 0, 0);
        render();
        needs = false;
      }
      requestAnimationFrame(tick);
    }
    function render() { renderer.render(scene, camera); }

    setLights(); syncKnobs();
    msg.textContent = ''; msg.style.display = 'none';
    document.getElementById('gesture3d').classList.add('show');
    requestAnimationFrame(tick);
  }
})();
