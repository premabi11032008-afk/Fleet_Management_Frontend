import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import { getDrivers, getVehicles, assignRoute } from '../api/n8nEndpoints';

// Fix for default Leaflet marker icons in React
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for destination
const destIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function DispatchRouting() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  
  const [startCoords, setStartCoords] = useState(null); 
  const [endCoords, setEndCoords] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Fetch user location via IP for default center
      let initialCenter = [28.6139, 77.2090]; // Default Delhi
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.latitude && data.longitude) {
          initialCenter = [data.latitude, data.longitude];
        }
      } catch (e) {
        console.warn("Could not fetch IP location, defaulting to Delhi.");
      }
      setStartCoords(initialCenter);

      const d = await getDrivers();
      const v = await getVehicles();
      // Only active/idle
      setDrivers(d.filter(dr => dr.status === 'Active'));
      setVehicles(v.filter(vh => vh.status === 'Idle'));
    }
    fetchData();
  }, []);

  // Update map start coords when vehicle is selected
  useEffect(() => {
    const v = vehicles.find(vh => vh.id === selectedVehicle);
    if (v && v.currentCoords) {
      setStartCoords(v.currentCoords);
    }
  }, [selectedVehicle, vehicles]);

  const handleDispatch = async () => {
    if (!selectedDriver || !selectedVehicle || !endCoords) return;
    
    setLoading(true);
    await assignRoute(selectedVehicle, selectedDriver, startCoords, endCoords);
    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setEndCoords(null);
      setSelectedDriver('');
      setSelectedVehicle('');
      // refresh vehicles to remove the dispatched one from 'Idle'
      getVehicles().then(v => setVehicles(v.filter(vh => vh.status === 'Idle')));
    }, 3000);
  };

  // Component to handle map clicks
  function MapClickHandler() {
    useMapEvents({
      click(e) {
        setEndCoords([e.latlng.lat, e.latlng.lng]);
      },
    });
    return null;
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <h1>Dispatch & Routing</h1>
        <p>Assign a driver and vehicle, then click on the map to set their destination route visually.</p>
      </div>

      {success && (
        <div className="glass-panel animate-fade-in" style={{ marginBottom: '24px', background: 'var(--status-idle)', color: 'white', border: 'none' }}>
          Driver successfully dispatched on route!
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flex: 1, minHeight: '500px' }}>
        
        {/* Left Side: Controls */}
        <div className="glass-panel" style={{ width: '350px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginBottom: '24px' }}>Assignment Details</h3>
          
          <div className="form-group">
            <label>Select Available Vehicle</label>
            <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)}>
              <option value="">-- Choose Vehicle --</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.make} {v.model} ({v.plate})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Select Active Driver</label>
            <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)}>
              <option value="">-- Choose Driver --</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: '600', fontSize: '0.875rem' }}>Route Status</p>
            {!endCoords ? (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--status-offline)' }}>Please click on the map to set a destination.</p>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--status-idle)' }}>Destination set.</p>
            )}
          </div>

          <button 
            className="btn btn-primary" 
            style={{ marginTop: 'auto', width: '100%' }}
            disabled={!selectedDriver || !selectedVehicle || !endCoords || loading}
            onClick={handleDispatch}
          >
            {loading ? 'Dispatching...' : 'Assign & Dispatch'}
          </button>
        </div>

        {/* Right Side: Map */}
        <div className="glass-panel" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          {startCoords && (
            <MapContainer center={startCoords} zoom={6} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapClickHandler />

              {/* Start Marker */}
              {selectedVehicle && (
                <Marker position={startCoords}>
                  <Popup>Vehicle Start Location (Depot)</Popup>
                </Marker>
              )}

              {/* Destination Marker */}
              {endCoords && (
                <Marker position={endCoords} icon={destIcon}>
                  <Popup>Assigned Destination</Popup>
                </Marker>
              )}

              {/* Route Line */}
              {selectedVehicle && endCoords && (
                <Polyline positions={[startCoords, endCoords]} color="var(--primary)" weight={4} dashArray="10, 10" />
              )}
            </MapContainer>
          )}
        </div>

      </div>
    </div>
  );
}
