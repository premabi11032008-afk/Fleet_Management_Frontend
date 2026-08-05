const API_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;

const cache = {
  stats: null,
  activeTrips: null,
  drivers: null,
  vehicles: null
};

const fetchAPI = async (actionName, options = {}) => {
  try {
    let payloadData = null;
    if (options.body) {
      payloadData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    }

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify({
        action: actionName,
        originalMethod: options.method || 'GET',
        data: payloadData
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    let data = await response.json();

    // Unwrap SNS Workbench specific structure if present
    if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
      const json = data.items[0].json;
      if (json && json.documents !== undefined) {
        data = json; // Returns { success: true, documents: [...] }
      }
    }

    return data;
  } catch (error) {
    console.error(`Error with action ${actionName}:`, error);
    throw error;
  }
};

// --- Auth ---
export const authenticateUser = async (role, username, password) => {
  // Manager login uses Env Vars (just like the old FastAPI backend!)
  if (role === 'manager') {
    const managerUser = import.meta.env.VITE_MANAGER_USERNAME?.trim();
    const managerPass = import.meta.env.VITE_MANAGER_PASSWORD?.trim();

    if (username === managerUser && password === managerPass) {
      return { role: "manager", username: "Fleet Manager", id: "m1" };
    }
    throw new Error("Invalid manager credentials");
  }

  // Driver login searches the Authentication collection via the webhook!
  if (role === 'driver') {
    const res = await fetchAPI('getCredentials', {
      method: 'POST',
      body: JSON.stringify({ role, username, password }),
    });

    let docs = res.documents || [];
    docs = docs.map(doc => {
      if (doc.body && doc.body.data) {
        return { _id: doc._id, ...doc.body.data };
      }
      return doc;
    });

    const userDoc = docs.find(u => u.username === username && u.password === password);

    if (userDoc) {
      return { role: "driver", username: userDoc.name || username, id: userDoc._id || userDoc.id };
    }
    throw new Error("Invalid driver credentials");
  }
};

// --- Stats & Dashboard ---
export const getFleetStats = async () => {
  if (cache.stats) return cache.stats;
  try {
    const res = await fetchAPI('getFleetStats');
    let vehicles = res.documents || [];
    vehicles = vehicles.map(doc => {
      if (doc.body && doc.body.data) {
        return { id: doc._id, _id: doc._id, status: 'Idle', ...doc.body.data };
      }
      return doc;
    });
    cache.stats = {
      totalVehicles: vehicles.length,
      travellingCount: vehicles.filter(v => v.status === 'Travelling').length,
      idleCount: vehicles.filter(v => v.status === 'Idle').length,
      maintenanceCount: vehicles.filter(v => v.status === 'Maintenance').length
    };
    return cache.stats;
  } catch (e) {
    return { totalVehicles: 0, travellingCount: 0, idleCount: 0, maintenanceCount: 0 };
  }
};

export const getActiveTrips = async () => {
  if (cache.activeTrips) return cache.activeTrips;
  try {
    const res = await fetchAPI('getActiveTrips');
    let docs = res.documents || [];
    docs = docs.map(doc => {
      if (doc.body && doc.body.data) {
        return { id: doc._id, _id: doc._id, ...doc.body.data };
      }
      return doc;
    });
    cache.activeTrips = docs.filter(t => t.status === 'Travelling');
    return cache.activeTrips;
  } catch (e) {
    return [];
  }
};

export const assignRoute = async (vehicleId, driverId, startCoords, endCoords) => {
  cache.activeTrips = null;
  cache.vehicles = null;
  cache.stats = null;
  return fetchAPI('assignRoute', {
    method: 'POST',
    body: JSON.stringify({
      vehicleId,
      driverId,
      startCoords,
      endCoords,
      currentCoords: startCoords,
      status: 'Travelling'
    }),
  });
};

export const getRoutePath = async (startCoords, endCoords) => {
  try {
    const res = await fetchAPI('getRoutePath', {
      method: 'POST',
      body: JSON.stringify({ startCoords, endCoords }),
    });

    let data = res;
    if (res.items && res.items.length > 0 && res.items[0].json) {
      data = res.items[0].json;
    }

    // If it returns standard GeoJSON
    if (data.features && data.features[0] && data.features[0].geometry) {
      const coords = data.features[0].geometry.coordinates;
      return coords.map(c => [c[1], c[0]]); // Convert [lng, lat] to [lat, lng]
    }
    
    // If it returns standard OpenRouteService JSON (encoded polyline)
    if (data.routes && data.routes[0] && data.routes[0].geometry) {
      const encoded = data.routes[0].geometry;
      let points = [];
      let index = 0, len = encoded.length;
      let lat = 0, lng = 0;
      while (index < len) {
        let b, shift = 0, result = 0;
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;
        shift = 0;
        result = 0;
        do {
          b = encoded.charCodeAt(index++) - 63;
          result |= (b & 0x1f) << shift;
          shift += 5;
        } while (b >= 0x20);
        let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;
        points.push([lat / 1E5, lng / 1E5]);
      }
      return points;
    }

    return null;
  } catch (e) {
    console.error("Error fetching route path:", e);
    return null;
  }
};

export const getDrivers = async () => {
  if (cache.drivers) return cache.drivers;
  try {
    const res = await fetchAPI('getDrivers');
    const docs = res.documents || [];
    cache.drivers = docs.map(doc => {
      if (doc.body && doc.body.data) {
        return { id: doc._id, _id: doc._id, status: 'Active', ...doc.body.data };
      }
      return doc;
    });
    return cache.drivers;
  } catch (e) {
    return [];
  }
};

export const addDriver = async (driverData) => {
  // Auto-generate credentials for the new driver
  const baseName = (driverData.name || 'driver').toLowerCase().replace(/\s+/g, '');
  const username = `${baseName}_${Math.floor(Math.random() * 900) + 100}`;
  const password = Math.random().toString(36).slice(-8);

  const payload = {
    ...driverData,
    username,
    password,
    role: 'driver',
    status: 'Active'
  };

  if (cache.drivers) {
    cache.drivers.push({ _id: Date.now().toString(), ...payload });
  }

  await fetchAPI('addDriver', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return payload; // Return so the UI can display the new credentials
};

export const removeDriver = async (id) => {
  if (cache.drivers) {
    cache.drivers = cache.drivers.filter(d => d._id !== id && d.id !== id);
  }
  return fetchAPI('removeDriver', {
    method: 'POST',
    body: JSON.stringify({ _id: id }),
  });
};

// --- Vehicles ---
export const getVehicles = async () => {
  if (cache.vehicles) return cache.vehicles;
  try {
    const res = await fetchAPI('getVehicles');
    let docs = res.documents || [];
    cache.vehicles = docs.map(doc => {
      if (doc.body && doc.body.data) {
        return { id: doc._id, _id: doc._id, status: 'Idle', ...doc.body.data };
      }
      return doc;
    });
    return cache.vehicles;
  } catch (e) {
    return [];
  }
};

export const addVehicle = async (vehicleData) => {
  const payload = {
    ...vehicleData,
    status: 'Idle' // Set default status so it appears in Dispatch Roster
  };

  if (cache.vehicles) {
    cache.vehicles.push({ _id: Date.now().toString(), ...payload });
  }
  cache.stats = null;
  return fetchAPI('addVehicle', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const removeVehicle = async (id) => {
  if (cache.vehicles) {
    cache.vehicles = cache.vehicles.filter(v => v._id !== id && v.id !== id);
  }
  cache.stats = null;
  return fetchAPI('removeVehicle', {
    method: 'POST',
    body: JSON.stringify({ _id: id }),
  });
};
