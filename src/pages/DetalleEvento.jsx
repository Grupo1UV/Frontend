import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import EventDetail from '../components/EventDetail';
import EditEventForm from '../components/EditEventForm';
import SystemModal from '../components/SystemModal';

export default function DetalleEvento() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    eventos,
    actualizarEvento,
    eliminarEvento,
    eliminarSubtarea,
    marcarSubtareaHecha,
    calcularProgreso,
  } = useEvents();

  const evento = eventos.find((e) => e.id === id);

  const modoInicial = searchParams.get('modo') === 'editar' ? 'edicion' : 'lectura';
  const [modo, setModo] = useState(modoInicial);

  // Estado del modal del sistema
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'eliminar_evento', // 'eliminar_evento' | 'eliminar_tarea' | 'evento_guardado' | 'evento_eliminado' | 'tarea_eliminada' | 'error_operacional'
    targetId: null,
    targetName: '',
  });

  if (!evento) {
    return (
      <div className="page-wrapper">
        <div className="not-found-card">
          <span className="not-found-icon" aria-hidden="true">🔍</span>
          <h2>Evento no encontrado</h2>
          <p>El evento solicitado no existe o fue eliminado.</p>
          <Link
            to="/eventos"
            className="btn-token btn-primary"
            style={{ textDecoration: 'none', display: 'inline-block', marginTop: '14px' }}
          >
            ← Volver a eventos
          </Link>
        </div>
      </div>
    );
  }

  const progreso = calcularProgreso(evento);

  const handleActivarLectura = () => {
    setModo('lectura');
    setSearchParams({});
  };

  const handleActivarEdicion = () => {
    setModo('edicion');
    setSearchParams({ modo: 'editar' });
  };

  // Guardar cambios y mostrar modal de éxito "Evento Guardado"
  const handleGuardarCambios = (datosActualizados) => {
    try {
      actualizarEvento(evento.id, datosActualizados);
      setModalState({
        isOpen: true,
        type: 'evento_guardado',
        targetId: null,
        targetName: '',
      });
      setModo('lectura');
      setSearchParams({});
    } catch {
      setModalState({
        isOpen: true,
        type: 'error_operacional',
        targetId: null,
        targetName: '',
      });
    }
  };

  // 1. Confirmación Eliminación Evento (Riesgo)
  const handleRequestDeleteEvento = () => {
    setModalState({
      isOpen: true,
      type: 'eliminar_evento',
      targetId: evento.id,
      targetName: evento.nombre,
    });
  };

  // 2. Confirmación Eliminación Tarea (Riesgo)
  const handleRequestDeleteSubtarea = (subtarea) => {
    setModalState({
      isOpen: true,
      type: 'eliminar_tarea',
      targetId: subtarea.id,
      targetName: subtarea.titulo,
    });
  };

  // Confirmación en el modal
  const handleConfirmModalAction = () => {
    const { type, targetId } = modalState;

    if (type === 'eliminar_evento') {
      eliminarEvento(targetId);
      // Mostrar modal de éxito "Evento Eliminado"
      setModalState({
        isOpen: true,
        type: 'evento_eliminado',
        targetId: null,
        targetName: '',
      });
    } else if (type === 'eliminar_tarea') {
      eliminarSubtarea(evento.id, targetId);
      // Mostrar modal de éxito "Gestión Eliminada"
      setModalState({
        isOpen: true,
        type: 'tarea_eliminada',
        targetId: null,
        targetName: '',
      });
    } else if (type === 'evento_eliminado') {
      setModalState({ isOpen: false, type: 'eliminar_evento', targetId: null, targetName: '' });
      navigate('/eventos');
    } else {
      setModalState({ isOpen: false, type: 'eliminar_evento', targetId: null, targetName: '' });
    }
  };

  return (
    <div className="page-wrapper">
      {modo === 'lectura' ? (
        <EventDetail
          evento={evento}
          progreso={progreso}
          onSwitchToEdit={handleActivarEdicion}
          onDeleteRequest={handleRequestDeleteEvento}
          onToggleSubtask={marcarSubtareaHecha}
          onDeleteSubtask={handleRequestDeleteSubtarea}
        />
      ) : (
        <EditEventForm
          evento={evento}
          onSave={handleGuardarCambios}
          onCancel={handleActivarLectura}
          onDeleteSubtask={handleRequestDeleteSubtarea}
        />
      )}

      {/* Modal del Sistema para Riesgo, Éxito y Error */}
      <SystemModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        itemName={modalState.targetName}
        onClose={() => {
          if (modalState.type === 'evento_eliminado') {
            navigate('/eventos');
          } else {
            setModalState((prev) => ({ ...prev, isOpen: false }));
          }
        }}
        onConfirm={handleConfirmModalAction}
      />
    </div>
  );
}
