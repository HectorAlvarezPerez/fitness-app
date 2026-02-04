import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Debug logging for deployment issues
console.log('App initialization started');

window.onerror = function (message, source, lineno, colno, error) {
  console.error('Global error caught:', { message, source, lineno, colno, error });
  // Attempt to show on screen if document body exists
  if (document.body) {
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100%';
    errorDiv.style.background = 'red';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '10px';
    errorDiv.style.zIndex = '9999';
    errorDiv.innerText = 'Critical Error: ' + message;
    document.body.appendChild(errorDiv);
  }
};

const rootElement = document.getElementById('root');
console.log('Root element found:', !!rootElement);

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);