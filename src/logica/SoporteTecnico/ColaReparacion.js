(function () {

  function cargar() {
    const contenido = document.getElementById('colaContenido');
    contenido.innerHTML = `
      <div class="cola-cargando">
        <div class="spinner"></div>
        <p>Cargando solicitudes...</p>
      </div>`;

    fetch('/api/cola/listar')
      .then(r => r.json())
      .then(data => renderCola(data.reparaciones || []))
      .catch(() => {
        contenido.innerHTML = `<p style="color:#f85149;font-size:14px;text-align:center;padding:40px">
          Error al cargar las solicitudes.</p>`;
      });
  }

  function renderCola(reparaciones) {
    const contenido = document.getElementById('colaContenido');

    if (reparaciones.length === 0) {
      contenido.innerHTML = `
        <div class="cola-vacia">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          <p>No hay solicitudes pendientes</p>
        </div>`;
      return;
    }

    contenido.innerHTML = '<div class="cola-lista" id="colaLista"></div>';
    const lista = document.getElementById('colaLista');

    reparaciones.forEach(rep => {
      const totalUnidades = rep.equipos.reduce((s, e) => s + Number(e.Cantidad), 0);
      const fecha = new Date(rep.FechahoraReporte).toLocaleString('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const card = document.createElement('div');
      card.className = 'reparacion-card';
      card.dataset.id = rep.IdReparacion;
      card.innerHTML = `
        <div class="card-header" data-toggle="${rep.IdReparacion}">
          <span class="card-id">#${rep.IdReparacion}</span>
          <div class="card-info">
            <div class="card-usuario">${rep.NombreUsuario}</div>
            <div class="card-meta">
              <span class="card-depa">${rep.DepaSucu}</span>
              <span class="card-fecha">${fecha}</span>
              <span class="card-badge">${totalUnidades} unidad${totalUnidades !== 1 ? 'es' : ''}</span>
            </div>
          </div>
          <svg class="card-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
        <div class="card-detalle" id="detalle-${rep.IdReparacion}">
          <div class="card-detalle-inner">
            <table class="detalle-tabla">
              <thead>
                <tr><th>Descripción</th><th>UPC</th><th>Cantidad</th></tr>
              </thead>
              <tbody>
                ${rep.equipos.map(e => `
                  <tr>
                    <td class="td-desc">${e.Descripcion}</td>
                    <td class="td-upc">${e.Upc}</td>
                    <td>${e.Cantidad}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
            ${rep.Observaciones ? `
              <div>
                <div class="detalle-obs-label">Observaciones</div>
                <div class="detalle-obs">${rep.Observaciones}</div>
              </div>` : ''}
            <div class="card-acciones">
              <button class="btn-iniciar" data-id="${rep.IdReparacion}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
                Iniciar Reparación
              </button>
            </div>
          </div>
        </div>`;

      lista.appendChild(card);
    });

    // Toggle expandir
    document.querySelectorAll('[data-toggle]').forEach(header => {
      header.addEventListener('click', () => {
        const id = header.dataset.toggle;
        document.getElementById(`detalle-${id}`).classList.toggle('visible');
        header.querySelector('.card-chevron').classList.toggle('abierto');
      });
    });

    // Iniciar reparación
    document.querySelectorAll('.btn-iniciar').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        iniciar(btn);
      });
    });
  }

  function iniciar(btn) {
    const id = btn.dataset.id;
    btn.disabled = true;
    btn.textContent = 'Iniciando...';

    fetch('/api/cola/iniciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IdReparacion: id })
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          const card = document.querySelector(`.reparacion-card[data-id="${id}"]`);
          card.style.transition = 'opacity 0.3s, transform 0.3s';
          card.style.opacity = '0';
          card.style.transform = 'translateX(20px)';
          setTimeout(() => { card.remove(); verificarVacia(); }, 300);
        } else {
          btn.disabled = false;
          btn.textContent = 'Iniciar Reparación';
          alert(data.mensaje || 'Error al iniciar la reparación.');
        }
      })
      .catch(() => {
        btn.disabled = false;
        btn.textContent = 'Iniciar Reparación';
        alert('Error de conexión.');
      });
  }

  function verificarVacia() {
    const lista = document.getElementById('colaLista');
    if (lista && lista.children.length === 0) {
      document.getElementById('colaContenido').innerHTML = `
        <div class="cola-vacia">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          <p>No hay solicitudes pendientes</p>
        </div>`;
    }
  }

  document.getElementById('btnRefrescar').addEventListener('click', () => {
    const btn = document.getElementById('btnRefrescar');
    btn.classList.add('girando');
    setTimeout(() => btn.classList.remove('girando'), 600);
    cargar();
  });

  cargar();

})();
