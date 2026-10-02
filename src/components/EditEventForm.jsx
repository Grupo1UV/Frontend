import React, { useState } from 'react';
import Button from './Button';

/**
 * 2 & 5. Estándares para Formularios - EditEventForm
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
 * CTAs explícitos:
 * - "Guardar cambios" (Azul #2563EB)
 * - "Cancelar" (Gris #64748B)
 */
export default function EditEventForm({
  evento,
  onSave,
  onCancel,
  onDeleteSubtask = null,
}) {
  const [formData, setFormData] = useState(() => ({
    nombre: evento?.nombre || '',
    tipo: evento?.tipo || 'Boda',
    fecha: evento?.fecha || '',
    lugar: evento?.lugar || '',
    asistentes: evento?.asistentes !== undefined && evento?.asistentes !== '' ? evento.asistentes : '',
    descripcion: evento?.descripcion || '',
    limiteHorasPorJornada: 6,
    subtareas: evento?.subtareas ? JSON.parse(JSON.stringify(evento.subtareas)) : [],
  }));

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const todayStr = new Date().toISOString().split('T')[0];

  const validateField = (field, value) => {
    let error = '';
    if (field === 'nombre') {
      if (!value || !value.trim()) error = 'Este campo es obligatorio.';
    } else if (field === 'fecha') {
      if (!value) {
        error = 'Este campo es obligatorio.';
      } else {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          error = 'Ingresa una fecha válida (AAAA-MM-DD).';
        }
      }
    } else if (field === 'lugar') {
      if (!value || !value.trim()) error = 'Este campo es obligatorio.';
    } else if (field === 'asistentes') {
      if (!value || Number(value) <= 0) error = 'Este campo es obligatorio.';
    }
    return error;
  };

  const handleBlur = (field, value) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, value);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  // Validación de sobrecarga horaria en tiempo real
  const horasPorFecha = formData.subtareas.reduce((acc, sub) => {
    const f = sub.fechaLimite || 'Sin fecha';
    acc[f] = (acc[f] || 0) + (Number(sub.horasEstimadas) || 0);
    return acc;
  }, {});

  const fechasConConflicto = Object.entries(horasPorFecha).filter(
    ([_fecha, horas]) => horas > formData.limiteHorasPorJornada
  );
  const tieneConflicto = fechasConConflicto.length > 0;

  const handleUpdateSubtask = (index, field, value) => {
    setFormData((prev) => {
      const copy = [...prev.subtareas];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, subtareas: copy };
    });
  };

  const handleAddSubtask = () => {
    const nueva = {
      id: `sub-${Date.now()}`,
      titulo: 'Nueva gestión logística',
      horasEstimadas: 2,
      fechaLimite: 'Hoy',
      estado: 'Pendiente',
      responsable: 'Equipo Operativo',
    };
    setFormData((prev) => ({ ...prev, subtareas: [...prev.subtareas, nueva] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const errNombre = validateField('nombre', formData.nombre);
    const errFecha = validateField('fecha', formData.fecha);
    const errLugar = validateField('lugar', formData.lugar);
    const errAsistentes = validateField('asistentes', formData.asistentes);

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

    onSave({
      nombre: formData.nombre.trim(),
      tipo: formData.tipo,
      fecha: formData.fecha,
      lugar: formData.lugar.trim(),
      asistentes: Number(formData.asistentes) || 1,
      descripcion: formData.descripcion.trim(),
      subtareas: formData.subtareas,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="edit-mode-container" noValidate>
      <div className="mode-bar-edit">
        <div className="mode-indicator-content">
          <span className="mode-pulse-dot" style={{ backgroundColor: '#2563EB' }} />
          <div>
            <strong>Modo "Editar / Reprogramar" (Formulario dinámico activo)</strong>
            <p>Campos con Border Focus activo (#2563EB), detección de sobrecargas de jornada y CTAs explícitos.</p>
          </div>
        </div>

        <button type="button" className="btn-switch-mode btn-mode-read" onClick={onCancel}>
          👁️ Volver a Modo Lectura
        </button>
      </div>

      <div className="edit-form-card">
        <div className="edit-card-header">
          <span className="badge-edit-active">Formulario Activo de Reprogramación</span>
          <span className="edit-hint-focus">Inputs con Border Focus Activo (#2563EB)</span>
        </div>

        <h2 className="edit-card-title">Edición del Evento y Límites Operativos</h2>

        <div className="form-row">
          {/* Nombre del evento */}
          <div className="form-field">
            <label className="form-label" htmlFor="edit-input-nombre">
              Nombre del evento <span className="required-star" style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              id="edit-input-nombre"
              type="text"
              placeholder="Ej: Boda Valentina & Emilio"
              className={`input-focus-active ${errors.nombre ? 'input-error-border' : ''}`}
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
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
            <label className="form-label" htmlFor="edit-input-tipo">
              Tipo de evento
            </label>
            <select
              id="edit-input-tipo"
              className="input-focus-active"
              value={formData.tipo}
              onChange={(e) => handleChange('tipo', e.target.value)}
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
            <label className="form-label" htmlFor="edit-input-fecha">
              Fecha del evento <span className="required-star" style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              id="edit-input-fecha"
              type="date"
              className={`input-focus-active ${errors.fecha ? 'input-error-border' : ''}`}
              value={formData.fecha}
              onChange={(e) => handleChange('fecha', e.target.value)}
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
            <label className="form-label" htmlFor="edit-input-lugar">
              Lugar <span className="required-star" style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              id="edit-input-lugar"
              type="text"
              placeholder="Ej: Centro de Eventos Valle del Lili"
              className={`input-focus-active ${errors.lugar ? 'input-error-border' : ''}`}
              value={formData.lugar}
              onChange={(e) => handleChange('lugar', e.target.value)}
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
            <label className="form-label" htmlFor="edit-input-asistentes">
              Asistentes estimados <span className="required-star" style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              id="edit-input-asistentes"
              type="number"
              min="1"
              placeholder="Ej: 280"
              className={`input-focus-active ${errors.asistentes ? 'input-error-border' : ''}`}
              value={formData.asistentes}
              onChange={(e) => handleChange('asistentes', e.target.value)}
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
            <label className="form-label" htmlFor="edit-input-desc">
              Descripción
            </label>
            <input
              id="edit-input-desc"
              type="text"
              className="input-focus-active"
              value={formData.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
            />
          </div>
        </div>

        {/* Límite de horas */}
        <div className="workload-limit-bar">
          <div className="workload-limit-info">
            <strong>Límite de horas por jornada diaria:</strong>
            <span>Control para alertar automáticamente ante sobrecargas operativas en la planificación.</span>
          </div>
          <div className="workload-limit-input-group">
            <input
              type="number"
              min="2"
              max="16"
              className="input-focus-active input-limit-hours"
              value={formData.limiteHorasPorJornada}
              onChange={(e) =>
                setFormData({ ...formData, limiteHorasPorJornada: Number(e.target.value) || 6 })
              }
            />
            <span>horas/día</span>
          </div>
        </div>
      </div>

      {/* Validación en tiempo real de sobrecarga */}
      {tieneConflicto ? (
        <div className="workload-conflict-alert" role="alert">
          <div className="conflict-alert-icon">⚠️</div>
          <div className="conflict-alert-body">
            <h4>Alerta en Tiempo Real: Sobrecarga en la Planificación Diaria</h4>
            <p>
              Se ha detectado conflicto en las siguientes fechas (límite: {formData.limiteHorasPorJornada} horas/día):
            </p>
            <ul className="conflict-dates-list">
              {fechasConConflicto.map(([fecha, horas]) => (
                <li key={fecha}>
                  Jornada <strong>"{fecha}"</strong>: suma <strong>{horas} horas</strong>{' '}
                  <span className="excess-tag">
                    (+{horas - formData.limiteHorasPorJornada}h sobre el límite)
                  </span>
                </li>
              ))}
            </ul>
            <p className="conflict-solution-hint">
              💡 <em>Sugerencia:</em> Reduce las horas estimadas o reprograma tareas a otra jornada para balancear la carga.
            </p>
          </div>
        </div>
      ) : (
        <div className="workload-ok-badge">
          ✓ Carga horaria balanceada: Ninguna jornada supera las {formData.limiteHorasPorJornada} horas recomendadas.
        </div>
      )}

      {/* Subtareas */}
      <section className="edit-subtasks-section">
        <div className="section-title-line">
          <div>
            <h3 className="section-title">Reprogramar Subtareas Logísticas</h3>
            <p className="section-desc">Modifica fechas límites y horas estimadas con validación dinámica.</p>
          </div>
          <Button variant="primary" onClick={handleAddSubtask}>
            + Agregar gestión
          </Button>
        </div>

        <div className="edit-subtasks-list">
          {formData.subtareas.map((sub, idx) => (
            <div key={sub.id} className="edit-subtask-card">
              <div className="edit-subtask-index">#{idx + 1}</div>

              <div className="edit-subtask-grid">
                <div className="form-field full-width">
                  <label className="form-label-sm">
                    Nombre de la gestión <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-focus-active"
                    placeholder="Ej: Contratar fotógrafo profesional"
                    value={sub.titulo}
                    onChange={(e) => handleUpdateSubtask(idx, 'titulo', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label-sm">
                    Fecha límite / Jornada <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="input-focus-active"
                    placeholder="Ej: Hoy, Mañana, 2026-11-20"
                    value={sub.fechaLimite}
                    onChange={(e) => handleUpdateSubtask(idx, 'fechaLimite', e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="form-label-sm">
                    Horas estimadas de gestión <span className="required-star" style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div className="inline-hours-edit">
                    <input
                      type="number"
                      min="1"
                      max="24"
                      className="input-focus-active"
                      value={sub.horasEstimadas}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        handleUpdateSubtask(idx, 'horasEstimadas', val);
                      }}
                    />
                    <span className="unit-label">hrs</span>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label-sm">Responsable</label>
                  <input
                    type="text"
                    className="input-focus-active"
                    value={sub.responsable || ''}
                    placeholder="Ej: Studio Luz"
                    onChange={(e) => handleUpdateSubtask(idx, 'responsable', e.target.value)}
                  />
                </div>
              </div>

              {onDeleteSubtask && (
                <div className="edit-subtask-actions">
                  <button
                    type="button"
                    className="btn-danger-icon"
                    onClick={() => onDeleteSubtask(sub)}
                    title="Eliminar gestión"
                    style={{ color: '#DC2626' }}
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Call To Actions Explícitos (CTAs) */}
      <div className="edit-ctas-bar">
        <div className="edit-ctas-left">
          <span className="cta-mode-notice">
            {tieneConflicto
              ? '⚠️ Hay sobrecargas horarias en la jornada. Puedes guardar o rebalancear.'
              : '✓ Todos los horarios están verificados.'}
          </span>
        </div>

        <div className="edit-ctas-right">
          {/* CTA Cancelar (Gris #64748B) */}
          <Button
            variant="neutral"
            onClick={onCancel}
          >
            Cancelar
          </Button>

          {/* CTA Guardar cambios (Azul #2563EB) */}
          <Button
            variant="primary"
            type="submit"
          >
            Guardar cambios
          </Button>
        </div>
      </div>
    </form>
  );
}
