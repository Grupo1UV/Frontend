import React from 'react';

/**
 * 3. Feedback Visual en Barras de Progreso (ProgressBar)
 *
 * Configura la barra de progreso con lógica tricolor:
 * - Azul (#2563EB - Activo): Muestra el porcentaje (ej. "14.2%") y texto descriptivo
 *   (ej. "2 de 14 gestiones completadas en Boda Valentina & Emilio").
 * - Verde (#16A34A - Éxito/Base): Muestra cuando el progreso está en 0% por ausencia de eventos
 *   O cuando se completa el 100% de la planificación.
 * - Rojo (#DC2626 - Error): Si fallan las subtareas del progreso, cambia a rojo con el
 *   microcopy exacto: "No se han podido cargar las tareas logísticas."
 */
export default function ProgressBar({
  progress = 0,
  hasCriticalError = false,
  showLabel = true,
  height = 10,
  size = 'md',
  sublabel = '',
  eventName = '',
  completedCount = null,
  totalCount = null,
}) {
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  let barColor = '#2563EB'; // Azul (Activo)
  let statusName = `Activo (${safeProgress}%)`;
  let badgeColorClass = 'badge-blue';
  let dynamicSublabel = sublabel;

  // Construir texto descriptivo si se proporcionan conteos
  if (completedCount !== null && totalCount !== null) {
    dynamicSublabel = eventName
      ? `${completedCount} de ${totalCount} gestiones completadas en ${eventName}`
      : `${completedCount} de ${totalCount} gestiones completadas`;
  }

  if (hasCriticalError) {
    barColor = '#DC2626'; // Rojo (Error)
    statusName = 'Error en tareas logísticas';
    badgeColorClass = 'badge-red';
    // Microcopy exacto exigido en caso de fallo
    dynamicSublabel = 'No se han podido cargar las tareas logísticas.';
  } else if (safeProgress === 0) {
    barColor = '#16A34A'; // Verde (Base 0%)
    statusName = 'Base: Plan listo (0%)';
    badgeColorClass = 'badge-green';
    if (!dynamicSublabel) {
      dynamicSublabel = eventName
        ? `0 de ${totalCount || 0} gestiones completadas en ${eventName}`
        : 'Plan inicial listo para ejecutarse (0%)';
    }
  } else if (safeProgress === 100) {
    barColor = '#16A34A'; // Verde (Éxito 100%)
    statusName = 'Éxito: Planificación completada (100%)';
    badgeColorClass = 'badge-green';
    if (!dynamicSublabel) {
      dynamicSublabel = eventName
        ? `Todas las ${totalCount || completedCount || ''} gestiones completadas en ${eventName}`
        : 'Planificación completada con éxito (100%)';
    }
  } else {
    barColor = '#2563EB'; // Azul (Activo)
    statusName = `Activo (${safeProgress}%)`;
    badgeColorClass = 'badge-blue';
  }

  return (
    <div className={`progress-component progress-${size}`}>
      {showLabel && (
        <div className="progress-header">
          <div className="progress-info">
            <span className="progress-percentage" style={{ color: barColor }}>
              {safeProgress}%
            </span>
            {dynamicSublabel && (
              <span className={`progress-sublabel ${hasCriticalError ? 'text-danger-error' : ''}`}>
                {dynamicSublabel}
              </span>
            )}
          </div>
          <span
            className={`progress-badge ${badgeColorClass}`}
            style={{
              backgroundColor: `${barColor}18`,
              color: barColor,
              borderColor: `${barColor}40`,
            }}
          >
            {statusName}
          </span>
        </div>
      )}

      <div
        className="progress-track"
        style={{ height: `${height}px` }}
        role="progressbar"
        aria-valuenow={safeProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={dynamicSublabel || `${safeProgress}% completado`}
      >
        <div
          className="progress-fill"
          style={{
            width: `${safeProgress}%`,
            backgroundColor: barColor,
            minWidth: safeProgress === 0 ? '6px' : undefined,
          }}
        />
      </div>
    </div>
  );
}
