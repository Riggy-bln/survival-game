// Einstellungen für die Verbindung im Online-Mehrspielermodus.
//
// Warum gibt es diese Datei? Zwei Browser verbinden sich direkt miteinander (WebRTC). Das klappt bei den meisten Netzen von allein
// (mit einem STUN-Server). Hinter manchen Routern und Firmen- oder Mobilfunknetzen ist aber keine direkte Verbindung möglich. Dann braucht man
// einen TURN-Server, der die Daten weiterreicht. Die früher eingebauten kostenlosen Server (peerjs.com und openrelay) gibt es nicht mehr:
// Das war der Grund für "The connection to the room failed".
//
// Einen eigenen TURN-Server einzutragen ist kostenlos (Metered.ca, 500 MB im Monat, reicht für viele Spiele):
//   1. Auf https://www.metered.ca ein kostenloses Konto anlegen und eine App erstellen (zum Beispiel "brokrun").
//   2. Im Dashboard unter "TURN Server" den "API Key" und den App-Namen kopieren.
//   3. Hier unten METERED eintragen, zum Beispiel: { app: 'brokrun', apiKey: 'abcd1234...' }
// Das Spiel holt sich damit bei jedem Start frische Zugangsdaten. Alternativ kann man einen eigenen Server unter TURN eintragen.

export const METERED = { app: '', apiKey: '' };

// Eigener TURN-Server, zum Beispiel: { urls: ['turn:meinserver.de:3478', 'turns:meinserver.de:443?transport=tcp'], username: 'name', credential: 'passwort' }
export const TURN = { urls: [], username: '', credential: '' };
