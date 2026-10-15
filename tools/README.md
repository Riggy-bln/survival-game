# So entsteht das neue Level

1. **Gelände zeichnen** im Karteneditor (Menü: MAP EDITOR, nur auf localhost). Mit `SAVE` landet die Skizze in `editor/karte.json`
   (dafür muss `python3 speichern.py` laufen).
2. **Spieldesign** steht in `tools/entwurf.py`: Gegner, Gegenstände, Leitern, Brücken, Fahnen und Hinweise, geordnet in Akte. Die Zahlen sind
   Zellen der Skizze (`cx` = Spalte, `r` = Zeile der Oberseite der Fläche, auf der etwas steht). Der Kopf der Datei beschreibt den Spielbogen.
3. **Level erzeugen**: im Projektordner `python3 tools/level_aus_karte.py` ausführen. Das schreibt `src/levels/LevelNeu.js`.
   Wird etwas auf eine Stelle ohne Boden gesetzt, nennt das Programm die Stelle und die Flächen in der Nähe.
4. Im Browser neu laden. `?level=alt` in der Adresse zeigt das frühere lange Level.

Prüfen, ob alles erreichbar ist: Die Hilfsprogramme `reach.py` und `pruef.py` aus dem Arbeitsordner lesen die erzeugten Daten
(`python3 tools/level_aus_karte.py <datei>.json` schreibt sie zusätzlich als JSON).
