import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import SystemModal from '../components/SystemModal';
import Button from '../components/Button';
import DatePickerField from '../components/DatePickerField';
import ConflictoSobrecargaModal from '../components/ConflictoSobrecargaModal';
import ConfigurarLimiteModal from '../components/ConfigurarLimiteModal';
import {
  hoyIso,
  isoToDisplayDate,
  normalizarJornada,
  parseOverloadError,
} from '../utils/validacionesHoras';

export default function Hoy() {
  const {
    eventos,
    isEmpty,
    obtenerTareasHoy,
    marcarSubtareaHecha,
    posponerSubtarea,
    reprogramarSubtarea,
    actualizarHorasSubtarea,
    obtenerHorasAsignadasAFecha,
    limiteDiario,
    horasUrgentesHoy,
    resumenCapacidad,
    eliminarSubtarea,
    hasGlobalError,
    hasCateringModuleError,
    isLoadingGlobal,
    isLoadingCatering,
    isLoadingPlanning,
    reintentarGlobal,
    recargarModuloCatering,
  } = useEvents();

  const [showLimiteModalHoy, setShowLimiteModalHoy] = useState(false);

  // Estado del modal de confirmación y eliminación
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'eliminar_tarea',
    eventoId: null,
    subtarea: null,
  });

  // Sprint 3: Estados de Modales de Capacidad y Reprogramación
  const [reprogramarState, setReprogramarState] = useState({
    isOpen: false,
    task: null,
    nuevaFecha: '',
    error: '',
  });
  const [conflictoState, setConflictoState] = useState({
    isOpen: false,
    conflictoData: null,
  });
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [notificacionModal, setNotificacionModal] = useState({
    isOpen: false,
    type: '',
    title: '',
    message: '',
    itemName: '',
  });
  const [toastMessage, setToastMessage] = useState('');

  // Estado del popover interactivo "¿Cómo se ordena?" (Regla UI oficial)
  const [showOrderRule, setShowOrderRule] = useState(false);

  // Fecha de referencia actual
  const fechaHoyDate = new Date();
  const todayIso = fechaHoyDate.toISOString().split('T')[0];

  const fechaActualFormateada = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fechaHoyDate);

  // Estados de Filtros de Búsqueda (US-05)
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroDias, setFiltroDias] = useState('todos');

  // Helper para normalizar la fecha límite a string ISO comparable
  const parseFechaLimite = (fechaStr) => {
    if (!fechaStr) return '9999-12-31';
    const norm = normalizarJornada(fechaStr);
    if (/^\d{4}-\d{2}-\d{2}$/.test(norm)) {
      return norm;
    }
    return '9999-12-31';
  };

  // Helper para calcular diferencia de días desde hoy
  const diasDesdeHoy = (fechaStr) => {
    const iso = parseFechaLimite(fechaStr);
    const target = new Date(iso + 'T00:00:00');
    const today = new Date(todayIso + 'T00:00:00');
    const diffTime = target - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1. Obtener todas las subtareas
  const todasLasTareas = obtenerTareasHoy();

  // 2. Filtrado reactivo (US-05)
  const tareasFiltradas = todasLasTareas.filter((t) => {
    // A. Filtro por Evento
    if (filtroEvento !== 'todos' && t.eventoId !== filtroEvento) {
      return false;
    }

    // B. Filtro por Estado
    if (filtroEstado === 'todos') {
      // Por defecto en la vista Hoy se muestran las tareas pendientes / en curso
      if (t.estado === 'Hecha') return false;
    } else if (filtroEstado === 'hecha') {
      if (t.estado !== 'Hecha') return false;
    } else if (filtroEstado === 'pendiente') {
      if (t.estado !== 'Pendiente') return false;
    } else if (filtroEstado === 'pospuesta') {
      const isPospuesta =
        t.estado === 'Pospuesta' ||
        t.estado === 'POSTERGADA' ||
        t.fechaLimite === 'Próxima semana';
      if (!isPospuesta) return false;
    } else if (filtroEstado === 'vencida') {
      const iso = parseFechaLimite(t.fechaLimite);
      if (!(iso < todayIso && t.estado !== 'Hecha')) return false;
    }

    // C. Filtro por rango de días próximos (US-05: Limita "upcoming" a los siguientes N días)
    if (filtroDias !== 'todos') {
      const maxDias = parseInt(filtroDias, 10);
      const diff = diasDesdeHoy(t.fechaLimite);
      if (diff > 0 && diff > maxDias) {
        return false;
      }
    }

    return true;
  });

  const hayFiltrosActivos = filtroEvento !== 'todos' || filtroEstado !== 'todos' || filtroDias !== 'todos';

  const limpiarFiltros = () => {
    setFiltroEvento('todos');
    setFiltroEstado('todos');
    setFiltroDias('todos');
  };

  // Módulo aislado de catering para Decisión 3 (excluye completadas y pospuestas si se muestran pendientes)
  const tareasCatering = tareasFiltradas.filter((t) => {
    const match = t.isCatering || (t.titulo && t.titulo.toLowerCase().includes('catering'));
    if (!match) return false;
    if (filtroEstado === 'todos') {
      const isPostponed = t.estado === 'POSTERGADA' || t.estado === 'Pospuesta';
      if (isPostponed || t.estado === 'Hecha') return false;
    }
    return true;
  });

  // 3. Lógica de Agrupación Temporal y Estados (C3: Consistencia con /hoy)
  // Las tareas 'Hecha' se excluyen de la lista urgente; las pospuestas se reclasifican o retiran de hoy
  const vencidas = tareasFiltradas.filter((t) => {
    if (t.estado === 'Hecha') return false;
    const isPostponed = t.estado === 'POSTERGADA' || t.estado === 'Pospuesta';
    if (isPostponed) return false;
    const iso = parseFechaLimite(t.fechaLimite);
    return iso < todayIso;
  });

  const paraHoy = tareasFiltradas.filter((t) => {
    if (t.estado === 'Hecha') return false;
    const isPostponed = t.estado === 'POSTERGADA' || t.estado === 'Pospuesta';
    if (isPostponed) return false;
    const iso = parseFechaLimite(t.fechaLimite);
    return iso === todayIso || t.fechaLimite === 'Hoy';
  });

  const proximas = tareasFiltradas.filter((t) => {
    if (t.estado === 'Hecha') return false;
    const isPostponed = t.estado === 'POSTERGADA' || t.estado === 'Pospuesta';
    if (isPostponed) return false;
    const iso = parseFechaLimite(t.fechaLimite);
    return iso > todayIso;
  });

  const pospuestas = tareasFiltradas.filter((t) => {
    if (t.estado === 'Hecha') return false;
    const isPostponed = t.estado === 'POSTERGADA' || t.estado === 'Pospuesta';
    return isPostponed;
  });

  const hechas = tareasFiltradas.filter((t) => t.estado === 'Hecha');

  // 4. Ordenamiento Correcto con .sort() cronológico (de más antigua a más lejana)
  const ordenarCronologicamente = (a, b) => {
    const fechaA = parseFechaLimite(a.fechaLimite);
    const fechaB = parseFechaLimite(b.fechaLimite);
    if (fechaA !== fechaB) {
      return fechaA.localeCompare(fechaB);
    }
    return (a.horasEstimadas || 0) - (b.horasEstimadas || 0);
  };

  const vencidasOrdenadas = [...vencidas].sort(ordenarCronologicamente);
  const paraHoyOrdenadas = [...paraHoy].sort(ordenarCronologicamente);
  const pospuestasOrdenadas = [...pospuestas].sort(ordenarCronologicamente);
  const proximasOrdenadas = [...proximas].sort(ordenarCronologicamente);
  const hechasOrdenadas = [...hechas].sort(ordenarCronologicamente);

  // Solicitar eliminación de tarea (Modal de riesgo)
  const handleRequestDeleteTask = (eventoId, task) => {
    setModalState({
      isOpen: true,
      type: 'eliminar_tarea',
      eventoId,
      subtarea: task,
    });
  };

  const handleConfirmModalAction = () => {
    if (modalState.type === 'eliminar_tarea' && modalState.eventoId && modalState.subtarea) {
      eliminarSubtarea(modalState.eventoId, modalState.subtarea.id);
      setModalState({
        isOpen: true,
        type: 'tarea_eliminada',
        eventoId: null,
        subtarea: null,
      });
    } else {
      setModalState({ isOpen: false, type: 'eliminar_tarea', eventoId: null, subtarea: null });
    }
  };

  // Sprint 3: Abrir modal de reprogramación interactiva y ajuste de duración
  const handleAbrirReprogramar = (_eventoId, task) => {
    const isoActual = normalizarJornada(task?.fechaLimite);
    const fechaInicial = isoActual && /^\d{4}-\d{2}-\d{2}$/.test(isoActual) ? isoToDisplayDate(isoActual) : '';
    setReprogramarState({
      isOpen: true,
      task,
      nuevaFecha: fechaInicial,
      nuevasHoras: String(task?.horasEstimadas ?? 1),
      error: '',
    });
  };

  // Abrir directamente el modal de resolución de sobrecarga para una jornada o actividad específica
  const handleAbrirResolucionJornada = (jornada, initialMode = 'menu', initialSubtaskId = null) => {
    if (!jornada) return;
    const subs = Array.isArray(jornada.subtareas) ? jornada.subtareas : [];
    const afectada =
      (initialSubtaskId && subs.find((s) => s.id === initialSubtaskId)) ||
      subs[0] ||
      null;
    setConflictoState({
      isOpen: true,
      conflictoData: {
        fecha: jornada.fecha,
        fechaDisplay: jornada.fechaDisplay || isoToDisplayDate(jornada.fecha),
        horasTotales: jornada.horasPlanificadas,
        limiteDiario: jornada.limiteDiario || limiteDiario,
        subtareas: subs,
        subtareaAfectada: afectada,
        eventoId: afectada?.eventoId,
        initialMode,
        initialSubtaskId: afectada?.id || initialSubtaskId,
      },
    });
  };

  // Sprint 3: Confirmar reprogramación o cambio de duración con validación de sobrecarga
  const handleConfirmarReprogramar = async () => {
    const { task, nuevaFecha, nuevasHoras } = reprogramarState;
    if (!task) return;
    if (!nuevaFecha) {
      setReprogramarState((prev) => ({ ...prev, error: 'Selecciona una fecha válida.' }));
      return;
    }

    const horasNum = nuevasHoras !== undefined && nuevasHoras !== '' ? Number(nuevasHoras) : (Number(task.horasEstimadas) || 1);
    if (!Number.isFinite(horasNum) || horasNum <= 0 || horasNum > 16) {
      setReprogramarState((prev) => ({ ...prev, error: 'Ingresa una duración válida entre 0.5 y 16 horas.' }));
      return;
    }

    const iso = normalizarJornada(nuevaFecha);
    const isoOriginal = normalizarJornada(task.fechaLimite);
    const today = hoyIso();
    if (iso < today && iso !== isoOriginal) {
      setReprogramarState((prev) => ({ ...prev, error: 'La fecha no puede ser anterior a hoy.' }));
      return;
    }

    // Sumar horas ya asignadas en esa fecha
    const horasExistentes = obtenerHorasAsignadasAFecha(iso, task.id);
    const totalConTarea = Math.round((horasExistentes + horasNum) * 10) / 10;
    const esReduccionMismaFecha = iso === isoOriginal && horasNum < (Number(task.horasEstimadas) || 0);

    if (totalConTarea > limiteDiario && !esReduccionMismaFecha) {
      // Bloquear guardado directo y desplegar modal "Conflicto de sobrecarga"
      setReprogramarState({ isOpen: false, task: null, nuevaFecha: '', nuevasHoras: '', error: '' });
      setConflictoState({
        isOpen: true,
        conflictoData: {
          fecha: iso,
          fechaDisplay: isoToDisplayDate(iso),
          horasTotales: totalConTarea,
          limiteDiario,
          subtareas: [{ ...task, horasEstimadas: horasNum }],
          subtareaAfectada: { ...task, horasEstimadas: horasNum },
          eventoId: task.eventoId,
        },
      });
      return;
    }

    // Sin conflicto: guardar manteniendo el estado actual de la tarea (sin confundir con pospuesta)
    try {
      setIsSavingTask(true);
      const displayFecha = isoToDisplayDate(iso);
      if (iso === isoOriginal) {
        await actualizarHorasSubtarea(task.eventoId, task.id, horasNum);
      } else {
        await reprogramarSubtarea(task.eventoId, task.id, displayFecha, horasNum);
      }
      setReprogramarState({ isOpen: false, task: null, nuevaFecha: '', nuevasHoras: '', error: '' });
      setNotificacionModal({
        isOpen: true,
        type: 'reprogramar_exito',
        title: iso === isoOriginal ? 'Duración actualizada' : 'Fecha actualizada',
        message:
          iso === isoOriginal
            ? 'La duración estimada de la actividad se actualizó correctamente.'
            : 'La actividad fue reprogramada correctamente conservando su estado.',
        itemName: task.titulo,
      });
      setToastMessage('Los cambios de la actividad se guardaron exitosamente.');
      setTimeout(() => setToastMessage(''), 4500);
    } catch (err) {
      const overload = parseOverloadError(err);
      if (overload) {
        setReprogramarState({ isOpen: false, task: null, nuevaFecha: '', nuevasHoras: '', error: '' });
        setConflictoState({
          isOpen: true,
          conflictoData: {
            fecha: iso,
            fechaDisplay: isoToDisplayDate(iso),
            horasTotales: overload.horasTotales,
            limiteDiario: overload.limiteDiario,
            subtareas: [{ ...task, horasEstimadas: horasNum }],
            subtareaAfectada: { ...task, horasEstimadas: horasNum },
            eventoId: task.eventoId,
          },
        });
        return;
      }
      setNotificacionModal({
        isOpen: true,
        type: 'error_actualizar',
        title: 'Error al actualizar',
        message: 'Ha ocurrido un error al intentar actualizar la subtarea. Inténtelo de nuevo.',
        itemName: task.titulo,
      });
      setToastMessage('Falla: no se pudo guardar la actividad.');
      setTimeout(() => setToastMessage(''), 4500);
    } finally {
      setIsSavingTask(false);
    }
  };

  // Sprint 3: Resolución Conflicto Opción 1 - Mover a otro día
  const handleResolverConflictoMover = async (subtask, nuevaFechaDisplay, nuevaFechaIso, nuevasHoras = null) => {
    const horasExistentes = obtenerHorasAsignadasAFecha(nuevaFechaIso, subtask.id);
    const horasTarea =
      nuevasHoras !== null && nuevasHoras !== undefined
        ? Number(nuevasHoras)
        : (Number(subtask.horasEstimadas) || 0);
    const totalConTarea = Math.round((horasExistentes + horasTarea) * 10) / 10;

    if (totalConTarea > limiteDiario) {
      return {
        ok: false,
        message: `La fecha destino (${nuevaFechaDisplay}) superaría tu límite diario: quedarías con ${totalConTarea}h (límite ${limiteDiario}h).`,
      };
    }

    try {
      await reprogramarSubtarea(subtask.eventoId, subtask.id, nuevaFechaDisplay, nuevasHoras);
      setToastMessage('Actividad reprogramada exitosamente.');
      setTimeout(() => setToastMessage(''), 4500);
      return { ok: true };
    } catch (err) {
      const overload = parseOverloadError(err);
      if (overload) {
        return {
          ok: false,
          message: `Conflicto de sobrecarga en destino: quedarías con ${overload.horasTotales}h (límite ${overload.limiteDiario}h).`,
        };
      }
      return {
        ok: false,
        message: 'Ha ocurrido un error al intentar actualizar la subtarea en el servidor.',
      };
    }
  };

  // Sprint 3: Resolución Conflicto Opción 2 - Reducir horas estimadas
  const handleResolverConflictoReducir = async (subtask, nuevasHoras) => {
    try {
      const fechaConflictoIso = normalizarJornada(conflictoState.conflictoData?.fecha);
      const fechaSubtaskIso = normalizarJornada(subtask.fechaLimite);
      if (fechaConflictoIso && fechaConflictoIso !== fechaSubtaskIso) {
        const fechaDisp = conflictoState.conflictoData.fechaDisplay || isoToDisplayDate(fechaConflictoIso);
        await reprogramarSubtarea(subtask.eventoId, subtask.id, fechaDisp, nuevasHoras);
      } else {
        await actualizarHorasSubtarea(subtask.eventoId, subtask.id, nuevasHoras);
      }
      setToastMessage('Las horas estimadas se actualizaron exitosamente.');
      setTimeout(() => setToastMessage(''), 4500);
      return { ok: true };
    } catch (err) {
      const overload = parseOverloadError(err);
      if (overload) {
        return {
          ok: false,
          message: `Conflicto de sobrecarga: quedarías con ${overload.horasTotales}h (límite ${overload.limiteDiario}h).`,
        };
      }
      return {
        ok: false,
        message: 'Ha ocurrido un error al intentar actualizar las horas en el servidor.',
      };
    }
  };

  // Sprint 4: Acción unificada de Posponer con nota opcional y confirmación que identifica la actividad y el evento
  const handlePosponerSubtarea = async (eventoId, subtareaId, notaTexto, taskObj) => {
    try {
      await posponerSubtarea(eventoId, subtareaId, null, notaTexto);
      const evNombre = taskObj?.eventoNombre || eventos.find((e) => e.id === eventoId)?.nombre || 'Evento';
      const taskNombre = taskObj?.titulo || 'Actividad';
      const tieneNota = notaTexto !== undefined && notaTexto !== null && String(notaTexto).trim() !== '';
      const msg = tieneNota
        ? `Nota guardada correctamente. Actividad: ${taskNombre}. Evento: ${evNombre}`
        : `Actividad pospuesta correctamente. Actividad: ${taskNombre}. Evento: ${evNombre}`;
      setToastMessage(msg);
      setTimeout(() => setToastMessage(''), 5000);
      return { ok: true };
    } catch (err) {
      console.error('Error posponiendo actividad:', err);
      throw err;
    }
  };

  // Error Global Crítico
  if (hasGlobalError) {
    return (
      <div className="page-wrapper page-error-view">
        <ErrorMessage
          hasError={hasGlobalError}
          isGlobal={true}
          message="Hubo un problema de conexión al obtener tus datos. Verifica tu conexión a Internet o intenta recargar la página"
          onRetry={reintentarGlobal}
        />
      </div>
    );
  }

  // Estado de Carga (Sprint 3: Calidad IxD)
  if (isLoadingPlanning) {
    return (
      <div className="page-wrapper page-loading-view" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="planning-loading-wrapper">
          <div className="planning-spinner" aria-hidden="true" />
          <p className="planning-loading-text">Cargando tu planificación...</p>
        </div>
      </div>
    );
  }

  const planificadasActivas = resumenCapacidad?.horasPlanificadasActivas ?? horasUrgentesHoy ?? 0;
  const disponiblesActivas =
    resumenCapacidad?.horasDisponiblesActivas ??
    Math.max(0, Math.round(((limiteDiario || 6) - planificadasActivas) * 10) / 10);
  const etiquetaJornadaCapacidad = resumenCapacidad?.etiquetaJornadaActiva || 'Hoy';
  const haySobrecargaCapacidad = resumenCapacidad?.haySobrecarga ?? planificadasActivas > (limiteDiario || 6);
  const excesoCapacidad =
    resumenCapacidad?.excesoActivo ??
    Math.max(0, Math.round((planificadasActivas - (limiteDiario || 6)) * 10) / 10);
  const jornadasSobrecargadas = resumenCapacidad?.jornadasSobrecargadas || [];
  const porcentajeUsoCapacidad =
    limiteDiario > 0 ? Math.min(100, Math.round((planificadasActivas / limiteDiario) * 100)) : 0;

  const renderPanelCapacidadDiaria = () => (
    <section
      className="dashboard-section"
      aria-label=" Estado de Capacidad Diaria"
      style={{
        backgroundColor: '#FFFFFF',
        border: `1.5px solid ${haySobrecargaCapacidad ? '#FCA5A5' : '#BFDBFE'}`,
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.2rem' }} aria-hidden="true">
              {haySobrecargaCapacidad ? '⚠️' : '⏱️'}
            </span>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Capacidad Diaria del Usuario
            </h2>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '999px',
                backgroundColor: haySobrecargaCapacidad ? '#FEE2E2' : '#DCFCE7',
                color: haySobrecargaCapacidad ? '#DC2626' : '#15803D',
                border: `1px solid ${haySobrecargaCapacidad ? '#FCA5A5' : '#86EFAC'}`,
              }}
            >
              {haySobrecargaCapacidad
                ? `⚠️ Sobrecarga detectada (+${excesoCapacidad}h)`
                : '✓ Sin sobrecarga'}
            </span>
          </div>
          <p style={{ fontSize: '0.86rem', color: '#64748B', marginTop: '4px' }}>
            Balance operativo basado en tu límite configurado de <strong>{limiteDiario}h/día</strong> ({etiquetaJornadaCapacidad}).
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLimiteModalHoy(true)}
          style={{
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '8px 14px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ⚙️ Configurar límite ({limiteDiario}h/día)
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 16px',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Límite diario
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
            {limiteDiario}h <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>/ día</span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 16px',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Horas planificadas ({etiquetaJornadaCapacidad})
          </span>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: haySobrecargaCapacidad ? '#DC2626' : '#2563EB',
              marginTop: '2px',
            }}
          >
            {planificadasActivas}h
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '12px 16px',
          }}
        >
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
            Horas disponibles
          </span>
          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: disponiblesActivas > 0 ? '#16A34A' : '#D97706',
              marginTop: '2px',
            }}
          >
            {disponiblesActivas}h
          </div>
        </div>

        <div
          style={{
            backgroundColor: haySobrecargaCapacidad ? '#FEF2F2' : '#F0FDF4',
            border: `1px solid ${haySobrecargaCapacidad ? '#FECACA' : '#BBF7D0'}`,
            borderRadius: '12px',
            padding: '12px 16px',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: haySobrecargaCapacidad ? '#991B1B' : '#166534',
              textTransform: 'uppercase',
            }}
          >
            Estado de sobrecarga
          </span>
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: haySobrecargaCapacidad ? '#DC2626' : '#15803D',
              marginTop: '6px',
            }}
          >
            {haySobrecargaCapacidad
              ? `Sobrecarga: +${excesoCapacidad}h sobre el límite`
              : `Normal (${disponiblesActivas}h libres)`}
          </div>
        </div>
      </div>

      {/* Barra visual de ocupación del límite diario */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div
          style={{
            width: '100%',
            height: '9px',
            backgroundColor: '#E2E8F0',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${porcentajeUsoCapacidad}%`,
              height: '100%',
              backgroundColor: haySobrecargaCapacidad ? '#DC2626' : '#2563EB',
              borderRadius: '999px',
              transition: 'width 0.3s ease, background-color 0.3s ease',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: '#475569',
            fontWeight: 600,
          }}
        >
          <span>
            Ocupación: {planificadasActivas}h planificadas de {limiteDiario}h permitidas por día
          </span>
          <span>{disponiblesActivas}h disponibles</span>
        </div>
      </div>

      {/* Detalle explícito de jornadas en sobrecarga con alternativas interactivas de resolución */}
      {jornadasSobrecargadas.length > 0 ? (
        <div
          role="alert"
          style={{
            marginTop: '14px',
            backgroundColor: '#FEF2F2',
            border: '1.5px solid #FCA5A5',
            borderRadius: '12px',
            padding: '16px 18px',
            color: '#991B1B',
            fontSize: '0.88rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
            <strong style={{ fontSize: '0.96rem', color: '#7F1D1D' }}>
              ⚠️ Alerta de sobrecarga diaria: Las horas pendientes superan tu límite configurado de {limiteDiario}h/día
            </strong>
            <span
              style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.78rem',
                padding: '3px 10px',
                borderRadius: '999px',
              }}
            >
              Requiere ajuste
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jornadasSobrecargadas.map((j) => (
              <div
                key={j.fecha}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #FECACA',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                      📅 Jornada: {j.fechaDisplay}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', fontSize: '0.84rem', color: '#334155' }}>
                      <span>
                        • Horas planificadas para ese día: <strong>{j.horasPlanificadas}h</strong>
                      </span>
                      <span>
                        • Límite diario configurado: <strong>{limiteDiario}h</strong>
                      </span>
                      <span style={{ color: '#DC2626', fontWeight: 700 }}>
                        • Horas que exceden el límite: <strong>+{j.exceso}h (sobrecarga de {j.exceso}h)</strong>
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleAbrirResolucionJornada(j, 'mover')}
                      style={{
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      📅 Reprogramar actividades
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAbrirResolucionJornada(j, 'reducir')}
                      style={{
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        border: '1px solid #93C5FD',
                        borderRadius: '8px',
                        padding: '7px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ⏱️ Modificar duración
                    </button>
                  </div>
                </div>

                {Array.isArray(j.subtareas) && j.subtareas.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #FECACA' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7F1D1D', display: 'block', marginBottom: '6px' }}>
                      Actividades pendientes en esta jornada (selecciona una alternativa para solucionar el conflicto):
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {j.subtareas.map((sub) => (
                        <div
                          key={sub.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px',
                            backgroundColor: '#FEF2F2',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                          }}
                        >
                          <span style={{ color: '#0F172A', fontWeight: 600 }}>
                            {sub.titulo} <strong style={{ color: '#DC2626' }}>({sub.horasEstimadas}h)</strong>{' '}
                            <span style={{ color: '#64748B', fontWeight: 400 }}>• {sub.eventoNombre}</span>
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleAbrirResolucionJornada(j, 'mover', sub.id)}
                              style={{
                                backgroundColor: '#FFFFFF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              📅 Reprogramar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAbrirResolucionJornada(j, 'reducir', sub.id)}
                              style={{
                                backgroundColor: '#FFFFFF',
                                color: '#0F172A',
                                border: '1px solid #CBD5E1',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ⏱️ Modificar duración
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          role="status"
          style={{
            marginTop: '14px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#166534',
            fontSize: '0.86rem',
            fontWeight: 600,
          }}
        >
          ✓ Capacidad dentro del límite: Tienes <strong>{disponiblesActivas}h disponibles</strong> de tu límite diario de{' '}
          <strong>{limiteDiario}h</strong> ({planificadasActivas}h en actividades pendientes para {etiquetaJornadaCapacidad}).
        </div>
      )}
    </section>
  );

  // Estado Vacío (Empty State - Sprint 3)
  if (isEmpty || todasLasTareas.length === 0) {
    return (
      <div className="page-wrapper">
        <header className="page-header-row">
          <div>
            <span className="eyebrow-tag">Prioridades del día</span>
            <h1 className="page-main-heading">Hoy</h1>
            <p className="page-date-str">{fechaActualFormateada}</p>
          </div>
        </header>

        {renderPanelCapacidadDiaria()}

        <EmptyState
          isEmpty={true}
          icon={<span style={{ fontSize: '3.6rem' }} role="img" aria-label="Taza de café">☕</span>}
          title="No hay tareas programadas."
          subtitle="Actualmente no cuentas con ninguna tarea programada en tu panel. Crea tu primera actividad para comenzar a planificar."
          actionText="Crear actividad"
          actionTo="/crear-evento"
        />

        <ConfigurarLimiteModal
          isOpen={showLimiteModalHoy}
          onClose={() => setShowLimiteModalHoy(false)}
        />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Cabecera Principal con Fecha y Componente Informativo "¿Cómo se ordena?" */}
      <header className="page-header-row">
        <div>
          <span className="eyebrow-tag">Prioridades del día</span>
          <h1 className="page-main-heading">Hoy</h1>
          <p className="page-date-str">
            Gestión y planificación de tus compromisos logísticos • <strong>{fechaActualFormateada}</strong>
          </p>
        </div>

        {/* Control Informativo y KPIs */}
        <div className="header-actions-kpi-row">
          {/* Botón interactivo oficial: ¿Cómo se ordena? */}
          <div className="order-rule-control-wrapper">
            <button
              type="button"
              className="btn-order-rule-toggle"
              onClick={() => setShowOrderRule(!showOrderRule)}
              aria-expanded={showOrderRule}
              title="Ver regla de categorización y ordenamiento de tareas"
            >
              <span className="rule-info-icon" aria-hidden="true">ⓘ</span>
              ¿Cómo se ordena?
            </button>

            {/* Popover informativo reglamentario (2-4 líneas de texto exacto) */}
            {showOrderRule && (
              <div className="order-rule-popover" role="tooltip">
                <div className="popover-header">
                  <strong>¿Cómo se ordena?</strong>
                  <button
                    type="button"
                    className="popover-close-btn"
                    onClick={() => setShowOrderRule(false)}
                    aria-label="Cerrar regla informativa"
                  >
                    ✕
                  </button>
                </div>
                <p className="order-rule-text">
                  "Las tareas se agrupan por prioridad temporal (Vencidas, Hoy, Próximas). Dentro de cada grupo, se ordenan cronológicamente por la fecha límite más cercana para facilitarte la planificación diaria."
                </p>
              </div>
            )}
          </div>

          <div className="kpi-group">
            <div className="kpi-card" title="Horas planificadas frente al límite diario">
              <span className="kpi-label">Planificadas</span>
              <span className={`kpi-number ${haySobrecargaCapacidad ? 'kpi-danger' : ''}`}>
                {planificadasActivas}h / {limiteDiario}h
              </span>
            </div>
            <div className="kpi-card" title="Horas disponibles según tu límite diario">
              <span className="kpi-label">Disponibles</span>
              <span className="kpi-number" style={{ color: disponiblesActivas > 0 ? '#16A34A' : '#D97706' }}>
                {disponiblesActivas}h
              </span>
            </div>
            <div className="kpi-card" title="Tareas urgentes programadas para hoy">
              <span className="kpi-label">Urgentes hoy</span>
              <span className="kpi-number">{paraHoy.length}</span>
            </div>
            <div className="kpi-card" title="Tareas con fecha límite vencida">
              <span className="kpi-label">Vencidas</span>
              <span className="kpi-number kpi-danger">{vencidas.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Panel de Capacidad Diaria con Horas Planificadas, Disponibles y Estado de Sobrecarga */}
      {renderPanelCapacidadDiaria()}

      {/* Barra de Filtros Visuales (US-05) */}
      <section className="dashboard-section hoy-filter-toolbar" aria-label="Filtros de búsqueda de tareas">
        <div className="filter-toolbar-header">
          <div className="filter-toolbar-title">
            <span className="filter-icon" aria-hidden="true">🔍</span>
            <strong>Filtros rápidos de tareas</strong>
            {hayFiltrosActivos && (
              <span className="filter-active-pill">Filtro aplicado</span>
            )}
          </div>
          {hayFiltrosActivos && (
            <button
              type="button"
              className="btn-clear-filters"
              onClick={limpiarFiltros}
              title="Restablecer todos los filtros"
            >
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        <div className="filter-inputs-grid">
          {/* 1. Filtro por Evento */}
          <div className="filter-control-group">
            <label htmlFor="filter-event" className="filter-label">
              Evento:
            </label>
            <select
              id="filter-event"
              className="filter-select"
              value={filtroEvento}
              onChange={(e) => setFiltroEvento(e.target.value)}
            >
              <option value="todos">Todos los eventos ({eventos.length})</option>
              {eventos.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filtro por Estado */}
          <div className="filter-control-group">
            <label htmlFor="filter-status" className="filter-label">
              Estado:
            </label>
            <select
              id="filter-status"
              className="filter-select"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los pendientes</option>
              <option value="pendiente">Pendientes</option>
              <option value="pospuesta">Pospuestas</option>
              <option value="vencida">Vencidas</option>
              <option value="hecha">Completadas (Hechas)</option>
            </select>
          </div>

          {/* 3. Filtro por Días Próximos (Rango Temporal) */}
          <div className="filter-control-group">
            <label htmlFor="filter-days" className="filter-label">
              Días próximos:
            </label>
            <select
              id="filter-days"
              className="filter-select"
              value={filtroDias}
              onChange={(e) => setFiltroDias(e.target.value)}
            >
              <option value="todos">Cualquier fecha</option>
              <option value="3">Próximos 3 días</option>
              <option value="7">Próximos 7 días</option>
              <option value="15">Próximos 15 días</option>
              <option value="30">Próximos 30 días</option>
            </select>
          </div>
        </div>

        {/* Resumen de resultados filtrados si hay filtros activos */}
        {hayFiltrosActivos && (
          <div className="filter-results-summary">
            <span>
              Mostrando <strong>{tareasFiltradas.length}</strong> gestiones según los criterios activos.
            </span>
          </div>
        )}
      </section>

      {/* Resumen o Estado Vacío de Filtros (Sprint 3) */}
      {hayFiltrosActivos && tareasFiltradas.length === 0 ? (
        <div className="empty-filter-state-box">
          <span className="empty-filter-icon" aria-hidden="true">🔍</span>
          <p className="empty-filter-text">No hay tareas que coincidan con los filtros aplicados.</p>
          <button
            type="button"
            className="btn-clear-filters"
            onClick={limpiarFiltros}
          >
            ✕ Restablecer filtros
          </button>
        </div>
      ) : (
        <>
          {/* Módulo Parcial de Catering (Decisión 3: Error Localizado) */}
          <section className="dashboard-section catering-module-wrapper">
            <div className="section-title-line">
              <div>
                <h3 className="section-title">
                  {hasCateringModuleError
                    ? 'Error cargando las gestiones urgentes de catering'
                    : 'Gestiones Urgentes de Catering'}
                </h3>
                <p className="section-desc">Coordinación directa con proveedores de alimentación y banquetes.</p>
              </div>
            </div>

            {hasCateringModuleError ? (
              <ErrorMessage
                hasError={hasCateringModuleError}
                isGlobal={false}
                title="Error cargando las gestiones urgentes de catering"
                message="No se ha podido cargar el evento o sus gestiones asociadas. Las demás áreas continúan operativas."
                onRetry={recargarModuloCatering}
              />
            ) : (
              <div className="catering-tasks-list">
                {tareasCatering.length > 0 ? (
                  tareasCatering.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={marcarSubtareaHecha}
                      onSnooze={handlePosponerSubtarea}
                      onReprogram={handleAbrirReprogramar}
                      onDeleteRequest={handleRequestDeleteTask}
                    />
                  ))
                ) : (
                  <EmptyState
                    isEmpty={tareasCatering.length === 0}
                    title="¿Deseas agregar tu primera gestión logística?"
                    description="No hay gestiones urgentes de catering pendientes en este momento."
                    buttonText="Agregar gestión"
                    to="/crear-evento"
                    scope="tareas"
                  />
                )}
              </div>
            )}
          </section>

          {/* =================================================================== */}
          {/* 1. SECCIÓN VENCIDAS (Estrictamente anterior al día de hoy)         */}
          {/* =================================================================== */}
          <section className="dashboard-section section-temporal-block">
            <div className="temporal-group-header">
              <div className="temporal-title-group">
                <span className="temporal-dot dot-vencidas" aria-hidden="true" />
                <h3 className="temporal-heading">Vencidas</h3>
                <span className="temporal-badge badge-vencidas-count">
                  {vencidasOrdenadas.length}
                </span>
              </div>
              <span className="temporal-hint">Requieren atención o reprogramación inmediata</span>
            </div>

            {vencidasOrdenadas.length === 0 ? (
              <div className="temporal-empty-hint">
                <span>✓ No tienes gestiones vencidas. ¡Excelente gestión temporal!</span>
              </div>
            ) : (
              <div className="task-grid">
                {vencidasOrdenadas.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={marcarSubtareaHecha}
                    onSnooze={handlePosponerSubtarea}
                    onReprogram={handleAbrirReprogramar}
                    onDeleteRequest={handleRequestDeleteTask}
                  />
                ))}
              </div>
            )}
          </section>

          {/* =================================================================== */}
          {/* 2. SECCIÓN PARA HOY (Fecha de vencimiento corresponde a hoy)        */}
          {/* =================================================================== */}
          <section className="dashboard-section section-temporal-block">
            <div className="temporal-group-header">
              <div className="temporal-title-group">
                <span className="temporal-dot dot-hoy" aria-hidden="true" />
                <h3 className="temporal-heading">Para hoy</h3>
                <span className="temporal-badge badge-hoy-count">
                  {paraHoyOrdenadas.length}
                </span>
              </div>
              <span className="temporal-hint">Gestiones programadas para ejecutarse en el día en curso</span>
            </div>

            {paraHoyOrdenadas.length === 0 ? (
              <div className="temporal-empty-hint">
                <span>🎉 No tienes tareas pendientes para hoy. Puedes avanzar en tus próximas gestiones.</span>
              </div>
            ) : (
              <div className="task-grid">
                {paraHoyOrdenadas.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={marcarSubtareaHecha}
                    onSnooze={handlePosponerSubtarea}
                    onReprogram={handleAbrirReprogramar}
                    onDeleteRequest={handleRequestDeleteTask}
                  />
                ))}
              </div>
            )}
          </section>

          {/* =================================================================== */}
          {/* SECCIÓN POSPUESTAS (Retiradas de urgencias del día / aplazadas)    */}
          {/* =================================================================== */}
          {pospuestasOrdenadas.length > 0 && (
            <section className="dashboard-section section-temporal-block">
              <div className="temporal-group-header">
                <div className="temporal-title-group">
                  <span className="temporal-dot" style={{ backgroundColor: '#f59e0b' }} aria-hidden="true" />
                  <h3 className="temporal-heading">Pospuestas</h3>
                  <span className="temporal-badge" style={{ backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                    {pospuestasOrdenadas.length}
                  </span>
                </div>
                <span className="temporal-hint">Gestiones aplazadas retiradas de la urgencia del día</span>
              </div>

              <div className="task-grid">
                {pospuestasOrdenadas.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={marcarSubtareaHecha}
                    onSnooze={handlePosponerSubtarea}
                    onReprogram={handleAbrirReprogramar}
                    onDeleteRequest={handleRequestDeleteTask}
                  />
                ))}
              </div>
            </section>
          )}

          {/* =================================================================== */}
          {/* 3. SECCIÓN PRÓXIMAS (Fecha de vencimiento posterior al día de hoy)  */}
          {/* =================================================================== */}
          <section className="dashboard-section section-temporal-block">
            <div className="temporal-group-header">
              <div className="temporal-title-group">
                <span className="temporal-dot dot-proximas" aria-hidden="true" />
                <h3 className="temporal-heading">Próximas</h3>
                <span className="temporal-badge badge-proximas-count">
                  {proximasOrdenadas.length}
                </span>
              </div>
              <span className="temporal-hint">Planificación logística para los próximos días y semanas</span>
            </div>

            {proximasOrdenadas.length === 0 ? (
              <div className="temporal-empty-hint">
                <span>No hay gestiones futuras programadas en este momento.</span>
              </div>
            ) : (
              <div className="task-grid">
                {proximasOrdenadas.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onComplete={marcarSubtareaHecha}
                    onSnooze={handlePosponerSubtarea}
                    onReprogram={handleAbrirReprogramar}
                    onDeleteRequest={handleRequestDeleteTask}
                  />
                ))}
              </div>
            )}
          </section>

          {/* =================================================================== */}
          {/* SECCIÓN COMPLETADAS (Visible al filtrar por estado 'hecha')         */}
          {/* =================================================================== */}
          {filtroEstado === 'hecha' && (
            <section className="dashboard-section section-temporal-block">
              <div className="temporal-group-header">
                <div className="temporal-title-group">
                  <span className="temporal-dot" style={{ backgroundColor: '#16a34a' }} aria-hidden="true" />
                  <h3 className="temporal-heading">Completadas</h3>
                  <span className="temporal-badge" style={{ backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                    {hechasOrdenadas.length}
                  </span>
                </div>
                <span className="temporal-hint">Gestiones finalizadas exitosamente</span>
              </div>

              {hechasOrdenadas.length === 0 ? (
                <div className="temporal-empty-hint">
                  <span>No hay tareas completadas para mostrar con los filtros actuales.</span>
                </div>
              ) : (
                <div className="task-grid">
                  {hechasOrdenadas.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={marcarSubtareaHecha}
                      onSnooze={handlePosponerSubtarea}
                      onReprogram={handleAbrirReprogramar}
                      onDeleteRequest={handleRequestDeleteTask}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Modal del Sistema para Eliminación de Tarea */}
      <SystemModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        itemName={modalState.subtarea?.titulo}
        onClose={() => setModalState({ isOpen: false, type: 'eliminar_tarea', eventoId: null, subtarea: null })}
        onConfirm={handleConfirmModalAction}
      />

      {/* Modal Interactivo de Reprogramación de Fecha (Sprint 3) */}
      {reprogramarState.isOpen && (
        <div
          className="modal-overlay-focus"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reprogramar-modal-title"
        >
          <div className="system-modal-card">
            <div className="system-modal-header">
              <div className="modal-icon-badge" style={{ backgroundColor: '#DBEAFE' }} aria-hidden="true">
                <span style={{ fontSize: '1.3rem' }}>📅</span>
              </div>
              <div>
                <h3 id="reprogramar-modal-title" className="system-modal-title">
                  Reprogramar Gestión Logística
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '2px' }}>
                  Gestión: <strong>{reprogramarState.task?.titulo}</strong> ({reprogramarState.task?.horasEstimadas}h)
                </p>
              </div>
            </div>

            {reprogramarState.error && (
              <div className="limit-error-banner" role="alert">
                <span aria-hidden="true">⚠️</span> {reprogramarState.error}
              </div>
            )}

            <div className="form-field" style={{ margin: '12px 0' }}>
              <label className="form-label">
                Nueva fecha límite / Jornada <span className="required-star">*</span>
              </label>
              <DatePickerField
                value={reprogramarState.nuevaFecha}
                onChange={(formatted) =>
                  setReprogramarState((prev) => ({ ...prev, nuevaFecha: formatted, error: '' }))
                }
                min={todayIso}
                placeholder="DD/MM/AAAA"
              />
            </div>

            <div className="form-field" style={{ margin: '12px 0' }}>
              <label htmlFor="reprogramar-horas-input" className="form-label">
                Duración estimada (horas) <span className="required-star">*</span>
              </label>
              <div className="inline-limit-input-group">
                <input
                  id="reprogramar-horas-input"
                  type="number"
                  min="0.5"
                  max="16"
                  step="0.5"
                  value={reprogramarState.nuevasHoras ?? ''}
                  onChange={(e) =>
                    setReprogramarState((prev) => ({ ...prev, nuevasHoras: e.target.value, error: '' }))
                  }
                  className="input-focus-active"
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.95rem' }}
                />
                <span className="unit-suffix">hrs</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '6px' }}>
                Al reprogramar o ajustar la duración, la actividad conservará su estado actual (sin confundirse con actividades pospuestas).
              </p>
            </div>

            <div className="system-modal-actions">
              <Button
                variant="neutral"
                type="button"
                disabled={isSavingTask}
                onClick={() => setReprogramarState({ isOpen: false, task: null, nuevaFecha: '', error: '' })}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="button"
                disabled={isSavingTask}
                onClick={handleConfirmarReprogramar}
              >
                {isSavingTask ? 'Guardando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Conflicto de Sobrecarga (Requerimiento 2 y 3) */}
      <ConflictoSobrecargaModal
        isOpen={conflictoState.isOpen}
        conflictoData={conflictoState.conflictoData}
        onClose={() => setConflictoState({ isOpen: false, conflictoData: null })}
        onResolverMover={handleResolverConflictoMover}
        onResolverReducir={handleResolverConflictoReducir}
      />

      {/* Modal de Notificación Explícita (Sprint 3: Módulo 4) */}
      <SystemModal
        isOpen={notificacionModal.isOpen}
        type={notificacionModal.type}
        title={notificacionModal.title}
        message={notificacionModal.message}
        itemName={notificacionModal.itemName}
        onClose={() => setNotificacionModal({ isOpen: false, type: '', title: '', message: '', itemName: '' })}
      />

      {/* Modal de Configuración de Límite Diario desde Hoy */}
      <ConfigurarLimiteModal
        isOpen={showLimiteModalHoy}
        onClose={() => setShowLimiteModalHoy(false)}
      />

      {/* Toast Notificación Flotante */}
      {toastMessage && (
        <aside className="toast-notification-floating" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span> {toastMessage}
        </aside>
      )}
    </div>
  );
}
