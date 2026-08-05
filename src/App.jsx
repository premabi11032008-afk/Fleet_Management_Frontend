import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DispatchRouting from './components/DispatchRouting';
import DriverManagement from './components/DriverManagement';
import AddDriver from './components/AddDriver';
import VehicleManagement from './components/VehicleManagement';
import AddVehicle from './components/AddVehicle';
import DriverPortal from './components/DriverPortal';
import Login from './components/Login';
import './index.css';

function App() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('ifms_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [currentView, setCurrentView] = useState(() => {
    const saved = sessionStorage.getItem('ifms_user');
    const parsedUser = saved ? JSON.parse(saved) : null;
    return parsedUser?.role === 'driver' ? 'driver_portal' : 'dashboard';
  });

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('ifms_user', JSON.stringify(userData));
    setCurrentView(userData.role === 'manager' ? 'dashboard' : 'driver_portal');
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('ifms_user');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    // Role-based access control
    if (user.role === 'driver' && currentView !== 'driver_portal') {
      return <div className="animate-fade-in" style={{ padding: '40px' }}><h2>Access Denied</h2><p>You do not have permission to view this page.</p></div>;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'dispatch':
        return <DispatchRouting />;
      case 'drivers':
        return <DriverManagement />;
      case 'add_driver':
        return <AddDriver />;
      case 'vehicles':
        return <VehicleManagement />;
      case 'add_vehicle':
        return <AddVehicle />;
      case 'driver_portal':
        return <DriverPortal user={user} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={handleLogout}
        user={user}
      />

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
