import React, { useRef } from 'react';
import { hoyIso, isoToDisplayDate, displayDateToIso } from '../utils/validacionesHoras';

/**
 * Componente Selector de Fecha con Picker Interactivo (Eventify)
 * - Muestra estrictamente el formato DD/MM/AAAA.
 * - Deshabilita fechas pasadas (hoy y futuras habilitadas).
 * - Despliega el picker interactivo del calendario al hacer clic en el campo o en el ícono.
 */
export default function DatePickerField({
  id,
  value = '',
  onChange,
  min = hoyIso(),
  max,
  placeholder = 'DD/MM/AAAA',
  className = '',
  hasError = false,
  required = false,
  disabled = false,
}) {
  const nativeDateRef = useRef(null);

  // Asegurar formato AAAA-MM-DD para el input nativo
  const isoValue = value
    ? /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? value
      : displayDateToIso(value)
    : '';

  // Asegurar formato estricto DD/MM/AAAA para la visualización en el input
  const displayValue = value
    ? /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)
      ? value
      : isoToDisplayDate(value)
    : '';

  const handleOpenPicker = () => {
    if (disabled) return;
    if (nativeDateRef.current) {
      if (typeof nativeDateRef.current.showPicker === 'function') {
        try {
          nativeDateRef.current.showPicker();
          return;
        } catch {
          // Si el navegador bloquea showPicker(), enfocar el input
        }
      }
      nativeDateRef.current.focus();
    }
  };

  const handleDateChange = (e) => {
    const rawIso = e.target.value;
    if (!rawIso) {
      onChange('', '');
      return;
    }
    const formatted = isoToDisplayDate(rawIso);
    onChange(formatted, rawIso);
  };

  return (
    <div
      className={`datepicker-field-wrapper ${hasError ? 'datepicker-error' : ''} ${disabled ? 'datepicker-disabled' : ''}`}
      onClick={handleOpenPicker}
    >
      {/* Campo visible con formato estricto DD/MM/AAAA */}
      <input
        id={id}
        type="text"
        readOnly
        placeholder={placeholder}
        value={displayValue}
        className={`datepicker-display-input input-focus-active ${hasError ? 'input-error-border' : ''} ${className}`}
        required={required}
        disabled={disabled}
      />

      {/* Ícono interactivo de calendario */}
      <button
        type="button"
        className="datepicker-calendar-btn"
        onClick={(e) => {
          e.stopPropagation();
          handleOpenPicker();
        }}
        tabIndex={-1}
        title="Abrir selector de fecha"
        aria-label="Abrir selector de fecha"
      >
        📅
      </button>

      {/* Input nativo que controla las restricciones (min = hoy) y levanta el picker */}
      <input
        ref={nativeDateRef}
        type="date"
        min={min || hoyIso()}
        max={max || undefined}
        value={isoValue}
        onChange={handleDateChange}
        className="datepicker-native-hidden"
        tabIndex={-1}
        aria-hidden="true"
        disabled={disabled}
      />
    </div>
  );
}
