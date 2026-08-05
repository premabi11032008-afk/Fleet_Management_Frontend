const API_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;

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
  try {
    const res = await fetchAPI('getFleetStats');
    let vehicles = res.documents || [];
    vehicles = vehicles.map(doc => {
      if (doc.body && doc.body.data) {
        return { _id: doc._id, ...doc.body.data };
      }
      return doc;
    });
    return {
      totalVehicles: vehicles.length,
      travellingCount: vehicles.filter(v => v.status === 'Travelling').length,
      idleCount: vehicles.filter(v => v.status === 'Idle').length,
      maintenanceCount: vehicles.filter(v => v.status === 'Maintenance').length
    };
  } catch (e) {
    return { totalVehicles: 0, travellingCount: 0, idleCount: 0, maintenanceCount: 0 };
  }
};

export const getActiveTrips = async () => {
  try {
    const res = await fetchAPI('getActiveTrips');
    let docs = res.documents || [];
    docs = docs.map(doc => {
      if (doc.body && doc.body.data) {
        return { _id: doc._id, ...doc.body.data };
      }
      return doc;
    });
    return docs.filter(t => t.status === 'Travelling');
  } catch (e) {
    return [];
  }
};

export const assignRoute = async (vehicleId, driverId, startCoords, endCoords) => {
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
    // OpenRouteService returns features[0].geometry.coordinates as [lng, lat]
    if (res.features && res.features[0] && res.features[0].geometry) {
      const coords = res.features[0].geometry.coordinates;
      // Convert [lng, lat] to [lat, lng] for Leaflet
      return coords.map(c => [c[1], c[0]]);
    }
    return null;
  } catch (e) {
    console.error("Error fetching route path:", e);
    return null;
  }
};

export const getDrivers = async () => {
  try {
    const res = await fetchAPI('getDrivers');
    const docs = res.documents || [];
    return docs.map(doc => {
      if (doc.body && doc.body.data) {
        return { _id: doc._id, ...doc.body.data };
      }
      return doc;
    });
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
    role: 'driver'
  };

  await fetchAPI('addDriver', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return payload; // Return so the UI can display the new credentials
};

export const removeDriver = async (id) => {
  return fetchAPI('removeDriver', {
    method: 'POST',
    body: JSON.stringify({ _id: id }),
  });
};

// --- Vehicles ---
export const getVehicles = async () => {
  try {
    const res = await fetchAPI('getVehicles');
    let docs = res.documents || [];
    return docs.map(doc => {
      if (doc.body && doc.body.data) {
        return { _id: doc._id, ...doc.body.data };
      }
      return doc;
    });
  } catch (e) {
    return [];
  }
};

export const addVehicle = async (vehicleData) => {
  return fetchAPI('addVehicle', {
    method: 'POST',
    body: JSON.stringify(vehicleData),
  });
};

export const removeVehicle = async (id) => {
  return fetchAPI('removeVehicle', {
    method: 'POST',
    body: JSON.stringify({ _id: id }),
  });
};
