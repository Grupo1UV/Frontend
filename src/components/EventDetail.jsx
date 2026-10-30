import React from 'react';
import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';
import TaskBadge from './TaskBadge';
import Button from './Button';
import { useEvents } from '../context/EventsContext';
import { horasPorJornada, jornadasExcedidas, isoToDisplayDate } from '../utils/validacionesHoras';

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
  const { limiteDiario } = useEvents();
  const limiteUsuario = Number(limiteDiario) || 6;

  const totalSubtareas = evento.subtareas?.length || 0;
  const completadas = evento.subtareas?.filter((s) => s.estado === 'Hecha').length || 0;
  const totalHoras = (evento.subtareas || []).reduce(
    (acc, s) => acc + (Number(s.horasEstimadas) || 0),
    0
  );
  const horasPendientes = (evento.subtareas || [])
    .filter((s) => s.estado !== 'Hecha')
    .reduce((acc, s) => acc + (Number(s.horasEstimadas) || 0), 0);

  const cargaJornadas = horasPorJornada(evento.subtareas || []);
  const conflictosJornada = jornadasExcedidas(evento.subtareas || [], limiteUsuario);
  const maxHorasJornada = Object.values(cargaJornadas).length > 0
    ? Math.max(...Object.values(cargaJornadas))
    : 0;
  const horasDisponiblesJornada = Math.max(0, Math.round((limiteUsuario - maxHorasJornada) * 10) / 10);
  const haySobrecargaEvento = conflictosJornada.length > 0;

  const lugar = evento.lugar || 'Sin lugar asignado';
  const asistentes = evento.asistentes !== undefined && evento.asistentes !== '' ? evento.asistentes : 'Sin definir';

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
            <span className="meta-box-label">Horas planificadas</span>
            <span className="meta-box-val">⏱️ {horasPendientes}h pendientes ({totalHoras}h total)</span>
          </div>
          <div className="read-meta-box">
            <span className="meta-box-label">Límite diario / Disponibles</span>
            <span className="meta-box-val" style={{ color: haySobrecargaEvento ? '#DC2626' : '#15803D' }}>
              {haySobrecargaEvento
                ? `⚠️ Límite ${limiteUsuario}h/día (0h disp. • Sobrecarga)`
                : `✓ Límite ${limiteUsuario}h/día (${horasDisponiblesJornada}h disponibles)`}
            </span>
          </div>
        </div>

        {/* Estado de capacidad y sobrecarga por jornada */}
        {haySobrecargaEvento ? (
          <div
            role="alert"
            style={{
              marginTop: '14px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '10px',
              padding: '12px 16px',
              color: '#991B1B',
              fontSize: '0.88rem',
            }}
          >
            <strong>
              ⚠️ Sobrecarga detectada respecto a tu límite diario de {limiteUsuario}h/día:
            </strong>
            <ul style={{ margin: '6px 0 0 18px' }}>
              {conflictosJornada.map(([fechaConf, hrsConf]) => (
                <li key={fechaConf}>
                  Jornada <strong>{isoToDisplayDate(fechaConf)}</strong>: <strong>{hrsConf}h planificadas</strong> (0h disponibles •{' '}
                  <strong style={{ color: '#DC2626' }}>
                    +{Math.round((hrsConf - limiteUsuario) * 10) / 10}h sobre el límite
                  </strong>
                  )
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div
            style={{
              marginTop: '14px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#15803D',
              fontSize: '0.86rem',
              fontWeight: 700,
            }}
          >
            ✓ Capacidad dentro del límite diario ({limiteUsuario}h/día): {maxHorasJornada}h planificadas en jornada pico • {horasDisponiblesJornada}h disponibles.
          </div>
        )}

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
                  {sub.nota && (
                    <p className="read-subtask-note" style={{ marginTop: '6px', fontSize: '0.82rem', color: '#475569', background: '#f8fafc', padding: '2px 8px', borderRadius: '4px', borderLeft: '3px solid #2563eb' }}>
                      <strong>Nota:</strong> {sub.nota}
                    </p>
                  )}
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
                    className="btn-action-delete-text"
                    onClick={() => onDeleteSubtask(sub)}
                    title="Eliminar gestión"
                  >
                    Eliminar
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
