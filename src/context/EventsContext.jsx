import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { normalizarJornada, hoyIso } from '../utils/validacionesHoras';
import { api } from '../services/api';

const EventsContext = createContext(null);

// Helper para clave de aislamiento en localStorage por usuario
const getUserStorageKey = (user) => {
  if (user?.uuid) return `eventify_events_${user.uuid}`;
  if (user?.id) return `eventify_events_${user.id}`;
  return 'eventify_events_guest';
};

export function EventsProvider({ children }) {
  // Estado de Autenticación de Usuario (Eventify Auth)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('eventify_user_auth_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Sanitizar si era admin con el UUID viejo
        if (
          parsed?.email &&
          (parsed.email.toLowerCase() === 'admin@eventify.com' || parsed.usuario === 'admin') &&
          parsed.uuid !== '7dc9f160-a901-43a3-8a9f-21eb6050bf66'
        ) {
          parsed.uuid = '7dc9f160-a901-43a3-8a9f-21eb6050bf66';
          parsed.id = '7dc9f160-a901-43a3-8a9f-21eb6050bf66';
          try {
            localStorage.setItem('eventify_user_auth_v1', JSON.stringify(parsed));
          } catch {}
        } else if (
          parsed?.email &&
          parsed.email.toLowerCase() !== 'juanesteban@valle.co' &&
          parsed.uuid === '00260f2c-7cfb-411d-be11-61e1e2099d3e'
        ) {
          const correctedId = (parsed.id && parsed.id !== '00260f2c-7cfb-411d-be11-61e1e2099d3e')
            ? parsed.id
            : `usr-${parsed.email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          parsed.uuid = correctedId;
          parsed.id = correctedId;
          try {
            localStorage.setItem('eventify_user_auth_v1', JSON.stringify(parsed));
          } catch {}
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Error leyendo autenticación', e);
    }
    return null; // Obligatorio: Login es lo primero que debe aparecer
  });

  const [eventos, setEventos] = useState(() => {
    try {
      let initialUser = null;
      const storedAuth = localStorage.getItem('eventify_user_auth_v1');
      if (storedAuth) {
        initialUser = JSON.parse(storedAuth);
        if (
          initialUser?.email &&
          (initialUser.email.toLowerCase() === 'admin@eventify.com' || initialUser.usuario === 'admin')
        ) {
          initialUser.uuid = '7dc9f160-a901-43a3-8a9f-21eb6050bf66';
          initialUser.id = '7dc9f160-a901-43a3-8a9f-21eb6050bf66';
        } else if (
          initialUser?.email &&
          initialUser.email.toLowerCase() !== 'juanesteban@valle.co' &&
          initialUser.uuid === '00260f2c-7cfb-411d-be11-61e1e2099d3e'
        ) {
          initialUser.uuid = initialUser.id || `usr-${initialUser.email.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        }
      }

      const key = getUserStorageKey(initialUser);
      let stored = localStorage.getItem(key);
      // Si admin no tiene eventos en su clave nueva, verificar si estaban en la clave previa y migrar
      if (!stored && (initialUser?.email?.toLowerCase() === 'admin@eventify.com' || initialUser?.usuario === 'admin')) {
        const legacyAdmin = localStorage.getItem('eventify_events_e05f7c64-90b3-4d33-ca53-413199142ea4');
        if (legacyAdmin) {
          stored = legacyAdmin;
          localStorage.setItem(key, legacyAdmin);
        }
      }

      if (stored) {
        return JSON.parse(stored);
      }
      const isJuanEstebanDemo =
        initialUser?.uuid === '00260f2c-7cfb-411d-be11-61e1e2099d3e' &&
        initialUser?.email?.toLowerCase() === 'juanesteban@valle.co';

      if (isJuanEstebanDemo) {
        return EVENTOS_INICIALES;
      }
    } catch (e) {
      console.warn('Error reading from localStorage', e);
    }
    return [];
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
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const resolvedId = customUserData?.uuid || customUserData?.id;
    const fallbackId = (cleanEmail === 'juanesteban@valle.co')
      ? '00260f2c-7cfb-411d-be11-61e1e2099d3e'
      : (cleanEmail ? `usr-${cleanEmail.replace(/[^a-z0-9]/g, '-')}` : 'usr-invitado');

    const effectiveId = resolvedId || fallbackId;

    const user = {
      id: effectiveId,
      uuid: effectiveId,
      nombre: customUserData?.nombre || (email ? email.split('@')[0] : 'Organizador'),
      email: email || 'organizador@valle.co',
      rol: customUserData?.rol || 'Organizador Independiente',
      token: activeToken,
      isLoggedIn: true,
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
    setEventos([]);
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
  // Sprint 3: Módulo 4 - Estado Cargando (Loading State) para planificación
  const [isLoadingPlanning, setIsLoadingPlanning] = useState(true);

  // Límite diario de capacidad en horas (Sprint 3: 6 horas por defecto, rango 1-16)
  const [limiteDiario, setLimiteDiario] = useState(() => {
    try {
      const storedAuth = localStorage.getItem('eventify_user_auth_v1');
      const user = storedAuth ? JSON.parse(storedAuth) : null;
      const userKey = user?.uuid || user?.id;
      const stored = userKey ? localStorage.getItem(`eventify_limite_diario_${userKey}`) : null;
      const fallback = localStorage.getItem('eventify_limite_diario');
      const val = Number(stored || fallback);
      if (Number.isFinite(val) && val >= 1 && val <= 16) {
        return val;
      }
    } catch (e) {
      console.warn('Error leyendo límite diario', e);
    }
    return 6; // 6 horas por defecto
  });

  const cambiarLimiteDiario = async (nuevoValor) => {
    let val = 6;
    const trimmed = String(nuevoValor ?? '').trim();
    if (trimmed === '') {
      val = 6;
    } else {
      val = Number(trimmed);
      if (!Number.isFinite(val) || val < 1 || val > 16) {
        return { ok: false, error: 'El valor debe estar entre 1 y 16' };
      }
    }
    const sanitized = Math.round(val * 10) / 10;
    setLimiteDiario(sanitized);
    try {
      localStorage.setItem('eventify_limite_diario', String(sanitized));
      const userKey = currentUser?.uuid || currentUser?.id;
      if (userKey) {
        localStorage.setItem(`eventify_limite_diario_${userKey}`, String(sanitized));
      }
      api.updateCapacity(sanitized).catch(() => {});
    } catch (e) {
      console.warn('Error guardando límite diario en localStorage', e);
    }
    return { ok: true, mensaje: 'Límite actualizado', limite: sanitized };
  };

  // Sincronizar en localStorage por clave aislada de usuario
  useEffect(() => {
    if (!currentUser) return;
    try {
      const key = getUserStorageKey(currentUser);
      localStorage.setItem(key, JSON.stringify(eventos));
    } catch (e) {
      console.warn('Error writing to localStorage', e);
    }
  }, [eventos, currentUser?.uuid, currentUser?.id]);

  // Carga inicial y sincronización en tiempo real desde Supabase aislada por usuario
  useEffect(() => {
    if (!currentUser) {
      setEventos([]);
      setIsLoadingPlanning(false);
      return;
    }

    setIsLoadingPlanning(true);
    const key = getUserStorageKey(currentUser);
    const local = localStorage.getItem(key);
    const isJuanEstebanDemo =
      currentUser?.uuid === '00260f2c-7cfb-411d-be11-61e1e2099d3e' &&
      currentUser?.email?.toLowerCase() === 'juanesteban@valle.co';

    if (local) {
      try {
        setEventos(JSON.parse(local));
      } catch (e) {
        console.warn('Error parseando eventos locales del usuario:', e);
      }
    } else if (isJuanEstebanDemo) {
      setEventos(EVENTOS_INICIALES);
    } else {
      setEventos([]);
    }

    // Ocultar spinner tras inicialización
    const loadTimer = setTimeout(() => {
      setIsLoadingPlanning(false);
    }, 350);

    async function cargarDesdeSupabase() {
      try {
        const isAdmin = currentUser?.email?.toLowerCase() === 'admin@eventify.com' || currentUser?.usuario === 'admin';
        const validAdminId = '7dc9f160-a901-43a3-8a9f-21eb6050bf66';
        const userUuid = isAdmin ? validAdminId : (currentUser.uuid || currentUser.id);

        let query = supabase.from('events').select('*');
        if (isAdmin) {
          query = query.or(`user_id.eq.${validAdminId},user_id.eq.081a73fd-b700-4540-95b9-837825293f88,user_id.eq.e05f7c64-90b3-4d33-ca53-413199142ea4`);
        } else if (isJuanEstebanDemo) {
          query = query.or(`user_id.eq.${userUuid},user_id.is.null`);
        } else {
          query = query.eq('user_id', userUuid);
        }

        let { data: dbEvents, error: errEvt } = await query;
        const { data: dbSubtasks } = await supabase.from('subtasks').select('*');

        // Auto-sincronización de eventos locales hacia Supabase (sube automáticamente eventos creados localmente que hayan fallado)
        if (local) {
          try {
            const localEvents = JSON.parse(local);
            const dbEventIds = new Set((dbEvents || []).map((e) => e.id));
            const eventosFaltantes = localEvents.filter((le) => le && le.id && !dbEventIds.has(le.id));
            if (eventosFaltantes.length > 0) {
              for (const missing of eventosFaltantes) {
                const targetUserId = isAdmin ? validAdminId : userUuid;
                const insertRes = await supabase.from('events').insert({
                  id: missing.id,
                  user_id: targetUserId,
                  nombre: missing.nombre,
                  tipo: missing.tipo || 'General',
                  fecha: missing.fecha,
                  lugar: missing.lugar || '',
                  asistentes: Number(missing.asistentes) || 0,
                  descripcion: missing.descripcion || '',
                  has_critical_error: !!missing.hasCriticalError,
                });
                if (!insertRes.error && Array.isArray(missing.subtareas) && missing.subtareas.length > 0) {
                  const subsToInsert = missing.subtareas.map((s) => ({
                    id: s.id,
                    event_id: missing.id,
                    titulo: s.titulo,
                    horas_estimadas: Number(s.horasEstimadas) || 1,
                    fecha_limite: s.fechaLimite || '',
                    estado: s.estado || 'Pendiente',
                    nota: s.nota || '',
                    responsable: s.responsable || '',
                    is_catering: !!s.isCatering,
                    is_critical: !!s.isCritical,
                  }));
                  await supabase.from('subtasks').insert(subsToInsert);
                }
              }
              const { data: refreshed } = await query;
              if (refreshed) dbEvents = refreshed;
            }
          } catch (syncEx) {
            console.warn('Auto-sync hacia Supabase:', syncEx);
          }
        }

        if (!errEvt && dbEvents) {
          if (dbEvents.length > 0) {
            setEventos((prev) => {
              const prevMap = new Map(prev.map((e) => [e.id, e]));

              return dbEvents.map((evt) => {
                const existing = prevMap.get(evt.id) || {};
                const subs = (dbSubtasks || [])
                  .filter((s) => s.event_id === evt.id)
                  .map((s) => ({
                    id: s.id,
                    titulo: s.titulo,
                    horasEstimadas: s.horas_estimadas,
                    fechaLimite: s.fecha_limite,
                    estado: s.estado,
                    nota: s.nota || '',
                    responsable: s.responsable,
                    isCatering: s.is_catering,
                    isCritical: s.is_critical,
                  }));

                return {
                  id: evt.id,
                  userId: evt.user_id,
                  user_id: evt.user_id,
                  nombre: evt.nombre,
                  tipo: evt.tipo,
                  fecha: evt.fecha,
                  // Preservar lugar y asistentes si existen en Supabase o en el estado local previo
                  lugar: evt.lugar !== undefined && evt.lugar !== null && evt.lugar !== ''
                    ? evt.lugar
                    : (existing.lugar || ''),
                  asistentes: evt.asistentes !== undefined && evt.asistentes !== null && evt.asistentes !== ''
                    ? evt.asistentes
                    : (existing.asistentes !== undefined && existing.asistentes !== '' ? existing.asistentes : ''),
                  descripcion: evt.descripcion || '',
                  hasCriticalError: evt.has_critical_error,
                  subtareas: subs.length > 0 ? subs : (existing.subtareas || []),
                };
              });
            });
          } else if (!isJuanEstebanDemo && !local) {
            // Usuario con cuenta limpia sin eventos: asegurar estado vacío
            setEventos([]);
          }
        }
      } catch (err) {
        console.warn('Aviso: modo offline/fallback para Supabase:', err);
      }
    }
    cargarDesdeSupabase();

    // Sincronización en tiempo real vía websockets de Supabase para actualización instantánea multidispositivo
    const channel = supabase
      .channel('realtime-events-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        cargarDesdeSupabase();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => {
        cargarDesdeSupabase();
      })
      .subscribe();

    return () => {
      clearTimeout(loadTimer);
      supabase.removeChannel(channel);
    };
  }, [currentUser?.uuid, currentUser?.id, currentUser?.email]);

  // Cálculo de progreso de un evento (porcentaje exacto 0 - 100 como número entero sin decimales)
  const calcularProgreso = (evento) => {
    if (!evento || !evento.subtareas || evento.subtareas.length === 0) return 0;
    const completadas = evento.subtareas.filter((s) => s.estado === 'Hecha').length;
    const total = evento.subtareas.length;
    if (total === 0) return 0;
    return Math.round((completadas / total) * 100);
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
    const isAdmin = currentUser?.email?.toLowerCase() === 'admin@eventify.com' || currentUser?.usuario === 'admin';
    const validAdminId = '7dc9f160-a901-43a3-8a9f-21eb6050bf66';
    const userUuid = isAdmin ? validAdminId : (currentUser?.uuid || currentUser?.id || validAdminId);

    const eventoCompleto = {
      id,
      userId: userUuid,
      user_id: userUuid,
      nombre: nuevoEvento.nombre,
      tipo: nuevoEvento.tipo || 'General',
      fecha: nuevoEvento.fecha,
      lugar: nuevoEvento.lugar || '',
      asistentes: nuevoEvento.asistentes !== undefined && nuevoEvento.asistentes !== '' ? nuevoEvento.asistentes : '',
      descripcion: nuevoEvento.descripcion || '',
      hasCriticalError: false,
      subtareas: Array.isArray(nuevoEvento.subtareas) ? nuevoEvento.subtareas : [],
    };
    setEventos((prev) => [eventoCompleto, ...prev]);

    // Persistencia asíncrona en Supabase (US-47)
    (async () => {
      try {
        const payloadConColumnas = {
          id: eventoCompleto.id,
          user_id: userUuid,
          nombre: eventoCompleto.nombre,
          tipo: eventoCompleto.tipo,
          fecha: eventoCompleto.fecha,
          lugar: eventoCompleto.lugar,
          asistentes: Number(eventoCompleto.asistentes) || 0,
          descripcion: eventoCompleto.descripcion,
          has_critical_error: eventoCompleto.hasCriticalError,
        };

        let insertRes = await supabase.from('events').insert(payloadConColumnas);
        if (insertRes.error) {
          console.warn('Aviso insert Supabase:', insertRes.error);
          if (insertRes.error.code === '23503') {
            insertRes = await supabase.from('events').insert({
              ...payloadConColumnas,
              user_id: validAdminId,
            });
          }
          if (insertRes.error) {
            // Si las columnas nuevas aún no existen en la BD, insertar con los campos base
            await supabase.from('events').insert({
              id: eventoCompleto.id,
              user_id: validAdminId,
              nombre: eventoCompleto.nombre,
              tipo: eventoCompleto.tipo,
              fecha: eventoCompleto.fecha,
              descripcion: eventoCompleto.descripcion,
              has_critical_error: eventoCompleto.hasCriticalError,
            });
          }
        }

        if (eventoCompleto.subtareas && eventoCompleto.subtareas.length > 0) {
          const subsToInsert = eventoCompleto.subtareas.map((s) => ({
            id: s.id,
            event_id: eventoCompleto.id,
            titulo: s.titulo,
            horas_estimadas: Number(s.horasEstimadas) || 1,
            fecha_limite: s.fechaLimite || '',
            estado: s.estado || 'Pendiente',
            nota: s.nota || '',
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

    // Separar subtareas de los campos de la tabla events para no generar error PGRST204
    const { subtareas, ...camposEvento } = datosActualizados;

    (async () => {
      try {
        // Intentar actualizar en Supabase
        const { error } = await supabase.from('events').update(camposEvento).eq('id', id);
        if (error) {
          // Si falló por columnas no creadas, actualizar los campos base
          const safePayload = {
            nombre: camposEvento.nombre,
            tipo: camposEvento.tipo,
            fecha: camposEvento.fecha,
            descripcion: camposEvento.descripcion,
          };
          await supabase.from('events').update(safePayload).eq('id', id);
        }

        // Si hay subtareas, sincronizarlas en la tabla subtasks
        if (Array.isArray(subtareas)) {
          for (const sub of subtareas) {
            await supabase.from('subtasks').upsert({
              id: sub.id,
              event_id: id,
              titulo: sub.titulo,
              horas_estimadas: Number(sub.horasEstimadas) || 1,
              fecha_limite: sub.fechaLimite || '',
              estado: sub.estado || 'Pendiente',
              responsable: sub.responsable || '',
            });
          }
        }
      } catch (err) {
        console.warn('Error actualizando evento en Supabase:', err);
      }
    })();
  };

  // Eliminar un evento (Decisión 4)
  const eliminarEvento = (id) => {
    setEventos((prev) => prev.filter((evt) => evt.id !== id));
    supabase.from('events').delete().eq('id', id).then(() => {});
  };

  // Marcar subtarea como hecha / pendiente (C1 / US-16 / US-18)
  const marcarSubtareaHecha = (eventoId, subtareaId, nota = null) => {
    let nuevoEstado = 'Hecha';
    let notaAsignada = nota;
    setEventos((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventoId) return evt;
        return {
          ...evt,
          subtareas: evt.subtareas.map((sub) => {
            if (sub.id === subtareaId) {
              nuevoEstado = sub.estado === 'Hecha' ? 'Pendiente' : 'Hecha';
              if (notaAsignada === null) {
                notaAsignada = sub.nota || '';
              }
              return { ...sub, estado: nuevoEstado, nota: notaAsignada };
            }
            return sub;
          }),
        };
      })
    );

    (async () => {
      try {
        const updatePayload = { estado: nuevoEstado };
        if (notaAsignada !== null && notaAsignada !== undefined) {
          updatePayload.nota = notaAsignada;
        }
        const { error } = await supabase.from('subtasks').update(updatePayload).eq('id', subtareaId);
        if (error) {
          await supabase.from('subtasks').update({ estado: nuevoEstado }).eq('id', subtareaId);
        }
      } catch (err) {
        console.warn('Error en Supabase marcarSubtareaHecha:', err);
      }

      try {
        await api.changeSubtaskStatus(subtareaId, {
          estado: nuevoEstado,
          nota: notaAsignada,
        });
      } catch (err) {
        console.warn('Error en api.changeSubtaskStatus:', err);
      }
    })();
  };

  // Posponer subtarea (C1 / US-17 / US-18)
  const posponerSubtarea = async (eventoId, subtareaId, nuevaFecha = null, nota = undefined) => {
    let fechaFinal = null;
    let notaFinal = null;

    setEventos((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventoId) return evt;
        return {
          ...evt,
          subtareas: evt.subtareas.map((sub) => {
            if (sub.id === subtareaId) {
              fechaFinal = (nuevaFecha !== null && nuevaFecha !== undefined) ? nuevaFecha : sub.fechaLimite;
              if (nota === undefined) {
                notaFinal = sub.nota || '';
              } else if (nota === null) {
                notaFinal = '';
              } else {
                notaFinal = String(nota).trim();
              }
              return {
                ...sub,
                fechaLimite: fechaFinal,
                estado: 'POSTERGADA',
                nota: notaFinal,
              };
            }
            return sub;
          }),
        };
      })
    );

    const updatePayload = {
      estado: 'POSTERGADA',
      ...(fechaFinal ? { fecha_limite: fechaFinal } : {}),
      nota: notaFinal ?? '',
    };

    try {
      const { error } = await supabase.from('subtasks').update(updatePayload).eq('id', subtareaId);
      if (error) {
        await supabase.from('subtasks').update({
          estado: 'POSTERGADA',
          ...(fechaFinal ? { fecha_limite: fechaFinal } : {}),
        }).eq('id', subtareaId);
      }
    } catch (err) {
      console.warn('Error en Supabase posponerSubtarea:', err);
    }

    try {
      const res = await api.changeSubtaskStatus(subtareaId, {
        estado: 'POSTERGADA',
        ...(fechaFinal ? { fechaLimite: fechaFinal } : {}),
        nota: notaFinal,
      });
      return { ok: true, data: res?.data || res };
    } catch (err) {
      console.warn('Error en api.changeSubtaskStatus (posponer):', err);
      if (err.status === 409 || err.error === 'overload_conflict' || err.data?.error === 'overload_conflict') {
        throw err;
      }
      return { ok: true, fallback: true };
    }
  };

  // Reprogramar subtarea (Sprint 3: Actualiza fecha y estado automáticamente a 'POSTERGADA')
  const reprogramarSubtarea = async (eventoId, subtareaId, nuevaFecha, nuevasHoras = null) => {
    setEventos((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventoId) return evt;
        return {
          ...evt,
          subtareas: evt.subtareas.map((sub) => {
            if (sub.id === subtareaId) {
              const updated = {
                ...sub,
                fechaLimite: nuevaFecha,
                estado: 'POSTERGADA',
              };
              if (nuevasHoras !== null && nuevasHoras !== undefined) {
                updated.horasEstimadas = Number(nuevasHoras);
              }
              return updated;
            }
            return sub;
          }),
        };
      })
    );
    const payload = { fecha_limite: nuevaFecha, estado: 'POSTERGADA' };
    if (nuevasHoras !== null && nuevasHoras !== undefined) {
      payload.horas_estimadas = Number(nuevasHoras);
    }
    try {
      supabase.from('subtasks').update(payload).eq('id', subtareaId).then(() => {});
    } catch {}

    try {
      await api.updateSubtask(subtareaId, {
        fechaLimite: nuevaFecha,
        horasEstimadas: nuevasHoras !== null && nuevasHoras !== undefined ? Number(nuevasHoras) : undefined,
        estado: 'POSTERGADA',
      });
    } catch (e) {
      if (e.status === 409 || e.error === 'overload_conflict' || e.data?.error === 'overload_conflict') {
        throw e;
      }
      // offline fallback para errores de red genéricos
    }
  };

  // Actualizar horas de subtarea (Sprint 3: Modal Reducir Horas)
  const actualizarHorasSubtarea = async (eventoId, subtareaId, nuevasHoras) => {
    const horasNum = Number(nuevasHoras);
    setEventos((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventoId) return evt;
        return {
          ...evt,
          subtareas: evt.subtareas.map((sub) =>
            sub.id === subtareaId
              ? { ...sub, horasEstimadas: horasNum }
              : sub
          ),
        };
      })
    );
    try {
      supabase.from('subtasks').update({ horas_estimadas: horasNum }).eq('id', subtareaId).then(() => {});
    } catch {}

    try {
      await api.updateSubtask(subtareaId, { horasEstimadas: horasNum });
    } catch (e) {
      if (e.status === 409 || e.error === 'overload_conflict' || e.data?.error === 'overload_conflict') {
        throw e;
      }
      // offline fallback
    }
  };

  // Helper para sumar horas asignadas a una jornada específica (con opción de excluir una subtarea)
  const obtenerHorasAsignadasAFecha = (fecha, excludeSubtaskId = null) => {
    const targetNorm = normalizarJornada(fecha);
    const today = hoyIso();
    const isTargetToday = targetNorm === today;
    let total = 0;
    (eventos || []).forEach((evt) => {
      (evt.subtareas || []).forEach((s) => {
        if (s.id === excludeSubtaskId) return;
        if (s.estado === 'Hecha') return;
        // Si la jornada es hoy, las tareas pospuestas se restan de la carga urgente del día
        if (isTargetToday && (s.estado === 'POSTERGADA' || s.estado === 'Pospuesta')) {
          return;
        }
        if (normalizarJornada(s.fechaLimite) === targetNorm) {
          total += Number(s.horasEstimadas) || 0;
        }
      });
    });
    return Math.round(total * 10) / 10;
  };

  // Carga horaria urgente del día en curso (recalculada reactivamente para C3: Consistencia con /hoy)
  // Resta subtareas completadas ('Hecha') y pospuestas ('POSTERGADA'/'Pospuesta')
  const calcularHorasUrgentesHoy = () => {
    const today = hoyIso();
    let total = 0;
    (eventos || []).forEach((evt) => {
      (evt.subtareas || []).forEach((s) => {
        const isDone = s.estado === 'Hecha';
        const isPostponed = s.estado === 'POSTERGADA' || s.estado === 'Pospuesta';
        const norm = normalizarJornada(s.fechaLimite);
        const esParaHoy = norm === today || s.fechaLimite === 'Hoy';
        if (!isDone && !isPostponed && esParaHoy) {
          total += Number(s.horasEstimadas) || 0;
        }
      });
    });
    return Math.round(total * 10) / 10;
  };

  const horasUrgentesHoy = calcularHorasUrgentesHoy();

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
        // Sprint 3 y C3: Gestión de Capacidad, Horas Urgentes y Consistencia con /hoy
        limiteDiario,
        setLimiteDiario,
        cambiarLimiteDiario,
        reprogramarSubtarea,
        actualizarHorasSubtarea,
        obtenerHorasAsignadasAFecha,
        horasUrgentesHoy,
        calcularHorasUrgentesHoy,
        isLoadingPlanning,
        setIsLoadingPlanning,
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
