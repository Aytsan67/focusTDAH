/* brain-intro-immersive.js — voyage éducatif plein écran dans le cerveau TDAH */
const BrainIntroImmersive = (() => {
  const IS_MOBILE = /iPhone|iPad|Android/i.test(navigator.userAgent);
  const N_NEURONS  = IS_MOBILE ? 900  : 2000;
  const N_SYNAPSES = IS_MOBILE ? 220  : 500;
  const N_DOPA     = IS_MOBILE ? 60   : 120;

  const STEPS = [
    {
      label: null,
      title: 'Bienvenue dans<br>ton cerveau.',
      text: '',
      camPos: [0, 8, 130],
      camLook: [0, 0, 0],
      color: [0.2, 0.45, 1.0],
      energy: 0.28,
      btn: 'Commencer le voyage →',
      dopamine: false,
    },
    {
      label: 'LES NEURONES',
      title: 'Ton cerveau contient<br>86 milliards de neurones.',
      text: 'Ils communiquent entre eux via des <span class="bi-hl">signaux électriques</span>.',
      camPos: [12, 18, 72],
      camLook: [0, 0, 0],
      color: [0.0, 0.96, 1.0],
      energy: 0.55,
      btn: 'Continuer →',
      dopamine: false,
    },
    {
      label: 'LA DOPAMINE',
      title: 'La dopamine, c\'est<br>le carburant.',
      text: 'Elle te donne envie de <span class="bi-hl">démarrer</span>, de continuer, de ressentir la récompense.',
      camPos: [-10, 5, 44],
      camLook: [0, 4, 0],
      color: [1.0, 0.85, 0.0],
      energy: 0.75,
      btn: 'Continuer →',
      dopamine: true,
    },
    {
      label: 'LE TDAH',
      title: 'Dans le TDAH,<br>ce système fonctionne différemment.',
      text: 'Les signaux sont <span class="bi-hl">irréguliers</span>. Le cerveau cherche plus de stimulation.<br>Ce n\'est pas un manque de volonté.',
      camPos: [20, -8, 58],
      camLook: [0, 0, 0],
      color: [1.0, 0.38, 0.22],
      energy: 0.38,
      btn: 'Continuer →',
      dopamine: false,
    },
    {
      label: 'CORTEX PRÉFRONTAL',
      title: 'Ton chef d\'orchestre<br>reçoit moins de signaux.',
      text: 'Il gère la <span class="bi-hl">planification</span>, la mémoire de travail, le démarrage des tâches.',
      camPos: [0, 28, 36],
      camLook: [0, 8, 0],
      color: [0.22, 0.6, 1.0],
      energy: 0.62,
      btn: 'Continuer →',
      dopamine: false,
      highlightTop: true,
    },
    {
      label: 'L\'HYPERFOCUS',
      title: 'Mais ton cerveau<br>peut s\'emballer.',
      text: 'Quand quelque chose est <span class="bi-hl">suffisamment stimulant</span>, toutes les connexions s\'activent à la fois.',
      camPos: [-5, 2, 28],
      camLook: [0, 0, 0],
      color: [0.69, 0.36, 1.0],
      energy: 1.0,
      btn: 'Continuer →',
      dopamine: true,
    },
    {
      label: 'LA SOLUTION',
      title: 'Les grosses tâches bloquent.<br>Les petites réactivent.',
      text: 'Découper relance les <span class="bi-hl">circuits dopaminergiques</span>. C\'est la base de FocusTDAH.',
      camPos: [8, -5, 52],
      camLook: [0, 0, 0],
      color: [0.0, 1.0, 0.52],
      energy: 0.7,
      btn: 'Continuer →',
      dopamine: false,
    },
    {
      label: null,
      title: 'Maintenant, travaillons<br>avec ton cerveau.',
      text: 'Pas contre lui.',
      camPos: [0, 5, 112],
      camLook: [0, 0, 0],
      color: [0.49, 0.36, 1.0],
      energy: 0.9,
      btn: 'Entrer dans mon cerveau →',
      dopamine: false,
      last: true,
    },
  ];

  let _renderer, _scene, _camera, _raf;
  let _particles, _synapses, _dopaPoints;
  let _neuronPositions; // Float32Array raw
  let _wrapper, _textEl, _btnEl, _skipEl, _progressEl;
  let _currentStep = 0;
  let _camCurrent = new THREE.Vector3(0, 8, 130);
  let _camTargetV = new THREE.Vector3(0, 8, 130);
  let _lookCurrent = new THREE.Vector3(0, 0, 0);
  let _lookTarget  = new THREE.Vector3(0, 0, 0);
  let _colorCurrent = new THREE.Color(0.2, 0.45, 1.0);
  let _colorTarget  = new THREE.Color(0.2, 0.45, 1.0);
  let _dopaT = 0;
  let _dopaActive = false;
  let _onDone;
  let _stepTransitioning = false;
  let _clock;

  /* ── Sprite texture for glowing particles ── */
  function _makeSpriteTex() {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32,32,0,32,32,32);
    g.addColorStop(0,   'rgba(255,255,255,1)');
    g.addColorStop(0.35,'rgba(255,255,255,0.65)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.12)');
    g.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,64,64);
    return new THREE.CanvasTexture(c);
  }

  /* ── Build neuron cloud shaped like a brain ── */
  function _buildNeurons() {
    const pos = new Float32Array(N_NEURONS * 3);
    for (let i = 0; i < N_NEURONS; i++) {
      let x, y, z;
      // rejection sampling: fill a brain-like shape (stretched ellipsoid + sulci noise)
      do {
        x = (Math.random() - 0.5) * 56;
        y = (Math.random() - 0.5) * 40;
        z = (Math.random() - 0.5) * 46;
        // tilt — brains lean forward
        const ty = y * 0.9 + z * 0.3;
        const tz = z * 0.9 - y * 0.3;
        y = ty; z = tz;
      } while (
        (x/28)**2 + ((y-4)/22)**2 + (z/24)**2 > 1 + 0.18 * Math.sin(x * 0.4) * Math.cos(z * 0.3)
      );
      pos[i*3]   = x;
      pos[i*3+1] = y + 2; // center of mass slightly up
      pos[i*3+2] = z;
    }
    _neuronPositions = pos;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(), 3));

    const mat = new THREE.PointsMaterial({
      size: IS_MOBILE ? 1.4 : 1.1,
      map: _makeSpriteTex(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      color: new THREE.Color(0.2, 0.45, 1.0),
    });

    _particles = new THREE.Points(geo, mat);
    _scene.add(_particles);
  }

  /* ── Synapse connections ── */
  function _buildSynapses() {
    const linePts = [];
    const p = _neuronPositions;
    const n = p.length / 3;

    // For each synapse, pick two neurons within distance threshold
    let attempts = 0;
    while (linePts.length / 6 < N_SYNAPSES && attempts < N_SYNAPSES * 30) {
      attempts++;
      const a = Math.floor(Math.random() * n);
      const b = Math.floor(Math.random() * n);
      const dx = p[a*3]-p[b*3], dy = p[a*3+1]-p[b*3+1], dz = p[a*3+2]-p[b*3+2];
      if (dx*dx+dy*dy+dz*dz < 24*24) {
        linePts.push(p[a*3],p[a*3+1],p[a*3+2], p[b*3],p[b*3+1],p[b*3+2]);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(linePts, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0x003355,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.35,
    });
    _synapses = new THREE.LineSegments(geo, mat);
    _scene.add(_synapses);
  }

  /* ── Dopamine flowing particles ── */
  function _buildDopamine() {
    const pos = new Float32Array(N_DOPA * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: IS_MOBILE ? 2.2 : 1.8,
      map: _makeSpriteTex(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      color: new THREE.Color(1.0, 0.85, 0.0),
    });
    _dopaPoints = new THREE.Points(geo, mat);
    _dopaPoints.visible = false;
    _scene.add(_dopaPoints);
  }

  /* ── HTML overlay ── */
  function _buildOverlay() {
    _wrapper = document.createElement('div');
    Object.assign(_wrapper.style, {
      position: 'fixed', inset: '0', zIndex: '8999',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      pointerEvents: 'none',
    });

    // Gradient vignette bottom
    const grad = document.createElement('div');
    Object.assign(grad.style, {
      position: 'absolute', bottom: '0', left: '0', right: '0',
      height: '65%',
      background: 'linear-gradient(to top, rgba(0,0,8,0.96) 0%, rgba(0,0,8,0.72) 40%, transparent 100%)',
    });
    _wrapper.appendChild(grad);

    // Progress dots
    _progressEl = document.createElement('div');
    Object.assign(_progressEl.style, {
      position: 'absolute', top: 'max(env(safe-area-inset-top,0px), 18px)',
      left: '50%', transform: 'translateX(-50%)',
      display: 'flex', gap: '6px',
    });
    _wrapper.appendChild(_progressEl);

    // Content box
    const content = document.createElement('div');
    Object.assign(content.style, {
      position: 'relative',
      padding: '0 28px calc(env(safe-area-inset-bottom,0px) + 36px)',
      display: 'flex', flexDirection: 'column', gap: '10px',
      pointerEvents: 'auto',
    });

    _textEl = document.createElement('div');
    _textEl.className = 'bi-text-block';
    content.appendChild(_textEl);

    _btnEl = document.createElement('button');
    _btnEl.className = 'bi-btn';
    _btnEl.onclick = () => { if (!_stepTransitioning) _advance(); };
    content.appendChild(_btnEl);

    _skipEl = document.createElement('button');
    _skipEl.className = 'bi-skip';
    _skipEl.textContent = 'Passer l\'intro';
    _skipEl.onclick = () => _finish();
    content.appendChild(_skipEl);

    _wrapper.appendChild(content);
    document.body.appendChild(_wrapper);
  }

  function _injectCSS() {
    const s = document.createElement('style');
    s.textContent = `
    #bi-canvas { position:fixed;inset:0;width:100%;height:100%;z-index:8998;display:block; }
    .bi-label  { font:700 10px 'Share Tech Mono',monospace;letter-spacing:3px;color:rgba(0,245,255,.55);
                 text-transform:uppercase;margin-bottom:6px;min-height:15px;
                 transition:opacity .5s ease; }
    .bi-title  { font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(22px,5.5vw,30px);
                 color:#fff;line-height:1.2;margin-bottom:8px;transition:opacity .5s ease; }
    .bi-body   { font-size:clamp(14px,3.8vw,17px);color:rgba(255,255,255,.62);
                 line-height:1.65;transition:opacity .5s ease; }
    .bi-hl     { color:rgba(0,245,255,.92);font-style:normal; }
    .bi-btn    { margin-top:14px;width:100%;padding:17px;border-radius:14px;cursor:pointer;
                 background:rgba(0,245,255,.1);border:1.5px solid rgba(0,245,255,.4);
                 color:#00f5ff;font:700 15px 'DM Sans',sans-serif;letter-spacing:.5px;
                 transition:background .15s,transform .1s,opacity .5s ease;
                 -webkit-tap-highlight-color:transparent; }
    .bi-btn:active { background:rgba(0,245,255,.22);transform:scale(.98); }
    .bi-skip   { background:none;border:none;color:rgba(255,255,255,.25);
                 font:500 12px 'DM Sans',sans-serif;cursor:pointer;padding:6px 0;
                 text-align:center;width:100%;-webkit-tap-highlight-color:transparent;
                 transition:opacity .4s; }
    .bi-prog-dot { width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.2);
                   transition:background .4s; }
    .bi-prog-dot.active { background:#00f5ff; }
    .bi-prog-dot.done   { background:rgba(0,245,255,.4); }
    @keyframes bi-fade-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
    .bi-anim { animation:bi-fade-in .55s ease both; }
    `;
    document.head.appendChild(s);
  }

  function _renderTextStep(step, animate) {
    const s = STEPS[step];
    const cl = animate ? ' bi-anim' : '';

    _textEl.innerHTML = `
      <div class="bi-label${cl}" style="animation-delay:.05s">${s.label || ''}</div>
      <div class="bi-title${cl}" style="animation-delay:.12s">${s.title}</div>
      <div class="bi-body${cl}"  style="animation-delay:.2s">${s.text}</div>
    `;
    _btnEl.textContent = s.btn;
    _btnEl.className = 'bi-btn' + (animate ? ' bi-anim' : '');
    _btnEl.style.animationDelay = '.32s';

    _skipEl.style.opacity = step === 0 ? '0' : '1';
    _skipEl.style.pointerEvents = step === 0 ? 'none' : 'auto';

    // Progress
    _progressEl.innerHTML = STEPS.map((_, i) =>
      `<div class="bi-prog-dot${i < step ? ' done' : i === step ? ' active' : ''}"></div>`
    ).join('');
  }

  function _setStepVisuals(step) {
    const s = STEPS[step];
    _camTargetV.set(...s.camPos);
    _lookTarget.set(...s.camLook);
    _colorTarget.setRGB(...s.color);
    _dopaActive = s.dopamine;
    if (_dopaPoints) _dopaPoints.visible = s.dopamine;

    // synapse brightness
    if (_synapses) {
      const e = s.energy;
      _synapses.material.opacity = 0.12 + e * 0.5;
      _synapses.material.color.setRGB(
        s.color[0] * 0.25, s.color[1] * 0.25, s.color[2] * 0.25
      );
    }
  }

  function _advance() {
    if (_stepTransitioning) return;
    _stepTransitioning = true;
    // Fade text out
    _textEl.style.opacity = '0';
    _btnEl.style.opacity  = '0';
    setTimeout(() => {
      _currentStep++;
      if (_currentStep >= STEPS.length) { _finish(); return; }
      _setStepVisuals(_currentStep);
      _renderTextStep(_currentStep, true);
      _textEl.style.opacity = '';
      _btnEl.style.opacity  = '';
      setTimeout(() => { _stepTransitioning = false; }, 600);
    }, 380);
  }

  function _finish() {
    cancelAnimationFrame(_raf);
    // Fade out canvas + overlay
    const cvs = document.getElementById('bi-canvas');
    if (cvs) { cvs.style.transition='opacity .8s ease'; cvs.style.opacity='0'; }
    if (_wrapper) { _wrapper.style.transition='opacity .8s ease'; _wrapper.style.opacity='0'; }
    setTimeout(() => {
      if (cvs) cvs.remove();
      if (_wrapper) _wrapper.remove();
      if (_renderer) _renderer.dispose();
      if (_onDone) _onDone();
    }, 820);
  }

  /* ── Animate dopamine particles flowing through synapses ── */
  function _animateDopamine(dt) {
    if (!_dopaActive || !_dopaPoints) return;
    _dopaT += dt * 0.55;
    const pos = _dopaPoints.geometry.attributes.position.array;
    const p = _neuronPositions;
    const n = p.length / 3;
    const step = STEPS[_currentStep];
    const col = new THREE.Color(...step.color);
    _dopaPoints.material.color.copy(col);

    for (let i = 0; i < N_DOPA; i++) {
      const t = ((_dopaT + i * 0.12) % 1.0);
      // Travel along a random arc between two neurons
      const a = Math.floor((i * 7 + 3) % n);
      const b = Math.floor((i * 13 + 17) % n);
      const ax = p[a*3], ay = p[a*3+1], az = p[a*3+2];
      const bx = p[b*3], by = p[b*3+1], bz = p[b*3+2];
      // Quadratic bezier with midpoint offset
      const mx = (ax+bx)/2 + (Math.sin(i*2.3)*5);
      const my = (ay+by)/2 + (Math.cos(i*1.7)*5);
      const mz = (az+bz)/2 + (Math.sin(i*3.1)*5);
      const u = 1-t;
      pos[i*3]   = u*u*ax + 2*u*t*mx + t*t*bx;
      pos[i*3+1] = u*u*ay + 2*u*t*my + t*t*by;
      pos[i*3+2] = u*u*az + 2*u*t*mz + t*t*bz;
    }
    _dopaPoints.geometry.attributes.position.needsUpdate = true;
  }

  /* ── Neurons subtle breathing ── */
  function _breatheNeurons(elapsed) {
    if (!_particles) return;
    const pulse = 0.9 + 0.1 * Math.sin(elapsed * 0.8);
    _particles.material.size = (IS_MOBILE ? 1.4 : 1.1) * pulse;
    _particles.material.color.lerpColors(_colorCurrent, _colorTarget, 0.04);
    _colorCurrent.copy(_particles.material.color);
  }

  /* ── Main render loop ── */
  function _loop() {
    _raf = requestAnimationFrame(_loop);
    const elapsed = _clock.getElapsedTime();
    const dt = _clock.getDelta ? 0.016 : 0.016;

    // Camera smooth lerp
    _camCurrent.lerp(_camTargetV, 0.022);
    _lookCurrent.lerp(_lookTarget, 0.022);
    _camera.position.copy(_camCurrent);
    _camera.lookAt(_lookCurrent);

    // Particle rotation (slow, immersive)
    if (_particles) _particles.rotation.y = elapsed * 0.04;
    if (_synapses)  _synapses.rotation.y  = elapsed * 0.04;
    if (_dopaPoints) _dopaPoints.rotation.y = elapsed * 0.04;

    _breatheNeurons(elapsed);
    _animateDopamine(0.016);

    _renderer.render(_scene, _camera);
  }

  /* ── Public init ── */
  function start(onDone) {
    _onDone = onDone;

    // Inject styles
    _injectCSS();

    // Renderer on its own canvas
    const cvs = document.createElement('canvas');
    cvs.id = 'bi-canvas';
    document.body.appendChild(cvs);

    _renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: !IS_MOBILE, alpha: false });
    _renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
    _renderer.setSize(window.innerWidth, window.innerHeight);
    _renderer.setClearColor(0x000008, 1);

    _scene  = new THREE.Scene();
    _camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 1000);
    _camera.position.set(0, 8, 130);
    _clock  = new THREE.Clock();

    // Minimal ambient fill
    _scene.add(new THREE.AmbientLight(0xffffff, 0.06));

    _buildNeurons();
    _buildSynapses();
    _buildDopamine();
    _buildOverlay();

    _renderTextStep(0, false);
    _setStepVisuals(0);

    window.addEventListener('resize', () => {
      _renderer.setSize(window.innerWidth, window.innerHeight);
      _camera.aspect = window.innerWidth / window.innerHeight;
      _camera.updateProjectionMatrix();
    });

    _loop();
  }

  return { start };
})();
