import React, { useState, useEffect } from 'react';
import Button from './Button';
import DatePickerField from './DatePickerField';
import SystemModal from './SystemModal';
import {
  hoyIso,
  isoToDisplayDate,
  normalizarJornada,
  bloquearTeclasNoNumericas,
} from '../utils/validacionesHoras';

/**
 * Modal de Conflicto de Sobrecarga (Sprint 3)
 *
 * Requerimiento 2:
 * - Título: "Conflicto de sobrecarga"
 * - Subtítulo dinámico: "Quedarías con Xh planificadas (tu límite es Yh)"
 * - Pregunta: "¿Cómo deseas resolverlo?"
 * - Opciones:
 *   1. "Mover a otro día" -> Abre selector de fecha con calendario (deshabilitando fechas pasadas).
 *   2. "Reducir horas estimadas" -> Abre submodal para ajustar la estimación al margen disponible.
 *   3. "Cancelar" -> Aborta la operación y vuelve a la pantalla previa.
 *
 * Requerimiento 3:
 * - Submodal "Reducir Horas Estimadas":
 *   - Nombre/Título de la subtarea afectada.
 *   - Horas actuales de la tarea.
 *   - Indicador de disponibilidad del día (ej. "5h planificadas de 6h").
 *   - Input numérico para "Nuevas horas estimadas".
 *   - Mensaje de confirmación: "Las horas de la subtarea se actualizaron correctamente".
 *
 * Requerimiento 4:
 * - Al mover/reprogramar a una fecha válida, el estado se actualiza a "POSTERGADA".
 */
export default function ConflictoSobrecargaModal({
  isOpen = false,
  conflictoData = null,
  onClose,
  onResolverMover,
  onResolverReducir,
}) {
  // Modos de visualización: 'menu' | 'mover' | 'reducir'
  const [modo, setModo] = useState('menu');

  // Estado para modo 'mover'
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevasHorasMover, setNuevasHorasMover] = useState('');
  const [errorMover, setErrorMover] = useState('');

  // Estado para modo 'reducir'
  const [nuevasHorasInput, setNuevasHorasInput] = useState('');
  const [errorReducir, setErrorReducir] = useState('');
  const [successReducir, setSuccessReducir] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Subtarea seleccionada para resolver
  const [subtareaSeleccionadaId, setSubtareaSeleccionadaId] = useState('');

  // Modal de retroalimentación (Éxito / Error con bordes verdes/rojos y blur de fondo)
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    type: 'reprogramar_exito',
    category: 'success',
    title: '',
    message: '',
    itemName: '',
    onConfirm: null,
  });

  const todayStr = hoyIso();

  useEffect(() => {
    if (isOpen) {
      const startMode = conflictoData?.initialMode || 'menu';
      setModo(startMode);
      setNuevaFecha('');
      setErrorMover('');
      setErrorReducir('');
      setSuccessReducir('');
      setIsSaving(false);
      setFeedbackModal({
        isOpen: false,
        type: 'reprogramar_exito',
        category: 'success',
        title: '',
        message: '',
        itemName: '',
        onConfirm: null,
      });

      const list = conflictoData?.subtareas || [];
      const targetSub =
        (conflictoData?.initialSubtaskId && list.find((s) => s.id === conflictoData.initialSubtaskId)) ||
        conflictoData?.subtareaAfectada ||
        (list.length > 0 ? list[list.length - 1] : null);

      if (targetSub?.id) {
        setSubtareaSeleccionadaId(targetSub.id);
      }

      const lim = Number(conflictoData?.limiteDiario) || 6;
      const tot = Number(conflictoData?.horasTotales) || 0;
      const hSub = Number(targetSub?.horasEstimadas) || 1;
      const hOtras = Math.max(0, Math.round((tot - hSub) * 10) / 10);
      const margen = Math.max(0, Math.round((lim - hOtras) * 10) / 10);
      const sugerenciaReducir =
        margen >= 0.5
          ? Math.min(margen, Math.max(0.5, Math.round((hSub - 0.5) * 10) / 10))
          : Math.max(0.5, Math.min(lim, Math.round((hSub - 0.5) * 10) / 10));
      setNuevasHorasInput(String(sugerenciaReducir));
      setNuevasHorasMover(hSub > lim ? String(lim) : String(hSub));
    }
  }, [isOpen, conflictoData]);

  if (!isOpen || !conflictoData) return null;

  const {
    fecha,
    fechaDisplay = isoToDisplayDate(fecha),
    horasTotales = 0,
    limiteDiario = 6,
    subtareas = [],
  } = conflictoData;

  // Encontrar la subtarea activa
  const subtareaActiva =
    subtareas.find((s) => s.id === subtareaSeleccionadaId) ||
    conflictoData.subtareaAfectada ||
    subtareas[0] ||
    {};

  // Calcular horas de las otras subtareas en este día
  const horasSubtarea = Number(subtareaActiva.horasEstimadas) || 0;
  const horasOtras = Math.max(0, Math.round((horasTotales - horasSubtarea) * 10) / 10);
  const margenDisponible = Math.max(0, Math.round((limiteDiario - horasOtras) * 10) / 10);
  const maxPermitidoReducir =
    margenDisponible >= 0.5
      ? margenDisponible
      : Math.max(0.5, Math.min(limiteDiario, Math.round((horasSubtarea - 0.5) * 10) / 10));

  // 1. Manejar confirmación de mover a otro día
  const handleConfirmarMover = async () => {
    const nombreGestion = subtareaActiva.titulo || 'Gestión';

    if (!nuevaFecha) {
      setFeedbackModal({
        isOpen: true,
        type: 'error_actualizar',
        category: 'error',
        title: 'Error al actualizar',
        message: 'Debes seleccionar una nueva fecha límite para la gestión.',
        itemName: nombreGestion,
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }
    const iso = normalizarJornada(nuevaFecha);
    if (iso < todayStr) {
      setFeedbackModal({
        isOpen: true,
        type: 'error_actualizar',
        category: 'error',
        title: 'Error al actualizar',
        message: 'La fecha seleccionada no puede ser anterior al día de hoy.',
        itemName: nombreGestion,
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }
    if (iso === normalizarJornada(fecha)) {
      setFeedbackModal({
        isOpen: true,
        type: 'error_actualizar',
        category: 'error',
        title: 'Error al actualizar',
        message: 'Debes elegir una fecha distinta a la jornada con conflicto.',
        itemName: nombreGestion,
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    let horasParaMover = null;
    if (horasSubtarea > limiteDiario || (nuevasHorasMover !== '' && Number(nuevasHorasMover) !== horasSubtarea)) {
      const parsedMoverHours = Number(nuevasHorasMover);
      if (!Number.isFinite(parsedMoverHours) || parsedMoverHours <= 0 || parsedMoverHours > limiteDiario) {
        setFeedbackModal({
          isOpen: true,
          type: 'error_actualizar',
          category: 'error',
          title: 'Error al actualizar',
          message: `La duración de la actividad debe ser mayor a 0 y no superar tu límite diario (${limiteDiario}h).`,
          itemName: nombreGestion,
          onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
        return;
      }
      horasParaMover = parsedMoverHours;
    }

    if (onResolverMover) {
      try {
        setIsSaving(true);
        const res = await onResolverMover(subtareaActiva, nuevaFecha, iso, horasParaMover);
        if (res && res.ok === false) {
          setFeedbackModal({
            isOpen: true,
            type: 'error_actualizar',
            category: 'error',
            title: 'Error al actualizar',
            message: res.message || 'No se pudo mover la gestión a la fecha seleccionada.',
            itemName: nombreGestion,
            onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
          return;
        }

        // Éxito al mover a otra fecha
        setFeedbackModal({
          isOpen: true,
          type: 'reprogramar_exito',
          category: 'success',
          title: 'Fecha actualizada',
          message: 'La fecha de la subtarea se actualizó correctamente.',
          itemName: nombreGestion,
          onConfirm: () => {
            setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
            onClose?.();
          },
        });
      } catch (err) {
        setFeedbackModal({
          isOpen: true,
          type: 'error_actualizar',
          category: 'error',
          title: 'Error al actualizar',
          message: err?.message || 'Ha ocurrido un error al intentar mover la fecha de la subtarea.',
          itemName: nombreGestion,
          onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  // 2. Manejar confirmación de reducción de horas
  const handleConfirmarReducir = async (e) => {
    if (e) e.preventDefault();
    const nombreGestion = subtareaActiva.titulo || 'Gestión';

    if (nuevasHorasInput === '' || nuevasHorasInput === null) {
      setFeedbackModal({
        isOpen: true,
        type: 'error_actualizar',
        category: 'error',
        title: 'Error al actualizar',
        message: 'Ingresa un valor numérico para las nuevas horas estimadas.',
        itemName: nombreGestion,
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    const val = Number(nuevasHorasInput);
    if (!Number.isFinite(val) || val <= 0) {
      setFeedbackModal({
        isOpen: true,
        type: 'error_actualizar',
        category: 'error',
        title: 'Error al actualizar',
        message: 'Las horas estimadas deben ser un valor mayor a 0.',
        itemName: nombreGestion,
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    if (val > maxPermitidoReducir) {
      setFeedbackModal({
        isOpen: true,
        type: 'error_actualizar',
        category: 'error',
        title: 'Error al actualizar',
        message:
          margenDisponible >= 0.5
            ? `No puedes asignar más de ${margenDisponible}h para no superar el límite de ${limiteDiario}h.`
            : `Ingresa una duración menor a las ${horasSubtarea}h actuales (máximo ${maxPermitidoReducir}h).`,
        itemName: nombreGestion,
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    if (Math.round(val * 2) !== val * 2) {
      setFeedbackModal({
        isOpen: true,
        type: 'error_actualizar',
        category: 'error',
        title: 'Error al actualizar',
        message: 'Usa intervalos de media hora (ej. 1, 1.5, 2).',
        itemName: nombreGestion,
        onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
      });
      return;
    }

    if (onResolverReducir) {
      try {
        setIsSaving(true);
        const res = await onResolverReducir(subtareaActiva, val);
        if (res && res.ok === false) {
          setFeedbackModal({
            isOpen: true,
            type: 'error_actualizar',
            category: 'error',
            title: 'Error al actualizar',
            message: res.message || 'No se pudieron actualizar las horas estimadas.',
            itemName: nombreGestion,
            onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
          });
          return;
        }

        // Éxito al reducir horas
        setFeedbackModal({
          isOpen: true,
          type: 'horas_reducidas_exito',
          category: 'success',
          title: 'Horas reducidas',
          message: 'Las horas de la subtarea se actualizaron correctamente.',
          itemName: nombreGestion,
          onConfirm: () => {
            setFeedbackModal((prev) => ({ ...prev, isOpen: false }));
            onClose?.();
          },
        });
      } catch (err) {
        setFeedbackModal({
          isOpen: true,
          type: 'error_actualizar',
          category: 'error',
          title: 'Error al actualizar',
          message: err?.message || 'Ha ocurrido un error al intentar actualizar las horas de la subtarea.',
          itemName: nombreGestion,
          onConfirm: () => setFeedbackModal((prev) => ({ ...prev, isOpen: false })),
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div
      className="modal-overlay-focus"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conflicto-modal-title"
    >
      <div className="system-modal-card modal-card-conflicto">
        {/* ============================================================== */}
        {/* MODO 1: Menú Principal de Conflicto de Sobrecarga              */}
        {/* ============================================================== */}
        {modo === 'menu' && (
          <>
            <div className="system-modal-header">
              <div className="modal-icon-badge icon-badge-risk" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.4">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
                </svg>
              </div>
              <div>
                <h3 id="conflicto-modal-title" className="system-modal-title" style={{ color: '#DC2626' }}>
                  Conflicto de sobrecarga
                </h3>
                {/* Subtítulo dinámico reglamentario con cifras numéricas exactas */}
                <p className="system-modal-subtitle" style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginTop: '3px' }}>
                  Quedarías con {horasTotales}h planificadas (límite {limiteDiario}h)
                </p>
              </div>
            </div>

            <div className="conflicto-details-box" style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 14px', margin: '4px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', color: '#991B1B', fontWeight: 600 }}>
                  📅 Jornada: <strong>{fechaDisplay || fecha}</strong>
                </span>
                <span style={{ fontSize: '0.8rem', background: '#DC2626', color: '#FFFFFF', padding: '2px 8px', borderRadius: '9999px', fontWeight: 700 }}>
                  Exceso: +{Math.round((horasTotales - limiteDiario) * 10) / 10}h
                </span>
              </div>

              {subtareas.length > 1 && (
                <div style={{ marginTop: '8px' }}>
                  <label htmlFor="select-subtarea-afectada" style={{ fontSize: '0.8rem', color: '#7F1D1D', display: 'block', marginBottom: '4px' }}>
                    Selecciona la gestión que deseas ajustar:
                  </label>
                  <select
                    id="select-subtarea-afectada"
                    className="filter-select"
                    style={{ fontSize: '0.85rem', padding: '6px 10px', background: '#FFFFFF', borderColor: '#FCA5A5' }}
                    value={subtareaSeleccionadaId}
                    onChange={(e) => setSubtareaSeleccionadaId(e.target.value)}
                  >
                    {subtareas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.titulo || 'Gestión sin título'} ({s.horasEstimadas}h)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {subtareas.length <= 1 && subtareaActiva.titulo && (
                <p style={{ fontSize: '0.85rem', color: '#7F1D1D', margin: 0 }}>
                  Gestión afectada: <strong>{subtareaActiva.titulo}</strong> ({horasSubtarea}h)
                </p>
              )}
            </div>

            {/* Pregunta reglamentaria */}
            <p className="conflicto-question-text" style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: '6px 0 2px' }}>
              ¿Cómo deseas resolverlo?
            </p>

            {/* Opciones reglamentarias: Mover a otro día, Reducir horas estimadas, Cancelar */}
            <div className="conflicto-options-grid" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn-token btn-primary"
                onClick={() => {
                  setModo('mover');
                  setNuevasHorasMover(horasSubtarea > limiteDiario ? String(limiteDiario) : String(horasSubtarea));
                  setErrorMover('');
                }}
                style={{ justifyContent: 'center', padding: '12px' }}
              >
                📅 Reprogramar actividad (Mover a otro día)
              </button>

              <button
                type="button"
                className="btn-token"
                onClick={() => {
                  setModo('reducir');
                  setNuevasHorasInput(String(maxPermitidoReducir));
                  setErrorReducir('');
                  setSuccessReducir('');
                }}
                style={{
                  justifyContent: 'center',
                  padding: '12px',
                  backgroundColor: '#EFF6FF',
                  border: '1.5px solid #3B82F6',
                  color: '#1D4ED8',
                  fontWeight: 600,
                }}
              >
                ⏱️ Modificar duración (Reducir horas estimadas)
              </button>

              <button
                type="button"
                className="btn-token btn-neutral"
                onClick={onClose}
                style={{
                  justifyContent: 'center',
                  padding: '12px',
                  backgroundColor: '#F8FAFC',
                  border: '1.5px solid #94A3B8',
                  color: '#475569',
                }}
              >
                Cancelar
              </button>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* MODO 2: Mover a otro día (DatePickerField interactivo)         */}
        {/* ============================================================== */}
        {modo === 'mover' && (
          <>
            <div className="system-modal-header">
              <div className="modal-icon-badge" style={{ backgroundColor: '#DBEAFE' }} aria-hidden="true">
                <span style={{ fontSize: '1.3rem' }}>📅</span>
              </div>
              <div>
                <h3 className="system-modal-title">Mover a otro día</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '2px' }}>
                  Reprogramar: <strong>{subtareaActiva.titulo || 'Gestión'}</strong> ({horasSubtarea}h)
                </p>
              </div>
            </div>

            {errorMover && (
              <div className="limit-error-banner" role="alert">
                <span aria-hidden="true">⚠️</span> {errorMover}
              </div>
            )}

            {subtareas.length > 1 && (
              <div className="form-field" style={{ margin: '8px 0' }}>
                <label htmlFor="select-subtarea-mover" className="form-label-sm" style={{ fontWeight: 600, color: '#334155' }}>
                  Actividad a reprogramar:
                </label>
                <select
                  id="select-subtarea-mover"
                  className="filter-select"
                  style={{ fontSize: '0.88rem', padding: '7px 10px', width: '100%' }}
                  value={subtareaSeleccionadaId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSubtareaSeleccionadaId(nextId);
                    const nextSub = subtareas.find((s) => s.id === nextId);
                    const nextH = Number(nextSub?.horasEstimadas) || 1;
                    setNuevasHorasMover(nextH > limiteDiario ? String(limiteDiario) : String(nextH));
                  }}
                >
                  {subtareas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.titulo || 'Gestión sin título'} ({s.horasEstimadas}h)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-field" style={{ margin: '10px 0' }}>
              <label className="form-label">
                Nueva fecha límite / Jornada <span className="required-star">*</span>
              </label>
              <DatePickerField
                value={nuevaFecha}
                onChange={(formatted) => {
                  setNuevaFecha(formatted);
                  if (errorMover) setErrorMover('');
                }}
                min={todayStr}
                placeholder="DD/MM/AAAA"
              />
              <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '6px' }}>
                Solo fechas de hoy o futuras disponibles. La actividad conservará su estado actual sin confundirse con una tarea pospuesta.
              </p>
            </div>

            {horasSubtarea > limiteDiario && (
              <div className="form-field" style={{ margin: '10px 0', padding: '10px 12px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px' }}>
                <label htmlFor="input-horas-mover" className="form-label" style={{ fontWeight: 600, color: '#92400E', fontSize: '0.85rem' }}>
                  ⚠️ Esta actividad dura {horasSubtarea}h y supera tu límite diario ({limiteDiario}h). Ajusta también su duración:
                </label>
                <div className="inline-limit-input-group" style={{ marginTop: '6px' }}>
                  <input
                    id="input-horas-mover"
                    type="number"
                    min="0.5"
                    max={limiteDiario}
                    step="0.5"
                    onKeyDown={bloquearTeclasNoNumericas}
                    value={nuevasHorasMover}
                    onChange={(e) => setNuevasHorasMover(e.target.value)}
                    className="input-focus-active"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem' }}
                  />
                  <span className="unit-suffix">hrs</span>
                </div>
              </div>
            )}

            <div className="system-modal-actions" style={{ marginTop: '12px' }}>
              <Button
                variant="neutral"
                type="button"
                onClick={() => setModo('menu')}
                disabled={isSaving}
              >
                Volver
              </Button>
              <Button
                variant="primary"
                type="button"
                onClick={handleConfirmarMover}
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* MODO 3: Reducir Horas Estimadas (Requerimiento 3)               */}
        {/* ============================================================== */}
        {modo === 'reducir' && (
          <form onSubmit={handleConfirmarReducir}>
            <div className="system-modal-header">
              <div className="modal-icon-badge" style={{ backgroundColor: '#FEF3C7' }} aria-hidden="true">
                <span style={{ fontSize: '1.3rem' }}>⏱️</span>
              </div>
              <div>
                <h3 className="system-modal-title">Reducir Horas Estimadas</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '2px' }}>
                  Ajusta la estimación de la tarea al margen disponible de la jornada.
                </p>
              </div>
            </div>

            {successReducir && (
              <div className="limit-success-banner" role="alert" style={{ margin: '10px 0' }}>
                <span aria-hidden="true">✓</span> {successReducir}
              </div>
            )}

            {errorReducir && (
              <div className="limit-error-banner" role="alert" style={{ margin: '10px 0' }}>
                <span aria-hidden="true">⚠️</span> {errorReducir}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '12px 0' }}>
              {/* 1. Nombre/Título de la subtarea afectada */}
              <div className="form-field">
                <label className="form-label-sm" style={{ fontWeight: 600, color: '#334155' }}>
                  Subtarea afectada:
                </label>
                {subtareas.length > 1 ? (
                  <select
                    id="select-subtarea-reducir"
                    className="filter-select"
                    style={{ fontSize: '0.9rem', padding: '8px 12px', width: '100%', fontWeight: 600 }}
                    value={subtareaSeleccionadaId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSubtareaSeleccionadaId(nextId);
                      const nextSub = subtareas.find((s) => s.id === nextId);
                      const hSub = Number(nextSub?.horasEstimadas) || 1;
                      const hOtras = Math.max(0, Math.round((horasTotales - hSub) * 10) / 10);
                      const margen = Math.max(0, Math.round((limiteDiario - hOtras) * 10) / 10);
                      const sug =
                        margen >= 0.5
                          ? Math.min(margen, Math.max(0.5, Math.round((hSub - 0.5) * 10) / 10))
                          : Math.max(0.5, Math.min(limiteDiario, Math.round((hSub - 0.5) * 10) / 10));
                      setNuevasHorasInput(String(sug));
                    }}
                  >
                    {subtareas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.titulo || 'Gestión sin título'} ({s.horasEstimadas}h)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '8px 12px', backgroundColor: '#F1F5F9', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 600, color: '#0F172A', fontSize: '0.9rem' }}>
                    {subtareaActiva.titulo || 'Gestión sin título'}
                  </div>
                )}
              </div>

              {/* 2. Horas actuales de la tarea */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, padding: '10px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>Horas actuales de la tarea:</span>
                  <strong style={{ fontSize: '1.1rem', color: '#DC2626' }}>{horasSubtarea}h</strong>
                </div>

                {/* 3. Indicador de disponibilidad del día (ej. "5h (de 6h límite)") */}
                <div style={{ flex: 1.4, padding: '10px', backgroundColor: '#EFF6FF', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                  <span style={{ fontSize: '0.75rem', color: '#1E40AF', display: 'block' }}>Otras actividades en la jornada:</span>
                  <strong style={{ fontSize: '1rem', color: '#1D4ED8' }}>
                    {horasOtras}h (de {limiteDiario}h límite)
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: '#2563EB', display: 'block', marginTop: '2px' }}>
                    Máximo permitido para esta tarea: <strong>{maxPermitidoReducir}h</strong>
                  </span>
                </div>
              </div>

              {/* 4. Input numérico para "Nuevas horas estimadas" */}
              <div className="form-field">
                <label htmlFor="input-nuevas-horas-subtarea" className="form-label" style={{ fontWeight: 600 }}>
                  Nuevas horas estimadas <span className="required-star">*</span>
                </label>
                <div className="inline-limit-input-group">
                  <input
                    id="input-nuevas-horas-subtarea"
                    type="number"
                    min="0.5"
                    max={maxPermitidoReducir}
                    step="0.5"
                    onKeyDown={bloquearTeclasNoNumericas}
                    placeholder={`Máx ${maxPermitidoReducir}h`}
                    value={nuevasHorasInput}
                    disabled={isSaving || Boolean(successReducir)}
                    onChange={(e) => {
                      setNuevasHorasInput(e.target.value);
                      if (errorReducir) setErrorReducir('');
                    }}
                    className={`input-focus-active ${errorReducir ? 'input-error-border' : ''}`}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.95rem' }}
                  />
                  <span className="unit-suffix">hrs</span>
                </div>
              </div>
            </div>

            <div className="system-modal-actions" style={{ marginTop: '14px' }}>
              <Button
                variant="neutral"
                type="button"
                onClick={() => setModo('menu')}
                disabled={isSaving || Boolean(successReducir)}
              >
                Volver
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isSaving || Boolean(successReducir)}
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Modal de retroalimentación de confirmación o error (Sprint 3) */}
      {feedbackModal.isOpen && (
        <SystemModal
          isOpen={feedbackModal.isOpen}
          type={feedbackModal.type}
          category={feedbackModal.category}
          title={feedbackModal.title}
          message={feedbackModal.message}
          itemName={feedbackModal.itemName}
          overlayClassName="modal-overlay-level-2"
          onClose={feedbackModal.onConfirm}
          onConfirm={feedbackModal.onConfirm}
        />
      )}
    </div>
  );
}
