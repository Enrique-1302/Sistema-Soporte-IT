(function () {
  let equipos = [];
  let searchTimeout = null;

  const inputBuscar   = document.getElementById('inputBuscar');
  const sugerencias   = document.getElementById('sugerencias');
  const listaEquipos  = document.getElementById('listaEquipos');
  const observaciones = document.getElementById('observaciones');
  const obsContador   = document.getElementById('obsContador');

  // ── Contador observaciones ──
  observaciones.addEventListener('input', () => {
    const len = observaciones.value.length;
    obsContador.textContent = `${len} / 255`;
    obsContador.className = len >= 255 ? 'lleno' : len >= 200 ? 'casi-lleno' : '';
  });

  // ── Búsqueda con debounce ──
  inputBuscar.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = inputBuscar.value.trim();
    if (q.length < 2) { ocultarSugerencias(); return; }
    searchTimeout = setTimeout(() => buscar(q), 300);
  });

  // ── Enter → agregar primera sugerencia ──
  inputBuscar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const primera = sugerencias.querySelector('.sugerencia-item');
      if (primera) primera.click();
    }
    if (e.key === 'Escape') ocultarSugerencias();
  });

  // ── Cerrar sugerencias al hacer clic fuera ──
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#buscarWrap')) ocultarSugerencias();
  });

  function ocultarSugerencias() {
    sugerencias.style.display = 'none';
    sugerencias.innerHTML = '';
  }

  function buscar(q) {
    fetch(`/api/equipo/buscar?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(data => mostrarSugerencias(data.resultados || []))
      .catch(() => ocultarSugerencias());
  }

  function mostrarSugerencias(items) {
    if (items.length === 0) {
      sugerencias.innerHTML = '<div class="sugerencia-vacia">Sin resultados</div>';
    } else {
      sugerencias.innerHTML = items.map(item => `
        <div class="sugerencia-item">
          <span class="sug-descripcion">${item.descripcion}</span>
          <span class="sug-upc">${item.upc}</span>
        </div>
      `).join('');
      sugerencias.querySelectorAll('.sugerencia-item').forEach((el, i) => {
        el.addEventListener('click', () => agregarEquipo(items[i]));
      });
    }
    sugerencias.style.display = 'block';
  }

  function agregarEquipo(item) {
    ocultarSugerencias();
    inputBuscar.value = '';
    inputBuscar.focus();

    const existente = equipos.find(e => e.upc === item.upc);
    if (existente) {
      existente.cantidad++;
      renderLista();
      return;
    }

    equipos.push({ descripcion: item.descripcion, upc: item.upc, cantidad: 1 });
    renderLista();
  }

  function renderLista() {
    if (equipos.length === 0) {
      listaEquipos.innerHTML = `
        <tr class="fila-vacia" id="filaVacia">
          <td colspan="4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            Agrega equipos usando el buscador
          </td>
        </tr>`;
      return;
    }

    listaEquipos.innerHTML = equipos.map((eq, i) => `
      <tr class="fila-equipo">
        <td class="td-descripcion">${eq.descripcion}</td>
        <td class="td-upc">${eq.upc}</td>
        <td class="td-cantidad">
          <div class="cantidad-control">
            <button data-action="menos" data-i="${i}">−</button>
            <input type="number" min="1" value="${eq.cantidad}" data-i="${i}">
            <button data-action="mas" data-i="${i}">+</button>
          </div>
        </td>
        <td class="td-accion">
          <button class="btn-eliminar" data-i="${i}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
        </td>
      </tr>
    `).join('');

    // Eventos de la tabla
    listaEquipos.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.i);
        const delta = btn.dataset.action === 'mas' ? 1 : -1;
        equipos[i].cantidad = Math.max(1, equipos[i].cantidad + delta);
        renderLista();
      });
    });

    listaEquipos.querySelectorAll('input[type=number]').forEach(inp => {
      inp.addEventListener('change', () => {
        const i = parseInt(inp.dataset.i);
        const n = parseInt(inp.value);
        equipos[i].cantidad = isNaN(n) || n < 1 ? 1 : n;
        renderLista();
      });
    });

    listaEquipos.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', () => {
        equipos.splice(parseInt(btn.dataset.i), 1);
        renderLista();
      });
    });
  }

  // ── Generar Reporte ──
  document.getElementById('btnGenerar').addEventListener('click', async () => {
    if (equipos.length === 0) {
      mostrarMensaje('Agrega al menos un equipo al reporte.', 'error');
      return;
    }

    const btn = document.getElementById('btnGenerar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      const res = await fetch('/api/equipo/guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipos, observaciones: observaciones.value.trim() })
      });
      const data = await res.json();

      if (data.ok) {
        mostrarMensaje(`Reporte #${data.IdReparacion} guardado correctamente.`, 'exito');
        equipos = [];
        renderLista();
        observaciones.value = '';
        obsContador.textContent = '0 / 255';
        obsContador.className = '';
      } else {
        mostrarMensaje(data.mensaje || 'Error al guardar.', 'error');
      }
    } catch {
      mostrarMensaje('Error de conexión. Intenta de nuevo.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        Generar Reporte`;
    }
  });

  function mostrarMensaje(texto, tipo) {
    let el = document.getElementById('mensajeReporte');
    if (!el) {
      el = document.createElement('p');
      el.id = 'mensajeReporte';
      document.querySelector('.acciones-seccion').prepend(el);
    }
    el.textContent = texto;
    el.className = tipo === 'exito' ? 'msg-exito' : 'msg-error';
    setTimeout(() => { el.textContent = ''; el.className = ''; }, 5000);
  }

})();
