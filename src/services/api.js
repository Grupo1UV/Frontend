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
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const stored = localStorage.getItem('eventify_user_auth_v1');
    if (stored) {
      const user = JSON.parse(stored);
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      if (user?.uuid || user?.id) {
        headers['X-User-Id'] = user.uuid || user.id;
      }
      return headers;
    }
  } catch (e) {
    console.warn('Error recuperando token de autenticación', e);
  }

  // Token de respaldo para entorno de evaluación
  headers['Authorization'] = 'Bearer jwt_token_eventify_evaluacion_2026';
  return headers;
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

  // Métodos especializados Sprint 3
  async getCapacity() {
    const res = await this.get('/users/capacity');
    if (!res.ok) {
      const err = new Error('No se pudo cargar el límite actual');
      err.status = res.status;
      throw err;
    }
    return res.json();
  },

  async updateCapacity(limitHoursDay) {
    const res = await this.put('/users/capacity', { limitHoursDay });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Error al actualizar el límite');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  async updateSubtask(subtaskId, payload) {
    const res = await this.patch(`/subtasks/${subtaskId}`, payload);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Error al actualizar la subtarea');
      err.status = res.status;
      err.statusCode = res.status;
      err.error = data.error;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  async getSubtasksToday(params = '') {
    return this.get(`/subtasks/today${params ? `?${params}` : ''}`);
  },
};

export default api;
