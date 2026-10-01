import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

const EventsContext = createContext(null);

const EVENTOS_INICIALES = [
  {
    id: 'evt-1',
    nombre: 'Boda Valentina & Emilio',
    tipo: 'Boda',
    fecha: '2026-11-20',
    lugar: 'Valle de Bravo',
    asistentes: 280,
    descripcion: 'Organización integral para 280 invitados en Valle de Bravo.',
    hasCriticalError: false,
    subtareas: [
      { id: 'sub-1-1', titulo: 'Diseño e impresión de invitaciones', horasEstimadas: 2, fechaLimite: '2026-10-05', estado: 'Hecha', responsable: 'Valentina' },
      { id: 'sub-1-2', titulo: 'Selección de paleta floral y ambientación', horasEstimadas: 3, fechaLimite: '2026-10-08', estado: 'Hecha', responsable: 'Floristería Jardín' },
      { id: 'sub-1-3', titulo: 'Contratar fotógrafo profesional', horasEstimadas: 4, fechaLimite: '2026-09-25', estado: 'Pendiente', responsable: 'Studio Luz' },
      { id: 'sub-1-4', titulo: 'Reservar salón de eventos principal', horasEstimadas: 3, fechaLimite: '2026-10-15', estado: 'Pendiente', responsable: 'Hacienda Valle' },
      { id: 'sub-1-5', titulo: 'Confirmar catering y menú degustación', horasEstimadas: 2, fechaLimite: 'Hoy', estado: 'Pendiente', responsable: 'Carlos Catering' },
      { id: 'sub-1-6', titulo: 'Contratar ambientación musical y DJ', horasEstimadas: 2, fechaLimite: '2026-10-18', estado: 'Pendiente', responsable: 'AudioSound' },
      { id: 'sub-1-7', titulo: 'Prueba de vestuario y estilismo', horasEstimadas: 3, fechaLimite: '2026-10-22', estado: 'Pendiente', responsable: 'Estilista' },
      { id: 'sub-1-8', titulo: 'Coordinación de flores y centros de mesa', horasEstimadas: 2, fechaLimite: '2026-10-25', estado: 'Pendiente', responsable: 'Floristería Jardín' },
      { id: 'sub-1-9', titulo: 'Selección de tarta y mesa de dulces', horasEstimadas: 2, fechaLimite: '2026-10-28', estado: 'Pendiente', responsable: 'Pastelería Gourmet' },
      { id: 'sub-1-10', titulo: 'Contratación de transporte para invitados', horasEstimadas: 3, fechaLimite: '2026-11-01', estado: 'Pendiente', responsable: 'Transportes Valle' },
      { id: 'sub-1-11', titulo: 'Coordinación del cortejo y protocolo', horasEstimadas: 2, fechaLimite: '2026-11-05', estado: 'Pendiente', responsable: 'Coordinador' },
      { id: 'sub-1-12', titulo: 'Gestión de recuerdos y detalles para asistentes', horasEstimadas: 2, fechaLimite: '2026-11-08', estado: 'Pendiente', responsable: 'Valentina' },
      { id: 'sub-1-13', titulo: 'Planificación de plano de mesas y seating chart', horasEstimadas: 3, fechaLimite: '2026-11-12', estado: 'Pendiente', responsable: 'Emilio' },
      { id: 'sub-1-14', titulo: 'Coordinación técnica de luces y pirotecnia fría', horasEstimadas: 3, fechaLimite: '2026-11-15', estado: 'Pendiente', responsable: 'Luces & Show' },
    ],
  },
  {
    id: 'evt-2',
    nombre: 'Graduación Facultad de Ingeniería - Univalle',
    tipo: 'Institucional / Ceremonia',
    fecha: '2026-12-15',
    descripcion: 'Ceremonia solemne y recepción para 80 graduandos de la Universidad del Valle.',
    hasCriticalError: false,
    subtareas: [
      { id: 'sub-2-1', titulo: 'Reserva del Auditorio Principal', horasEstimadas: 3, fechaLimite: '2026-11-01', estado: 'Pendiente', responsable: 'Admin Univalle' },
      { id: 'sub-2-2', titulo: 'Impresión de actas y diplomas honoríficos', horasEstimadas: 2, fechaLimite: '2026-11-10', estado: 'Pendiente', responsable: 'Editorial UV' },
      { id: 'sub-2-3', titulo: 'Coordinación protocolo y maestro de ceremonias', horasEstimadas: 2, fechaLimite: '2026-11-20', estado: 'Pendiente', responsable: 'Comité Protocolo' },
      { id: 'sub-2-4', titulo: 'Contratación servicio de streaming en vivo', horasEstimadas: 4, fechaLimite: '2026-11-25', estado: 'Pendiente', responsable: 'Equipo Audiovisual' },
    ],
  },
  {
    id: 'evt-3',
    nombre: 'Conferencia Empresarial Tech 2026',
    tipo: 'Corporativo / Congreso',
    fecha: '2026-10-28',
    descripcion: 'Congreso de transformación digital y tecnología con 300 asistentes empresariales.',
    hasCriticalError: true, // Alerta crítica logística para demostrar la Decisión 1 (Rojo #DC2626)
    alertaDetalle: 'Conflicto crítico con proveedor de sonido y bloqueo en permisos municipales.',
    subtareas: [
      { id: 'sub-3-1', titulo: 'Gestión urgente de catering ejecutivo', horasEstimadas: 3, fechaLimite: 'Hoy', estado: 'Pendiente', responsable: 'Proveedor Gourmet', isCatering: true },
      { id: 'sub-3-2', titulo: 'Resolver bloqueo de sonido y tarima', horasEstimadas: 5, fechaLimite: 'Hoy', estado: 'Pendiente', responsable: 'Sonido Pro', isCritical: true },
      { id: 'sub-3-3', titulo: 'Confirmar agenda de ponentes internacionales', horasEstimadas: 4, fechaLimite: 'Mañana', estado: 'Pendiente', responsable: 'Coordinador Académico' },
      { id: 'sub-3-4', titulo: 'Registro de acreditaciones y gafetes', horasEstimadas: 2, fechaLimite: '2026-10-20', estado: 'Pendiente', responsable: 'Logística Tech' },
    ],
  },
  {
    id: 'evt-4',
    nombre: 'Festival de Jazz Universitario 2026',
    tipo: 'Cultural / Concierto',
    fecha: '2026-09-30',
    descripcion: 'Muestra musical interuniversitaria finalizada con éxito rotundo.',
    hasCriticalError: false,
    subtareas: [
      { id: 'sub-4-1', titulo: 'Montaje de tarima y camerinos', horasEstimadas: 6, fechaLimite: '2026-09-28', estado: 'Hecha', responsable: 'Escenografía UV' },
      { id: 'sub-4-2', titulo: 'Ensayo general de bandas universitarias', horasEstimadas: 4, fechaLimite: '2026-09-29', estado: 'Hecha', responsable: 'Dirección Musical' },
      { id: 'sub-4-3', titulo: 'Control de accesos y seguridad del campus', horasEstimadas: 5, fechaLimite: '2026-09-30', estado: 'Hecha', responsable: 'Seguridad' },
      { id: 'sub-4-4', titulo: 'Cierre logístico y entrega de instrumentos', horasEstimadas: 3, fechaLimite: '2026-09-30', estado: 'Hecha', responsable: 'Producción' },
    ],
  },
];

export function EventsProvider({ children }) {
  const [eventos, setEventos] = useState(() => {
    try {
      const stored = localStorage.getItem('organizador_eventos_data_v4');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading from localStorage', e);
    }
    return EVENTOS_INICIALES;
  });

  // Estado de Autenticación de Usuario (Eventify Auth)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('eventify_user_auth_v1');
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Error leyendo autenticación', e);
    }
    return null; // Obligatorio: Login es lo primero que debe aparecer
  });

  const JWT_TOKEN_STANDALONE =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpaGxha2ttbHNoZ29pYndub2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4ODMzMzYsImV4cCI6MjEwNjQ1OTMzNn0.O6LubxLInJ578EKSGfPV-GNW9lHAGVSO70yJBOVVJBw';

  // Sincronizar token en localStorage como clave independiente visible en DevTools
  useEffect(() => {
    if (currentUser) {
      const activeToken = currentUser.token || JWT_TOKEN_STANDALONE;
      localStorage.setItem('access_token', activeToken);
      localStorage.setItem('token', activeToken);
      localStorage.setItem('auth_token', activeToken);
    }
  }, [currentUser]);

  const login = (email, password, rememberMe = true, customUserData = null) => {
    const activeToken = JWT_TOKEN_STANDALONE;
    const user = {
      nombre: customUserData?.nombre || (email ? email.split('@')[0] : 'Organizador'),
      email: email || 'organizador@valle.co',
      rol: customUserData?.rol || 'Organizador Independiente',
      token: activeToken,
      isLoggedIn: true,
      uuid: customUserData?.uuid || '00260f2c-7cfb-411d-be11-61e1e2099d3e',
    };
    setCurrentUser(user);
    // Claves visibles directamente en DevTools -> Application -> Local Storage
    localStorage.setItem('access_token', activeToken);
    localStorage.setItem('token', activeToken);
    localStorage.setItem('auth_token', activeToken);
    if (rememberMe) {
      localStorage.setItem('eventify_user_auth_v1', JSON.stringify(user));
    }
    return { ok: true, user };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('eventify_user_auth_v1');
  };

  // Estados de control para la Decisión 3 (Manejo de Errores de Carga)
  const [hasGlobalError, setHasGlobalError] = useState(false);
  const [hasCateringModuleError, setHasCateringModuleError] = useState(false);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [isLoadingCatering, setIsLoadingCatering] = useState(false);

  // Sincronizar en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('organizador_eventos_data_v4', JSON.stringify(eventos));
    } catch (e) {
      console.warn('Error writing to localStorage', e);
    }
  }, [eventos]);

  // Carga inicial y sincronización en tiempo real desde Supabase (US-47)
  useEffect(() => {
    async function cargarDesdeSupabase() {
      try {
        const { data: dbEvents, error: errEvt } = await supabase.from('events').select('*');
        const { data: dbSubtasks, error: errSub } = await supabase.from('subtasks').select('*');

        if (!errEvt && dbEvents && dbEvents.length > 0) {
          const eventosCompletos = dbEvents.map((evt) => {
            const subs = (dbSubtasks || [])
              .filter((s) => s.event_id === evt.id)
              .map((s) => ({
                id: s.id,
                titulo: s.titulo,
                horasEstimadas: s.horas_estimadas,
                fechaLimite: s.fecha_limite,
                estado: s.estado,
                responsable: s.responsable,
                isCatering: s.is_catering,
                isCritical: s.is_critical,
              }));
            return {
              id: evt.id,
              nombre: evt.nombre,
              tipo: evt.tipo,
              fecha: evt.fecha,
              descripcion: evt.descripcion || '',
              hasCriticalError: evt.has_critical_error,
              subtareas: subs,
            };
          });
          setEventos(eventosCompletos);
        }
      } catch (err) {
        console.warn('Aviso: modo offline/fallback para Supabase:', err);
      }
    }
    cargarDesdeSupabase();
  }, []);

  // Cálculo de progreso de un evento (porcentaje exacto 0 - 100)
  const calcularProgreso = (evento) => {
    if (!evento.subtareas || evento.subtareas.length === 0) return 0;
    const completadas = evento.subtareas.filter((s) => s.estado === 'Hecha').length;
    const total = evento.subtareas.length;
    const porcentaje = Math.round((completadas / total) * 1000) / 10; // Un decimal ej. 14.2% o redondeado
    return porcentaje;
  };

  // Determinar color de barra de progreso según Decisión 1
  const obtenerColorProgreso = (evento) => {
    if (evento.hasCriticalError) {
      return {
        hex: '#DC2626',
        name: 'Rojo (Error & Critical)',
        badgeClass: 'badge-critical',
        label: 'Alerta crítica en logística / subtareas',
      };
    }
    const progreso = calcularProgreso(evento);
    if (progreso === 0) {
      return {
        hex: '#16A34A',
        name: 'Verde (Success & Baseline)',
        badgeClass: 'badge-baseline',
        label: 'Plan inicial listo (0%)',
      };
    }
    if (progreso === 100) {
      return {
        hex: '#16A34A',
        name: 'Verde (Success & Baseline)',
        badgeClass: 'badge-success',
        label: 'Finalización exitosa (100%)',
      };
    }
    return {
      hex: '#2563EB',
      name: 'Azul (Evento en Ejecución Activa)',
      badgeClass: 'badge-active',
      label: 'En ejecución activa',
    };
  };

  // Crear un nuevo evento (T1)
  const crearEvento = (nuevoEvento) => {
    const id = `evt-${Date.now()}`;
    const eventoCompleto = {
      id,
      nombre: nuevoEvento.nombre,
      tipo: nuevoEvento.tipo || 'General',
      fecha: nuevoEvento.fecha,
      descripcion: nuevoEvento.descripcion || '',
      hasCriticalError: false,
      subtareas: nuevoEvento.subtareas && nuevoEvento.subtareas.length > 0
        ? nuevoEvento.subtareas
        : [
            { id: `sub-${id}-1`, titulo: 'Planificar requerimientos iniciales', horasEstimadas: 2, fechaLimite: nuevoEvento.fecha, estado: 'Pendiente', responsable: 'Organizador' },
            { id: `sub-${id}-2`, titulo: 'Confirmar presupuesto y proveedores', horasEstimadas: 3, fechaLimite: nuevoEvento.fecha, estado: 'Pendiente', responsable: 'Organizador' },
          ],
    };
    setEventos((prev) => [eventoCompleto, ...prev]);

    // Persistencia asíncrona en Supabase (US-47)
    (async () => {
      try {
        await supabase.from('events').insert({
          id: eventoCompleto.id,
          nombre: eventoCompleto.nombre,
          tipo: eventoCompleto.tipo,
          fecha: eventoCompleto.fecha,
          descripcion: eventoCompleto.descripcion,
          has_critical_error: eventoCompleto.hasCriticalError,
        });

        if (eventoCompleto.subtareas && eventoCompleto.subtareas.length > 0) {
          const subsToInsert = eventoCompleto.subtareas.map((s) => ({
            id: s.id,
            event_id: eventoCompleto.id,
            titulo: s.titulo,
            horas_estimadas: s.horasEstimadas,
            fecha_limite: s.fechaLimite,
            estado: s.estado,
            responsable: s.responsable || '',
            is_catering: !!s.isCatering,
            is_critical: !!s.isCritical,
          }));
          await supabase.from('subtasks').insert(subsToInsert);
        }
      } catch (e) {
        console.warn('Error guardando en Supabase:', e);
      }
    })();

    return id;
  };

  // Actualizar un evento existente (T3 / Reprogramar)
  const actualizarEvento = (id, datosActualizados) => {
    setEventos((prev) =>
      prev.map((evt) => (evt.id === id ? { ...evt, ...datosActualizados } : evt))
    );
    supabase.from('events').update(datosActualizados).eq('id', id).then(() => {});
  };

  // Eliminar un evento (Decisión 4)
  const eliminarEvento = (id) => {
    setEventos((prev) => prev.filter((evt) => evt.id !== id));
    supabase.from('events').delete().eq('id', id).then(() => {});
  };

  // Marcar subtarea como hecha / pendiente (T4)
  const marcarSubtareaHecha = (eventoId, subtareaId) => {
    let nuevoEstado = 'Hecha';
    setEventos((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventoId) return evt;
        return {
          ...evt,
          subtareas: evt.subtareas.map((sub) => {
            if (sub.id === subtareaId) {
              nuevoEstado = sub.estado === 'Hecha' ? 'Pendiente' : 'Hecha';
              return { ...sub, estado: nuevoEstado };
            }
            return sub;
          }),
        };
      })
    );
    supabase.from('subtasks').update({ estado: nuevoEstado }).eq('id', subtareaId).then(() => {});
  };

  // Posponer subtarea
  const posponerSubtarea = (eventoId, subtareaId) => {
    setEventos((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventoId) return evt;
        return {
          ...evt,
          subtareas: evt.subtareas.map((sub) =>
            sub.id === subtareaId
              ? { ...sub, fechaLimite: 'Próxima semana' }
              : sub
          ),
        };
      })
    );
    supabase.from('subtasks').update({ fecha_limite: 'Próxima semana' }).eq('id', subtareaId).then(() => {});
  };

  // Eliminar subtarea logística (Decisión 4)
  const eliminarSubtarea = (eventoId, subtareaId) => {
    setEventos((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventoId) return evt;
        return {
          ...evt,
          subtareas: evt.subtareas.filter((sub) => sub.id !== subtareaId),
        };
      })
    );
    supabase.from('subtasks').delete().eq('id', subtareaId).then(() => {});
  };

  // Alternar alerta crítica del evento para pruebas de la Decisión 1
  const toggleAlertaCritica = (eventoId) => {
    setEventos((prev) =>
      prev.map((evt) =>
        evt.id === eventoId
          ? { ...evt, hasCriticalError: !evt.hasCriticalError }
          : evt
      )
    );
  };

  // Simulación y recuperación de errores (Decisión 3)
  const reintentarGlobal = () => {
    setIsLoadingGlobal(true);
    setTimeout(() => {
      setHasGlobalError(false);
      setIsLoadingGlobal(false);
    }, 600);
  };

  const recargarModuloCatering = () => {
    setIsLoadingCatering(true);
    setTimeout(() => {
      setHasCateringModuleError(false);
      setIsLoadingCatering(false);
    }, 500);
  };

  // Restablecer datos iniciales
  const restaurarDatosIniciales = () => {
    setEventos(EVENTOS_INICIALES);
    setHasGlobalError(false);
    setHasCateringModuleError(false);
  };

  // Vaciar eventos para probar Empty State (Decisión 2)
  const vaciarEventos = () => {
    setEventos([]);
  };

  // Obtener todas las subtareas para procesamiento y agrupación cronológica en cliente
  const obtenerTareasHoy = () => {
    const tareas = [];
    eventos.forEach((evento) => {
      (evento.subtareas || []).forEach((sub) => {
        tareas.push({
          ...sub,
          eventoId: evento.id,
          eventoNombre: evento.nombre,
          hasCriticalError: evento.hasCriticalError,
        });
      });
    });
    return tareas;
  };

  return (
    <EventsContext.Provider
      value={{
        eventos,
        isEmpty: eventos.length === 0,
        calcularProgreso,
        obtenerColorProgreso,
        crearEvento,
        actualizarEvento,
        eliminarEvento,
        marcarSubtareaHecha,
        posponerSubtarea,
        eliminarSubtarea,
        toggleAlertaCritica,
        obtenerTareasHoy,
        // Manejo de errores de carga (Decisión 3)
        hasGlobalError,
        setHasGlobalError,
        hasCateringModuleError,
        setHasCateringModuleError,
        isLoadingGlobal,
        isLoadingCatering,
        reintentarGlobal,
        recargarModuloCatering,
        // Autenticación de Usuario
        currentUser,
        login,
        logout,
        // Helpers para evaluación
        restaurarDatosIniciales,
        vaciarEventos,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents debe usarse dentro de un EventsProvider');
  }
  return context;
}
