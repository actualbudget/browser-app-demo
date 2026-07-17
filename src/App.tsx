import { useState } from 'react';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [connected, setConnected] = useState(false);
  return connected ? (
    <Dashboard onDisconnect={() => setConnected(false)} />
  ) : (
    <Login onConnected={() => setConnected(true)} />
  );
}
