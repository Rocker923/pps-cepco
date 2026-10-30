#!/usr/bin/env python3
"""
Recorre la carpeta media/ y genera data/medios.js (solo biblioteca estándar).

Convenciones:
  media/portada/            Imágenes de la portada (orden alfabético).
  media/S05-A03/            Archivos de la actividad S05-A03:
      *.jpg|png|webp|...    → galería de imágenes
      *.mp4|webm            → videos
      notas.md              → texto adicional (Markdown sencillo)
      cualquier otro        → documentos / planos descargables (PDF, DWG, DXF, XLSX…)
  Una imagen de actividad cuyo nombre empieza con "portada" (p. ej.
  portada-alineacion.jpg) también aparece en la portada, enlazada a esa actividad.

El título de cada archivo se toma del nombre: "01_alineacion_laser.jpg"
→ "Alineacion laser" (el prefijo numérico solo sirve para ordenar).

La GitHub Action lo ejecuta en cada push; también puede correrse a mano:
    python tools/indexar_medios.py
"""
import json
import os
import re
from urllib.parse import quote

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MEDIA = os.path.join(RAIZ, "media")
SALIDA = os.path.join(RAIZ, "data", "medios.js")

IMG = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"}
VID = {".mp4", ".webm", ".mov"}
IGNORAR = {".gitkeep", ".ds_store", "thumbs.db", "readme.md", "leeme.md", "codigos.md", "desktop.ini"}
CODIGO = re.compile(r"^S\d{2}-A\d{2}$", re.I)


def titulo(nombre):
    base = os.path.splitext(nombre)[0]
    base = re.sub(r"^portada[-_ ]*", "", base, flags=re.I)
    base = re.sub(r"^\d+[-_ .]*", "", base)
    base = re.sub(r"[-_]+", " ", base).strip()
    return (base[:1].upper() + base[1:]) if base else nombre


def url(*partes):
    return "/".join(quote(p) for p in partes)


def tam(ruta):
    b = os.path.getsize(ruta)
    for u in ("B", "KB", "MB", "GB"):
        if b < 1024 or u == "GB":
            return f"{b:.0f} {u}" if u == "B" else f"{b:.1f} {u}"
        b /= 1024


def main():
    datos = {"portada": [], "actividades": {}}
    if not os.path.isdir(MEDIA):
        os.makedirs(MEDIA)

    p = os.path.join(MEDIA, "portada")
    if os.path.isdir(p):
        for f in sorted(os.listdir(p)):
            if os.path.splitext(f)[1].lower() in IMG:
                datos["portada"].append({"src": url("media", "portada", f), "titulo": titulo(f)})

    for carpeta in sorted(os.listdir(MEDIA)):
        ruta = os.path.join(MEDIA, carpeta)
        if not os.path.isdir(ruta) or not CODIGO.match(carpeta):
            continue
        cod = carpeta.upper()
        ent = {"imagenes": [], "videos": [], "documentos": [], "notas": ""}
        for f in sorted(os.listdir(ruta)):
            fr = os.path.join(ruta, f)
            if not os.path.isfile(fr) or f.lower() in IGNORAR or f.startswith("."):
                continue
            ext = os.path.splitext(f)[1].lower()
            src = url("media", carpeta, f)
            if f.lower() == "notas.md":
                with open(fr, encoding="utf-8") as h:
                    ent["notas"] = h.read()
            elif ext in IMG:
                ent["imagenes"].append({"src": src, "titulo": titulo(f)})
                if f.lower().startswith("portada"):
                    datos["portada"].append({"src": src, "titulo": titulo(f), "actividad": cod})
            elif ext in VID:
                ent["videos"].append({"src": src, "titulo": titulo(f)})
            else:
                ent["documentos"].append({"src": src, "titulo": titulo(f),
                                          "tipo": ext.lstrip(".").upper() or "ARCHIVO", "tamano": tam(fr)})
        if any(ent.values()):
            datos["actividades"][cod] = ent

    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    with open(SALIDA, "w", encoding="utf-8") as h:
        h.write("/* Archivo generado por tools/indexar_medios.py — no editar a mano. */\n")
        h.write("window.PPS_MEDIOS = ")
        json.dump(datos, h, ensure_ascii=False, indent=1)
        h.write(";\n")
    n = sum(len(v["imagenes"]) + len(v["videos"]) + len(v["documentos"]) for v in datos["actividades"].values())
    print(f"OK: {len(datos['portada'])} imágenes de portada, {len(datos['actividades'])} actividades con {n} archivos")


if __name__ == "__main__":
    main()
