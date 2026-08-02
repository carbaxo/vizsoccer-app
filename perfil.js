/* Motor de perfiles, ficha de jugador y retos de VizSoccer.
 *
 * Se carga en las tres páginas porque el catálogo y los planes también anotan
 * progreso. La página `perfil.html` solo pinta lo que hay aquí.
 *
 * Todo vive en el dispositivo (`localStorage`), igual que el resto de la app:
 * no hay cuenta ni servidor. Los perfiles son varios para que puedan usar la
 * misma tableta o el mismo móvil dos hermanos, o un entrenador con sus chicos.
 */
window.VS = (() => {
  const CLAVE = 'vs:perfiles';
  const CLAVE_ACTIVO = 'vs:activo';

  const leer = (clave, porDefecto) => {
    try { return JSON.parse(localStorage.getItem(clave)) ?? porDefecto; } catch { return porDefecto; }
  };
  const escribir = (clave, valor) => { try { localStorage.setItem(clave, JSON.stringify(valor)); } catch {} };

  // ------------------------------------------------------------ atributos
  /* Las seis categorías de la ficha. Cada una recoge varios `objetivo` del
   * catálogo: los 14 objetivos de los ejercicios son demasiados para una
   * ficha, y agrupados en seis se leen de un vistazo. */
  const ATRIBUTOS = [
    { id: 'rit', nombre: 'Ritmo',    corto: 'RIT', objetivos: ['coordinación', 'reacción', 'giros'] },
    { id: 'tir', nombre: 'Tiro',     corto: 'TIR', objetivos: ['tiro', 'precisión'] },
    { id: 'pas', nombre: 'Pase',     corto: 'PAS', objetivos: ['pase', 'pared', 'desmarque'] },
    { id: 'reg', nombre: 'Regate',   corto: 'REG', objetivos: ['regate', 'conducción'] },
    { id: 'con', nombre: 'Control',  corto: 'CON', objetivos: ['control', 'dominio'] },
    { id: 'fis', nombre: 'Físico',   corto: 'FÍS', objetivos: ['protección', 'mixto'] }
  ];
  const ATRIBUTO_POR_OBJETIVO = {};
  ATRIBUTOS.forEach(a => a.objetivos.forEach(o => { ATRIBUTO_POR_OBJETIVO[o] = a.id; }));

  /* Un ejercicio avanzado cuenta más que uno de iniciación: si no, la ficha
   * sube igual repitiendo lo fácil y deja de medir nada. */
  const PESO_NIVEL = { 'iniciación': 1, 'intermedio': 1.6, 'avanzado': 2.4 };

  const POSICIONES = ['POR', 'DFC', 'LTD', 'LTI', 'MCD', 'MC', 'MCO', 'ED', 'EI', 'DC'];

  const ejercicios = () => (window.TRAINING_DATA?.exercises) || {};

  // ---------------------------------------------------------------- perfiles
  const perfilNuevo = (nombre, extra = {}) => ({
    id: `p${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    nombre: nombre || 'Jugador',
    posicion: extra.posicion || 'MC',
    pie: extra.pie || 'derecho',
    dorsal: extra.dorsal || 10,
    color: extra.color || 0,
    foto: extra.foto || '',
    creado: new Date().toISOString().slice(0, 10),
    hechos: {},      // id de ejercicio -> { veces, ultima }
    sesiones: {},    // nombre de plan -> { día: fecha }
    favoritos: [],
    retos: {},       // id de reto -> fecha en que se completó
    historial: []    // { fecha, tipo, id } para las rachas y el reto semanal
  });

  let perfiles = leer(CLAVE, null);
  let activoId = leer(CLAVE_ACTIVO, null);

  /* Primera vez: se crea un perfil y se le mete lo que ya hubiera guardado la
   * versión anterior de la app, para no perder favoritos ni sesiones. */
  if (!Array.isArray(perfiles) || !perfiles.length) {
    const primero = perfilNuevo('Jugador');
    primero.favoritos = leer('ft:favoritos', []);
    primero.sesiones = leer('ft:progreso', {});
    perfiles = [primero];
    activoId = primero.id;
    escribir(CLAVE, perfiles);
    escribir(CLAVE_ACTIVO, activoId);
  }
  if (!perfiles.some(p => p.id === activoId)) activoId = perfiles[0].id;

  const guardar = () => { escribir(CLAVE, perfiles); escribir(CLAVE_ACTIVO, activoId); };
  const activo = () => perfiles.find(p => p.id === activoId) || perfiles[0];

  const oyentes = new Set();
  const avisar = () => { guardar(); oyentes.forEach(fn => { try { fn(activo()); } catch {} }); };

  // ------------------------------------------------------------------ ficha
  /* Curva de progreso: sube deprisa al principio y se va frenando, así que los
   * últimos puntos cuestan de verdad. Nunca llega a 99 del todo, se acerca. */
  const valorAtributo = puntos => Math.round(40 + 59 * (1 - Math.exp(-puntos / 26)));

  const ficha = (perfil = activo()) => {
    const cat = ejercicios();
    const puntos = Object.fromEntries(ATRIBUTOS.map(a => [a.id, 0]));
    Object.entries(perfil.hechos).forEach(([id, dato]) => {
      const ej = cat[id];
      if (!ej) return;
      const attr = ATRIBUTO_POR_OBJETIVO[ej.objetivo];
      if (!attr) return;
      // Repetir el mismo ejercicio suma, pero solo hasta cinco veces: a partir
      // de ahí lo que hace falta es variar, no insistir.
      puntos[attr] += (PESO_NIVEL[ej.nivel] || 1) * Math.min(dato.veces || 1, 5);
    });
    const valores = Object.fromEntries(ATRIBUTOS.map(a => [a.id, valorAtributo(puntos[a.id])]));
    const media = ATRIBUTOS.reduce((s, a) => s + valores[a.id], 0) / ATRIBUTOS.length;
    return {
      atributos: ATRIBUTOS.map(a => ({ ...a, valor: valores[a.id], puntos: puntos[a.id] })),
      general: Math.round(media),
      hechos: Object.keys(perfil.hechos).length,
      repeticiones: Object.values(perfil.hechos).reduce((s, d) => s + (d.veces || 0), 0)
    };
  };

  /* El nivel sale de la experiencia con la misma idea: cada nivel pide más que
   * el anterior. `xp` son 10 puntos por ejercicio, ponderados por dificultad. */
  const experiencia = (perfil = activo()) => {
    const cat = ejercicios();
    let xp = 0;
    Object.entries(perfil.hechos).forEach(([id, dato]) => {
      const ej = cat[id];
      if (ej) xp += 10 * (PESO_NIVEL[ej.nivel] || 1) * (dato.veces || 1);
    });
    xp += Object.keys(perfil.retos).length * 40;
    const nivel = Math.floor(Math.sqrt(xp / 60)) + 1;
    const base = (nivel - 1) ** 2 * 60;
    const techo = nivel ** 2 * 60;
    return { xp: Math.round(xp), nivel, base, techo, progreso: (xp - base) / (techo - base) };
  };

  // ------------------------------------------------------------------ rachas
  const diasSeguidos = (perfil = activo()) => {
    const dias = new Set(perfil.historial.map(h => h.fecha));
    if (!dias.size) return 0;
    let racha = 0;
    const d = new Date();
    // Si hoy todavía no se ha entrenado, la racha puede seguir viva desde ayer.
    if (!dias.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (dias.has(d.toISOString().slice(0, 10))) { racha++; d.setDate(d.getDate() - 1); }
    return racha;
  };

  const enUltimosDias = (perfil, dias) => {
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    const iso = limite.toISOString().slice(0, 10);
    return perfil.historial.filter(h => h.fecha > iso);
  };

  // ------------------------------------------------------------------- retos
  /* Cada reto sabe medirse solo: devuelve cuánto se lleva hecho sobre su meta.
   * Están ordenados de más asequible a más exigente. */
  const RETOS = [
    { id: 'primeros', nombre: 'Primeros toques', desc: 'Completa 3 ejercicios cualesquiera', meta: 3, icono: 'balon',
      medir: p => Object.keys(p.hechos).length },
    { id: 'variedad', nombre: 'Sin lagunas', desc: 'Toca las 6 áreas de la ficha al menos una vez', meta: 6, icono: 'diana',
      medir: p => new Set(Object.keys(p.hechos).map(id => ATRIBUTO_POR_OBJETIVO[ejercicios()[id]?.objetivo]).filter(Boolean)).size },
    { id: 'regateador', nombre: 'Regateador', desc: 'Completa 6 ejercicios de regate o conducción', meta: 6, icono: 'cono',
      medir: p => Object.keys(p.hechos).filter(id => ATRIBUTO_POR_OBJETIVO[ejercicios()[id]?.objetivo] === 'reg').length },
    { id: 'francotirador', nombre: 'Francotirador', desc: 'Completa 5 ejercicios de tiro o precisión', meta: 5, icono: 'porteria',
      medir: p => Object.keys(p.hechos).filter(id => ATRIBUTO_POR_OBJETIVO[ejercicios()[id]?.objetivo] === 'tir').length },
    { id: 'pasador', nombre: 'Manos de seda', desc: 'Completa 5 ejercicios de pase', meta: 5, icono: 'pase',
      medir: p => Object.keys(p.hechos).filter(id => ATRIBUTO_POR_OBJETIVO[ejercicios()[id]?.objetivo] === 'pas').length },
    { id: 'racha3', nombre: 'Tres al hilo', desc: 'Entrena 3 días seguidos', meta: 3, icono: 'llama',
      medir: p => diasSeguidos(p) },
    { id: 'semana', nombre: 'Semana completa', desc: 'Entrena 3 días distintos en los últimos 7', meta: 3, icono: 'calendario',
      medir: p => new Set(enUltimosDias(p, 7).map(h => h.fecha)).size },
    { id: 'pareja', nombre: 'Mejor en compañía', desc: 'Completa 5 ejercicios por parejas', meta: 5, icono: 'dos',
      medir: p => Object.keys(p.hechos).filter(id => ejercicios()[id]?.jugadores === 2).length },
    { id: 'avanzado', nombre: 'Salto de nivel', desc: 'Completa 5 ejercicios avanzados', meta: 5, icono: 'rayo',
      medir: p => Object.keys(p.hechos).filter(id => ejercicios()[id]?.nivel === 'avanzado').length },
    { id: 'racha7', nombre: 'Semana de hierro', desc: 'Entrena 7 días seguidos', meta: 7, icono: 'llama',
      medir: p => diasSeguidos(p) },
    { id: 'mitad', nombre: 'Media biblioteca', desc: 'Completa 26 ejercicios distintos', meta: 26, icono: 'libro',
      medir: p => Object.keys(p.hechos).length },
    { id: 'todos', nombre: 'Colección completa', desc: 'Completa los 52 ejercicios', meta: 52, icono: 'copa',
      medir: p => Object.keys(p.hechos).length }
  ];

  const retos = (perfil = activo()) => RETOS.map(r => {
    const hecho = Math.min(r.medir(perfil), r.meta);
    const completado = hecho >= r.meta;
    // La fecha se congela la primera vez: una racha rota no debe borrar una
    // medalla que ya se ganó.
    if (completado && !perfil.retos[r.id]) { perfil.retos[r.id] = new Date().toISOString().slice(0, 10); guardar(); }
    return { ...r, hecho, completado: completado || !!perfil.retos[r.id], fecha: perfil.retos[r.id] };
  });

  // ------------------------------------------------------------- escrituras
  const hoy = () => new Date().toISOString().slice(0, 10);

  /* Devuelve lo que ha cambiado para que la interfaz pueda celebrarlo: cuánto
   * ha subido el atributo, si hay nivel nuevo y qué retos se han cerrado. */
  const registrarEjercicio = id => {
    const p = activo();
    if (!ejercicios()[id]) return null;
    const antesFicha = ficha(p);
    const antesNivel = experiencia(p).nivel;
    const antesRetos = new Set(Object.keys(p.retos));
    const dato = p.hechos[id] || { veces: 0 };
    p.hechos[id] = { veces: dato.veces + 1, ultima: hoy() };
    p.historial.push({ fecha: hoy(), tipo: 'ejercicio', id });
    if (p.historial.length > 400) p.historial = p.historial.slice(-400);
    avisar();
    const despuesFicha = ficha(p);
    const nuevosRetos = retos(p).filter(r => r.completado && !antesRetos.has(r.id));
    const attr = ATRIBUTO_POR_OBJETIVO[ejercicios()[id].objetivo];
    return {
      atributo: ATRIBUTOS.find(a => a.id === attr),
      subida: attr ? despuesFicha.atributos.find(a => a.id === attr).valor - antesFicha.atributos.find(a => a.id === attr).valor : 0,
      generalAntes: antesFicha.general,
      general: despuesFicha.general,
      subeNivel: experiencia(p).nivel > antesNivel ? experiencia(p).nivel : 0,
      retos: nuevosRetos
    };
  };

  /* Mantiene la forma que ya tenía `ft:progreso` (plan -> día -> fecha) para
   * que la página de planes siga leyendo lo mismo tras la migración. */
  const registrarSesion = (plan, dia) => {
    const p = activo();
    (p.sesiones[plan] ||= {})[dia] = hoy();
    p.historial.push({ fecha: hoy(), tipo: 'sesion', id: `${plan}#${dia}` });
    avisar();
  };

  const alternarFavorito = id => {
    const p = activo();
    const favs = new Set(p.favoritos);
    favs.has(id) ? favs.delete(id) : favs.add(id);
    p.favoritos = [...favs];
    avisar();
    return favs.has(id);
  };

  return {
    ATRIBUTOS, POSICIONES, RETOS,
    lista: () => perfiles,
    activo,
    alCambiar: fn => { oyentes.add(fn); return () => oyentes.delete(fn); },
    cambiarA: id => { if (perfiles.some(p => p.id === id)) { activoId = id; avisar(); } },
    crear: (nombre, extra) => { const p = perfilNuevo(nombre, extra); perfiles.push(p); activoId = p.id; avisar(); return p; },
    actualizar: campos => { Object.assign(activo(), campos); avisar(); },
    borrar: id => {
      if (perfiles.length < 2) return false;
      perfiles = perfiles.filter(p => p.id !== id);
      if (activoId === id) activoId = perfiles[0].id;
      avisar();
      return true;
    },
    ficha, experiencia, retos, diasSeguidos,
    sesiones: () => activo().sesiones,
    registrarEjercicio, registrarSesion, alternarFavorito,
    esFavorito: id => activo().favoritos.includes(id),
    vecesHecho: id => activo().hechos[id]?.veces || 0
  };
})();
