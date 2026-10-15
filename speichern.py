# Kleiner Speicherserver für den Karteneditor (nur für den eigenen Rechner).
# Start in einem zweiten Terminal-Fenster:   python3 speichern.py
# Der Editor (Knopf SAVE) schickt die Skizze hierher; sie liegt dann in editor/karte.json. Von jedem Speichern bleibt eine Kopie in editor/verlauf/.
import http.server, json, os, time

ORDNER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'editor')
DATEI = os.path.join(ORDNER, 'karte.json')

class Handler(http.server.BaseHTTPRequestHandler):
    def _kopf(self, code=200, typ='text/plain'):
        self.send_response(code)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Content-Type', typ)
        self.end_headers()
    def do_OPTIONS(self): self._kopf()
    def do_GET(self):
        if self.path.startswith('/karte') and os.path.exists(DATEI):
            self._kopf(200, 'application/json'); self.wfile.write(open(DATEI, 'rb').read())
        else: self._kopf(404); self.wfile.write(b'keine Karte')
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0)); daten = self.rfile.read(n)
        try: json.loads(daten)
        except ValueError: self._kopf(400); self.wfile.write(b'kein JSON'); return
        os.makedirs(os.path.join(ORDNER, 'verlauf'), exist_ok=True)
        open(DATEI, 'wb').write(daten)
        open(os.path.join(ORDNER, 'verlauf', 'karte-' + time.strftime('%Y%m%d-%H%M%S') + '.json'), 'wb').write(daten)
        self._kopf(); self.wfile.write(b'ok'); print('gespeichert', DATEI, flush=True)
    def log_message(self, *a): pass

if __name__ == '__main__':
    print('Speicherserver läuft auf http://localhost:8010  (Strg+C zum Beenden)', flush=True)
    http.server.HTTPServer(('127.0.0.1', 8010), Handler).serve_forever()
