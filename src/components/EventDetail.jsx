import React from 'react';
import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';
import TaskBadge from './TaskBadge';
import Button from './Button';

/**
 * 5. Modo "Ver Detalle" (Lectura en ruta /evento/:id)
 *
 * Muestra una vista estática sin campos ni inputs activos.
 * La información logística se renderiza como texto plano o etiquetas de solo lectura
 * para evitar ediciones accidentales durante la revisión.
 *
 * Acciones:
 * - "Volver a eventos" (Neutral #64748B)
 * - "Reprogramar / Editar" (Primary #2563EB)
 * - "Eliminar" (Danger #DC2626)
 */
export default function EventDetail({
  evento,
  progreso = 0,
  onSwitchToEdit,
  onDeleteRequest,
  onToggleSubtask,
  onDeleteSubtask,
}) {
  const totalSubtareas = evento.subtareas?.length || 0;
  const completadas = evento.subtareas?.filter((s) => s.estado === 'Hecha').length || 0;
  const totalHoras = (evento.subtareas || []).reduce(
    (acc, s) => acc + (Number(s.horasEstimadas) || 0),
    0
  );

  const lugar = evento.lugar || 'Valle de Bravo';
  const asistentes = evento.asistentes || 280;

  return (
    <div className="read-mode-container">
      {/* Barra de navegación superior con botón neutral de retorno */}
      <div className="read-nav-bar">
        <Link to="/eventos" className="btn-token btn-neutral" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          ← Volver a eventos
        </Link>

        <Button variant="primary" onClick={onSwitchToEdit}>
          ✏️ Reprogramar / Editar
        </Button>
      </div>

      <div className="read-header-card">
        <div className="read-header-top">
          <span className="badge-read-only">Consulta de Solo Lectura</span>
          <span className="read-event-type">{evento.tipo}</span>
        </div>

        <h1 className="read-event-title">{evento.nombre}</h1>
        {evento.descripcion && <p className="read-event-desc">{evento.descripcion}</p>}

        {/* Metadatos en texto plano y etiquetas fijas */}
        <div className="read-meta-tags-grid">
          <div className="read-meta-box">
            <span className="meta-box-label">Fecha del evento</span>
            <span className="meta-box-val">📅 {evento.fecha}</span>
          </div>
          <div className="read-meta-box">
            <span className="meta-box-label">Lugar</span>
            <span className="meta-box-val">📍 {lugar}</span>
          </div>
          <div className="read-meta-box">
            <span className="meta-box-label">Asistentes estimados</span>
            <span className="meta-box-val">👥 {asistentes} personas</span>
          </div>
          <div className="read-meta-box">
            <span className="meta-box-label">Total gestiones logísticas</span>
            <span className="meta-box-val">📋 {completadas}/{totalSubtareas} completadas</span>
          </div>
          <div className="read-meta-box">
            <span className="meta-box-label">Carga horaria total</span>
            <span className="meta-box-val">⏱️ {totalHoras} horas</span>
          </div>
        </div>

        {/* Barra de progreso cromática */}
        <div className="read-progress-wrapper">
          <ProgressBar
            progress={progreso}
            hasCriticalError={evento.hasCriticalError}
            eventName={evento.nombre}
            completedCount={completadas}
            totalCount={totalSubtareas}
          />
        </div>

        <div className="read-header-actions-row">
          <div className="actions-left">
            <Button variant="primary" onClick={onSwitchToEdit}>
              Reprogramar / Editar evento
            </Button>
          </div>

          <div className="actions-right">
            {onDeleteRequest && (
              <Button variant="danger" onClick={() => onDeleteRequest(evento)}>
                Eliminar evento
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de subtareas en solo lectura */}
      <section className="read-subtasks-section">
        <div className="section-title-line">
          <div>
            <h3 className="section-title">Tareas y Gestiones Logísticas</h3>
            <p className="section-desc">Consulta de gestiones sin campos ni inputs activos.</p>
          </div>
          <span className="count-pill">{totalSubtareas} gestiones</span>
        </div>

        <div className="read-subtasks-grid">
          {(evento.subtareas || []).map((sub, index) => (
            <div key={sub.id} className="read-subtask-card">
              <div className="read-subtask-left">
                <span className="read-subtask-num">#{index + 1}</span>
                <div>
                  <h4 className="read-subtask-title">{sub.titulo}</h4>
                  <div className="read-subtask-tags">
                    <span className="subtask-tag-pill">📅 Vence: {sub.fechaLimite}</span>
                    <span className="subtask-tag-pill">⏱️ {sub.horasEstimadas} hrs</span>
                    <span className="subtask-tag-pill">👤 {sub.responsable || 'No asignado'}</span>
                  </div>
                </div>
              </div>

              <div className="read-subtask-right">
                {/* Badge de estado reglamentario ("Hecha", "Pendiente", "Vencida", "Urgente") */}
                <TaskBadge estado={sub.estado} />

                {/* Marcar avance */}
                {onToggleSubtask && (
                  <button
                    type="button"
                    className="btn-ghost-sm"
                    onClick={() => onToggleSubtask(evento.id, sub.id)}
                    title="Alternar estado de realización"
                  >
                    {sub.estado === 'Hecha' ? 'Desmarcar' : '✓ Marcar realizada'}
                  </button>
                )}

                {/* Eliminar subtarea */}
                {onDeleteSubtask && (
                  <button
                    type="button"
                    className="btn-danger-icon"
                    onClick={() => onDeleteSubtask(sub)}
                    title="Eliminar gestión"
                    style={{ color: '#DC2626' }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
