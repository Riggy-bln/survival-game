# Survival Game

Ein 2D-Action-Survival-Spiel im Browser (Phaser 3, JavaScript). Level 01: Verlassene Militärzone.

## Steuerung
- **A / D** oder Pfeiltasten: Laufen, **Leertaste**: Springen
- **Maus**: Zielen, **linke Maustaste**: Schießen (gedrückt halten = Dauerfeuer)
- **R**: Nachladen, **H**: Verbandskasten, **G**: Granate
- **Esc**: Pause, **N**: Ton an/aus, **Enter**: Neustart nach Sieg oder Niederlage

## Waffen
Man startet mit Fäusten und 5 Wurfmessern (die man nach dem Wurf wieder einsammelt). Schusswaffen liegen im Level; man trägt aber immer nur **eine**.
Findet man eine zweite, zeigt das Spiel "E: swap". Mit E öffnet sich der Waffentausch: die neue nehmen (die alte bleibt am Boden, mit ihrer Munition) oder die alte behalten.
Plätze der Leiste: 1 Wurfmesser, 2 Schusswaffe (Pistole, Maschinengewehr, Schrotflinte, Raketenwerfer oder Flammenwerfer), 3 Faust/Schwert, 4 Granate, 5 Verbandskasten (Tasten 1-5 oder Mausrad).
- **Wo die Waffen liegen:** `src/WaffenPlatzierung.js` (je Level eine Liste mit Waffen, Hinweisschildern und Entdeckungs-Zonen; dort steht auch der Plan). Mit `?debug=1` zeigt das Spiel die Position von Spieler und Maus.
- **Zahlen und Balancing** (Startmesser, Schaden, Munition, Feuerrate, Treibstoff): `src/WaffenKonfig.js`.
- **Blut, Gore und Treffer-Klang:** `src/TrefferKonfig.js`.
- Testen: `?waffe=rocket` beginnt mit einer Waffe in der Hand (pistol, rifle, shotgun, rocket, flame).

## Lokal starten
```
python3 server.py
```
Dann http://localhost:8001 öffnen. (Direktes Öffnen von `index.html` funktioniert nicht, weil der Browser ES-Module von `file://` blockiert.)

## Technik
Phaser 3.80 (liegt in `libs/`), Arcade-Physik, ES-Module. Alle Grafiken werden im Code erzeugt. Die meisten Sounds werden ebenfalls live berechnet; nur das Gewehr (AK-47: Schüsse und Nachladen) nutzt echte Aufnahmen aus `sounds/` (Quellen und Lizenzen: `sounds/LICENSES.md`, Lautstärke und Dateien: `SAMPLES` und `LAUTSTAERKE` in `src/Sound.js`).
