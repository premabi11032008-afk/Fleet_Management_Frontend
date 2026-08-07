import { useState, useRef } from 'react';
import { addVehicle } from '../api/apiEndpoints';

export default function AddVehicle() {
  const [formData, setFormData] = useState({ make: '', model: '', year: '', vin: '', plate: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.make || !formData.model || !formData.plate) return;
    
    setLoading(true);
    await addVehicle(formData);
    setFormData({ make: '', model: '', year: '', vin: '', plate: '' });
    setLoading(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
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
        const addedVehicles = await addVehicle(rows);
        alert(`Successfully imported ${addedVehicles.length} vehicles!`);
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
        <h1>Register New Vehicle</h1>
        <p>Enter detailed specifications to register a new vehicle into the fleet.</p>
      </div>

      {success && (
        <div className="glass-panel animate-fade-in" style={{ marginBottom: '32px', background: 'var(--status-idle)', color: 'white', border: 'none' }}>
          Vehicle registered successfully!
        </div>
      )}

      <div className="glass-panel" style={{ maxWidth: '800px' }}>
        <form onSubmit={handleSubmit} className="grid grid-cols-2">
          <div className="form-group">
            <label>Make</label>
            <input 
              type="text" 
              placeholder="e.g. Ford"
              value={formData.make}
              onChange={(e) => setFormData({...formData, make: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Model</label>
            <input 
              type="text" 
              placeholder="e.g. Transit"
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Year</label>
            <input 
              type="number" 
              placeholder="e.g. 2024"
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>VIN (Vehicle Identification Number)</label>
            <input 
              type="text" 
              placeholder="e.g. 1FDR..."
              value={formData.vin}
              onChange={(e) => setFormData({...formData, vin: e.target.value})}
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>License Plate</label>
            <input 
              type="text" 
              placeholder="e.g. XYZ-123"
              value={formData.plate}
              onChange={(e) => setFormData({...formData, plate: e.target.value})}
              required
            />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={loading}>
              {loading ? 'Processing...' : 'Register Vehicle'}
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
