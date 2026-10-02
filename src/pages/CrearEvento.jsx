import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import SystemModal from '../components/SystemModal';
import Button from '../components/Button';

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
  const { crearEvento } = useEvents();

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

  // Errores de validación inline
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Modal de éxito del sistema
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEventId, setCreatedEventId] = useState(null);

  // Fecha de hoy en formato AAAA-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

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
      if (Number(value) <= 0) {
        error = 'Las horas estimadas de gestión deben ser mayores a 0.';
      }
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

  const agregarSubtarea = (e) => {
    e.preventDefault();
    const horasNum = Number(nuevasHoras);
    if (horasNum <= 0) {
      setErrors((prev) => ({ ...prev, nuevasHoras: 'Las horas estimadas de gestión deben ser mayores a 0.' }));
      return;
    }
    if (!nuevaSubtarea.trim()) {
      setErrors((prev) => ({ ...prev, nuevaSubtarea: 'Este campo es obligatorio.' }));
      return;
    }

    setSubtareasPlan((prev) => [
      ...prev,
      {
        id: `plan-${Date.now()}`,
        titulo: nuevaSubtarea.trim(),
        horasEstimadas: horasNum,
        fechaLimite: 'Próxima semana',
        responsable: 'Equipo Logístico',
      },
    ]);
    setNuevaSubtarea('');
    setNuevasHoras(2);
    setErrors((prev) => ({ ...prev, nuevaSubtarea: '', nuevasHoras: '' }));
  };

  const quitarSubtarea = (id) => {
    setSubtareasPlan((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errNombre = validateField('nombre', nombre);
    const errFecha = validateField('fecha', fecha);
    const errLugar = validateField('lugar', lugar);
    const errAsistentes = validateField('asistentes', asistentes);

    const newErrors = {
      nombre: errNombre,
      fecha: errFecha,
      lugar: errLugar,
      asistentes: errAsistentes,
    };

    setErrors(newErrors);
    setTouched({ nombre: true, fecha: true, lugar: true, asistentes: true });

    if (errNombre || errFecha || errLugar || errAsistentes) {
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

            {/* Agregar subtarea adicional */}
            <div className="add-subtask-quick-box">
              <div className="subtask-inputs-row">
                <div className="form-field field-grow">
                  <label className="form-label-sm">Nombre de la gestión</label>
                  <input
                    type="text"
                    placeholder="Ej: Contratar ambientación musical y DJ"
                    className="input-focus-active"
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
                  <label className="form-label-sm">
                    Horas estimadas de gestión <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input-focus-active"
                    value={nuevasHoras}
                    onChange={(e) => setNuevasHoras(e.target.value)}
                  />
                  {errors.nuevasHoras && (
                    <span className="inline-error-text" style={{ color: '#DC2626' }}>
                      {errors.nuevasHoras}
                    </span>
                  )}
                </div>

                <div className="add-subtask-btn-wrapper">
                  <Button variant="primary" onClick={agregarSubtarea}>
                    + Agregar gestión
                  </Button>
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
    </div>
  );
}
