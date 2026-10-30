/* Práctica Profesional Supervisada — Gantt interactivo.
   Datos: window.PPS_DATOS (data/actividades.js) y window.PPS_MEDIOS (data/medios.js). */
(function () {
  "use strict";

  var DATOS = window.PPS_DATOS || { semanas: [], areas: [], horasMeta: 800 };
  var MEDIOS = window.PPS_MEDIOS || { portada: [], actividades: {} };
  MEDIOS.portada = MEDIOS.portada || [];
  MEDIOS.actividades = MEDIOS.actividades || {};

  var $ = function (id) { return document.getElementById(id); };
  var DIA_MS = 86400000;
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var DIAS_CORTOS = ["D", "L", "M", "X", "J", "V", "S"];

  var ICONOS = {
    foto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h3l2-2h6l2 2h3v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h6"/></svg>',
    flecha: '<svg class="flecha" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
  };

  /* ---------- utilidades ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fecha(iso) { var p = iso.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function isoDe(d) { return d.toISOString().slice(0, 10); }
  function fechaLarga(iso) {
    if (!iso) return "Sin fecha";
    var d = fecha(iso);
    var t = d.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function rangoCorto(a, b) {
    var x = fecha(a), y = fecha(b);
    var m1 = MESES[x.getUTCMonth()].slice(0, 3), m2 = MESES[y.getUTCMonth()].slice(0, 3);
    return x.getUTCDate() + (m1 === m2 ? "" : " " + m1) + "–" + y.getUTCDate() + " " + m2;
  }
  function normaliza(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function guarda(k, v) { try { localStorage.setItem("pps:" + k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  function lee(k, def) { try { var v = localStorage.getItem("pps:" + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }

  /* Markdown mínimo para notas.md */
  function markdown(md) {
    var lineas = esc(md).split(/\r?\n/), html = [], lista = false, parrafo = [];
    function inline(t) {
      return t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[\s(])_(.+?)_(?=[\s).,;:]|$)/g, "$1<em>$2</em>")
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|[^)\s:]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
    function cierraP() { if (parrafo.length) { html.push("<p>" + inline(parrafo.join(" ")) + "</p>"); parrafo = []; } }
    function cierraL() { if (lista) { html.push("</ul>"); lista = false; } }
    lineas.forEach(function (l) {
      var t = l.trim();
      if (!t) { cierraP(); cierraL(); return; }
      var h = t.match(/^#{1,6}\s+(.*)$/);
      if (h) { cierraP(); cierraL(); html.push("<h5>" + inline(h[1]) + "</h5>"); return; }
      var li = t.match(/^[-*]\s+(.*)$/);
      if (li) { cierraP(); if (!lista) { html.push("<ul>"); lista = true; } html.push("<li>" + inline(li[1]) + "</li>"); return; }
      cierraL(); parrafo.push(t);
    });
    cierraP(); cierraL();
    return html.join("");
  }

  /* ---------- modelo ---------- */
  var semanas = (DATOS.semanas || []).slice().sort(function (a, b) { return a.semana - b.semana; });
  var areas = {};
  (DATOS.areas || []).forEach(function (a) { areas[a.id] = a; });
  var todas = [];
  semanas.forEach(function (s) {
    s.actividades.forEach(function (a) { a.sem = s; a.medios = MEDIOS.actividades[a.id] || null; todas.push(a); });
  });
  var porId = {};
  todas.forEach(function (a) { porId[a.id] = a; });

  // Días hábiles desde el inicio de la primera semana hasta el fin de la última
  var dias = [], idxDia = {};
  if (semanas.length) {
    var d0 = fecha(semanas[0].inicio), d1 = fecha(semanas[semanas.length - 1].fin);
    for (var t = d0.getTime(); t <= d1.getTime(); t += DIA_MS) {
      var d = new Date(t), wd = d.getUTCDay();
      if (wd === 0 || wd === 6) continue;
      var iso = isoDe(d);
      var cubierto = semanas.some(function (s) { return iso >= s.inicio && iso <= s.fin; });
      idxDia[iso] = dias.length;
      dias.push({ iso: iso, d: d, wd: wd, hueco: !cubierto });
    }
  }
  function indiceCercano(iso, haciaAtras) {
    if (idxDia[iso] != null) return idxDia[iso];
    var d = fecha(iso);
    for (var k = 0; k < 3; k++) {
      d = new Date(d.getTime() + (haciaAtras ? -DIA_MS : DIA_MS));
      var i = idxDia[isoDe(d)];
      if (i != null) return i;
    }
    return null;
  }

  /* ---------- estado ---------- */
  var estado = {
    texto: "",
    areasOff: lee("areasOff", []),
    contraidas: lee("contraidas", []),
    compacto: lee("compacto", false),
    actual: null
  };

  /* ---------- cajetín ---------- */
  function pintaCajetin() {
    if (!semanas.length) return;
    var ult = semanas[semanas.length - 1];
    var horas = ult.horasAcumuladas || 0, meta = DATOS.horasMeta || 800;
    var pct = Math.min(100, Math.round(horas / meta * 100));
    var x = fecha(semanas[0].inicio), y = fecha(ult.fin);
    var periodo = x.getUTCDate() + " " + MESES[x.getUTCMonth()].slice(0, 3) + " – " + y.getUTCDate() + " " +
      MESES[y.getUTCMonth()].slice(0, 3) + " " + y.getUTCFullYear();
    $("cajetin").innerHTML =
      '<div class="ancho"><dt>Período</dt><dd>' + esc(periodo) + "</dd></div>" +
      '<div class="izq"><dt>Semanas</dt><dd>' + semanas.length + "</dd></div>" +
      "<div><dt>Actividades</dt><dd>" + todas.length + "</dd></div>" +
      '<div class="ancho"><dt>Horas acumuladas</dt><dd>' + horas + " / " + meta + " h · " + pct + ' %</dd>' +
      '<div class="barra-horas" role="progressbar" aria-valuemin="0" aria-valuemax="' + meta + '" aria-valuenow="' + horas +
      '" aria-label="Horas acumuladas"><span style="width:' + pct + '%"></span></div></div>';
    if (DATOS.generado) {
      var g = new Date(DATOS.generado);
      if (!isNaN(g)) $("actualizado").textContent = "Actualizado el " + g.getDate() + " de " + MESES[g.getMonth()] + " de " + g.getFullYear();
    }
  }

  /* ---------- portada ---------- */
  function pintaPortada() {
    var imgs = MEDIOS.portada.slice(0, 5);
    if (!imgs.length) return;
    var m = $("mosaico");
    m.className = "mosaico" + (imgs.length < 5 ? " n" + imgs.length : "");
    m.innerHTML = imgs.map(function (im, i) {
      var act = im.actividad && porId[im.actividad];
      var cap = act ? '<code>' + esc(act.id) + "</code>" + esc(im.titulo || act.titulo) : esc(im.titulo || "");
      return '<figure><button type="button" data-i="' + i + '" aria-label="' + esc(im.titulo || (act && act.titulo) || "Imagen") + '">' +
        '<img src="' + esc(im.src) + '" alt="' + esc(im.titulo || "") + '" loading="' + (i < 2 ? "eager" : "lazy") + '">' +
        (cap ? "<figcaption>" + cap + "</figcaption>" : "") + "</button></figure>";
    }).join("");
    m.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-i]");
      if (!b) return;
      var im = imgs[+b.dataset.i];
      if (im.actividad && porId[im.actividad]) abrir(im.actividad);
      else abrirVisor(imgs.map(function (x) { return { src: x.src, titulo: x.titulo }; }), +b.dataset.i, b);
    });
    $("portada").hidden = false;
  }

  /* ---------- filtros ---------- */
  function pintaAreas() {
    var cont = {};
    todas.forEach(function (a) { cont[a.area] = (cont[a.area] || 0) + 1; });
    $("areas").innerHTML = (DATOS.areas || []).filter(function (a) { return cont[a.id]; }).map(function (a) {
      var on = estado.areasOff.indexOf(a.id) < 0;
      return '<button type="button" class="chip" data-area="' + a.id + '" aria-pressed="' + on + '" style="--c:var(--a-' + a.id + ')">' +
        "<i></i>" + esc(a.nombre) + " <b>" + cont[a.id] + "</b></button>";
    }).join("");
    $("areas").addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      var id = b.dataset.area, i = estado.areasOff.indexOf(id);
      if (i < 0) estado.areasOff.push(id); else estado.areasOff.splice(i, 1);
      b.setAttribute("aria-pressed", String(i >= 0));
      guarda("areasOff", estado.areasOff);
      aplicaFiltros();
    });
  }
  function coincide(a) {
    if (estado.areasOff.indexOf(a.area) >= 0) return false;
    if (!estado.texto) return true;
    var hay = normaliza([a.id, a.titulo, a.desglose, a.observacion, a.medios && a.medios.notas].join(" "));
    return estado.texto.split(/\s+/).every(function (p) { return hay.indexOf(p) >= 0; });
  }
  function visibles() { return todas.filter(coincide); }

  /* ---------- Gantt ---------- */
  var gantt = $("gantt");
  function px(n) { return "calc(" + n + " * var(--col))"; }

  function pintaGantt() {
    if (!dias.length) { gantt.innerHTML = '<div class="vacio">No hay actividades cargadas.</div>'; return; }
    gantt.style.setProperty("--dias", dias.length);
    if (estado.compacto) gantt.style.setProperty("--col", "18px");

    // Encabezado: meses, semanas, días
    var meses = [], sems = [];
    dias.forEach(function (d, i) {
      var mk = d.d.getUTCFullYear() + "-" + d.d.getUTCMonth();
      if (!meses.length || meses[meses.length - 1].k !== mk) meses.push({ k: mk, n: 0, nombre: MESES[d.d.getUTCMonth()] + " " + d.d.getUTCFullYear() });
      meses[meses.length - 1].n++;
      if (d.wd === 1 || i === 0) {
        var s = semanas.filter(function (x) { return d.iso >= x.inicio && d.iso <= x.fin; })[0];
        sems.push({ n: 0, s: s });
      }
      sems[sems.length - 1].n++;
    });
    var hoyIso = isoDe(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())));

    var h = [];
    h.push('<div class="g-lienzo">');
    h.push('<div class="g-cab"><div class="fila"><div class="esq">Semana · actividad</div><div class="g-escala">');
    h.push('<div class="g-meses">' + meses.map(function (m) {
      return '<div style="width:' + px(m.n) + '">' + esc(m.nombre) + "</div>";
    }).join("") + "</div>");
    h.push('<div class="g-sems">' + sems.map(function (x) {
      return x.s ? '<div style="width:' + px(x.n) + '" title="Semana ' + x.s.semana + '">S' + x.s.semana + "</div>"
        : '<div class="hueco" style="width:' + px(x.n) + '" title="Sin bitácora">—</div>';
    }).join("") + "</div>");
    h.push('<div class="g-dias">' + dias.map(function (d) {
      return '<div class="' + (d.wd === 1 ? "lunes " : "") + (d.iso === hoyIso ? "hoy" : "") + '"><b>' + DIAS_CORTOS[d.wd] + "</b>" + d.d.getUTCDate() + "</div>";
    }).join("") + "</div>");
    h.push("</div></div></div>");

    // Cuerpo
    h.push('<div class="g-cuerpo" id="g-cuerpo">');
    h.push('<div class="g-rejilla" aria-hidden="true">' + dias.map(function (d) {
      return '<div class="' + (d.wd === 1 ? "lunes " : "") + (d.hueco ? "hueco" : "") + '"></div>';
    }).join("") + "</div>");
    if (idxDia[hoyIso] != null) {
      h.push('<div class="g-hoy" title="Hoy" style="left:calc(var(--label-w) + ' + idxDia[hoyIso] + ' * var(--col) + var(--col) / 2 - 1px)"></div>');
    }

    semanas.forEach(function (s) {
      var i0 = indiceCercano(s.inicio, false), i1 = indiceCercano(s.fin, true);
      var abierta = estado.contraidas.indexOf(s.semana) < 0;
      h.push('<div class="g-fila g-sem" data-sem="' + s.semana + '" aria-expanded="' + abierta + '">' +
        '<button type="button" class="lbl" aria-controls="sem-' + s.semana + '">' + ICONOS.flecha +
        "<span>Semana " + s.semana + '</span><span class="rango">' + esc(rangoCorto(s.inicio, s.fin)) + "</span></button>" +
        '<div class="pista">' +
        (i0 != null && i1 != null ? '<div class="resumen" style="left:calc(' + i0 + ' * var(--col) + 2px);width:calc(' + (i1 - i0 + 1) + ' * var(--col) - 4px)"></div>' +
          '<span class="resumen-txt" style="left:calc(' + (i1 + 1) + ' * var(--col) + 8px)"><span class="sem-n">' + s.actividades.length + "</span> act. · " + (s.horasSemana || 0) + " h</span>" : "") +
        "</div></div>");
      h.push('<div id="sem-' + s.semana + '" class="g-grupo"' + (abierta ? "" : " hidden") + ">");
      s.actividades.forEach(function (a) {
        var i = a.fecha ? idxDia[a.fecha] : null;
        var m = a.medios, nImg = m ? m.imagenes.length + m.videos.length : 0, nDoc = m ? m.documentos.length : 0;
        var ico = (nImg ? '<span title="' + nImg + ' imagen(es)">' + ICONOS.foto + "</span>" : "") + (nDoc ? '<span title="' + nDoc + ' documento(s)">' + ICONOS.doc + "</span>" : "");
        h.push('<div class="g-fila g-act" data-id="' + a.id + '" style="--c:var(--a-' + a.area + ')">' +
          '<button type="button" class="lbl" title="' + esc(a.titulo) + '"><span class="num">' + s.semana + "." + a.n + '</span><span class="txt">' + esc(a.titulo) + '</span><span class="ico">' + ico + "</span></button>" +
          '<div class="pista">' +
          (i != null ? '<button type="button" class="barra" tabindex="-1" aria-hidden="true" style="left:calc(' + i + ' * var(--col) + 3px);width:calc(var(--col) - 6px)">' + (nImg ? ICONOS.foto : "") + "</button>" +
            '<span class="barra-txt" style="left:calc(' + (i + 1) + ' * var(--col) + 6px)">' + esc(a.titulo) + "</span>" : "") +
          "</div></div>");
      });
      h.push("</div>");
    });
    h.push('<div class="vacio" id="g-vacio" hidden>Ninguna actividad coincide con la búsqueda o los filtros.</div>');
    h.push("</div></div>");
    gantt.innerHTML = h.join("");

    gantt.addEventListener("click", function (e) {
      var sem = e.target.closest(".g-sem .lbl");
      if (sem) { alternaSemana(+sem.parentNode.dataset.sem); return; }
      var fila = e.target.closest(".g-act");
      if (fila) abrir(fila.dataset.id);
    });
    aplicaFiltros();
  }

  function alternaSemana(n, forzar) {
    var fila = gantt.querySelector('.g-sem[data-sem="' + n + '"]');
    if (!fila) return;
    var abrirla = forzar != null ? forzar : fila.getAttribute("aria-expanded") !== "true";
    fila.setAttribute("aria-expanded", String(abrirla));
    $("sem-" + n).hidden = !abrirla;
    var i = estado.contraidas.indexOf(n);
    if (abrirla && i >= 0) estado.contraidas.splice(i, 1);
    if (!abrirla && i < 0) estado.contraidas.push(n);
    guarda("contraidas", estado.contraidas);
  }

  function aplicaFiltros() {
    var n = 0;
    semanas.forEach(function (s) {
      var k = 0;
      s.actividades.forEach(function (a) {
        var ok = coincide(a), el = gantt.querySelector('.g-act[data-id="' + a.id + '"]');
        if (el) el.hidden = !ok;
        if (ok) k++;
      });
      var fs = gantt.querySelector('.g-sem[data-sem="' + s.semana + '"]');
      if (fs) {
        fs.hidden = k === 0;
        var sn = fs.querySelector(".sem-n");
        if (sn) sn.textContent = k === s.actividades.length ? k : k + " de " + s.actividades.length;
      }
      n += k;
    });
    var v = $("g-vacio");
    if (v) v.hidden = n > 0;
    $("conteo").textContent = n === todas.length ? todas.length + " actividades" : n + " de " + todas.length + " actividades";
  }

  /* ---------- panel de detalle ---------- */
  var panel = $("panel"), velo = $("velo"), origenFoco = null, cerrando = null;

  function abrir(id, desdeHash) {
    var a = porId[id];
    if (!a) return;
    if (!desdeHash && location.hash !== "#" + id) {
      try { history.replaceState(null, "", "#" + id); } catch (e) { /* hash no disponible */ }
    }
    if (panel.hidden) origenFoco = document.activeElement;
    estado.actual = a;
    pintaPanel(a);
    gantt.querySelectorAll(".g-act.activa").forEach(function (x) { x.classList.remove("activa"); });
    var fila = gantt.querySelector('.g-act[data-id="' + id + '"]');
    if (fila) {
      fila.classList.add("activa");
      if (fila.parentNode.hidden) alternaSemana(a.semana, true);
    }
    if (cerrando) { clearTimeout(cerrando); cerrando = null; }
    if (panel.hidden) {
      panel.hidden = false; velo.hidden = false;
      void panel.offsetWidth;
      panel.classList.add("abierto"); velo.classList.add("abierto");
      document.body.style.overflow = "hidden";
      $("panel-cerrar").focus();
    }
  }

  function cerrar() {
    if (panel.hidden) return;
    panel.classList.remove("abierto"); velo.classList.remove("abierto");
    document.body.style.overflow = "";
    gantt.querySelectorAll(".g-act.activa").forEach(function (x) { x.classList.remove("activa"); });
    cerrando = setTimeout(function () { panel.hidden = true; velo.hidden = true; cerrando = null; }, 260);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* nada */ }
    estado.actual = null;
    if (origenFoco && origenFoco.focus) origenFoco.focus();
  }

  function vecino(dir) {
    if (!estado.actual) return null;
    var lista = visibles();
    var i = lista.indexOf(estado.actual);
    if (i < 0) lista = todas, i = todas.indexOf(estado.actual);
    return lista[i + dir] || null;
  }

  function pintaPanel(a) {
    var area = areas[a.area] || { nombre: a.area };
    var m = a.medios || { imagenes: [], videos: [], documentos: [], notas: "" };
    $("panel-codigo").textContent = a.id;
    $("panel-prev").disabled = !vecino(-1);
    $("panel-next").disabled = !vecino(1);

    var h = [];
    h.push('<div><div class="meta"><span>Semana ' + a.semana + " · Actividad " + a.n + "</span><span>" + esc(fechaLarga(a.fecha)) + "</span>" +
      '<span class="area" style="--c:var(--a-' + a.area + ')"><i></i>' + esc(area.nombre) + "</span></div>" +
      '<h3 id="panel-titulo">' + esc(a.titulo) + "</h3></div>");

    if (m.imagenes.length) {
      h.push('<div class="seccion"><h4>Fotografías (' + m.imagenes.length + ')</h4><div class="galeria">' +
        m.imagenes.map(function (im, i) {
          return '<button type="button" data-img="' + i + '" aria-label="Ampliar: ' + esc(im.titulo) + '"><img src="' + esc(im.src) + '" alt="' + esc(im.titulo) + '" loading="lazy"><span>' + esc(im.titulo) + "</span></button>";
        }).join("") + "</div></div>");
    }
    h.push('<div class="seccion"><h4>Desglose de la actividad</h4><p>' +
      (a.desglose ? esc(a.desglose) : '<span style="color:var(--muted)">Esta actividad no tiene desglose registrado en la bitácora.</span>') + "</p></div>");
    if (a.observacion) h.push('<div class="seccion"><h4>Observaciones</h4><p class="observacion">' + esc(a.observacion) + "</p></div>");
    if (m.notas) h.push('<div class="seccion"><h4>Notas</h4><div class="notas">' + markdown(m.notas) + "</div></div>");
    if (m.videos.length) {
      h.push('<div class="seccion"><h4>Videos</h4><div class="videos">' + m.videos.map(function (v) {
        return '<video controls preload="metadata" src="' + esc(v.src) + '" aria-label="' + esc(v.titulo) + '"></video>';
      }).join("") + "</div></div>");
    }
    if (m.documentos.length) {
      h.push('<div class="seccion"><h4>Planos y documentos</h4><ul class="docs">' + m.documentos.map(function (d) {
        return '<li><a href="' + esc(d.src) + '" target="_blank" rel="noopener"><span class="tipo">' + esc(d.tipo) + '</span><span class="nom">' + esc(d.titulo) + '</span><span class="peso">' + esc(d.tamano || "") + "</span></a></li>";
      }).join("") + "</ul></div>");
    }
    if (!m.imagenes.length && !m.videos.length && !m.documentos.length) {
      h.push('<p class="sin-medios">Todavía no hay fotografías ni planos para esta actividad.</p>');
    }
    var cuerpo = $("panel-cuerpo");
    cuerpo.innerHTML = h.join("");
    cuerpo.scrollTop = 0;
    var gal = cuerpo.querySelector(".galeria");
    if (gal) gal.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-img]");
      if (b) abrirVisor(m.imagenes, +b.dataset.img, b);
    });
  }

  $("panel-cerrar").addEventListener("click", cerrar);
  velo.addEventListener("click", cerrar);
  $("panel-prev").addEventListener("click", function () { var v = vecino(-1); if (v) abrir(v.id); });
  $("panel-next").addEventListener("click", function () { var v = vecino(1); if (v) abrir(v.id); });

  /* ---------- visor de imágenes ---------- */
  var visor = $("visor"), vis = { lista: [], i: 0, origen: null };
  function abrirVisor(lista, i, origen) {
    vis.lista = lista; vis.i = i; vis.origen = origen || document.activeElement;
    muestraVisor();
    visor.hidden = false;
    $("visor-cerrar").focus();
  }
  function muestraVisor() {
    var im = vis.lista[vis.i];
    $("visor-foto").src = im.src;
    $("visor-foto").alt = im.titulo || "";
    $("visor-pie").innerHTML = esc(im.titulo || "") + "<small>" + (vis.i + 1) + " / " + vis.lista.length + "</small>";
    $("visor-prev").hidden = $("visor-next").hidden = vis.lista.length < 2;
  }
  function pasoVisor(d) { vis.i = (vis.i + d + vis.lista.length) % vis.lista.length; muestraVisor(); }
  function cerrarVisor() { visor.hidden = true; if (vis.origen && vis.origen.focus) vis.origen.focus(); }
  $("visor-cerrar").addEventListener("click", cerrarVisor);
  $("visor-prev").addEventListener("click", function () { pasoVisor(-1); });
  $("visor-next").addEventListener("click", function () { pasoVisor(1); });
  visor.addEventListener("click", function (e) { if (e.target === visor || e.target.classList.contains("visor-img")) cerrarVisor(); });

  /* ---------- teclado ---------- */
  function atrapaFoco(e, cont) {
    var f = cont.querySelectorAll('button:not([disabled]):not([hidden]), a[href], video, [tabindex="0"]');
    f = Array.prototype.filter.call(f, function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var pri = f[0], ult = f[f.length - 1];
    if (e.shiftKey && document.activeElement === pri) { e.preventDefault(); ult.focus(); }
    else if (!e.shiftKey && document.activeElement === ult) { e.preventDefault(); pri.focus(); }
  }
  document.addEventListener("keydown", function (e) {
    if (!visor.hidden) {
      if (e.key === "Escape") cerrarVisor();
      else if (e.key === "ArrowLeft") pasoVisor(-1);
      else if (e.key === "ArrowRight") pasoVisor(1);
      else if (e.key === "Tab") atrapaFoco(e, visor);
      return;
    }
    if (!panel.hidden) {
      if (e.key === "Escape") cerrar();
      else if (e.key === "Tab") atrapaFoco(e, panel);
      else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !/INPUT|TEXTAREA|VIDEO/.test(document.activeElement.tagName)) {
        var v = vecino(e.key === "ArrowLeft" ? -1 : 1);
        if (v) { e.preventDefault(); abrir(v.id); }
      }
    }
  });

  /* ---------- herramientas ---------- */
  var tBuscar = null;
  $("buscar").addEventListener("input", function (e) {
    clearTimeout(tBuscar);
    var val = e.target.value;
    tBuscar = setTimeout(function () {
      estado.texto = normaliza(val).trim();
      if (estado.texto) semanas.forEach(function (s) { alternaSemana(s.semana, true); });
      aplicaFiltros();
    }, 120);
  });
  $("btn-expandir").addEventListener("click", function () { semanas.forEach(function (s) { alternaSemana(s.semana, true); }); });
  $("btn-contraer").addEventListener("click", function () { semanas.forEach(function (s) { alternaSemana(s.semana, false); }); });
  var btnZoom = $("btn-zoom");
  btnZoom.setAttribute("aria-pressed", String(!!estado.compacto));
  btnZoom.addEventListener("click", function () {
    estado.compacto = !estado.compacto;
    btnZoom.setAttribute("aria-pressed", String(estado.compacto));
    if (estado.compacto) gantt.style.setProperty("--col", "18px"); else gantt.style.removeProperty("--col");
    guarda("compacto", estado.compacto);
  });

  /* ---------- enlaces directos (#S05-A03) ---------- */
  function desdeHash() {
    var id = decodeURIComponent((location.hash || "").slice(1)).toUpperCase();
    if (porId[id]) abrir(id, true);
    else if (!id && !panel.hidden) cerrar();
  }
  window.addEventListener("hashchange", desdeHash);

  pintaCajetin();
  pintaPortada();
  pintaAreas();
  pintaGantt();
  desdeHash();
})();
