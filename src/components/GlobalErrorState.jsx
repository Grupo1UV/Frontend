import React from 'react';

/**
 * Decisión 3 - Jerarquía 1: Error en Contenedor Central (Falla Global de API/Servidor)
 *
 * Criterios de Usabilidad:
 * - Ayuda a los usuarios a reconocer, diagnosticar y recuperarse de errores:
 *   Formular mensajes transparentes y delimitar el alcance del problema para evitar pánico de interacción.
 *
 * Estructura:
 * - Contenedor central.
 * - Ícono de exclamación de alta visibilidad.
 * - Diagnóstico comprensible (conexión general con Django REST API / servidor).
 * - Opción de reintento global.
 */
export default function GlobalErrorState({
  onRetry,
  isLoading = false,
  message = 'Falla de Conexión con el Servidor Django REST API',
  details = 'No se pudo establecer comunicación con el backend Django REST API ni sincronizar la base de datos central. Verifica tu conexión a la red local o el estado del servicio en el puerto correspondiente.',
}) {
  return (
    <div className="global-error-container" role="alert" aria-live="assertive">
      <div className="global-error-card">
        <div className="global-error-icon-box">
          <svg
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="error-exclamation-svg"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
          </svg>
        </div>

        <div className="global-error-badge">Error Global del Sistema (503 / Network Error)</div>
        <h2 className="global-error-title">{message}</h2>
        <p className="global-error-description">{details}</p>

        <div className="global-error-recovery">
          <button
            type="button"
            className="cta-button retry-button-primary"
            onClick={onRetry}
            disabled={isLoading}
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            {isLoading ? (
              <>
                <span className="spinner-inline" /> Reintentando conexión...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
                </svg>
                Reintentar conexión global
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
