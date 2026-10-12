# Kleiner Entwicklungsserver, der dem Browser verbietet, Dateien zwischenzuspeichern.
# Start:  python3 server.py        (dann im Browser http://localhost:8001 öffnen)
import http.server

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    # end_headers() fügt die Kopfzeilen an jede Antwort an. Wir hängen vorher
    # eine Anweisung an: "Speichere nichts, frage jedes Mal neu."
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

if __name__ == '__main__':
    # Port 8001, damit der alte Server auf 8000 nicht stört.
    http.server.test(HandlerClass=NoCacheHandler, port=8001)
