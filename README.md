# Eventify - Organizador de Eventos Independientes (Frontend)

**Organiza, vive y comparte tus mejores eventos**  
**Documentación Estratégica de UX/HCI**  
**Docente:** Fabián Stiven Valencia Córdoba  
**Integrantes:** Santiago Aldana Delgado, Juan Mario Ballesteros Fernandez, Carlos Andres Caicedo Casanova, Juan Esteban Meñaca Jimenez.

---

## Implementación de Decisiones de Diseño (UX / HCI)

Este proyecto implementa al 100% las 5 decisiones estratégicas de diseño y usabilidad documentadas para el Organizador de Eventos:

### 1. Decisión 1: Feedback Visual Mediante Código de Colores en Barras de Progreso (T4 - Registrar avance)
- **Azul (`#2563EB`)**: Evento en ejecución activa con tareas parciales completadas (ej. 14.2% completado en *"Boda Valentina & Emilio"*).
- **Verde (`#16A34A`)**: Success (100% de avance) o Baseline limpio inicial (0%) con el plan inicial listo para ejecutarse.
- **Rojo (`#DC2626`)**: Error & Critical; señala fallos de carga o alertas críticas en el avance de las subtareas logísticas.
- Componente: `src/components/ProgressBar.jsx`.

### 2. Decisión 2: Prevención de "Callejones sin Salida" Mediante Estados Vacíos (T1 - Crear evento)
- Controlado por la condición `isEmpty`.
- Consta de:
  1. Ícono ilustrativo contextual simplificado y de baja saturación visual.
  2. Microcopy de invitación directo: *¿Deseas organizar tu primer evento?*
  3. Botón de acción principal destacado CTA Azul (`#2563EB`) *"Crear evento"*.
- Componente: `src/components/EmptyState.jsx`.

### 3. Decisión 3: Diferenciación Visual en Manejo de Errores de Carga (T2 - Ver prioridades "Hoy")
- **Error Global Central (Falla de API/Servidor)**: Despliega un contenedor central con ícono de exclamación, diagnóstico comprensible y botón de reintento global.
- **Error Localizado a Nivel de Componente**: Cuando la falla se limita a un módulo específico (ej. gestiones urgentes de catering), la vista general y el resto del panel se mantienen funcionales. El error se restringe al marco delimitado del módulo con opción de recarga local.
- Componentes: `src/components/GlobalErrorState.jsx` y `src/components/LocalErrorState.jsx`.

### 4. Decisión 4: Protocolo de Seguridad en Acciones Destructivas
- Protege la eliminación de eventos completos o subtareas logísticas clave mediante:
  1. Modal de riesgo obligatorio con bloqueo de fondo (`overlay focus`).
  2. Microcopy de advertencia explícita: *"Esta acción eliminará el evento y todas sus subtareas logísticas. No se puede deshacer."*
  3. Botón de riesgo Danger Accent Rojo (`#DC2626`) identificado con *"Eliminar"*.
  4. Opción neutra de cancelación Gris Focus (`#64748B`) con `autoFocus` predeterminado para prevenir pulsaciones involuntarias.
- Componente: `src/components/ConfirmModal.jsx`.

### 5. Decisión 5: Separación Visual entre Modos de Visualización y Edición/Reprogramación (T3 - Reprogramar)
- **Modo "Ver Detalle" (Lectura - ruta `/evento/:id`)**: Consulta estática con tipografía clara, etiquetas de solo lectura y ausencia de controles activos.
- **Modo "Editar / Reprogramar"**: Formulario interactivo con inputs destacados mediante **Border Focus** azul (`#2563EB`), validación en tiempo real por límites de carga horaria (detección de sobrecargas de horas diarias), y CTAs explícitos *"Guardar cambios"* y *"Cancelar"*.
- Vista: `src/pages/DetalleEvento.jsx`.

---

## Rutas y Vistas

| Ruta | Descripción | Tarea / Decisión |
|---|---|---|
| `/` o `/hoy` | Prioridades del día, módulo de catering con error aislado, simuladores | T2 / Decisión 3 |
| `/eventos` | Panel de eventos con barras de progreso y borrado con modal destructivo | Decisión 1, 2 y 4 |
| `/crear-evento` | Registro de evento y generación del plan inicial (estado baseline 0%) | T1 / Decisión 2 |
| `/evento/:id` | Modo Ver Detalle (Lectura) y Modo Editar / Reprogramar (Border Focus) | T3 / Decisión 5 y 4 |
| `/progreso` | Supervisión de avance con código de colores y registro interactivo de subtareas | T4 / Decisión 1 |
| `/decisiones-ux` | **Panel Interactivo de Evaluación UX/HCI** con visor y simuladores para captura de evidencias del PDF | Todas |

---

## Cómo ejecutar el proyecto

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Ejecutar servidor de desarrollo:
   ```bash
   npm run dev
   ```

3. Construir para producción:
   ```bash
   npm run build
   ```
