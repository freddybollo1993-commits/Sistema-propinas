# DOCUMENTO DE CONTEXTO PARA STITCH — SISTEMA DE PROPINAS SHIMAYA (TAKUMI EDITION)

> **Propósito:** Este archivo contiene el contexto integral, reglas de negocio, identidad de marca, arquitectura funcional y requerimientos de diseño del **Sistema de Gestión y Liquidación de Propinas — Shimaya Ramen (嶋屋)** para ser utilizado en **Google Stitch** (o herramientas de diseño asistido por IA) y generar propuestas de mejora visual y de experiencia de usuario (UI/UX).

---

## 1. Identidad del Producto y Marca

* **Nombre del Producto:** Sistema de Gestión & Liquidación de Propinas — Shimaya (Takumi Edition / 嶋屋).
* **Rubro:** Cadena de Restaurantes de Ramen y Gastronomía Japonesa en Perú.
* **Personalidad de Marca:** 
  * Elegante, sobrio, contemporáneo y con toques de artesanía japonesa (*Takumi* / 匠).
  * Equilibrio entre un sistema contable de alta precisión y una interfaz cálida, visualmente atractiva y fácil de usar en tablets y móviles dentro del local de cocina y salón.
* **Estética Visual Actual:**
  * **Colores Principales:** 
    * Rojo Torii / Akane (`#c92a2a`, `#d92d20`): Acento principal de marca, energía y dinamismo.
    * Tinta Sumi (`#0f172a`, `#1e293b`): Tipografía, contrastes estructurales oscuros, encabezados.
    * Washi & Gofun (`#f8f9fa`, `#ffffff`): Fondos limpios, tarjetas elevadas, papel de arroz japonés.
    * Matcha Verde (`#12b886`, `#0ca678`): Propinas positivas, bonos, solvencia y liquidaciones aprobadas.
    * Kohaku / Ámbar (`#f59f00`, `#f08c00`): Apoyos, fondos mancomunados, alertas preventivas.
    * Sakura / Benibana (`#fa5252`, `#e03131`): Sanciones disciplinarias, deducciones, pérdidas de propina.
  * **Tipografías:**
    * Interfaz general: *Plus Jakarta Sans* / *Inter* (limpia, geométrica, moderna).
    * Identidad japonesa: *Noto Sans JP* (sellos Hanko, subtítulos en kanji: フロア, 厨房, 点検, 名簿).
    * Cifras numéricas y montos: *JetBrains Mono* / *Roboto Mono* (alineación perfecta de monedas y horas).

---

## 2. Usuarios y Roles (Personas)

1. **Usuario Maestro (Dueño / Corporativo):**
   * Control multi-sede (gestión de tiendas: Benavides, Chacarilla, etc.).
   * Acceso al módulo de **Central Neurálgica (BI)** con analíticas consolidadas, tendencias de propinas por hora y credenciales API.
2. **Administrador de Tienda / Gerente:**
   * Abre y cierra ciclos de liquidación (quincenales).
   * Registra y aprueba sanciones disciplinarias y solicitudes de adelantos.
   * Conmuta entre **Modo Clásico** y **Fondo Mancomunado**.
   * Emite e imprime planillas oficiales en hoja A4 horizontal y boletas individuales de conformidad.
3. **Supervisor de Turno:**
   * Captura diaria de propinas de los turnos de apertura, tarde y noche.
   * Asignación de colaboradores y horas laboradas por área (Salón vs Cocina).
   * Registro y reactivación de personal de Apoyo.
4. **Colaborador (Mesero, Cocinero, Apoyo):**
   * Consulta sus turnos, horas acumuladas, bonos por sanciones redistribuidas y firma su boleta quincenal.

---

## 3. Módulos Clave del Frontend

### A. Registro y Captura de Propinas (`ModRegistroPropinas`)
* **Distribución Dual:**
  * *Modo Regular 60/40:* 60% del fondo a Salón y 40% a Cocina, prorrateado por horas trabajadas en el turno.
  * *Modo Equitativo:* Bolsa común unificada entre todo el personal proporcional a las horas globales.
* **Organización Visual de Colaboradores:**
  1. Personal de Salón (Titulares).
  2. Apoyos de Salón (con distintivo especial).
  3. Personal de Cocina (Titulares).
  4. Apoyos de Cocina (con distintivo especial).
* **Edición de Turnos en Vivo:** Permite incorporar apoyos que no fueron registrados a tiempo o corregir horas bajo justificación formal, recalculando instantáneamente las cuotas.

### B. Liquidación Quincenal & Boletas (`ModLiquidacion`)
* **Tabla Consolidada:** Muestra colaborador, área, días trabajados, horas totales, propina bruta, deducciones (sanciones + adelantos), bonos de redistribución y monto neto final a cobrar.
* **Agrupación Visual:** Cabeceras divisorias para Salón y Cocina.
* **Auditoría de Bonos de Redistribución:** Desglose transparente que muestra fecha, infractor sancionado, área y horas proporcionales recibidas.
* **Impresión A4 Horizontal (Planilla de Firmas):** Tabla formateada para impresión física en hoja membretada lista para la firma y DNI de cada colaborador.
* **Modal de Boleta Individual:** Comprobante contable detallado con desglose de turnos, deducciones y firmas de entrega y recepción.

### C. Control Disciplinario y Sanciones (`ModSanciones`)
* **Modalidad Dual:**
  * *Modo Clásico (Redistribución por Fecha y Área):* La sanción aplicada a un colaborador se confisca y se redistribuye **únicamente** entre los compañeros de su **misma área** que trabajaron en la **misma fecha exacta**, proporcional a sus **horas laboradas**.
  * *Modo Fondo Mancomunado:* Las sanciones no se reparten; se depositan en una cuenta de equipo que acumula saldo inter-quincenal para compras de comida, lonches o reparación de menaje.
* **Pérdida Total del 100%:** Reincidencia que anula las propinas del infractor y las transfiere al equipo.

### D. Catálogo de Personal (`ModPersonal`)
* Directorio de colaboradores clasificado jerárquicamente en Salón, Apoyos Salón, Cocina y Apoyos Cocina.
* Filtros reactivos en tiempo real por nombre, área y estado (Activo/Inactivo) con contadores por categoría.

### E. Central Neurálgica (`ModCentralNeuralgica`)
* Dashboard ejecutivo de Business Intelligence con KPIs globales, comparativas multi-tienda, monitoreo de fondos mancomunados y generación de API Keys para plataformas externas.

---

## 4. Diagnóstico Visual Actual y Oportunidades de Mejora

| Área | Estado Actual | Oportunidad en Stitch (Propuesta de Mejora) |
|---|---|---|
| **Estructura de Layout** | Sidebar tradicional con tabla central estándar de Bootstrap | **Bento Grid moderno:** Tarjetas asimétricas modulares con jerarquía visual nítida, elevaciones suaves y micro-separadores. |
| **Tablas de Datos** | Tablas convencionales de escritorio que requieren scroll horizontal en móviles | **Hybrid Adaptive Tables:** En escritorio tabla ultra-legible con sticky headers; en móvil se convierte en tarjetas compactas swipeables con resumen expandible. |
| **KPIs y Métricas** | Cajas numéricas estáticas | **Stat Cards con micro-gráficos Sparklines:** Indicadores de tendencia, comparativa de ciclo anterior, barras de progreso de meta quincenal. |
| **Experiencia Táctil (Móvil)** | Depende de botones pequeños y menús desplegables nativos | **Bottom Sheet Drawers y Touch Targets de 44px+:** Acciones rápidas al alcance del pulgar, botones flotantes (FAB) para registrar turno y aprobar solicitudes. |
| **Identidad Visual Takumi** | Colores sólidos y texto en kanji discreto | **Modern Japanese Neo-Brutalism / Glassmorphism:** Vidrio esmerilado sutil (`backdrop-filter`), sellos Hanko con textura de tinta roja, bordes refinados de 1px (`rgba(0,0,0,0.06)`). |
| **Feedback de Interacción** | Alertas estándar de Bootstrap y ventanas `confirm()` de navegador | **Toasts flotantes con animación:** Transiciones fluidas de entrada, estados de éxito con confeti/animación de chequeo y modales flotantes sin bloqueo de hilo. |

---

## 5. Instrucciones / Prompt para Google Stitch

Al cargar este contexto en **Stitch**, solicita:

```text
Actúa como un Diseñador UI/UX Principal de clase mundial especializado en interfaces empresariales modernas (estilo Linear, Raycast, Vercel Dashboard) fusionado con la estética de hospitalidad japonesa contemporánea (Takumi Edition de Shimaya Ramen).

Basándote en este contexto:
1. Diseña una propuesta de mejora visual completa (Desktop y Mobile-First) para el dashboard principal y las vistas de Liquidación y Registro de Propinas.
2. Utiliza un layout tipo Bento Grid con tarjetas dinámicas, sticky navigation y glassmorphism sobrio.
3. Incorpora una paleta de colores pulida: Rojo Torii (#D92D20), Tinta Sumi (#0F172A), Washi Light (#F8F9FA), Matcha Green (#12B886) y acentos en oro Kohaku.
4. Diseña una tabla de datos de última generación para la Liquidación Quincenal con cabeceras de área destacadas (Salón, Apoyo Salón, Cocina, Apoyo Cocina), badges de estado con micro-píldoras, y vista previa de boletas imprimibles.
5. Optimiza la ergonomía táctil para que el supervisor en cocina o salón pueda operar el sistema rápidamente desde una tablet o smartphone.
```
