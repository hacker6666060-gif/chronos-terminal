import * as THREE from '/vendor/three.module.js';

/* ============================================================
   CHRONOS-TERMINAL — Modularer 3D-Agenten-Builder (1:1 Bild)
   - Glatte abgerundete Geometrien (Capsule / Cylinder / Sphere)
   - Mattschwarzer Anzug mit leuchtenden teamfarbenen Streifen
     (V-Brust, Gürtel, Arm-/Bein-Außenkanten, Stiefel/Handschuhe)
   - 16 individuelle Köpfe: Augen(Iris+Pupille), Brauen, Nase, Mund
   - 16 Frisuren + Accessoires (Brille, Goggles, Beanie, Bart, Afro, Zöpfe)
   - Modular: head / torso / arms / legs als named Groups (für First-Person)
   - Performance: MeshLambertMaterial, low segments, keine Schatten,
     pixelRatio ≤ 1.5, Studio-Licht (Ambient + Key + teamfarbiges Rim)
   ============================================================ */

const canvas = document.getElementById('character-canvas');
const stage = canvas?.parentElement;
const fallback = document.getElementById('character-fallback');

if (canvas && stage) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power'
    });
  } catch (error) {
    fallback?.classList.remove('hidden');
    console.warn('3D-Ansicht konnte nicht initialisiert werden:', error);
  }

  if (renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    camera.position.set(0, 2.4, 10.2);
    camera.lookAt(0, 2.15, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = false;
    renderer.setClearColor(0x000000, 0);

    // Studio-Beleuchtung
    scene.add(new THREE.HemisphereLight(0xf4fbff, 0x1a1f2a, 1.8));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(-2.5, 6, 6);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xcfe6ff, 0.9);
    fillLight.position.set(4, 2, 5);
    scene.add(fillLight);
    let rimLight = new THREE.DirectionalLight(0x55caff, 1.4);
    rimLight.position.set(3, 3, -5);
    scene.add(rimLight);

    const characterRoot = new THREE.Group();
    scene.add(characterRoot);

    let active = false;
    let frameId = 0;
    let dragPointer = null;
    let lastPointerX = 0;
    let lastPointerY = 0;

    /* ---------- Material-Factory ---------- */
    const materialCache = new Map();
    function mat(color, extra = {}) {
      const key = color + JSON.stringify(extra);
      if (!materialCache.has(key)) {
        materialCache.set(key, new THREE.MeshLambertMaterial({ color, ...extra }));
      }
      return materialCache.get(key);
    }
    const SUIT = 0x15191f;
    const SUIT_DARK = 0x0c0f14;
    const TRIM = 0x1f2730;

    /* ---------- Mesh-Helfer ---------- */
    function addMesh(parent, geometry, material, position, scale, rotation) {
      const mesh = new THREE.Mesh(geometry, material);
      if (position) mesh.position.set(...position);
      if (scale) mesh.scale.set(...scale);
      if (rotation) mesh.rotation.set(...rotation);
      parent.add(mesh);
      return mesh;
    }
    function cap(parent, radius, length, material, position, rotation = [0, 0, 0], seg = 8) {
      return addMesh(parent, new THREE.CapsuleGeometry(radius, length, 3, seg), material, position, null, rotation);
    }
    function cyl(parent, radiusTop, radiusBot, length, material, position, rotation = [0, 0, 0], seg = 10) {
      return addMesh(parent, new THREE.CylinderGeometry(radiusTop, radiusBot, length, seg), material, position, null, rotation);
    }
    function sph(parent, radius, material, position, scale, rotation) {
      return addMesh(parent, new THREE.SphereGeometry(radius, 12, 9), material, position, scale, rotation);
    }

    /* ============================================================
       ANZUG (Körper) — glatt, V-Brust, Gürtel, Arm-/Bein-Streifen
       ============================================================ */
    function buildSuit(parent, team) {
      const accent = mat(team.color);
      const accentDark = mat(team.dark);
      const suit = mat(SUIT);
      const suitDark = mat(SUIT_DARK);

      // ---- Oberkörper (Kapsel, leicht verbreitert) ----
      const torso = new THREE.Group();
      parent.add(torso);
      addMesh(torso, new THREE.CapsuleGeometry(0.44, 0.62, 4, 12), suit, [0, 2.52, 0], [1, 1, 0.82]);
      // Unterleib / Hüfte (Kapsel kleiner)
      addMesh(torso, new THREE.CapsuleGeometry(0.4, 0.22, 3, 10), suit, [0, 1.92, 0], [1, 1, 0.8]);

      // V-förmiger Bruststreifen (Teamfarbe) — zwei diagonale Streifen
      const chestStripeGeo = new THREE.BoxGeometry(0.12, 0.5, 0.04);
      addMesh(torso, chestStripeGeo, accent, [-0.16, 2.7, 0.38], null, [0, 0, 0.6]);
      addMesh(torso, chestStripeGeo, accent, [0.16, 2.7, 0.38], null, [0, 0, -0.6]);
      // Verticaler Mittelstreifen
      addMesh(torso, new THREE.BoxGeometry(0.06, 0.55, 0.04), accent, [0, 2.58, 0.39]);
      // Schulterkappen
      sph(torso, 0.2, accent, [-0.5, 2.78, 0], [1, 0.72, 0.85]);
      sph(torso, 0.2, accent, [0.5, 2.78, 0], [1, 0.72, 0.85]);

      // Hals
      cyl(torso, 0.13, 0.15, 0.22, suit, [0, 3.02, 0]);
      // Kragen
      cyl(torso, 0.18, 0.18, 0.08, accentDark, [0, 3.02, 0]);

      // ---- Gürtel (leuchtender Ring) ----
      cyl(torso, 0.43, 0.43, 0.11, accent, [0, 1.96, 0]);
      // Gürtelschnallen (zwei kleine Rechtecke)
      addMesh(torso, new THREE.BoxGeometry(0.14, 0.09, 0.05), mat(0xd6e6f0), [-0.1, 1.96, 0.45]);
      addMesh(torso, new THREE.BoxGeometry(0.14, 0.09, 0.05), mat(0xd6e6f0), [0.1, 1.96, 0.45]);

      // ---- Arme ----
      const leftArm = new THREE.Group();
      const rightArm = new THREE.Group();
      torso.add(leftArm);
      torso.add(rightArm);

      // Oberarm
      cap(leftArm, 0.145, 0.5, suit, [-0.62, 2.44, 0], [0, 0, 0.16]);
      cap(rightArm, 0.145, 0.5, suit, [0.62, 2.44, 0], [0, 0, -0.16]);
      // Unterarm
      cap(leftArm, 0.13, 0.4, suit, [-0.64, 1.88, 0], [0, 0, 0.04]);
      cap(rightArm, 0.13, 0.4, suit, [0.64, 1.88, 0], [0, 0, -0.04]);
      // Ellenbogen-Gelenk
      sph(leftArm, 0.15, suit, [-0.63, 2.12, 0]);
      sph(rightArm, 0.15, suit, [0.63, 2.12, 0]);
      // Handgelenk-Manschette
      cyl(leftArm, 0.15, 0.15, 0.1, accent, [-0.64, 1.62, 0]);
      cyl(rightArm, 0.15, 0.15, 0.1, accent, [0.64, 1.62, 0]);
      // Handschuhe (schwarz mit teamfarbiger Akzentkante)
      sph(leftArm, 0.16, suitDark, [-0.64, 1.5, 0.02], [1, 1, 0.9]);
      sph(rightArm, 0.16, suitDark, [0.64, 1.5, 0.02], [1, 1, 0.9]);
      // Daumen-Ansatz
      sph(leftArm, 0.07, suitDark, [-0.56, 1.5, 0.12]);
      sph(rightArm, 0.07, suitDark, [0.56, 1.5, 0.12]);

      // Dünner leuchtender Streifen an der Arm-Außenkante
      addMesh(leftArm, new THREE.BoxGeometry(0.04, 0.95, 0.04), accent, [-0.77, 2.15, 0]);
      addMesh(rightArm, new THREE.BoxGeometry(0.04, 0.95, 0.04), accent, [0.77, 2.15, 0]);

      // ---- Beine ----
      const leftLeg = new THREE.Group();
      const rightLeg = new THREE.Group();
      parent.add(leftLeg);
      parent.add(rightLeg);

      // Oberschenkel
      cap(leftLeg, 0.18, 0.62, suit, [-0.22, 1.14, 0], [0, 0, 0.02]);
      cap(rightLeg, 0.18, 0.62, suit, [0.22, 1.14, 0], [0, 0, -0.02]);
      // Unterschenkel
      cap(leftLeg, 0.16, 0.54, suit, [-0.22, 0.46, 0]);
      cap(rightLeg, 0.16, 0.54, suit, [0.22, 0.46, 0]);
      // Knie-Gelenk
      sph(leftLeg, 0.19, suit, [-0.22, 0.82, 0]);
      sph(rightLeg, 0.19, suit, [0.22, 0.82, 0]);
      // Knieschutz (Teamfarbe)
      addMesh(leftLeg, new THREE.BoxGeometry(0.26, 0.1, 0.16), accent, [-0.22, 0.82, 0.06]);
      addMesh(rightLeg, new THREE.BoxGeometry(0.26, 0.1, 0.16), accent, [0.22, 0.82, 0.06]);

      // V-förmiger Streifen am Unterschenkel (Chevron nach unten)
      const shinGeo = new THREE.BoxGeometry(0.05, 0.34, 0.04);
      addMesh(leftLeg, shinGeo, accent, [-0.28, 0.4, 0.08], null, [0, 0, 0.5]);
      addMesh(leftLeg, shinGeo, accent, [-0.16, 0.4, 0.08], null, [0, 0, -0.5]);
      addMesh(rightLeg, shinGeo, accent, [0.28, 0.4, 0.08], null, [0, 0, -0.5]);
      addMesh(rightLeg, shinGeo, accent, [0.16, 0.4, 0.08], null, [0, 0, 0.5]);

      // Dünner leuchtender Streifen an der Bein-Außenkante
      addMesh(leftLeg, new THREE.BoxGeometry(0.04, 1.3, 0.04), accent, [-0.4, 0.86, 0]);
      addMesh(rightLeg, new THREE.BoxGeometry(0.04, 1.3, 0.04), accent, [0.4, 0.86, 0]);

      // ---- Stiefel ----
      addMesh(leftLeg, new THREE.BoxGeometry(0.34, 0.22, 0.5), suitDark, [-0.22, 0.14, 0.1]);
      addMesh(rightLeg, new THREE.BoxGeometry(0.34, 0.22, 0.5), suitDark, [0.22, 0.14, 0.1]);
      // Stiefel-Sohle / Akzent (Teamfarbe)
      addMesh(leftLeg, new THREE.BoxGeometry(0.36, 0.06, 0.52), accent, [-0.22, 0.04, 0.1]);
      addMesh(rightLeg, new THREE.BoxGeometry(0.36, 0.06, 0.52), accent, [0.22, 0.04, 0.1]);
      // Stiefel-Oberkante
      cyl(leftLeg, 0.19, 0.19, 0.08, accentDark, [-0.22, 0.26, 0]);
      cyl(rightLeg, 0.19, 0.19, 0.08, accentDark, [0.22, 0.26, 0]);

      return { torso, leftArm, rightArm, leftLeg, rightLeg };
    }

    /* ============================================================
       GESICHT — Augen (Iris+Pupille), Brauen, Nase, Mund
       ============================================================ */
    function buildFace(parent, character) {
      const skin = mat(character.skin);
      const white = mat(0xf8fbff);
      const irisColor = 0x4a7ac4; // blaue Augen (passend zum Stil)
      const iris = mat(irisColor);
      const pupil = mat(0x10131a);
      const dark = mat(0x1a1a20);
      const browColor = mat(character.hair === 'short-white' ? 0xc8ccd4 : character.hairColor);

      // Kopf (leicht abgeflachte Kugel)
      sph(parent, 0.42, skin, [0, 3.56, 0], [1, 1.06, 0.96]);
      // Kinn / Unterkiefer leicht
      sph(parent, 0.3, skin, [0, 3.22, 0.08], [1, 0.7, 0.85]);

      // Augen (weiß + Iris + Pupille)
      sph(parent, 0.072, white, [-0.15, 3.6, 0.36], [1, 1, 0.5]);
      sph(parent, 0.072, white, [0.15, 3.6, 0.36], [1, 1, 0.5]);
      sph(parent, 0.042, iris, [-0.15, 3.6, 0.41], [1, 1, 0.4]);
      sph(parent, 0.042, iris, [0.15, 3.6, 0.41], [1, 1, 0.4]);
      sph(parent, 0.02, pupil, [-0.15, 3.6, 0.435], [1, 1, 0.3]);
      sph(parent, 0.02, pupil, [0.15, 3.6, 0.435], [1, 1, 0.3]);
      // Augen-Glanzpunkt
      sph(parent, 0.01, mat(0xffffff), [-0.135, 3.615, 0.445]);
      sph(parent, 0.01, mat(0xffffff), [0.165, 3.615, 0.445]);

      // Augenbrauen (dünne gebogene Stäbe)
      const browGeo = new THREE.CapsuleGeometry(0.018, 0.12, 2, 6);
      addMesh(parent, browGeo, browColor, [-0.15, 3.73, 0.37], null, [0, 0, 0.12]);
      addMesh(parent, browGeo, browColor, [0.15, 3.73, 0.37], null, [0, 0, -0.12]);

      // Nase (dezent, kleiner Kegel nach unten)
      addMesh(parent, new THREE.ConeGeometry(0.045, 0.12, 7), skin, [0, 3.42, 0.4], [1, 1, 1], [Math.PI, 0, 0]);
      sph(parent, 0.03, skin, [0, 3.37, 0.42]);

      // Mund (freundlich, leicht lächelnd)
      addMesh(parent, new THREE.TorusGeometry(0.06, 0.018, 5, 10, Math.PI), dark, [0, 3.24, 0.38], [0, 0, Math.PI]);

      // Ohren
      sph(parent, 0.06, skin, [-0.41, 3.56, 0], [0.6, 1, 0.7]);
      sph(parent, 0.06, skin, [0.41, 3.56, 0], [0.6, 1, 0.7]);

      // ---- Accessoires ----
      if (character.face === 'glasses') {
        const frame = mat(0x15212c);
        const lens = mat(0x9fd4ff, { transparent: true, opacity: 0.35 });
        const ring = new THREE.TorusGeometry(0.11, 0.02, 6, 14);
        addMesh(parent, ring, frame, [-0.15, 3.6, 0.42]);
        addMesh(parent, ring, frame, [0.15, 3.6, 0.42]);
        addMesh(parent, new THREE.CylinderGeometry(0.09, 0.09, 0.01, 14), lens, [-0.15, 3.6, 0.42], null, [Math.PI / 2, 0, 0]);
        addMesh(parent, new THREE.CylinderGeometry(0.09, 0.09, 0.01, 14), lens, [0.15, 3.6, 0.42], null, [Math.PI / 2, 0, 0]);
        addMesh(parent, new THREE.BoxGeometry(0.1, 0.022, 0.022), frame, [0, 3.6, 0.42]);
      } else if (character.face === 'goggles') {
        const gog = mat(0x78e6ff, { emissive: 0x14536a });
        const ring = new THREE.TorusGeometry(0.13, 0.035, 6, 14);
        addMesh(parent, ring, gog, [-0.15, 3.82, 0.34]);
        addMesh(parent, ring, gog, [0.15, 3.82, 0.34]);
        addMesh(parent, new THREE.BoxGeometry(0.16, 0.035, 0.035), gog, [0, 3.82, 0.34]);
        // Gummiband hinten
        cyl(parent, 0.4, 0.4, 0.03, mat(0x1a3a4a), [0, 3.82, 0], null, [Math.PI / 2, 0, 0]);
      } else if (character.face === 'beard') {
        // Vollbart (Kinn + Backen)
        const beardMat = mat(character.hairColor);
        sph(parent, 0.26, beardMat, [0, 3.2, 0.22], [1, 0.72, 0.68]);
        sph(parent, 0.16, beardMat, [-0.26, 3.34, 0.18], [0.7, 0.8, 0.6]);
        sph(parent, 0.16, beardMat, [0.26, 3.34, 0.18], [0.7, 0.8, 0.6]);
        // Oberlippenbart
        addMesh(parent, new THREE.BoxGeometry(0.16, 0.03, 0.04), beardMat, [0, 3.31, 0.37]);
      }

      // Ohrstücke (Standard-Accessoire, teamfarbiger Akzent)
      if (character.accessory === 'earpiece') {
        const ear = mat(0x98eaff);
        sph(parent, 0.06, ear, [-0.41, 3.6, 0.03], [0.8, 0.8, 0.6]);
        sph(parent, 0.06, ear, [0.41, 3.6, 0.03], [0.8, 0.8, 0.6]);
      }
    }

    /* ============================================================
       HAARE — 16 Frisuren
       ============================================================ */
    function buildHair(parent, style, color) {
      const hairMat = mat(color);
      const darkMat = mat(0x14141c);

      // Grundhaube (obere Kopfhälfte)
      addMesh(parent, new THREE.SphereGeometry(0.44, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat, [0, 3.58, 0]);

      const lock = (x, y, z, scale) => sph(parent, 0.2, hairMat, [x, y, z], scale);
      const spike = (x, y, z, height, lean = 0) =>
        addMesh(parent, new THREE.ConeGeometry(0.14, height, 7), hairMat, [x, y, z], null, [0, 0, lean]);

      switch (style) {
        case 'side-part':
          // Seitenscheitel: Haare nach rechts gekämmt
          lock(0.1, 3.95, 0.05, [0.42, 0.18, 0.42]);
          lock(-0.18, 3.92, 0.1, [0.3, 0.16, 0.3]);
          addMesh(parent, new THREE.SphereGeometry(0.44, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat, [0.06, 3.62, 0.04]);
          break;

        case 'ponytail':
          // Hoher Pferdeschwanz hinten
          lock(0, 4.0, -0.05, [0.42, 0.16, 0.42]);
          // Pferdeschwanz selbst
          addMesh(parent, new THREE.CapsuleGeometry(0.1, 0.42, 3, 8), hairMat, [0.04, 3.5, -0.42], null, [0.3, 0, -0.05]);
          lock(0.06, 3.26, -0.5, [0.18, 0.3, 0.18]);
          // Strähne vorne
          lock(0, 3.92, 0.2, [0.38, 0.12, 0.2]);
          break;

        case 'short-brown':
          lock(0, 3.96, 0.02, [0.44, 0.16, 0.42]);
          lock(-0.2, 3.92, 0.06, [0.22, 0.14, 0.2]);
          lock(0.2, 3.92, 0.06, [0.22, 0.14, 0.2]);
          break;

        case 'short-white':
          lock(0, 3.96, 0.02, [0.44, 0.16, 0.42]);
          lock(-0.22, 3.88, 0.05, [0.2, 0.14, 0.18]);
          lock(0.22, 3.88, 0.05, [0.2, 0.14, 0.18]);
          break;

        case 'afro':
          // Großer runder Afro
          sph(parent, 0.56, hairMat, [0, 3.72, 0], [1.05, 1.0, 1.02]);
          // Locken-Kontur (mehrere Kugeln außen)
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            lock(Math.cos(a) * 0.5, 3.72 + Math.sin(a) * 0.28, Math.sin(a) * 0.5, [0.22, 0.22, 0.22]);
          }
          break;

        case 'pigtails':
          // Zwei Zöpfe / Pigtails seitlich
          lock(-0.3, 3.78, -0.05, [0.22, 0.4, 0.22]);
          lock(0.3, 3.78, -0.05, [0.22, 0.4, 0.22]);
          // Zopfspitzen
          sph(parent, 0.1, hairMat, [-0.3, 3.45, -0.1], [1, 0.6, 1]);
          sph(parent, 0.1, hairMat, [0.3, 3.45, -0.1], [1, 0.6, 1]);
          lock(0, 3.92, 0.02, [0.4, 0.14, 0.38]);
          break;

        case 'blonde-swept':
          // Gestylte blonde Haare nach oben
          lock(0.05, 4.02, 0.0, [0.44, 0.2, 0.42]);
          lock(-0.18, 3.96, 0.08, [0.26, 0.16, 0.24]);
          // Aufgestellte Spitze vorne
          spike(0.1, 4.18, 0.12, 0.32, -0.1);
          break;

        case 'short-black':
          lock(0, 3.96, 0.02, [0.44, 0.16, 0.42]);
          lock(-0.2, 3.92, 0.05, [0.2, 0.14, 0.18]);
          lock(0.2, 3.92, 0.05, [0.2, 0.14, 0.18]);
          break;

        case 'braid':
          // Langen Zopf über die Schulter
          lock(0, 3.94, 0.02, [0.42, 0.16, 0.4]);
          // Zopf selbst (ge flechtet) — über rechte Schulter
          addMesh(parent, new THREE.CapsuleGeometry(0.07, 0.55, 3, 7), hairMat, [0.24, 3.0, 0.18], null, [0.2, 0, -0.4]);
          sph(parent, 0.1, hairMat, [0.24, 2.62, 0.22], [0.8, 0.8, 0.8]);
          // Zopf-Halterung
          cyl(parent, 0.09, 0.09, 0.04, mat(0x1a1a1a), [0.26, 3.28, 0.2], null, [0, 0, -0.4]);
          break;

        case 'short-dark':
          lock(0, 3.96, 0.02, [0.44, 0.16, 0.42]);
          lock(-0.18, 3.92, 0.06, [0.22, 0.14, 0.2]);
          lock(0.18, 3.92, 0.06, [0.22, 0.14, 0.2]);
          break;

        case 'long-black':
          // Lange glatte schwarze Haare
          lock(-0.38, 3.4, -0.02, [0.2, 0.85, 0.22]);
          lock(0.38, 3.4, -0.02, [0.2, 0.85, 0.22]);
          lock(-0.32, 3.5, 0.1, [0.18, 0.6, 0.2]);
          lock(0.32, 3.5, 0.1, [0.18, 0.6, 0.2]);
          lock(0, 3.94, 0.02, [0.44, 0.16, 0.42]);
          // Pony
          lock(0, 3.9, 0.32, [0.42, 0.1, 0.18]);
          break;

        case 'curly':
          // Lockige dunkle Haare
          sph(parent, 0.5, hairMat, [0, 3.74, 0], [1.02, 0.92, 1.0]);
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            lock(Math.cos(a) * 0.46, 3.74 + Math.sin(a) * 0.22, Math.sin(a) * 0.46, [0.18, 0.18, 0.18]);
          }
          break;

        case 'bob':
          // Lila Bob mit Pony
          lock(-0.36, 3.36, 0.02, [0.18, 0.55, 0.2]);
          lock(0.36, 3.36, 0.02, [0.18, 0.55, 0.2]);
          lock(0, 3.94, 0.02, [0.44, 0.16, 0.42]);
          // Pony
          lock(0, 3.86, 0.3, [0.46, 0.12, 0.2]);
          break;

        case 'long-violet':
          // Dunkelviolette längere Haare
          lock(-0.36, 3.2, -0.02, [0.2, 0.95, 0.22]);
          lock(0.36, 3.2, -0.02, [0.2, 0.95, 0.22]);
          lock(0, 3.94, 0.02, [0.44, 0.16, 0.42]);
          lock(0, 3.88, 0.28, [0.4, 0.1, 0.18]);
          break;

        case 'beanie':
          // Lila Beanie-Mütze
          sph(parent, 0.47, mat(0x6a2fa0), [0, 3.66, 0], [1.02, 0.55, 1.02]);
          cyl(parent, 0.44, 0.44, 0.09, mat(0x8a3fc8), [0, 3.5, 0]);
          // Bommel oben
          sph(parent, 0.1, mat(0xb060e8), [0, 3.94, 0]);
          // Hervorlugende dunkle Haare vorne
          lock(-0.2, 3.5, 0.28, [0.18, 0.14, 0.14]);
          lock(0.2, 3.5, 0.28, [0.18, 0.14, 0.14]);
          lock(0, 3.52, 0.32, [0.22, 0.1, 0.14]);
          break;

        default:
          lock(0, 3.96, 0.02, [0.44, 0.16, 0.42]);
          break;
      }
    }

    /* ============================================================
       KOMPLETTER AGENT
       ============================================================ */
    function createAgent(character, team) {
      const root = new THREE.Group();
      root.userData.teamColor = team.color;

      const body = buildSuit(root, team);

      // Kopf (eigene Gruppe — für First-Person abnehmbar)
      const head = new THREE.Group();
      root.add(head);
      buildFace(head, character);
      buildHair(head, character.hair, character.hairColor);

      // Leichte Drehung für lebendigere Präsentation
      root.rotation.y = 0.18;

      // Benannte Teile für First-Person-Wiederverwendung (Teil 3)
      root.userData.parts = { head, ...body };
      return root;
    }

    /* ============================================================
       RESIZE / RENDER (on-demand für 60 FPS)
       ============================================================ */
    function resize() {
      const bounds = stage.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height, false);
      camera.aspect = bounds.width / bounds.height;
      camera.updateProjectionMatrix();
      requestRender();
    }

    function disposeCharacter() {
      characterRoot.traverse((child) => {
        if (child.isMesh) child.geometry.dispose();
      });
      characterRoot.clear();
    }

    function requestRender() {
      if (!active || frameId) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        if (active) renderer.render(scene, camera);
      });
    }

    function show(character) {
      const team = window.ChronosGameData.TEAMS.find((item) => item.id === character.teamId);
      if (!team) return;
      disposeCharacter();
      characterRoot.add(createAgent(character, team));

      // Rim-Licht auf Teamfarbe einstellen
      if (rimLight) rimLight.color.set(team.color);

      active = true;
      resize();
      requestRender();
    }

    function hide() {
      active = false;
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    /* ============================================================
       360° MAUS-DREHUNG (X + Y Achse, begrenzt nach oben/unten)
       ============================================================ */
    canvas.addEventListener('pointerdown', (event) => {
      dragPointer = event.pointerId;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (dragPointer !== event.pointerId || !active) return;
      const dx = event.clientX - lastPointerX;
      const dy = event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      characterRoot.rotation.y += dx * 0.012;
      characterRoot.rotation.x = Math.max(-0.6, Math.min(0.6, characterRoot.rotation.x + dy * 0.008));
      requestRender();
    });
    const endDrag = (event) => { if (dragPointer === event.pointerId) dragPointer = null; };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('lostpointercapture', endDrag);

    if ('ResizeObserver' in window) {
      new ResizeObserver(resize).observe(stage);
    } else {
      window.addEventListener('resize', resize, { passive: true });
    }

    window.ChronosCharacterScene = { show, hide, createAgent };
    window.dispatchEvent(new Event('chronos:scene-ready'));
  }
}
