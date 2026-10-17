// Welches Level wird gespielt?
//   Standard:        Kombi.js  = Anfang des früheren Levels (bis zum Ende der ersten Höhle) + das neue Level aus dem Karteneditor bis zur Boss-Arena
//   ?level=neu       nur das neue Level (LevelNeu.js, erzeugt von tools/level_aus_karte.py)
//   ?level=alt       nur das frühere lange Level (Level01.js)
import alt from './Level01.js';
import neu from './LevelNeu.js';
import kombi from './Kombi.js';

const wahl = (() => { try { return new URLSearchParams(window.location.search).get('level'); } catch (e) { return null; } })();
export default wahl === 'alt' ? alt : (wahl === 'neu' ? neu : kombi);
// Name des gewählten Levels (für WaffenPlatzierung.js: jedes Level hat seine eigene Liste)
export const levelName = wahl === 'alt' ? 'alt' : (wahl === 'neu' ? 'neu' : 'kombi');
