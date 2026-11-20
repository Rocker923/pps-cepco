#!/usr/bin/env python3
"""
Mueve las fotos de "media/Fotos de las actividades/" a la carpeta de su actividad.

Nombre esperado:  S01-A09_2_Reparacion_de_la_banda.jpeg
  → media/S01-A09/02_Reparacion_de_la_banda.jpeg

- Solo procesa archivos que empiezan con un código SXX-AYY que exista en
  data/actividades.js; el resto se queda en la carpeta para clasificarlo después.
- Si falta el número, o ya existe otra foto con ese número, usa el siguiente libre.
- Espacios → "_"; si la foto mide más de 1600 px o pesa más de 1 MB, la reduce
  (requiere Pillow: pip install pillow).

Uso:
    python tools/colocar_fotos.py            # mueve
    python tools/colocar_fotos.py --prueba   # solo muestra lo que haría
"""
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = os.path.join(RAIZ, "media")
ENTRADA = os.path.join(MEDIA, "Fotos de las actividades")
ACTIVIDADES = os.path.join(RAIZ, "data", "actividades.js")

IMG = {".jpg", ".jpeg", ".png", ".webp"}
PATRON = re.compile(r"^(S\d{2})\s*-\s*(A\d{2})[\s_.-]*(?:(\d+)(?=[\s_.-]))?[\s_.-]*(.*)$", re.I)
LADO_MAX = 1600
PESO_MAX = 1024 * 1024


def codigos_validos():
    with open(ACTIVIDADES, encoding="utf-8") as h:
        return set(re.findall(r'"id":\s*"(S\d{2}-A\d{2})"', h.read()))


def limpiar(texto):
    texto = re.sub(r"[\s_]+", "_", texto.strip())
    return texto.strip("_-.") or "foto"


def numeros_usados(carpeta):
    if not os.path.isdir(carpeta):
        return set()
    return {int(m.group(1)) for f in os.listdir(carpeta) if (m := re.match(r"^(\d+)", f))}


def reducir(ruta):
    try:
        from PIL import Image, ImageOps
    except ImportError:
        print("   (Pillow no instalado: no se revisó el tamaño)")
        return
    with Image.open(ruta) as im:
        if max(im.size) <= LADO_MAX and os.path.getsize(ruta) <= PESO_MAX:
            return
        im = ImageOps.exif_transpose(im)
        im.thumbnail((LADO_MAX, LADO_MAX))
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.save(ruta, quality=82, optimize=True)
        print(f"   reducida a {im.size[0]}×{im.size[1]}")


def main():
    prueba = "--prueba" in sys.argv
    if not os.path.isdir(ENTRADA):
        sys.exit(f"No existe la carpeta {ENTRADA}")
    validos = codigos_validos()
    movidas, sin_codigo, invalidas = 0, 0, []

    for f in sorted(os.listdir(ENTRADA)):
        base, ext = os.path.splitext(f)
        if ext.lower() not in IMG:
            continue
        m = PATRON.match(base)
        if not m:
            sin_codigo += 1
            continue
        cod = f"{m.group(1)}-{m.group(2)}".upper()
        if cod not in validos:
            invalidas.append(f)
            continue
        destino_dir = os.path.join(MEDIA, cod)
        usados = numeros_usados(destino_dir)
        n = int(m.group(3)) if m.group(3) else None
        if n is None or n in usados:
            n = max(usados | {0}) + 1
        nuevo = f"{n:02d}_{limpiar(m.group(4))}{ext.lower()}"
        print(f"{f}\n   → media/{cod}/{nuevo}")
        if not prueba:
            os.makedirs(destino_dir, exist_ok=True)
            destino = os.path.join(destino_dir, nuevo)
            os.replace(os.path.join(ENTRADA, f), destino)
            reducir(destino)
        movidas += 1

    print(f"\n{'Se moverían' if prueba else 'Movidas'}: {movidas} · sin código (se quedan): {sin_codigo}")
    for f in invalidas:
        print(f"  ¡Código inexistente!, revise: {f}")
    if movidas and not prueba:
        print("Ahora ejecute: python tools/indexar_medios.py")


if __name__ == "__main__":
    main()
