import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import { useEvents } from '../context/EventsContext';
import { bloquearTeclasNoNumericas } from '../utils/validacionesHoras';

/**
 * Modal para Configuración de Límite Diario de Horas (Sprint 3)
 * - Define la capacidad diaria en horas (h/día).
 * - Placeholder: "6 horas (por defecto)".
 * - Rango válido estricto: entre 1 y 16 horas.
 * - Mensajes reglamentarios:
 *   - Éxito: "Se cambió exitosamente el límite diario".
 *   - Error fuera de rango: "El valor debe estar entre 1 y 16 horas".
 */
export default function ConfigurarLimiteModal({ isOpen = false, onClose }) {
  const { limiteDiario, cambiarLimiteDiario } = useEvents();
  const [valorInput, setValorInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      try {
        setValorInput(limiteDiario ? String(limiteDiario) : '');
        setErrorMsg('');
        setSuccessMsg('');
        setIsSaving(false);
        const timer = setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
        }, 50);
        return () => clearTimeout(timer);
      } catch (err) {
        console.error('Error al inicializar límite actual:', err);
        setErrorMsg('No se pudo cargar el límite actual');
      }
    }
  }, [isOpen, limiteDiario]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isSaving) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (valorInput === '' || valorInput === null || valorInput === undefined) {
      setErrorMsg('El valor debe estar entre 1 y 16 horas');
      return;
    }

    const n = Number(valorInput);
    if (!Number.isFinite(n) || n < 1 || n > 16) {
      setErrorMsg('El valor debe estar entre 1 y 16 horas');
      return;
    }

    setIsSaving(true);
    try {
      const res = await cambiarLimiteDiario(n);
      if (res.ok) {
        setSuccessMsg('Se cambió exitosamente el límite diario');
        setTimeout(() => {
          setIsSaving(false);
          onClose?.();
        }, 800);
      } else {
        setIsSaving(false);
        setErrorMsg(res.error || 'El valor debe estar entre 1 y 16 horas');
      }
    } catch {
      setIsSaving(false);
      setErrorMsg('No se pudo cargar el límite actual');
    }
  };

  return (
    <div
      className="modal-overlay-focus"
      role="dialog"
      aria-modal="true"
      aria-labelledby="config-limit-title"
    >
      <div className="system-modal-card modal-card-limit">
        <div className="system-modal-header">
          <div className="modal-icon-badge icon-badge-limit" aria-hidden="true">
            <span style={{ fontSize: '1.4rem' }}>⏱️</span>
          </div>
          <div>
            <h3 id="config-limit-title" className="system-modal-title">
              Configuración de Capacidad Diaria
            </h3>
            <p className="system-modal-desc" style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '2px' }}>
              Define tu margen máximo de horas trabajables por jornada (h/día).
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="limit-success-banner" role="alert">
            <span aria-hidden="true">✓</span> {successMsg}
          </div>
        )}

        {errorMsg && (
          <div className="limit-error-banner" role="alert">
            <span aria-hidden="true">⚠️</span> {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="limit-config-form">
          <div className="form-field">
            <label htmlFor="input-limite-horas" className="form-label">
              Límite diario <span className="required-star">*</span>
            </label>
            <div className="inline-limit-input-group">
              <input
                ref={inputRef}
                id="input-limite-horas"
                type="number"
                min="1"
                max="16"
                step="0.5"
                onKeyDown={bloquearTeclasNoNumericas}
                placeholder="6 horas (por defecto)"
                value={valorInput}
                disabled={isSaving}
                onChange={(e) => {
                  setValorInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                className={`input-focus-active ${errorMsg ? 'input-error-border' : ''}`}
                style={{ width: '100%', padding: '10px 12px', fontSize: '1rem' }}
              />
              <span className="unit-suffix">h/día</span>
            </div>
            <p className="field-hint-text" style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              Rango operativo permitido: estrictamente de 1 a 16 horas diarias.
            </p>
          </div>

          <div className="system-modal-actions" style={{ marginTop: '16px' }}>
            <Button
              variant="neutral"
              type="button"
              disabled={isSaving}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
