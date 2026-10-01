import React from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';

export default function Progreso() {
  const {
    eventos,
    isEmpty,
    calcularProgreso,
    marcarSubtareaHecha,
  } = useEvents();

  if (isEmpty) {
    return (
      <div className="page-wrapper">
        <header className="page-intro-header">
          <span className="eyebrow-tag">Avance General</span>
          <h1 className="page-main-heading">Progreso de Eventos</h1>
        </header>

        <EmptyState
          isEmpty={isEmpty}
          title="No hay progreso disponible aún"
          subtitle="Crea tu primer evento para comenzar a registrar el avance de sus subtareas logísticas y visualizar su barra de progreso."
          actionText="Crear primer evento"
          actionTo="/crear-evento"
        />
      </div>
    );
  }

  const totalEventos = eventos.length;
  const eventosEnEjecucion = eventos.filter((e) => {
    const p = calcularProgreso(e);
    return !e.hasCriticalError && p > 0 && p < 100;
  }).length;
  const eventosFinalizados = eventos.filter((e) => !e.hasCriticalError && calcularProgreso(e) === 100).length;
  const eventosBaseline = eventos.filter((e) => !e.hasCriticalError && calcularProgreso(e) === 0).length;
  const eventosConAlerta = eventos.filter((e) => e.hasCriticalError).length;

  return (
    <div className="page-wrapper">
      <header className="page-header-row">
        <div>
          <span className="eyebrow-tag">Monitoreo y Avance</span>
          <h1 className="page-main-heading">Progreso de Eventos</h1>
          <p className="page-lead">
            Visualización del estado cuantitativo de preparación de cada uno de tus eventos.
          </p>
        </div>

        <div className="header-actions">
          <Link
            to="/crear-evento"
            className="cta-button cta-primary-blue"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            + Nuevo evento
          </Link>
        </div>
      </header>

      {/* Tarjetas resumen de estado */}
      <section className="chromatic-guide-panel">
        <div className="guide-legend-grid">
          <div className="legend-card legend-blue">
            <div className="legend-indicator" style={{ backgroundColor: '#2563EB' }} />
            <div>
              <div className="legend-color-tag">En Ejecución Activa</div>
              <strong>{eventosEnEjecucion} Evento(s)</strong>
              <p>Tareas en progreso continuo completadas parcialmente.</p>
            </div>
          </div>

          <div className="legend-card legend-green">
            <div className="legend-indicator" style={{ backgroundColor: '#16A34A' }} />
            <div>
              <div className="legend-color-tag">Completados / Plan Inicial</div>
              <strong>{eventosFinalizados} finalizados • {eventosBaseline} listos</strong>
              <p>Eventos completados con éxito (100%) o plan inicial listo (0%).</p>
            </div>
          </div>

          <div className="legend-card legend-red">
            <div className="legend-indicator" style={{ backgroundColor: '#DC2626' }} />
            <div>
              <div className="legend-color-tag">Atención Requerida</div>
              <strong>{eventosConAlerta} con alerta</strong>
              <p>Alertas críticas logísticas que requieren intervención inmediata.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Lista de eventos con sus barras cromáticas */}
      <section className="progress-events-section">
        <div className="section-title-line">
          <div>
            <h3 className="section-title">Registro de Avance por Evento</h3>
            <p className="section-desc">
              Marca o desmarca las subtareas para registrar el avance de forma inmediata.
            </p>
          </div>
          <span className="count-pill">{totalEventos} eventos</span>
        </div>

        <div className="progress-cards-stack">
          {eventos.map((evento) => {
            const progreso = calcularProgreso(evento);
            const total = evento.subtareas?.length || 0;
            const hechas = evento.subtareas?.filter((s) => s.estado === 'Hecha').length || 0;

            return (
              <article key={evento.id} className="progress-event-item">
                <div className="progress-item-top">
                  <div>
                    <span className="event-type-badge">{evento.tipo}</span>
                    <h4 className="progress-item-title">{evento.nombre}</h4>
                    <span className="progress-item-date">Fecha prevista: 📅 {evento.fecha}</span>
                  </div>

                  <div className="progress-item-actions">
                    <Link to={`/evento/${evento.id}`} className="btn-secondary-link">
                      Ver detalle / Reprogramar →
                    </Link>
                  </div>
                </div>

                <div className="progress-bar-container-card">
                  <ProgressBar
                    progress={progreso}
                    hasCriticalError={evento.hasCriticalError}
                    height={14}
                    sublabel={`${hechas} de ${total} subtareas completadas`}
                  />
                </div>

                {evento.hasCriticalError && (
                  <div className="critical-warning-inline">
                    <strong>⚠️ Alerta logística crítica:</strong>{' '}
                    <span>{evento.alertaDetalle || 'Se reporta una alerta o retraso en las subtareas del evento.'}</span>
                  </div>
                )}

                {/* Subtareas para registrar avance */}
                <div className="interactive-subtasks-drawer">
                  <span className="drawer-label">
                    Subtareas del evento (haz clic para registrar avance):
                  </span>
                  <div className="subtasks-chips-flow">
                    {evento.subtareas.map((sub) => {
                      const isDone = sub.estado === 'Hecha';
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          className={`subtask-chip-btn ${isDone ? 'chip-done' : 'chip-pending'}`}
                          onClick={() => marcarSubtareaHecha(evento.id, sub.id)}
                          title={`Marcar como ${isDone ? 'Pendiente' : 'Hecha'}`}
                        >
                          <span className="chip-check-icon">{isDone ? '✓' : '○'}</span>
                          <span className="chip-title">{sub.titulo}</span>
                          <span className="chip-hours">({sub.horasEstimadas}h)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
