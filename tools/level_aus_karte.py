#!/usr/bin/env python3
# Erzeugt das neue Level aus der Skizze des Karteneditors:
#   editor/karte.json  (Gelände, Start, Fahnen)  +  tools/entwurf.py (Gegner, Gegenstände, Leitern, Schilder: das Spieldesign)
#   -> src/levels/LevelNeu.js (wird vom Spiel geladen)
# Aufruf im Projektordner:  python3 tools/level_aus_karte.py
# Danach im Browser neu laden. Ändert man die Skizze im Editor (SAVE) oder den Entwurf, einfach den Befehl wiederholen.
import json, os, sys
HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
import terrain as T
import entwurf

WURZEL = os.path.dirname(HIER)
Z = T.Z

def _sicher(fn):
    """Fehler (keine Oberfläche an der Stelle) sammeln, statt beim ersten abzubrechen: So sieht man alle Probleme auf einmal."""
    def umhuellt(self, *a, **k):
        try: return fn(self, *a, **k)
        except ValueError as e: self.fehler.append(f'{fn.__name__}{a}: {e}')
    return umhuellt

class Bau:
    """Hilfsfunktionen zum Platzieren in Zellkoordinaten. cx = Spalte, r = Zeile der OBERSEITE des Blocks, auf dem etwas steht."""
    def __init__(self, daten, bloecke):
        self.daten, self.bloecke = daten, bloecke
        self.flaechen = T.flaechen(bloecke)
        self.platforms = T.platten(bloecke)
        self.enemies, self.rangedEnemies, self.skelette, self.pickups, self.faesser = [], [], [], [], []
        self.leitern, self.signs, self.decor, self.flaggen, self.bruecken = [], [], [], [], []
        self.hoehlen, self.lampen = [], []
        self.fehler = []
        self.notizen = []                                   # Hinweise für die Dokumentation (werden nicht ins Spiel übernommen)
        self.start = None; self.ziel = None

    # --- Koordinaten ---
    def x(self, cx): return T.welt_x(cx) + Z // 2
    def y(self, r): return T.welt_y(r)                      # y der Oberseite von Zeile r
    def flaeche(self, cx, r):
        for a, b, rr in self.flaechen:
            if rr == r and a <= cx <= b: return a, b
        nah = [(rr, a, b) for a, b, rr in self.flaechen if a - 3 <= cx <= b + 3]
        raise ValueError(f'Keine Oberfläche bei Spalte {cx}, Zeile {r}. In der Nähe: ' + ', '.join(f'{a}-{b}@{rr}' for rr, a, b in sorted(nah)))
    def patrouille(self, cx, r, links=None, rechts=None):
        a, b = self.flaeche(cx, r)
        l = T.welt_x(a) + 40 if links is None else self.x(links)
        rr = T.welt_x(b + 1) - 40 if rechts is None else self.x(rechts)
        if l >= rr: l = rr = (T.welt_x(a) + T.welt_x(b + 1)) / 2
        return l, rr

    # --- Gegner ---
    def _gegner(self, liste, cx, r, links, rechts, hp, dx=0):
        l, rr = self.patrouille(cx, r, links, rechts)
        liste.append({'x': self.x(cx) + dx, 'y': self.y(r) - 30, 'left': l, 'right': rr, 'hp': hp})
    @_sicher
    def soldat(self, cx, r, hp=3, links=None, rechts=None, dx=0): self._gegner(self.enemies, cx, r, links, rechts, hp, dx)
    @_sicher
    def schuetze(self, cx, r, hp=3, links=None, rechts=None, dx=0): self._gegner(self.rangedEnemies, cx, r, links, rechts, hp, dx)
    @_sicher
    def skelett(self, cx, r, hp=3, links=None, rechts=None, dx=0): self._gegner(self.skelette, cx, r, links, rechts, hp, dx)
    @_sicher
    def schwer(self, cx, r, hp=8, links=None, rechts=None, dx=0): self._gegner(self.enemies, cx, r, links, rechts, hp, dx)

    # --- Gegenstände ---
    @_sicher
    def item(self, typ, cx, r, dx=0):
        self.flaeche(cx, r)
        self.pickups.append({'x': self.x(cx) + dx, 'y': self.y(r) - (12 if typ == 'sword' else 10), 'type': typ})
    @_sicher
    def fass(self, cx, r, dx=0):
        self.flaeche(cx, r)
        self.faesser.append({'x': self.x(cx) + dx, 'y': self.y(r) - 19})

    # --- Klettern, Hinweise, Fahnen ---
    def leiter(self, cx, r_oben, r_unten, seite, art='holz'):
        """Leiter in Spalte cx von der Oberseite der Zeile r_oben (hier steigt man aus) bis zur Oberseite der Zeile r_unten.
        seite: +1 = die obere Fläche liegt rechts der Leiter, -1 = links."""
        self.leitern.append({'x': self.x(cx), 'oben': self.y(r_oben), 'unten': self.y(r_unten), 'seite': seite, 'art': art, 'ausX': Z, 'breite': Z})
    def schild(self, cx, r, text, hoch=90): self.signs.append({'x': self.x(cx), 'y': self.y(r) - hoch, 'text': text})
    def fahne(self, cx, r): self.flaggen.append({'x': self.x(cx), 'y': self.y(r)})
    def klotz(self, cx0, r0, cx1, r1, farbe=0x6b5b3a, **extra):
        """Ein fester Block (Kiste, Deckung) in Zellen: von Spalte cx0 bis cx1, Zeile r0 bis r1 (Zeilen = Zellen, die er füllt)."""
        l, rr, o, u = T.welt_x(cx0), T.welt_x(cx1 + 1), T.welt_y(r0), T.welt_y(r1 + 1)
        p = {'x': (l + rr) / 2, 'y': (o + u) / 2, 'w': rr - l, 'h': u - o, 'color': farbe}; p.update(extra); self.platforms.append(p)
    def planke(self, cx0, cx1, r, bruecke=True):
        """Ein dünner Holzboden (20 Pixel dick) von Spalte cx0 bis cx1 auf der Höhe der Oberseite von Zeile r (zum Überqueren von Lücken)."""
        l, rr = T.welt_x(cx0), T.welt_x(cx1 + 1)
        self.platforms.append({'x': (l + rr) / 2, 'y': self.y(r) + 10, 'w': rr - l, 'h': 20, 'color': 0x6b4a2a})
        if bruecke: self.bruecken.append({'art': 'seil', 'stuecke': [[l, rr, self.y(r)]]})
    def deckung(self, cx, r, breite=2, art='sand', hoehe=1):
        """Zerstörbare Deckung (Sandsäcke, Kisten) auf der Fläche Zeile r: breite Zellen breit, hoehe Halbzellen (28 Pixel) hoch."""
        l, rr = T.welt_x(cx), T.welt_x(cx + breite)
        h = hoehe * 28
        self.platforms.append({'x': (l + rr) / 2, 'y': self.y(r) - h / 2, 'w': rr - l, 'h': h,
                               'color': {'sand': 0xb59f6a, 'kiste': 0x7a6540, 'beton': 0x7d8185, 'holz': 0x7a5a2e}[art],
                               'brechbar': True, 'hp': {'sand': 5, 'kiste': 3, 'beton': 9, 'holz': 4}[art], 'art': art, 'deckung': True})
    def hoehle(self, cx0, cx1, r_oben, r_unten, art='tunnel', stil='feucht', **extra):
        """Ein dunkler Hintergrund für Gänge und Höhlen (von Spalte cx0 bis cx1, von Zeile r_oben bis Zeile r_unten, jeweils Oberseite)."""
        h = {'links': T.welt_x(cx0), 'rechts': T.welt_x(cx1 + 1), 'oben': self.y(r_oben), 'unten': self.y(r_unten), 'art': art, 'stil': stil}; h.update(extra); self.hoehlen.append(h)
    def lampe(self, cx, r): self.lampen.append({'x': self.x(cx), 'y': self.y(r) + 20})
    def notiz(self, text): self.notizen.append(text)

def hoehlen_hintergrund(b, bloecke):
    """Überall, wo über einer Luftzelle irgendwo in ihrer Spalte Gelände liegt (Decke, egal wie hoch), kommt ein Höhlenhintergrund hin:
    So wirken auch frei schwebende Inseln wie aufgeschnittene Berge mit Höhlen. Die Luft unter der Decke reicht bis zum nächsten Boden darunter
    (oder bis zur untersten Zeile der Karte). Zellen, die schon ein eigener Hintergrund aus dem Entwurf abdeckt, werden übersprungen."""
    cs = [c for c, r in bloecke]; rs = [r for c, r in bloecke]
    c0, c1, r_max = min(cs), max(cs), max(rs)
    schon = set()
    for h in b.hoehlen:                                   # vom Entwurf angelegte Hintergründe (Zellen aus den Weltkoordinaten zurückrechnen)
        a, e = round(h['links'] / Z) - T.RAND, round(h['rechts'] / Z) - T.RAND - 1
        o, u = round((h['oben'] - T.BODEN) / Z), round((h['unten'] - T.BODEN) / Z) - 1
        for c in range(a, e + 1):
            for r in range(o, u + 1): schon.add((c, r))
    bg = set()
    for c in range(c0, c1 + 1):
        gesehen = False
        for r in range(min(rs), r_max + 1):
            if (c, r) in bloecke: gesehen = True; continue
            if gesehen and (c, r) not in schon: bg.add((c, r))
    # rechteckig zusammenfassen: Läufe je Zeile, senkrecht verschmolzen; Stücke höchstens 30 x 20 Zellen (Texturgröße)
    laeufe = {}
    for r in sorted({r for c, r in bg}):
        zs = sorted(c for c, rr in bg if rr == r)
        a = p = zs[0]
        for c in zs[1:] + [None]:
            if c is None or c != p + 1:
                laeufe.setdefault((a, p), []).append(r)
                if c is not None: a = c
            if c is not None: p = c
    luft = lambda c, r: (c, r) not in bloecke and (c, r) not in bg
    n = 0
    for (a, e), zeilen in laeufe.items():
        zeilen.sort(); x0 = p = zeilen[0]
        for r in zeilen[1:] + [None]:
            if r is None or r != p + 1 or p - x0 + 1 >= 20:
                for ca in range(a, e + 1, 30):
                    ce = min(e, ca + 29)
                    offen = []
                    if any(luft(ca - 1, rr) for rr in range(x0, p + 1)) and ca == a: offen.append('links')
                    if any(luft(ce + 1, rr) for rr in range(x0, p + 1)) and ce == e: offen.append('rechts')
                    if any(luft(cc, p + 1) for cc in range(ca, ce + 1)): offen.append('unten')
                    # Nähte vermeiden: Der Hintergrund ragt 14 Pixel unter angrenzende Blöcke und in Nachbarstücke (die Erde liegt davor);
                    # nur an offener Luft endet er genau an der Kante (dort löst ihn der Zeichner verpixelt auf)
                    b.hoehle(ca, ce, x0, p + 1, art='tunnel', stil='schlicht', offen=offen)
                    h = b.hoehlen[-1]
                    if 'links' not in offen: h['links'] -= 14
                    if 'rechts' not in offen: h['rechts'] += 14
                    h['oben'] -= 14
                    if 'unten' not in offen: h['unten'] += 14
                    n += 1
                if r is not None: x0 = r
            if r is not None: p = r
    # Lampen: alle 9 Zellen in jeder zusammenhängenden Höhle, in der Höhe der Decke
    return n

def main():
    daten, bloecke = T.lade(os.path.join(WURZEL, 'editor', 'karte.json'))
    b = Bau(daten, bloecke)
    for d in daten['dinge']:
        if d['t'] == 'start': b.start = (d['cx'], d['cy'] + 1)
        elif d['t'] == 'fahne': b.fahne(d['cx'], d['cy'] + 1)
        elif d['t'] == 'ziel': b.ziel = (d['cx'], d['cy'] + 1)
    entwurf.entwerfe(b)
    if b.fehler:
        print('\n'.join(b.fehler)); raise SystemExit(f'{len(b.fehler)} Platzierungen ohne passende Oberfläche (siehe oben)')
    hoehlen_hintergrund(b, bloecke)
    if b.ziel is None: raise SystemExit('Kein Ziel (Hubschrauber) in der Skizze oder im Entwurf')
    breite = max(p['x'] + p['w'] / 2 for p in b.platforms) + 4 * Z
    hoehe = max(p['y'] + p['h'] / 2 for p in b.platforms) + 2 * Z
    sx, sy = b.start
    level = {
        'width': int(breite), 'height': int(hoehe), 'boden': T.BODEN, 'abschnitt': 1 / 3, 'sperre': [], 'titel': 'CHAPTER 1 - BROKEN CANOPY', 'einstieg': 'CHAPTER 1: BROKEN CANOPY\nReach the helicopter at the end of the jungle', 'abschluss': 'CHAPTER 1 COMPLETE: Broken Canopy', 'abschlussHinweis': 'Enter: play again and beat your time (can you get rank S?)',
        'erdVerlauf': {'boden': T.BODEN, 'hell': 0.95, 'rate': 0.55, 'min': 0.42},
        'start': {'x': b.x(sx), 'y': b.y(sy) - 60},
        'goalX': b.x(b.ziel[0]), 'goalY': b.y(b.ziel[1]),
        'platforms': b.platforms, 'decor': b.decor, 'signs': b.signs,
        'enemies': b.enemies, 'rangedEnemies': b.rangedEnemies, 'skelette': b.skelette, 'brutlinge': [],
        'flaggen': b.flaggen, 'pickups': b.pickups, 'faesser': b.faesser, 'bruecken': b.bruecken, 'treppen': [], 'wracks': [],
        'geruest': [], 'schachtkoepfe': [], 'leitern': b.leitern, 'tuerme': [], 'huegelformen': [], 'hoehlen': b.hoehlen, 'lampen': b.lampen,
    }
    kopf = ('// AUTOMATISCH ERZEUGT von tools/level_aus_karte.py (aus editor/karte.json und tools/entwurf.py). Nicht von Hand ändern:\n'
            '// Änderungen gehören in die Skizze (Karteneditor) oder in tools/entwurf.py. Dann den Befehl  python3 tools/level_aus_karte.py  wiederholen.\n')
    open(os.path.join(WURZEL, 'src', 'levels', 'LevelNeu.js'), 'w', encoding='utf-8').write(kopf + 'export default ' + json.dumps(level, ensure_ascii=False, indent=0) + ';\n')
    # für die Prüfwerkzeuge (Erreichbarkeit): dieselben Daten als JSON im Arbeitsordner, falls angegeben
    if len(sys.argv) > 1: json.dump(level, open(sys.argv[1], 'w'))
    print(f'LevelNeu.js: {len(b.platforms)} Blöcke, {len(b.enemies) + len(b.rangedEnemies) + len(b.skelette)} Gegner, {len(b.pickups)} Gegenstände, {len(b.leitern)} Leitern, {len(b.flaggen)} Fahnen')

if __name__ == '__main__': main()
