import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import eventifyBadgeImg from '../assets/eventify-badge.png';

export default function Navbar() {
  const { eventos, currentUser, logout } = useEvents();

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
    </header>
  );
}
