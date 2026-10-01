import React from 'react';
import SystemModal from './SystemModal';

/**
 * ConfirmModal (Adaptador hacia SystemModal)
 * Implementa las confirmaciones de riesgo destructivo:
 * - Para eventos: Título "¿Eliminar evento?", microcopy "Esta acción eliminará el evento y todas sus subtareas logísticas. No se puede deshacer."
 * - Para tareas: Título "¿Eliminar gestión?", microcopy "Esta acción eliminará la tarea logística y su presupuesto asociado. No se puede deshacer."
 * - Botones: Eliminar (#DC2626) y Cancelar (#64748B con autofocus).
 */
export default function ConfirmModal({
  isOpen = false,
  onClose,
  onConfirm,
  title,
  warningMessage,
  itemName = '',
  itemType = 'evento', // 'evento' o 'tarea'/'subtarea'
  isDeleting = false,
}) {
  const modalType = itemType === 'evento' ? 'eliminar_evento' : 'eliminar_tarea';

  return (
    <SystemModal
      isOpen={isOpen}
      type={modalType}
      title={title}
      message={warningMessage}
      itemName={itemName}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmText="Eliminar"
      cancelText="Cancelar"
      isLoading={isDeleting}
    />
  );
}
