// Chronos-Terminal Server
// Express + Socket.io Multiplayer Zeitreise-App

const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Server } = require('socket.io');
const { TEAMS, CHARACTERS } = require('./public/js/game-data');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Hilfsfunktion: lokale IPv4-Adresse fuer die Netzwerk-URL ermitteln
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

// Statische Dateien ausliefern
app.use('/vendor', express.static(path.join(__dirname, 'node_modules', 'three', 'build')));
app.use(express.static(path.join(__dirname, 'public')));

// --- Session-Logik ---
// Speichert alle aktiven Beamer-Sessions: code -> { beamerSocketId, ownerSocketId, adminSocketIds }
const sessions = new Map();

// PIN-Konfiguration
const PIN_OWNER = '9999';
const PIN_ADMIN = '2026';

// Codes nutzen keine leicht verwechselbaren Zeichen wie I, O, 0 oder 1.
function generateCode(length, isTaken) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < length; i++) {
      code += chars.charAt(crypto.randomInt(chars.length));
    }
  } while (isTaken(code));
  return code;
}

function releaseStudent(session, socketId) {
  const assignment = session.studentsBySocketId.get(socketId);
  if (!assignment) return;
  session.teamMembers[assignment.teamIndex][assignment.characterIndex] = null;
  session.studentsBySocketId.delete(socketId);
}

// --- Socket.io Verbindungslogik ---
io.on('connection', (socket) => {
  console.log(`[+] Socket verbunden: ${socket.id}`);

  // Beamer startet eine neue Session
  socket.on('beamer:start', () => {
    const code = generateCode(8, (candidate) => sessions.has(candidate));
    const session = {
      code,
      studentCode: generateCode(
        4,
        (candidate) => Array.from(sessions.values()).some((item) => item.studentCode === candidate)
      ),
      beamerSocketId: socket.id,
      ownerSocketId: null,
      adminSocketIds: [],
      teamMembers: TEAMS.map(() => Array(4).fill(null)),
      studentsBySocketId: new Map(),
      nextTeamIndex: 0
    };
    sessions.set(code, session);
    socket.join(`beamer:${code}`);
    socket.data.beamerCode = code;
    console.log(`[!] Beamer-Session erstellt: ${code}`);
    socket.emit('beamer:code', { code, studentCode: session.studentCode });
  });

  // Schueler tritt mit dem vierstelligen Sitzungscode und Vornamen bei.
  socket.on('student:join', (payload = {}) => {
    const { code, firstName } = payload || {};
    const studentCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
    const cleanName = typeof firstName === 'string' ? firstName.trim().replace(/\s+/g, ' ') : '';
    const session = Array.from(sessions.values()).find((item) => item.studentCode === studentCode);

    if (!session) {
      socket.emit('student:join:result', {
        success: false,
        message: 'Sitzungscode nicht gefunden. Bitte prüfe den Code auf dem Beamer.'
      });
      return;
    }

    if (!/^[\p{L}][\p{L}\p{M}'’ -]{0,39}$/u.test(cleanName)) {
      socket.emit('student:join:result', {
        success: false,
        message: 'Bitte gib einen gültigen Vornamen ein.'
      });
      return;
    }

    const existingAssignment = session.studentsBySocketId.get(socket.id);
    if (existingAssignment) {
      const team = TEAMS[existingAssignment.teamIndex];
      const character = CHARACTERS.find((item) => item.id === existingAssignment.characterId);
      existingAssignment.firstName = cleanName;
      socket.emit('student:join:result', {
        success: true,
        firstName: cleanName,
        team,
        character
      });
      return;
    }

    let teamIndex = -1;
    let fewestMembers = 4;
    for (let offset = 0; offset < TEAMS.length; offset++) {
      const candidate = (session.nextTeamIndex + offset) % TEAMS.length;
      const memberCount = session.teamMembers[candidate].filter(Boolean).length;
      if (memberCount < fewestMembers) {
        teamIndex = candidate;
        fewestMembers = memberCount;
      }
    }

    if (teamIndex < 0) {
      socket.emit('student:join:result', {
        success: false,
        message: 'Diese Sitzung ist voll. Bitte frage deine Lehrkraft.'
      });
      return;
    }

    const characterIndex = session.teamMembers[teamIndex].findIndex((id) => id === null);
    const character = CHARACTERS.find((item) => item.id === `${TEAMS[teamIndex].id}-${String(characterIndex + 1).padStart(2, '0')}`);
    const assignment = {
      firstName: cleanName,
      teamIndex,
      characterIndex,
      characterId: character.id
    };

    session.teamMembers[teamIndex][characterIndex] = socket.id;
    session.studentsBySocketId.set(socket.id, assignment);
    session.nextTeamIndex = (teamIndex + 1) % TEAMS.length;

    socket.join(`beamer:${session.code}`);
    socket.data.beamerCode = session.code;
    socket.data.studentCode = studentCode;
    socket.data.role = 'student';
    socket.emit('student:join:result', {
      success: true,
      firstName: cleanName,
      team: TEAMS[teamIndex],
      character
    });
    console.log(`[+] Schülerplatz in Sektor ${TEAMS[teamIndex].id.toUpperCase()} zugewiesen.`);
  });

  // Owner/Admin versucht zu verbinden
  socket.on('client:connect', ({ code, pin, role }) => {
    const session = sessions.get(code);

    // Session nicht gefunden
    if (!session) {
      socket.emit('client:connect:result', {
        success: false,
        message: `Beamer-Session ${code} nicht gefunden.`
      });
      return;
    }

    // PIN pruefen
    let validPin = false;
    if (role === 'owner' && pin === PIN_OWNER) validPin = true;
    if (role === 'admin' && pin === PIN_ADMIN) validPin = true;

    if (!validPin) {
      socket.emit('client:connect:result', {
        success: false,
        message: `Falscher PIN fuer ${role.toUpperCase()}.`
      });
      return;
    }

    // Rolle zuordnen
    if (role === 'owner') {
      // Owner kann die Session uebernehmen (nur einer gleichzeitig)
      if (session.ownerSocketId) {
        const oldOwner = io.sockets.sockets.get(session.ownerSocketId);
        if (oldOwner) {
          oldOwner.emit('client:displaced', { message: 'Ein anderer Owner hat die Session uebernommen.' });
          oldOwner.leave(`beamer:${code}`);
        }
      }
      session.ownerSocketId = socket.id;
    } else if (role === 'admin') {
      if (!session.adminSocketIds.includes(socket.id)) {
        session.adminSocketIds.push(socket.id);
      }
    }

    socket.join(`beamer:${code}`);
    socket.data.beamerCode = code;
    socket.data.role = role;

    // Bestaetigung an den Client
    socket.emit('client:connect:result', {
      success: true,
      role,
      code,
      message: `Verbunden als ${role === 'owner' ? 'Owner' : 'Admin'} mit Beamer ${code}`
    });

    // Beamer informieren, dass sich jemand verbunden hat
    const beamerSocket = io.sockets.sockets.get(session.beamerSocketId);
    if (beamerSocket) {
      beamerSocket.emit('beamer:client_connected', { role, code });
    }

    console.log(`[+] ${role.toUpperCase()} verbunden mit Beamer ${code}`);
  });

  // Owner: Intro-Video auf dem gekoppelten Beamer starten
  socket.on('owner:intro:start', () => {
    const code = socket.data.beamerCode;
    const role = socket.data.role;
    if (!code || role !== 'owner') return;

    const session = sessions.get(code);
    if (!session || session.ownerSocketId !== socket.id) return;

    const beamerSocket = io.sockets.sockets.get(session.beamerSocketId);
    if (beamerSocket) {
      beamerSocket.emit('beamer:intro:start');
      console.log(`[▶] Owner hat Intro fuer Beamer ${code} gestartet.`);
    }
  });

  // Trennung: Aufraeumen
  socket.on('disconnect', () => {
    const code = socket.data.beamerCode;
    if (!code) return;

    const session = sessions.get(code);
    if (!session) return;

    if (session.beamerSocketId === socket.id) {
      // Beamer getrennt -> Session beenden
      io.to(`beamer:${code}`).emit('session:ended', { message: `Beamer-Session ${code} wurde beendet.` });
      sessions.delete(code);
      console.log(`[-] Beamer-Session ${code} beendet.`);
    } else if (socket.data.role === 'student') {
      releaseStudent(session, socket.id);
      console.log(`[-] Schülerplatz in Sitzung ${session.studentCode} freigegeben.`);
    } else if (session.ownerSocketId === socket.id) {
      session.ownerSocketId = null;
      console.log(`[-] Owner von Beamer ${code} getrennt.`);
    } else if (session.adminSocketIds.includes(socket.id)) {
      session.adminSocketIds = session.adminSocketIds.filter(id => id !== socket.id);
      console.log(`[-] Admin von Beamer ${code} getrennt.`);
    }
  });
});

server.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`\n  ╔══════════════════════════════════════════════════╗`);
  console.log(`  ║   CHRONOS-TERMINAL SERVER GESTARTET              ║`);
  console.log(`  ║                                                  ║`);
  console.log(`  ║   Lokal:   http://localhost:${PORT}                 ║`);
  console.log(`  ║   Netzwerk: http://${localIP}:${PORT}         ║`);
  console.log(`  ║   (lauscht auf ${HOST} - alle Interfaces)        ║`);
  console.log(`  ║                                                  ║`);
  console.log(`  ║   Tippe 'coolman ' fuer das Secret-Menue         ║`);
  console.log(`  ╚══════════════════════════════════════════════════╝\n`);
});
