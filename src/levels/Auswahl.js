// Welches Level wird gespielt? Standard ist das neue Level (aus der Skizze des Karteneditors, siehe tools/level_aus_karte.py).
// Mit ?level=alt in der Adresse spielt man das frühere lange Level.
import alt from './Level01.js';
import neu from './LevelNeu.js';

const wahl = (() => { try { return new URLSearchParams(window.location.search).get('level'); } catch (e) { return null; } })();
export default wahl === 'alt' ? alt : neu;
