/* ============================================================
   CHRONOS-TERMINAL - Client-Logik
   ============================================================ */

(function () {
  'use strict';

  // --- DOM-Referenzen ---
  const views = {
    lobby: document.getElementById('view-lobby'),
    waiting: document.getElementById('view-waiting'),
    secret: document.getElementById('view-secret'),
    beamer: document.getElementById('view-beamer'),
    connected: document.getElementById('view-connected'),
    ownerPanel: document.getElementById('view-owner-panel'),
    student: document.getElementById('view-student')
  };

  const el = {
    btnLogin: document.getElementById('btn-login'),
    sitzungscode: document.getElementById('sitzungscode'),
    agentenname: document.getElementById('agentenname'),
    loginMessage: document.getElementById('login-message'),
    btnBackLobby: document.getElementById('btn-back-lobby'),
    btnCloseSecret: document.getElementById('btn-close-secret'),
    roleCards: document.querySelectorAll('.role-card'),
    connectForm: document.getElementById('connect-form'),
    btnConnect: document.getElementById('btn-connect'),
    pinInput: document.getElementById('pin-input'),
    beamerCodeInput: document.getElementById('beamer-code-input'),
    secretMessage: document.getElementById('secret-message'),
    beamerCode: document.getElementById('beamer-code'),
    missionScreen: document.getElementById('beamer-mission-screen'),
    missionSessionCode: document.getElementById('mission-session-code'),
    missionTeams: document.getElementById('mission-teams'),
    beamerStatus: document.getElementById('beamer-status'),
    beamerContent: document.getElementById('beamer-content'),
    beamerVideo: document.getElementById('beamer-video'),
    btnExitBeamer: document.getElementById('btn-exit-beamer'),
    connectedMessage: document.getElementById('connected-message'),
    metaRole: document.getElementById('meta-role'),
    metaCode: document.getElementById('meta-code'),
    btnDisconnect: document.getElementById('btn-disconnect'),
    btnOwnerWeiter: document.getElementById('btn-owner-weiter'),
    btnIntroStart: document.getElementById('btn-intro-start'),
    studentTeamSymbol: document.getElementById('student-team-symbol'),
    studentTeamEmblem: document.getElementById('student-team-emblem'),
    studentTeamSector: document.getElementById('student-team-sector'),
    studentTeamTitle: document.getElementById('student-team-title'),
    studentCodename: document.getElementById('student-codename'),
    studentEra: document.getElementById('student-era'),
    studentRole: document.getElementById('student-role'),
    studentDescription: document.getElementById('student-description'),
    studentAbility: document.getElementById('student-ability'),
    characterFallback: document.getElementById('character-fallback'),
    waitingStatusText: document.getElementById('waiting-status-text')
  };

  // --- State ---
  let socket = null;
  let selectedRole = null; // 'beamer' | 'owner' | 'admin'
  let currentBeamerCode = null;
  let currentRole = null;
  let studentJoinPending = false;
  const { TEAMS } = window.ChronosGameData;

  const SECRET_TRIGGER = 'coolman ';
  let secretBuffer = '';

  // --- View-Umschaltung ---
  function showView(name) {
    if (name !== 'student') window.ChronosCharacterScene?.hide();
    Object.values(views).forEach(v => v.classList.remove('view-active'));
    views[name].classList.add('view-active');
  }

  const teamSymbols = {
    hourglass: '<path d="M30 6h4v6h-4z M30 52h4v6h-4z M22 12h20l-6 10 6 10H22l6-10z"/><path stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round" d="M14 14l8 4M14 14v10l8-4 M50 14l-8 4M50 14v10l-8-4 M14 38l8-4M14 38v10l8 4 M50 38l-8-4M50 38v10l-8 4"/>',
    arrow: '<path d="M32 6 L46 28 L38 28 L38 58 L26 58 L26 28 L18 28 Z M32 50 L40 58 M32 50 L24 58"/>',
    compass: '<circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" stroke-width="2"/><path fill="currentColor" d="M32 4 L37 27 L60 32 L37 37 L32 60 L27 37 L4 32 L27 27 Z"/><circle cx="32" cy="32" r="3" fill="currentColor"/>',
    crescent: '<path fill="currentColor" d="M50 10a24 24 0 1 0 0 44 18 18 0 0 1 0-44Z"/><circle cx="22" cy="20" r="2.4" fill="currentColor"/><circle cx="18" cy="36" r="1.8" fill="currentColor"/>'
  };

  function teamIcon(team) {
    const outline = team.symbol === 'compass' ? 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"' : 'fill="currentColor"';
    return `<svg viewBox="0 0 64 64" aria-hidden="true" ${outline}>${teamSymbols[team.symbol]}</svg>`;
  }

  function renderMissionTeams() {
    el.missionTeams.innerHTML = TEAMS.map((team) => `
      <article class="mission-team-card" style="--team-color:${team.color};--team-dark:${team.dark}">
        <span class="mission-team-sector">${team.sector}</span>
        <strong class="mission-team-title">${team.title}</strong>
        <span class="mission-team-icon">${teamIcon(team)}</span>
      </article>
    `).join('');
  }

  renderMissionTeams();

  // --- Fullscreen API ---
  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
    return Promise.resolve();
  }

  function exitFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
    return Promise.resolve();
  }

  // --- Socket.io initialisieren ---
  function initSocket() {
    if (socket && socket.connected) return socket;
    socket = io();

    // Beamer: Code erhalten
    socket.on('beamer:code', (data) => {
      currentBeamerCode = data.code;
      el.beamerCode.textContent = data.code;
      el.missionSessionCode.textContent = data.studentCode;
      el.beamerStatus.innerHTML = '<span class="status-dot"></span> Auf Verbindungen warten...';
    });

    // Beamer: Jemand hat sich verbunden
    socket.on('beamer:client_connected', (data) => {
      const role = data.role === 'owner' ? 'OWNER' : 'ADMIN';
      el.beamerStatus.innerHTML = `<span class="status-dot"></span> ${role} verbunden mit Beamer ${data.code}`;
    });

    // Beamer: Intro-Video abspielen (vom Owner getriggert)
    socket.on('beamer:intro:start', () => {
      playBeamerIntro();
    });

    // Schueler: erfolgreiche Gruppen- und Charakterzuweisung
    socket.on('student:join:result', (data) => {
      studentJoinPending = false;
      el.btnLogin.disabled = false;
      if (!data.success) {
        showView('lobby');
        showLoginMessage(data.message, 'error');
        return;
      }

      currentRole = 'student';
      showStudentCharacter(data);
    });

    socket.on('connect_error', () => {
      if (!studentJoinPending) return;
      studentJoinPending = false;
      el.btnLogin.disabled = false;
      showView('lobby');
      showLoginMessage('Verbindung zum Zeitreise-Server fehlgeschlagen. Bitte erneut versuchen.', 'error');
    });

    // Client: Verbindungsresultat
    socket.on('client:connect:result', (data) => {
      if (data.success) {
        currentRole = data.role;
        currentBeamerCode = data.code;
        showConnectedConfirmation(data.role, data.code, data.message);
      } else {
        showSecretMessage(data.message, 'error');
      }
    });

    // Client: wurde verdrängt
    socket.on('client:displaced', (data) => {
      showSecretMessage(data.message, 'error');
      setTimeout(() => showView('secret'), 1500);
    });

    // Session beendet
    socket.on('session:ended', (data) => {
      alert(data.message);
      disconnectFromSession();
      showView('lobby');
    });

    return socket;
  }

  // --- LOBBY: Login ---
  el.btnLogin.addEventListener('click', () => {
    if (studentJoinPending) return;

    const code = el.sitzungscode.value.trim().toUpperCase();
    const firstName = el.agentenname.value.trim().replace(/\s+/g, ' ');
    if (!/^[A-HJ-NP-Z2-9]{4}$/.test(code)) {
      showLoginMessage('Bitte den vierstelligen Sitzungscode vom Beamer eingeben.', 'error');
      el.sitzungscode.focus();
      return;
    }
    if (!firstName) {
      showLoginMessage('Bitte deinen echten Vornamen eingeben.', 'error');
      el.agentenname.focus();
      return;
    }

    el.sitzungscode.value = code;
    showLoginMessage('', '');
    studentJoinPending = true;
    el.btnLogin.disabled = true;
    el.btnLogin.querySelector('span:nth-child(2)').textContent = 'ZEITSPRUNG WIRD INITIALISIERT';
    enterFullscreen().catch(() => { /* Fallback: kein Vollbild */ });
    showView('waiting');
    startWaitingAnimation();
    initSocket();
    socket.emit('student:join', { code, firstName });
  });

  el.sitzungscode.addEventListener('input', () => {
    el.sitzungscode.value = el.sitzungscode.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 4);
  });

  function showLoginMessage(message, type) {
    el.loginMessage.textContent = message;
    el.loginMessage.className = `login-message${type ? ` ${type}` : ''}`;
    el.btnLogin.querySelector('span:nth-child(2)').textContent = 'ZEITSPRUNG INITIALISIEREN';
  }

  // Enter-Taste im Login-Formular
  [el.sitzungscode, el.agentenname].forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') el.btnLogin.click();
    });
  });

  // Warte-Status-Animation
  const waitingMessages = [
    'Suche nach Anomalien im Zeitfluss',
    'Temporale Koordinaten werden kalibriert',
    'Chronos-Feld wird aufgebaut',
    'Zeitlinie wird synchronisiert',
    'Verbindung zur Zeitlinie steht'
  ];

  function startWaitingAnimation() {
    let i = 0;
    el.waitingStatusText.textContent = waitingMessages[0];
    const interval = setInterval(() => {
      if (!views.waiting.classList.contains('view-active')) {
        clearInterval(interval);
        return;
      }
      i = (i + 1) % waitingMessages.length;
      el.waitingStatusText.textContent = waitingMessages[i];
    }, 2200);
  }

  // Zurück zur Lobby vom Wartebildschirm
  el.btnBackLobby.addEventListener('click', () => {
    if (studentJoinPending) {
      studentJoinPending = false;
      el.btnLogin.disabled = false;
      disconnectFromSession();
    }
    showView('lobby');
  });

  // --- SECRET MENÜ: Trigger durch Tippen von 'coolman ' ---
  document.addEventListener('keydown', (e) => {
    // Ignoriere Eingaben in Input-Feldern (ausser der Secret-Trigger soll immer funktionieren)
    const isInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';

    // Secret-Trigger auch in Inputs erkennen, aber nur wenn es das Passwort-/Textfeld ist
    // Damit der Trigger überall funktioniert, bauen wir den Buffer aus e.key
    if (e.key.length === 1) {
      secretBuffer += e.key.toLowerCase();
      // Buffer auf Laenge des Triggers begrenzen
      if (secretBuffer.length > SECRET_TRIGGER.length) {
        secretBuffer = secretBuffer.slice(-SECRET_TRIGGER.length);
      }
      if (secretBuffer === SECRET_TRIGGER) {
        secretBuffer = '';
        openSecretMenu();
      }
    } else if (e.key === 'Backspace') {
      secretBuffer = secretBuffer.slice(0, -1);
    } else if (e.key === 'Escape') {
      if (views.secret.classList.contains('view-active')) closeSecretMenu();
    }
  });

  function openSecretMenu() {
    resetSecretMenu();
    showView('secret');
  }

  function closeSecretMenu() {
    resetSecretMenu();
    showView('lobby');
  }

  el.btnCloseSecret.addEventListener('click', closeSecretMenu);

  function resetSecretMenu() {
    selectedRole = null;
    el.roleCards.forEach(c => c.classList.remove('active'));
    el.connectForm.classList.add('hidden');
    el.btnConnect.classList.add('hidden');
    el.pinInput.value = '';
    el.beamerCodeInput.value = '';
    el.secretMessage.textContent = '';
    el.secretMessage.className = 'secret-message';
  }

  // --- Rollen-Auswahl im Secret-Menü ---
  el.roleCards.forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      selectedRole = role;

      el.roleCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      el.secretMessage.textContent = '';
      el.secretMessage.className = 'secret-message';

      if (role === 'beamer') {
        // Beamer direkt starten (keine PIN noetig)
        el.connectForm.classList.add('hidden');
        el.btnConnect.classList.add('hidden');
        startBeamer();
      } else {
        // Owner/Admin: Formular zeigen
        el.connectForm.classList.remove('hidden');
        el.btnConnect.classList.remove('hidden');
        el.pinInput.focus();
      }
    });
  });

  // --- BEAMER starten ---
  function startBeamer() {
    initSocket();
    socket.emit('beamer:start');
    enterFullscreen().catch(() => {});
    el.beamerCode.textContent = '— — — — — — — —';
    el.beamerStatus.innerHTML = '<span class="status-dot"></span> Beamer wird initialisiert...';

    // Beamer-Ansicht zuruecksetzen (Code sichtbar, Video versteckt)
    resetBeamerView();
    // Video im Hintergrund vorladen, damit es ohne Verzoegerung startet
    preloadBeamerVideo();

    showView('beamer');
  }

  // Video vorladen (preload="auto" + load() erzwingen)
  function preloadBeamerVideo() {
    try {
      el.beamerVideo.muted = false;
      el.beamerVideo.load();
    } catch (e) { /* ignorieren */ }
  }

  // Beamer-Ansicht auf Code-Ansicht zuruecksetzen
  function resetBeamerView() {
    views.beamer.classList.remove('video-active');
    el.beamerVideo.classList.remove('is-playing');
    el.beamerVideo.classList.remove('is-transitioning-out');
    el.missionScreen.classList.remove('mission-visible');
    el.missionScreen.setAttribute('aria-hidden', 'true');
    try {
      el.beamerVideo.pause();
      el.beamerVideo.currentTime = 0;
    } catch (e) { /* ignorieren */ }
  }

  // Intro-Video auf dem Beamer abspielen
  function playBeamerIntro() {
    enterFullscreen().catch(() => {});
    el.missionScreen.classList.remove('mission-visible');
    el.missionScreen.setAttribute('aria-hidden', 'true');
    el.beamerVideo.classList.remove('is-transitioning-out');
    views.beamer.classList.add('video-active');
    el.beamerVideo.classList.add('is-playing');
    // Von Anfang starten mit Ton
    try {
      el.beamerVideo.currentTime = 0;
      el.beamerVideo.muted = false;
      const p = el.beamerVideo.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => console.warn('Video-Playback fehlgeschlagen:', err));
      }
    } catch (e) {
      console.warn('Video konnte nicht gestartet werden:', e);
    }
  }

  function showMissionScreen() {
    el.beamerVideo.pause();
    el.missionScreen.setAttribute('aria-hidden', 'false');
    el.missionScreen.classList.add('mission-visible');
    el.beamerVideo.classList.add('is-transitioning-out');
    window.setTimeout(() => {
      el.beamerVideo.classList.remove('is-playing');
    }, 1200);
  }

  // Nach dem letzten Intro-Frame weich auf das Mission-Briefing ueberblenden.
  el.beamerVideo.addEventListener('ended', () => {
    showMissionScreen();
  });

  el.btnExitBeamer.addEventListener('click', () => {
    if (socket) socket.disconnect();
    socket = null;
    currentBeamerCode = null;
    resetBeamerView();
    exitFullscreen().catch(() => {});
    showView('lobby');
  });

  // --- CONNECT (Owner/Admin) ---
  el.btnConnect.addEventListener('click', () => {
    const pin = el.pinInput.value.trim();
    const code = el.beamerCodeInput.value.trim().toUpperCase();

    if (!pin) {
      showSecretMessage('Bitte PIN eingeben.', 'error');
      el.pinInput.focus();
      return;
    }
    if (!code || code.length !== 8) {
      showSecretMessage('Bitte einen 8-stelligen Beamer-Code eingeben.', 'error');
      el.beamerCodeInput.focus();
      return;
    }

    initSocket();
    socket.emit('client:connect', { code, pin, role: selectedRole });
    showSecretMessage('Verbinde...', '');
  });

  // Enter im PIN-Feld -> Beamer-Code-Feld, Enter dort -> Connect
  el.pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.beamerCodeInput.focus();
  });
  el.beamerCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.btnConnect.click();
  });

  function showSecretMessage(msg, type) {
    el.secretMessage.textContent = msg;
    el.secretMessage.className = 'secret-message' + (type ? ' ' + type : '');
  }

  function showStudentCharacter(data) {
    const team = data.team;
    const character = data.character;
    const view = views.student;

    view.style.setProperty('--team-color', team.color);
    view.style.setProperty('--team-dark', team.dark);
    el.studentTeamSymbol.innerHTML = teamIcon(team);
    el.studentTeamEmblem.innerHTML = teamIcon(team);
    el.studentTeamSector.textContent = team.sector;
    el.studentTeamTitle.textContent = team.title;
    el.studentCodename.textContent = character.codename;
    el.studentEra.textContent = character.era;
    el.studentRole.textContent = character.role;
    el.studentDescription.textContent = character.description;
    el.studentAbility.textContent = character.ability;
    el.characterFallback.classList.add('hidden');

    showView('student');
    if (window.ChronosCharacterScene) {
      window.ChronosCharacterScene.show(character);
    } else {
      window.addEventListener('chronos:scene-ready', () => {
        window.ChronosCharacterScene?.show(character);
      }, { once: true });
    }
  }

  // --- VERBUNDEN-BESTÄTIGUNG ---
  function showConnectedConfirmation(role, code, message) {
    const roleLabel = role === 'owner' ? 'OWNER' : 'ADMIN';
    el.connectedMessage.textContent = message;
    el.metaRole.textContent = roleLabel;
    el.metaCode.textContent = code;

    // WEITER-Button NUR beim Owner anzeigen, Admin bekommt ihn nicht
    if (role === 'owner') {
      el.btnOwnerWeiter.classList.remove('hidden');
    } else {
      el.btnOwnerWeiter.classList.add('hidden');
    }

    showView('connected');
  }

  el.btnDisconnect.addEventListener('click', () => {
    disconnectFromSession();
    openSecretMenu();
  });

  // --- WEITER (nur Owner) -> Owner-Panel oeffnen ---
  el.btnOwnerWeiter.addEventListener('click', () => {
    enterFullscreen().catch(() => {});
    showView('ownerPanel');
  });

  // --- INTRO STARTEN -> Event an Server (weiter an Beamer) ---
  el.btnIntroStart.addEventListener('click', () => {
    if (socket) {
      socket.emit('owner:intro:start');
    }
  });

  function disconnectFromSession() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    studentJoinPending = false;
    el.btnLogin.disabled = false;
    showLoginMessage('', '');
    currentRole = null;
    currentBeamerCode = null;
  }

})();
