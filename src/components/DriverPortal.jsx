import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { getActiveTrips } from '../api/apiEndpoints';

import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const destIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function DriverPortal({ user }) {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrip() {
      // Find trip assigned to this driver's name
      // Note: user.username contains the full name we resolved in authenticateUser
      const trips = await getActiveTrips();
      const myTrip = trips.find(t => t.driver === user.username);
      setTrip(myTrip);
      setLoading(false);
    }
    fetchTrip();
  }, [user]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1>My Current Assignment</h1>
        <p>Welcome back, {user.username}. Here is your current assignment overview.</p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '32px' }}>
        {loading ? (
          <p>Loading your assignment...</p>
        ) : trip ? (
          <div>
            <div className="flex-between" style={{ marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: '0 0 4px 0' }}>Current Vehicle</h2>
                <p style={{ margin: 0, fontSize: '1.125rem', color: 'var(--text-main)' }}>
                  {trip.make} {trip.model} ({trip.plate})
                </p>
              </div>
              <span className="badge badge-travelling"><span className="status-dot dot-travelling"></span> {trip.status}</span>
            </div>
            
            <div style={{ padding: '24px 0', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
              <div className="grid grid-cols-2">
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Status / Instructions</p>
                  <p style={{ margin: 0, fontWeight: '500' }}>{trip.location}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Fuel Level</p>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: '75%', height: '100%', background: 'var(--status-idle)' }}></div>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>75% Remaining</p>
                </div>
              </div>
            </div>

            {trip.startCoords && Array.isArray(trip.startCoords) && trip.endCoords && Array.isArray(trip.endCoords) && (
              <div style={{ height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                <MapContainer center={trip.currentCoords && Array.isArray(trip.currentCoords) ? trip.currentCoords : trip.startCoords} zoom={11} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={trip.startCoords}>
                    <Popup>Start Location</Popup>
                  </Marker>
                  <Marker position={trip.endCoords} icon={destIcon}>
                    <Popup>Assigned Destination</Popup>
                  </Marker>
                  {trip.currentCoords && Array.isArray(trip.currentCoords) && ( <Marker position={trip.currentCoords}>
                      <Popup>Your Current Location</Popup>
                    </Marker>
                  )}
                  <Polyline positions={[trip.startCoords, trip.endCoords]} color="var(--primary)" weight={4} dashArray="5, 10" />
                </MapContainer>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: '64px', height: '64px', background: 'var(--border-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <svg style={{ width: '32px', height: '32px', color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 style={{ margin: '0 0 8px 0' }}>No Active Assignment</h2>
            <p style={{ margin: 0 }}>You are currently not assigned to any active routes. Please wait for dispatch.</p>
          </div>
        )}
      </div>
    </div>
  );
}
