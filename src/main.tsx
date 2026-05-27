import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { useGameStore } from './store/gameStore';

// Dev hook — gated on ?debug or #debug for browser-driven testing.
// Single-player offline game; this is harmless either way.
if (typeof window !== 'undefined' && (location.search.includes('debug') || location.hash.includes('debug'))) {
  (window as unknown as { __bt: typeof useGameStore }).__bt = useGameStore;
}

createRoot(document.getElementById('root')!).render(<App />);
