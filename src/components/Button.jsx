import React from 'react';

/**
 * Design Tokens y Estándares de Botones (CTAs)
 *
 * Variantes estándar:
 * - primary (#2563EB - Azul): Acciones principales ("Crear evento", "Agregar gestión", "Guardar cambios", "Aceptar").
 * - neutral (#64748B - Gris/Blanco): Acciones secundarias o de retorno ("Cancelar", "Volver a eventos", "Ver detalle logístico").
 * - danger (#DC2626 - Rojo): Acciones destructivas o de cierre de error ("Eliminar", "Cerrar").
 */
export default function Button({
  children,
  variant = 'primary', // 'primary' | 'neutral' | 'danger'
  type = 'button',
  onClick,
  disabled = false,
  className = '',
  autoFocus = false,
  style = {},
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          border: '1px solid #2563EB',
        };
      case 'neutral':
        return {
          backgroundColor: '#F8FAFC',
          color: '#334155',
          border: '1.5px solid #64748B',
        };
      case 'danger':
        return {
          backgroundColor: '#DC2626',
          color: '#FFFFFF',
          border: '1px solid #DC2626',
        };
      default:
        return {};
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      className={`btn-token btn-${variant} ${className}`}
      style={{ ...getVariantStyles(), ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
