import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEvents } from '../context/EventsContext';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import SystemModal from '../components/SystemModal';

export default function Hoy() {
  const {
    eventos,
    isEmpty,
    obtenerTareasHoy,
    marcarSubtareaHecha,
    posponerSubtarea,
    eliminarSubtarea,
    hasGlobalError,
    hasCateringModuleError,
    isLoadingGlobal,
    isLoadingCatering,
    reintentarGlobal,
    recargarModuloCatering,
  } = useEvents();

  // Estado del modal de confirmación y eliminación
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'eliminar_tarea',
    eventoId: null,
    subtarea: null,
  });

  // Estado del popover interactivo "¿Cómo se ordena?" (Regla UI oficial)
  const [showOrderRule, setShowOrderRule] = useState(false);

  // Fecha de referencia actual
  const fechaHoyDate = new Date();
  const todayIso = fechaHoyDate.toISOString().split('T')[0];

  const fechaActualFormateada = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fechaHoyDate);

  // Estados de Filtros de Búsqueda (US-05)
  const [filtroEvento, setFiltroEvento] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroDias, setFiltroDias] = useState('todos');

  // Helper para normalizar la fecha límite a string ISO comparable
  const parseFechaLimite = (fechaStr) => {
    if (!fechaStr) return '9999-12-31';
    if (fechaStr === 'Hoy') return todayIso;
    if (fechaStr === 'Mañana') {
      const tomorrow = new Date(fechaHoyDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    if (fechaStr === 'Próxima semana') {
      const nextWeek = new Date(fechaHoyDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
      return fechaStr;
    }
    return '9999-12-31';
  };

  // Helper para calcular diferencia de días desde hoy
  const diasDesdeHoy = (fechaStr) => {
    const iso = parseFechaLimite(fechaStr);
    const target = new Date(iso + 'T00:00:00');
    const today = new Date(todayIso + 'T00:00:00');
    const diffTime = target - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1. Obtener todas las subtareas
  const todasLasTareas = obtenerTareasHoy();

  // 2. Filtrado reactivo (US-05)
  const tareasFiltradas = todasLasTareas.filter((t) => {
    // A. Filtro por Evento
    if (filtroEvento !== 'todos' && t.eventoId !== filtroEvento) {
      return false;
    }

    // B. Filtro por Estado
    if (filtroEstado === 'todos') {
      // Por defecto en la vista Hoy se muestran las tareas pendientes / en curso
      if (t.estado === 'Hecha') return false;
    } else if (filtroEstado === 'hecha') {
      if (t.estado !== 'Hecha') return false;
    } else if (filtroEstado === 'pendiente') {
      if (t.estado !== 'Pendiente') return false;
    } else if (filtroEstado === 'pospuesta') {
      const isPospuesta = t.estado === 'Pospuesta' || t.fechaLimite === 'Próxima semana';
      if (!isPospuesta) return false;
    } else if (filtroEstado === 'vencida') {
      const iso = parseFechaLimite(t.fechaLimite);
      if (!(iso < todayIso && t.estado !== 'Hecha')) return false;
    }

    // C. Filtro por rango de días próximos (US-05: Limita "upcoming" a los siguientes N días)
    if (filtroDias !== 'todos') {
      const maxDias = parseInt(filtroDias, 10);
      const diff = diasDesdeHoy(t.fechaLimite);
      if (diff > 0 && diff > maxDias) {
        return false;
      }
    }

    return true;
  });

  const hayFiltrosActivos = filtroEvento !== 'todos' || filtroEstado !== 'todos' || filtroDias !== 'todos';

  const limpiarFiltros = () => {
    setFiltroEvento('todos');
    setFiltroEstado('todos');
    setFiltroDias('todos');
  };

  // Módulo aislado de catering para Decisión 3
  const tareasCatering = tareasFiltradas.filter(
    (t) => t.isCatering || (t.titulo && t.titulo.toLowerCase().includes('catering'))
  );

  // 3. Lógica de Agrupación Temporal (Vencidas, Hoy, Próximas) a partir de las tareas filtradas
  const vencidas = tareasFiltradas.filter((t) => {
    const iso = parseFechaLimite(t.fechaLimite);
    return iso < todayIso && t.estado !== 'Hecha';
  });

  const paraHoy = tareasFiltradas.filter((t) => {
    const iso = parseFechaLimite(t.fechaLimite);
    return iso === todayIso;
  });

  const proximas = tareasFiltradas.filter((t) => {
    const iso = parseFechaLimite(t.fechaLimite);
    return iso > todayIso;
  });

  // 4. Ordenamiento Correcto con .sort() cronológico (de más antigua a más lejana)
  const ordenarCronologicamente = (a, b) => {
    const fechaA = parseFechaLimite(a.fechaLimite);
    const fechaB = parseFechaLimite(b.fechaLimite);
    if (fechaA !== fechaB) {
      return fechaA.localeCompare(fechaB);
    }
    return (a.horasEstimadas || 0) - (b.horasEstimadas || 0);
  };

  const vencidasOrdenadas = [...vencidas].sort(ordenarCronologicamente);
  const paraHoyOrdenadas = [...paraHoy].sort(ordenarCronologicamente);
  const proximasOrdenadas = [...proximas].sort(ordenarCronologicamente);

  // Solicitar eliminación de tarea (Modal de riesgo)
  const handleRequestDeleteTask = (eventoId, task) => {
    setModalState({
      isOpen: true,
      type: 'eliminar_tarea',
      eventoId,
      subtarea: task,
    });
  };

  const handleConfirmModalAction = () => {
    if (modalState.type === 'eliminar_tarea' && modalState.eventoId && modalState.subtarea) {
      eliminarSubtarea(modalState.eventoId, modalState.subtarea.id);
      setModalState({
        isOpen: true,
        type: 'tarea_eliminada',
        eventoId: null,
        subtarea: null,
      });
    } else {
      setModalState({ isOpen: false, type: 'eliminar_tarea', eventoId: null, subtarea: null });
    }
  };

  // Error Global Crítico
  if (hasGlobalError) {
    return (
      <div className="page-wrapper page-error-view">
        <ErrorMessage
          hasError={hasGlobalError}
          isGlobal={true}
          message="Ha ocurrido un error cargando la información de los eventos, inténtelo de nuevo."
          onRetry={reintentarGlobal}
        />
      </div>
    );
  }

  // Estado Vacío (Empty State)
  if (isEmpty) {
    return (
      <div className="page-wrapper">
        <header className="page-header-row">
          <div>
            <span className="eyebrow-tag">Prioridades del día</span>
            <h1 className="page-main-heading">Hoy</h1>
            <p className="page-date-str">{fechaActualFormateada}</p>
          </div>
        </header>

        <EmptyState
          isEmpty={isEmpty}
          title="¿Deseas organizar tu primer evento?"
          description="Actualmente no cuentas con ningún evento registrado en tu panel. Crea tu primer proyecto para que el sistema genere automáticamente tu plan inicial de tareas logísticas."
          buttonText="Crear evento"
          to="/crear-evento"
        />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Cabecera Principal con Fecha y Componente Informativo "¿Cómo se ordena?" */}
      <header className="page-header-row">
        <div>
          <span className="eyebrow-tag">Prioridades del día</span>
          <h1 className="page-main-heading">Hoy</h1>
          <p className="page-date-str">
            Gestión y planificación de tus compromisos logísticos • <strong>{fechaActualFormateada}</strong>
          </p>
        </div>

        {/* Control Informativo y KPIs */}
        <div className="header-actions-kpi-row">
          {/* Botón interactivo oficial: ¿Cómo se ordena? */}
          <div className="order-rule-control-wrapper">
            <button
              type="button"
              className="btn-order-rule-toggle"
              onClick={() => setShowOrderRule(!showOrderRule)}
              aria-expanded={showOrderRule}
              title="Ver regla de categorización y ordenamiento de tareas"
            >
              <span className="rule-info-icon" aria-hidden="true">ⓘ</span>
              ¿Cómo se ordena?
            </button>

            {/* Popover informativo reglamentario (2-4 líneas de texto exacto) */}
            {showOrderRule && (
              <div className="order-rule-popover" role="tooltip">
                <div className="popover-header">
                  <strong>¿Cómo se ordena?</strong>
                  <button
                    type="button"
                    className="popover-close-btn"
                    onClick={() => setShowOrderRule(false)}
                    aria-label="Cerrar regla informativa"
                  >
                    ✕
                  </button>
                </div>
                <p className="order-rule-text">
                  "Las tareas se agrupan por prioridad temporal (Vencidas, Hoy, Próximas). Dentro de cada grupo, se ordenan cronológicamente por la fecha límite más cercana para facilitarte la planificación diaria."
                </p>
              </div>
            )}
          </div>

          <div className="kpi-group">
            <div className="kpi-card">
              <span className="kpi-label">Urgentes hoy</span>
              <span className="kpi-number">{paraHoy.length}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Vencidas</span>
              <span className="kpi-number kpi-danger">{vencidas.length}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Barra de Filtros Visuales (US-05) */}
      <section className="dashboard-section hoy-filter-toolbar" aria-label="Filtros de búsqueda de tareas">
        <div className="filter-toolbar-header">
          <div className="filter-toolbar-title">
            <span className="filter-icon" aria-hidden="true">🔍</span>
            <strong>Filtros rápidos de tareas (US-05)</strong>
            {hayFiltrosActivos && (
              <span className="filter-active-pill">Filtro aplicado</span>
            )}
          </div>
          {hayFiltrosActivos && (
            <button
              type="button"
              className="btn-clear-filters"
              onClick={limpiarFiltros}
              title="Restablecer todos los filtros"
            >
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        <div className="filter-inputs-grid">
          {/* 1. Filtro por Evento */}
          <div className="filter-control-group">
            <label htmlFor="filter-event" className="filter-label">
              Evento:
            </label>
            <select
              id="filter-event"
              className="filter-select"
              value={filtroEvento}
              onChange={(e) => setFiltroEvento(e.target.value)}
            >
              <option value="todos">Todos los eventos ({eventos.length})</option>
              {eventos.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filtro por Estado */}
          <div className="filter-control-group">
            <label htmlFor="filter-status" className="filter-label">
              Estado:
            </label>
            <select
              id="filter-status"
              className="filter-select"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los pendientes</option>
              <option value="pendiente">Pendientes</option>
              <option value="pospuesta">Pospuestas</option>
              <option value="vencida">Vencidas</option>
              <option value="hecha">Completadas (Hechas)</option>
            </select>
          </div>

          {/* 3. Filtro por Días Próximos (Rango Temporal) */}
          <div className="filter-control-group">
            <label htmlFor="filter-days" className="filter-label">
              Días próximos:
            </label>
            <select
              id="filter-days"
              className="filter-select"
              value={filtroDias}
              onChange={(e) => setFiltroDias(e.target.value)}
            >
              <option value="todos">Cualquier fecha</option>
              <option value="3">Próximos 3 días</option>
              <option value="7">Próximos 7 días</option>
              <option value="15">Próximos 15 días</option>
              <option value="30">Próximos 30 días</option>
            </select>
          </div>
        </div>

        {/* Resumen de resultados filtrados si hay filtros activos */}
        {hayFiltrosActivos && (
          <div className="filter-results-summary">
            <span>
              Mostrando <strong>{tareasFiltradas.length}</strong> gestiones según los criterios activos.
            </span>
          </div>
        )}
      </section>

      {/* Módulo Parcial de Catering (Decisión 3: Error Localizado) */}
      <section className="dashboard-section catering-module-wrapper">
        <div className="section-title-line">
          <div>
            <h3 className="section-title">
              {hasCateringModuleError
                ? 'Error cargando las gestiones urgentes de catering'
                : 'Gestiones Urgentes de Catering'}
            </h3>
            <p className="section-desc">Coordinación directa con proveedores de alimentación y banquetes.</p>
          </div>
        </div>

        {hasCateringModuleError ? (
          <ErrorMessage
            hasError={hasCateringModuleError}
            isGlobal={false}
            title="Error cargando las gestiones urgentes de catering"
            message="No se ha podido cargar el evento o sus gestiones asociadas. Las demás áreas continúan operativas."
            onRetry={recargarModuloCatering}
          />
        ) : (
          <div className="catering-tasks-list">
            {tareasCatering.length > 0 ? (
              tareasCatering.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={marcarSubtareaHecha}
                  onSnooze={posponerSubtarea}
                  onDeleteRequest={handleRequestDeleteTask}
                />
              ))
            ) : (
              <EmptyState
                isEmpty={tareasCatering.length === 0}
                title="¿Deseas agregar tu primera gestión logística?"
                description="No hay gestiones urgentes de catering pendientes en este momento."
                buttonText="Agregar gestión"
                to="/crear-evento"
                scope="tareas"
              />
            )}
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* 1. SECCIÓN VENCIDAS (Estrictamente anterior al día de hoy)         */}
      {/* =================================================================== */}
      <section className="dashboard-section section-temporal-block">
        <div className="temporal-group-header">
          <div className="temporal-title-group">
            <span className="temporal-dot dot-vencidas" aria-hidden="true" />
            <h3 className="temporal-heading">Vencidas</h3>
            <span className="temporal-badge badge-vencidas-count">
              {vencidasOrdenadas.length}
            </span>
          </div>
          <span className="temporal-hint">Requieren atención o reprogramación inmediata</span>
        </div>

        {vencidasOrdenadas.length === 0 ? (
          <div className="temporal-empty-hint">
            <span>✓ No tienes gestiones vencidas. ¡Excelente gestión temporal!</span>
          </div>
        ) : (
          <div className="task-grid">
            {vencidasOrdenadas.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={marcarSubtareaHecha}
                onSnooze={posponerSubtarea}
                onDeleteRequest={handleRequestDeleteTask}
              />
            ))}
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* 2. SECCIÓN PARA HOY (Fecha de vencimiento corresponde a hoy)        */}
      {/* =================================================================== */}
      <section className="dashboard-section section-temporal-block">
        <div className="temporal-group-header">
          <div className="temporal-title-group">
            <span className="temporal-dot dot-hoy" aria-hidden="true" />
            <h3 className="temporal-heading">Para hoy</h3>
            <span className="temporal-badge badge-hoy-count">
              {paraHoyOrdenadas.length}
            </span>
          </div>
          <span className="temporal-hint">Gestiones programadas para ejecutarse en el día en curso</span>
        </div>

        {paraHoyOrdenadas.length === 0 ? (
          <div className="temporal-empty-hint">
            <span>🎉 No tienes tareas pendientes para hoy. Puedes avanzar en tus próximas gestiones.</span>
          </div>
        ) : (
          <div className="task-grid">
            {paraHoyOrdenadas.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={marcarSubtareaHecha}
                onSnooze={posponerSubtarea}
                onDeleteRequest={handleRequestDeleteTask}
              />
            ))}
          </div>
        )}
      </section>

      {/* =================================================================== */}
      {/* 3. SECCIÓN PRÓXIMAS (Fecha de vencimiento posterior al día de hoy)  */}
      {/* =================================================================== */}
      <section className="dashboard-section section-temporal-block">
        <div className="temporal-group-header">
          <div className="temporal-title-group">
            <span className="temporal-dot dot-proximas" aria-hidden="true" />
            <h3 className="temporal-heading">Próximas</h3>
            <span className="temporal-badge badge-proximas-count">
              {proximasOrdenadas.length}
            </span>
          </div>
          <span className="temporal-hint">Planificación logística para los próximos días y semanas</span>
        </div>

        {proximasOrdenadas.length === 0 ? (
          <div className="temporal-empty-hint">
            <span>No hay gestiones futuras programadas en este momento.</span>
          </div>
        ) : (
          <div className="task-grid">
            {proximasOrdenadas.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={marcarSubtareaHecha}
                onSnooze={posponerSubtarea}
                onDeleteRequest={handleRequestDeleteTask}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal del Sistema para Eliminación de Tarea */}
      <SystemModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        itemName={modalState.subtarea?.titulo}
        onClose={() => setModalState({ isOpen: false, type: 'eliminar_tarea', eventoId: null, subtarea: null })}
        onConfirm={handleConfirmModalAction}
      />
    </div>
  );
}
