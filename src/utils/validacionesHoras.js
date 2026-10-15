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
  const match = String(isoStr).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    const dd = match[3].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    const yyyy = match[1];
    return `${dd}/${mm}/${yyyy}`;
  }
  return isoStr;
}

/** Convierte DD/MM/AAAA (o DD-MM-AAAA) a AAAA-MM-DD */
export function displayDateToIso(displayStr) {
  if (!displayStr) return '';
  const str = String(displayStr).trim();
  const match = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (match) {
    const dd = match[1].padStart(2, '0');
    const mm = match[2].padStart(2, '0');
    const yyyy = match[3];
    return `${yyyy}-${mm}-${dd}`;
  }
  return displayStr;
}

/**
 * Normaliza la jornada de una gestión para poder sumar horas y comparar fechas de forma consistente:
 * Acepta 'Hoy', 'Mañana', formato ISO (AAAA-MM-DD) y formato DD/MM/AAAA.
 * Siempre devuelve AAAA-MM-DD cuando es una fecha válida.
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
  if (valor.toLowerCase() === 'próxima semana' || valor.toLowerCase() === 'proxima semana') {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return toIso(d);
  }
  // Si ya viene en formato ISO AAAA-MM-DD o AAAA/MM/DD
  const isoMatch = valor.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
  }
  // Si viene en formato DD/MM/AAAA o DD-MM-AAAA convertir a ISO
  const iso = displayDateToIso(valor);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso;
  }
  return valor;
}

/**
 * Compara cronológicamente dos fechas en cualquier formato ('Hoy', DD/MM/AAAA, AAAA-MM-DD).
 * Devuelve:
 *   -1 si fechaA es estrictamente anterior a fechaB
 *    0 si corresponden a la misma fecha
 *    1 si fechaA es estrictamente posterior a fechaB
 * null si alguna no es una fecha válida
 */
export function compararFechas(fechaA, fechaB) {
  if (!fechaA || !fechaB) return null;
  const isoA = normalizarJornada(fechaA);
  const isoB = normalizarJornada(fechaB);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoA) || !/^\d{4}-\d{2}-\d{2}$/.test(isoB)) {
    return null;
  }
  if (isoA < isoB) return -1;
  if (isoA > isoB) return 1;
  return 0;
}

/**
 * Devuelve true ÚNICAMENTE si la fecha de la gestión es estrictamente posterior a la fecha del evento.
 * Si es anterior o el mismo día del evento, devuelve false.
 */
export function gestionVenceDespuesDeEvento(fechaGestion, fechaEvento) {
  if (!fechaGestion || !fechaEvento) return false;
  const cmp = compararFechas(fechaGestion, fechaEvento);
  if (cmp === null) return false;
  return cmp > 0;
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

/** Suma las horas de las gestiones pendientes agrupadas por jornada normalizada (excluye Hechas). */
export function horasPorJornada(subtareas = []) {
  return subtareas.reduce((acc, sub) => {
    if (sub.estado === 'Hecha') return acc;
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

