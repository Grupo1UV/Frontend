import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { EventsProvider, useEvents } from './context/EventsContext';
import Navbar from './components/Navbar';
import Hoy from './pages/Hoy';
import Eventos from './pages/Eventos';
import CrearEvento from './pages/CrearEvento';
import DetalleEvento from './pages/DetalleEvento';
import Login from './pages/Login';
import Progreso from './pages/Progreso';
import './App.css';

/**
 * Componente Guardián de Rutas Protegidas
 * Si el usuario no ha iniciado sesión, lo redirige forzosamente a /login
 */
function ProtectedRoute({ children }) {
  const { currentUser } = useEvents();
  if (!currentUser || !currentUser.isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/**
 * Layout principal que controla la visibilidad de la Navbar y Footer
 */
function MainAppLayout() {
  const { currentUser } = useEvents();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <div className={`app-layout ${isLoginPage ? 'layout-auth' : ''}`}>
      {/* La barra de navegación superior solo se muestra tras autenticarse */}
      {currentUser && currentUser.isLoggedIn && !isLoginPage && <Navbar />}

      <main
        className={`main-content-area ${isLoginPage ? 'main-content-auth' : ''}`}
        id="main-content"
      >
        <Routes>
          {/* Ruta pública principal: Iniciar Sesión (primera pantalla obligatoria) */}
          <Route
            path="/login"
            element={
              currentUser && currentUser.isLoggedIn ? (
                <Navigate to="/" replace />
              ) : (
                <Login />
              )
            }
          />

          {/* Rutas protegidas (requieren haber iniciado sesión previamente) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Hoy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hoy"
            element={
              <ProtectedRoute>
                <Hoy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/eventos"
            element={
              <ProtectedRoute>
                <Eventos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/crear-evento"
            element={
              <ProtectedRoute>
                <CrearEvento />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evento/:id"
            element={
              <ProtectedRoute>
                <DetalleEvento />
              </ProtectedRoute>
            }
          />
          <Route
            path="/progreso"
            element={
              <ProtectedRoute>
                <Progreso />
              </ProtectedRoute>
            }
          />

          {/* Redirección por defecto */}
          <Route
            path="*"
            element={
              currentUser && currentUser.isLoggedIn ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </main>

      {/* Footer corporativo Eventify solo en el interior de la plataforma */}
      {currentUser && currentUser.isLoggedIn && !isLoginPage && (
        <footer className="main-footer">
          <div className="footer-content">
            <p>
              <strong>Eventify</strong> • Organiza, vive y comparte tus mejores eventos
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <EventsProvider>
      <BrowserRouter>
        <MainAppLayout />
      </BrowserRouter>
    </EventsProvider>
  );
}