# Diseño: Rediseño visual con estándares Apple HIG

**Fecha**: 2026-07-06
**Estado**: Aprobado, listo para plan de implementación

## 1. Contexto y propósito

El sitio de encuestas David Fotocolor (kiosco público + panel admin) funciona correctamente pero su apariencia visual es funcional/básica. Se busca llevarlo "al siguiente nivel" adoptando el lenguaje visual de las Apple Human Interface Guidelines (HIG) — el sistema de diseño que usan las apps nativas de iOS/macOS — para que el flujo público se sienta como una app nativa de iPhone/iPad, y el panel admin se sienta como una app de macOS.

Las HIG son literalmente para apps nativas de Apple; para un sitio web se adapta su **espíritu** (tipografía de sistema, escala tipográfica, colores neutros "system gray", radios y sombras, controles familiares como segmented controls y listas agrupadas, movimiento tipo resorte) sin usar assets con licencia restringida (SF Symbols, fuente San Francisco embebida).

Este es un proyecto **puramente visual/de presentación** — no cambia el modelo de datos, la lógica de negocio, ni el comportamiento funcional ya construido (encuestas, preguntas, imágenes, resultados, reset, etc.). Cubre todo el sitio: flujo público y panel admin, en un solo plan.

## 2. Fundación del sistema de diseño

### Tipografía

Pila de fuente del sistema, sin fuentes embebidas (evita problemas de licencia de San Francisco):

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

En dispositivos Apple (iPhone/iPad/Mac) esto renderiza la San Francisco real automáticamente vía el sistema operativo — sin descargar ni embeber nada. En otros dispositivos cae a una sans-serif de sistema equivalente.

Escala tipográfica (inspirada en los text styles de HIG):

| Nombre | Tamaño | Peso | Uso |
|---|---|---|---|
| Large Title | 34px | 800 | Título de pantalla (selector, dashboard) |
| Title | 28px | 800 | Título de sub-pantalla (encuesta abierta) |
| Headline | 17px | 600 | Encabezados de tarjeta, preguntas |
| Body | 15-17px | 400 | Texto de contenido |
| Caption | 13px | 400 | Texto secundario, metadatos |

### Color

Se conservan los colores de marca (`--color-brand-orange: #F26522`, `--color-brand-navy: #1B3A6B`) y se añaden los "system grays" de Apple para fondos y jerarquía neutra:

- `--color-system-background: #F2F2F7` (fondo agrupado claro, admin)
- `--color-system-secondary-text: #8E8E93`
- `--color-system-separator: #ECECEE`
- Fondo oscuro del flujo público: gradiente `#1B3A6B → #0D1D38`

No se implementa modo oscuro conmutable por el sistema — cada pantalla tiene un tema fijo (público = oscuro/glass, admin = claro), decisión ya tomada.

### Espaciado y radios

Escala de espaciado en múltiplos de 4px (4/8/12/16/20/24/32). Radios de tarjeta 12-20px. Sombras sutiles (`0 1px 2-3px rgba(0,0,0,.05-.06)` en admin; blur/glass `backdrop-filter: blur(20px)` sobre fondo oscuro en el flujo público).

### Movimiento

Se agrega `framer-motion` como dependencia nueva:
- Transiciones de entrada/salida entre pantallas (fade + slide sutil).
- Feedback de presión en botones/tarjetas interactivas (`whileTap={{ scale: 0.96 }}`).
- Animación tipo resorte en la pantalla de agradecimiento (ícono de check).

### Íconos

Se agrega `lucide-react` como dependencia nueva, reemplazando los emojis actuales por íconos vectoriales outline (visualmente cercanos a SF Symbols, sin restricción de licencia). Mapeo principal: ⭐→`Star`, 👤→`User`, 📷→`Camera`, 🎨→`Palette`, 🎧→`Headphones`, ✓→`Check`, ✎→`Pencil`, 🗑→`Trash2`, ⬇→`Download`, ⠿ (drag handle)→`GripVertical`.

## 3. Componentes reutilizables

Nuevo directorio `src/components/ui/`, componentes de solo presentación (sin lógica de negocio):

- **`Card`**: variantes `glass` (blur, fondo oscuro) y `solid` (admin, fondo blanco con sombra sutil).
- **`SegmentedControl`**: control de dos opciones (usado para Sí/No), reemplaza los botones actuales.
- **`ListRow`**: fila con ícono + texto + chevron opcional (selector público, sidebar admin, tabla de resultados).
- **`Avatar`**: círculo con foto (`/api/images/[id]`) o placeholder de ícono `User`.
- **`Button`**: variantes `primary` (naranja) / `secondary` (borde), con animación de presión.
- **`Badge`**: etiqueta de estado (Activa/Inactiva).
- **`StarRating`**: control de calificación 1-5 restyleado con ícono `Star`.
- **`NPSScale`**: control 0-10 restyleado.

Cada componente se usa tanto en el flujo público como en el admin donde aplique, evitando duplicar estilos.

## 4. Flujo público (kiosco)

- **`/` (selector)**: lista agrupada oscura con blur — logo, "Large Title" Encuestas, filas (`ListRow`) con ícono a color por encuesta (usa `survey.emoji` mapeado a un ícono de `lucide-react` cuando sea uno de los conocidos, o el emoji tal cual como fallback) + chevron, transición de entrada.
- **`/encuesta/[slug]` (formulario)**: cada pregunta en su propia `Card` variante glass; `SegmentedControl` para Sí/No; `StarRating`/`NPSScale` restyleados; `Avatar` para opciones de opción múltiple con foto; botón de envío (`Button`) flotante inferior con sombra de color. Errores de validación se muestran con una transición sutil, sin perder las respuestas ya ingresadas (comportamiento actual, sin cambios).
- **Agradecimiento**: ícono de check animado (spring), cuenta regresiva visual antes del auto-reinicio a `/` (comportamiento de navegación sin cambios, solo la presentación).

### Accesibilidad (flujo público y admin)

- Todas las áreas táctiles/clicables (botones, opciones, estrellas, filas de lista) tienen un área mínima de 44×44px.
- Contraste de texto verificado nivel AA tanto sobre el fondo oscuro/glass como sobre fondo claro.
- Estados de foco visibles (anillo con el color de marca) para navegación por teclado, en todos los controles interactivos.

## 5. Panel admin

- **Sidebar**: oscura estilo Finder/Ajustes de Mac, secciones agrupadas con encabezados en mayúsculas pequeñas ("General", "Encuestas"), fila activa resaltada, usa `ListRow`.
- **Dashboard**: fondo `--color-system-background`, tarjetas de KPI (`Card` variante solid) con ícono en gradiente + `Badge` de estado, gráfico de barras (Recharts, ya existente) integrado al mismo sistema de color.
- **Editor de encuesta**: preguntas en `Card` solid; `ImageUploadField` y `QuestionOptionsEditor` restyleados usando `Button`/`Card`; `ResetSurveyButton` con estilo de alerta destructiva más marcado.
- **Resultados**: mismas tarjetas de KPI que el dashboard; tabla de respuestas usando `ListRow` para cada fila.
- **Login / Configuración**: tarjeta centrada (`Card` solid), inputs con foco animado, mismo lenguaje visual que el resto del admin.

## 6. Fuera de alcance

- Cambios al modelo de datos, Server Actions, validación, o cualquier lógica de negocio ya construida.
- Modo oscuro conmutable por el sistema operativo (cada pantalla mantiene su tema fijo).
- Uso de SF Symbols reales o la fuente San Francisco embebida (restricciones de licencia) — se usan `lucide-react` y la pila de fuente del sistema en su lugar.
- Rediseño de la estructura de navegación/rutas — las URLs y el flujo de páginas no cambian, solo su presentación.

## 7. Testing

Al ser un cambio puramente visual sin lógica nueva, no aplica TDD de unidades. Verificación:
- Build de producción sin errores de tipos.
- Suite de tests unitarios existente (`src/lib/**`) sigue pasando sin cambios (esta capa no se toca).
- Verificación manual/visual de cada pantalla rediseñada (capturas o revisión en navegador), incluyendo una pasada de accesibilidad básica (contraste, tamaño de áreas táctiles, navegación por teclado).
