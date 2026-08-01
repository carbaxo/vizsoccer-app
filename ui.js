(() => {
  const page = document.body;
  const isPlans = /planes\.html$/i.test(location.pathname);
  page.classList.add(isPlans ? 'plans-page' : 'catalog-page');

  // Preferencias y progreso guardados en el dispositivo.
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
  };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));

  const header = document.querySelector('header');
  // Marca de VizSoccer: la misma V de dos brazos que generan los iconos
  // (scripts/logo.py la imprime para poder incrustarla aquí sin recalcularla).
  const brandMark = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true">`
    + `<defs><linearGradient id="vs-nav" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="#5FD400"/><stop offset="1" stop-color="#1A4700"/>`
    + `</linearGradient></defs>`
    + `<rect width="32" height="32" rx="7" fill="url(#vs-nav)"/>`
    + `<path fill="#fff" d="M8.9,10.08 L16,22.52 L16,15.79 L12.74,10.08 Z"/>`
    + `<path fill="#C7F58F" d="M23.1,10.08 L16,22.52 L16,15.79 L19.26,10.08 Z"/></svg>`;
  const title = isPlans ? 'Tu semana de entrenamiento, lista para jugar' : 'Entrena con intención. Mejora en cada toque.';
  const description = isPlans
    ? 'Selecciona el formato que mejor encaja contigo y sigue sesiones progresivas de tres días por semana.'
    : 'Una biblioteca visual de ejercicios para convertir cada sesión en una práctica clara, útil y motivadora.';
  const cta = isPlans ? 'Explorar sesiones' : 'Ver planes de entrenamiento';
  const ctaHref = isPlans ? '#planes' : 'planes.html';
  const stats = isPlans
    ? [['6', 'planes guiados'], ['3', 'días por semana'], ['4', 'semanas de progreso'], ['60', 'minutos por sesión']]
    : [['52', 'ejercicios animados'], ['26', 'individuales'], ['26', 'por parejas'], ['3', 'niveles de juego']];
  header.innerHTML = `<nav class="site-nav" aria-label="Navegación principal"><a class="brand" href="index.html" aria-label="VizSoccer">${brandMark}<span class="brand-name">Viz<em>Soccer</em></span></a><div class="nav-actions"><a class="nav-link" href="${isPlans ? 'index.html' : 'planes.html'}">${isPlans ? '← Ejercicios' : 'Planes semanales →'}</a></div></nav><div class="hero"><div><div class="eyebrow">Tecnificación de fútbol</div><h1>${title}</h1><p class="hero-copy">${description}</p><a class="hero-action" href="${ctaHref}">${cta}</a></div><div class="hero-stats">${stats.map(([value,label]) => `<div class="hero-stat"><strong>${value}</strong><span>${label}</span></div>`).join('')}</div></div>`;

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

  // Tema: sigue el sistema por defecto y recuerda tu elección manual en el dispositivo.
  const root = document.documentElement;
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const applyTheme = theme => { root.dataset.theme = theme; };
  applyTheme(store.get('ft:tema', null) || (systemDark.matches ? 'dark' : 'light'));
  systemDark.addEventListener('change', () => { if (!store.get('ft:tema', null)) applyTheme(systemDark.matches ? 'dark' : 'light'); });
  const themeButton = document.createElement('button');
  themeButton.className = 'theme-toggle';
  themeButton.type = 'button';
  const syncThemeButton = () => {
    const dark = root.dataset.theme === 'dark';
    themeButton.textContent = dark ? '☀️' : '🌙';
    themeButton.setAttribute('aria-label', dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    themeButton.title = themeButton.getAttribute('aria-label');
  };
  syncThemeButton();
  themeButton.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    store.set('ft:tema', next);
    applyTheme(next);
    syncThemeButton();
  });
  header.querySelector('.nav-actions')?.prepend(themeButton);

  let installPrompt;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    const actions = header.querySelector('.nav-actions');
    if (!actions || actions.querySelector('.install-button')) return;
    const button = document.createElement('button');
    button.className = 'install-button';
    button.type = 'button';
    button.textContent = 'Instalar app';
    button.addEventListener('click', async () => {
      button.disabled = true;
      await installPrompt?.prompt();
      installPrompt = null;
      button.remove();
    });
    actions.prepend(button);
  });

  // El botón atrás de Android cierra el diálogo abierto en lugar de salir de la app.
  let closingFromHistory = false;
  const openDialog = dialog => {
    dialog.showModal();
    history.pushState({ dialog: true }, '');
  };
  const trackDialog = dialog => dialog.addEventListener('close', () => {
    if (!closingFromHistory && history.state?.dialog) history.back();
  });
  window.addEventListener('popstate', () => {
    const open = document.querySelector('dialog[open]');
    if (open) { closingFromHistory = true; open.close(); closingFromHistory = false; }
  });

  // Aviso de uso sin conexión (el service worker sirve el contenido guardado).
  const offlineBanner = document.createElement('div');
  offlineBanner.className = 'offline-banner';
  offlineBanner.setAttribute('role', 'status');
  offlineBanner.textContent = 'Sin conexión · usando el contenido guardado';
  document.body.append(offlineBanner);
  const syncOffline = () => offlineBanner.classList.toggle('show', !navigator.onLine);
  window.addEventListener('online', syncOffline);
  window.addEventListener('offline', syncOffline);
  syncOffline();

  // Barra de navegación inferior tipo app.
  const bottomNav = document.createElement('nav');
  bottomNav.className = 'bottom-nav';
  bottomNav.innerHTML = `<a class="bn-item ${isPlans ? '' : 'active'}" href="index.html"><span class="bn-ico">⚽</span>Ejercicios</a><a class="bn-item ${isPlans ? 'active' : ''}" href="planes.html"><span class="bn-ico">🗓️</span>Planes</a>`;
  document.body.append(bottomNav);

  const filters = document.querySelector('.filters');
  const main = document.querySelector('main');
  if (!filters || !main) return;
  main.id = isPlans ? 'planes' : 'ejercicios';
  const selects = [...filters.querySelectorAll('select')];
  const filterHtml = selects.map(select => `<label class="filter-field">${select.outerHTML}</label>`).join('');
  filters.innerHTML = `<div class="filter-inner"><span class="filter-label">Filtrar por</span>${!isPlans ? '<label class="search-wrap"><input id="exercise-search" type="search" placeholder="Buscar ejercicio" aria-label="Buscar ejercicio"></label>' : ''}${filterHtml}${!isPlans ? '<button class="fav-filter" type="button" aria-pressed="false">☆ Favoritos</button>' : ''}<button class="reset-button" type="button">Limpiar</button></div>`;
  const liveSelects = [...filters.querySelectorAll('select')];
  const search = filters.querySelector('#exercise-search');
  const favFilterButton = filters.querySelector('.fav-filter');
  const cards = [...main.children];
  const type = isPlans ? 'planes' : 'ejercicios';
  const intro = document.createElement('section');
  intro.className = 'catalog-intro';
  intro.innerHTML = `<div><h2>${isPlans ? 'Elige tu plan' : 'Encuentra tu próximo ejercicio'}</h2><p>${isPlans ? 'Filtra por modalidad, duración y nivel.' : 'Filtra por objetivo, nivel o número de jugadores.'}</p></div><span class="result-count" aria-live="polite"></span>`;
  main.before(intro);
  const count = intro.querySelector('.result-count');
  const empty = document.createElement('div');
  empty.className = 'no-results hide';
  empty.innerHTML = '<strong>No hemos encontrado coincidencias.</strong>Prueba a eliminar algún filtro o busca otro término.';
  main.append(empty);

  // Favoritos (catálogo).
  const favs = new Set(store.get('ft:favoritos', []));
  let favsOnly = false;

  const apply = () => {
    const term = search?.value.trim().toLocaleLowerCase('es') || '';
    let visible = 0;
    cards.forEach(card => {
      const filtersOk = liveSelects.every(select => !select.value || card.dataset[select.id] === select.value);
      const favOk = !favsOnly || favs.has(card.dataset.id);
      const searchable = card.textContent.toLocaleLowerCase('es');
      const shown = filtersOk && favOk && (!term || searchable.includes(term));
      card.classList.toggle('hide', !shown);
      if (shown) visible++;
    });
    empty.classList.toggle('hide', visible !== 0);
    count.textContent = `${visible} ${visible === 1 ? type.slice(0, -1) : type}`;
  };
  liveSelects.forEach(select => select.addEventListener('change', apply));
  search?.addEventListener('input', apply);
  favFilterButton?.addEventListener('click', () => {
    favsOnly = !favsOnly;
    favFilterButton.setAttribute('aria-pressed', String(favsOnly));
    favFilterButton.textContent = favsOnly ? '★ Favoritos' : '☆ Favoritos';
    apply();
  });
  filters.querySelector('.reset-button').addEventListener('click', () => {
    liveSelects.forEach(select => { select.value = ''; });
    if (search) search.value = '';
    if (favsOnly) favFilterButton?.click(); else apply();
  });

  // Datos de ejercicios, disponibles en ambas páginas.
  let detailsPromise;
  const loadDetails = () => detailsPromise ||= globalThis.TRAINING_DATA?.exercises
    ? Promise.resolve(new Map(Object.entries(globalThis.TRAINING_DATA.exercises)))
    : Promise.all([
        fetch('ejercicios.json').then(response => response.json()),
        isPlans ? fetch('index.html').then(response => response.text()).then(html => new DOMParser().parseFromString(html, 'text/html')) : Promise.resolve(document)
      ]).then(([data, catalog]) => {
        const media = new Map([...catalog.querySelectorAll('.card')].map(card => [card.querySelector('b')?.textContent.match(/(?:IND|PAR)-\d{2}/)?.[0], card.querySelector('img')?.getAttribute('src')]));
        return new Map(data.ejercicios.map(exercise => [exercise.id, { ...exercise, gif: media.get(exercise.id) }]));
      });
  const mediaFor = exercise => exercise.gif || exercise.archivo_gif || `svg/${exercise.archivo_svg?.split('/').pop() || ''}`;

  // Ficha de ejercicio (modal compartido por catálogo y planes).
  const dialog = document.createElement('dialog');
  dialog.className = 'exercise-modal';
  dialog.innerHTML = `<button class="modal-close" type="button" aria-label="Cerrar ficha">×</button><div class="modal-content"><div class="modal-media"><img alt="" /></div><div class="modal-copy"><span class="modal-kicker">${isPlans ? 'Ejercicio del plan' : 'Ficha del ejercicio'}</span><h2></h2><p class="modal-meta"></p><div class="modal-description"></div><ol class="modal-steps"></ol><dl class="modal-facts"></dl><button class="share-exercise" type="button">Compartir ejercicio</button></div></div>`;
  document.body.append(dialog);
  trackDialog(dialog);
  const modalImage = dialog.querySelector('img');
  const modalTitle = dialog.querySelector('h2');
  const modalMeta = dialog.querySelector('.modal-meta');
  const modalDescription = dialog.querySelector('.modal-description');
  const modalFacts = dialog.querySelector('.modal-facts');
  const modalSteps = dialog.querySelector('.modal-steps');
  const shareButton = dialog.querySelector('.share-exercise');
  const openExercise = async id => {
    dialog.dataset.exercise = id || '';
    modalTitle.textContent = 'Cargando ejercicio…'; modalMeta.innerHTML = ''; modalDescription.innerHTML = ''; modalFacts.innerHTML = ''; modalSteps.innerHTML = ''; modalImage.removeAttribute('src'); openDialog(dialog);
    try {
      const exercise = (await loadDetails()).get(id);
      if (!exercise) throw new Error('Ejercicio no encontrado');
      modalImage.src = mediaFor(exercise);
      modalImage.alt = `Demostración animada de ${exercise.nombre}`;
      modalTitle.textContent = `${exercise.id} · ${exercise.nombre}`;
      modalMeta.innerHTML = `<span>${exercise.jugadores} jugador${exercise.jugadores > 1 ? 'es' : ''}</span><span>${escape(exercise.nivel)}</span><span>${escape(exercise.duracion_min)} min</span>`;
      const pasos = exercise.secuencia_animacion || [];
      modalSteps.innerHTML = pasos.map(step => `<li><span>${escape(step)}</span></li>`).join('');
      modalDescription.innerHTML = `<p>${escape(exercise.instrucciones)}</p><p>Prepara ${escape(exercise.material.toLowerCase())} y empieza a un ritmo controlado. Mantén una postura activa, la cabeza levantada cuando el recorrido lo permita y el balón siempre a una distancia que puedas dominar. Repite el gesto alternando perfiles o pies, priorizando precisión y limpieza técnica antes de aumentar la velocidad.</p><p><strong>Clave de mejora:</strong> termina cada repetición con el control orientado hacia la siguiente acción. Si pierdes el balón o la calidad del gesto, baja el ritmo, corrige la postura y vuelve a intentarlo.</p>`;
      modalFacts.innerHTML = `<div><dt>Objetivo</dt><dd>${escape(exercise.objetivo)}</dd></div><div><dt>Material</dt><dd>${escape(exercise.material)}</dd></div><div><dt>Tiempo sugerido</dt><dd>${escape(exercise.duracion_min)} minutos</dd></div>`;
    } catch { modalTitle.textContent = 'No se pudo cargar este ejercicio'; modalDescription.innerHTML = '<p>Vuelve a intentarlo en unos segundos.</p>'; }
  };
  dialog.querySelector('.modal-close').addEventListener('click', () => dialog.close());
  shareButton.addEventListener('click', async () => {
    const id = dialog.dataset.exercise;
    if (!id) return;
    const url = new URL(`index.html#${id}`, location.href).href;
    const shareTitle = modalTitle.textContent;
    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: `Ejercicio de tecnificación: ${shareTitle}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        shareButton.textContent = 'Enlace copiado ✓';
        setTimeout(() => { shareButton.textContent = 'Compartir ejercicio'; }, 2000);
      }
    } catch {}
  });

  if (!isPlans) {
    // Tarjetas del catálogo: favorito + apertura de la ficha.
    cards.forEach(card => {
      const id = card.querySelector('b')?.textContent.match(/\b(?:IND|PAR)-\d{2}\b/)?.[0];
      if (!id) return;
      card.dataset.id = id;
      if (card.dataset.n) {
        const level = document.createElement('span');
        level.className = `card-level n-${card.dataset.n}`;
        level.textContent = card.dataset.n;
        card.prepend(level);
      }
      const star = document.createElement('button');
      star.className = 'fav-toggle';
      star.type = 'button';
      const syncStar = () => {
        const on = favs.has(id);
        star.textContent = on ? '★' : '☆';
        star.classList.toggle('on', on);
        star.setAttribute('aria-label', on ? `Quitar ${id} de favoritos` : `Guardar ${id} en favoritos`);
        star.setAttribute('aria-pressed', String(on));
      };
      syncStar();
      star.addEventListener('click', event => {
        event.stopPropagation();
        favs.has(id) ? favs.delete(id) : favs.add(id);
        store.set('ft:favoritos', [...favs]);
        syncStar();
        if (favsOnly) apply();
      });
      card.prepend(star);
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Ver ficha de ${card.querySelector('b')?.textContent || id}`);
      card.addEventListener('click', () => openExercise(id));
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openExercise(id); } });
    });

    // Enlaces compartidos: index.html#IND-01 abre la ficha directamente.
    const openFromHash = () => {
      const id = location.hash.match(/(?:IND|PAR)-\d{2}/)?.[0];
      if (id) openExercise(id);
    };
    window.addEventListener('hashchange', openFromHash);
    openFromHash();

    // Leyenda de los diagramas, solo hasta que se descarta.
    if (!store.get('ft:leyenda', false)) {
      const legend = document.createElement('section');
      legend.className = 'legend-banner';
      legend.innerHTML = `<div class="legend-inner"><div><strong>Cómo leer los diagramas</strong><ul><li><i class="lg-swatch lg-white" aria-hidden="true"></i>Línea blanca continua: desplazamiento o conducción</li><li><i class="lg-swatch lg-yellow" aria-hidden="true"></i>Línea amarilla discontinua: pase o recorrido del balón</li><li><i class="lg-swatch lg-green" aria-hidden="true"></i>Punto verde: inicio · la bandera marca el final</li><li><i class="lg-swatch lg-ab" aria-hidden="true">A</i>Las letras A y B identifican a los jugadores</li></ul></div><button class="legend-close" type="button">Entendido</button></div>`;
      main.before(legend);
      legend.querySelector('.legend-close').addEventListener('click', () => { store.set('ft:leyenda', true); legend.remove(); });
    }
  }

  if (isPlans) {
    const exerciseRows = [...main.querySelectorAll('li')].filter(row => /\b(?:IND|PAR)-\d{2}\b/.test(row.textContent));
    exerciseRows.forEach(row => {
      const id = row.textContent.match(/\b(?:IND|PAR)-\d{2}\b/)?.[0];
      row.classList.add('exercise-link'); row.tabIndex = 0; row.setAttribute('role', 'button'); row.setAttribute('aria-label', `Ver demostración y detalle de ${row.textContent.trim()}`);
      row.addEventListener('click', () => openExercise(id));
      row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openExercise(id); } });
    });

    // Progreso guardado en el dispositivo: sesiones completadas por plan y día.
    const progressData = () => store.get('ft:progreso', {});
    const totalSessions = () => Object.values(progressData()).reduce((sum, plan) => sum + Object.keys(plan).length, 0);
    const formatDay = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const refreshPlanBadges = () => cards.forEach(card => {
      const name = card.querySelector('h2')?.textContent;
      if (!name) return;
      const done = Object.keys(progressData()[name] || {}).length;
      let badge = card.querySelector('.plan-progress');
      if (!done) { badge?.remove(); return; }
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'plan-progress';
        card.querySelector('.tag')?.after(badge);
      }
      badge.textContent = `✓ ${done} ${done === 1 ? 'sesión completada' : 'sesiones completadas'}`;
    });
    refreshPlanBadges();

    const workoutDialog = document.createElement('dialog');
    workoutDialog.className = 'workout-modal';
    workoutDialog.innerHTML = `<button class="workout-close" type="button" aria-label="Cerrar entrenamiento">×</button><div class="workout-setup"></div><div class="workout-run hide"><div class="workout-topline"><span class="workout-plan-name"></span><span class="workout-progress-label"></span></div><div class="workout-progress"><i></i></div><div class="workout-body"><div class="workout-visual"><img alt="" /><div class="workout-placeholder">⚽<span>Preparad el espacio<br>y disfrutad del entrenamiento</span></div></div><div class="workout-copy"><span class="workout-type"></span><h2></h2><p class="workout-time">00:00</p><p class="workout-description"></p><p class="workout-coach"></p></div></div><div class="workout-controls"><button type="button" class="workout-back">← Anterior</button><button type="button" class="workout-timer">▶ Iniciar</button><button type="button" class="workout-next">Siguiente →</button></div></div>`;
    document.body.append(workoutDialog);
    trackDialog(workoutDialog);
    const setup = workoutDialog.querySelector('.workout-setup');
    const run = workoutDialog.querySelector('.workout-run');
    const workoutTitle = workoutDialog.querySelector('.workout-copy h2');
    const workoutDescription = workoutDialog.querySelector('.workout-description');
    const workoutCoach = workoutDialog.querySelector('.workout-coach');
    const workoutType = workoutDialog.querySelector('.workout-type');
    const workoutTime = workoutDialog.querySelector('.workout-time');
    const workoutImage = workoutDialog.querySelector('.workout-visual img');
    const workoutPlaceholder = workoutDialog.querySelector('.workout-placeholder');
    const progressBar = workoutDialog.querySelector('.workout-progress i');
    const progressLabel = workoutDialog.querySelector('.workout-progress-label');
    const planLabel = workoutDialog.querySelector('.workout-plan-name');
    const timerButton = workoutDialog.querySelector('.workout-timer');
    const previousButton = workoutDialog.querySelector('.workout-back');
    const nextButton = workoutDialog.querySelector('.workout-next');
    let plansPromise;
    let workoutState = { plan: null, session: null, index: 0, seconds: 0, running: false, timer: null };
    // Mantiene la pantalla encendida durante la sesión de entrenamiento.
    let wakeLock = null;
    const requestWakeLock = () => { navigator.wakeLock?.request('screen').then(lock => { wakeLock = lock; }).catch(() => {}); };
    const releaseWakeLock = () => { wakeLock?.release().catch(() => {}); wakeLock = null; };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && workoutDialog.open && !run.classList.contains('hide')) requestWakeLock();
    });
    // Doble pitido al completar el tiempo de un bloque.
    let audioCtx;
    const beep = () => {
      try {
        audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        [[880, 0], [660, .22]].forEach(([frequency, at]) => {
          const oscillator = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.value = frequency;
          oscillator.connect(gain);
          gain.connect(audioCtx.destination);
          gain.gain.setValueAtTime(.0001, now + at);
          gain.gain.exponentialRampToValueAtTime(.3, now + at + .02);
          gain.gain.exponentialRampToValueAtTime(.0001, now + at + .2);
          oscillator.start(now + at);
          oscillator.stop(now + at + .22);
        });
      } catch {}
    };
    const loadPlans = () => plansPromise ||= globalThis.TRAINING_DATA?.plans ? Promise.resolve(globalThis.TRAINING_DATA.plans) : fetch('planes_entrenamiento.json').then(response => response.json()).then(data => data.planes);
    const planFromCard = card => ({
      nombre: card.querySelector('h2')?.textContent || 'Plan de entrenamiento',
      sesiones: [...card.querySelectorAll('section')].map((section, index) => {
        const heading = section.querySelector('h3')?.textContent || `Día ${index + 1}`;
        const [, title = heading] = heading.split('·').map(value => value.trim());
        return {
          dia: Number(heading.match(/\d+/)?.[0] || index + 1), titulo: title, duracion_min: Number(card.dataset.d),
          bloques: [...section.querySelectorAll('li')].map(row => {
            const text = row.textContent.trim();
            const exerciseId = text.match(/\b(?:IND|PAR)-\d{2}\b/)?.[0];
            return { tipo: exerciseId ? 'ejercicio' : 'preparacion', ejercicio_id: exerciseId, minutos: Number(text.match(/\d+(?=\s*min)/)?.[0] || 0), descripcion: text.replace(/^\d+\s*min\s*·\s*/, '') };
          })
        };
      })
    });
    const formatTime = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    let autoTimeout = null;
    const clearAuto = () => { clearTimeout(autoTimeout); autoTimeout = null; };
    const stopTimer = () => { clearInterval(workoutState.timer); workoutState.timer = null; workoutState.running = false; timerButton.textContent = '▶ Iniciar'; };
    const updateTimer = () => { workoutTime.textContent = formatTime(workoutState.seconds); };
    const startTimer = () => {
      if (workoutState.running || workoutState.seconds <= 0) return;
      workoutState.running = true; timerButton.textContent = 'Ⅱ Pausar';
      // Cuenta atrás anclada a la hora real: sigue siendo exacta aunque el sistema pause los temporizadores en segundo plano.
      const deadline = Date.now() + workoutState.seconds * 1000;
      workoutState.timer = setInterval(() => {
        workoutState.seconds = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        updateTimer();
        if (workoutState.seconds === 0) blockCompleted();
      }, 250);
    };
    const blockCompleted = () => {
      stopTimer();
      beep();
      navigator.vibrate?.([250, 120, 250]);
      const last = workoutState.index >= workoutState.session.bloques.length - 1;
      if (!last && store.get('ft:auto', true)) {
        workoutCoach.textContent = '¡Tiempo completado! Pasamos al siguiente bloque en 5 segundos…';
        autoTimeout = setTimeout(() => { workoutState.index++; renderStep(); startTimer(); }, 5000);
      } else {
        workoutCoach.textContent = last ? '¡Última ronda completada! Pulsad «Finalizar entrenamiento».' : '¡Tiempo completado! Cuando estéis listos, pasad al siguiente bloque.';
      }
    };
    const renderStep = async () => {
      const block = workoutState.session.bloques[workoutState.index];
      clearAuto();
      stopTimer();
      workoutState.seconds = block.minutos * 60;
      updateTimer();
      const total = workoutState.session.bloques.length;
      progressLabel.textContent = `Paso ${workoutState.index + 1} de ${total}`;
      progressBar.style.width = `${((workoutState.index + 1) / total) * 100}%`;
      previousButton.disabled = workoutState.index === 0;
      nextButton.textContent = workoutState.index === total - 1 ? 'Finalizar entrenamiento ✓' : 'Siguiente →';
      workoutType.textContent = block.tipo === 'ejercicio' ? 'Ejercicio técnico' : block.tipo.replace('_', ' ');
      workoutTitle.textContent = block.descripcion;
      workoutDescription.textContent = block.tipo === 'ejercicio' ? 'Cargando demostración y consejos…' : `Dedica ${block.minutos} minutos a este bloque. Mantén un ritmo cómodo y prioriza que tu hijo se sienta seguro con el balón.`;
      workoutCoach.textContent = block.tipo === 'ejercicio' ? 'Consejo: empezad despacio y celebrad cada repetición bien hecha.' : 'Consejo: este bloque prepara el cuerpo y la atención para el siguiente ejercicio.';
      workoutImage.removeAttribute('src'); workoutImage.alt = ''; workoutPlaceholder.classList.toggle('hide', block.tipo === 'ejercicio');
      // Precarga la animación del siguiente bloque durante el actual.
      const nextBlock = workoutState.session.bloques[workoutState.index + 1];
      if (nextBlock?.tipo === 'ejercicio') loadDetails().then(map => { const upcoming = map.get(nextBlock.ejercicio_id); if (upcoming) new Image().src = mediaFor(upcoming); }).catch(() => {});
      if (block.tipo === 'ejercicio') {
        const exercise = (await loadDetails()).get(block.ejercicio_id);
        if (workoutState.session.bloques[workoutState.index] !== block || !exercise) return;
        workoutImage.src = mediaFor(exercise);
        workoutImage.alt = `Demostración animada de ${exercise.nombre}`;
        workoutDescription.textContent = exercise.instrucciones;
        workoutCoach.textContent = `Material: ${exercise.material}. ${block.minutos} min en este bloque. Mantén la cabeza levantada cuando sea posible y prioriza el control antes de subir la velocidad.`;
      }
    };
    const startSession = (plan, session) => {
      workoutState = { plan, session, index: 0, seconds: 0, running: false, timer: null };
      setup.classList.add('hide'); run.classList.remove('hide');
      planLabel.textContent = `${plan.nombre} · Día ${session.dia}`;
      requestWakeLock();
      renderStep();
    };
    const finishWorkout = () => {
      stopTimer();
      clearAuto();
      const progress = progressData();
      (progress[workoutState.plan.nombre] ||= {})[workoutState.session.dia] = new Date().toISOString().slice(0, 10);
      store.set('ft:progreso', progress);
      refreshPlanBadges();
      const total = totalSessions();
      run.classList.add('hide'); setup.classList.remove('hide');
      setup.innerHTML = `<span class="workout-eyebrow">¡Entrenamiento completado!</span><h2>Muy buen trabajo</h2><p>La sesión queda guardada en este dispositivo: ${total === 1 ? 'es vuestra primera sesión completada' : `lleváis ${total} sesiones completadas`}. Cerrad con unos minutos tranquilos, agua y una felicitación por el esfuerzo.</p><button type="button" class="finish-workout">Cerrar</button>`;
      setup.querySelector('.finish-workout').addEventListener('click', () => workoutDialog.close());
    };
    const chooseDay = plan => {
      stopTimer();
      clearAuto();
      setup.classList.remove('hide'); run.classList.add('hide');
      const done = progressData()[plan.nombre] || {};
      setup.innerHTML = `<span class="workout-eyebrow">Modo entrenar</span><h2>${escape(plan.nombre)}</h2><p>Elige el día de hoy. La sesión te acompañará paso a paso y el cronómetro se reinicia en cada bloque.</p><div class="day-picker">${plan.sesiones.map(session => `<button type="button" data-day="${session.dia}" class="${done[session.dia] ? 'done' : ''}"><strong>Día ${session.dia}</strong><span>${escape(session.titulo)}</span><small>${session.duracion_min} min · ${session.bloques.length} bloques${done[session.dia] ? ` · ✓ hecho el ${formatDay(done[session.dia])}` : ''}</small></button>`).join('')}</div><label class="auto-toggle"><input type="checkbox" ${store.get('ft:auto', true) ? 'checked' : ''}> Avance automático: al acabar el tiempo suena un aviso y pasa solo al siguiente bloque</label><p class="workout-note">Puedes pausar, repetir o avanzar cuando lo necesitéis.</p>`;
      setup.querySelector('.auto-toggle input').addEventListener('change', event => store.set('ft:auto', event.target.checked));
      setup.querySelectorAll('[data-day]').forEach(button => button.addEventListener('click', () => startSession(plan, plan.sesiones.find(session => session.dia === Number(button.dataset.day)))));
      openDialog(workoutDialog);
    };
    workoutDialog.querySelector('.workout-close').addEventListener('click', () => { stopTimer(); clearAuto(); workoutDialog.close(); });
    workoutDialog.addEventListener('close', () => { stopTimer(); clearAuto(); releaseWakeLock(); });
    timerButton.addEventListener('click', () => { clearAuto(); workoutState.running ? stopTimer() : startTimer(); });
    previousButton.addEventListener('click', () => { clearAuto(); if (workoutState.index > 0) { workoutState.index--; renderStep(); } });
    nextButton.addEventListener('click', () => { clearAuto(); if (workoutState.index < workoutState.session.bloques.length - 1) { workoutState.index++; renderStep(); } else finishWorkout(); });
    cards.forEach(card => {
      const trainButton = document.createElement('button');
      trainButton.className = 'start-workout'; trainButton.type = 'button'; trainButton.textContent = '▶ Entrenar este plan';
      trainButton.addEventListener('click', async () => {
        trainButton.disabled = true; trainButton.textContent = 'Cargando plan…';
        try {
          const plans = await loadPlans();
          const plan = plans.find(item => String(item.jugadores) === card.dataset.p && String(item.duracion_sesion_min) === card.dataset.d && item.nivel === card.dataset.n) || planFromCard(card);
          chooseDay(plan);
        } catch { chooseDay(planFromCard(card));
        } finally { trainButton.disabled = false; trainButton.textContent = '▶ Entrenar este plan'; }
      });
      card.append(trainButton);
    });
  }
  apply();
})();
