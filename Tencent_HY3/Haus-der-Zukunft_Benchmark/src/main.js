import './styles.css';
import { App } from './core/App.js';

const app = new App();
app.init().catch((err) => {
  console.error(err);
  const s = document.getElementById('loading-status');
  if (s) s.textContent = 'Fehler beim Start: ' + err.message;
});
