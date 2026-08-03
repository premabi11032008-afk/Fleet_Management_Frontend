import { useState } from 'react';
import { addVehicle } from '../api/n8nEndpoints';

export default function AddVehicle() {
  const [formData, setFormData] = useState({ make: '', model: '', year: '', vin: '', plate: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
          <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }} disabled={loading}>
              {loading ? 'Processing...' : 'Register Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
