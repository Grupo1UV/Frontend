import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import EventCard from '../components/EventCard';
import EmptyState from '../components/EmptyState';
import SystemModal from '../components/SystemModal';

export default function Eventos() {
  const {
    eventos,
    isEmpty,
    calcularProgreso,
    eliminarEvento,
    toggleAlertaCritica,
  } = useEvents();

  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'eliminar_evento',
    evento: null,
  });

  const handleRequestDelete = (evento) => {
    setModalState({
      isOpen: true,
      type: 'eliminar_evento',
      evento,
    });
  };

  const handleConfirmAction = () => {
    if (modalState.type === 'eliminar_evento' && modalState.evento) {
      eliminarEvento(modalState.evento.id);
      // Mostrar modal de éxito "Evento Eliminado"
      setModalState({
        isOpen: true,
        type: 'evento_eliminado',
        evento: null,
      });
    } else {
      setModalState({ isOpen: false, type: 'eliminar_evento', evento: null });
    }
  };

  if (isEmpty) {
    return (
      <div className="page-wrapper">
        <header className="page-intro-header">
          <span className="eyebrow-tag">Gestión General</span>
          <h1 className="page-main-heading">Panel de Eventos</h1>
          <p className="page-lead">Todos tus proyectos logísticos centralizados en un único espacio.</p>
        </header>

        {/* 5. Estado Vacío reglamentario */}
        <EmptyState
          isEmpty={isEmpty}
          title="¿Deseas organizar tu primer evento?"
          subtitle="Actualmente no cuentas con eventos registrados en tu panel de control. Inicia registrando un nuevo proyecto para comenzar la planificación logística."
          actionText="Crear evento"
          actionTo="/crear-evento"
        />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <header className="page-header-row">
        <div>
          <span className="eyebrow-tag">Gestión y Planificación</span>
          <h1 className="page-main-heading">Panel de Eventos</h1>
          <p className="page-lead">
            Consulta el avance, reprograma actividades o crea nuevos proyectos para tu portafolio.
          </p>
        </div>

        <div className="header-actions">
          <Link
            to="/crear-evento"
            className="cta-button cta-primary-blue"
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF' }}
          >
            <span className="cta-plus-icon">+</span>
            Crear evento
          </Link>
        </div>
      </header>

      {/* 6. Tarjetas de Eventos con los estándares requeridos */}
      <div className="events-grid-layout">
        {eventos.map((evento) => (
          <EventCard
            key={evento.id}
            evento={evento}
            progreso={calcularProgreso(evento)}
            onDeleteRequest={handleRequestDelete}
            onToggleCritical={toggleAlertaCritica}
          />
        ))}
      </div>

      {/* 7. Modales de Riesgo y Éxito del Sistema */}
      <SystemModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        itemName={modalState.evento?.nombre}
        onClose={() => setModalState({ isOpen: false, type: 'eliminar_evento', evento: null })}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
