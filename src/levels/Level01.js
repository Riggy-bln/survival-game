// Level 01: Verlassene Militärzone (9000 Pixel breit).
// Die Datei enthält fast nur DATEN. Kleine Hilfsfunktionen sorgen dafür, dass wir
// Hügel, Plattformen, Gegner und Gegenstände mit einfachen Angaben setzen können.
//
// Koordinaten: x = waagerecht, y = senkrecht (0 oben, 1100 unten). Die Oberfläche liegt bei y = BODEN.
// Alle Höhen werden relativ zu BODEN angegeben: BODEN - 100 liegt 100 Pixel ÜBER der Oberfläche.
// Der Spieler springt etwa 150 Pixel hoch und rund 280 Pixel weit.
// Deshalb gilt in diesem Level: Stufen sind höchstens 100 hoch, Lücken höchstens 150 breit.

const HOEHE = 1100;  // Höhe der ganzen Welt: oben Platz für Gebäude, unten für Tunnel
const BODEN = 760;   // Höhe der Oberfläche (Oberkante des Bodens)

// Farben
const ERDE = 0x5b4a35;
const BETON = 0x6a6f73;
const BUNKER = 0x45494d;
const SAND = 0x8a7a55;
const GRAU = 0x5a5a5a;
const OLIV = 0x4a5238;
const FELS = 0x5e5a55;   // Fels (grauer Stein, ohne Gras)

// Die Listen, die am Ende exportiert werden. Die Hilfsfunktionen füllen sie.
const platforms = [];
const decor = [];
const enemies = [];
const rangedEnemies = [];
const pickups = [];
const signs = [];

// ---- Der Untergrund: Erde mit einem Tunnel (siehe ZONE T) ----
const BREITE = 9000;            // Breite der Welt
const TUNNEL_LINKS = 2740;      // linke Kante des Tunnels (linker Schacht beginnt hier)
const TUNNEL_RECHTS = 4220;     // rechte Kante (rechter Schacht endet hier)
const SCHACHT = 260;            // Breite eines Schachts
const EINGANG = TUNNEL_LINKS + 200;   // hier beginnt die Felsdecke: der Höhleneingang (x 2940)
const VERLIES_ENDE = 4780;      // Ende der Waffenkammer: der Tunnel geht HINTER dem Ausgang noch weiter
const DECKE = 60;               // Dicke der Tunneldecke (Oberfläche bis Unterkante der Decke)
const TUNNEL_BODEN = 990;       // y der Oberkante des Tunnelbodens (230 unter der Oberfläche)

// erde: ein Erdblock von "links" bis "rechts" und von "oben" bis "unten" (alles Kanten, keine Mitte).
const erde = (links, rechts, oben, unten, farbe = 0x4b3b2a) =>
    platforms.push({ x: (links + rechts) / 2, y: (oben + unten) / 2, w: rechts - links, h: unten - oben, color: farbe });

erde(0, TUNNEL_LINKS, BODEN, HOEHE);                                              // Erde links vom Tunnel
erde(EINGANG, TUNNEL_RECHTS - SCHACHT, BODEN, BODEN + DECKE);                     // Decke über dem Tunnel (beginnt am Höhleneingang)
erde(TUNNEL_LINKS, VERLIES_ENDE, TUNNEL_BODEN, HOEHE);                            // Boden des Tunnels (bis zur Waffenkammer)
erde(TUNNEL_RECHTS, VERLIES_ENDE, BODEN, BODEN + DECKE);                          // Decke über der Waffenkammer
erde(VERLIES_ENDE, BREITE, BODEN, HOEHE);                                         // Erde rechts hinter der Kammer

// huegel: ein fester Block, der AUF DEM BODEN steht. Angabe: linke Kante, Höhe, Breite.
// Aus der Höhe wird die Mitte berechnet (Rechtecke werden von ihrer Mitte aus gezeichnet).
const huegel = (links, hoehe, breite, farbe = ERDE) =>
    platforms.push({ x: links + breite / 2, y: BODEN - hoehe / 2, w: breite, h: hoehe, color: farbe });

// schwebend: eine dünne Plattform in der Luft. Angabe: linke Kante, y der OBERKANTE, Breite.
const schwebend = (links, oben, breite, farbe = BETON) =>
    platforms.push({ x: links + breite / 2, y: oben + 10, w: breite, h: 20, color: farbe });

// Gegner. "oben" = y der Fläche, auf der er steht (Standard: der Boden).
// left/right begrenzen seine Patrouille, hp sind seine Lebenspunkte.
const nahkaempfer = (x, links, rechts, hp = 3, oben = BODEN) =>
    enemies.push({ x, y: oben - 30, left: links, right: rechts, hp });
const fernkaempfer = (x, links, rechts, hp = 3, oben = BODEN) =>
    rangedEnemies.push({ x, y: oben - 30, left: links, right: rechts, hp });

// Gegenstände: "oben" = y der Fläche, auf der sie liegen.
const munition = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'ammo' });
const heilung = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'health' });
const schrotflinte = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'shotgun' });
const granate = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'grenade' });
const waffe = (x, oben = BODEN) => pickups.push({ x, y: oben - 10, type: 'rifle' });   // das Sturmgewehr

// Dekoration (ohne Physik)
const stacheldraht = (x) => {
    decor.push({ x: x, y: BODEN - 15, w: 6, h: 30, color: 0x555555 });
    decor.push({ x: x + 60, y: BODEN - 15, w: 6, h: 30, color: 0x555555 });
    decor.push({ x: x + 30, y: BODEN - 22, w: 60, h: 3, color: 0x999999 });
    decor.push({ x: x + 30, y: BODEN - 10, w: 60, h: 3, color: 0x999999 });
};
const versorgungspunkt = (x) => {
    decor.push({ x: x, y: BODEN - 20, w: 70, h: 40, color: 0x5b4a2e });        // Kiste
    decor.push({ x: x, y: BODEN - 20, w: 24, h: 6, color: 0xdd3333 });         // rotes Kreuz
    decor.push({ x: x, y: BODEN - 20, w: 6, h: 24, color: 0xdd3333 });
    decor.push({ x: x, y: BODEN - 60, w: 6, h: 40, color: 0x555555 });         // Fahnenmast
    decor.push({ x: x + 16, y: BODEN - 72, w: 26, h: 14, color: 0xdd3333 });   // Fahne
    signs.push({ x: x, y: BODEN - 105, text: 'Versorgungspunkt' });
};

// Tunnelblock: ein fester Block, der auf dem TUNNELBODEN steht (Kisten, Stufen).
const tunnelblock = (links, hoehe, breite, farbe = 0x6b5b3a) =>
    platforms.push({ x: links + breite / 2, y: TUNNEL_BODEN - hoehe / 2, w: breite, h: hoehe, color: farbe });

// treppe: Stufen, die nach RECHTS ansteigen. Jede Stufe ist "stufe" Pixel höher als die vorige.
// Die Stufen sind dünne Platten (20 Pixel), keine massiven Blöcke: Darunter bleibt Platz,
// sodass man im Tunnel unter der Treppe hindurch weiter nach rechts gehen kann.
const treppe = (links, anzahl, breite, stufe) => {
    for (let i = 0; i < anzahl; i++) {
        const oben = TUNNEL_BODEN - (i + 1) * stufe;     // Oberkante dieser Stufe
        platforms.push({ x: links + i * breite + breite / 2, y: oben + 10, w: breite, h: 20, color: 0x5a4d3a });
    }
};

// dunkel: ein dunkles Rechteck als Hintergrund (Tunnelinneres), gezeichnet hinter allem.
const dunkel = (links, rechts, oben, unten, farbe = 0x14181b) =>
    decor.push({ x: (links + rechts) / 2, y: (oben + unten) / 2, w: rechts - links, h: unten - oben, color: farbe });

// =====================================================================
// ZONE A: Einstieg (x 0 bis 1400). Ruhig, mit niedrigen Hindernissen zum Üben.
// =====================================================================
signs.push({ x: 150, y: BODEN - 80, text: 'A / D: Laufen\nLeertaste: Springen\nR: Nachladen\nH: Verbandskasten benutzen' });
munition(180);                                   // früh: Einsammeln üben
huegel(250, 30, 100, SAND);                      // Sandsäcke, niedrig
huegel(350, 60, 100, SAND);                      // Sandsäcke, höher
stacheldraht(470);                               // nur Dekoration
huegel(600, 100, 30, GRAU);                      // zerstörte Mauer (100)
huegel(760, 60, 220, OLIV);                      // ausgebranntes Fahrzeug
signs.push({ x: 1000, y: BODEN - 120, text: 'Maus: Zielen\nLinke Taste: Schießen' });
nahkaempfer(1150, 1050, 1350, 3);                // der erste Gegner

// =====================================================================
// ZONE B: Ruine mit zwei Etagen (x 1450 bis 2300).
// Oben (Deck) kämpft ein Schütze, darunter patrouilliert ein Nahkämpfer.
// =====================================================================
huegel(1450, 60, 160, BETON);                    // Stufe zum Deck
schwebend(1600, BODEN - 140, 360);                       // Deck (Oberkante 360), x 1600 bis 1960
schwebend(2010, BODEN - 240, 110);                       // kleines Versteck darüber (Oberkante 260)
fernkaempfer(1780, 1660, 1900, 3, BODEN - 140);          // Schütze auf dem Deck
nahkaempfer(1800, 1650, 1930, 4);                // Nahkämpfer darunter
heilung(2065, BODEN - 240);                              // versteckte Heilung im Versteck
nahkaempfer(2200, 2080, 2330, 3);

// =====================================================================
// ZONE C: Versorgungspunkt 1 (x 2450 bis 2750). Ruhig, ein Atemzug.
// =====================================================================
versorgungspunkt(2600);
heilung(2560);
munition(2640);
granate(1850, BODEN - 140);                     // im Versteck der Ruine

// =====================================================================
// ZONE T: Tunnel unter der Erde (x 2740 bis 4220). Ein ALTERNATIVWEG unter Zone D.
// Zwei Schächte (Löcher im Boden) führen hinunter. Unten ist ein dunkler Gang mit Deckung,
// drei Gegnern und Beute. Wer unten bleibt, umgeht die Schützen auf den Terrassen.
// Aus dem Tunnel kommt man über Stufen wieder hinauf (je Schacht 3 Stufen à 77 Pixel).
// =====================================================================
signs.push({ x: 2680, y: BODEN - 50, text: 'Alternative:\nein Höhleneingang\nführt unter die Erde' });
// ---- Der Höhleneingang: ein Graben mit Stufen führt zu einem Felsüberhang ----
// Statt eines Lochs im Boden geht man in einem offenen Graben (x 2740 bis 2940) zwei Stufen hinab
// (je 77 Pixel) und betritt dann den Tunnel, dessen Felsdecke am Eingang (x 2940) beginnt.
// Über dem Eingang ragt eine Felsstufe auf; vom Rand der Oberfläche führt eine Sprungstrecke von
// 200 Pixeln über den Graben (möglich bis ca. 280).
erde(TUNNEL_LINKS, TUNNEL_LINKS + 100, TUNNEL_BODEN - 153, TUNNEL_BODEN);  // Stufe 1 (Oberkante 837, 77 unter der Oberfläche)
erde(TUNNEL_LINKS + 100, EINGANG, TUNNEL_BODEN - 77, TUNNEL_BODEN);        // Stufe 2 (Oberkante 913)
huegel(EINGANG + 10, 60, 100, FELS);                                       // Felsstufe über dem Eingang (x 2950 bis 3050)
dunkel(TUNNEL_LINKS, EINGANG, BODEN, TUNNEL_BODEN, 0x1d2226);              // Graben (Himmel scheint hinein)
dunkel(EINGANG, EINGANG + 70, BODEN + DECKE, TUNNEL_BODEN, 0x1a1e21);      // Mund der Höhle: Dunkelheit nimmt zu
dunkel(EINGANG + 70, TUNNEL_LINKS + SCHACHT + 200, BODEN + DECKE, TUNNEL_BODEN, 0x161a1d);
// Holzstützen und Deckenbalken im Eingangsbereich
decor.push({ x: (EINGANG + 3500) / 2, y: BODEN + DECKE + 5, w: 3500 - EINGANG, h: 10, color: 0x5a3d22 });    // Balken
for (const sx of [EINGANG + 8, 3110, 3290, 3440]) {
    decor.push({ x: sx, y: (BODEN + DECKE + TUNNEL_BODEN) / 2, w: 10, h: TUNNEL_BODEN - BODEN - DECKE, color: 0x6b4a2a });
    decor.push({ x: sx + 4, y: (BODEN + DECKE + TUNNEL_BODEN) / 2, w: 3, h: TUNNEL_BODEN - BODEN - DECKE, color: 0x4a331d });
}
// Felszähne an der Decke (Stufen, die nach unten schmaler werden) und hängende Ranken
const zapfen = (x, n) => { for (let k = 0; k < n; k++) decor.push({ x: x, y: BODEN + DECKE + 3 + k * 6, w: 18 - k * 5, h: 6, color: 0x4a423a }); };
[22, 62, 104, 146].forEach((d, i) => zapfen(EINGANG + d, 3 - (i % 2)));
[12, 44, 84, 124].forEach((d, i) => decor.push({ x: EINGANG + d, y: BODEN + DECKE + 6 + i * 2, w: 4, h: 12 + i * 4, color: 0x3b5a22 }));
// Lampe am Eingang mit schwachem Lichtschein
decor.push({ x: EINGANG + 70, y: BODEN + DECKE + 52, w: 80, h: 50, color: 0x27261c });
decor.push({ x: EINGANG + 70, y: BODEN + DECKE + 12, w: 2, h: 24, color: 0x222222 });
decor.push({ x: EINGANG + 70, y: BODEN + DECKE + 30, w: 12, h: 9, color: 0xffd866 });
// Reste einer eingestürzten Holzbrücke an beiden Grabenrändern
decor.push({ x: 2756, y: BODEN + 6, w: 32, h: 8, color: 0x6b4a2a });
decor.push({ x: 2776, y: BODEN + 22, w: 8, h: 22, color: 0x4a331d });
decor.push({ x: EINGANG - 16, y: BODEN + 6, w: 32, h: 8, color: 0x6b4a2a });
decor.push({ x: EINGANG - 10, y: BODEN + 20, w: 8, h: 18, color: 0x4a331d });
// Warnschild im Graben und Geröll auf den Stufen
decor.push({ x: 2790, y: TUNNEL_BODEN - 153 - 14, w: 4, h: 28, color: 0x555555 });            // Pfosten
decor.push({ x: 2790, y: TUNNEL_BODEN - 153 - 48, w: 92, h: 40, color: 0x2b2b2b });           // Tafel
decor.push({ x: 2790, y: TUNNEL_BODEN - 153 - 66, w: 92, h: 4, color: 0xc9a227 });            // Warnstreifen
decor.push({ x: 2790, y: TUNNEL_BODEN - 153 - 30, w: 92, h: 4, color: 0xc9a227 });
signs.push({ x: 2790, y: TUNNEL_BODEN - 153 - 48, text: 'EINSTURZ-\nGEFAHR' });
decor.push({ x: 2760, y: TUNNEL_BODEN - 153 - 4, w: 14, h: 8, color: 0x6f695d });
decor.push({ x: 2778, y: TUNNEL_BODEN - 153 - 3, w: 8, h: 6, color: 0x8c8474 });
decor.push({ x: 2900, y: TUNNEL_BODEN - 77 - 4, w: 12, h: 8, color: 0x6f695d });
decor.push({ x: 2920, y: TUNNEL_BODEN - 77 - 3, w: 8, h: 6, color: 0x8c8474 });
dunkel(TUNNEL_LINKS + SCHACHT, TUNNEL_RECHTS - SCHACHT, BODEN + DECKE, TUNNEL_BODEN);  // der Gang
dunkel(TUNNEL_RECHTS - SCHACHT, TUNNEL_RECHTS, BODEN, TUNNEL_BODEN);                  // rechter Schacht
for (let x = 3150; x < VERLIES_ENDE - 40; x += 250) {
    if (x > TUNNEL_RECHTS - SCHACHT - 20 && x < TUNNEL_RECHTS + 20) continue;           // über dem Schacht gibt es keine Decke
    decor.push({ x: x, y: BODEN + DECKE + 8, w: 10, h: 8, color: 0xc9a94e });          // Deckenlampen
}
treppe(TUNNEL_RECHTS - 150, 3, 50, 77);                // Stufen im rechten Schacht (x 4070 bis 4220)
tunnelblock(3480, 40, 80);                             // Kiste A als Deckung (x 3480 bis 3560)
tunnelblock(3720, 60, 80);                             // Kiste B als Deckung (x 3720 bis 3800)
nahkaempfer(3200, 3080, 3420, 4, TUNNEL_BODEN);        // Nahkämpfer am Eingang des Gangs
fernkaempfer(3640, 3590, 3690, 3, TUNNEL_BODEN);       // Schütze zwischen den Kisten
nahkaempfer(3880, 3830, 3940, 4, TUNNEL_BODEN);        // Nahkämpfer vor dem Ausgang
munition(3760, TUNNEL_BODEN - 60);                     // Beute auf Kiste B

// ---- Die Waffenkammer am Ende des Tunnels (x 4220 bis 4780) ----
// Wer den Ausgang nicht nimmt, sondern unter den Stufen weitergeht, findet ein verlassenes Lager:
// ein SCHWERER WÄCHTER (8 Lebenspunkte), Heilung, Munition und das STURMGEWEHR.
dunkel(TUNNEL_RECHTS, VERLIES_ENDE, BODEN + DECKE, TUNNEL_BODEN);                     // Raum der Kammer
signs.push({ x: 4330, y: TUNNEL_BODEN - 120, text: 'Lager 7\n"Aufgegeben. Sie kamen von unten."' });
decor.push({ x: 4290, y: TUNNEL_BODEN - 70, w: 44, h: 32, color: 0x1d5a3a });           // Terminal (Bildschirm)
decor.push({ x: 4290, y: TUNNEL_BODEN - 45, w: 8, h: 18, color: 0x333333 });            // Terminal (Ständer)
decor.push({ x: 4290, y: TUNNEL_BODEN - 30, w: 70, h: 8, color: 0x55482f });            // Tisch
decor.push({ x: 4690, y: TUNNEL_BODEN - 80, w: 6, h: 80, color: 0x3a4046 });            // Waffenregal (Pfosten)
decor.push({ x: 4750, y: TUNNEL_BODEN - 80, w: 6, h: 80, color: 0x3a4046 });
decor.push({ x: 4720, y: TUNNEL_BODEN - 100, w: 66, h: 5, color: 0x3a4046 });           // Waffenregal (Brett)
tunnelblock(4640, 50, 100);                                    // Tisch mit dem Gewehr (x 4640 bis 4740)
nahkaempfer(4440, 4330, 4600, 8, TUNNEL_BODEN);                // der schwere Wächter
heilung(4350, TUNNEL_BODEN);
munition(4540, TUNNEL_BODEN);
waffe(4690, TUNNEL_BODEN - 50);                                // das Sturmgewehr auf dem Tisch

// =====================================================================
// ZONE D: Grabenanlage mit Terrassen (x 3000 bis 3900), steht auf der Tunneldecke.
// Der Graben liegt zwischen zwei Terrassen. Schützen oben, Nahkämpfer unten.
// =====================================================================
signs.push({ x: 3100, y: BODEN - 140, text: 'Gefahr voraus:\nSchützen auf den Terrassen' });
huegel(3050, 90, 140);                           // linke Terrasse, untere Stufe (x 3050 bis 3190)
huegel(3190, 180, 140);                          // linke Terrasse, obere Stufe  (x 3190 bis 3330)
huegel(3530, 180, 140);                          // rechte Terrasse, obere Stufe (x 3530 bis 3670)
huegel(3670, 90, 140);                           // rechte Terrasse, untere Stufe (x 3670 bis 3810)
schwebend(3380, BODEN - 200, 100, GRAU);                 // Brücke über dem Graben
munition(3430, BODEN - 200);                             // Belohnung auf der Brücke
fernkaempfer(3270, 3215, 3305, 3, BODEN - 180);          // Schütze links oben (Oberkante 320)
fernkaempfer(3600, 3555, 3645, 3, BODEN - 180);          // Schütze rechts oben
fernkaempfer(3740, 3695, 3785, 3, BODEN - 90);          // Schütze rechts unten (Oberkante 410)
nahkaempfer(3430, 3350, 3510, 4);                // Nahkämpfer im Graben
huegel(3900, 110, 30, GRAU);                     // hohe Mauer als Deckung

// =====================================================================
// ZONE E: Bunker (x 4100 bis 5600). Eine Pyramide aus drei Etagen zum Überklettern,
// danach ein offenes Feld mit Sandsack-Deckungen.
// =====================================================================
signs.push({ x: 4290, y: BODEN - 130, text: 'Bunker voraus:\nGegner auf mehreren Etagen' });
huegel(4300, 100, 480, BUNKER);                  // untere Etage (Oberkante 400), x 4300 bis 4780
huegel(4400, 200, 300, BUNKER);                  // mittlere Etage (Oberkante 300), x 4400 bis 4700
huegel(4500, 300, 100, BUNKER);                  // Dach (Oberkante 200), x 4500 bis 4600
fernkaempfer(4550, 4520, 4580, 4, BODEN - 300);          // Scharfschütze auf dem Dach
fernkaempfer(4650, 4625, 4680, 3, BODEN - 200);          // Schütze auf der mittleren Etage
// Wichtig: Die Patrouille muss zu den freien Flächen passen. Ein Gegner hat 32 Pixel Breite,
// also reicht er 16 Pixel über seine Grenzen hinaus. Sonst stößt er an die nächste Etage.
nahkaempfer(4350, 4320, 4380, 4, BODEN - 100);           // Nahkämpfer unten links
nahkaempfer(4740, 4725, 4760, 4, BODEN - 100);           // Nahkämpfer unten rechts
munition(4550, BODEN - 300);
granate(6700, BODEN - 300);                     // im Hochhaus (Etage 4)                             // Belohnung auf dem Dach
huegel(4900, 40, 80, SAND);                      // offenes Feld: drei Sandsack-Deckungen
huegel(5100, 40, 80, SAND);
huegel(5300, 40, 80, SAND);
nahkaempfer(5040, 5000, 5080, 3);
nahkaempfer(5240, 5200, 5280, 3);
fernkaempfer(5470, 5400, 5560, 3);               // Schütze hinter den Deckungen
stacheldraht(5560);

// =====================================================================
// ZONE F: Versorgungspunkt 2 (x 5700 bis 6000).
// =====================================================================
versorgungspunkt(5850);
heilung(5810);
munition(5890);

// =====================================================================
// ZONE G: Hochhaus-Ruine (x 6100 bis 7300). Das Gebäude hat sechs Etagen, jede 100 Pixel höher.
// Die Etagen sind im ZICKZACK angeordnet: Auf jeder Etage gibt es eine 120 Pixel breite Lücke
// in der Decke, abwechselnd rechts und links. Man springt durch die Lücke auf die nächste Etage.
//   ungerade Etagen (1, 3, 5): x 6400 bis 6780, Lücke rechts
//   gerade Etagen   (2, 4, 6): x 6520 bis 6900, Lücke links
// Von der 4. Etage führt eine Skybridge nach rechts, ein Abkürzungsweg über den Bodenkämpfen.
// =====================================================================
signs.push({ x: 6200, y: BODEN - 110, text: 'Hochhaus-Ruine:\nGegner auf jeder Etage' });
dunkel(6400, 6900, BODEN - 620, BODEN, 0x22282c);                        // Fassade (Hintergrund)
dunkel(6400, 6420, BODEN - 620, BODEN, 0x3a4046);                        // linker Pfeiler
dunkel(6880, 6900, BODEN - 620, BODEN, 0x3a4046);                        // rechter Pfeiler
for (let etage = 1; etage <= 6; etage++) {
    const links = etage % 2 === 1 ? 6400 : 6520;                         // ungerade links, gerade rechts
    schwebend(links, BODEN - 100 * etage, 380);                          // 380 breit, Oberkante = Etagenhöhe
}
schwebend(6900, BODEN - 400, 250);                                       // Skybridge (Oberkante wie Etage 4)

nahkaempfer(6250, 6170, 6330, 4);                                        // am Eingang, links
nahkaempfer(6590, 6430, 6750, 4, BODEN - 100);                           // Etage 1
fernkaempfer(6700, 6600, 6820, 3, BODEN - 200);                          // Etage 2
nahkaempfer(6590, 6430, 6750, 4, BODEN - 300);                           // Etage 3
fernkaempfer(6700, 6600, 6820, 3, BODEN - 400);                          // Etage 4
fernkaempfer(6590, 6500, 6680, 3, BODEN - 500);                          // Etage 5
fernkaempfer(6780, 6700, 6860, 5, BODEN - 600);                          // Scharfschütze auf dem Dach
fernkaempfer(7050, 6960, 7110, 3, BODEN - 400);                          // auf der Skybridge
nahkaempfer(7100, 6960, 7250, 4);                                        // am Boden, rechts

heilung(6430, BODEN - 300);                                              // Belohnung auf Etage 3 (linkes Ende)
munition(6430, BODEN - 500);                                             // Belohnung auf Etage 5 (linkes Ende)

// =====================================================================
// ZONE H: Vor der Arena (x 7400 bis 7850). Hier rüstet man sich aus.
// =====================================================================
signs.push({ x: 7500, y: BODEN - 100, text: 'Etwas Großes wartet voraus...' });
schrotflinte(7800);                              // Alternative zum Gewehr für den Bosskampf
granate(7500);                                   // vor dem Boss: Granaten aufsparen
heilung(7600);
munition(7660);
munition(7720);

// =====================================================================
// ZONE I: Arena der starken Kreatur (x 7900 bis 8700).
// Drei Plattformen zum Ausweichen. Ihre Unterkante liegt über dem Kopf der Kreatur (Höhe 100),
// sie kann darunter durchlaufen.
// =====================================================================
schwebend(8040, BODEN - 120, 140);
schwebend(8230, BODEN - 170, 140);
schwebend(8420, BODEN - 120, 140);

export default {
    width: 9000,     // Breite der Welt in Pixeln
    height: HOEHE,   // Höhe der Welt in Pixeln
    boden: BODEN,    // Höhe der Oberfläche
    goalX: 8800,     // Mitte des Evakuierungspunkts (Hubschrauber)
    platforms,
    decor,
    signs,
    enemies,
    rangedEnemies,
    boss: { x: 8250, y: BODEN - 60, left: 7980, right: 8650, hp: 50 },
    pickups,
};
