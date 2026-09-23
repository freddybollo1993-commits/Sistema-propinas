# Sistema de Gestión y Registro de Propinas (Versión Unificada)

Sistema integral de liquidación, disciplina, prorrateo 60/40 y fondo mancomunado de propinas para restaurantes. Desarrollado con **Next.js (React + TypeScript)**, **Prisma ORM** y **Supabase (PostgreSQL)**, optimizado para ejecutarse en **Vercel** con motores de impresión oficiales en **1 sola hoja A4** (Planilla Apaisada y Boleta Individual en 2 Columnas).

---

## 🚀 Características Principales

1. **Modalidad Dual de Sanciones (Unificación Completa)**:
   - **Modo Clásico (Redistribución por Área)**: Las sanciones disciplinarias y confiscaciones por reincidencia (100% de pérdida) se reparten equitativamente entre los compañeros de la misma área (Salón o Cocina) al cierre de la quincena.
   - **Modo Fondo Mancomunado**: Las sanciones no se redistribuyen individualmente, sino que alimentan un fondo común de los trabajadores accesible para gastos del equipo (comida, lonche, merienda de turno, reposición por roturas o integración). El saldo trasciende quincenas con trazabilidad multi-ciclo y registro de retiros autorizados.
   - **Conmutador en Tiempo Real**: Exclusivo para el Usuario Maestro (`USR-MASTER`) o Administrador.
2. **Prorrateo Estricto de Propinas (60% Salón / 40% Cocina)**:
   - Captura diaria con cálculo en vivo por horas trabajadas.
   - Sincronización automática de plantilla de colaboradores activos.
   - Tratamiento de **Personal de Apoyo**: Reciben propina por sus horas laboradas, pero quedan formalmente excluidos de recibir bonos de redistribución.
   - Historial de turnos con flujo de anulación y justificación obligatoria.
3. **Gobernanza Disciplinaria con Reglas Inteligentes**:
   - **Tardanzas**: Bolsa de tolerancia acumulativa quincenal (minutos libres sin descuento). Si se rebasa, aplica sanción y suma a reincidencia.
   - **Breaks**: Descuento por minuto de demora con multiplicador dinámico y **tope automático por promedio diario de propina** del colaborador.
   - **Inasistencias injustificadas**: Desglose día de semana (S/ 50) y fin de semana (S/ 80) con frecuencia compartida.
   - **Cláusula de Reincidencia**: Pérdida del 100% de propinas al exceder la frecuencia máxima permitida.
4. **Adelantos y Anticipos**:
   - Validación de saldo acumulado disponible en tiempo real (`propinaBruta - deducciones`).
   - Bandeja de aprobación para Administradores y Supervisores.
5. **Motores de Impresión Oficiales Calibrados para 1 Hoja A4**:
   - **Planilla Consolidada A4 Landscape (Horizontal)**: Resumen ejecutivo en una fila, banner de fondo mancomunado si aplica, nómina completa, columna de firmas individuales de recepción y 3 recuadros de firmas de auditoría (Admin, Supervisor, Gerencia).
   - **Boleta Individual de Pago A4 Portrait (1 Sola Hoja)**: Cuadrícula compacta de 2 columnas (jornadas diarias y resumen contable a la izquierda; sanciones, adelantos y bonos a la derecha) con recuadros oficiales para firma del trabajador (Recibido Conforme con DNI) y sello/firma de Administración.
6. **Seguridad y Bitácora Inmutable de Auditoría**:
   - Control de 4 niveles de rol: `USR-MASTER` (inmutable), `Administrador`, `Supervisor` y `Moderador`.
   - Registro inmutable de cada acción, conmutación de modo, conciliación y eliminación maestra.

---

## 🗄️ Conexión con Supabase (Paso a Paso)

1. Ingresa a tu proyecto en [Supabase](https://supabase.com).
2. Ve a **Project Settings** -> **Database**.
3. En la sección **Connection string**, selecciona el modo **URI**:
   - Copia la URL con **Connection Pooling (Puerto 6543)** y pégala en `DATABASE_URL`.
   - Copia la URL en modo **Direct (Puerto 5432)** y pégala en `DIRECT_URL`.
4. Abre el archivo `.env` en la raíz de este proyecto y coloca tus credenciales:
   ```env
   DATABASE_URL="postgresql://postgres.[TU-PROYECTO]:[TU-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[TU-PROYECTO]:[TU-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
   JWT_SECRET="clave-secreta-personalizada-de-tu-eleccion"
   ```
5. Aplica las tablas y carga los datos base iniciales en Supabase ejecutando:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

---

## 🔑 Credenciales Iniciales de Acceso

Una vez ejecutado el seed, dispones de las siguientes cuentas predeterminadas:

| Rol | Usuario / Correo | Contraseña / PIN | Facultades |
| :--- | :--- | :--- | :--- |
| **Usuario Maestro** | `USR-MASTER` o `master@empresa.com` | `1234` | Conmutar Modo Clásico/Fondo, eliminaciones maestras, inmutable |
| **Administrador** | `admin@empresa.com` | `1234` | Acceso total operativo, gestión de usuarios, aprobaciones |
| **Supervisor** | `supervisor@empresa.com` | `1234` | Acceso operativo total, aprobación de adelantos y anulaciones |
| **Moderador** | (Crear desde Usuarios) | (PIN definido) | Solo captura; registros quedan pendientes de validación |

---

## ☁️ Despliegue en Vercel

1. Sube este repositorio a tu cuenta de **GitHub**, **GitLab** o **Bitbucket**.
2. En tu dashboard de [Vercel](https://vercel.com), presiona **Add New Project** e importa el repositorio `propinas`.
3. En la sección **Environment Variables**, agrega las mismas variables de tu `.env`:
   - `DATABASE_URL` (URL con pooler de Supabase)
   - `DIRECT_URL` (URL directa de Supabase)
   - `JWT_SECRET` (Tu clave secreta)
4. Presiona **Deploy**. Vercel compilará la aplicación automáticamente y te entregará tu URL pública lista para usar.
