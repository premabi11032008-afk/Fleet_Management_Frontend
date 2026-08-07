import { useState, useRef } from 'react';
import { addDriver } from '../api/apiEndpoints';

export default function AddDriver() {
  const [formData, setFormData] = useState({ name: '', licenseNumber: '', phone: '', address: '' });
  const [newCredentials, setNewCredentials] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.licenseNumber) return;
    
    setLoading(true);
    const addedDriver = await addDriver(formData);
    setFormData({ name: '', licenseNumber: '', phone: '', address: '' });
    
    setNewCredentials({
      username: addedDriver.username,
      password: addedDriver.password || addedDriver.generatedPassword,
      name: addedDriver.name
    });
    setLoading(false);
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) {
        alert("CSV must have a header row and at least one data row.");
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => { obj[header] = values[i]?.trim(); });
        return obj;
      });
      setLoading(true);
      try {
        const addedDrivers = await addDriver(rows);
        alert(`Successfully imported ${addedDrivers.length} drivers!`);
      } catch (err) {
        alert("Error importing CSV: " + err.message);
      }
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
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
          <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={loading}>
              {loading ? 'Processing...' : 'Register Driver'}
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>or</span>
            <input 
              type="file" 
              accept=".csv" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleCsvUpload} 
            />
            <button 
              type="button"
              className="btn" 
              style={{ width: 'fit-content', background: 'var(--bg-panel)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: '6px', verticalAlign: 'text-bottom' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              Import Multiple via CSV
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
