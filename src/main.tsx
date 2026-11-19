import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app.tsx';
import './styles.css';

render(<App />, document.getElementById('app')!);

// Service worker: l'app funziona offline dopo la prima apertura e si aggiorna da sola.
registerSW({ immediate: true });
