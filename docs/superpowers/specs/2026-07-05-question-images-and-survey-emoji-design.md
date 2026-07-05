# Diseño: Imágenes en preguntas y emoji por encuesta

**Fecha**: 2026-07-05
**Estado**: Aprobado, listo para plan de implementación

## 1. Contexto y propósito

El sitio de encuestas David Fotocolor ya está desplegado en Railway. Se necesitan cuatro mejoras al editor de encuestas:

1. **Emoji por encuesta**: mostrar un emoji junto al título de cada encuesta (ej. 📷 para Fotografía) en el selector público y en el panel admin.
2. **Imágenes en preguntas**: permitir adjuntar una imagen general a cualquier pregunta, y además permitir que cada opción de una pregunta de opción múltiple tenga su propia foto — el caso principal es "¿Quién te atendió?" mostrando la foto de cada empleado como opción.
3. **Editar información de la encuesta**: hoy no hay forma de cambiar el título/descripción de una encuesta ya creada.
4. **Resetear encuesta**: un botón para, después de hacer pruebas, borrar todas las respuestas y devolver título/descripción/emoji/preguntas a como estaban al crear la encuesta.

## 2. Emoji por encuesta

- `Survey` gana un campo `emoji` (`String?`, opcional).
- Editable como campo de texto libre en "Nueva encuesta" (`/admin/encuestas/nueva`) y en el editor de encuesta existente (`/admin/encuestas/[id]`).
- Se muestra:
  - En el selector público (`/`), antes del título de cada tarjeta de encuesta.
  - En el sidebar del admin, antes del título de cada encuesta en la navegación.
- Si `emoji` es `null`, no se muestra nada adicional (sin emoji por defecto).

## 3. Imágenes en preguntas

### Modelo de datos

Nuevo modelo `Image`:

```
Image
  id, data (Bytes), mimeType (String), createdAt
```

Cambios en `Question`:

```
Question
  ...(existente)
  imageId  String?   // FK opcional -> Image, imagen general de la pregunta
  image    Image?    @relation(fields: [imageId], references: [id])
```

El campo `options` (JSON) de `Question`, usado solo para preguntas `MULTIPLE_CHOICE`, cambia de forma:

- **Antes**: `string[]` — ej. `["Retrato", "Producto", "Evento", "Otro"]`
- **Ahora**: `{ label: string, imageId?: string }[]` — ej. `[{ "label": "Ana", "imageId": "abc123" }, { "label": "Luis" }]`

Esta es una referencia "suave" (no FK real de Prisma, porque vive dentro de un campo JSON) — es aceptable dado el volumen bajo de imágenes esperado (fotos de empleados, referencias puntuales), sin necesidad de integridad referencial estricta ni limpieza automática de huérfanos.

### Servir imágenes

Nueva ruta pública `GET /api/images/[id]`:
- Busca el `Image` por id, devuelve los bytes con el `Content-Type` correcto (`mimeType`).
- Cache-Control largo (las imágenes no cambian una vez subidas; al reemplazar una imagen se genera un `Image` nuevo con id distinto).
- 404 si no existe.

Cualquier `<img src="/api/images/{id}">` —tanto en el editor admin como en el formulario público— funciona sin lógica adicional.

### Subida de imágenes (admin)

- Los inputs de archivo (`<input type="file" accept="image/*">`) se envían como parte del `FormData` normal de los Server Actions existentes (Next.js soporta `File` en Server Actions de forma nativa, sin subida a un servicio externo).
- Validación: tipo MIME debe ser `image/jpeg`, `image/png` o `image/webp`; tamaño máximo 5MB. Se valida en el cliente (atributo `accept` + chequeo de tamaño antes de enviar) y en el servidor (rechazo silencioso si no cumple, la pregunta se guarda sin la imagen inválida).
- Al guardar una imagen nueva donde ya había una (edición), se crea un `Image` nuevo y se actualiza el `imageId`; la imagen anterior queda huérfana en la tabla (aceptable, sin limpieza automática — fuera de alcance).

### Editor de preguntas (UI)

**Imagen general de la pregunta** (cualquier tipo):
- En el formulario de agregar/editar pregunta, un campo de archivo opcional con vista previa de la imagen actual (si existe) y un botón "Quitar imagen".

**Opciones de opción múltiple**:
- Deja de ser un campo de texto con valores separados por coma.
- Pasa a ser una lista editable: cada fila tiene un campo de texto (etiqueta) + un campo de archivo opcional (foto de esa opción) + botón para eliminar la fila.
- Botón "+ Agregar opción" para añadir filas nuevas.
- Debe construirse como un componente cliente (React) que arma el JSON de opciones (`{label, imageId}[]`) antes de enviar el formulario, ya que el número de opciones es dinámico.

### Formulario público

- Si la pregunta tiene `imageId`, se muestra la imagen sobre el texto de la pregunta (imagen ilustrativa/de referencia).
- Para preguntas `MULTIPLE_CHOICE`: si alguna opción tiene imagen, cada opción se renderiza como una tarjeta (foto + nombre debajo) en vez de un botón de solo texto. Si ninguna opción de esa pregunta tiene imagen, se mantiene el estilo actual de botones de texto (sin cambios visuales para las 3 encuestas existentes).

### Validación de respuestas y KPIs

- `validate-answers.ts`: al validar `MULTIPLE_CHOICE`, ahora compara el valor contra `options.map(o => o.label)` en vez de comparar contra el array de strings directo.
- `kpis.ts` y `csv.ts`: no requieren cambios — solo trabajan con `Question.type`/`text` y el valor de la respuesta (que sigue siendo el `label` de la opción elegida, no el `imageId`).

### Migración de datos existentes

Las 3 encuestas sembradas tienen una pregunta `MULTIPLE_CHOICE` ("¿Qué tipo de sesión tomaste?" en Fotografía) con `options` como `string[]`. Al desplegar el cambio de esquema, se necesita un script de migración de datos (no solo de esquema) que convierta cualquier `options` existente de `string[]` a `{label: string}[]` antes de que el código nuevo intente leerlo con la forma nueva.

## 4. Editar información de la encuesta

- En `/admin/encuestas/[id]`, un botón "Editar" junto al título abre un formulario inline con: título, descripción, emoji.
- El **slug queda fijo** (no editable desde este formulario) — la URL pública `/encuesta/{slug}` nunca cambia después de creada, para no romper QRs o links ya compartidos.
- Guardar actualiza únicamente `Survey.title`, `description`, `emoji`. No toca `slug`, `questions` ni `responses`.

## 5. Resetear encuesta (fábrica + borrar respuestas)

### Snapshot de fábrica

- `Survey` gana un campo `factorySnapshot` (`Json`) que captura, en el momento de creación de la encuesta, `{ title, description, emoji, questions: [{ type, text, required, order, options }] }`.
- Se guarda automáticamente:
  - Al crear una encuesta desde `/admin/encuestas/nueva` (con las preguntas vacías en ese momento — normalmente ninguna aún).
  - Al correr `prisma/seed.ts` para las 3 encuestas iniciales (con sus preguntas ya definidas).
- **Migración para las 3 encuestas ya desplegadas**: como fueron creadas antes de este cambio y no tienen snapshot, un script de migración de datos les genera uno usando su estado **actual** en la base de datos (título/descripción/preguntas tal como están ahora, incluyendo cualquier edición manual que ya se les haya hecho) — no el contenido original de `seed.ts`.

### Botón "Resetear encuesta"

- Visible en `/admin/encuestas/[id]`, con confirmación explícita (el usuario debe confirmar en un diálogo que describe que se borrarán todas las respuestas y las preguntas actuales).
- Al confirmar:
  1. Borra todas las `Response` de la encuesta (y sus `Answer` por cascada).
  2. Restaura `title`, `description`, `emoji` desde `factorySnapshot`.
  3. Borra las `Question` actuales y crea unas nuevas idénticas a las del snapshot (nuevos ids — no hay problema porque las respuestas ya se borraron en el paso 1, no quedan `Answer` apuntando a las preguntas viejas).
  4. El `slug` nunca cambia.

## 6. Fuera de alcance

- Recorte/edición de imágenes (crop, resize) — se suben tal cual, el navegador las escala visualmente.
- Limpieza automática de imágenes huérfanas al reemplazar/eliminar preguntas u opciones.
- Selector de emoji con picker visual (queda como campo de texto libre).
- Múltiples imágenes por pregunta (solo una imagen general + una por opción).
- Actualizar el `factorySnapshot` después de la creación (ediciones posteriores a preguntas/título no se reflejan en el snapshot; "fábrica" siempre es el estado al momento de crear la encuesta, no el último guardado).
