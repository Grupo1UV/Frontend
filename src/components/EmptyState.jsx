import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Decisión 2: Prevención de "Callejones sin Salida" con Estados Vacíos (Empty States)
 * (T1 - Crear evento y plan inicial)
 *
 * Criterios de Usabilidad:
 * - Visibilidad del estado del sistema: Explicar con claridad la ausencia de datos en lugar
 *   de presentar pantallas en blanco que sugieran errores de carga.
 * - Estética y diseño minimalista: Transmitir simplicidad sin saturación de elementos
 *   irrelevantes, promoviendo la acción primaria inmediata.
 *
 * Estructura obligatoria del contenedor:
 * 1. Control condicional mediante la propiedad `isEmpty`.
 * 2. Ícono ilustrativo contextual simplificado (baja saturación visual).
 * 3. Pregunta orientadora / Microcopy de invitación (ej. "¿Deseas organizar tu primer evento?").
 * 4. Botón CTA Principal (Azul #2563EB) con acción directa: "Crear evento" o "Agregar gestión".
 */
export default function EmptyState({
  isEmpty = true,
  icon = null,
  title = '¿Deseas organizar tu primer evento?',
  subtitle = 'Comienza registrando tu proyecto para generar automáticamente su plan inicial y gestionar todas las subtareas logísticas sin complicaciones.',
  actionText = 'Crear evento',
  actionTo = '/crear-evento',
  onActionClick = null,
  children = null,
}) {
  // Si no está vacío, no renderiza el empty state (o renderiza el contenido secundario provisto)
  if (!isEmpty) {
    return children || null;
  }

  return (
    <div className="empty-state-card" data-decision="decision-2-empty-state">
      {/* 1. Ícono ilustrativo contextual simplificado (baja saturación visual) */}
      <div className="empty-state-icon-wrapper" aria-hidden="true">
        {icon || (
          <svg
            className="empty-state-svg"
            width="72"
            height="72"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94A3B8"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="3" fill="#F8FAFC" />
            <line x1="16" y1="2" x2="16" y2="6" stroke="#64748B" strokeWidth="1.75" />
            <line x1="8" y1="2" x2="8" y2="6" stroke="#64748B" strokeWidth="1.75" />
            <line x1="3" y1="10" x2="21" y2="10" stroke="#CBD5E1" strokeWidth="1.25" />
            <circle cx="8" cy="14" r="1.25" fill="#94A3B8" />
            <circle cx="12" cy="14" r="1.25" fill="#94A3B8" />
            <circle cx="16" cy="14" r="1.25" fill="#94A3B8" />
            <circle cx="8" cy="18" r="1.25" fill="#94A3B8" />
            <path d="M12 18h4" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* 2. Pregunta orientadora / Microcopy de invitación */}
      <div className="empty-state-content">
        <h3 className="empty-state-title">{title}</h3>
        {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
      </div>

      {/* 3. Botón CTA Principal (Azul #2563EB) con acción directa */}
      <div className="empty-state-actions">
        {onActionClick ? (
          <button
            type="button"
            className="cta-button cta-primary-blue"
            onClick={onActionClick}
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            <span className="cta-plus-icon">+</span>
            {actionText}
          </button>
        ) : (
          <Link
            to={actionTo}
            className="cta-button cta-primary-blue"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            <span className="cta-plus-icon">+</span>
            {actionText}
          </Link>
        )}
      </div>
    </div>
  );
}
