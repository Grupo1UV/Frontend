import React from 'react';

/**
 * Componente TaskBadge
 * Etiquetas de Estado de Tareas reglamentarias:
 * - "Hecha" (Verde)
 * - "Pendiente" (Azul / Ámbar suave)
 * - "Vencida" (Gris oscuro / Neutro)
 * - "Urgente" (Rojo #DC2626)
 */
export default function TaskBadge({ estado = 'Pendiente' }) {
  const normalized = (estado || 'Pendiente').toLowerCase();

  let badgeClass = 'badge-pendiente';
  let label = estado;

  if (normalized === 'hecha' || normalized === 'completada') {
    badgeClass = 'badge-hecha';
    label = 'Hecha';
  } else if (normalized === 'urgente' || normalized === 'crítica') {
    badgeClass = 'badge-urgente';
    label = 'Urgente';
  } else if (normalized === 'vencida') {
    badgeClass = 'badge-vencida';
    label = 'Vencida';
  } else {
    badgeClass = 'badge-pendiente';
    label = 'Pendiente';
  }

  return (
    <span className={`task-badge-token ${badgeClass}`}>
      {label}
    </span>
  );
}
