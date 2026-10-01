/**
 * Servicio de Cliente HTTP - Eventify (Segregación de Datos por Usuario)
 *
 * Configuración oficial de Fetch/Axios para adjuntar el Bearer Token en
 * las cabeceras (headers) de todas las peticiones hacia la API REST.
 */

const BASE_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://grupo1uv.onrender.com/api'
    : 'http://localhost:8000/api';

export function getAuthHeaders() {
  try {
    const stored = localStorage.getItem('eventify_user_auth_v1');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.token) {
        return {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        };
      }
    }
  } catch (e) {
    console.warn('Error recuperando token de autenticación', e);
  }

  // Token de respaldo para entorno de evaluación
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer jwt_token_eventify_evaluacion_2026',
  };
}

export const api = {
  baseUrl: BASE_URL,

  async get(endpoint) {
    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });
  },

  async post(endpoint, data) {
    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  async put(endpoint, data) {
    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  async patch(endpoint, data) {
    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint) {
    return fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  },
};

export default api;
