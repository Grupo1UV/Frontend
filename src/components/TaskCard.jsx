import React from 'react';
import { Link } from 'react-router-dom';
import TaskBadge from './TaskBadge';

/**
 * Componente TaskCard
 * Representa una tarjeta de gestión o subtarea logística.
 * Integra:
 * - Badges reglamentarios: "Hecha", "Pendiente", "Vencida" y "Urgente".
 * - Menú de Acciones Secundarias: "Posponer", "Reprogramar", "Editar" y "Eliminar".
 */
export default function TaskCard({
  task,
  onComplete,
  onSnooze,
  onReprogram,
  onDeleteRequest,
}) {
  const isDone = task.estado === 'Hecha';

  return (
    <article className={`task-card-item ${isDone ? 'task-card-completed' : ''}`}>
      {/* Selector circular de estado */}
      <button
        type="button"
        className={`task-check-circle ${isDone ? 'checked' : ''}`}
        onClick={() => onComplete?.(task.eventoId, task.id)}
        aria-label={`Marcar ${task.titulo} como ${isDone ? 'pendiente' : 'realizada'}`}
        title={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
      >
        {isDone ? '✓' : ''}
      </button>

      {/* Contenido principal de la tarea */}
      <div className="task-content-body">
        <div className="task-header-line">
          <h4 className="task-title-text">{task.titulo}</h4>
          {/* Badge reglamentario ("Hecha", "Pendiente", "Vencida", "Urgente") */}
          <TaskBadge estado={task.estado} />
        </div>

        <p className="task-event-parent">
          <span className="event-icon" aria-hidden="true">📅</span>
          <strong>{task.eventoNombre}</strong>
          {task.responsable && <span className="task-assignee">• Resp: {task.responsable}</span>}
        </p>

        <div className="task-meta-pills">
          <span className="meta-pill">
            <span className="meta-icon" aria-hidden="true">⏳</span>
            Vence: <strong>{task.fechaLimite}</strong>
          </span>
          <span className="meta-pill">
            <span className="meta-icon" aria-hidden="true">⏱️</span>
            Estimación: <strong>{task.horasEstimadas} {task.horasEstimadas === 1 ? 'hora' : 'horas'}</strong>
          </span>
        </div>
      </div>

      {/* Menú de Acciones Secundarias reglamentarias: Posponer, Reprogramar, Editar, Eliminar */}
      <div className="task-actions-col">
        {!isDone && onSnooze && (
          <button
            type="button"
            className="btn-action-ghost"
            onClick={() => onSnooze(task.eventoId, task.id)}
            title="Posponer gestión para más adelante"
          >
            Posponer
          </button>
        )}

        <Link
          to={`/evento/${task.eventoId}?modo=editar`}
          className="btn-action-ghost"
          title="Reprogramar o editar tiempos de la gestión"
        >
          Reprogramar
        </Link>

        <Link
          to={`/evento/${task.eventoId}`}
          className="btn-action-link"
          title="Ver detalle logístico del evento"
        >
          Ver detalle →
        </Link>

        {onDeleteRequest && (
          <button
            type="button"
            className="btn-action-delete"
            onClick={() => onDeleteRequest(task.eventoId, task)}
            title="Eliminar gestión (activa modal de confirmación)"
            style={{ color: '#DC2626' }}
          >
            🗑️
          </button>
        )}
      </div>
    </article>
  );
}
