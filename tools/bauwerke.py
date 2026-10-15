# Gebäude für das Level: dieselbe Logik wie das Gebäudewerkzeug im Karteneditor (siehe EditorScene.baueGebaeude), aber im Generator:
# Die Gebäude verändern nur die Daten dieses Laufs (Blöcke, Leitern, Hintergrundzonen), NICHT die Skizze in editor/karte.json.
#
# Außenmaße: Spalten c0 bis c1 und Zeilen r0 (Dach) bis r1 (unterster Innenraum, direkt über dem Boden). H = Abstand von Boden zu Boden in Zellen.
# Wände und Dach aus Stein, Böden aus Holzplanken mit abwechselnd links/rechts einem Loch (2 Zellen) und einer Leiter, Türen im Erdgeschoss.

def haus(daten, bloecke, c0, r0, c1, r1, H=4, tuer_links=True, tuer_rechts=True, dachzugang=True):
    if c1 - c0 + 1 < 7 or r1 - r0 < H: raise ValueError(f'Gebäude {c0}-{c1} / {r0}-{r1} ist zu klein')
    for c in range(c0, c1 + 1):
        for r in range(r0, r1 + 1): bloecke.pop((c, r), None)
    for r in range(r0, r1 + 1): bloecke[(c0, r)] = 's'; bloecke[(c1, r)] = 's'
    for c in range(c0, c1 + 1): bloecke[(c, r0)] = 's'
    boeden = []
    s = r1 - (H - 1)
    while s > r0 + 2: boeden.append(s); s -= H
    seite = lambda k: 'rechts' if k % 2 == 0 else 'links'
    loch = lambda sd: (c0 + 2, c0 + 3) if sd == 'links' else (c1 - 3, c1 - 2)
    dinge = daten['dinge']
    for i, s in enumerate(boeden):
        sd = seite(i); a, b = loch(sd)
        for c in range(c0 + 1, c1):
            if c not in (a, b): bloecke[(c, s)] = 'f'          # 'f' = Gebäudeboden (wie 'h', aber ohne Brückenoptik)
        unten = r1 if i == 0 else boeden[i - 1] - 1
        dinge.append({'t': 'leiter', 'cx': b if sd == 'links' else a, 'cy0': s, 'cy1': unten})
    oberster = boeden[-1] if boeden else r1 + 1
    if dachzugang:
        sd = seite(len(boeden)); a, b = loch(sd)
        bloecke.pop((a, r0), None); bloecke.pop((b, r0), None)
        dinge.append({'t': 'leiter', 'cx': b if sd == 'links' else a, 'cy0': r0, 'cy1': oberster - 1})
    for wand, offen in ((c0, tuer_links), (c1, tuer_rechts)):
        if offen: bloecke.pop((wand, r1 - 1), None); bloecke.pop((wand, r1), None)
    dinge.append({'t': 'hintergrund', 'art': 'gebaeude', 'cx0': c0 + 1, 'cy0': r0 + 1, 'cx1': c1 - 1, 'cy1': r1, 'etagen': boeden})
    return {'c0': c0, 'c1': c1, 'dach': r0, 'boeden': boeden, 'raeume': [r1] + [b - 1 for b in boeden]}
