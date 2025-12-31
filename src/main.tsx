import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Use startTransition to mark the initial render as non-urgent
// This allows the browser to handle user input during hydration
const root = createRoot(document.getElementById("root")!);

// Schedule render to happen after initial paint for better FID
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }, { timeout: 100 });
} else {
  // Fallback for browsers without requestIdleCallback
  setTimeout(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }, 0);
}
