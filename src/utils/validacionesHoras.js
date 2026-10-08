/**
 * Reglas operativas de horas estimadas (Eventify).
 * Centralizadas aquí para que Crear Evento y Editar Evento validen igual.
 */
export const HORAS_MIN_GESTION = 0.5;
export const HORAS_MAX_GESTION = 12;
export const LIMITE_JORNADA_DEFAULT = 6;
export const LIMITE_JORNADA_MIN = 1;
export const LIMITE_JORNADA_MAX = 16;

const toIso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Fecha local de hoy en AAAA-MM-DD (evita el desfase UTC de toISOString). */
export const hoyIso = () => toIso(new Date());

/** Convierte AAAA-MM-DD a DD/MM/AAAA */
export function isoToDisplayDate(isoStr) {
  if (!isoStr) return '';
  const match = String(isoStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return isoStr;
}

/** Convierte DD/MM/AAAA a AAAA-MM-DD */
export function displayDateToIso(displayStr) {
  if (!displayStr) return '';
  const match = String(displayStr).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const dd = match[1].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    const yyyy = match[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return displayStr;
}

/**
 * Normaliza la jornada de una gestión para poder sumar horas por día:
 * "Hoy", formato ISO y formato DD/MM/AAAA cuentan para la misma jornada.
 */
export function normalizarJornada(fecha) {
  if (!fecha) return 'Sin fecha';
  const valor = String(fecha).trim();
  if (valor.toLowerCase() === 'hoy') return hoyIso();
  if (valor.toLowerCase() === 'mañana') {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toIso(d);
  }
  // Si viene en formato DD/MM/AAAA convertir a ISO para orden y agrupación uniforme
  const iso = displayDateToIso(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso;
  }
  return valor;
}

/** Valida las horas de UNA gestión. Devuelve '' si es válida o el mensaje de error. */
export function validarHorasGestion(valor) {
  if (valor === '' || valor === null || valor === undefined) {
    return 'Este campo es obligatorio.';
  }
  const n = Number(valor);
  if (!Number.isFinite(n)) return 'Ingresa un número válido.';
  if (n <= 0) return 'Las horas estimadas de gestión deben ser mayores a 0.';
  if (n < HORAS_MIN_GESTION) return `El mínimo por gestión es ${HORAS_MIN_GESTION} h.`;
  if (n > HORAS_MAX_GESTION) return `Una gestión no puede superar ${HORAS_MAX_GESTION} h. Divídela en varias.`;
  if (Math.round(n * 2) !== n * 2) return 'Usa intervalos de media hora (ej. 1, 1.5, 2).';
  return '';
}

/** Suma las horas de las gestiones agrupadas por jornada normalizada. */
export function horasPorJornada(subtareas = []) {
  return subtareas.reduce((acc, sub) => {
    const jornada = normalizarJornada(sub.fechaLimite);
    acc[jornada] = (acc[jornada] || 0) + (Number(sub.horasEstimadas) || 0);
    return acc;
  }, {});
}

/** Lista de jornadas que superan el límite: [[jornada, horas], ...] */
export function jornadasExcedidas(subtareas, limite) {
  return Object.entries(horasPorJornada(subtareas)).filter(([, horas]) => horas > limite);
}

/** Bloquea en el teclado los caracteres que permiten negativos o notación científica. */
export function bloquearTeclasNoNumericas(e) {
  if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
}

/**
 * Intercepta y procesa errores HTTP 409 Conflict de tipo 'overload_conflict' del backend.
 * Devuelve un objeto estructurado con las cifras exactas del conflicto o null si no aplica.
 */
export function parseOverloadError(error) {
  if (!error) return null;
  const is409 = error.status === 409 || error.statusCode === 409;
  const isOverload =
    error.error === 'overload_conflict' ||
    error.code === 'overload_conflict' ||
    error.data?.error === 'overload_conflict' ||
    error.data?.code === 'overload_conflict';

  if (is409 || isOverload) {
    const rawData = error.data?.data || error.data || error;
    const horasTotales = Number(rawData.horas_totales_calculadas ?? rawData.horasTotales ?? 0);
    const limite = Number(rawData.limite_actual_usuario ?? rawData.limiteDiario ?? 6);
    const fecha = rawData.fecha || '';
    return {
      isOverload: true,
      horasTotales,
      limiteDiario: limite,
      fecha,
      subtareaAfectada: rawData.subtareaAfectada || null,
      message: `Quedarías con ${horasTotales}h planificadas (límite ${limite}h)`,
    };
  }
  return null;
}

