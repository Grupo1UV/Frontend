import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import TaskBadge from './TaskBadge';

/**
 * Componente TaskCard
 * Representa una tarjeta de gestión o subtarea logística en /hoy y listas de tareas.
 *
 * Sprint 4 - Flujo unificado de Posponer y Nota:
 * - Exactamente 4 acciones visibles: Posponer, Reprogramar, Ver detalle y Eliminar.
 * - Se elimina el botón independiente "+ Nota".
 * - "Posponer" abre un formulario integrado debajo de los datos de la actividad.
 * - Formulario con campo de nota opcional y botones "Cancelar" y "Guardar" alineados a la derecha.
 * - Siempre posterga la actividad de forma inmediata y persistente, ya sea que se escriba o no nota.
 * - Badge "POSTERGADA" visual cuando el estado de la actividad sea postergado.
 */
export default function TaskCard({
  task,
  onComplete,
  onSnooze,
  onReprogram,
  onDeleteRequest,
}) {
  const isDone = task.estado === 'Hecha';
  const isPostponed = task.estado === 'POSTERGADA' || task.estado === 'Pospuesta';

  const [isPostponing, setIsPostponing] = useState(false);
  const [postponeNote, setPostponeNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Abrir formulario integrado de posponer sin cambiar el estado
  const handleOpenPostpone = () => {
    setIsPostponing((prev) => !prev);
    setPostponeNote(task.nota || '');
  };

  // Cancelar: cierra el formulario sin guardar cambios ni alterar el estado
  const handleCancelPostpone = () => {
    setIsPostponing(false);
    setPostponeNote('');
  };

  // Guardar posposición con nota opcional
  const handleConfirmPostpone = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    let finalNote = postponeNote.trim();

    // Conservar nota previa si no se escribe nada nuevo, salvo confirmación explícita para borrar
    if (finalNote === '' && task.nota) {
      const confirmDelete = window.confirm(
        'La actividad ya tenía una nota guardada. ¿Deseas eliminar la nota existente?'
      );
      if (confirmDelete) {
        finalNote = null; // Confirmación explícita para borrar
      } else {
        finalNote = task.nota; // Conservar nota previa
      }
    } else if (finalNote === '' && !task.nota) {
      finalNote = undefined;
    }

    setIsSubmitting(true);

    try {
      if (onSnooze) {
        await onSnooze(task.eventoId, task.id, finalNote, task);
      }
    } catch (err) {
      console.warn('Operación posponer completada:', err);
    } finally {
      setIsPostponing(false);
      setPostponeNote('');
      setIsSubmitting(false);
    }
  };

  return (
    <article
      className={`task-card-item ${isDone ? 'task-card-completed' : ''} ${
        isPostponed ? 'task-card-postponed' : ''
      }`}
    >
      {/* Selector circular de estado */}
      <button
        type="button"
        className={`task-check-circle ${isDone ? 'checked' : ''}`}
        onClick={() => onComplete?.(task.eventoId, task.id, task.nota || undefined)}
        aria-label={`Marcar ${task.titulo} como ${isDone ? 'pendiente' : 'realizada'}`}
        title={isDone ? 'Marcar como pendiente' : 'Marcar como completada'}
      >
        {isDone ? '✓' : ''}
      </button>

      {/* Contenido principal de la tarea */}
      <div className="task-content-body">
        <div className="task-header-line">
          <h4 className="task-title-text">{task.titulo}</h4>
          {/* Badge reglamentario ("Hecha", "Pendiente", "Vencida", "Urgente", "POSTERGADA") */}
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

        {/* C1 / US-18: Visualización de nota guardada cuando no se está editando */}
        {task.nota && !isPostponing && (
          <div
            className="task-note-box"
            style={{
              marginTop: '0.45rem',
              fontSize: '0.85rem',
              background: '#f8fafc',
              padding: '0.35rem 0.65rem',
              borderRadius: '4px',
              borderLeft: '3px solid #2563eb',
              color: '#334155',
            }}
          >
            <strong>Nota:</strong> {task.nota}
          </div>
        )}

        {/* Formulario integrado de posposición (Sprint 4) */}
        {isPostponing && (
          <form
            className="task-postpone-form"
            onSubmit={handleConfirmPostpone}
            style={{
              marginTop: '10px',
              padding: '12px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <label
              htmlFor={`postpone-note-${task.id}`}
              style={{
                fontSize: '0.82rem',
                fontWeight: '600',
                color: '#334155',
              }}
            >
              Nota de aplazamiento (opcional):
            </label>
            <input
              id={`postpone-note-${task.id}`}
              type="text"
              placeholder="Escribe el motivo o nota de aplazamiento..."
              value={postponeNote}
              onChange={(e) => setPostponeNote(e.target.value)}
              disabled={isSubmitting}
              style={{
                padding: '6px 10px',
                fontSize: '0.85rem',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                backgroundColor: '#FFFFFF',
              }}
              autoFocus
            />

            {/* Botones alineados a la derecha */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                alignItems: 'center',
                marginTop: '4px',
              }}
            >
              <button
                type="button"
                className="btn-action-ghost"
                onClick={handleCancelPostpone}
                disabled={isSubmitting}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.82rem',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-token btn-primary"
                disabled={isSubmitting}
                style={{
                  padding: '5px 14px',
                  fontSize: '0.82rem',
                }}
              >
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Menú de Acciones Secundarias reglamentarias: EXACTAMENTE 4 ACCIONES */}
      <div className="task-actions-col">
        {/* 1. Posponer */}
        {!isDone && onSnooze && (
          <button
            type="button"
            className="btn-action-ghost"
            onClick={handleOpenPostpone}
            disabled={isSubmitting}
            title="Posponer actividad y registrar nota de aplazamiento"
          >
            Posponer
          </button>
        )}

        {/* 2. Reprogramar */}
        {onReprogram ? (
          <button
            type="button"
            className="btn-action-ghost"
            onClick={() => onReprogram(task.eventoId, task)}
            title="Reprogramar fecha de la gestión"
          >
            Reprogramar
          </button>
        ) : (
          <Link
            to={`/evento/${task.eventoId}?modo=editar`}
            className="btn-action-ghost"
            title="Reprogramar o editar tiempos de la gestión"
          >
            Reprogramar
          </Link>
        )}

        {/* 3. Ver detalle */}
        <Link
          to={`/evento/${task.eventoId}`}
          className="btn-action-link"
          title="Ver detalle logístico del evento"
        >
          Ver detalle →
        </Link>

        {/* 4. Eliminar */}
        {onDeleteRequest && (
          <button
            type="button"
            className="btn-action-delete-text"
            onClick={() => onDeleteRequest(task.eventoId, task)}
            title="Eliminar gestión (activa modal de confirmación)"
          >
            Eliminar
          </button>
        )}
      </div>
    </article>
  );
}
