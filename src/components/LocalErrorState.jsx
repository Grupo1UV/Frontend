import React from 'react';

/**
 * Decisión 3 - Jerarquía 2: Error Localizado a Nivel de Componente
 *
 * Criterios de Usabilidad:
 * - Ayuda a los usuarios a reconocer, diagnosticar y recuperarse de errores:
 *   Cuando la falla se limita a un módulo específico (ej. error al cargar las gestiones urgentes
 *   de catering), la vista general del evento y el resto del panel se mantienen funcionales.
 *   El fallo se restringe exclusivamente al marco delimitado del componente afectado con opción de recarga local.
 */
export default function LocalErrorState({
  moduleName = 'Gestiones Urgentes de Catering',
  errorMessage = 'No fue posible sincronizar las gestiones de catering con el proveedor externo.',
  onReload,
  isLoading = false,
}) {
  return (
    <div
      className="local-error-frame"
      role="region"
      aria-label={`Error en módulo: ${moduleName}`}
      data-decision="decision-3-local-error"
    >
      <div className="local-error-header">
        <div className="local-error-title-wrapper">
          <span className="local-error-icon" aria-hidden="true">⚠️</span>
          <div>
            <h4 className="local-error-title">Fallo aislado: {moduleName}</h4>
            <span className="local-error-tag">Error localizado • El resto del panel sigue activo</span>
          </div>
        </div>

        <button
          type="button"
          className="local-error-reload-btn"
          onClick={onReload}
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

      <p className="local-error-message">{errorMessage}</p>

      <div className="local-error-footer">
        <span className="local-error-hint">
          ℹ️ Las demás áreas de trabajo, prioridades y el resumen general del evento no han sido afectadas.
        </span>
      </div>
    </div>
  );
}
