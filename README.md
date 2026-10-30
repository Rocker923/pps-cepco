# Práctica Profesional Supervisada · CEPCO

Página web con el diagrama de Gantt interactivo de la Práctica Profesional Supervisada (UNAH, Ingeniería Mecánica Industrial) en Choloma Electric Power Corporation.

Cualquier persona con el enlace puede ver el cronograma, filtrar por área, buscar y abrir cada actividad para leer su desglose y ver fotografías, planos y notas.

---

## 1. Publicar por primera vez en GitHub Pages

1. Cree una cuenta en <https://github.com> (si no tiene).
2. Botón **New repository** → nombre, por ejemplo `pps-cepco` → marque **Public** → **Create repository**.
3. En el repositorio vacío: **uploading an existing file** → arrastre **todo el contenido** de esta carpeta (no la carpeta en sí): `index.html`, `assets/`, `data/`, `media/`, `tools/`, `.github/`, `README.md`, `.gitignore` → **Commit changes**.
   - Si la carpeta `.github` no se subió (algunos sistemas ocultan carpetas que empiezan con punto): **Add file → Create new file**, escriba como nombre `.github/workflows/publicar.yml` y pegue el contenido de ese archivo.
4. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
5. Pestaña **Actions**: espere a que "Publicar página" termine en verde (1–2 minutos).
6. La dirección pública queda así: `https://SU-USUARIO.github.io/pps-cepco/`

Cada vez que suba o cambie un archivo, la página se vuelve a publicar sola.

## 2. Agregar fotografías, planos y notas a una actividad

Cada actividad tiene un código `SSS-AAA` (semana-actividad), por ejemplo **`S05-A03`** = semana 5, actividad 3. La lista completa está en [`media/CODIGOS.md`](media/CODIGOS.md) y el código también aparece arriba del panel al abrir la actividad.

Cree una carpeta con ese código dentro de `media/` y ponga ahí los archivos:

```
media/
  portada/                         ← imágenes de la portada
    01_vista_general_planta.jpg
  S05-A01/
    01_ajuste_angulo_aspas.jpg     ← galería (orden alfabético)
    02_torre_enfriamiento.jpg
    portada-ventilador.jpg         ← también sale en la portada, enlazada a la actividad
    plano_torre.pdf                ← "Planos y documentos" (PDF, DWG, DXF, XLSX, …)
    video_prueba.mp4               ← videos
    notas.md                       ← texto adicional
```

- **El nombre del archivo es su título**: `02_torre_enfriamiento.jpg` se muestra como "Torre enfriamiento". El número inicial solo sirve para ordenar.
- **Portada**: hasta 5 imágenes. Las de `media/portada/` se muestran tal cual; una imagen de actividad cuyo nombre empieza con `portada` además abre esa actividad al hacer clic.
- **Notas** (`notas.md`): párrafos, `## subtítulos`, listas con `- `, **negrita** con `**texto**` y enlaces `[texto](https://…)`.

Subirlos desde la web de GitHub: entre a la carpeta `media/` → **Add file → Upload files** → arrastre la carpeta `S05-A01` completa con sus archivos → **Commit changes**.

Recomendaciones:

| Tipo | Recomendación |
|---|---|
| Fotos | JPG, lado mayor ≤ 1600 px, menos de 1 MB cada una (la página carga más rápido) |
| Planos | PDF para que se vean en el navegador; DWG/DXF quedan como descarga |
| Límite de GitHub | 25 MB por archivo al subir por la web; repositorio idealmente < 1 GB |

> Todo lo que suba al repositorio es público. No suba documentos con firmas, sellos, datos personales o información confidencial de la empresa sin autorización.

## 3. Actualizar las actividades desde las bitácoras

Las actividades salen de los Excel semanales (Hoja1, fila 8 en adelante; el desglose después de "Desglose de actividades").

```bash
pip install openpyxl
# copie las bitácoras .xlsx a la carpeta bitacoras/ (no se suben a GitHub, ver .gitignore)
python tools/generar_datos.py
```

Esto reescribe `data/actividades.js` y `media/CODIGOS.md`. Suba esos dos archivos al repositorio.
El script muestra avisos cuando corrige una fecha mal escrita o cuando no puede emparejar un desglose con su actividad.

- Los desgloses de las semanas 1, 2 y 3 (y el ítem 18 de la semana 4) venían escaneados como imagen; están transcritos dentro de `tools/generar_datos.py` (`DESGLOSE_MANUAL`).
- Las **áreas de trabajo** (colores del Gantt) se asignan por palabras clave en la lista `AREAS` del mismo script; puede cambiar nombres o palabras.

## 4. Ver la página en su computadora

Abra `index.html` con doble clic. Para ver fotos nuevas antes de subirlas, ejecute `python tools/indexar_medios.py` y recargue.

## Estructura

```
index.html                 página
assets/css/estilos.css     estilos (colores en las variables de :root)
assets/js/app.js           Gantt, panel de detalle y visor de imágenes
data/actividades.js        generado desde las bitácoras
data/medios.js             generado desde media/ (lo regenera GitHub al publicar)
media/                     fotos, planos y notas por actividad
tools/                     scripts de Python
.github/workflows/         publicación automática en GitHub Pages
```
