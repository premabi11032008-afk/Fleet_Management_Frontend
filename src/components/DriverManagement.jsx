import { useState, useEffect } from 'react';
import { getDrivers, removeDriver } from '../api/apiEndpoints';

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

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
        {loading ? (
          <p>Loading drivers...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Contact Info</th>
                  <th>License Number</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center' }}>No drivers found</td></tr>
                ) : (
                  drivers.map(driver => (
                    <tr key={driver.id}>
                      <td style={{ fontWeight: '600', color: 'var(--text-main)' }}>{driver.name}</td>
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{driver.username}</td>
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
