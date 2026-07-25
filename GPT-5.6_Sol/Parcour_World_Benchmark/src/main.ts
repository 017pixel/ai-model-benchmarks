import './styles.css';
import { Game } from './engine/Game';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');

const game = new Game(root);

if (import.meta.hot) {
  import.meta.hot.dispose(() => game.dispose());
}
