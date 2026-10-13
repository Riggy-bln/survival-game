#!/usr/bin/env python3
# Trägt in index.html eine "Importkarte" ein: Jede Spieldatei bekommt eine Versionsnummer (?v=...) in ihrer Adresse.
# Dadurch holt der Browser nach einer Veröffentlichung sofort die neuen Dateien, statt bis zu 10 Minuten alte aus dem Zwischenspeicher
# zu benutzen (GitHub Pages erlaubt dem Browser, Dateien 10 Minuten zu behalten).
# Benutzung vor jeder Veröffentlichung:   python3 version.py
import glob, os, re, subprocess, time

hier = os.path.dirname(os.path.abspath(__file__))
dateien = sorted(os.path.relpath(p, hier) for p in glob.glob(os.path.join(hier, 'src', '**', '*.js'), recursive=True))
try:
    ver = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=hier, text=True).strip() + '-' + time.strftime('%H%M%S')
except Exception:
    ver = time.strftime('%Y%m%d%H%M%S')
liste = ',\n        '.join(f"'{d}'" for d in dateien)
block = f"""<!--IMPORTMAP-START-->
    <script>
        // Versionsnummer an alle Spieldateien hängen (erzeugt von version.py): So gibt es nach einer Veröffentlichung keine alten Dateien mehr.
        (function () {{
            var VER = '{ver}';
            var dateien = [
        {liste}
            ];
            var imports = {{}};
            dateien.forEach(function (d) {{ var u = new URL(d, document.baseURI).href; imports[u] = u + '?v=' + VER; }});
            var s = document.createElement('script');
            s.type = 'importmap';
            s.textContent = JSON.stringify({{ imports: imports }});
            document.head.appendChild(s);
            window.SPIEL_VERSION = VER;
        }})();
    </script>
    <!--IMPORTMAP-END-->"""
pfad = os.path.join(hier, 'index.html')
html = open(pfad, encoding='utf-8').read()
if '<!--IMPORTMAP-START-->' in html:
    html = re.sub(r'<!--IMPORTMAP-START-->.*?<!--IMPORTMAP-END-->', lambda m: block, html, flags=re.S)
else:
    # direkt vor dem Modul-Script einfügen
    html = html.replace('    <script type="module" src="src/main.js"></script>', '    ' + block + '\n    <script type="module" src="src/main.js"></script>')
html = re.sub(r'<script type="module" src="src/main\.js[^"]*"></script>', f'<script type="module" src="src/main.js?v={ver}"></script>', html)
open(pfad, 'w', encoding='utf-8').write(html)
print('Version', ver, 'für', len(dateien), 'Dateien eingetragen')
