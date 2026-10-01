import React, { useEffect, useRef } from 'react';
import Button from './Button';

/**
 * 7. Modales del Sistema (Riesgo, Éxito y Error)
 *
 * Soporta los tipos exactos de la Guía de Diseño Oficial:
 * - 'eliminar_evento': Título "¿Eliminar evento?", microcopy "Esta acción eliminará el evento y todas sus subtareas logísticas. No se puede deshacer."
 * - 'eliminar_tarea': Título "¿Eliminar gestión?", microcopy "Esta acción eliminará la tarea logística y su presupuesto asociado. No se puede deshacer."
 * - 'evento_guardado': Título "Evento Guardado", texto "El evento ha sido guardado de manera exitosa.", Botón "Aceptar" (#2563EB).
 * - 'evento_eliminado': Título "Evento Eliminado", texto "El evento y sus gestiones logísticas han sido eliminados de manera exitosa.", Botón "Aceptar" (#2563EB).
 * - 'tarea_editada': Título "Gestión Editada", texto "La tarea logística ha sido editada de manera exitosa.", Botón "Aceptar" (#2563EB).
 * - 'tarea_eliminada': Título "Gestión Eliminada", texto "La tarea logística ha sido eliminada de manera exitosa.", Botón "Aceptar" (#2563EB).
 * - 'error_operacional': Título "Error", texto "Ha ocurrido un error procesando la solicitud en el evento, inténtelo de nuevo.", Botón "Cerrar" (Rojo #DC2626).
 */
export default function SystemModal({
  isOpen = false,
  type = 'eliminar_evento', // 'eliminar_evento' | 'eliminar_tarea' | 'evento_guardado' | 'evento_eliminado' | 'tarea_editada' | 'tarea_eliminada' | 'error_operacional' | 'custom'
  title = '',
  message = '',
  itemName = '',
  onClose,
  onConfirm,
  confirmText = '',
  cancelText = 'Cancelar',
  isLoading = false,
}) {
  const cancelBtnRef = useRef(null);

  // Configuración de microcopy según el tipo solicitado en la Guía de Diseño
  let modalTitle = title;
  let modalText = message;
  let modalCategory = 'risk'; // 'risk' | 'success' | 'error'
  let btnConfirmText = confirmText;
  let btnConfirmVariant = 'danger';

  switch (type) {
    case 'eliminar_evento':
      modalTitle = title || '¿Eliminar evento?';
      modalText =
        message || 'Esta acción eliminará el evento y todas sus subtareas logísticas. No se puede deshacer.';
      modalCategory = 'risk';
      btnConfirmText = confirmText || 'Eliminar';
      btnConfirmVariant = 'danger';
      break;

    case 'eliminar_tarea':
      modalTitle = title || '¿Eliminar gestión?';
      modalText =
        message || 'Esta acción eliminará la tarea logística y su presupuesto asociado. No se puede deshacer.';
      modalCategory = 'risk';
      btnConfirmText = confirmText || 'Eliminar';
      btnConfirmVariant = 'danger';
      break;

    case 'evento_guardado':
      modalTitle = title || 'Evento Guardado';
      modalText = message || 'El evento ha sido guardado de manera exitosa.';
      modalCategory = 'success';
      btnConfirmText = confirmText || 'Aceptar';
      btnConfirmVariant = 'primary';
      break;

    case 'evento_eliminado':
      modalTitle = title || 'Evento Eliminado';
      modalText = message || 'El evento y sus gestiones logísticas han sido eliminados de manera exitosa.';
      modalCategory = 'success';
      btnConfirmText = confirmText || 'Aceptar';
      btnConfirmVariant = 'primary';
      break;

    case 'tarea_editada':
      modalTitle = title || 'Gestión Editada';
      modalText = message || 'La tarea logística ha sido editada de manera exitosa.';
      modalCategory = 'success';
      btnConfirmText = confirmText || 'Aceptar';
      btnConfirmVariant = 'primary';
      break;

    case 'tarea_eliminada':
      modalTitle = title || 'Gestión Eliminada';
      modalText = message || 'La tarea logística ha sido eliminada de manera exitosa.';
      modalCategory = 'success';
      btnConfirmText = confirmText || 'Aceptar';
      btnConfirmVariant = 'primary';
      break;

    case 'error_operacional':
      modalTitle = title || 'Error';
      modalText = message || 'Ha ocurrido un error procesando la solicitud en el evento, inténtelo de nuevo.';
      modalCategory = 'error';
      btnConfirmText = confirmText || 'Cerrar';
      btnConfirmVariant = 'danger';
      break;

    default:
      modalCategory = modalCategory || 'risk';
      btnConfirmText = confirmText || (modalCategory === 'risk' ? 'Eliminar' : 'Aceptar');
      btnConfirmVariant = modalCategory === 'risk' || modalCategory === 'error' ? 'danger' : 'primary';
      break;
  }

  // Foco predeterminado por teclado en Cancelar (#64748B) para modales de riesgo
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (cancelBtnRef.current) {
          cancelBtnRef.current.focus();
        }
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Tecla Escape para salir de forma accesible
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay-focus"
      role="dialog"
      aria-modal="true"
      aria-labelledby="system-modal-title"
      aria-describedby="system-modal-description"
    >
      <div className={`system-modal-card modal-card-${modalCategory}`}>
        {/* Ícono contextual según la categoría */}
        <div className="system-modal-header">
          {modalCategory === 'risk' && (
            <div className="modal-icon-badge icon-badge-risk" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.4">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
              </svg>
            </div>
          )}

          {modalCategory === 'success' && (
            <div className="modal-icon-badge icon-badge-success" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.4">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
          )}

          {modalCategory === 'error' && (
            <div className="modal-icon-badge icon-badge-error" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.4">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          )}

          <div>
            <h3 id="system-modal-title" className="system-modal-title">
              {modalTitle}
            </h3>
          </div>
        </div>

        {itemName && (
          <div className="modal-item-highlight">
            <span className="modal-item-label">Elemento:</span>
            <strong className="modal-item-name">{itemName}</strong>
          </div>
        )}

        {/* Microcopy de advertencia o informe oficial */}
        <p
          id="system-modal-description"
          className={`system-modal-message ${modalCategory === 'risk' ? 'msg-risk-highlight' : ''}`}
        >
          {modalText}
        </p>

        {/* Botones de acción */}
        <div className="system-modal-actions">
          {/* Si es de riesgo, mostramos botón de Cancelación Neutral (#64748B) con autofocus */}
          {modalCategory === 'risk' && (
            <button
              ref={cancelBtnRef}
              type="button"
              className="btn-token btn-neutral"
              onClick={onClose}
              disabled={isLoading}
              autoFocus
              style={{
                backgroundColor: '#F8FAFC',
                border: '1.5px solid #64748B',
                color: '#334155',
              }}
            >
              {cancelText}
            </button>
          )}

          {/* Botón principal (Aceptar #2563EB / Eliminar #DC2626 / Cerrar #DC2626) */}
          <Button
            variant={btnConfirmVariant}
            onClick={onConfirm || onClose}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando...' : btnConfirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
