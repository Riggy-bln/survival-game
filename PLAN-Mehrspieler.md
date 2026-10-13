# Plan: Mehrspieler

## Ziel
Das Spiel soll zusammen mit Freunden spielbar sein (Koop gegen die Gegner und den Boss).

## Schritte (jeder Schritt ist einzeln testbar)
1. **Menü** (erledigt): Ein Spieler / Mehrspieler (Online, Lokal). Der Modus steht in `registry` ('modus').
2. **Spieler-Code vorbereiten:** Die Spielerklasse so umbauen, dass es mehrere Spieler geben kann (eigene Farbe, Name, Tasten).
   Eingaben (Laufen, Springen, Zielen, Schießen) werden in einem Eingabe-Objekt gesammelt statt direkt aus der Tastatur gelesen.
3. **Lokaler Koop** (optional, schneller Zwischenschritt): zwei Spieler an einem Computer.
4. **Verbindung:** Zwei Browser verbinden sich direkt (WebRTC, Bibliothek PeerJS). Einer erstellt einen Raum und bekommt einen Code,
   der andere gibt den Code ein.
5. **Synchronisation:** Der Gastgeber (Host) rechnet das ganze Spiel (Gegner, Boss, Treffer). Die Mitspieler schicken nur ihre Eingaben
   und bekommen etwa 20 mal pro Sekunde den Zustand (Positionen, Kugeln, Gegner, Gegenstände).
6. **Spielregeln für mehrere:** gemeinsame Lebensanzeigen, Wiederbeleben, Ziel (alle am Hubschrauber), Schwierigkeit je nach Spielerzahl.
7. **Feinschliff:** Namen, Farben, Verbindungsabbruch, Latenz glätten (Interpolation).

## Stand
- Schritt 1 (Menü): erledigt.
- Schritt 4 (Verbindung / Lobby): erledigt (Raumcode, Spielerliste, Ping).
- Schritt "Mitspieler sehen": erledigt. Alle Spieler laufen im selben Level (noch ohne Gegner im Online-Modus) und sehen einander.
- Gegner/Boss, Schüsse, Schaden, Granaten, Fässer, Wände, Gegenstände, Gefallene + Wiederbeleben (mit Animation), Niederlage, Team-Lebensbalken: erledigt.
- Offen: TURN-Server für schwierige Netzwerke, lokaler Koop, Namen wählen.

## Aufteilung der Verantwortung (Entwurf)
- Jedes Gerät: eigene Figur (Bewegung, Munition, Inventar, Leben) – damit die Steuerung ohne Verzögerung bleibt.
- Gastgeber: Gegner, Boss, Kugeln, Granaten, Fässer, zerstörbare Wände, Schadensberechnung gegen alle Spieler, Sieg und Niederlage.

## Spielregeln (festgelegt)
- **Sieg:** Sobald EIN Spieler den Hubschrauber erreicht (und der Boss besiegt ist), gewinnt das ganze Team. Das gilt auch, wenn die anderen
  gerade nicht mehr leben. (Umgesetzt.)
- **Neustart:** Nur der Gastgeber startet das Spiel für alle neu. (Umgesetzt.)
- **Tod:** Ein toter Spieler scheidet nicht das Spiel aus. Die Lebenden spielen weiter. Niederlage erst, wenn alle tot sind. (Umgesetzt, inkl. Wiederbeleben.)
