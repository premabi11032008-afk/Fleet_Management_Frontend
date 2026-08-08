const API_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;

const loadRoutesCache = () => {
  try {
    const saved = localStorage.getItem('routesCache');
    if (saved) return new Map(JSON.parse(saved));
  } catch(e) {}
  return new Map();
};

const cache = {
  stats: null,
  activeTrips: null,
  drivers: null,
  vehicles: null,
  routes: loadRoutesCache()
};

const saveRoutesCache = () => {
  try {
    localStorage.setItem('routesCache', JSON.stringify(Array.from(cache.routes.entries())));
  } catch(e) {}
};

const normalizeId = (idObj) => {
  if (!idObj) return idObj;
  if (typeof idObj === 'string') return idObj;

  // Sometimes n8n returns ObjectId as { $oid: "..." }
  if (idObj.$oid) return idObj.$oid;
  if (idObj.oid) return idObj.oid;

  // Sometimes it's { type: 'Buffer', data: [...] }
  if (idObj.type === 'Buffer' && Array.isArray(idObj.data) && idObj.data.length === 12) {
    return idObj.data.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Sometimes it's { buffer: { 0: 106, 1: 113, ... } } or { buffer: [106, 113, ...] }
  if (idObj.buffer) {
    const bytes = Array.isArray(idObj.buffer) ? idObj.buffer : Object.values(idObj.buffer);
    if (bytes && bytes.length === 12) {
      return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }

  // Sometimes it's { id: { type: 'Buffer', data: [...] } }
  if (idObj.id && idObj.id.type === 'Buffer' && Array.isArray(idObj.id.data) && idObj.id.data.length === 12) {
    return idObj.id.data.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // If it's still an object and we can't parse it, we must safely stringify it to avoid [object Object]
  if (typeof idObj === 'object') {
     console.warn("Unrecognized ID format:", idObj);
     // Try to see if it's an object with a single string property that might be the ID
     const values = Object.values(idObj);
     if (values.length > 0 && typeof values[0] === 'string') return values[0];
     return JSON.stringify(idObj);
  }

  return idObj;
};

const fetchAPI = async (actionName, options = {}) => {
  try {
    let payloadData = null;
    if (options.body) {
      payloadData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    }

    // Get the JWT token from sessionStorage (if the user is logged in) 
    // or from a fallback environment variable.
    const savedUser = sessionStorage.getItem('ifms_user');
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    const token = parsedUser?.token || import.meta.env.VITE_API_TOKEN;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers,
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
      const normalizedId = normalizeId(doc._id);
      if (doc.body && doc.body.data) {
        return { _id: normalizedId, ...doc.body.data };
      }
      return { ...doc, _id: normalizedId };
    });

    const userDoc = docs.find(u => u.username === username && u.password === password);

    if (userDoc) {
      return { 
        role: "driver", 
        username: userDoc.name || username, 
        systemUsername: userDoc.username || username,
        id: userDoc._id || userDoc.id 
      };
    }
    throw new Error("Invalid driver credentials");
  }
};

// --- Stats & Dashboard ---
export const getFleetStats = async () => {
  if (cache.stats) return cache.stats;
  try {
    const vehicles = await getVehicles();
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
      const normalizedId = normalizeId(doc._id);
      if (doc.body && doc.body.data) {
        return { id: normalizedId, _id: normalizedId, ...doc.body.data };
      }
      return { ...doc, _id: normalizedId, id: normalizedId };
    });
    cache.activeTrips = docs.filter(t => t.status === 'Travelling');
    return cache.activeTrips;
  } catch (e) {
    return [];
  }
};

export const assignRoute = async (vehicleId, driverId, startCoords, endCoords) => {
  // Resolve vehicle and driver details from cache first, before clearing it
  let vehicle = cache.vehicles ? cache.vehicles.find(v => v.id === vehicleId || v._id === vehicleId) : null;
  let driver = cache.drivers ? cache.drivers.find(d => d.id === driverId || d._id === driverId) : null;

  // Fallback to fetching if not found in cache
  if (!vehicle) {
    const vehicles = await getVehicles();
    vehicle = vehicles.find(v => v.id === vehicleId || v._id === vehicleId);
  }
  if (!driver) {
    const drivers = await getDrivers();
    driver = drivers.find(d => d.id === driverId || d._id === driverId);
  }

  // Now clear the cache so the system registers the state changes (like vehicle status)
  cache.activeTrips = null;
  cache.vehicles = null;
  cache.drivers = null;
  cache.stats = null;
  
  return fetchAPI('assignRoute', {
    method: 'POST',
    body: JSON.stringify({
      vehicleId,
      driverId,
      make: vehicle?.make,
      model: vehicle?.model,
      plate: vehicle?.plate,
      driver: driver?.username || driver?.name,
      startCoords,
      endCoords,
      currentCoords: startCoords,
      status: 'Travelling',
      location: 'En Route'
    }),
  });
};

export const cancelRoute = async (tripId, vehicleId, driverId) => {
  console.log("CANCEL ROUTE CALLED WITH:", { tripId, vehicleId, driverId });

  // If vehicleId is a display string like "Make Model (PLATE)", find the true ID
  if (vehicleId && !vehicleId.match(/^[0-9a-fA-F]{24}$/)) {
    const vehicles = await getVehicles();
    const matchedVehicle = vehicles.find(v => vehicleId.includes(v.plate) || vehicleId === v.plate);
    if (matchedVehicle) {
      vehicleId = matchedVehicle.id || matchedVehicle._id;
    }
  }

  // If driverId is a display string (like the driver's name), find the true ID
  if (driverId && !driverId.match(/^[0-9a-fA-F]{24}$/)) {
    const drivers = await getDrivers();
    const matchedDriver = drivers.find(d => driverId.includes(d.name) || driverId === d.name);
    if (matchedDriver) {
      driverId = matchedDriver.id || matchedDriver._id;
    }
  }

  if (cache.activeTrips) {
    cache.activeTrips = cache.activeTrips.filter(t => t.id !== tripId && t._id !== tripId);
  }
  cache.stats = null;
  cache.vehicles = null; // Need to refresh so vehicle becomes Idle again
  return fetchAPI('cancelRoute', {
    method: 'POST',
    body: JSON.stringify({ tripId, vehicleId, driverId }),
  });
};

const decodePolyline = (encoded) => {
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
};

export const getRoutePath = async (startCoords, endCoords) => {
  const cacheKey = JSON.stringify({ startCoords, endCoords });
  if (cache.routes.has(cacheKey)) {
    return cache.routes.get(cacheKey);
  }

  try {
    const res = await fetchAPI('getRoutePath', {
      method: 'POST',
      body: JSON.stringify({ 
        startCoords, 
        endCoords, 
        alternatives: true, 
        options: { avoid_features: ['highways'], alternatives: 3 } 
      }),
    });

    let data = res;
    if (res.items && res.items.length > 0 && res.items[0].json) {
      data = res.items[0].json;
    }

    // AgentBuilder HTTP Node might return the body as a base64 string or JSON string
    if (data.body && typeof data.body === 'string') {
      try {
        const text = atob(data.body);
        const bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
          bytes[i] = text.charCodeAt(i);
        }
        const decoded = new TextDecoder().decode(bytes);
        data = JSON.parse(decoded);
      } catch (e) {
        console.warn('Failed to parse base64, trying direct JSON parse', e);
        try {
          data = JSON.parse(data.body);
        } catch (err) {
          console.error('Failed to parse route data:', err);
        }
      }
    } else if (data.body && typeof data.body === 'object') {
      data = data.body;
    }

    // If it returns standard GeoJSON
    if (data.features && data.features.length > 0 && data.features[0].geometry) {
      const allRoutes = data.features.map(feature => {
        const coords = feature.geometry.coordinates;
        const points = coords.map(c => [c[1], c[0]]); // Convert [lng, lat] to [lat, lng]
        let distance = feature.properties?.summary?.distance || 0;
        let duration = feature.properties?.summary?.duration || 0;
        return { points, distance, duration };
      });
      cache.routes.set(cacheKey, allRoutes);
      saveRoutesCache();
      return allRoutes;
    }
    
    // If it returns standard OpenRouteService JSON (encoded polyline)
    if (data.routes && data.routes.length > 0 && data.routes[0].geometry) {
      const allRoutes = data.routes.map(r => {
        let points = decodePolyline(r.geometry);
        let distance = r.summary?.distance || r.distance || 0;
        let duration = r.summary?.duration || r.duration || 0;
        return { points, distance, duration };
      });
      cache.routes.set(cacheKey, allRoutes);
      saveRoutesCache();
      return allRoutes;
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
    let drivers = docs.flatMap(doc => {
      const normalizedId = normalizeId(doc._id);
      if (doc.body && Array.isArray(doc.body.data)) {
        return doc.body.data.map((item, index) => ({
          id: `${normalizedId}_${index}`,
          _id: `${normalizedId}_${index}`,
          status: 'Active',
          ...item
        }));
      } else if (doc.body && doc.body.data) {
        return [{ id: normalizedId, _id: normalizedId, status: 'Active', ...doc.body.data }];
      }
      return [{ ...doc, _id: normalizedId, id: normalizedId, status: 'Active' }];
    });

    try {
      const activeTrips = await getActiveTrips();
      if (activeTrips && activeTrips.length > 0) {
        drivers = drivers.map(d => {
          const trip = activeTrips.find(t => t.driverId === d.id || t.driverId === d._id || t.driver === d.username || t.driver === d.name);
          if (trip) {
            return { ...d, status: 'Travelling' };
          }
          return d;
        });
      }
    } catch (err) {
      console.warn("Could not fetch active trips to correct driver status", err);
    }

    cache.drivers = drivers;
    return cache.drivers;
  } catch (e) {
    return [];
  }
};

export const addDriver = async (driverData) => {
  const currentDrivers = await getDrivers();

  if (Array.isArray(driverData)) {
    const duplicates = driverData.filter(d => 
      currentDrivers.some(cd => (cd.name && d.name && cd.name.toLowerCase() === d.name.toLowerCase()) || (cd.licenseNumber && d.licenseNumber && cd.licenseNumber.toLowerCase() === d.licenseNumber.toLowerCase()))
    );
    if (duplicates.length > 0) {
      throw new Error(`Duplicate record exists for drivers: ${duplicates.map(d => d.name).join(', ')}`);
    }

    const payloads = driverData.map(d => {
      const baseName = (d.name || 'driver').toLowerCase().replace(/\s+/g, '');
      const username = `${baseName}_${Math.floor(Math.random() * 900) + 100}`;
      const password = Math.random().toString(36).slice(-8);
      return { ...d, username, password, role: 'driver', status: 'Active' };
    });
    
    if (cache.drivers) {
      payloads.forEach((p, index) => cache.drivers.push({ _id: Date.now().toString() + index, ...p }));
    }
    
    // Send individual requests so that they are inserted as separate documents
    await Promise.all(payloads.map(payload => 
      fetchAPI('addDriver', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    ));
    
    return payloads;
  }

  const isDuplicate = currentDrivers.some(cd => (cd.name && driverData.name && cd.name.toLowerCase() === driverData.name.toLowerCase()) || (cd.licenseNumber && driverData.licenseNumber && cd.licenseNumber.toLowerCase() === driverData.licenseNumber.toLowerCase()));
  if (isDuplicate) {
    throw new Error('Duplicate record exists: A driver with this name or license number already exists.');
  }

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
    
    let vehicles = docs.flatMap(doc => {
      const normalizedId = normalizeId(doc._id);
      if (doc.body && Array.isArray(doc.body.data)) {
        return doc.body.data.map((item, index) => ({
          id: `${normalizedId}_${index}`,
          _id: `${normalizedId}_${index}`,
          status: 'Idle',
          ...item
        }));
      } else if (doc.body && doc.body.data) {
        return [{ id: normalizedId, _id: normalizedId, status: 'Idle', ...doc.body.data }];
      }
      return [{ ...doc, _id: normalizedId, id: normalizedId, status: doc.status || 'Idle' }];
    });

    // Compensate for webhook not updating vehicle status
    try {
      const activeTrips = await getActiveTrips();
      if (activeTrips && activeTrips.length > 0) {
        vehicles = vehicles.map(v => {
          const trip = activeTrips.find(t => t.vehicleId === v.id || t.vehicleId === v._id);
          if (trip) {
            return { ...v, status: 'Travelling', driver: trip.driver || v.driver };
          }
          return v;
        });
      }
    } catch (tripErr) {
      console.warn("Could not fetch active trips to correct vehicle status", tripErr);
    }

    cache.vehicles = vehicles;
    return cache.vehicles;
  } catch (e) {
    return [];
  }
};

export const addVehicle = async (vehicleData) => {
  const currentVehicles = await getVehicles();

  if (Array.isArray(vehicleData)) {
    const duplicates = vehicleData.filter(v => 
      currentVehicles.some(cv => cv.plate && v.plate && cv.plate.toLowerCase() === v.plate.toLowerCase())
    );
    if (duplicates.length > 0) {
      throw new Error(`Duplicate record exists for vehicles with plate: ${duplicates.map(v => v.plate).join(', ')}`);
    }

    const payloads = vehicleData.map(v => ({ ...v, status: 'Idle' }));
    if (cache.vehicles) {
      payloads.forEach((p, index) => cache.vehicles.push({ _id: Date.now().toString() + index, ...p }));
    }
    cache.stats = null;
    
    // Send individual requests to insert them as separate documents
    await Promise.all(payloads.map(payload => 
      fetchAPI('addVehicle', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    ));
    
    return payloads;
  }

  const isDuplicate = currentVehicles.some(cv => cv.plate && vehicleData.plate && cv.plate.toLowerCase() === vehicleData.plate.toLowerCase());
  if (isDuplicate) {
    throw new Error('Duplicate record exists: A vehicle with this plate already exists.');
  }

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
  if (cache.activeTrips) {
    // Clear any active trips that were associated with this vehicle
    cache.activeTrips = cache.activeTrips.filter(t => t.vehicleId !== id);
  }
  cache.stats = null;
  return fetchAPI('removeVehicle', {
    method: 'POST',
    body: JSON.stringify({ _id: id }),
  });
};
