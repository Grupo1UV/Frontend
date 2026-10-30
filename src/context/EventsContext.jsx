import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { normalizarJornada, hoyIso, isoToDisplayDate } from '../utils/validacionesHoras';
import { api } from '../services/api';

const EventsContext = createContext(null);

const EVENTOS_INICIALES = [];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (val) => typeof val === 'string' && UUID_REGEX.test(val.trim());

export const cleanRoleString = (rolStr) =>
  typeof rolStr === 'string' ? rolStr.replace(/::limit=[\d.]+$/i, '').trim() : (rolStr || 'Organizador Independiente');

export const extractLimitFromRole = (rolStr) => {
  if (typeof rolStr !== 'string') return null;
  const m = rolStr.match(/::limit=([\d.]+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 && n <= 16 ? n : null;
};

export const encodeRoleWithLimit = (rolStr, limitVal) => {
  const base = cleanRoleString(rolStr) || 'Organizador Independiente';
  if (limitVal === undefined || limitVal === null) return base;
  return `${base}::limit=${limitVal}`;
};

// Extrae el userUuid codificado en IDs de eventos con formato "evt-<userUuid>--<timestamp>"
const extractOwnerFromEventId = (eventId) => {
  if (typeof eventId !== 'string') return null;
  const match = eventId.match(/^evt-(.+)--\d+$/);
  return match ? match[1] : null;
};

// Helper para clave de aislamiento en localStorage por usuario
const getUserStorageKey = (user) => {
  if (user?.uuid) return `eventify_events_${user.uuid}`;
  if (user?.id) return `eventify_events_${user.id}`;
  return 'eventify_events_guest';
};

const getUserLimitStorageKey = (user) => {
  const id = user?.uuid || user?.id;
  return id ? `eventify_limite_diario_${id}` : null;
};

const NOTES_STORAGE_KEY = 'eventify_subtask_notes_v1';
const getStoredNotesMap = () => {
  try {
    return JSON.parse(localStorage.getItem(NOTES_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

const saveStoredNote = (subtaskId, nota) => {
  if (!subtaskId) return;
  try {
    const map = getStoredNotesMap();
    if (nota === null || nota === '') {
      delete map[subtaskId];
    } else if (nota !== undefined) {
      map[subtaskId] = nota;
    }
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(map));
  } catch {}
};

const readUserEventsFromStorage = (user) => {
  if (!user) return [];
  try {
    const key = getUserStorageKey(user);
    let stored = localStorage.getItem(key);
    if (!stored && (user?.email?.toLowerCase() === 'admin@eventify.com' || user?.usuario === 'admin')) {
      const legacyAdmin = localStorage.getItem('eventify_events_e05f7c64-90b3-4d33-ca53-413199142ea4');
      if (legacyAdmin) {
        stored = legacyAdmin;
        localStorage.setItem(key, legacyAdmin);
      }
    }
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
    const isJuanEstebanDemo =
      user?.uuid === '00260f2c-7cfb-411d-be11-61e1e2099d3e' &&
      user?.email?.toLowerCase() === 'juanesteban@valle.co';
    if (isJuanEstebanDemo) {
      return EVENTOS_INICIALES;
    }
  } catch (e) {
    console.warn('Error reading from localStorage', e);
  }
  return [];
};

const readUserLimitFromStorage = (user) => {
  if (!user) return 6;
  try {
    const limitKey = getUserLimitStorageKey(user);
    const stored = limitKey ? localStorage.getItem(limitKey) : null;
    const roleLimit = extractLimitFromRole(user.rol);
    const val = Number(user.limite_horas_dia ?? roleLimit ?? stored ?? user.limiteDiario);
    if (Number.isFinite(val) && val >= 1 && val <= 16) {
      return val;
    }
  } catch (e) {
    console.warn('Error leyendo límite diario', e);
  }
  return 6;
};

// Persiste el límite diario de un usuario en la tabla app_users de Supabase (con respaldo en columna rol si limite_horas_dia no existe)
async function persistUserLimitInSupabase(user, sanitizedLimit) {
  if (!user) return false;
  try {
    const userId = user.uuid || user.id;
    const cleanEmail = user.email ? String(user.email).trim().toLowerCase() : '';
    const cleanUsuario = user.usuario ? String(user.usuario).trim().toLowerCase() : '';

    // 1. Buscar la fila del usuario en app_users por id, email o usuario
    let targetRow = null;
    if (userId) {
      const { data: byId } = await supabase.from('app_users').select('*').eq('id', userId).limit(1);
      if (byId && byId.length > 0) targetRow = byId[0];
    }
    if (!targetRow && (cleanEmail || cleanUsuario)) {
      const filterParts = [];
      if (cleanEmail) filterParts.push(`email.ilike.${cleanEmail}`);
      if (cleanUsuario) filterParts.push(`usuario.ilike.${cleanUsuario}`);
      const { data: byLogin } = await supabase
        .from('app_users')
        .select('*')
        .or(filterParts.join(','))
        .limit(1);
      if (byLogin && byLogin.length > 0) targetRow = byLogin[0];
    }

    if (targetRow) {
      const { error: colErr } = await supabase
        .from('app_users')
        .update({ limite_horas_dia: sanitizedLimit })
        .eq('id', targetRow.id);

      if (colErr) {
        const encodedRol = encodeRoleWithLimit(targetRow.rol || user.rol, sanitizedLimit);
        const { error: rolErr } = await supabase
          .from('app_users')
          .update({ rol: encodedRol })
          .eq('id', targetRow.id);
        return !rolErr;
      }
      return true;
    } else if (userId && cleanEmail) {
      // Si el usuario aún no tenía fila en app_users, crearla para garantizar persistencia en BD
      const encodedRol = encodeRoleWithLimit(user.rol, sanitizedLimit);
      const newRow = {
        id: userId,
        nombre: user.nombre || cleanUsuario || 'Organizador',
        usuario: cleanUsuario || cleanEmail.split('@')[0],
        email: cleanEmail,
        password: 'Eventify2026*',
        rol: encodedRol,
      };
      const { error: insErr } = await supabase.from('app_users').insert(newRow);
      return !insErr;
    }
  } catch (err) {
    console.warn('Error persistiendo límite diario en Supabase:', err);
  }
  return false;
}

// Recupera el límite diario de un usuario desde app_users en Supabase
async function fetchUserLimitFromSupabase(user) {
  if (!user) return null;
  try {
    const userId = user.uuid || user.id;
    const cleanEmail = user.email ? String(user.email).trim().toLowerCase() : '';
    const cleanUsuario = user.usuario ? String(user.usuario).trim().toLowerCase() : '';

    let targetRow = null;
    if (userId) {
      const { data: byId } = await supabase.from('app_users').select('*').eq('id', userId).limit(1);
      if (byId && byId.length > 0) targetRow = byId[0];
    }
    if (!targetRow && (cleanEmail || cleanUsuario)) {
      const filterParts = [];
      if (cleanEmail) filterParts.push(`email.ilike.${cleanEmail}`);
      if (cleanUsuario) filterParts.push(`usuario.ilike.${cleanUsuario}`);
      const { data: byLogin } = await supabase
        .from('app_users')
        .select('*')
        .or(filterParts.join(','))
        .limit(1);
      if (byLogin && byLogin.length > 0) targetRow = byLogin[0];
    }

    if (targetRow) {
      const directLim = Number(targetRow.limite_horas_dia);
      if (Number.isFinite(directLim) && directLim >= 1 && directLim <= 16) {
        return directLim;
      }
      const roleLim = extractLimitFromRole(targetRow.rol);
      if (roleLim !== null) {
        return roleLim;
      }
    }
  } catch {}
  return null;
}

// Inserta subtareas en Supabase con respaldo automático si la columna 'nota' no existe en el esquema remoto
async function insertSubtasksResilient(subsToInsert) {
  if (!Array.isArray(subsToInsert) || subsToInsert.length === 0) return;
  subsToInsert.forEach((s) => {
    if (s.nota) saveStoredNote(s.id, s.nota);
  });
  const res = await supabase.from('subtasks').insert(subsToInsert);
  if (res.error) {
    const withoutNota = subsToInsert.map(({ nota, ...rest }) => rest);
    await supabase.from('subtasks').insert(withoutNota);
  }
}

// Inserta un evento en Supabase evitando reasignarlo al admin cuando ocurre error 23503 (FK auth.users)
async function insertEventResilient(eventoPayload, isAdmin, validAdminId) {
  const targetUserId = isAdmin
    ? validAdminId
    : (isValidUuid(eventoPayload.user_id) ? eventoPayload.user_id : null);

  const payload = { ...eventoPayload, user_id: targetUserId };
  let insertRes = await supabase.from('events').insert(payload);

  if (insertRes.error) {
    // Si el UUID del usuario en app_users no existe en auth.users (23503), insertar con user_id: null
    // conservando el ID del evento codificado con el UUID del propietario ("evt-<userUuid>--<timestamp>")
    if (insertRes.error.code === '23503') {
      insertRes = await supabase.from('events').insert({
        ...payload,
        user_id: isAdmin ? validAdminId : null,
      });
    }
    if (insertRes.error) {
      const basePayload = {
        id: payload.id,
        user_id: isAdmin ? validAdminId : null,
        nombre: payload.nombre,
        tipo: payload.tipo,
        fecha: payload.fecha,
        descripcion: payload.descripcion,
        has_critical_error: payload.has_critical_error,
      };
      insertRes = await supabase.from('events').insert(basePayload);
    }
  }
  return insertRes;
}

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

  const [eventos, setEventos] = useState(() => readUserEventsFromStorage(currentUser));
  const loadedUserKeyRef = useRef(currentUser ? getUserStorageKey(currentUser) : null);
  const deletedEventIdsRef = useRef(new Set());
  const deletedSubtaskIdsRef = useRef(new Set());

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

  // Estados de control para la Decisión 3 (Manejo de Errores de Carga)
  const [hasGlobalError, setHasGlobalError] = useState(false);
  const [hasCateringModuleError, setHasCateringModuleError] = useState(false);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [isLoadingCatering, setIsLoadingCatering] = useState(false);
  // Sprint 3: Módulo 4 - Estado Cargando (Loading State) para planificación
  const [isLoadingPlanning, setIsLoadingPlanning] = useState(true);

  // Límite diario de capacidad en horas (Sprint 3: 6 horas por defecto, rango 1-16)
  const [limiteDiario, setLimiteDiario] = useState(() => readUserLimitFromStorage(currentUser));
  // Confirmación visual global al actualizar el límite diario
  const [notificacionLimite, setNotificacionLimite] = useState(null);
  const limitToastTimerRef = useRef(null);

  const login = (email, password, rememberMe = true, customUserData = null) => {
    const activeToken = customUserData?.token || JWT_TOKEN_STANDALONE;
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const isAdminUser = cleanEmail === 'admin@eventify.com' || customUserData?.usuario === 'admin';
    const resolvedId = isAdminUser
      ? '7dc9f160-a901-43a3-8a9f-21eb6050bf66'
      : (customUserData?.uuid || customUserData?.id);
    const fallbackId = (cleanEmail === 'juanesteban@valle.co')
      ? '00260f2c-7cfb-411d-be11-61e1e2099d3e'
      : (cleanEmail ? `usr-${cleanEmail.replace(/[^a-z0-9]/g, '-')}` : 'usr-invitado');

    const effectiveId = resolvedId || fallbackId;
    const userLimit = readUserLimitFromStorage({ ...customUserData, id: effectiveId, uuid: effectiveId });
    const cleanedRol = cleanRoleString(customUserData?.rol) || 'Organizador Independiente';

    const user = {
      id: effectiveId,
      uuid: effectiveId,
      usuario: customUserData?.usuario || (cleanEmail ? cleanEmail.split('@')[0] : 'organizador'),
      nombre: customUserData?.nombre || (email ? email.split('@')[0] : 'Organizador'),
      email: email || 'organizador@valle.co',
      rol: cleanedRol,
      limiteDiario: userLimit,
      token: activeToken,
      isLoggedIn: true,
    };

    // Cargar de inmediato los datos del usuario antes de actualizar currentUser
    // para evitar que el efecto de guardado sobrescriba su localStorage con []
    const userStorageKey = getUserStorageKey(user);
    const storedUserEvents = readUserEventsFromStorage(user);
    loadedUserKeyRef.current = userStorageKey;
    setEventos(storedUserEvents);
    setLimiteDiario(userLimit);
    setCurrentUser(user);

    // Claves visibles directamente en DevTools -> Application -> Local Storage
    const limitKey = getUserLimitStorageKey(user);
    if (limitKey) {
      localStorage.setItem(limitKey, String(userLimit));
    }
    localStorage.setItem('access_token', activeToken);
    localStorage.setItem('token', activeToken);
    localStorage.setItem('auth_token', activeToken);
    localStorage.setItem('eventify_user_auth_v1', JSON.stringify(user));
    return { ok: true, user };
  };

  const logout = () => {
    // Desvincular la referencia del usuario antes de limpiar el estado en memoria
    // para garantizar que su clave en localStorage quede intacta
    loadedUserKeyRef.current = null;
    setCurrentUser(null);
    setEventos([]);
    setLimiteDiario(6);
    setNotificacionLimite(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('eventify_user_auth_v1');
  };

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

    let savedInDb = false;
    try {
      const userKey = currentUser?.uuid || currentUser?.id;
      if (userKey) {
        localStorage.setItem(`eventify_limite_diario_${userKey}`, String(sanitized));
      }
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          rol: cleanRoleString(currentUser.rol),
          limiteDiario: sanitized,
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('eventify_user_auth_v1', JSON.stringify(updatedUser));

        try {
          const regUsers = JSON.parse(localStorage.getItem('eventify_registered_users') || '[]');
          if (Array.isArray(regUsers) && regUsers.length > 0) {
            const updatedReg = regUsers.map((u) => {
              const sameId = userKey && (u.id === userKey || u.uuid === userKey);
              const sameEmail =
                currentUser.email && u.email?.toLowerCase() === currentUser.email.toLowerCase();
              if (sameId || sameEmail) {
                return { ...u, limiteDiario: sanitized, limite_horas_dia: sanitized };
              }
              return u;
            });
            localStorage.setItem('eventify_registered_users', JSON.stringify(updatedReg));
          }
        } catch {}

        savedInDb = await persistUserLimitInSupabase(updatedUser, sanitized);
      }
      api.updateCapacity(sanitized).catch(() => {});
    } catch (e) {
      console.warn('Error guardando límite diario', e);
    }

    if (limitToastTimerRef.current) {
      clearTimeout(limitToastTimerRef.current);
    }
    setNotificacionLimite({
      id: Date.now(),
      limite: sanitized,
      savedInDb,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
    });
    limitToastTimerRef.current = setTimeout(() => {
      setNotificacionLimite(null);
    }, 8000);

    return { ok: true, mensaje: 'Límite actualizado', limite: sanitized, savedInDb };
  };

  // Carga inicial y sincronización en tiempo real desde Supabase aislada por usuario
  // (Se declara ANTES del efecto de escritura en localStorage para evitar sobrescrituras al iniciar sesión)
  useEffect(() => {
    if (!currentUser) {
      loadedUserKeyRef.current = null;
      setEventos([]);
      setIsLoadingPlanning(false);
      return;
    }

    setIsLoadingPlanning(true);
    const key = getUserStorageKey(currentUser);
    const initialLocalEvents = readUserEventsFromStorage(currentUser);
    loadedUserKeyRef.current = key;
    setEventos(initialLocalEvents);
    setLimiteDiario(readUserLimitFromStorage(currentUser));

    const isJuanEstebanDemo =
      currentUser?.uuid === '00260f2c-7cfb-411d-be11-61e1e2099d3e' &&
      currentUser?.email?.toLowerCase() === 'juanesteban@valle.co';

    // Ocultar spinner tras inicialización
    const loadTimer = setTimeout(() => {
      setIsLoadingPlanning(false);
    }, 350);

    async function cargarDesdeSupabase() {
      try {
        const isAdmin = currentUser?.email?.toLowerCase() === 'admin@eventify.com' || currentUser?.usuario === 'admin';
        const validAdminId = '7dc9f160-a901-43a3-8a9f-21eb6050bf66';
        const userUuid = isAdmin ? validAdminId : (currentUser.uuid || currentUser.id);

        // Sincronizar límite diario desde app_users en Supabase
        try {
          const remoteLimit = await fetchUserLimitFromSupabase({
            ...currentUser,
            id: userUuid,
            uuid: userUuid,
          });
          if (remoteLimit !== null && Number.isFinite(remoteLimit) && remoteLimit >= 1 && remoteLimit <= 16) {
            setLimiteDiario(remoteLimit);
            if (userUuid) {
              localStorage.setItem(`eventify_limite_diario_${userUuid}`, String(remoteLimit));
            }
          } else {
            // Si en Supabase aún no había un límite guardado, sincronizar el límite local del usuario hacia Supabase
            const localLim = readUserLimitFromStorage({ ...currentUser, id: userUuid, uuid: userUuid });
            if (Number.isFinite(localLim) && localLim >= 1 && localLim <= 16) {
              await persistUserLimitInSupabase({ ...currentUser, id: userUuid, uuid: userUuid }, localLim);
            }
          }
        } catch {}

        const buildEventsQuery = () => {
          const q = supabase.from('events').select('*');
          if (isAdmin) {
            return q.or(
              `user_id.eq.${validAdminId},user_id.eq.081a73fd-b700-4540-95b9-837825293f88,user_id.eq.e05f7c64-90b3-4d33-ca53-413199142ea4,id.like.evt-${validAdminId}--*`
            );
          }
          if (isJuanEstebanDemo) {
            return q.or(
              `user_id.eq.${userUuid},id.like.evt-${userUuid}--*,id.eq.evt-1791414882013-peuj6f7f`
            );
          }
          if (isValidUuid(userUuid)) {
            return q.or(`user_id.eq.${userUuid},id.like.evt-${userUuid}--*`);
          }
          return q.like('id', `evt-${userUuid}--%`);
        };

        let { data: dbEvents, error: errEvt } = await buildEventsQuery();
        let { data: dbSubtasks } = await supabase.from('subtasks').select('*');

        // Auto-sincronización de eventos y subtareas locales hacia Supabase
        const currentLocalStr = localStorage.getItem(key);
        if (currentLocalStr) {
          try {
            const localEvents = JSON.parse(currentLocalStr);
            if (Array.isArray(localEvents) && localEvents.length > 0) {
              const dbEventIds = new Set((dbEvents || []).map((e) => e.id));
              const dbSubtaskIds = new Set((dbSubtasks || []).map((s) => s.id));
              let huboCambiosCloud = false;
              let huboMigracionIds = false;
              const migratedLocalEvents = [];

              for (const le of localEvents) {
                if (!le || !le.id || deletedEventIdsRef.current.has(le.id)) continue;

                // Asegurar que el ID del evento codifique el propietario para que persista aunque user_id sea null por FK 23503
                let effectiveEventId = le.id;
                const ownerInId = extractOwnerFromEventId(le.id);
                if (!dbEventIds.has(le.id) && !ownerInId && !isAdmin && userUuid) {
                  const suffix = String(le.id).replace(/^evt-/, '');
                  effectiveEventId = `evt-${userUuid}--${suffix}`;
                  huboMigracionIds = true;
                }

                const normalizedEvent = {
                  ...le,
                  id: effectiveEventId,
                  userId: userUuid,
                  user_id: userUuid,
                };
                migratedLocalEvents.push(normalizedEvent);

                if (!dbEventIds.has(effectiveEventId) && !dbEventIds.has(le.id)) {
                  const insertRes = await insertEventResilient(
                    {
                      id: effectiveEventId,
                      user_id: userUuid,
                      nombre: le.nombre,
                      tipo: le.tipo || 'General',
                      fecha: le.fecha,
                      lugar: le.lugar || '',
                      asistentes: Number(le.asistentes) || 0,
                      descripcion: le.descripcion || '',
                      has_critical_error: !!le.hasCriticalError,
                    },
                    isAdmin,
                    validAdminId
                  );
                  if (!insertRes.error) {
                    huboCambiosCloud = true;
                    dbEventIds.add(effectiveEventId);
                  }
                }

                // Sincronizar subtareas faltantes de este evento
                if (Array.isArray(le.subtareas) && le.subtareas.length > 0) {
                  const missingSubs = le.subtareas.filter(
                    (s) => s && s.id && !dbSubtaskIds.has(s.id) && !deletedSubtaskIdsRef.current.has(s.id)
                  );
                  if (missingSubs.length > 0) {
                    const subsToInsert = missingSubs.map((s) => ({
                      id: s.id,
                      event_id: effectiveEventId,
                      titulo: s.titulo,
                      horas_estimadas: Number(s.horasEstimadas) || 1,
                      fecha_limite: s.fechaLimite || '',
                      estado: s.estado || 'Pendiente',
                      nota: s.nota || '',
                      responsable: s.responsable || '',
                      is_catering: !!s.isCatering,
                      is_critical: !!s.isCritical,
                    }));
                    await insertSubtasksResilient(subsToInsert);
                    huboCambiosCloud = true;
                  }
                }
              }

              if (huboMigracionIds && loadedUserKeyRef.current === key) {
                localStorage.setItem(key, JSON.stringify(migratedLocalEvents));
                setEventos(migratedLocalEvents);
              }

              if (huboCambiosCloud) {
                const { data: refreshedEvents } = await buildEventsQuery();
                const { data: refreshedSubs } = await supabase.from('subtasks').select('*');
                if (refreshedEvents) dbEvents = refreshedEvents;
                if (refreshedSubs) dbSubtasks = refreshedSubs;
              }
            }
          } catch (syncEx) {
            console.warn('Auto-sync hacia Supabase:', syncEx);
          }
        }

        if (!errEvt && dbEvents) {
          // Filtrar eventos eliminados o que pertenezcan explícitamente a otro usuario por su ID codificado
          const validDbEvents = dbEvents.filter((evt) => {
            if (!evt || deletedEventIdsRef.current.has(evt.id)) return false;
            const ownerFromId = extractOwnerFromEventId(evt.id);
            if (ownerFromId && ownerFromId !== userUuid) return false;
            return true;
          });

          const notesMap = getStoredNotesMap();

          setEventos((prev) => {
            const prevMap = new Map(prev.map((e) => [e.id, e]));

            const mappedFromDb = validDbEvents.map((evt) => {
              const existing = prevMap.get(evt.id) || {};
              const existingSubsMap = new Map((existing.subtareas || []).map((s) => [s.id, s]));

              const subsFromDb = (dbSubtasks || [])
                .filter((s) => s.event_id === evt.id && !deletedSubtaskIdsRef.current.has(s.id))
                .map((s) => {
                  const prevSub = existingSubsMap.get(s.id);
                  const resolvedNota =
                    s.nota !== undefined && s.nota !== null && s.nota !== ''
                      ? s.nota
                      : (prevSub?.nota ?? notesMap[s.id] ?? '');
                  if (resolvedNota) saveStoredNote(s.id, resolvedNota);

                  return {
                    id: s.id,
                    titulo: s.titulo,
                    horasEstimadas: s.horas_estimadas,
                    fechaLimite: s.fecha_limite,
                    estado: s.estado,
                    nota: resolvedNota,
                    responsable: s.responsable,
                    isCatering: s.is_catering,
                    isCritical: s.is_critical,
                  };
                });

              const dbSubIds = new Set(subsFromDb.map((s) => s.id));
              const localOnlySubs = (existing.subtareas || []).filter(
                (s) => s && s.id && !dbSubIds.has(s.id) && !deletedSubtaskIdsRef.current.has(s.id)
              );
              const finalSubs = [...subsFromDb, ...localOnlySubs];

              return {
                id: evt.id,
                userId: evt.user_id || userUuid,
                user_id: evt.user_id || userUuid,
                nombre: evt.nombre,
                tipo: evt.tipo,
                fecha: evt.fecha,
                // Preservar lugar y asistentes si existen en Supabase o en el estado local previo
                lugar:
                  evt.lugar !== undefined && evt.lugar !== null && evt.lugar !== ''
                    ? evt.lugar
                    : (existing.lugar || ''),
                asistentes:
                  evt.asistentes !== undefined && evt.asistentes !== null && evt.asistentes !== ''
                    ? evt.asistentes
                    : (existing.asistentes !== undefined && existing.asistentes !== '' ? existing.asistentes : ''),
                descripcion:
                  evt.descripcion !== undefined && evt.descripcion !== null && evt.descripcion !== ''
                    ? evt.descripcion
                    : (existing.descripcion || ''),
                hasCriticalError:
                  evt.has_critical_error !== undefined && evt.has_critical_error !== null
                    ? evt.has_critical_error
                    : !!existing.hasCriticalError,
                subtareas: finalSubs,
              };
            });

            const dbIds = new Set(mappedFromDb.map((e) => e.id));
            const localOnlyEvents = prev.filter(
              (e) => e && e.id && !dbIds.has(e.id) && !deletedEventIdsRef.current.has(e.id)
            );

            return [...localOnlyEvents, ...mappedFromDb];
          });
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

  // Sincronizar en localStorage por clave aislada de usuario
  // Solo escribe cuando loadedUserKeyRef coincide con la clave del usuario activo
  useEffect(() => {
    if (!currentUser) return;
    const key = getUserStorageKey(currentUser);
    if (loadedUserKeyRef.current !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(eventos));
    } catch (e) {
      console.warn('Error writing to localStorage', e);
    }
  }, [eventos, currentUser?.uuid, currentUser?.id]);

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
    const isAdmin = currentUser?.email?.toLowerCase() === 'admin@eventify.com' || currentUser?.usuario === 'admin';
    const validAdminId = '7dc9f160-a901-43a3-8a9f-21eb6050bf66';
    const userUuid = isAdmin ? validAdminId : (currentUser?.uuid || currentUser?.id || validAdminId);
    const id = `evt-${userUuid}--${Date.now()}`;

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

        await insertEventResilient(payloadConColumnas, isAdmin, validAdminId);

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
          await insertSubtasksResilient(subsToInsert);
        }
      } catch (e) {
        console.warn('Error guardando en Supabase:', e);
      }
    })();

    return id;
  };

  // Actualizar un evento existente (T3 / Reprogramar)
  const actualizarEvento = (id, datosActualizados) => {
    let idsEliminados = [];
    setEventos((prev) =>
      prev.map((evt) => {
        if (evt.id !== id) return evt;
        if (Array.isArray(datosActualizados.subtareas) && Array.isArray(evt.subtareas)) {
          const nuevosIds = new Set(datosActualizados.subtareas.map((s) => s.id));
          idsEliminados = evt.subtareas
            .filter((s) => s && s.id && !nuevosIds.has(s.id))
            .map((s) => s.id);
          idsEliminados.forEach((remId) => deletedSubtaskIdsRef.current.add(remId));
        }
        return { ...evt, ...datosActualizados };
      })
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

        // Eliminar de Supabase las subtareas que se hayan quitado durante la edición
        if (idsEliminados.length > 0) {
          await supabase.from('subtasks').delete().in('id', idsEliminados);
        }

        // Si hay subtareas, sincronizarlas en la tabla subtasks
        if (Array.isArray(subtareas)) {
          for (const sub of subtareas) {
            if (sub.nota !== undefined) {
              saveStoredNote(sub.id, sub.nota);
            }
            const fullSubPayload = {
              id: sub.id,
              event_id: id,
              titulo: sub.titulo,
              horas_estimadas: Number(sub.horasEstimadas) || 1,
              fecha_limite: sub.fechaLimite || '',
              estado: sub.estado || 'Pendiente',
              nota: sub.nota || '',
              responsable: sub.responsable || '',
              is_catering: !!sub.isCatering,
              is_critical: !!sub.isCritical,
            };
            const { error: upErr } = await supabase.from('subtasks').upsert(fullSubPayload);
            if (upErr) {
              const { nota, ...safeSubPayload } = fullSubPayload;
              await supabase.from('subtasks').upsert(safeSubPayload);
            }
          }
        }
      } catch (err) {
        console.warn('Error actualizando evento en Supabase:', err);
      }
    })();
  };

  // Eliminar un evento (Decisión 4)
  const eliminarEvento = (id) => {
    deletedEventIdsRef.current.add(id);
    setEventos((prev) => prev.filter((evt) => evt.id !== id));
    (async () => {
      try {
        await supabase.from('subtasks').delete().eq('event_id', id);
        await supabase.from('events').delete().eq('id', id);
      } catch {}
    })();
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

    if (notaAsignada !== null && notaAsignada !== undefined) {
      saveStoredNote(subtareaId, notaAsignada);
    }

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

    saveStoredNote(subtareaId, notaFinal);

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

  // Reprogramar subtarea (Actualiza fecha sin confundirla con una actividad pospuesta; conserva su estado)
  const reprogramarSubtarea = async (eventoId, subtareaId, nuevaFecha, nuevasHoras = null) => {
    let estadoConservado = 'Pendiente';
    setEventos((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventoId) return evt;
        return {
          ...evt,
          subtareas: evt.subtareas.map((sub) => {
            if (sub.id === subtareaId) {
              estadoConservado = sub.estado === 'Hecha' ? 'Pendiente' : (sub.estado || 'Pendiente');
              const updated = {
                ...sub,
                fechaLimite: nuevaFecha,
                estado: estadoConservado,
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
    const payload = { fecha_limite: nuevaFecha, estado: estadoConservado };
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
        estado: estadoConservado,
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

  // Helper para sumar horas pendientes asignadas a una jornada específica (excluyendo únicamente tareas hechas)
  const obtenerHorasAsignadasAFecha = (fecha, excludeSubtaskId = null) => {
    const targetNorm = normalizarJornada(fecha);
    const today = hoyIso();
    let total = 0;
    (eventos || []).forEach((evt) => {
      (evt.subtareas || []).forEach((s) => {
        if (s.id === excludeSubtaskId) return;
        if (s.estado === 'Hecha') return;
        const subNorm = s.fechaLimite === 'Hoy' ? today : normalizarJornada(s.fechaLimite);
        if (subNorm === targetNorm) {
          total += Number(s.horasEstimadas) || 0;
        }
      });
    });
    return Math.round(total * 10) / 10;
  };

  // Carga horaria de actividades no hechas para el día de hoy (excluye únicamente 'Hecha')
  const calcularHorasUrgentesHoy = () => {
    const today = hoyIso();
    let total = 0;
    (eventos || []).forEach((evt) => {
      (evt.subtareas || []).forEach((s) => {
        if (!s || s.estado === 'Hecha') return;
        const norm = normalizarJornada(s.fechaLimite);
        const esParaHoy = norm === today || s.fechaLimite === 'Hoy';
        if (esParaHoy) {
          total += Number(s.horasEstimadas) || 0;
        }
      });
    });
    return Math.round(total * 10) / 10;
  };

  const horasUrgentesHoy = calcularHorasUrgentesHoy();

  // Resumen integral y reactivo de capacidad diaria, horas planificadas, disponibles y detección de sobrecarga
  const calcularResumenCapacidad = (limiteRef = limiteDiario) => {
    const lim = Number(limiteRef) || 6;
    const today = hoyIso();
    const mapaJornadas = {};
    let totalPendientesGlobal = 0;

    (eventos || []).forEach((evt) => {
      (evt.subtareas || []).forEach((s) => {
        if (!s || s.estado === 'Hecha') return;
        const hrs = Number(s.horasEstimadas) || 0;
        totalPendientesGlobal += hrs;

        const norm = s.fechaLimite === 'Hoy' ? today : normalizarJornada(s.fechaLimite);
        const claveJornada = norm || 'Sin fecha';
        if (!mapaJornadas[claveJornada]) {
          mapaJornadas[claveJornada] = {
            fecha: claveJornada,
            fechaDisplay: claveJornada === today ? 'Hoy' : isoToDisplayDate(claveJornada),
            horasPlanificadas: 0,
            subtareas: [],
          };
        }
        mapaJornadas[claveJornada].horasPlanificadas =
          Math.round((mapaJornadas[claveJornada].horasPlanificadas + hrs) * 10) / 10;
        mapaJornadas[claveJornada].subtareas.push({
          ...s,
          eventoId: evt.id,
          eventoNombre: evt.nombre,
        });
      });
    });

    const listaJornadas = Object.values(mapaJornadas)
      .map((j) => {
        const disponibles = Math.max(0, Math.round((lim - j.horasPlanificadas) * 10) / 10);
        const sobrecarga = j.horasPlanificadas > lim;
        const exceso = sobrecarga ? Math.round((j.horasPlanificadas - lim) * 10) / 10 : 0;
        return {
          ...j,
          limiteDiario: lim,
          horasDisponibles: disponibles,
          haySobrecarga: sobrecarga,
          exceso,
        };
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const jornadasSobrecargadas = listaJornadas.filter((j) => j.haySobrecarga);

    const jornadaMayorCarga =
      listaJornadas.length > 0
        ? [...listaJornadas].sort((a, b) => b.horasPlanificadas - a.horasPlanificadas)[0]
        : null;

    const jornadaMayorSobrecarga =
      jornadasSobrecargadas.length > 0
        ? [...jornadasSobrecargadas].sort((a, b) => b.exceso - a.exceso)[0]
        : null;

    const jornadaHoyObj = listaJornadas.find((j) => j.fecha === today) || {
      fecha: today,
      fechaDisplay: 'Hoy',
      horasPlanificadas: horasUrgentesHoy,
      limiteDiario: lim,
      horasDisponibles: Math.max(0, Math.round((lim - horasUrgentesHoy) * 10) / 10),
      haySobrecarga: horasUrgentesHoy > lim,
      exceso: horasUrgentesHoy > lim ? Math.round((horasUrgentesHoy - lim) * 10) / 10 : 0,
      subtareas: [],
    };

    const horasPlanificadasHoy = jornadaHoyObj.horasPlanificadas;
    const horasDisponiblesHoy = jornadaHoyObj.horasDisponibles;
    const sobrecargaHoy = jornadaHoyObj.haySobrecarga;
    const excesoHoy = jornadaHoyObj.exceso;

    // Selección inteligente de jornada de referencia:
    // 1. Si Hoy tiene sobrecarga -> mostrar Hoy
    // 2. Si otra jornada tiene sobrecarga -> mostrar la jornada con mayor sobrecarga para que los KPIs y la alerta coincidan
    // 3. Si Hoy tiene horas planificadas (> 0) -> mostrar Hoy
    // 4. Si Hoy tiene 0h pero hay otra jornada con actividades -> mostrar la de mayor carga
    let jornadaActiva = jornadaHoyObj;
    if (sobrecargaHoy) {
      jornadaActiva = jornadaHoyObj;
    } else if (jornadaMayorSobrecarga) {
      jornadaActiva = jornadaMayorSobrecarga;
    } else if (horasPlanificadasHoy > 0) {
      jornadaActiva = jornadaHoyObj;
    } else if (jornadaMayorCarga && jornadaMayorCarga.horasPlanificadas > 0) {
      jornadaActiva = jornadaMayorCarga;
    }

    const esHoyActiva = jornadaActiva.fecha === today;
    const horasPlanificadasActivas = jornadaActiva.horasPlanificadas;
    const horasDisponiblesActivas = jornadaActiva.horasDisponibles;
    const etiquetaJornadaActiva = esHoyActiva ? 'Hoy' : `Jornada ${jornadaActiva.fechaDisplay}`;

    const haySobrecarga = sobrecargaHoy || jornadasSobrecargadas.length > 0;
    const excesoActivo = jornadaActiva.haySobrecarga
      ? jornadaActiva.exceso
      : (jornadaMayorSobrecarga ? jornadaMayorSobrecarga.exceso : 0);

    return {
      limiteDiario: lim,
      horasPlanificadasHoy,
      horasDisponiblesHoy,
      sobrecargaHoy,
      excesoHoy,
      horasPlanificadasActivas,
      horasDisponiblesActivas,
      etiquetaJornadaActiva,
      jornadaActiva,
      horasPlanificadasTotales: Math.round(totalPendientesGlobal * 10) / 10,
      haySobrecarga,
      excesoActivo,
      jornadasSobrecargadas,
      listaJornadas,
      jornadaMayorCarga,
    };
  };

  const resumenCapacidad = calcularResumenCapacidad(limiteDiario);

  // Eliminar subtarea logística (Decisión 4)
  const eliminarSubtarea = (eventoId, subtareaId) => {
    deletedSubtaskIdsRef.current.add(subtareaId);
    saveStoredNote(subtareaId, null);
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
    let nuevoValor = false;
    setEventos((prev) =>
      prev.map((evt) => {
        if (evt.id !== eventoId) return evt;
        nuevoValor = !evt.hasCriticalError;
        return { ...evt, hasCriticalError: nuevoValor };
      })
    );
    supabase.from('events').update({ has_critical_error: nuevoValor }).eq('id', eventoId).then(() => {});
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
        resumenCapacidad,
        calcularResumenCapacidad,
        notificacionLimite,
        setNotificacionLimite,
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
