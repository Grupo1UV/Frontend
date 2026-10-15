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
  customPercentage = '',
  statusLabel = '',
}) {
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));

  let barColor = '#2563EB'; // Azul (En curso)
  let statusName = 'En curso';
  let badgeColorClass = 'badge-blue';
  let dynamicSublabel = sublabel;

  // Construir texto descriptivo si se proporcionan conteos
  if (completedCount !== null && totalCount !== null) {
    dynamicSublabel = eventName
      ? `${completedCount} de ${totalCount} subtareas completadas en ${eventName}`
      : `${completedCount} de ${totalCount} subtareas completadas`;
  }

  if (hasCriticalError) {
    barColor = '#DC2626'; // Rojo (Error / Alerta)
    statusName = 'Atención requerida';
    badgeColorClass = 'badge-red';
    dynamicSublabel = 'No se han podido cargar las tareas logísticas.';
  } else if (safeProgress === 100) {
    barColor = '#16A34A'; // Verde (Completado)
    statusName = 'Completado';
    badgeColorClass = 'badge-green';
  } else if (safeProgress === 0) {
    barColor = '#16A34A'; // Verde (Plan inicial 0%)
    statusName = 'Plan inicial';
    badgeColorClass = 'badge-green';
  } else {
    barColor = '#2563EB'; // Azul (En curso)
    statusName = 'En curso';
    badgeColorClass = 'badge-blue';
  }

  const finalStatus = statusLabel || statusName;

  // Formato del porcentaje de avance independiente (ej. "28,6 % de progreso")
  let formattedPercentage = '';
  if (customPercentage) {
    formattedPercentage = customPercentage.includes('de progreso')
      ? customPercentage
      : `${customPercentage} de progreso`;
  } else {
    formattedPercentage = `${safeProgress}% de progreso`;
  }

  return (
    <div className={`progress-component progress-${size}`}>
      {showLabel && (
        <div className="progress-header">
          <div className="progress-header-top">
            <span className="progress-percentage" style={{ color: barColor }}>
              {formattedPercentage}
            </span>
            <span
              className={`progress-badge ${badgeColorClass}`}
              style={{
                backgroundColor: `${barColor}18`,
                color: barColor,
                borderColor: `${barColor}40`,
              }}
            >
              {finalStatus}
            </span>
          </div>
          {dynamicSublabel && (
            <span className={`progress-sublabel ${hasCriticalError ? 'text-danger-error' : ''}`}>
              {dynamicSublabel}
            </span>
          )}
        </div>
      )}

      <div
        className="progress-track"
        style={{ height: `${height}px` }}
        role="progressbar"
        aria-valuenow={safeProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={dynamicSublabel || `${formattedPercentage} • ${finalStatus}`}
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
