import { useState, useEffect } from 'react';
import { getVehicles, removeVehicle } from '../api/n8nEndpoints';

export default function VehicleManagement() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    setLoading(true);
    const data = await getVehicles();
    setVehicles(data);
    setLoading(false);
  };

  const handleRemove = async (id) => {
    await removeVehicle(id);
    fetchVehicles(); // Refresh list
  };

  const getStatusBadge = (status) => {
    if (status === 'Travelling') return <span className="badge badge-travelling"><span className="status-dot dot-travelling"></span> Travelling</span>;
    if (status === 'Idle') return <span className="badge badge-idle"><span className="status-dot dot-idle"></span> Idle</span>;
    if (status === 'Maintenance') return <span className="badge badge-maintenance"><span className="status-dot dot-maintenance"></span> Maintenance</span>;
    return <span className="badge">{status}</span>;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Fleet Roster</h1>
        <p>Overview of all vehicles currently registered in the fleet.</p>
      </div>

      <div className="glass-panel">
        {loading ? (
          <p>Loading vehicles...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle Details</th>
                  <th>License Plate</th>
                  <th>Current Driver</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center' }}>No vehicles found</td></tr>
                ) : (
                  vehicles.map(vehicle => (
                    <tr key={vehicle.id}>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{vehicle.make} {vehicle.model}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Year: {vehicle.year || 'N/A'} | VIN: {vehicle.vin || 'N/A'}</div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{vehicle.plate}</td>
                      <td>{vehicle.driver}</td>
                      <td>{getStatusBadge(vehicle.status)}</td>
                      <td>
                        <button onClick={() => handleRemove(vehicle.id)} className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>
                          Decommission
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
