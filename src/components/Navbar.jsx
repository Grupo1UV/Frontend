import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import eventifyBadgeImg from '../assets/eventify-badge.png';
import ConfigurarLimiteModal from './ConfigurarLimiteModal';

export default function Navbar() {
  const { eventos, currentUser, logout, limiteDiario, horasUrgentesHoy } = useEvents();
  const [showConfigModal, setShowConfigModal] = useState(false);

  return (
    <header className="main-navbar">
      <div className="navbar-container">
        <Link to="/" className="brand-group" title="Eventify - Ir al inicio">
          <img
            src={eventifyBadgeImg}
            alt="Eventify Logo"
            className="brand-logo-image"
          />
          <div className="brand-text">
            <span className="brand-name">Eventify</span>
            <span className="brand-sub">Organiza, vive y comparte tus mejores eventos</span>
          </div>
        </Link>

        <nav className="navbar-links" aria-label="Navegación principal">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            Hoy
          </NavLink>

          <NavLink
            to="/eventos"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            Eventos
            <span className="nav-badge-count">{eventos.length}</span>
          </NavLink>

          <NavLink
            to="/crear-evento"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            Crear evento
          </NavLink>

          <NavLink
            to="/progreso"
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
          >
            Progreso
          </NavLink>

          {/* Botón para Configurar Límite Diario de Horas / Carga Urgente del Día (C3: Consistencia con /hoy) */}
          <button
            type="button"
            className="nav-item btn-navbar-capacity"
            onClick={() => setShowConfigModal(true)}
            title={`Carga urgente hoy: ${horasUrgentesHoy ?? 0}h / Límite diario: ${limiteDiario}h (Clic para configurar límite)`}
            aria-label={`Carga urgente diaria: ${horasUrgentesHoy ?? 0} horas de un límite de ${limiteDiario} horas al día`}
          >
            <span aria-hidden="true">⏱️</span> {horasUrgentesHoy ?? 0}h/día
          </button>

          {/* Enlace directo a Iniciar Sesión / Perfil */}
          <NavLink
            to="/login"
            className={({ isActive }) => `nav-item nav-login-btn ${isActive ? 'nav-item-active' : ''}`}
          >
            <span className="login-icon" aria-hidden="true">👤</span>
            {currentUser ? currentUser.nombre : 'Iniciar Sesión'}
          </NavLink>

          {currentUser && (
            <button
              type="button"
              className="btn-navbar-logout"
              onClick={logout}
              title="Cerrar sesión"
            >
              Salir
            </button>
          )}
        </nav>
      </div>

      <ConfigurarLimiteModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </header>
  );
}
