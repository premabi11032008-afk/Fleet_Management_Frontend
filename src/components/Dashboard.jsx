import { useState, useEffect, Fragment } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { getFleetStats, getActiveTrips, cancelRoute } from '../api/apiEndpoints';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const travellingIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch user location via IP
      let center = [28.6139, 77.2090]; // Default Delhi
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.latitude && data.longitude) {
          center = [data.latitude, data.longitude];
        }
      } catch (e) {
        console.warn("Could not fetch IP location, defaulting to Delhi.");
      }
      setMapCenter(center);

      const [statsData, tripsData] = await Promise.all([
        getFleetStats(),
        getActiveTrips()
      ]);
      setStats(statsData);
      
      if (Array.isArray(tripsData)) {
        setActiveTrips(tripsData);
      } else {
        console.warn("Expected tripsData to be an array but got:", tripsData);
        setActiveTrips(tripsData && tripsData.items ? tripsData.items : []);
      }
      
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleCancelRoute = async (tripId, vehicleId, driverId) => {
    if (window.confirm("Are you sure you want to cancel this route? The vehicle will be set back to Idle.")) {
      setLoading(true);
      await cancelRoute(tripId, vehicleId, driverId);
      
      const [statsData, tripsData] = await Promise.all([
        getFleetStats(),
        getActiveTrips()
      ]);
      setStats(statsData);
      setActiveTrips(Array.isArray(tripsData) ? tripsData : (tripsData?.items || []));
      setLoading(false);
    }
  };

  if (loading || !stats || !mapCenter) {
    return <div className="animate-fade-in"><p>Loading dashboard data...</p></div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1>Dashboard Overview</h1>
        <p>Real-time insights and high-level status of your fleet operations.</p>
      </div>

      <div className="grid grid-cols-3" style={{ marginBottom: '40px' }}>
        <div className="glass-panel">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Travelling</h3>
          <div className="flex-between">
            <p style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--status-travelling)', margin: 0 }}>{stats.travellingCount}</p>
            <span className="status-dot dot-travelling" style={{ width: '16px', height: '16px' }}></span>
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Idle / Available</h3>
          <div className="flex-between">
            <p style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--status-idle)', margin: 0 }}>{stats.idleCount}</p>
            <span className="status-dot dot-idle" style={{ width: '16px', height: '16px' }}></span>
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>In Maintenance</h3>
          <div className="flex-between">
            <p style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--status-maintenance)', margin: 0 }}>{stats.maintenanceCount}</p>
            <span className="status-dot dot-maintenance" style={{ width: '16px', height: '16px' }}></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', height: '500px' }}>
          <MapContainer center={mapCenter} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {activeTrips.map(trip => (
              <Fragment key={trip.id}>
                {trip.currentCoords && Array.isArray(trip.currentCoords) && ( <Marker position={trip.currentCoords} icon={travellingIcon}>
                    <Popup>
                      <strong>{trip.make} {trip.model} ({trip.plate})</strong><br/>
                      Driver: {trip.driver}<br/>
                      Status: Travelling
                    </Popup>
                  </Marker>
                )}
                {trip.startCoords && Array.isArray(trip.startCoords) && trip.endCoords && Array.isArray(trip.endCoords) && (
                  <Polyline positions={[trip.startCoords, trip.endCoords]} color="var(--status-travelling)" weight={3} dashArray="5, 10" />
                )}
              </Fragment>
            ))}
          </MapContainer>
        </div>

        <div className="glass-panel">
          <div className="flex-between" style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: 0 }}>Currently Travelling</h2>
            <span className="badge badge-travelling">Live Tracking Active</span>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Driver</th>
                  <th>Current Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeTrips.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center' }}>No vehicles currently travelling.</td></tr>
                ) : (
                  activeTrips.map(trip => (
                    <tr key={trip.id}>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-main)' }}>{trip.make} {trip.model}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{trip.plate}</div>
                      </td>
                      <td>{trip.driver}</td>
                      <td>{trip.location}</td>
                      <td>
                        <button onClick={() => handleCancelRoute(trip.id, trip.vehicleId, trip.driverId)} className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Cancel</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
