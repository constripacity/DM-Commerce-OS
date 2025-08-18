import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import SandboxApp from './SandboxApp.jsx';

const RootApp = import.meta.env.VITE_SANDBOX ? SandboxApp : App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);
