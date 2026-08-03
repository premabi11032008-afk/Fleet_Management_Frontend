/**
 * Intelligent Fleet Management System - API Endpoints
 */

const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL;

// --- Caches for GET requests to handle StrictMode double-firing ---
const cache = {
  stats: null,
  activeTrips: null,
  drivers: null,
  vehicles: null
};

// Helper function to extract data safely from n8n wrapper
const extractData = (rawData) => {
  if (Array.isArray(rawData)) {
    if (rawData.length > 0 && Array.isArray(rawData[0].body)) return rawData[0].body;
    if (rawData.length > 0 && Array.isArray(rawData[0].data)) return rawData[0].data;
    if (rawData.length > 0 && rawData[0].json) return rawData.map(item => item.json);
    return rawData;
  }
  if (rawData && Array.isArray(rawData.data)) return rawData.data;
  if (rawData && Array.isArray(rawData.body)) return rawData.body;

  // For objects (like stats)
  if (rawData && typeof rawData === 'object' && !rawData.mode) {
    if (rawData.body) return rawData.body;
    if (rawData.data) return rawData.data;
    return rawData; // might return {} here
  }
  return null;
};

// Generic GET function with caching
const fetchFromN8n = async (action, defaultData, cacheKey) => {
  try {
    const response = await fetch(N8N_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });

    const rawData = await response.json();
    let data = extractData(rawData);

    // If we expect an array (defaultData is an array) and we got a non-array, try to fix it
    if (Array.isArray(defaultData)) {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // If it just returns the input { action: '...' }, the switch node fell through and no data exists.
        if (Object.keys(data).length === 0 || (Object.keys(data).length === 1 && data.action)) {
          data = [];
        } else if (data.items && Array.isArray(data.items)) {
          data = data.items;
        } else {
          // A single object returned instead of array of 1
          data = [data];
        }
      } else if (!data) {
        data = [];
      }
    }

    cache[cacheKey] = data;
    return data;
  } catch (error) {
    console.error(`Error fetching ${action} from n8n:`, error);
    return cache[cacheKey] || defaultData;
  }
};

// Generic POST function
const postToN8n = async (action, payload) => {
  try {
    console.log(`[n8n] Sending POST request to ${N8N_BASE_URL} for action: ${action}`);
    const response = await fetch(N8N_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload })
    });

    if (!response.ok) {
      console.error(`[n8n] Request failed with status ${response.status} - please check if your n8n workflow is Active!`);
    }

    const rawData = await response.json();
    let extracted = extractData(rawData) || rawData;
    return extracted;
  } catch (error) {
    console.error(`Error posting ${action} to n8n:`, error);
    throw error;
  }
};

// --- Auth ---
let cachedCredentials = null;

export const authenticateUser = async (role, username, password) => {
  if (role === 'manager') {
    if (username === import.meta.env.VITE_MANAGER_USERNAME && password === import.meta.env.VITE_MANAGER_PASSWORD) {
      return { role: 'manager', username: 'Fleet Manager', id: 'm1' };
    }
    throw new Error('Invalid manager credentials.');
  }

  if (role === 'driver') {
    if (!cachedCredentials) {
      cachedCredentials = await postToN8n('getCredentials', {});
    }

    if (cachedCredentials && !Array.isArray(cachedCredentials) && typeof cachedCredentials === 'object') {
      cachedCredentials = [cachedCredentials];
    }

    if (Array.isArray(cachedCredentials)) {
      let credentialsToSearch = cachedCredentials;
      if (cachedCredentials.length > 0 && cachedCredentials[0]._responseData) {
        credentialsToSearch = cachedCredentials[0].items ? cachedCredentials[0].items.map(i => i.json) : [cachedCredentials[0]._responseData];
      }

      const driver = credentialsToSearch.find(d => {
        const u = d.username || d['User Name'];
        const p = d.generatedPassword || d.Password || d.password;
        return u === username && p === password;
      });

      if (driver) {
        return { role: 'driver', username: driver.name || driver['User Name'] || username, id: driver.id || Date.now().toString() };
      }
    }
  }

  throw new Error('Invalid credentials.');
};

// --- Stats & Dashboard ---
export const getFleetStats = async () => {
  return fetchFromN8n('getFleetStats', {
    totalVehicles: 0,
    travellingCount: 0,
    idleCount: 0,
    maintenanceCount: 0
  }, 'stats');
};

export const getActiveTrips = async () => {
  const trips = await fetchFromN8n('getActiveTrips', [], 'activeTrips');
  return trips.map(v => ({
    id: v.id || v._rowIndex || Date.now().toString(),
    make: v['Make'] || v.make,
    model: v['Model'] || v.model,
    plate: v['Plate'] || v.plate,
    status: v['Status'] || v.status,
    driver: v['Driver'] || v.driver || v['Driver Name'],
    location: v['Location'] || v.location,
    startCoords: v['Start Coords'] ? JSON.parse(v['Start Coords']) : v.startCoords,
    endCoords: v['End Coords'] ? JSON.parse(v['End Coords']) : v.endCoords,
    currentCoords: v['Current Coords'] ? JSON.parse(v['Current Coords']) : v.currentCoords
  }));
};

export const assignRoute = async (vehicleId, driverId, startCoords, endCoords) => {
  cache.activeTrips = null;
  cache.vehicles = null;
  cache.stats = null;
  return await postToN8n('assignRoute', { vehicleId, driverId, startCoords, endCoords });
};

// --- Drivers ---
export const getDrivers = async () => {
  const drivers = await fetchFromN8n('getDrivers', [], 'drivers');
  return drivers.map(d => ({
    id: d.id || d._rowIndex || Date.now().toString(),
    name: d['Driver Name'] || d.name,
    licenseNumber: d['License Number'] || d.licenseNumber,
    phone: d['Phone Number'] || d.phone,
    address: d['Address'] || d.address,
    status: d['Status'] || d.status,
    username: d['User Name'] || d.username,
  }));
};

export const addDriver = async (driverData) => {
  cache.drivers = null;
  return await postToN8n('addDriver', driverData);
};

export const removeDriver = async (id) => {
  cache.drivers = null;
  return await postToN8n('removeDriver', { id });
};

// --- Vehicles ---
export const getVehicles = async () => {
  const vehicles = await fetchFromN8n('getVehicles', [], 'vehicles');
  return vehicles.map(v => ({
    id: v.id || v._rowIndex || Date.now().toString(),
    make: v['Make'] || v.make,
    model: v['Model'] || v.model,
    year: v['Year'] || v.year,
    vin: v['VIN'] || v.vin,
    plate: v['Plate'] || v.plate,
    status: v['Status'] || v.status,
    driver: v['Driver'] || v.driver,
    location: v['Location'] || v.location,
    currentCoords: v['Current Coords'] ? JSON.parse(v['Current Coords']) : v.currentCoords
  }));
};

export const addVehicle = async (vehicleData) => {
  cache.vehicles = null;
  cache.stats = null;
  return await postToN8n('addVehicle', vehicleData);
};

export const removeVehicle = async (id) => {
  cache.vehicles = null;
  cache.stats = null;
  return await postToN8n('removeVehicle', { id });
};
