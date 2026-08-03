import { useState } from 'react';
import { addDriver } from '../api/n8nEndpoints';

export default function AddDriver() {
  const [formData, setFormData] = useState({ name: '', licenseNumber: '', phone: '', address: '' });
  const [newCredentials, setNewCredentials] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.licenseNumber) return;
    
    setLoading(true);
    const addedDriver = await addDriver(formData);
    setFormData({ name: '', licenseNumber: '', phone: '', address: '' });
    
    setNewCredentials({
      username: addedDriver.username,
      password: addedDriver.generatedPassword,
      name: addedDriver.name
    });
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Register New Driver</h1>
        <p>Enter the details to register a new driver and auto-generate their access credentials.</p>
      </div>

      {newCredentials && (
        <div className="glass-panel animate-fade-in" style={{ marginBottom: '32px', background: 'var(--primary-light)', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '8px' }}>Driver Added Successfully!</h3>
          <p style={{ margin: '0 0 16px 0', color: 'var(--text-main)' }}>Please provide these auto-generated credentials to <strong>{newCredentials.name}</strong> so they can log in to the Driver Portal.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'white', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Username</p>
              <p style={{ margin: 0, fontWeight: '600', fontFamily: 'monospace', fontSize: '1.125rem' }}>{newCredentials.username}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Password</p>
              <p style={{ margin: 0, fontWeight: '600', fontFamily: 'monospace', fontSize: '1.125rem' }}>{newCredentials.password}</p>
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setNewCredentials(null)}>Dismiss</button>
        </div>
      )}

      <div className="glass-panel" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit} className="grid grid-cols-2">
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>License Number</label>
            <input 
              type="text" 
              placeholder="e.g. DL-12345"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input 
              type="text" 
              placeholder="e.g. 555-0100"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Home Address</label>
            <input 
              type="text" 
              placeholder="e.g. 123 Main St"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={loading}>
              {loading ? 'Processing...' : 'Register Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
