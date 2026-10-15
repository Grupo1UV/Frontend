import React, { useState, useEffect, useRef } from 'react';
import Button from './Button';
import { useEvents } from '../context/EventsContext';
import { bloquearTeclasNoNumericas } from '../utils/validacionesHoras';
import api from '../services/api';

/**
 * Modal para Configuración de Límite Diario de Horas (Sprint 3)
 * - Define la capacidad diaria en horas (h/día).
 * - Placeholder: "6 horas (por defecto)".
 * - Rango válido estricto: entre 1 y 16 horas.
 * - Mensajes reglamentarios:
 *   - Éxito exacto: "Límite actualizado".
 *   - Error fuera de rango: "El valor debe estar entre 1 y 16".
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
      setValorInput(limiteDiario ? String(limiteDiario) : '');
      setErrorMsg('');
      setSuccessMsg('');
      setIsSaving(false);

      // Consulta del límite actual
      if (typeof api?.getCapacity === 'function') {
        api.getCapacity()
          .then((res) => {
            const val = res?.data?.limitHoursDay ?? res?.limitHoursDay ?? res?.data?.limiteDiario ?? res?.limiteDiario;
            if (val) setValorInput(String(val));
          })
          .catch(() => {
            // Si no hay conexión o no existe perfil previo, conservar el límite local
          });
      }

      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
      return () => clearTimeout(timer);
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

    let n = 6;
    const trimmed = String(valorInput ?? '').trim();
    if (trimmed === '') {
      n = 6;
    } else {
      n = Number(trimmed);
      if (!Number.isFinite(n) || n < 1 || n > 16) {
        setErrorMsg('El valor debe estar entre 1 y 16');
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await cambiarLimiteDiario(n);
      if (res.ok) {
        setSuccessMsg('Límite actualizado');
        setTimeout(() => {
          setIsSaving(false);
          onClose?.();
        }, 800);
      } else {
        setIsSaving(false);
        setErrorMsg(res.error || 'El valor debe estar entre 1 y 16');
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
              Límite Diario
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
