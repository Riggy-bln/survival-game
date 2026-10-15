# Wandelt die Skizze aus dem Karteneditor (editor/karte.json) in Spielblöcke um.
# Zellen sind 56 x 56 Pixel groß. Die Oberfläche der Skizze (cy = 0) liegt im Spiel auf der Höhe BODEN. Links bleiben zwei Zellen Rand.
import json

Z = 56
BODEN = 1000            # Höhe der Oberfläche im neuen Level (oben ist Platz für die Inseln: 16 Zellen = 896 Pixel)
RAND = 2                # Zellen Rand links
MAXH = 12               # höchste zusammengefasste Erdscholle (Zellen): Die Erdtextur wird nur bis 760 Pixel Tiefe gemalt
FARBE = {'e': 0x4b3b2a, 's': 0x5e5a55, 'h': 0x6b4a2a}

def lade(pfad):
    d = json.load(open(pfad, encoding='utf-8'))
    return d, {(b[0], b[1]): b[2] for b in d['bloecke']}

def welt_x(cx): return (cx + RAND) * Z
def welt_y(cy): return BODEN + cy * Z

def rechtecke(bloecke):
    """Fasst Zellen zu Rechtecken zusammen. Jedes Rechteck hat eine Oberseite, die entweder ganz frei (Gras) oder ganz bedeckt ist:
    Zeilenläufe werden nach 'Oberseite frei' getrennt, und senkrecht wird nur mit nicht freien Zeilen weiterverschmolzen."""
    nach_typ = {}
    for (c, r), t in bloecke.items():
        if t != 'h': nach_typ.setdefault(t, set()).add((c, r))      # Holzplanken sind dünne Böden (siehe planken)
    ergebnis = []
    for t, zellen in nach_typ.items():
        zeilen = {}
        for c, r in zellen: zeilen.setdefault(r, []).append(c)
        laeufe = {}                                   # (c0, c1, frei) -> Zeilen
        for r, cs in zeilen.items():
            cs.sort(); a = p = cs[0]; fa = (c := cs[0], r - 1) not in bloecke
            for c in cs[1:] + [None]:
                fc = None if c is None else ((c, r - 1) not in bloecke)
                if c is None or c != p + 1 or fc != fa:
                    laeufe.setdefault((a, p, fa), []).append(r)
                    if c is not None: a = c; fa = fc
                if c is not None: p = c
        for (c0, c1, frei), rs in laeufe.items():
            rs.sort(); a = p = rs[0]
            # eine freie Oberseite gehört nur zur obersten Zeile eines Rechtecks; darunter geht es mit nicht freien Zeilen weiter -> Läufe nach 'frei' getrennt:
            for r in rs[1:] + [None]:
                if r is None or r != p + 1 or r - a + 1 > MAXH:
                    ergebnis.append((c0, c1, a, p, t, frei))
                    if r is not None: a = r
                if r is not None: p = r
    # Senkrechte Fortsetzung: Ein freier Lauf (nur Gras oben) wird mit direkt darunterliegenden bedeckten Läufen gleicher Breite verschmolzen.
    bedeckt = {}
    for c0, c1, r0, r1, t, frei in ergebnis:
        if not frei: bedeckt.setdefault((c0, c1, t), []).append([r0, r1])
    fertig = []
    benutzt = set()
    for c0, c1, r0, r1, t, frei in sorted(ergebnis, key=lambda e: (e[4], e[0], e[2])):
        if frei:
            ende = r1
            for k in bedeckt.get((c0, c1, t), []):
                if k[0] == ende + 1 and (c0, c1, t, k[0]) not in benutzt and ende - r0 + 1 + (k[1] - k[0] + 1) <= MAXH:
                    benutzt.add((c0, c1, t, k[0])); ende = k[1]
            fertig.append((c0, c1, r0, ende, t, True))
    for c0, c1, r0, r1, t, frei in ergebnis:
        if not frei and (c0, c1, t, r0) not in benutzt: fertig.append((c0, c1, r0, r1, t, False))
    return fertig

def planken(bloecke):
    """Holzböden: dünne Planken (20 Pixel) oben in der Zelle, zusammenhängende Zellen einer Zeile zu einer Planke verbunden."""
    byrow = {}
    for (c, r), t in bloecke.items():
        if t == 'h': byrow.setdefault(r, []).append(c)
    liste = []
    for r, cs in sorted(byrow.items()):
        cs.sort(); a = p = cs[0]
        for c in cs[1:] + [None]:
            if c is None or c != p + 1:
                l, rr = welt_x(a), welt_x(p + 1)
                liste.append({'x': (l + rr) / 2, 'y': welt_y(r) + 10, 'w': rr - l, 'h': 20, 'color': 0x6b4a2a})
                if c is not None: a = c
            if c is not None: p = c
    return liste

def platten(bloecke):
    liste = planken(bloecke)
    for c0, c1, r0, r1, t, frei in rechtecke(bloecke):
        l, r = welt_x(c0), welt_x(c1 + 1); o, u = welt_y(r0), welt_y(r1 + 1)
        p = {'x': (l + r) / 2, 'y': (o + u) / 2, 'w': r - l, 'h': u - o, 'color': FARBE[t]}
        if t == 'e': p['gras'] = bool(frei)          # nur Schollen mit freier Oberseite bekommen eine Grasschicht
        liste.append(p)
    return liste

def flaechen(bloecke):
    """Alle begehbaren Oberseiten: Liste (c0, c1, r) von Zellspalten mit freier Luft darüber (zusammenhängende Läufe je Zeile)."""
    byrow = {}
    for (c, r) in bloecke:
        if (c, r - 1) not in bloecke: byrow.setdefault(r, []).append(c)
    segs = []
    for r, cs in sorted(byrow.items()):
        cs.sort(); a = p = cs[0]
        for c in cs[1:] + [None]:
            if c is None or c != p + 1:
                segs.append((a, p, r))
                if c is not None: a = c
            if c is not None: p = c
    return sorted(segs)
