import React from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
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

// Componente gráfico circular SVG (Donut) para el porcentaje general entero
function CircularProgressDonut({ percentage, size = 124, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const strokeColor = percentage === 100 ? '#16A34A' : '#2563EB';

  return (
    <div className="circular-progress-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="circular-progress-svg">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="circular-progress-text">
        <span className="circular-progress-number">{percentage} %</span>
        <span className="circular-progress-label">Avance</span>
      </div>
    </div>
  );
}

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
  const todayIso = hoyIso();

  // Consolidar todas las subtareas de todos los eventos
  const todasLasSubtareas = eventos.flatMap((e) => e.subtareas || []);
  const totalSubtareasGlobal = todasLasSubtareas.length;
  const completadasGlobal = todasLasSubtareas.filter((s) => s.estado === 'Hecha').length;
  const pospuestasGlobal = todasLasSubtareas.filter(
    (s) => s.estado === 'POSTERGADA' || s.estado === 'Pospuesta'
  ).length;
  const pendientesGlobal = todasLasSubtareas.filter((s) => s.estado === 'Pendiente').length;
  const vencidasGlobal = todasLasSubtareas.filter((s) => {
    const iso = parseFechaLimite(s.fechaLimite);
    return iso < todayIso && s.estado !== 'Hecha';
  }).length;

  // Progreso general entero: Math.round((completadas / total) * 100)
  const progresoGlobalNum =
    totalSubtareasGlobal > 0
      ? Math.round((completadasGlobal / totalSubtareasGlobal) * 100)
      : 0;

  return (
    <div className="page-wrapper">
      {/* 1. Encabezado Superior */}
      <header className="progreso-page-header">
        <div className="progreso-title-area">
          <span className="eyebrow-tag">Monitoreo y Avance</span>
          <div className="progreso-title-row">
            <h1 className="progreso-main-title">Progreso</h1>
            <span className="progreso-events-count-pill">
              {totalEventos} {totalEventos === 1 ? 'evento' : 'eventos'}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <Link
            to="/crear-evento"
            className="cta-button cta-primary-blue"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            + Crear evento
          </Link>
        </div>
      </header>

      {/* 2. Tarjeta de Progreso General (Hero Card Principal) */}
      <section className="progreso-hero-card" aria-label="Progreso General">
        {/* Lado Izquierdo: Donut circular SVG con porcentaje entero */}
        <div className="hero-donut-container">
          <CircularProgressDonut percentage={progresoGlobalNum} />
        </div>

        {/* Lado Derecho: Título, subtítulo, barra horizontal y fila de píldoras */}
        <div className="hero-progress-right">
          <div className="hero-progress-header-row">
            <h2 className="hero-progress-title">Progreso General</h2>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: progresoGlobalNum === 100 ? '#16A34A' : '#2563EB',
                backgroundColor: progresoGlobalNum === 100 ? '#ECFDF5' : '#EFF6FF',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: `1px solid ${progresoGlobalNum === 100 ? '#A7F3D0' : '#BFDBFE'}`,
              }}
            >
              {progresoGlobalNum === 100 ? 'Completado' : progresoGlobalNum === 0 ? 'Plan inicial' : 'En curso'}
            </span>
          </div>

          <p className="hero-progress-subtitle">
            {completadasGlobal} de {totalSubtareasGlobal} subtareas completadas en {totalEventos} {totalEventos === 1 ? 'evento' : 'eventos'}
          </p>

          {/* Barra de progreso horizontal limpia */}
          <div className="hero-horizontal-track">
            <div
              className="hero-horizontal-fill"
              style={{
                width: `${progresoGlobalNum}%`,
                backgroundColor: progresoGlobalNum === 100 ? '#16A34A' : '#2563EB',
              }}
            />
          </div>

          {/* Fila de etiquetas/píldoras (badges) con contadores numéricos exactos */}
          <div className="hero-kpi-badges-row">
            <div className="hero-kpi-pill kpi-pill-completed" title="Subtareas completadas">
              <span>🟢</span>
              <span className="pill-count">[{completadasGlobal}]</span>
              <span className="pill-text">Completadas</span>
            </div>

            <div className="hero-kpi-pill kpi-pill-pending" title="Subtareas pendientes por gestionar">
              <span>⚪</span>
              <span className="pill-count">[{pendientesGlobal}]</span>
              <span className="pill-text">Pendientes</span>
            </div>

            <div className="hero-kpi-pill kpi-pill-postponed" title="Subtareas pospuestas (no completadas)">
              <span>🟠</span>
              <span className="pill-count">[{pospuestasGlobal}]</span>
              <span className="pill-text">Pospuestas</span>
            </div>

            <div className="hero-kpi-pill kpi-pill-overdue" title="Subtareas vencidas con fecha límite superada">
              <span>🔴</span>
              <span className="pill-count">[{vencidasGlobal}]</span>
              <span className="pill-text">Vencidas</span>
            </div>

            <div className="hero-kpi-pill kpi-pill-total" title="Total de subtareas registradas en todos los eventos">
              <span>🔵</span>
              <span className="pill-count">[{totalSubtareasGlobal}]</span>
              <span className="pill-text">Total Registradas</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Cuadrícula de Eventos (Grid de Tarjetas por Evento en 2 Columnas) */}
      <section className="progress-grid-section">
        <div className="progress-grid-section-header">
          <h2 className="progress-grid-section-title">Registro de Avance por Evento</h2>
        </div>

        <div className="progress-events-grid">
          {eventos.map((evento) => {
            const progreso = calcularProgreso(evento);
            const total = evento.subtareas?.length || 0;
            const hechas = evento.subtareas?.filter((s) => s.estado === 'Hecha').length || 0;
            const vencidasEvento = (evento.subtareas || []).filter((s) => {
              const iso = parseFechaLimite(s.fechaLimite);
              return iso < todayIso && s.estado !== 'Hecha';
            }).length;

            // Color de la barra según estado y avance
            let barColor = '#2563EB';
            if (evento.hasCriticalError) {
              barColor = '#DC2626';
            } else if (progreso === 100 || progreso === 0) {
              barColor = '#16A34A';
            }

            return (
              <article key={evento.id} className="progress-grid-card">
                {/* Cabecera de la tarjeta: Nombre y Tag de tipo */}
                <div className="grid-card-top-row">
                  <div className="grid-card-title-group">
                    <h3 className="grid-card-name">{evento.nombre}</h3>
                    <span className="grid-card-tasks-count">
                      {hechas}/{total} tareas • <strong>{progreso} %</strong>
                    </span>
                  </div>
                  <span className="grid-card-type-tag">
                    {String(evento.tipo || 'GENERAL').toUpperCase()}
                  </span>
                </div>

                {/* Barra de progreso horizontal delgada */}
                <div className="grid-card-progress-box">
                  <div className="grid-card-progress-track">
                    <div
                      className="grid-card-progress-fill"
                      style={{
                        width: `${progreso}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>
                </div>

                {/* Alerta crítica si aplica */}
                {evento.hasCriticalError && (
                  <div className="grid-card-critical-alert">
                    <span>⚠️ {evento.alertaDetalle || 'Atención requerida en logística.'}</span>
                  </div>
                )}

                {/* Subtareas interactivas (clic para registrar estado) */}
                {total > 0 && (
                  <div className="grid-card-subtasks-container">
                    <span className="grid-card-subtasks-label">
                      Subtareas ({hechas}/{total} hechas):
                    </span>
                    <div className="grid-card-chips-flow">
                      {evento.subtareas.map((sub) => {
                        const isDone = sub.estado === 'Hecha';
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            className={`subtask-chip-compact ${isDone ? 'chip-done' : 'chip-pending'}`}
                            onClick={() => marcarSubtareaHecha(evento.id, sub.id)}
                            title={`Haz clic para cambiar estado a ${isDone ? 'Pendiente' : 'Hecha'}`}
                            aria-label={`Subtarea ${sub.titulo}: ${isDone ? 'Hecha' : 'Pendiente'}`}
                          >
                            <span>{isDone ? '✓' : '○'}</span>
                            <span style={{ fontWeight: isDone ? 700 : 500 }}>
                              {sub.titulo}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Pie de tarjeta con enlace discreto */}
                <div className="grid-card-footer">
                  <span className="grid-card-date">
                    📅 {evento.fecha}
                  </span>
                  <Link to={`/evento/${evento.id}`} className="grid-card-detail-link">
                    Ver detalle ↗
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
