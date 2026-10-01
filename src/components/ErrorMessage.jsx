import React from 'react';

/**
 * Decisión 3: Patrón de Manejo de Errores de Carga (Dashboard y Vista /hoy)
 *
 * Criterios de Usabilidad:
 * - Ayuda a los usuarios a reconocer, diagnosticar y recuperarse de errores.
 *
 * Controla excepciones mediante la propiedad o estado `hasError`, dividiendo los errores
 * en dos jerarquías visuales:
 * 1. Error Global en Contenedor Central:
 *    - Centro de la pantalla en un contenedor central.
 *    - Ícono de exclamación (!).
 *    - Microcopy exacto: "Ha ocurrido un error cargando la información de los eventos, inténtelo de nuevo."
 *    - Botón para reintentar la conexión.
 * 2. Error Localizado a Nivel de Componente:
 *    - Cuando el error ocurre solo en un módulo específico (ej. gestiones urgentes de catering).
 *    - Mantiene el resto de la interfaz completamente funcional.
 *    - Mensaje y botón de recarga restringidos al marco delimitado del componente afectado.
 */
export default function ErrorMessage({
  hasError = false,
  variant = 'global', // 'global' | 'local'
  message = null,
  details = null,
  moduleName = 'Gestiones Urgentes de Catering',
  onRetry = null,
  onReload = null,
  isLoading = false,
}) {
  if (!hasError) return null;

  // =========================================================================
  // JERARQUÍA 1: ERROR GLOBAL EN CONTENEDOR CENTRAL
  // =========================================================================
  if (variant === 'global') {
    const globalMessage =
      message || 'Ha ocurrido un error cargando la información de los eventos, inténtelo de nuevo.';

    return (
      <div className="global-error-container" role="alert" aria-live="assertive" data-decision="decision-3-global">
        <div className="global-error-card">
          {/* Ícono de exclamación (!) */}
          <div className="global-error-icon-box" aria-hidden="true">
            <span className="global-exclamation-mark">!</span>
          </div>

          <div className="global-error-badge">Falla de API / Servidor</div>

          {/* Microcopy oficial */}
          <h2 className="global-error-title">{globalMessage}</h2>

          {details && <p className="global-error-description">{details}</p>}

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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
                  </svg>
                  Reintentar conexión
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // JERARQUÍA 2: ERROR LOCALIZADO A NIVEL DE COMPONENTE
  // =========================================================================
  const localMessage =
    message || `No fue posible cargar las ${moduleName.toLowerCase()}. Inténtelo de nuevo.`;

  return (
    <div
      className="local-error-frame"
      role="region"
      aria-label={`Error en módulo: ${moduleName}`}
      data-decision="decision-3-local"
    >
      <div className="local-error-header">
        <div className="local-error-title-wrapper">
          <span className="local-error-icon" aria-hidden="true">⚠️</span>
          <div>
            <h4 className="local-error-title">Fallo localizado en {moduleName}</h4>
            <span className="local-error-tag">Error aislado • El resto del Dashboard permanece operativo</span>
          </div>
        </div>

        <button
          type="button"
          className="local-error-reload-btn"
          onClick={onReload || onRetry}
          disabled={isLoading}
          title="Recargar exclusivamente este módulo"
        >
          {isLoading ? (
            <span className="spinner-inline-sm" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
            </svg>
          )}
          <span>{isLoading ? 'Recargando...' : 'Recargar módulo'}</span>
        </button>
      </div>

      <p className="local-error-message">{localMessage}</p>

      <div className="local-error-footer">
        <span className="local-error-hint">
          ℹ️ Este fallo no bloquea la navegación, la vista de prioridades ni la interacción con las demás tareas.
        </span>
      </div>
    </div>
  );
}
