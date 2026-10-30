import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import eventifyBadgeImg from '../assets/eventify-badge.png';
import ConfigurarLimiteModal from './ConfigurarLimiteModal';

export default function Navbar() {
  const {
    eventos,
    currentUser,
    logout,
    limiteDiario,
    horasUrgentesHoy,
    resumenCapacidad,
    notificacionLimite,
    setNotificacionLimite,
  } = useEvents();
  const [showConfigModal, setShowConfigModal] = useState(false);

  const planificadas = resumenCapacidad?.horasPlanificadasActivas ?? horasUrgentesHoy ?? 0;
  const disponibles =
    resumenCapacidad?.horasDisponiblesActivas ??
    Math.max(0, Math.round(((limiteDiario || 6) - planificadas) * 10) / 10);
  const haySobrecarga = resumenCapacidad?.haySobrecarga ?? planificadas > (limiteDiario || 6);
  const exceso = resumenCapacidad?.excesoActivo ?? Math.max(0, Math.round((planificadas - (limiteDiario || 6)) * 10) / 10);

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

          {/* Botón para Configurar Límite Diario de Horas / Carga del Día (C3: Consistencia con /hoy) */}
          <button
            type="button"
            className="nav-item btn-navbar-capacity"
            onClick={() => setShowConfigModal(true)}
            style={
              haySobrecarga
                ? {
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    borderColor: '#FCA5A5',
                  }
                : undefined
            }
            title={`Planificadas: ${planificadas}h | Disponibles: ${disponibles}h | Límite diario: ${limiteDiario}h/día${haySobrecarga ? ` | ⚠️ Sobrecarga (+${exceso}h)` : ''} (Clic para configurar límite)`}
            aria-label={`Capacidad diaria: ${planificadas} horas planificadas, ${disponibles} horas disponibles de un límite de ${limiteDiario} horas al día`}
          >
            <span aria-hidden="true">{haySobrecarga ? '⚠️' : '⏱️'}</span>
            <span>
              {planificadas}h / {limiteDiario}h/día
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '1px 6px',
                borderRadius: '999px',
                backgroundColor: haySobrecarga ? '#FEE2E2' : '#DBEAFE',
                color: haySobrecarga ? '#991B1B' : '#1E40AF',
                fontWeight: 800,
              }}
            >
              {haySobrecarga ? `Sobrecarga +${exceso}h` : `${disponibles}h disp.`}
            </span>
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

      {/* Confirmación visual global tras guardar el límite diario */}
      {notificacionLimite && (
        <div
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: haySobrecarga ? '#FEF2F2' : '#F0FDF4',
            borderTop: `1px solid ${haySobrecarga ? '#FECACA' : '#BBF7D0'}`,
            borderBottom: `1px solid ${haySobrecarga ? '#FECACA' : '#BBF7D0'}`,
            padding: '10px 24px',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.88rem',
              color: haySobrecarga ? '#991B1B' : '#166534',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontWeight: 800 }}>
                ✓ Límite diario guardado ({notificacionLimite.limite}h/día):
              </span>
              <span
                style={{
                  background: '#FFFFFF',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  border: '1px solid #CBD5E1',
                  color: '#0F172A',
                  fontWeight: 700,
                }}
              >
                Planificadas: {planificadas}h
              </span>
              <span
                style={{
                  background: '#FFFFFF',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  border: '1px solid #CBD5E1',
                  color: disponibles > 0 ? '#15803D' : '#B45309',
                  fontWeight: 700,
                }}
              >
                Disponibles: {disponibles}h
              </span>
              <span
                style={{
                  background: haySobrecarga ? '#FEE2E2' : '#DCFCE7',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  border: `1px solid ${haySobrecarga ? '#FCA5A5' : '#86EFAC'}`,
                  color: haySobrecarga ? '#DC2626' : '#15803D',
                  fontWeight: 800,
                }}
              >
                {haySobrecarga
                  ? `⚠️ Existe sobrecarga (+${exceso}h sobre el límite)`
                  : '✓ Sin sobrecarga'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setNotificacionLimite?.(null)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                color: 'inherit',
                fontSize: '0.9rem',
                padding: '2px 6px',
              }}
              aria-label="Cerrar notificación de límite diario"
              title="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <ConfigurarLimiteModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </header>
  );
}
