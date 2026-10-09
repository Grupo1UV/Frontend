import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import SystemModal from '../components/SystemModal';
import Button from '../components/Button';
import DatePickerField from '../components/DatePickerField';
import ConflictoSobrecargaModal from '../components/ConflictoSobrecargaModal';
import {
  HORAS_MAX_GESTION,
  HORAS_MIN_GESTION,
  LIMITE_JORNADA_DEFAULT,
  LIMITE_JORNADA_MAX,
  LIMITE_JORNADA_MIN,
  bloquearTeclasNoNumericas,
  horasPorJornada,
  hoyIso,
  jornadasExcedidas,
  normalizarJornada,
  validarHorasGestion,
  isoToDisplayDate,
} from '../utils/validacionesHoras';

/**
 * 2. Estándares para Formularios - Crear Evento
 *
 * Labels cortas, claras y siempre visibles:
 * - "Nombre del evento"
 * - "Fecha del evento"
 * - "Lugar"
 * - "Asistentes estimados"
 * - "Horas estimadas de gestión"
 *
 * Placeholders: Textos de ejemplo reales ("Ej: Boda Valentina & Emilio", "Ej: Centro de Eventos Valle del Lili").
 * Indicador Requerido: Asterisco rojo (*) en campos obligatorios (#DC2626).
 * Validaciones Inline (Texto Rojo #DC2626 debajo del campo):
 * - Campo vacío: "Este campo es obligatorio."
 * - Formato de fecha: "Ingresa una fecha válida (AAAA-MM-DD)."
 * - Lógica de eventos: "La fecha del evento debe ser posterior a la fecha actual."
 * - Lógica de gestión: "Las horas estimadas de gestión deben ser mayores a 0."
 *
 * Modal de Éxito al guardar: "Evento Guardado" / "El evento ha sido guardado de manera exitosa."
 */
export default function CrearEvento() {
  const navigate = useNavigate();
  const { crearEvento, limiteDiario } = useEvents();

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Boda');
  const [fecha, setFecha] = useState('');
  const [lugar, setLugar] = useState('');
  const [asistentes, setAsistentes] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Subtareas iniciales (comienza vacío para que el usuario agregue las suyas)
  const [subtareasPlan, setSubtareasPlan] = useState([]);

  const [nuevaSubtarea, setNuevaSubtarea] = useState('');
  const [nuevasHoras, setNuevasHoras] = useState(2);
  const [nuevaFechaLimite, setNuevaFechaLimite] = useState('');
  const limiteJornada = limiteDiario || LIMITE_JORNADA_DEFAULT;

  // Estado del Modal de Conflicto de Sobrecarga (Sprint 3)
  const [conflictoModalState, setConflictoModalState] = useState({
    isOpen: false,
    data: null,
  });

  // Errores de validación inline
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Modal de éxito del sistema
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEventId, setCreatedEventId] = useState(null);

  // Fecha local de hoy (AAAA-MM-DD). toISOString() usa UTC y en Colombia
  // devolvía el día siguiente después de las 7 p. m.
  const todayStr = hoyIso();

  // Función de validación inline
  const validateField = (field, value) => {
    let error = '';

    if (field === 'nombre') {
      if (!value || !value.trim()) {
        error = 'Este campo es obligatorio.';
      }
    } else if (field === 'fecha') {
      if (!value) {
        error = 'Este campo es obligatorio.';
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          error = 'Ingresa una fecha válida (AAAA-MM-DD).';
        } else if (value < todayStr) {
          error = 'La fecha del evento no puede ser anterior a hoy.';
        }
      }
    } else if (field === 'lugar') {
      if (!value || !value.trim()) {
        error = 'Este campo es obligatorio.';
      }
    } else if (field === 'asistentes') {
      if (!value || Number(value) <= 0) {
        error = 'Este campo es obligatorio.';
      }
    } else if (field === 'nuevasHoras') {
      error = validarHorasGestion(value);
    }

    return error;
  };

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field, value, setter) => {
    setter(value);
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  // Horas ya planificadas por jornada (para validar el límite diario en vivo)
  const cargaPorJornada = horasPorJornada(subtareasPlan);
  const excedidas = jornadasExcedidas(subtareasPlan, limiteJornada);

  const agregarSubtarea = (e) => {
    e.preventDefault();
    const nuevosErrores = { nuevaSubtarea: '', nuevasHoras: '', nuevaFechaLimite: '' };

    if (!nuevaSubtarea.trim()) {
      nuevosErrores.nuevaSubtarea = 'Este campo es obligatorio.';
    }

    nuevosErrores.nuevasHoras = validarHorasGestion(nuevasHoras);

    // Si no se elige fecha, la gestión vence el día del evento (o hoy si aún no hay fecha)
    const fechaElegida = nuevaFechaLimite || (fecha ? isoToDisplayDate(fecha) : isoToDisplayDate(todayStr));
    const fechaGestionIso = normalizarJornada(fechaElegida);
    const fechaGestionDisplay = isoToDisplayDate(fechaGestionIso);

    if (fechaGestionIso < todayStr) {
      nuevosErrores.nuevaFechaLimite = 'La fecha límite no puede ser anterior a hoy.';
    } else if (fecha && fechaGestionIso > fecha) {
      nuevosErrores.nuevaFechaLimite = 'La gestión debe vencer antes o el mismo día del evento.';
    }

    // Sprint 3: Validación dinámica de sobrecarga por jornada -> abre modal de conflicto
    const horasNum = Number(nuevasHoras);
    if (!nuevosErrores.nuevaSubtarea && !nuevosErrores.nuevasHoras && !nuevosErrores.nuevaFechaLimite) {
      const yaAsignadas = cargaPorJornada[fechaGestionIso] || 0;
      if (yaAsignadas + horasNum > limiteJornada) {
        const subsDelDia = subtareasPlan.filter(
          (s) => normalizarJornada(s.fechaLimite) === fechaGestionIso
        );
        const subNueva = {
          id: `plan-${Date.now()}`,
          titulo: nuevaSubtarea.trim(),
          horasEstimadas: horasNum,
          fechaLimite: fechaGestionDisplay,
          responsable: 'Equipo Logístico',
        };
        setConflictoModalState({
          isOpen: true,
          data: {
            fecha: fechaGestionIso,
            fechaDisplay: fechaGestionDisplay,
            horasTotales: Math.round((yaAsignadas + horasNum) * 10) / 10,
            limiteDiario: limiteJornada,
            subtareas: [...subsDelDia, subNueva],
            subtareaAfectada: subNueva,
          },
        });
        return;
      }
    }

    setErrors((prev) => ({ ...prev, ...nuevosErrores }));
    if (nuevosErrores.nuevaSubtarea || nuevosErrores.nuevasHoras || nuevosErrores.nuevaFechaLimite) {
      return;
    }

    setSubtareasPlan((prev) => [
      ...prev,
      {
        id: `plan-${Date.now()}`,
        titulo: nuevaSubtarea.trim(),
        horasEstimadas: horasNum,
        fechaLimite: fechaGestionDisplay,
        responsable: 'Equipo Logístico',
      },
    ]);
    setNuevaSubtarea('');
    setNuevasHoras(2);
    setNuevaFechaLimite('');
  };

  const quitarSubtarea = (id) => {
    setSubtareasPlan((prev) => prev.filter((s) => s.id !== id));
  };

  // Sprint 3: Resolver conflicto en Crear Evento - Mover a otro día
  const handleResolverConflictoMover = (subtask, nuevaFechaDisplay) => {
    setSubtareasPlan((prev) => {
      const exists = prev.some((s) => s.id === subtask.id);
      if (exists) {
        return prev.map((s) =>
          s.id === subtask.id
            ? { ...s, fechaLimite: nuevaFechaDisplay, estado: 'POSTERGADA' }
            : s
        );
      }
      return [
        ...prev,
        {
          ...subtask,
          fechaLimite: nuevaFechaDisplay,
          estado: 'POSTERGADA',
        },
      ];
    });
    setNuevaSubtarea('');
    setNuevasHoras(2);
    setNuevaFechaLimite('');
    return { ok: true };
  };

  // Sprint 3: Resolver conflicto en Crear Evento - Reducir horas estimadas
  const handleResolverConflictoReducir = (subtask, nuevasHoras) => {
    setSubtareasPlan((prev) => {
      const exists = prev.some((s) => s.id === subtask.id);
      if (exists) {
        return prev.map((s) =>
          s.id === subtask.id
            ? { ...s, horasEstimadas: nuevasHoras }
            : s
        );
      }
      return [
        ...prev,
        {
          ...subtask,
          horasEstimadas: nuevasHoras,
        },
      ];
    });
    setNuevaSubtarea('');
    setNuevasHoras(2);
    setNuevaFechaLimite('');
    return { ok: true };
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errNombre = validateField('nombre', nombre);
    const errFecha = validateField('fecha', fecha);
    const errLugar = validateField('lugar', lugar);
    const errAsistentes = validateField('asistentes', asistentes);

    // Sprint 3 (Requerimiento 2): Si la suma supera el límite diario, bloquea el guardado directo y despliega modal
    if (excedidas.length > 0) {
      const primera = excedidas[0];
      const subs = subtareasPlan.filter((s) => normalizarJornada(s.fechaLimite) === primera[0]);
      setConflictoModalState({
        isOpen: true,
        data: {
          fecha: primera[0],
          fechaDisplay: isoToDisplayDate(primera[0]),
          horasTotales: primera[1],
          limiteDiario: limiteJornada,
          subtareas: subs,
          subtareaAfectada: subs[subs.length - 1] || subs[0],
        },
      });
      return;
    }

    const gestionesFueraDeFecha = fecha
      ? subtareasPlan.filter((s) => s.fechaLimite > fecha)
      : [];
    let errPlan = '';
    if (gestionesFueraDeFecha.length > 0) {
      errPlan = 'Hay gestiones que vencen después de la fecha del evento.';
    }

    const newErrors = {
      nombre: errNombre,
      fecha: errFecha,
      lugar: errLugar,
      asistentes: errAsistentes,
      plan: errPlan,
    };

    setErrors((prev) => ({ ...prev, ...newErrors }));
    setTouched({ nombre: true, fecha: true, lugar: true, asistentes: true });

    if (errNombre || errFecha || errLugar || errAsistentes || errPlan) {
      return;
    }

    const nuevoId = crearEvento({
      nombre: nombre.trim(),
      tipo,
      fecha,
      lugar: lugar.trim(),
      asistentes: Number(asistentes) || 1,
      descripcion: descripcion.trim(),
      subtareas: subtareasPlan.map((s, index) => ({
        id: `sub-${Date.now()}-${index}`,
        titulo: s.titulo,
        horasEstimadas: Number(s.horasEstimadas) || 1,
        fechaLimite: s.fechaLimite,
        estado: 'Pendiente',
        responsable: s.responsable,
      })),
    });

    setCreatedEventId(nuevoId);
    setShowSuccessModal(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    navigate(`/evento/${createdEventId}`);
  };

  return (
    <div className="page-wrapper">
      <div className="form-page-container">
        <header className="page-intro-header">
          <span className="eyebrow-tag">Planificación Logística</span>
          <h1 className="page-main-heading">Crear evento y plan inicial</h1>
          <p className="page-lead">
            Registra los datos generales de tu proyecto y define su plan inicial de tareas logísticas.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="modern-form-card" noValidate>
          {/* Sección 1: Información del Evento */}
          <div className="form-group-section">
            <h3 className="form-section-title">1. Información del Evento</h3>

            <div className="form-row">
              {/* Nombre del evento */}
              <div className="form-field">
                <label htmlFor="evt-nombre" className="form-label">
                  Nombre del evento <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="evt-nombre"
                  type="text"
                  placeholder="Ej: Boda Valentina & Emilio"
                  className={`input-focus-active ${errors.nombre ? 'input-error-border' : ''}`}
                  value={nombre}
                  onChange={(e) => handleChange('nombre', e.target.value, setNombre)}
                  onBlur={(e) => handleBlur('nombre', e.target.value)}
                />
                {errors.nombre && (
                  <span className="inline-error-text" style={{ color: '#DC2626' }}>
                    {errors.nombre}
                  </span>
                )}
              </div>

              {/* Tipo de evento */}
              <div className="form-field">
                <label htmlFor="evt-tipo" className="form-label">
                  Tipo de evento
                </label>
                <select
                  id="evt-tipo"
                  className="input-focus-active"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option value="Boda">Boda</option>
                  <option value="Corporativo">Corporativo / Congreso</option>
                  <option value="Institucional">Institucional / Ceremonia</option>
                  <option value="Cultural">Cultural / Festival</option>
                  <option value="Social">Social / Celebración</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              {/* Fecha del evento */}
              <div className="form-field">
                <label htmlFor="evt-fecha" className="form-label">
                  Fecha del evento <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="evt-fecha"
                  type="date"
                  min={todayStr}
                  className={`input-focus-active ${errors.fecha ? 'input-error-border' : ''}`}
                  value={fecha}
                  onChange={(e) => handleChange('fecha', e.target.value, setFecha)}
                  onBlur={(e) => handleBlur('fecha', e.target.value)}
                />
                {errors.fecha && (
                  <span className="inline-error-text" style={{ color: '#DC2626' }}>
                    {errors.fecha}
                  </span>
                )}
              </div>

              {/* Lugar */}
              <div className="form-field">
                <label htmlFor="evt-lugar" className="form-label">
                  Lugar <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="evt-lugar"
                  type="text"
                  placeholder="Ej: Centro de Eventos Valle del Lili"
                  className={`input-focus-active ${errors.lugar ? 'input-error-border' : ''}`}
                  value={lugar}
                  onChange={(e) => handleChange('lugar', e.target.value, setLugar)}
                  onBlur={(e) => handleBlur('lugar', e.target.value)}
                />
                {errors.lugar && (
                  <span className="inline-error-text" style={{ color: '#DC2626' }}>
                    {errors.lugar}
                  </span>
                )}
              </div>
            </div>

            <div className="form-row">
              {/* Asistentes estimados */}
              <div className="form-field">
                <label htmlFor="evt-asistentes" className="form-label">
                  Asistentes estimados <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  id="evt-asistentes"
                  type="number"
                  min="1"
                  placeholder="Ej: 280"
                  className={`input-focus-active ${errors.asistentes ? 'input-error-border' : ''}`}
                  value={asistentes}
                  onChange={(e) => handleChange('asistentes', e.target.value, setAsistentes)}
                  onBlur={(e) => handleBlur('asistentes', e.target.value)}
                />
                {errors.asistentes && (
                  <span className="inline-error-text" style={{ color: '#DC2626' }}>
                    {errors.asistentes}
                  </span>
                )}
              </div>

              {/* Descripción */}
              <div className="form-field">
                <label htmlFor="evt-desc" className="form-label">
                  Descripción
                </label>
                <input
                  id="evt-desc"
                  type="text"
                  placeholder="Ej: Organización y logística para recepción privada"
                  className="input-focus-active"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sección 2: Plan Inicial de Subtareas */}
          <div className="form-group-section">
            <div className="form-section-header">
              <div>
                <h3 className="form-section-title">2. Plan Inicial de Gestiones Logísticas</h3>
                <p className="form-section-hint">
                  Estructura las gestiones principales para arrancar el seguimiento operativo.
                </p>
              </div>
              <span className="badge-plan-count">{subtareasPlan.length} gestiones</span>
            </div>

            <div className="plan-tasks-preview-list">
              {subtareasPlan.length === 0 ? (
                <div className="plan-tasks-empty-notice">
                  <span className="empty-tasks-icon" aria-hidden="true">📋</span>
                  <p>
                    No hay gestiones logísticas agregadas aún. Puedes ingresar tus gestiones en el formulario de abajo o crearlas más adelante.
                  </p>
                </div>
              ) : (
                subtareasPlan.map((sub, idx) => (
                  <div key={sub.id} className="plan-task-pill-card">
                    <span className="plan-task-num">#{idx + 1}</span>
                    <div className="plan-task-details">
                      <strong>{sub.titulo}</strong>
                      <span className="plan-task-meta">
                        ⏱️ {sub.horasEstimadas}h • 👤 {sub.responsable} • Vence: {sub.fechaLimite}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-remove-subtask"
                      onClick={() => quitarSubtarea(sub.id)}
                      title="Quitar gestión"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Carga horaria por jornada (validación dinámica) */}
            {subtareasPlan.length > 0 && (
              <div className="jornada-load-list" aria-live="polite">
                {Object.entries(cargaPorJornada).map(([jornada, horas]) => (
                  <span
                    key={jornada}
                    className={`jornada-load-chip ${horas > limiteJornada ? 'is-over' : ''}`}
                  >
                    {jornada}: <strong>{horas} / {limiteJornada} h</strong>
                  </span>
                ))}
              </div>
            )}

            {errors.plan && (
              <span className="inline-error-text" role="alert" style={{ color: '#DC2626' }}>
                {errors.plan}
              </span>
            )}

            {/* Agregar subtarea adicional */}
            <div className="add-subtask-quick-box">
              <div className="subtask-inputs-row">
                <div className="form-field field-grow">
                  <label className="form-label-sm" htmlFor="nueva-gestion-nombre">
                    Nombre de la gestión <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    id="nueva-gestion-nombre"
                    type="text"
                    placeholder="Ej: Contratar ambientación musical y DJ"
                    className={`input-focus-active ${errors.nuevaSubtarea ? 'input-error-border' : ''}`}
                    value={nuevaSubtarea}
                    onChange={(e) => setNuevaSubtarea(e.target.value)}
                  />
                  {errors.nuevaSubtarea && (
                    <span className="inline-error-text" style={{ color: '#DC2626' }}>
                      {errors.nuevaSubtarea}
                    </span>
                  )}
                </div>

                <div className="form-field field-hours">
                  <label className="form-label-sm" htmlFor="nueva-gestion-horas">
                    Horas estimadas de gestión <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    id="nueva-gestion-horas"
                    type="number"
                    inputMode="decimal"
                    min={HORAS_MIN_GESTION}
                    max={HORAS_MAX_GESTION}
                    step="0.5"
                    className={`input-focus-active ${errors.nuevasHoras ? 'input-error-border' : ''}`}
                    value={nuevasHoras}
                    onKeyDown={bloquearTeclasNoNumericas}
                    onChange={(e) => handleChange('nuevasHoras', e.target.value, setNuevasHoras)}
                    onBlur={(e) => handleBlur('nuevasHoras', e.target.value)}
                  />
                  {errors.nuevasHoras && (
                    <span className="inline-error-text" style={{ color: '#DC2626' }}>
                      {errors.nuevasHoras}
                    </span>
                  )}
                </div>

                <div className="form-field field-date">
                  <label className="form-label-sm" htmlFor="nueva-gestion-fecha">
                    Fecha límite / Jornada <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <DatePickerField
                    id="nueva-gestion-fecha"
                    value={nuevaFechaLimite}
                    onChange={(formatted) => {
                      setNuevaFechaLimite(formatted);
                      if (errors.nuevaFechaLimite) {
                        setErrors((prev) => ({ ...prev, nuevaFechaLimite: '' }));
                      }
                    }}
                    min={todayStr}
                    max={fecha || undefined}
                    placeholder="DD/MM/AAAA"
                    hasError={!!errors.nuevaFechaLimite}
                  />
                  {errors.nuevaFechaLimite && (
                    <span className="inline-error-text" style={{ color: '#DC2626' }}>
                      {errors.nuevaFechaLimite}
                    </span>
                  )}
                </div>

                <div className="form-field field-limit">
                  <label className="form-label-sm" htmlFor="limite-jornada">
                    Límite por jornada (h)
                  </label>
                  <input
                    id="limite-jornada"
                    type="number"
                    min={LIMITE_JORNADA_MIN}
                    max={LIMITE_JORNADA_MAX}
                    className="input-focus-active"
                    value={limiteJornada}
                    onKeyDown={bloquearTeclasNoNumericas}
                    onChange={(e) => {
                      const n = Math.round(Number(e.target.value));
                      setLimiteJornada(
                        Math.min(Math.max(n || LIMITE_JORNADA_MIN, LIMITE_JORNADA_MIN), LIMITE_JORNADA_MAX)
                      );
                    }}
                  />
                </div>

                <div className="add-subtask-btn-wrapper">
                  <button
                    type="button"
                    className="btn-add-subtask-compact"
                    onClick={agregarSubtarea}
                    title="Añadir nueva gestión logística"
                    aria-label="Añadir nueva gestión logística"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Botones de acción (CTAs) */}
          <div className="form-cta-row">
            <Button
              variant="neutral"
              onClick={() => navigate('/eventos')}
            >
              Cancelar
            </Button>

            <Button
              variant="primary"
              type="submit"
            >
              Crear evento
            </Button>
          </div>
        </form>
      </div>

      {/* Modal de Éxito: Evento Guardado */}
      <SystemModal
        isOpen={showSuccessModal}
        type="evento_guardado"
        onClose={handleCloseSuccess}
        onConfirm={handleCloseSuccess}
      />

      {/* Modal de Conflicto de Sobrecarga (Sprint 3) */}
      <ConflictoSobrecargaModal
        isOpen={conflictoModalState.isOpen}
        conflictoData={conflictoModalState.data}
        onClose={() => setConflictoModalState({ isOpen: false, data: null })}
        onResolverMover={handleResolverConflictoMover}
        onResolverReducir={handleResolverConflictoReducir}
      />
    </div>
  );
}
