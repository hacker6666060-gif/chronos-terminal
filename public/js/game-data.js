(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = data;
  } else {
    root.ChronosGameData = data;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TEAMS = [
    {
      id: 'alpha',
      sector: 'SEKTOR ALPHA',
      title: 'ZEITWÄCHTER',
      color: '#11c9f4',
      dark: '#063849',
      symbol: 'hourglass'
    },
    {
      id: 'omega',
      sector: 'SEKTOR OMEGA',
      title: 'PARADOX-JÄGER',
      color: '#ffbf36',
      dark: '#49300a',
      symbol: 'arrow'
    },
    {
      id: 'nova',
      sector: 'SEKTOR NOVA',
      title: 'CHRONO-PIONIERE',
      color: '#35e879',
      dark: '#0b4225',
      symbol: 'compass'
    },
    {
      id: 'eclipse',
      sector: 'SEKTOR ECLIPSE',
      title: 'ÄONEN-AGENTEN',
      color: '#c05bff',
      dark: '#35104f',
      symbol: 'crescent'
    }
  ];

  const CHARACTERS = [
    // ===== ALPHA (CYAN) — Figuren 1–4 =====
    {
      id: 'alpha-01', teamId: 'alpha', codename: 'TICK', era: 'Renaissance · Zeitarchiv',
      role: 'Chrono-Wächter', description: 'Behält selbst im größten Zeitwirbel den Überblick und behält jede Zeitlinie im Blick.',
      ability: 'Kann Zeitspuren präzise lesen.', hair: 'side-part', face: 'plain',
      accessory: 'earpiece', skin: '#f0c8a0', hairColor: '#5a3a22'
    },
    {
      id: 'alpha-02', teamId: 'alpha', codename: 'SANDSTURM', era: 'Antikes Ägypten · Sanduhr-Archiv',
      role: 'Spurensucherin', description: 'Entdeckt Hinweise, die andere längst übersehen haben, und folgt ihnen bis ins letzte Detail.',
      ability: 'Findet verborgene Muster in Sekunden.', hair: 'ponytail', face: 'plain',
      accessory: 'earpiece', skin: '#f0c8a0', hairColor: '#14141c'
    },
    {
      id: 'alpha-03', teamId: 'alpha', codename: 'NULLPUNKT', era: 'Zukunft · Quantenlabor',
      role: 'Zeitlinien-Analyst', description: 'Denkt voraus und prüft jede Möglichkeit, bevor das Team einen falschen Schritt wagt.',
      ability: 'Berechnet den sichersten nächsten Schritt.', hair: 'short-brown', face: 'glasses',
      accessory: 'earpiece', skin: '#f0c8a0', hairColor: '#3a2818'
    },
    {
      id: 'alpha-04', teamId: 'alpha', codename: 'MOMENT', era: 'Belle Époque · Sternwarte',
      role: 'Epochen-Navigatorin', description: 'Findet auch in unbekannten Epochen den richtigen Weg und leitet das Team sicher durch.',
      ability: 'Orientiert sich an kleinsten Zeitzeichen.', hair: 'short-white', face: 'plain',
      accessory: 'earpiece', skin: '#d8a878', hairColor: '#eceef4'
    },
    // ===== OMEGA (GOLD) — Figuren 5–8 =====
    {
      id: 'omega-01', teamId: 'omega', codename: 'KOMET', era: 'Kreidezeit · Fossilienfeld',
      role: 'Paradox-Jäger', description: 'Handelt mutig, wenn eine Zeitlinie aus dem Takt gerät, und hält den Kurs auch im Chaos.',
      ability: 'Spürt instabile Zeitrisse auf.', hair: 'afro', face: 'plain',
      accessory: 'earpiece', skin: '#6b4028', hairColor: '#121010'
    },
    {
      id: 'omega-02', teamId: 'omega', codename: 'FUNKE', era: 'Industriezeitalter · Maschinenhalle',
      role: 'Mechanik-Expertin', description: 'Bringt selbst fremde Zeitmaschinen wieder in Gang, wenn andere längst aufgeben.',
      ability: 'Repariert Chrono-Technik mit wenig Werkzeug.', hair: 'pigtails', face: 'plain',
      accessory: 'earpiece', skin: '#d8a878', hairColor: '#2a1a12'
    },
    {
      id: 'omega-03', teamId: 'omega', codename: 'SPRUNG', era: 'Mittelalter · Grenzfestung',
      role: 'Schnellläufer', description: 'Ist immer dort, wo das Team Unterstützung braucht, und eilt schneller als jeder andere.',
      ability: 'Wechselt blitzschnell zwischen Zeitspuren.', hair: 'blonde-swept', face: 'plain',
      accessory: 'earpiece', skin: '#f0c8a0', hairColor: '#e8c860'
    },
    {
      id: 'omega-04', teamId: 'omega', codename: 'ECHO', era: 'Antikes Griechenland · Agora',
      role: 'Diplomat', description: 'Löst Konflikte, bevor sie zu echten Paradoxen werden, und vereint auch verfeindete Epochen.',
      ability: 'Gewinnt Verbündete in jeder Epoche.', hair: 'short-black', face: 'plain',
      accessory: 'earpiece', skin: '#e8b890', hairColor: '#14141c'
    },
    // ===== NOVA (GRÜN) — Figuren 9–12 =====
    {
      id: 'nova-01', teamId: 'nova', codename: 'KOMPASS', era: 'Zeitalter der Entdeckungen · Küste',
      role: 'Wegfinderin', description: 'Macht aus unbekanntem Terrain einen klaren Kurs und zeigt dem Team immer den richtigen Weg.',
      ability: 'Zeigt dem Team den besten Weg nach vorn.', hair: 'braid', face: 'plain',
      accessory: 'earpiece', skin: '#f0c8a0', hairColor: '#8a6040'
    },
    {
      id: 'nova-02', teamId: 'nova', codename: 'ORBIT', era: 'Raumfahrt · Mondstation',
      role: 'Sternenkundiger', description: 'Verbindet Hinweise zu einem größeren Ganzen und sieht das Muster hinter den Sternen.',
      ability: 'Erkennt Zusammenhänge über Epochen hinweg.', hair: 'short-dark', face: 'goggles',
      accessory: 'goggles', skin: '#e8b890', hairColor: '#2a2018'
    },
    {
      id: 'nova-03', teamId: 'nova', codename: 'NORDLICHT', era: 'Wikingerzeit · Fjordlager',
      role: 'Team-Scout', description: 'Bleibt neugierig und entdeckt neue Perspektiven, wo andere nur das Offensichtliche sehen.',
      ability: 'Erkundet neue Orte besonders aufmerksam.', hair: 'long-black', face: 'glasses',
      accessory: 'earpiece', skin: '#f0c8a0', hairColor: '#101018'
    },
    {
      id: 'nova-04', teamId: 'nova', codename: 'NEUTRINO', era: 'Zukunft · Forschungskuppel',
      role: 'Feldforscher', description: 'Probiert Ideen aus und lernt aus jedem Fund, bis das Team die Lösung in der Hand hält.',
      ability: 'Macht aus Beobachtungen neue Lösungen.', hair: 'curly', face: 'plain',
      accessory: 'earpiece', skin: '#6b4028', hairColor: '#121010'
    },
    // ===== ECLIPSE (VIOLETT) — Figuren 13–16 =====
    {
      id: 'eclipse-01', teamId: 'eclipse', codename: 'MONDFAHRT', era: 'Barock · Nachtobservatorium',
      role: 'Nacht-Archivarin', description: 'Findet im Schatten die Hinweise, die den Fall lösen, und liest Spuren, die andere verpassen.',
      ability: 'Arbeitet sicher bei schwachem Licht.', hair: 'bob', face: 'plain',
      accessory: 'earpiece', skin: '#f0c8a0', hairColor: '#a040d0'
    },
    {
      id: 'eclipse-02', teamId: 'eclipse', codename: 'DÄMMERUNG', era: 'Zukunft · Chrono-Kommando',
      role: 'Taktiker', description: 'Plant ruhig und hält das Team auch unter Druck zusammen, wenn jede Sekunde zählt.',
      ability: 'Koordiniert mehrere Zeitspuren gleichzeitig.', hair: 'long-violet', face: 'plain',
      accessory: 'earpiece', skin: '#d8a878', hairColor: '#6a3090'
    },
    {
      id: 'eclipse-03', teamId: 'eclipse', codename: 'FINSTERNIS', era: 'Viktorianisches Zeitalter · Archiv',
      role: 'Codeknackerin', description: 'Liest verschlüsselte Botschaften mit scharfem Blick und knackt jedes Geheimnis.',
      ability: 'Entschlüsselt alte und neue Codes.', hair: 'beanie', face: 'plain',
      accessory: 'earpiece', skin: '#f0c8a0', hairColor: '#2a1a2a'
    },
    {
      id: 'eclipse-04', teamId: 'eclipse', codename: 'NACHTWACHE', era: 'Antike · Sternentempel',
      role: 'Wächter', description: 'Schützt wichtige Funde und denkt an das ganze Team, wenn die Nacht hereinbricht.',
      ability: 'Bewahrt Ruhe, wenn andere Spuren verschwinden.', hair: 'short-black', face: 'beard',
      accessory: 'earpiece', skin: '#e8b890', hairColor: '#14141c'
    }
  ];

  return Object.freeze({ TEAMS, CHARACTERS });
});
