// ===========================================================================
// BlockForge - Einstiegspunkt
// ===========================================================================
import './style.css';
import { Game } from './core/game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// PWA Service Worker registrieren
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Automatisch speichern beim Verlassen
window.addEventListener('beforeunload', () => {
  if (game.state === 'play') game.save();
});

// Touch-Steuerung aktivieren
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  const touch = document.querySelector('.bf-touch');
  if (touch) touch.classList.add('active');
}
