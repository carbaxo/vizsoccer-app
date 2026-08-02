/* Pantalla de perfil: ficha de jugador, retos y gestión de perfiles.
 *
 * Solo se ejecuta en perfil.html. Los datos y el cálculo están en perfil.js;
 * aquí no hay más lógica que la de pintar y animar.
 */
(() => {
  const raiz = document.querySelector('#perfil');
  if (!raiz || !window.VS) return;

  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const menosMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Cuenta hasta el número final en vez de aparecer de golpe: es lo que hace
   * que una ficha se sienta "viva" cuando acabas de entrenar. */
  const contarHasta = (el, fin, ms = 900) => {
    if (menosMovimiento) { el.textContent = fin; return; }
    const ini = performance.now();
    const paso = ahora => {
      const t = Math.min(1, (ahora - ini) / ms);
      // Desaceleración: rápido al principio, se posa al final.
      el.textContent = Math.round(fin * (1 - (1 - t) ** 3));
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };

  // ------------------------------------------------------------------ ficha
  const pintarFicha = () => {
    const p = VS.activo();
    const f = VS.ficha();
    const xp = VS.experiencia();
    const racha = VS.diasSeguidos();

    const filas = f.atributos.map(a => `
      <div class="fj-attr">
        <span class="fj-attr-val" data-val="${a.valor}">0</span>
        <span class="fj-attr-nom">${a.corto}</span>
        <i class="fj-attr-barra"><b style="--v:${a.valor}%"></b></i>
      </div>`).join('');

    return `
      <section class="ficha-jugador" aria-label="Ficha de ${esc(p.nombre)}">
        <div class="fj-carta" tabindex="0" role="button" aria-label="Girar la ficha">
          <div class="fj-cara fj-frente">
            <div class="fj-cabecera">
              <div class="fj-general"><strong data-general="${f.general}">0</strong><span>${esc(p.posicion)}</span></div>
              <img class="fj-avatar" src="art/avatar-${p.color % 6}.svg" alt="" width="96" height="96">
            </div>
            <div class="fj-nombre">${esc(p.nombre)}</div>
            <div class="fj-atributos">${filas}</div>
            <div class="fj-pie"><span>Nº ${esc(p.dorsal)}</span><span>Pie ${esc(p.pie)}</span></div>
          </div>
          <div class="fj-cara fj-dorso">
            <h3>Cómo sube la ficha</h3>
            <p>Cada ejercicio que marcas como hecho suma a su área. Los avanzados valen más que los de iniciación, y repetir el mismo suma hasta cinco veces: a partir de ahí lo que hace falta es variar.</p>
            <dl class="fj-datos">
              <div><dt>Ejercicios distintos</dt><dd>${f.hechos} <small>de 52</small></dd></div>
              <div><dt>Repeticiones</dt><dd>${f.repeticiones}</dd></div>
              <div><dt>Días seguidos</dt><dd>${racha}</dd></div>
              <div><dt>Desde</dt><dd>${esc(p.creado)}</dd></div>
            </dl>
            <p class="fj-nota">Toca la ficha para volver.</p>
          </div>
        </div>
        <div class="fj-nivel">
          <div class="fj-nivel-txt"><strong>Nivel ${xp.nivel}</strong><span>${xp.xp - xp.base} / ${xp.techo - xp.base} XP</span></div>
          <i class="fj-nivel-barra"><b style="--v:${Math.round(xp.progreso * 100)}%"></b></i>
          ${racha ? `<span class="fj-racha">🔥 ${racha} ${racha === 1 ? 'día seguido' : 'días seguidos'}</span>` : ''}
        </div>
      </section>`;
  };

  // ------------------------------------------------------------------ retos
  const pintarRetos = () => {
    const lista = VS.retos();
    const ganados = lista.filter(r => r.completado).length;
    const tarjetas = lista.map((r, i) => `
      <li class="reto ${r.completado ? 'reto-ok' : ''}" style="--i:${i}">
        <img class="reto-medalla" src="art/medalla-${r.icono}${r.completado ? '' : '-off'}.svg" alt="" width="64" height="64" loading="lazy">
        <div class="reto-txt">
          <strong>${esc(r.nombre)}</strong>
          <p>${esc(r.desc)}</p>
          <i class="reto-barra"><b style="--v:${Math.round(r.hecho / r.meta * 100)}%"></b></i>
        </div>
        <span class="reto-cuenta">${r.completado ? '✓' : `${r.hecho}/${r.meta}`}</span>
      </li>`).join('');
    return `
      <section class="bloque">
        <div class="bloque-cab"><h2>Retos</h2><span class="result-count">${ganados} de ${lista.length}</span></div>
        <ul class="retos">${tarjetas}</ul>
      </section>`;
  };

  // --------------------------------------------------------------- perfiles
  const pintarPerfiles = () => {
    const activo = VS.activo();
    const fichas = VS.lista().map(p => `
      <button class="perfil-chip ${p.id === activo.id ? 'on' : ''}" type="button" data-perfil="${p.id}">
        <img src="art/avatar-${p.color % 6}.svg" alt="" width="96" height="96">
        <span>${esc(p.nombre)}</span>
      </button>`).join('');
    return `
      <section class="bloque">
        <div class="bloque-cab"><h2>Perfiles</h2><button class="reset-button" type="button" data-accion="nuevo">+ Añadir</button></div>
        <div class="perfil-chips">${fichas}</div>
        <form class="perfil-form" autocomplete="off">
          <label>Nombre<input name="nombre" maxlength="18" value="${esc(activo.nombre)}"></label>
          <label>Posición<select name="posicion">${VS.POSICIONES.map(x => `<option ${x === activo.posicion ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
          <label>Dorsal<input name="dorsal" type="number" min="1" max="99" value="${esc(activo.dorsal)}"></label>
          <label>Pie<select name="pie"><option ${activo.pie === 'derecho' ? 'selected' : ''}>derecho</option><option ${activo.pie === 'izquierdo' ? 'selected' : ''}>izquierdo</option></select></label>
          <label>Color<select name="color">${[0, 1, 2, 3, 4, 5].map(i => `<option value="${i}" ${i === activo.color ? 'selected' : ''}>Color ${i + 1}</option>`).join('')}</select></label>
          ${VS.lista().length > 1 ? '<button class="perfil-borrar" type="button" data-accion="borrar">Borrar este perfil</button>' : ''}
        </form>
      </section>`;
  };

  // ----------------------------------------------------------------- pintar
  const render = () => {
    raiz.innerHTML = pintarFicha() + pintarRetos() + pintarPerfiles();

    // Los números de la ficha se animan al entrar (y al volver a pintar).
    const gen = raiz.querySelector('[data-general]');
    contarHasta(gen, +gen.dataset.general);
    raiz.querySelectorAll('.fj-attr-val').forEach((el, i) =>
      setTimeout(() => contarHasta(el, +el.dataset.val, 700), menosMovimiento ? 0 : 90 * i));

    const carta = raiz.querySelector('.fj-carta');
    const girar = () => carta.classList.toggle('girada');
    carta.addEventListener('click', girar);
    carta.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); girar(); } });

    raiz.querySelectorAll('[data-perfil]').forEach(b =>
      b.addEventListener('click', () => VS.cambiarA(b.dataset.perfil)));

    raiz.querySelector('[data-accion="nuevo"]').addEventListener('click', () => {
      const nombre = prompt('Nombre del nuevo perfil');
      if (nombre?.trim()) VS.crear(nombre.trim(), { color: VS.lista().length % 6 });
    });
    raiz.querySelector('[data-accion="borrar"]')?.addEventListener('click', () => {
      if (confirm(`¿Borrar el perfil "${VS.activo().nombre}" y todo su progreso?`)) VS.borrar(VS.activo().id);
    });

    // El formulario guarda al vuelo; el nombre espera a que se deje de teclear
    // para no repintar la ficha en cada letra.
    const form = raiz.querySelector('.perfil-form');
    let espera;
    form.addEventListener('input', e => {
      const { name, value } = e.target;
      const campo = name === 'dorsal' || name === 'color' ? Number(value) : value;
      clearTimeout(espera);
      espera = setTimeout(() => VS.actualizar({ [name]: campo }), name === 'nombre' ? 500 : 0);
    });
  };

  render();
  VS.alCambiar(render);
})();
