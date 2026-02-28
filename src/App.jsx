import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user was previously logged in (optional persistence)
    const storedUser = localStorage.getItem('timeRecordingUser');
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (managerName) => {
    setUser(managerName);
    localStorage.setItem('timeRecordingUser', managerName);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('timeRecordingUser');
  };

  if (isLoading) return null;

  return (
    <div className="app-container">
      {/* Background Gradients */}
      <div className="bg-blob blob-blue" />
      <div className="bg-blob blob-purple" />

      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;
