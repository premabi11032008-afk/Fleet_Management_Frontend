import { useState, useEffect } from 'react';
import { getDrivers, removeDriver } from '../api/apiEndpoints';

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    const data = await getDrivers();
    setDrivers(data);
    setLoading(false);
  };

  const handleRemove = async (id) => {
    await removeDriver(id);
    fetchDrivers(); // Refresh list
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Driver Roster</h1>
        <p>View and manage all registered drivers in your fleet.</p>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <button 
            className="btn" 
            style={{ 
              background: 'transparent',
              color: showPasswords ? 'var(--status-maintenance)' : 'var(--primary)', 
              border: '1px solid currentColor',
              padding: '6px 12px',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => setShowPasswords(!showPasswords)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {showPasswords ? (
                <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></>
              ) : (
                <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></>
              )}
            </svg>
            {showPasswords ? 'Hide Credentials' : 'Show Credentials'}
          </button>
        </div>
        {loading ? (
          <p>Loading drivers...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Password</th>
                  <th>Contact Info</th>
                  <th>License Number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center' }}>No drivers found</td></tr>
                ) : (
                  drivers.map(driver => (
                    <tr key={driver.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{driver.name}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{driver.username}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-main)' }}>
                        {showPasswords ? (driver.password || 'N/A') : '••••••••'}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.875rem' }}>{driver.phone || 'N/A'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{driver.address || 'N/A'}</div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{driver.licenseNumber}</td>
                      <td>
                        <span className={`badge ${driver.status === 'Active' ? 'badge-idle' : 'badge-maintenance'}`}>
                          {driver.status}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => handleRemove(driver.id)} className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
