# Encuestas David Fotocolor

Sitio de encuestas de satisfacción para David Fotocolor (Fotografía, Edición, Servicio al Cliente).

## Desarrollo local

1. `npm install`
2. Copia `.env.example` a `.env` y ajusta los valores.
3. Necesitas una base de datos PostgreSQL accesible (local o remota) en `DATABASE_URL`.
4. `npx prisma migrate dev`
5. `npx prisma db seed`
6. `npm run dev`

## Despliegue en Railway

1. Crea un nuevo proyecto en Railway y conéctalo a este repositorio (New Project → Deploy from GitHub repo).
2. Agrega el plugin de PostgreSQL: New → Database → PostgreSQL. Railway crea automáticamente la variable `DATABASE_URL` y la comparte con el servicio web si están en el mismo proyecto (referencia la variable en el servicio web como `${{Postgres.DATABASE_URL}}` si no se auto-vincula).
3. En el servicio web, configura las variables de entorno:
   - `ADMIN_USERNAME` — usuario inicial del admin
   - `ADMIN_PASSWORD` — contraseña inicial del admin (cámbiala después desde `/admin/configuracion`)
   - `SESSION_SECRET` — cadena aleatoria larga (por ejemplo, generada con `openssl rand -base64 32`)
   - `BASE_URL` — la URL pública que Railway asigna al servicio (ej. `https://encuestas-davidfotocolor.up.railway.app`)
4. Railway detecta Next.js automáticamente y usa `npm run build` / `npm run start`. El comando `start` corre `prisma migrate deploy` antes de levantar el servidor, así que las migraciones se aplican en cada deploy.
5. Después del primer deploy, corre el seed una vez desde la consola de Railway (Shell del servicio): `npx prisma db seed`. Esto crea el admin inicial y las 3 encuestas base.
6. Verifica: abre la URL pública, confirma que aparecen las 3 encuestas, y entra a `/admin/login` con las credenciales configuradas.

## Estructura del proyecto

- `src/app/` — páginas públicas (`/`, `/encuesta/[slug]`) y panel admin (`/admin/**`)
- `src/lib/` — lógica de negocio sin dependencias de React (auth, validación, KPIs, CSV, QR)
- `src/components/` — componentes de UI para el formulario público y el panel admin
- `prisma/` — esquema, migraciones y seed
- `tests/unit/` — pruebas de los módulos en `src/lib/`
