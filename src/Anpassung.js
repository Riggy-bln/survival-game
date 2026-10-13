// Anpassung an die Bildschirmform: Das Spiel ist immer 720 Pixel hoch, die Breite richtet sich nach dem Fenster
// (mindestens 1280, höchstens 1800). So füllt es auch ein langes Handy-Display ganz aus, statt schwarze Balken zu lassen.
// Handy oder Tablet? (Auch im Testmodus ?touch=1.) Dort ist der sichtbare Ausschnitt kleiner (576 statt 720 Pixel hoch), dadurch wirkt
// alles 25 % größer: Figuren, Gegner und Knöpfe sind auf einem kleinen Bildschirm besser zu erkennen.
export const IST_HANDY = (() => {
    try {
        const ua = navigator.userAgent || '';
        if (new URLSearchParams(window.location.search).get('touch') === '1') return true;
        return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    } catch (e) { return false; }
})();
export const SPIEL_HOEHE = IST_HANDY ? 576 : 720;
export const MIN_BREITE = IST_HANDY ? 1000 : 1280;
export const MAX_BREITE = 1800;

// Die passende Spielbreite für das aktuelle Fenster (gerade Zahl).
export function breiteFuerFenster() {
    const verhaeltnis = window.innerWidth / Math.max(1, window.innerHeight);
    return Math.max(MIN_BREITE, Math.min(MAX_BREITE, Math.round(SPIEL_HOEHE * verhaeltnis / 2) * 2));
}

// Passt die Spielbreite an, wenn sich das Fenster ändert (Drehen, Vollbild, Fenstergröße). Die Szenen hören auf das
// "resize"-Ereignis des Scale-Managers und ordnen ihre Anzeigen neu an.
export function haltePassend(game) {
    let timer = null;
    const pruefe = () => {
        const b = breiteFuerFenster();
        if (Math.abs(b - game.scale.gameSize.width) >= 4) game.scale.setGameSize(b, SPIEL_HOEHE);
    };
    const spaeter = () => { clearTimeout(timer); timer = setTimeout(pruefe, 150); };
    window.addEventListener('resize', spaeter);
    window.addEventListener('orientationchange', spaeter);
    document.addEventListener('fullscreenchange', spaeter);
}
