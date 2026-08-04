/**
 * Intelligent Fleet Management System - FastAPI Endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Generic Fetch Helper
const fetchAPI = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error with ${endpoint}:`, error);
    throw error;
  }
};

// --- Auth ---
export const authenticateUser = async (role, username, password) => {
  return fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ role, username, password }),
  });
};

// --- Stats & Dashboard ---
export const getFleetStats = async () => {
  try {
    return await fetchAPI('/fleet/stats');
  } catch (e) {
    return {
      totalVehicles: 0,
      travellingCount: 0,
      idleCount: 0,
      maintenanceCount: 0
    };
  }
};

export const getActiveTrips = async () => {
  try {
    return await fetchAPI('/fleet/active-trips');
  } catch (e) {
    return [];
  }
};

export const assignRoute = async (vehicleId, driverId, startCoords, endCoords) => {
  return fetchAPI('/fleet/assign-route', {
    method: 'POST',
    body: JSON.stringify({
      vehicleId,
      driverId,
      startCoords,
      endCoords,
      currentCoords: startCoords,
    }),
  });
};

// --- Drivers ---
export const getDrivers = async () => {
  try {
    return await fetchAPI('/drivers/');
  } catch (e) {
    return [];
  }
};

export const addDriver = async (driverData) => {
  return fetchAPI('/drivers/', {
    method: 'POST',
    body: JSON.stringify(driverData),
  });
};

export const removeDriver = async (id) => {
  return fetchAPI(`/drivers/${id}`, {
    method: 'DELETE',
  });
};

// --- Vehicles ---
export const getVehicles = async () => {
  try {
    return await fetchAPI('/vehicles/');
  } catch (e) {
    return [];
  }
};

export const addVehicle = async (vehicleData) => {
  return fetchAPI('/vehicles/', {
    method: 'POST',
    body: JSON.stringify(vehicleData),
  });
};

export const removeVehicle = async (id) => {
  return fetchAPI(`/vehicles/${id}`, {
    method: 'DELETE',
  });
};
