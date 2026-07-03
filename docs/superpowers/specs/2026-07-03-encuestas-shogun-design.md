# Diseño: Sitio de Encuestas SHOGUN

**Fecha**: 2026-07-03
**Estado**: Aprobado, listo para plan de implementación

## 1. Contexto y propósito

SHOGUN necesita un sitio web para recolectar encuestas de satisfacción de sus **clientes externos** en tres áreas de servicio: **Fotografía**, **Edición** y **Servicio al Cliente**. El sitio tiene dos partes:

1. **Toma de encuesta** (público, sin login) — el cliente responde vía QR, una máquina fija (kiosco) en el local, o un link compartido por WhatsApp.
2. **Panel administrativo** (protegido) — para crear/editar encuestas y sus preguntas, y ver resultados.

El sitio debe ser simple de desplegar en Railway, con base de datos PostgreSQL también en Railway.

## 2. Stack técnico

- **Next.js (App Router, TypeScript)** como aplicación única: frontend público + panel admin + backend (Server Actions / route handlers), un solo servicio desplegable.
- **Prisma ORM + PostgreSQL** (plugin de Railway).
- **Auth admin**: sesión por cookie firmada (HTTP-only), contraseña con hash bcrypt guardada en la base de datos. Al primer arranque, si no existe ningún `AdminUser`, se crea uno usando `ADMIN_USERNAME` / `ADMIN_PASSWORD` de variables de entorno. Después, el admin puede cambiar su contraseña desde `/admin/configuracion`.
- **Gráficos**: Recharts, para las distribuciones en resultados.
- **QR**: paquete `qrcode`, generado por encuesta y visible/descargable desde el admin.
- **CSV**: endpoint que arma el CSV desde la base de datos al vuelo (sin dependencias pesadas).

## 3. Modelo de datos (Prisma)

```
AdminUser
  id, username (unique), passwordHash, createdAt, updatedAt

Survey
  id, slug (unique), title, description, isActive (bool), order (int)
  createdAt, updatedAt

Question
  id, surveyId (FK -> Survey), type (enum: RATING_STARS, MULTIPLE_CHOICE, TEXT, YES_NO, NPS)
  text, required (bool), order (int), options (JSON, solo para MULTIPLE_CHOICE)

Response
  id, surveyId (FK -> Survey), respondentName (nullable), respondentPhone (nullable)
  createdAt

Answer
  id, responseId (FK -> Response), questionId (FK -> Question), value (JSON)
```

`Survey` no tiene un enum fijo de "área" — es texto libre (título + slug), para que el admin pueda crear encuestas nuevas más allá de las 3 iniciales sin cambios de esquema.

## 4. Rutas y flujos

### Público (sin autenticación)

- `GET /` — selector simple de las encuestas activas (tarjetas: Fotografía, Edición, Servicio al Cliente, + cualquier otra que se cree luego).
- `GET /encuesta/[slug]` — formulario completo de la encuesta en **una sola página con scroll** (todas las preguntas visibles), con nombre/teléfono **opcionales** al final. Validación de preguntas obligatorias en cliente y servidor.
- Al enviar (`POST` vía Server Action): se guarda `Response` + `Answer[]`, se muestra pantalla de agradecimiento con marca SHOGUN, y **a los ~6 segundos se reinicia automáticamente** hacia la misma encuesta en blanco (modo kiosco, sin intervención manual).
- Si el envío falla, se muestra un error y **no se pierden las respuestas ya llenadas** (el estado del formulario se mantiene en el cliente hasta confirmar éxito).

### Admin (protegido por sesión)

- `GET /admin/login` — login usuario/contraseña.
- `GET /admin` — dashboard: lista de encuestas con resumen rápido (respuestas totales, promedio).
- `GET /admin/encuestas/nueva` — crear encuesta (título, slug, descripción).
- `GET /admin/encuestas/[id]` — editor: datos generales, activar/desactivar, lista de preguntas con crear/editar/eliminar/reordenar (drag & drop), y QR + link público para copiar/imprimir.
- `GET /admin/encuestas/[id]/resultados` — KPIs (promedio general, NPS, % sí en preguntas sí/no), gráfico de distribución por pregunta tipo rating, tabla de respuestas individuales filtrable por rango de fechas, botón exportar CSV.
- `GET /admin/configuracion` — cambiar contraseña del admin.

Middleware de Next.js protege todas las rutas bajo `/admin` excepto `/admin/login`, redirigiendo a login si no hay sesión válida.

## 5. Preguntas iniciales (seed, editables desde el admin después)

**📷 Fotografía**
1. ¿Cómo calificarías la calidad de las fotos? — `RATING_STARS`
2. ¿El fotógrafo llegó puntual? — `YES_NO`
3. ¿Qué tan probable es que nos recomiendes? — `NPS`
4. ¿Qué tipo de sesión tomaste? — `MULTIPLE_CHOICE` (retrato, producto, evento, otro)
5. Comentarios adicionales — `TEXT` (opcional)

**🎨 Edición**
1. ¿Cómo calificarías la calidad de la edición final? — `RATING_STARS`
2. ¿El resultado cumplió con lo que esperabas? — `YES_NO`
3. ¿El tiempo de entrega fue el adecuado? — `RATING_STARS`
4. ¿Qué tan probable es que nos recomiendes? — `NPS`
5. Comentarios adicionales — `TEXT` (opcional)

**🎧 Servicio al Cliente**
1. ¿Cómo calificarías la atención recibida? — `RATING_STARS`
2. ¿Tu problema/solicitud fue resuelto? — `YES_NO`
3. ¿El personal fue amable y claro? — `RATING_STARS`
4. ¿Qué tan probable es que nos recomiendes? — `NPS`
5. Comentarios adicionales — `TEXT` (opcional)

Estas 3 encuestas se cargan vía seed script al desplegar por primera vez.

## 6. Diseño visual

- Colores de marca SHOGUN: rojo `#E03A21`, negro `#111111`, blanco. Logo torii en el header.
- Tipografía bold/redondeada acorde al logo.
- Formulario público optimizado para pantalla táctil (kiosco): botones y áreas de toque grandes, buen contraste, texto legible a distancia de brazo.
- Panel admin: sidebar oscuro con navegación por encuesta, tarjetas de KPI, gráfico de barras simple, tabla de respuestas.

## 7. Despliegue en Railway

- Un servicio web (Next.js) conectado al repositorio.
- Plugin de PostgreSQL de Railway (`DATABASE_URL` inyectado automáticamente).
- Variables de entorno:
  - `DATABASE_URL` (automática de Railway)
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD` (solo usadas para crear el admin inicial si no existe ninguno)
  - `SESSION_SECRET` (firma de cookies de sesión)
- Comando de arranque: `prisma migrate deploy && next start` — las migraciones corren automáticamente en cada deploy.
- README del proyecto con pasos exactos: crear proyecto en Railway, agregar plugin Postgres, configurar variables, conectar repo, deploy.

## 8. Manejo de errores

- Validación de preguntas obligatorias antes de enviar (cliente y servidor).
- Slugs de encuesta únicos (validación al crear/editar).
- Envío de encuesta resiliente: si falla la escritura a la base de datos, se muestra error y se conservan las respuestas ya ingresadas para reintentar.
- Sesión admin expirada → redirección a login sin perder el intento de acción (mensaje claro).

## 9. Pruebas

- Pruebas unitarias para: generación de CSV, validación de respuestas requeridas, lógica de cálculo de KPIs (promedio, NPS).
- Checklist manual de QA:
  - Flujo completo de kiosco: responder → agradecimiento → auto-reinicio (~6s) → nueva encuesta en blanco.
  - Acceso vía QR y vía link de WhatsApp en celular (responsive).
  - CRUD completo de encuestas y preguntas desde el admin, incluyendo reordenar por drag & drop.
  - Exportar CSV y verificar que el contenido coincide con las respuestas registradas.
  - Cambio de contraseña del admin.

## 10. Fuera de alcance (por ahora)

- Múltiples administradores o roles/permisos por área.
- Autenticación o identificación obligatoria del cliente que responde.
- Notificaciones automáticas (email/WhatsApp) al recibir respuestas.
- Multi-idioma (solo español).
