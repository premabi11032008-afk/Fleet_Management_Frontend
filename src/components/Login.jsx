import { useState } from 'react';
import { authenticateUser } from '../api/apiEndpoints';

export default function Login({ onLogin }) {
  const [role, setRole] = useState('manager'); // 'manager' | 'driver'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    
    try {
      const userData = await authenticateUser(role, username, password);
      onLogin(userData);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-left"></div>
      
      <div className="login-right">
        <div style={{ maxWidth: '400px', width: '100%', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div className="sidebar-logo-icon" style={{ boxShadow: 'none' }}>IFM</div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Intelligent Fleet</h1>
          </div>

          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>Welcome back</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Sign in to manage your fleet operations.</p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', background: 'rgba(0,0,0,0.05)', padding: '4px', borderRadius: '8px' }}>
            <button 
              type="button"
              className={`btn ${role === 'manager' ? 'btn-primary' : ''}`}
              style={{ flex: 1, padding: '8px', background: role === 'manager' ? 'white' : 'transparent', color: role === 'manager' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: role === 'manager' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
              onClick={() => setRole('manager')}
            >
              Fleet Manager
            </button>
            <button 
              type="button"
              className={`btn ${role === 'driver' ? 'btn-primary' : ''}`}
              style={{ flex: 1, padding: '8px', background: role === 'driver' ? 'white' : 'transparent', color: role === 'driver' ? 'var(--primary)' : 'var(--text-muted)', boxShadow: role === 'driver' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none' }}
              onClick={() => setRole('driver')}
            >
              Driver
            </button>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Username or Email</label>
              <input 
                type="text" 
                placeholder={role === 'manager' ? "e.g. manager_fleet1" : "e.g. jdoe_831"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p style={{ color: 'var(--status-offline)', fontSize: '0.875rem' }}>{error}</p>}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
              Sign In
            </button>
          </form>
          
          <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Need access? Contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
