import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Login from './Login';
import Dashboard from './Dashboard';
import Toast from './Toast';

export default function App() {
  const { authenticated, loading, login, logout, error: authError } = useAuth();
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading TH9 Clan Tracker...</p>
      </div>
    );
  }

  return (
    <>
      {authenticated ? (
        <Dashboard logout={logout} addToast={addToast} />
      ) : (
        <Login onLogin={login} error={authError} />
      )}
      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
}
