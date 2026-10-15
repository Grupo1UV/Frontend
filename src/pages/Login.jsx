import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import { supabase } from '../services/supabaseClient';
import eventifyBadgeImg from '../assets/eventify-badge.png';

// Directorio de Credenciales Pre-Autorizadas (Grupo 1 - Eventify)
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

export default function Login({ initialMode = 'login' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useEvents();

  // Modo activo: 'login' o 'register'
  const [mode, setMode] = useState(() => {
    return location.pathname === '/registro' || initialMode === 'register' ? 'register' : 'login';
  });

  // Mantener sincronizado si la URL cambia a /registro o /login
  useEffect(() => {
    if (location.pathname === '/registro') {
      setMode('register');
    } else if (location.pathname === '/login') {
      setMode('login');
    }
  }, [location.pathname]);

  // Estados de Formulario de Inicio de Sesión
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorUsuario, setErrorUsuario] = useState('');
  const [errorPassword, setErrorPassword] = useState('');

  // Estados de Formulario de Registro
  const [regNombre, setRegNombre] = useState('');
  const [regUsuario, setRegUsuario] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regErrors, setRegErrors] = useState({});
  const [regSuccessMsg, setRegSuccessMsg] = useState('');

  // Estado general de envío
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cambiar entre Iniciar Sesión y Registrarse
  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorUsuario('');
    setErrorPassword('');
    setRegErrors({});
    setRegSuccessMsg('');
    navigate(newMode === 'register' ? '/registro' : '/login', { replace: true });
  };

  // --------------------------------------------------------------------------
  // Manejo de Inicio de Sesión (Login)
  // --------------------------------------------------------------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    let hasError = false;

    const cleanUser = usuario.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setErrorUsuario('Usuario incorrecto. Inténtalo de nuevo.');
      hasError = true;
    } else {
      setErrorUsuario('');
    }

    if (!cleanPass) {
      setErrorPassword('Contraseña incorrecta. Inténtalo de nuevo.');
      hasError = true;
    } else {
      setErrorPassword('');
    }

    if (hasError) return;

    setIsSubmitting(true);

    try {
      // 1. Buscar primero en CREDENCIALES_AUTORIZADAS (equipo base Eventify)
      let userFound = CREDENCIALES_AUTORIZADAS.find(
        (u) => u.usuario.toLowerCase() === cleanUser || u.email.toLowerCase() === cleanUser
      );

      // 2. Si no es credencial pre-autorizada, consultar en la base de datos Supabase
      if (!userFound) {
        try {
          const { data: dbUsers, error: dbError } = await supabase
            .from('app_users')
            .select('*')
            .or(`usuario.ilike.${cleanUser},email.ilike.${cleanUser}`)
            .limit(1);

          if (!dbError && dbUsers && dbUsers.length > 0) {
            userFound = dbUsers[0];
          }
        } catch (dbEx) {
          console.warn('Consulta en Supabase app_users:', dbEx);
        }
      }

      // 3. Fallback de respaldo en localStorage (eventify_registered_users)
      if (!userFound) {
        try {
          const localUsers = JSON.parse(localStorage.getItem('eventify_registered_users') || '[]');
          const foundLocal = localUsers.find(
            (u) => u.usuario.toLowerCase() === cleanUser || u.email.toLowerCase() === cleanUser
          );
          if (foundLocal) {
            userFound = foundLocal;
          }
        } catch (localEx) {
          console.warn('Consulta en usuarios locales:', localEx);
        }
      }

      // Verificación de existencia del usuario
      if (!userFound) {
        setErrorUsuario('Usuario incorrecto. Inténtalo de nuevo.');
        setIsSubmitting(false);
        return;
      }

      // Verificación de la contraseña correspondiente
      if (cleanPass !== userFound.password) {
        setErrorPassword('Contraseña incorrecta. Inténtalo de nuevo.');
        setIsSubmitting(false);
        return;
      }

      // Intentar sincronizar sesión con Supabase Auth si es aplicable
      try {
        if (userFound.email) {
          await supabase.auth.signInWithPassword({
            email: userFound.email,
            password: userFound.password,
          });
        }
      } catch (authErr) {
        console.warn('Supabase Auth signIn fallback:', authErr);
      }

      // Login exitoso: Registrar en contexto y navegar a la app
      setTimeout(() => {
        login(userFound.email, userFound.password, rememberMe, userFound);
        setIsSubmitting(false);
        navigate('/');
      }, 350);
    } catch (err) {
      console.error('Error durante el inicio de sesión:', err);
      setErrorUsuario('Ocurrió un error al validar el usuario. Inténtalo de nuevo.');
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Manejo de Registro de Usuario (Register)
  // --------------------------------------------------------------------------
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    const cleanNombre = regNombre.trim();
    const cleanUser = regUsuario.trim().toLowerCase();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPass = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    // 1. Validaciones de formulario
    if (!cleanNombre) {
      errors.nombre = 'El nombre completo es requerido.';
    }

    if (!cleanUser) {
      errors.usuario = 'El nombre de usuario es requerido.';
    } else if (cleanUser.length < 3) {
      errors.usuario = 'El usuario debe tener al menos 3 caracteres.';
    } else if (!/^[a-zA-Z0-9._-]+$/.test(cleanUser)) {
      errors.usuario = 'Solo se permiten letras, números, puntos y guiones.';
    }

    if (!cleanEmail) {
      errors.email = 'El correo electrónico es requerido.';
    } else if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      errors.email = 'Ingresa un correo electrónico válido.';
    }

    if (!cleanPass) {
      errors.password = 'La contraseña es requerida.';
    } else if (cleanPass.length < 6) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (!cleanConfirm) {
      errors.confirmPassword = 'Debes confirmar la contraseña.';
    } else if (cleanPass !== cleanConfirm) {
      errors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    if (Object.keys(errors).length > 0) {
      setRegErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setRegErrors({});
    setRegSuccessMsg('');

    try {
      // 2. Verificar duplicados en las credenciales pre-autorizadas
      const existsInPreauth = CREDENCIALES_AUTORIZADAS.some(
        (u) => u.usuario.toLowerCase() === cleanUser || u.email.toLowerCase() === cleanEmail
      );
      if (existsInPreauth) {
        setRegErrors({
          usuario: 'Este nombre de usuario o correo ya se encuentra registrado.',
        });
        setIsSubmitting(false);
        return;
      }

      // 3. Verificar duplicados en la base de datos Supabase
      try {
        const { data: existingUsers } = await supabase
          .from('app_users')
          .select('usuario, email')
          .or(`usuario.ilike.${cleanUser},email.ilike.${cleanEmail}`);

        if (existingUsers && existingUsers.length > 0) {
          const dupUser = existingUsers.some((u) => u.usuario.toLowerCase() === cleanUser);
          setRegErrors({
            usuario: dupUser ? 'Este nombre de usuario ya está en uso.' : undefined,
            email: !dupUser ? 'Este correo electrónico ya está en uso.' : undefined,
          });
          setIsSubmitting(false);
          return;
        }
      } catch (chkEx) {
        console.warn('Verificación previa en Supabase app_users:', chkEx);
      }

      // 4. Crear el nuevo usuario
      const newUserId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `user-${Date.now()}`;

      const newUserData = {
        id: newUserId,
        nombre: cleanNombre,
        usuario: cleanUser,
        email: cleanEmail,
        password: cleanPass,
        rol: 'Organizador Independiente',
        created_at: new Date().toISOString(),
      };

      // 5. Guardar en la base de datos Supabase (tabla app_users)
      let savedInCloud = false;
      try {
        const { error: insertErr } = await supabase.from('app_users').insert([
          {
            id: newUserData.id,
            nombre: newUserData.nombre,
            usuario: newUserData.usuario,
            email: newUserData.email,
            password: newUserData.password,
            rol: newUserData.rol,
          },
        ]);

        if (!insertErr) {
          savedInCloud = true;
        } else {
          console.warn('Aviso de inserción en Supabase app_users:', insertErr.message);
        }
      } catch (insertEx) {
        console.warn('Inserción en Supabase app_users:', insertEx);
      }

      // 6. Registro opcional en Supabase Auth en segundo plano
      try {
        await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPass,
          options: {
            data: {
              nombre: cleanNombre,
              usuario: cleanUser,
            },
          },
        });
      } catch (authEx) {
        console.warn('Supabase Auth signUp opcional:', authEx);
      }

      // 7. Guardar en almacenamiento local como respaldo garantizado
      try {
        const localUsers = JSON.parse(localStorage.getItem('eventify_registered_users') || '[]');
        const updatedLocal = localUsers.filter(
          (u) => u.usuario !== cleanUser && u.email !== cleanEmail
        );
        updatedLocal.push(newUserData);
        localStorage.setItem('eventify_registered_users', JSON.stringify(updatedLocal));
      } catch (localStoreEx) {
        console.warn('Guardado en localStorage de usuarios:', localStoreEx);
      }

      // 8. Mensaje de éxito e inicio de sesión automático
      setRegSuccessMsg(
        savedInCloud
          ? '¡Cuenta creada y guardada con éxito! Iniciando sesión...'
          : '¡Cuenta registrada con éxito! Iniciando sesión...'
      );

      setTimeout(() => {
        login(newUserData.email, newUserData.password, true, newUserData);
        setIsSubmitting(false);
        navigate('/');
      }, 700);
    } catch (err) {
      console.error('Error durante el registro:', err);
      setRegErrors({
        general: 'Ocurrió un error inesperado al procesar el registro. Inténtalo de nuevo.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        {/* Lado Izquierdo: Formulario Dinámico (Login o Registro) */}
        <div className="login-form-side">
          <div className="login-form-content">
            {mode === 'login' ? (
              // ==============================================================
              // VISTA 1: INICIAR SESIÓN
              // ==============================================================
              <>
                <h1 className="login-main-title">Iniciar Sesión</h1>

                <form onSubmit={handleLoginSubmit} className="login-form-element" noValidate>
                  {/* Campo Nombre de usuario o correo */}
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
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
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

                    <a
                      href="#recuperar"
                      className="link-forgot-password"
                      onClick={(e) => e.preventDefault()}
                    >
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

                {/* Enlace para cambiar a Registro */}
                <div className="login-footer-prompt">
                  ¿No tienes una cuenta?{' '}
                  <button
                    type="button"
                    className="link-register btn-as-link"
                    onClick={() => switchMode('register')}
                  >
                    Regístrate aquí
                  </button>
                </div>
              </>
            ) : (
              // ==============================================================
              // VISTA 2: REGISTRO DE CUENTA
              // ==============================================================
              <>
                <h1 className="login-main-title">Crear Cuenta</h1>
                <p className="login-form-subtitle">
                  Regístrate para organizar y gestionar tus eventos
                </p>

                {regSuccessMsg && (
                  <div className="login-inline-success" role="alert">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{regSuccessMsg}</span>
                  </div>
                )}

                {regErrors.general && (
                  <div className="login-inline-error" role="alert">
                    <span>⚠️ {regErrors.general}</span>
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="login-form-element" noValidate>
                  {/* Campo Nombre Completo */}
                  <div className="login-input-group">
                    <label htmlFor="reg-nombre" className="login-field-label">
                      Nombre completo
                    </label>
                    <input
                      id="reg-nombre"
                      type="text"
                      value={regNombre}
                      onChange={(e) => {
                        setRegNombre(e.target.value);
                        if (regErrors.nombre) {
                          setRegErrors((prev) => ({ ...prev, nombre: undefined }));
                        }
                      }}
                      placeholder="Ej. Juan Pérez"
                      className={`login-text-input ${regErrors.nombre ? 'input-error' : ''}`}
                      autoComplete="name"
                    />
                    {regErrors.nombre && (
                      <span className="login-field-error-text" role="alert">
                        {regErrors.nombre}
                      </span>
                    )}
                  </div>

                  {/* Fila de 2 columnas: Nombre de usuario y Correo */}
                  <div className="login-input-group">
                    <label htmlFor="reg-usuario" className="login-field-label">
                      Nombre de usuario
                    </label>
                    <input
                      id="reg-usuario"
                      type="text"
                      value={regUsuario}
                      onChange={(e) => {
                        setRegUsuario(e.target.value);
                        if (regErrors.usuario) {
                          setRegErrors((prev) => ({ ...prev, usuario: undefined }));
                        }
                      }}
                      placeholder="Ej. juanperez"
                      className={`login-text-input ${regErrors.usuario ? 'input-error' : ''}`}
                      autoComplete="username"
                    />
                    {regErrors.usuario && (
                      <span className="login-field-error-text" role="alert">
                        {regErrors.usuario}
                      </span>
                    )}
                  </div>

                  <div className="login-input-group">
                    <label htmlFor="reg-email" className="login-field-label">
                      Correo electrónico
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      value={regEmail}
                      onChange={(e) => {
                        setRegEmail(e.target.value);
                        if (regErrors.email) {
                          setRegErrors((prev) => ({ ...prev, email: undefined }));
                        }
                      }}
                      placeholder="Ej. juan@correo.com"
                      className={`login-text-input ${regErrors.email ? 'input-error' : ''}`}
                      autoComplete="email"
                    />
                    {regErrors.email && (
                      <span className="login-field-error-text" role="alert">
                        {regErrors.email}
                      </span>
                    )}
                  </div>

                  {/* Campo Contraseña */}
                  <div className="login-input-group">
                    <label htmlFor="reg-password" className="login-field-label">
                      Contraseña
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        id="reg-password"
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => {
                          setRegPassword(e.target.value);
                          if (regErrors.password) {
                            setRegErrors((prev) => ({ ...prev, password: undefined }));
                          }
                        }}
                        placeholder="Mínimo 6 caracteres"
                        className={`login-text-input password-field ${regErrors.password ? 'input-error' : ''}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="btn-toggle-password"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        aria-label={showRegPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        tabIndex={-1}
                      >
                        {showRegPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {regErrors.password && (
                      <span className="login-field-error-text" role="alert">
                        {regErrors.password}
                      </span>
                    )}
                  </div>

                  {/* Campo Confirmar Contraseña */}
                  <div className="login-input-group">
                    <label htmlFor="reg-confirm-password" className="login-field-label">
                      Confirmar contraseña
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        id="reg-confirm-password"
                        type={showRegConfirm ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => {
                          setRegConfirmPassword(e.target.value);
                          if (regErrors.confirmPassword) {
                            setRegErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                          }
                        }}
                        placeholder="Repite tu contraseña"
                        className={`login-text-input password-field ${regErrors.confirmPassword ? 'input-error' : ''}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="btn-toggle-password"
                        onClick={() => setShowRegConfirm(!showRegConfirm)}
                        aria-label={showRegConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                        tabIndex={-1}
                      >
                        {showRegConfirm ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {regErrors.confirmPassword && (
                      <span className="login-field-error-text" role="alert">
                        {regErrors.confirmPassword}
                      </span>
                    )}
                  </div>

                  {/* Botón Principal de Registro */}
                  <button
                    type="submit"
                    className="btn-login-submit btn-register-submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Creando cuenta...' : 'Crear Cuenta'}
                  </button>
                </form>

                {/* Enlace para volver a Iniciar Sesión */}
                <div className="login-footer-prompt">
                  ¿Ya tienes una cuenta?{' '}
                  <button
                    type="button"
                    className="link-register btn-as-link"
                    onClick={() => switchMode('login')}
                  >
                    Inicia sesión aquí
                  </button>
                </div>
              </>
            )}
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
