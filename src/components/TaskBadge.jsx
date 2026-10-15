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
  let label = 'PENDIENTE';

  if (normalized === 'hecha' || normalized === 'completada') {
    badgeClass = 'badge-hecha';
    label = 'Hecha';
  } else if (normalized === 'postergada' || normalized === 'pospuesta') {
    badgeClass = 'badge-postergada';
    label = 'POSTERGADA';
  } else if (normalized === 'vencida' || normalized === 'urgente' || normalized === 'crítica') {
    badgeClass = 'badge-vencida';
    label = 'VENCIDA';
  } else {
    badgeClass = 'badge-pendiente';
    label = 'PENDIENTE';
  }

  return (
    <span className={`task-badge-token ${badgeClass}`}>
      {label}
    </span>
  );
}
