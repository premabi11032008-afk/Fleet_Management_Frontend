import React from 'react';

export default function Documentation() {
  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>Fleet Management User Guide</h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)' }}>Learn how to manage your fleet, drivers, and dispatch routes efficiently.</p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px', color: 'var(--primary)' }}>1. Dashboard Overview</h2>
        <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
          The <strong>Dashboard</strong> provides a high-level overview of your entire fleet. You can quickly see statistics like the total number of vehicles, how many are currently travelling, and how many are idle. It also displays a live list of active trips that are currently en route.
        </p>
        <p style={{ lineHeight: '1.6' }}>
          If a trip is no longer needed, you can click the <strong>Cancel</strong> button next to it to immediately remove it and mark the vehicle as Idle again.
        </p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px', color: 'var(--primary)' }}>2. Managing Vehicles and Drivers</h2>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>Adding Vehicles</h3>
        <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
          Navigate to the <strong>Add Vehicle</strong> section to register new vehicles to your fleet. Once added, a vehicle will appear in the <strong>Fleet Roster</strong> with an initial status of <span className="badge badge-idle"><span className="status-dot dot-idle"></span> Idle</span>.
        </p>
        
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '8px' }}>Adding Drivers</h3>
        <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
          Similarly, use the <strong>Add Driver</strong> section to onboard new drivers. When a driver is successfully added, the system automatically generates a unique username and password for them. They will immediately show up in the <strong>Driver Roster</strong>.
        </p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px', color: 'var(--primary)' }}>3. Dispatch & Routing</h2>
        <p style={{ lineHeight: '1.6', marginBottom: '16px' }}>
          The core feature of this platform is the Dispatch system. Here is how to assign a route:
        </p>
        <ol style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
          <li>Go to the <strong>Dispatch & Routing</strong> tab.</li>
          <li>Select an available (Idle) vehicle from the dropdown.</li>
          <li>Select an active driver to assign to this vehicle.</li>
          <li>Click anywhere on the interactive map to set the destination.</li>
          <li>If multiple routes are available, they will appear in the left panel. Click on a route to select it. The selected route will be highlighted in blue on the map, while alternatives will be gray.</li>
          <li>Click <strong>Assign & Dispatch</strong>. The vehicle's status will instantly change to <span className="badge badge-travelling"><span className="status-dot dot-travelling"></span> Travelling</span>.</li>
        </ol>
        <p style={{ lineHeight: '1.6', marginTop: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
          <strong>Pro Tip:</strong> We use an advanced routing cache! If you select a destination you've dispatched to recently, the route will load instantly without any delay.
        </p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px', color: 'var(--primary)' }}>4. The AI Fleet Assistant</h2>
        <p style={{ lineHeight: '1.6' }}>
          Need to act quickly? Use the <strong>Chatbot Bubble</strong> in the bottom right corner of the screen. You can type commands in natural language, such as:
        </p>
        <ul style={{ paddingLeft: '24px', lineHeight: '1.8', marginTop: '8px', marginBottom: '16px' }}>
          <li><em>"Add a new driver named John Doe"</em></li>
          <li><em>"Register a 2024 Ford Transit with plate XYZ-999"</em></li>
          <li><em>"Dispatch the Ford Transit to Central Park"</em></li>
        </ul>
        <p style={{ lineHeight: '1.6' }}>
          The AI will automatically understand your intent and perform the action for you!
        </p>
      </div>
    </div>
  );
}
