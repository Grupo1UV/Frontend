import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import { supabase } from '../services/supabaseClient';
import eventifyBadgeImg from '../assets/eventify-badge.png';

// Directorio de Credenciales Autorizadas (Grupo 1 - Eventify)
export const CREDENCIALES_AUTORIZADAS = [
  {
    usuario: 'juanesteban',
    email: 'juanesteban@valle.co',
    password: 'Eventify2026*',
    nombre: 'Juan Esteban Meñaca',
    rol: 'Organizador Principal',
    uuid: '00260f2c-7cfb-411d-be11-61e1e2099d3e',
  },
  {
    usuario: 'santiago',
    email: 'santiago@valle.co',
    password: 'Eventify2026*',
    nombre: 'Santiago Aldana',
    rol: 'Coordinador Logístico',
    uuid: '95513329-800d-4166-9ecd-341077920c71',
  },
  {
    usuario: 'juanmario',
    email: 'juanmario@valle.co',
    password: 'Eventify2026*',
    nombre: 'Juan Mario Ballesteros',
    rol: 'Gestor de Eventos',
    uuid: 'c83d5a42-7ef1-4b11-a831-291077920c82',
  },
  {
    usuario: 'carlos',
    email: 'carlos@valle.co',
    password: 'Eventify2026*',
    nombre: 'Carlos Andrés Caicedo',
    rol: 'Administrador de Operaciones',
    uuid: 'd94e6b53-8fa2-4c22-b942-302088031d93',
  },
  {
    usuario: 'admin',
    email: 'admin@eventify.com',
    password: 'Eventify2026*',
    nombre: 'Administrador Eventify',
    rol: 'Super Administrador',
    uuid: 'e05f7c64-90b3-4d33-ca53-413199142ea4',
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useEvents();

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let hasError = false;

    const cleanUser = usuario.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Validar usuario autorizado (por nombre de usuario o por email)
    const userFound = CREDENCIALES_AUTORIZADAS.find(
      (u) => u.usuario.toLowerCase() === cleanUser || u.email.toLowerCase() === cleanUser
    );

    if (!cleanUser || !userFound) {
      setErrorUsuario('Usuario incorrecto. Inténtalo de nuevo.');
      hasError = true;
    } else {
      setErrorUsuario('');
    }

    // 2. Validar contraseña correspondiente
    if (!cleanPass) {
      setErrorPassword('Contraseña incorrecta. Inténtalo de nuevo.');
      hasError = true;
    } else if (userFound && cleanPass !== userFound.password) {
      setErrorPassword('Contraseña incorrecta. Inténtalo de nuevo.');
      hasError = true;
    } else {
      setErrorPassword('');
    }

    if (hasError) return;

    setIsSubmitting(true);

    // Intentar inicio de sesión con Supabase Auth si es aplicable
    try {
      if (userFound && userFound.email) {
        await supabase.auth.signInWithPassword({
          email: userFound.email,
          password: userFound.password,
        });
      }
    } catch (err) {
      console.warn('Autenticación autorizada con fallback local:', err);
    }

    setTimeout(() => {
      login(userFound.email, userFound.password, rememberMe, userFound);
      setIsSubmitting(false);
      navigate('/');
    }, 350);
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        {/* Lado Izquierdo: Formulario de Inicio de Sesión */}
        <div className="login-form-side">
          <div className="login-form-content">
            <h1 className="login-main-title">Iniciar Sesión</h1>

            <form onSubmit={handleSubmit} className="login-form-element" noValidate>
              {/* Campo Nombre de usuario */}
              <div className="login-input-group">
                <label htmlFor="login-usuario" className="login-field-label">
                  Nombre de usuario
                </label>
                <input
                  id="login-usuario"
                  type="text"
                  value={usuario}
                  onChange={(e) => {
                    setUsuario(e.target.value);
                    if (errorUsuario) setErrorUsuario('');
                  }}
                  placeholder="Ingresa tu nombre de usuario"
                  className={`login-text-input ${errorUsuario ? 'input-error' : ''}`}
                  autoComplete="username"
                />
                {errorUsuario && (
                  <span className="login-field-error-text" role="alert">
                    {errorUsuario}
                  </span>
                )}
              </div>

              {/* Campo Contraseña */}
              <div className="login-input-group">
                <label htmlFor="login-password" className="login-field-label">
                  Contraseña
                </label>
                <div className="password-input-wrapper">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorPassword) setErrorPassword('');
                    }}
                    placeholder="Ingresa tu contraseña"
                    className={`login-text-input password-field ${errorPassword ? 'input-error' : ''}`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="btn-toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      /* Eye Off */
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      /* Eye Open */
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errorPassword && (
                  <span className="login-field-error-text" role="alert">
                    {errorPassword}
                  </span>
                )}
              </div>

              {/* Fila Recordarme y Olvidaste tu contraseña */}
              <div className="login-options-row">
                <label className="checkbox-custom-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="checkbox-input"
                  />
                  <span className="checkbox-text">Recordarme</span>
                </label>

                <a href="#recuperar" className="link-forgot-password" onClick={(e) => e.preventDefault()}>
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Botón Principal de Inicio de Sesión */}
              <button
                type="submit"
                className="btn-login-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>

            {/* Prompt de Registro */}
            <div className="login-footer-prompt">
              ¿No tienes una cuenta?{' '}
              <Link to="/registro" className="link-register" onClick={(e) => e.preventDefault()}>
                Regístrate aquí
              </Link>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Banner Visual de Marca Eventify */}
        <div className="login-banner-side">
          <div className="banner-visual-content">
            <div className="banner-badge-container">
              <img
                src={eventifyBadgeImg}
                alt="Eventify Logo"
                className="banner-illustration-img"
              />
            </div>

            <div className="banner-brand-text-group">
              <div className="brand-title-spark-row">
                <h2 className="banner-brand-name">Eventify</h2>
                <span className="brand-sparkle-mark" aria-hidden="true">✨</span>
              </div>
              <p className="banner-brand-slogan">
                Organiza, vive y comparte tus mejores eventos
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
