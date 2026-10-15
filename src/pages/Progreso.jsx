import React from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import { hoyIso, normalizarJornada } from '../utils/validacionesHoras';

// Helper para normalizar la fecha límite a string ISO comparable
const parseFechaLimite = (fechaStr) => {
  if (!fechaStr) return '9999-12-31';
  const norm = normalizarJornada(fechaStr);
  if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
    return norm;
  }
  return '9999-12-31';
};

// Formato de porcentaje con coma en español (ej. 42,9 % o 0 %)
const formatearPorcentaje = (hechas, total) => {
  if (!total || total === 0) return '0 %';
  const val = Math.round((hechas / total) * 1000) / 10;
  const formatted = val.toLocaleString('es-ES', {
    minimumFractionDigits: val % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
  return `${formatted} %`;
};

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

  const todayIso = hoyIso();

  // Consolidar todas las subtareas de todos los eventos
  const todasLasSubtareas = eventos.flatMap((e) => e.subtareas || []);
  const totalSubtareasGlobal = todasLasSubtareas.length;
  const completadasGlobal = todasLasSubtareas.filter((s) => s.estado === 'Hecha').length;
  // Las tareas pospuestas no cuentan como completadas
  const pospuestasGlobal = todasLasSubtareas.filter(
    (s) => s.estado === 'POSTERGADA' || s.estado === 'Pospuesta'
  ).length;
  const pendientesGlobal = todasLasSubtareas.filter((s) => s.estado === 'Pendiente').length;
  const vencidasGlobal = todasLasSubtareas.filter((s) => {
    const iso = parseFechaLimite(s.fechaLimite);
    return iso < todayIso && s.estado !== 'Hecha';
  }).length;

  // Progreso general: (total subtareas hechas / total subtareas registradas) * 100
  const progresoGlobalNum =
    totalSubtareasGlobal > 0
      ? Math.round((completadasGlobal / totalSubtareasGlobal) * 1000) / 10
      : 0;
  const progresoGlobalStr = formatearPorcentaje(completadasGlobal, totalSubtareasGlobal);

  return (
    <div className="page-wrapper">
      <header className="page-header-row">
        <div>
          <span className="eyebrow-tag">Monitoreo y Avance</span>
          <h1 className="page-main-heading">Progreso de Eventos</h1>
          <p className="page-lead">
            Visualización cuantitativa y consolidada de la preparación logística de tus eventos.
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

      {/* Tarjetas resumen de estado de eventos */}
      <section className="chromatic-guide-panel" style={{ marginBottom: '20px' }}>
        <div className="guide-legend-grid">
          <div className="legend-card legend-blue">
            <div className="legend-indicator" style={{ backgroundColor: '#2563EB' }} />
            <div>
              <div className="legend-color-tag">En curso</div>
              <strong>{eventosEnEjecucion} Evento(s)</strong>
              <p>Tareas en progreso continuo completadas parcialmente.</p>
            </div>
          </div>

          <div className="legend-card legend-green">
            <div className="legend-indicator" style={{ backgroundColor: '#16A34A' }} />
            <div>
              <div className="legend-color-tag">Completados / Plan inicial</div>
              <strong>{eventosFinalizados} finalizados • {eventosBaseline} listos</strong>
              <p>Eventos con 100% alcanzado o con su plan inicial preparado.</p>
            </div>
          </div>

          <div className="legend-card legend-red">
            <div className="legend-indicator" style={{ backgroundColor: '#DC2626' }} />
            <div>
              <div className="legend-color-tag">Atención requerida</div>
              <strong>{eventosConAlerta} con alerta</strong>
              <p>Alertas críticas logísticas que requieren intervención inmediata.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Resumen Global de Progreso y KPIs de Subtareas (Sprint 4) */}
      <section className="global-progress-panel" aria-label="Progreso general de preparación">
        <div className="global-progress-header">
          <div>
            <span className="eyebrow-tag" style={{ color: '#2563EB', fontWeight: 700 }}>
              Avance Consolidado General
            </span>
            <h2 className="section-title" style={{ margin: '4px 0 6px', fontSize: '1.4rem' }}>
              Progreso General de Preparación
            </h2>
            <p className="section-desc" style={{ margin: 0 }}>
              Avance cuantitativo consolidado de todas las subtareas en los eventos registrados.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="progress-badge"
              style={{
                backgroundColor: progresoGlobalNum === 100 ? '#16A34A18' : progresoGlobalNum === 0 ? '#16A34A18' : '#2563EB18',
                color: progresoGlobalNum === 100 ? '#16A34A' : progresoGlobalNum === 0 ? '#16A34A' : '#2563EB',
                borderColor: progresoGlobalNum === 100 ? '#16A34A40' : progresoGlobalNum === 0 ? '#16A34A40' : '#2563EB40',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 700,
                border: '1px solid',
              }}
            >
              {progresoGlobalNum === 100 ? 'Completado' : progresoGlobalNum === 0 ? 'Plan inicial' : 'En curso'}
            </span>
            <span className="count-pill" style={{ fontSize: '0.9rem', fontWeight: 700 }}>
              {progresoGlobalStr} de progreso
            </span>
          </div>
        </div>

        <div
          className="progress-bar-container-card"
          style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '16px 20px', borderRadius: '12px' }}
        >
          <ProgressBar
            progress={progresoGlobalNum}
            customPercentage={progresoGlobalStr}
            statusLabel={progresoGlobalNum === 100 ? 'Completado' : progresoGlobalNum === 0 ? 'Plan inicial' : 'En curso'}
            height={16}
            sublabel={
              totalSubtareasGlobal > 0
                ? `${completadasGlobal} de ${totalSubtareasGlobal} subtareas completadas en total`
                : 'No hay subtareas registradas (0 %)'
            }
          />
        </div>

        {/* Resumen global de tareas completadas, pendientes, pospuestas y vencidas */}
        <div className="global-progress-kpis-grid">
          <div className="global-kpi-card">
            <span className="global-kpi-tag" style={{ color: '#059669' }}>
              ✓ Completadas
            </span>
            <span className="global-kpi-num" style={{ color: '#059669' }}>
              {completadasGlobal}
            </span>
            <span className="global-kpi-desc">Subtareas hechas</span>
          </div>

          <div className="global-kpi-card">
            <span className="global-kpi-tag" style={{ color: '#D97706' }}>
              ⏳ Pendientes
            </span>
            <span className="global-kpi-num" style={{ color: '#D97706' }}>
              {pendientesGlobal}
            </span>
            <span className="global-kpi-desc">Por gestionar</span>
          </div>

          <div className="global-kpi-card">
            <span className="global-kpi-tag" style={{ color: '#475569' }}>
              ⏱️ Pospuestas
            </span>
            <span className="global-kpi-num" style={{ color: '#475569' }}>
              {pospuestasGlobal}
            </span>
            <span className="global-kpi-desc">Aplazadas (no completadas)</span>
          </div>

          <div className="global-kpi-card">
            <span className="global-kpi-tag" style={{ color: '#DC2626' }}>
              ⚠️ Vencidas
            </span>
            <span className="global-kpi-num" style={{ color: vencidasGlobal > 0 ? '#DC2626' : '#64748B' }}>
              {vencidasGlobal}
            </span>
            <span className="global-kpi-desc">Fecha límite superada</span>
          </div>

          <div className="global-kpi-card">
            <span className="global-kpi-tag" style={{ color: '#2563EB' }}>
              📋 Total Registradas
            </span>
            <span className="global-kpi-num" style={{ color: '#2563EB' }}>
              {totalSubtareasGlobal}
            </span>
            <span className="global-kpi-desc">En todos los eventos</span>
          </div>
        </div>
      </section>

      {/* Lista de eventos con sus barras cromáticas */}
      <section className="progress-events-section">
        <div className="section-title-line">
          <div>
            <h3 className="section-title">Registro de Avance por Evento</h3>
            <p className="section-desc">
              Haz clic en una subtarea para alternar su estado entre pendiente y completada. El avance se recalcula de forma automática.
            </p>
          </div>
          <span className="count-pill">{totalEventos} eventos</span>
        </div>

        <div className="progress-cards-stack">
          {eventos.map((evento) => {
            const progreso = calcularProgreso(evento);
            const total = evento.subtareas?.length || 0;
            const hechas = evento.subtareas?.filter((s) => s.estado === 'Hecha').length || 0;
            const pendientes = evento.subtareas?.filter((s) => s.estado === 'Pendiente').length || 0;
            const pospuestas = evento.subtareas?.filter((s) => s.estado === 'POSTERGADA' || s.estado === 'Pospuesta').length || 0;
            const vencidasEvento = (evento.subtareas || []).filter((s) => {
              const iso = parseFechaLimite(s.fechaLimite);
              return iso < todayIso && s.estado !== 'Hecha';
            }).length;
            const porcentajeIndividualStr = formatearPorcentaje(hechas, total);
            const estadoEvento = evento.hasCriticalError
              ? 'Atención requerida'
              : progreso === 100
              ? 'Completado'
              : progreso === 0
              ? 'Plan inicial'
              : 'En curso';

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
                    customPercentage={porcentajeIndividualStr}
                    statusLabel={estadoEvento}
                    hasCriticalError={evento.hasCriticalError}
                    height={14}
                    sublabel={`${hechas} de ${total} subtareas completadas`}
                  />
                </div>

                {/* Métricas cuantitativas explícitas (US-27 / C2) */}
                <div
                  className="progress-metrics-breakdown"
                  style={{
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                    marginTop: '8px',
                    marginBottom: '8px',
                    fontSize: '0.85rem',
                  }}
                >
                  <span
                    className="metric-pill"
                    style={{
                      background: '#ecfdf5',
                      color: '#065f46',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: 500,
                    }}
                  >
                    ✓ Completadas: <strong>{hechas}</strong>
                  </span>
                  <span
                    className="metric-pill"
                    style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: 500,
                    }}
                  >
                    ⏳ Pendientes: <strong>{pendientes}</strong>
                  </span>
                  <span
                    className="metric-pill"
                    style={{
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: 500,
                    }}
                  >
                    ⏱️ Pospuestas: <strong>{pospuestas}</strong>
                  </span>
                  <span
                    className="metric-pill"
                    style={{
                      background: vencidasEvento > 0 ? '#fef2f2' : '#f8fafc',
                      color: vencidasEvento > 0 ? '#b91c1c' : '#64748b',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: 500,
                    }}
                  >
                    ⚠️ Vencidas: <strong>{vencidasEvento}</strong>
                  </span>
                  <span
                    className="metric-pill"
                    style={{
                      background: '#e0f2fe',
                      color: '#0369a1',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: 500,
                    }}
                  >
                    📋 Total: <strong>{total}</strong>
                  </span>
                  <span
                    className="metric-pill"
                    style={{
                      background: '#eef2ff',
                      color: '#3730a3',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  >
                    📊 Progreso: <strong>{porcentajeIndividualStr} de progreso</strong>
                  </span>
                </div>

                {evento.hasCriticalError && (
                  <div className="critical-warning-inline">
                    <strong>⚠️ Alerta logística crítica:</strong>{' '}
                    <span>{evento.alertaDetalle || 'Se reporta una alerta o retraso en las subtareas del evento.'}</span>
                  </div>
                )}

                {/* Subtareas para registrar avance o estado vacío contextual (US-26 / C2) */}
                {total === 0 ? (
                  <div
                    className="empty-subtasks-contextual"
                    style={{
                      marginTop: '8px',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      color: '#64748b',
                      fontSize: '0.88rem',
                      fontStyle: 'italic',
                      border: '1px dashed #cbd5e1',
                    }}
                  >
                    todavía no hay progreso registrado
                  </div>
                ) : (
                  <div className="interactive-subtasks-drawer">
                    <span className="drawer-label">
                      Subtareas del evento (haz clic sobre una subtarea para registrar su estado):
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
                            title={`Haz clic para cambiar el estado de "${sub.titulo}" a ${isDone ? 'Pendiente' : 'Hecha'}`}
                            aria-label={`Subtarea ${sub.titulo}: actualmente ${isDone ? 'Hecha' : 'Pendiente'}. Haz clic para registrarla como ${isDone ? 'Pendiente' : 'Hecha'}.`}
                          >
                            <span className="chip-check-icon">{isDone ? '✓' : '○'}</span>
                            <span
                              className="chip-status-tag"
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                opacity: 0.85,
                                marginRight: '4px',
                              }}
                            >
                              [{isDone ? 'Hecha' : 'Pendiente'}]
                            </span>
                            <span className="chip-title">{sub.titulo}</span>
                            <span className="chip-hours">({sub.horasEstimadas}h)</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
