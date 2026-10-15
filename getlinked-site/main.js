import * as THREE from 'three';

// Colors shared with styles.css. Leads are cobalt, payouts are gold.
const COLOR = {
  paper: 0xe4e8e6,
  porcelain: 0xf7f8f6,
  cable: 0xc4ccc9,
  cobalt: 0x2b44ff,
  gold: 0xffb800,
  resold: 0x8f9bff,
  blocked: 0x7f8a87,
  ink: 0x10223a,
  off: 0xb3bcb9,
};

const root = document.documentElement;
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = reduceQuery.matches;
reduceQuery.addEventListener('change', (e) => { reduceMotion = e.matches; });

setupHeader();
setupTabs();
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('scene'), antialias: true, powerPreference: 'high-performance' });
} catch {
  root.classList.add('no-webgl');
}
if (renderer) startScene(renderer);

function setupHeader() {
  const header = document.querySelector('.site-header');
  const update = () => header.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', update, { passive: true });
  update();
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const select = (tab, focus) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    }
    if (focus) tab.focus();
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab, false));
    tab.addEventListener('keydown', (e) => {
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(tabs[(next + tabs.length) % tabs.length], true);
    });
  });
}

// Small seeded random so the layout is the same on every visit.
function seeded(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function startScene(renderer) {
  const rand = seeded(11);
  const small = innerWidth < 900;
  const deg = THREE.MathUtils.degToRad;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLOR.paper);
  scene.fog = new THREE.Fog(COLOR.paper, 24, 50);

  const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 120);

  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(new THREE.HemisphereLight(0xffffff, 0xaeb9b5, 1.7));
  const sun = new THREE.DirectionalLight(0xffffff, 2.3);
  sun.position.set(-7, 15, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 45 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);

  // The floor only shows shadows, so the model sits on the page color itself.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.ShadowMaterial({ color: COLOR.ink, opacity: 0.11 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Everything that moves lives in one group. On portrait screens it turns 90° so the flow runs up the screen.
  const world = new THREE.Group();
  scene.add(world);

  const porcelain = new THREE.MeshStandardMaterial({ color: COLOR.porcelain, roughness: 0.8 });
  const cableMat = new THREE.MeshStandardMaterial({ color: COLOR.cable, roughness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({
    color: COLOR.porcelain, roughness: 0.3, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false,
  });
  const cobaltFlat = new THREE.MeshBasicMaterial({ color: COLOR.cobalt });
  const cLead = new THREE.Color(COLOR.cobalt);
  const cPay = new THREE.Color(COLOR.gold);
  const cResold = new THREE.Color(COLOR.resold);
  const cBlocked = new THREE.Color(COLOR.blocked);
  const cInk = new THREE.Color(COLOR.ink);
  const cOff = new THREE.Color(COLOR.off);

  const solidMesh = (geometry, material) => {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const curveLength = new Map();
  const addCable = (curve) => {
    curveLength.set(curve, curve.getLength());
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.026, 6, false), cableMat);
    tube.castShadow = true;
    world.add(tube);
    return curve;
  };

  // ---------- The hub (Getlinked) ----------
  const HUB_R = 1.75;
  const hub = new THREE.Group();
  const hubBase = solidMesh(new THREE.CylinderGeometry(HUB_R, HUB_R + 0.1, 0.5, 80), porcelain);
  hubBase.position.y = 0.25;
  const hubRing = new THREE.Mesh(new THREE.TorusGeometry(HUB_R - 0.3, 0.035, 8, 140), cobaltFlat);
  hubRing.rotation.x = -Math.PI / 2;
  hubRing.position.y = 0.505;
  const column = solidMesh(new THREE.CylinderGeometry(0.42, 0.46, 0.75, 56), porcelain);
  column.position.y = 0.875;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 48), cobaltFlat);
  crown.position.y = 1.275;
  const arm = new THREE.Group();
  arm.position.y = 1.02;
  const beam = solidMesh(new THREE.BoxGeometry(1.2, 0.13, 0.24), porcelain);
  beam.position.x = 0.85;
  const armTip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), cobaltFlat);
  armTip.position.x = 1.5;
  arm.add(beam, armTip);
  hub.add(hubBase, hubRing, column, crown, arm);
  world.add(hub);

  const port = (dir, y) => dir.clone().multiplyScalar(HUB_R + 0.03).setY(y);

  // ---------- Affiliates (traffic sources) ----------
  const SOURCE_COUNT = small ? 12 : 18;
  const sources = [];
  for (let i = 0; i < SOURCE_COUNT; i++) {
    const f = i / (SOURCE_COUNT - 1);
    const a = deg(138 + f * 84);
    const r = i % 2 ? 7.8 : 6.3;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 0.42 + rand() * 0.55;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const body = solidMesh(new THREE.CylinderGeometry(0.3, 0.33, h, 40), porcelain);
    body.position.y = h / 2;
    const ledMat = new THREE.MeshBasicMaterial({ color: COLOR.cobalt });
    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.035, 40), ledMat);
    led.position.y = h + 0.018;
    group.add(body, led);
    world.add(group);

    const dir = new THREE.Vector3(x, 0, z).normalize();
    const start = new THREE.Vector3(x, 0, z).addScaledVector(dir, -0.34).setY(Math.min(h - 0.08, 0.32));
    const end = port(dir, 0.34);
    const mid = start.clone().lerp(end, 0.5).setY(0.95);
    const curve = addCable(new THREE.QuadraticBezierCurve3(start, mid, end));

    sources.push({ led, ledMat, curve, rate: 0.11 + rand() * 0.16, next: rand() * 4, flash: 0, bump: 0 });
  }

  // ---------- Advertisers (buyers). Tower height is the daily cap. ----------
  const capScale = SOURCE_COUNT / 18;
  const ADVERTISER_CAPS = [10, 18, 12, 24, 14].map((c) => Math.max(4, Math.round(c * capScale)));
  const PLINTH = 0.22;
  const advertisers = ADVERTISER_CAPS.map((cap, j) => {
    const a = deg(-36 + j * 18);
    const r = j % 2 ? 6.7 : 6.0;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = 1.5 + (cap / capScale) * 0.095;

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const plinth = solidMesh(new THREE.CylinderGeometry(0.74, 0.8, PLINTH, 56), porcelain);
    plinth.position.y = PLINTH / 2;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, h, 56, 1, true), glass);
    shell.position.y = PLINTH + h / 2;
    shell.renderOrder = 2;
    const fillGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 48);
    fillGeo.translate(0, 0.5, 0);
    const fillMat = new THREE.MeshStandardMaterial({ color: COLOR.cobalt, roughness: 0.45 });
    const fill = solidMesh(fillGeo, fillMat);
    fill.position.y = PLINTH;
    fill.scale.y = 0.0001;
    const rimMat = new THREE.MeshBasicMaterial({ color: COLOR.cobalt });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.045, 10, 72), rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = PLINTH + h;
    group.add(plinth, fill, shell, rim);
    world.add(group);

    const dir = new THREE.Vector3(x, 0, z).normalize();
    const start = port(dir, 0.36);
    const end = new THREE.Vector3(x, PLINTH + h + 0.2, z);
    const mid = start.clone().lerp(end, 0.5).setY(PLINTH + h + 1.5);
    const curve = addCable(new THREE.QuadraticBezierCurve3(start, mid, end));

    return {
      cap, h, fill, fillMat, rim, rimMat, curve,
      angle: Math.atan2(-dir.z, dir.x),
      top: new THREE.Vector3(x, PLINTH + h + 0.55, z),
      level: 0, shown: 0, full: false, draining: false, fullMix: 0, pulse: 0,
    };
  });
  const tallest = Math.max(...advertisers.map((a) => a.h));

  // ---------- Leads and payouts ----------
  const MAX_DOTS = 420;
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 18, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_DOTS);
  dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  dots.castShadow = true;
  dots.frustumCulled = false;
  for (let i = 0; i < MAX_DOTS; i++) dots.setColorAt(i, cLead);
  dots.count = 0;
  world.add(dots);

  const LEAD = 0; // a lead coming in, going out to a buyer, or heading back to be redistributed
  const PAYOUT = 1; // a deposit reported back, paying the affiliate who sent the lead
  const BLOCKED = 2; // a duplicate or fraudulent lead stopped at the hub
  const DAY = 22; // seconds of simulation per "day" of caps
  const particles = [];
  let dayClock = 0;
  let rotation = -1;
  let armAngle = advertisers[2].angle;
  let armTarget = armAngle;

  // Weights per camera shot, filled in by the scroll rig. Used to tune the simulation and labels.
  const weight = { hero: 1, click: 0, route: 0, resell: 0, convert: 0, pay: 0, overview: 0, cta: 0 };

  // Next buyer in rotation that has room under its cap and hasn't already had this lead.
  const nextAdvertiser = (tried) => {
    for (let k = 1; k <= advertisers.length; k++) {
      const j = (rotation + k) % advertisers.length;
      const a = advertisers[j];
      if (!a.full && !a.draining && !tried.includes(j)) { rotation = j; return j; }
    }
    return -1;
  };

  const spawnLead = (s) => {
    if (particles.length >= MAX_DOTS) return;
    particles.push({
      kind: LEAD, phase: 'in', src: s, adv: -1, tried: [], resold: false,
      legs: [[sources[s].curve, false]], leg: 0, t: 0, wait: 0, speed: 3.3,
    });
    sources[s].bump = 1;
  };

  const sendToBuyer = (p) => {
    const j = nextAdvertiser(p.tried);
    if (j < 0) return false; // every buyer that could take it is capped for today
    p.adv = j;
    p.tried.push(j);
    p.phase = 'out';
    p.legs = [[advertisers[j].curve, false]];
    p.leg = 0;
    p.t = 0;
    p.wait = 0.14;
    p.speed = 4.4;
    armTarget = advertisers[j].angle;
    return true;
  };

  // Returns false when the particle is done and should be removed.
  const finishLeg = (p) => {
    if (p.kind === LEAD && p.phase === 'in') {
      if (Math.random() < 0.07 + 0.2 * weight.click) {
        p.kind = BLOCKED;
        p.fade = 1;
        return true;
      }
      return sendToBuyer(p);
    }
    if (p.kind === LEAD && p.phase === 'back') return sendToBuyer(p);
    if (p.kind === LEAD) {
      const a = advertisers[p.adv];
      a.level = Math.min(a.cap, a.level + 1);
      a.pulse = 1;
      if (a.level >= a.cap) a.full = true;
      if (Math.random() < 0.32 + 0.45 * weight.pay) {
        if (particles.length < MAX_DOTS) {
          particles.push({
            kind: PAYOUT, src: p.src,
            legs: [[a.curve, true], [sources[p.src].curve, true]],
            leg: 0, t: 0, wait: 0.5 + Math.random() * 0.9, speed: 4.8,
          });
        }
        return false;
      }
      // No deposit: send the lead back through the hub to a buyer that hasn't seen it.
      if (p.tried.length < 3 && Math.random() < 0.45 + 0.45 * weight.resell) {
        p.phase = 'back';
        p.resold = true;
        p.legs = [[a.curve, true]];
        p.leg = 0;
        p.t = 0;
        p.wait = 0.7 + Math.random() * 0.8;
        p.speed = 4.4;
        return true;
      }
      return false;
    }
    p.leg += 1;
    if (p.leg < p.legs.length) {
      p.t = 0;
      p.wait = 0.16;
      return true;
    }
    sources[p.src].flash = 1;
    return false;
  };

  const simulate = (dt) => {
    dayClock += dt;
    if (dayClock > DAY) {
      dayClock = 0;
      for (const a of advertisers) {
        a.level = 0;
        a.full = false;
        a.draining = true;
      }
    }

    const boost = 1 + 0.7 * weight.click;
    sources.forEach((s, i) => {
      s.next -= dt * boost;
      if (s.next <= 0) {
        spawnLead(i);
        s.next = -Math.log(1 - Math.random()) / s.rate;
      }
    });

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      if (p.kind === BLOCKED) {
        p.fade -= dt * 1.2;
        if (p.fade <= 0) particles.splice(i, 1);
        continue;
      }
      if (p.wait > 0) { p.wait -= dt; continue; }
      const curve = p.legs[p.leg][0];
      p.t += (p.speed * dt) / curveLength.get(curve);
      if (p.t >= 1 && !finishLeg(p)) particles.splice(i, 1);
    }
  };

  const tmpPos = new THREE.Vector3();
  const tmpMat = new THREE.Matrix4();
  const tmpScale = new THREE.Vector3();
  const noRotation = new THREE.Quaternion();

  const updateModel = (dt) => {
    for (const s of sources) {
      s.flash = Math.max(0, s.flash - dt * 1.3);
      s.bump = Math.max(0, s.bump - dt * 3);
      // Switch rather than blend: halfway between cobalt and gold is a muddy purple.
      s.ledMat.color.copy(s.flash > 0.12 ? cPay : cLead);
      const k = 1 + s.bump * 0.3 + s.flash * 0.3;
      s.led.scale.set(k, 1, k);
    }

    for (const a of advertisers) {
      const goal = a.level / a.cap;
      if (a.draining) {
        a.shown = Math.max(goal, a.shown - dt * 0.9);
        if (a.shown <= goal + 0.001) a.draining = false;
      } else {
        a.shown += (goal - a.shown) * (1 - Math.exp(-dt * 7));
      }
      a.fill.scale.y = Math.max(0.0001, a.shown * (a.h - 0.06));
      a.fullMix += ((a.full ? 1 : 0) - a.fullMix) * (1 - Math.exp(-dt * 5));
      a.fillMat.color.copy(cLead).lerp(cInk, a.fullMix * 0.85);
      a.rimMat.color.copy(cLead).lerp(cOff, a.fullMix);
      a.pulse = Math.max(0, a.pulse - dt * 3.5);
      const k = 1 + a.pulse * 0.1;
      a.rim.scale.set(k, k, 1);
    }

    let delta = armTarget - armAngle;
    delta = Math.atan2(Math.sin(delta), Math.cos(delta));
    armAngle += delta * (1 - Math.exp(-dt * 12));
    arm.rotation.y = armAngle;

    let n = 0;
    for (const p of particles) {
      if (p.wait > 0 && p.kind !== BLOCKED) continue;
      const [curve, reverse] = p.legs[p.leg];
      const t = Math.min(1, p.t);
      curve.getPointAt(reverse ? 1 - t : t, tmpPos);
      let color = p.resold ? cResold : cLead;
      let size = 1;
      if (p.kind === PAYOUT) {
        color = cPay;
        size = 1.15;
      } else if (p.kind === BLOCKED) {
        color = cBlocked;
        size = Math.max(0.001, p.fade) * 1.35;
        tmpPos.y -= (1 - p.fade) * 0.3;
      }
      tmpMat.compose(tmpPos, noRotation, tmpScale.setScalar(size));
      dots.setMatrixAt(n, tmpMat);
      dots.setColorAt(n, color);
      n++;
    }
    dots.count = n;
    dots.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
  };

  // ---------- Camera shots, driven by scroll ----------
  // [camera position, look-at point] per shot. Narrow shots are for the turned model:
  // affiliates at the front (bottom of the screen), advertisers at the back (top).
  const SHOTS = {
    wide: {
      hero: [[1.8, 12.5, 21], [0.6, 0.5, 0.6]],
      click: [[-11, 6.5, 11.5], [-3.2, 0.5, 0.3]],
      route: [[3.2, 20.5, 12.5], [3.5, 0.9, 0.3]],
      resell: [[11.5, 13.5, 15.5], [4.2, 1.4, 0]],
      convert: [[12, 7, 14], [5.6, 1.7, 0]],
      pay: [[-0.6, 22, 10], [-0.3, 0, 0.3]],
      overview: [[-0.6, 22, 10], [-0.3, 0, 0.3]],
      cta: [[14.5, 11, 19.5], [1, 0.8, 0]],
    },
    narrow: {
      hero: [[0, 20, 31], [0, 1, -1.4]],
      click: [[0, 10, 23.5], [0, 0.6, 5.6]],
      route: [[0, 28.5, 8], [0, 0.8, -3.4]],
      resell: [[0, 21, 14], [0, 1.2, -3.2]],
      convert: [[2, 10, 21], [0, 1.8, -5.4]],
      pay: [[0, 24, 17], [0, 0, 6.5]],
      overview: [[0, 24, 17], [0, 0, 6.5]],
      cta: [[8, 18, 26], [0, 0.8, 0]],
    },
  };
  const shotEls = [...document.querySelectorAll('[data-shot]')];
  let marks = [];

  const measure = () => {
    const wide = innerWidth >= 900;
    const set = wide ? SHOTS.wide : SHOTS.narrow;
    // Wide shots are framed for a 16:10 window. Back the camera off on narrower or squarer ones.
    const zoom = wide ? THREE.MathUtils.clamp(Math.max(1.6 / (innerWidth / innerHeight), 1 + (1300 - innerWidth) / 1100), 1, 2.1) : 1;
    marks = shotEls.map((el) => {
      const [p, l] = set[el.dataset.shot];
      const look = new THREE.Vector3(...l);
      const pos = new THREE.Vector3(...p).sub(look).multiplyScalar(zoom).add(look);
      const rect = el.getBoundingClientRect();
      return { name: el.dataset.shot, pos, look, center: rect.top + scrollY + rect.height / 2 };
    });
  };

  const goalPos = new THREE.Vector3();
  const goalLook = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();

  const aimFromScroll = () => {
    const y = scrollY + innerHeight / 2;
    let i = 0;
    while (i < marks.length - 1 && y > marks[i + 1].center) i++;
    const a = marks[i];
    const b = marks[Math.min(i + 1, marks.length - 1)];
    let t = a === b ? 0 : THREE.MathUtils.clamp((y - a.center) / (b.center - a.center), 0, 1);
    t = t * t * (3 - 2 * t);
    goalPos.lerpVectors(a.pos, b.pos, t);
    goalLook.lerpVectors(a.look, b.look, t);
    for (const k in weight) weight[k] = 0;
    weight[a.name] += 1 - t;
    weight[b.name] += t;
  };

  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  if (matchMedia('(pointer: fine)').matches) {
    addEventListener('pointermove', (e) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }

  const resize = () => {
    const w = innerWidth;
    const h = innerHeight;
    const wide = w >= 900;
    renderer.setSize(w, h, false);
    world.rotation.y = wide ? 0 : Math.PI / 2;
    world.updateMatrixWorld(true);
    camera.fov = wide ? 34 : 42;
    // Shift the model right on wide screens (text sits on the left) and up on phones (text sits low).
    if (wide) camera.setViewOffset(w, h, -w * 0.16, 0, w, h);
    else camera.setViewOffset(w, h, 0, h * 0.17, w, h);
    camera.updateProjectionMatrix();
    measure();
  };
  addEventListener('resize', resize);
  addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  resize();

  // ---------- Labels projected from 3D ----------
  const labelLayer = document.querySelector('.labels');
  // Each label only shows in the shots where it doesn't collide with the copy.
  const tags = [
    { el: labelLayer.querySelector('[data-anchor="sources"]'), at: new THREE.Vector3(-7.1, 1.8, 0), shots: ['click', 'pay'] },
    { el: labelLayer.querySelector('[data-anchor="router"]'), at: new THREE.Vector3(0, 2.05, 0), shots: ['hero', 'click', 'pay', 'overview', 'cta'] },
    { el: labelLayer.querySelector('[data-anchor="buyers"]'), at: new THREE.Vector3(6.4, tallest + 1.2, 0), shots: ['hero', 'pay', 'overview', 'cta'] },
  ];
  const caps = advertisers.map((a) => {
    const el = document.createElement('span');
    el.className = 'cap';
    labelLayer.appendChild(el);
    return { el, a, text: '' };
  });

  const header = document.querySelector('.site-header');
  const lede = document.querySelector('.hero .lede');
  let copyEdge = 0;
  const measureCopy = () => {
    copyEdge = innerWidth >= 900 ? lede.getBoundingClientRect().right + 24 : 0;
  };
  addEventListener('resize', measureCopy);
  measureCopy();
  const projected = new THREE.Vector3();
  const place = (el, at, opacity) => {
    projected.copy(at).applyMatrix4(world.matrixWorld).project(camera);
    const x = (projected.x + 1) * 0.5 * innerWidth;
    const y = (1 - projected.y) * 0.5 * innerHeight;
    // Labels sit above their anchor, so hide any that would run under the header or off screen.
    const halfWidth = el.offsetWidth / 2;
    const clipped = projected.z > 1 || y < header.offsetHeight + 36 || y > innerHeight
      || x - halfWidth < Math.max(8, copyEdge) || x + halfWidth > innerWidth - 8;
    if (opacity < 0.02 || clipped) {
      el.style.opacity = '0';
      return;
    }
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
    el.style.opacity = opacity.toFixed(2);
  };

  const updateLabels = () => {
    const closeUp = weight.route + weight.resell + weight.convert;
    for (const tag of tags) {
      const shown = tag.shots.reduce((sum, name) => sum + weight[name], 0);
      place(tag.el, tag.at, THREE.MathUtils.clamp(shown * 2 - 1, 0, 1));
    }
    const capOpacity = THREE.MathUtils.clamp(closeUp * 1.6 - 0.4, 0, 1);
    for (const c of caps) {
      const text = c.a.full ? 'Cap reached' : `${c.a.level} of ${c.a.cap}`;
      if (text !== c.text) {
        c.el.textContent = text;
        c.el.classList.toggle('is-full', c.a.full);
        c.text = text;
      }
      place(c.el, c.a.top, capOpacity);
    }
  };

  // ---------- Loop ----------
  const solid = document.querySelector('.solid');
  const isCovered = () => {
    const r = solid.getBoundingClientRect();
    return r.top <= 0 && r.bottom >= innerHeight;
  };

  // Start mid-day so the model is already busy on first paint.
  for (let i = 0; i < 240; i++) simulate(1 / 30);
  updateModel(1);
  armAngle = armTarget;

  let intro = reduceMotion ? 1 : 0;
  let first = true;
  let last = performance.now();

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    aimFromScroll();
    if (!reduceMotion) {
      simulate(dt);
      updateModel(dt);
    }

    intro = Math.min(1, intro + dt / 2.6);
    const ease = 1 - Math.pow(1 - intro, 3);
    goalPos.y += (1 - ease) * 9;
    goalPos.z += (1 - ease) * 7;

    if (!reduceMotion) {
      pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 3));
      pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 3));
      goalPos.x += pointer.sx * 0.9;
      goalPos.y -= pointer.sy * 0.5;
    }

    if (first || reduceMotion) {
      camPos.copy(goalPos);
      camLook.copy(goalLook);
    } else {
      const k = 1 - Math.exp(-dt * 3.2);
      camPos.lerp(goalPos, k);
      camLook.lerp(goalLook, k);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    if (!isCovered()) {
      renderer.render(scene, camera);
      updateLabels();
    }

    if (first) {
      first = false;
      requestAnimationFrame(() => root.classList.add('ready'));
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
