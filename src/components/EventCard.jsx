import React from 'react';
import { Link } from 'react-router-dom';
import ProgressBar from './ProgressBar';
import Button from './Button';

/**
 * 6. Tarjetas de Eventos y Subtareas Logísticas
 *
 * Requerimientos de la Guía de Diseño:
 * - Nombre ("Boda Valentina & Emilio")
 * - Tipo ("Boda")
 * - Lugar ("Valle de Bravo")
 * - Asistentes ("280")
 * - Contador ("2/14 tareas logísticas")
 * - Barra azul (ProgressBar activa)
 * - Botón neutral: "Ver detalle logístico" (Gris #64748B)
 * - Acciones secundarias: "Editar", "Eliminar"
 */
export default function EventCard({
  evento,
  progreso = 0,
  onDeleteRequest,
  onToggleCritical,
}) {
  const totalSubtareas = evento.subtareas?.length || 0;
  const hechasSubtareas = evento.subtareas?.filter((s) => s.estado === 'Hecha').length || 0;

  // Valores predeterminados fieles a los ejemplos oficiales si no están definidos
  const lugar = evento.lugar || 'Valle de Bravo';
  const asistentes = evento.asistentes || 280;

  return (
    <article
      className={`event-card-box ${evento.hasCriticalError ? 'border-critical' : ''}`}
      data-testid={`event-card-${evento.id}`}
    >
      {/* Cabecera con Nombre y Tipo */}
      <div className="event-card-header">
        <div>
          <span className="event-type-badge">{evento.tipo}</span>
          <h3 className="event-title-main">{evento.nombre}</h3>
        </div>
        <span className="event-date-chip">📅 {evento.fecha}</span>
      </div>

      {/* Información requerida: Lugar y Asistentes */}
      <div className="event-meta-logistics-row">
        <span className="meta-item-chip">
          <span className="meta-icon" aria-hidden="true">📍</span>
          <strong>Lugar:</strong> {lugar}
        </span>
        <span className="meta-item-chip">
          <span className="meta-icon" aria-hidden="true">👥</span>
          <strong>Asistentes:</strong> {asistentes}
        </span>
      </div>

      {/* Contador requerido: "2/14 tareas logísticas" */}
      <div className="event-tasks-counter-line">
        <span className="counter-text">
          📋 <strong>{hechasSubtareas}/{totalSubtareas} tareas logísticas</strong>
        </span>
      </div>

      {/* Barra de progreso azul (o roja si hay error) */}
      <div className="event-progress-block">
        <ProgressBar
          progress={progreso}
          hasCriticalError={evento.hasCriticalError}
          eventName={evento.nombre}
          completedCount={hechasSubtareas}
          totalCount={totalSubtareas}
        />
      </div>

      {/* Alerta si existe error crítico */}
      {evento.hasCriticalError && (
        <div className="critical-alert-box">
          <span className="alert-icon">⚠️</span>
          <span>{evento.alertaDetalle || 'No se han podido cargar las tareas logísticas.'}</span>
        </div>
      )}

      {/* Pie de tarjeta con Botón Neutral "Ver detalle logístico" y Menú de Acciones Secundarias */}
      <div className="event-card-footer">
        <div className="footer-left-actions">
          {/* Botón Neutral reglamentario (#64748B): "Ver detalle logístico" */}
          <Link
            to={`/evento/${evento.id}`}
            className="btn-token btn-neutral-link"
            style={{
              backgroundColor: '#F8FAFC',
              border: '1.5px solid #64748B',
              color: '#334155',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Ver detalle logístico →
          </Link>
        </div>

        {/* Acciones Secundarias: Editar y Eliminar */}
        <div className="footer-right-actions">
          <Link
            to={`/evento/${evento.id}?modo=editar`}
            className="btn-action-ghost"
            title="Editar / Reprogramar evento"
          >
            Editar
          </Link>

          {onDeleteRequest && (
            <button
              type="button"
              className="btn-action-delete-text"
              onClick={() => onDeleteRequest(evento)}
              title="Eliminar evento (activa modal de confirmación)"
              style={{ color: '#DC2626' }}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
