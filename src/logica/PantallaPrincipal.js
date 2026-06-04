let usuarioActual = null;

fetch('/sesion')
  .then(res => res.json())
  .then(data => {

    if (!data.ok) {
      window.location.href = '/login';
      return;
    }

    usuarioActual = data.usuario;

    const u = usuarioActual;

    document.getElementById('usuarioAvatar').textContent =
      u.nombre.charAt(0).toUpperCase();

    document.getElementById('usuarioNombre').textContent =
      u.nombre;

    document.getElementById('usuarioPuesto').textContent =
      u.puesto;

    aplicarPermisos(u);

    iniciarNotificaciones();
    iniciarBotonSalir();

    mostrarInicio();
  })
  .catch(() => {
    window.location.href = '/login';
  });

function esSoporte(usuario) {

  const id = Number(
    usuario.Id_PuestoGeneral ||
    usuario.IdPuestoGeneral
  );

  const puestoTexto = (
    usuario.puestoGeneral ||
    usuario.puesto ||
    ''
  ).toUpperCase();

  return (
    [37, 96, 145].includes(id) ||
    puestoTexto.includes('SOPORTE Y MANTENIMIENTO')
  );
}

function aplicarPermisos(usuario) {

  const menuSoporte =
    document.getElementById('menuSoporteTecnico');

  if (menuSoporte) {
    menuSoporte.style.display =
      esSoporte(usuario) ? 'block' : 'none';
  }
}

function iniciarBotonSalir() {

  const btnSalir =
    document.getElementById('btnSalir');

  if (!btnSalir) {
    return;
  }

  btnSalir.addEventListener('click', async () => {

    btnSalir.disabled = true;

    try {

      await fetch('/logout', {
        method: 'POST'
      });

    } catch (error) {

      console.error(
        'Error cerrando sesion:',
        error
      );

    } finally {

      window.location.href = '/login';
    }
  });
}

function iniciarNotificaciones() {

  const btn =
    document.getElementById('btnNotificaciones');

  const panel =
    document.getElementById('notificacionesPanel');

  const cerrar =
    document.getElementById('cerrarNotificaciones');

  if (!btn || !panel) {
    return;
  }

  btn.addEventListener('click', () => {
    const abierto =
      panel.classList.toggle('abierto');

    panel.setAttribute(
      'aria-hidden',
      abierto ? 'false' : 'true'
    );

    if (abierto) {
      cargarBandejaNotificaciones(true);
    }
  });

  if (cerrar) {
    cerrar.addEventListener('click', () => {
      panel.classList.remove('abierto');
      panel.setAttribute('aria-hidden', 'true');
    });
  }

  enviarPresencia();
  consultarNotificacionesNuevas();
  cargarBandejaNotificaciones(false);

  setInterval(enviarPresencia, 15000);
  setInterval(consultarNotificacionesNuevas, 12000);
}

async function enviarPresencia() {
  try {
    await fetch('/api/notificaciones/ping', {
      method: 'POST'
    });
  } catch (error) {
    console.error('Error enviando presencia:', error);
  }
}

async function consultarNotificacionesNuevas() {
  try {
    const res = await fetch('/api/notificaciones/nuevas');
    const data = await res.json();

    if (!data.ok) {
      return;
    }

    (data.notificaciones || []).forEach(mostrarToastNotificacion);

    if ((data.notificaciones || []).length) {
      cargarBandejaNotificaciones(false);
    }
  } catch (error) {
    console.error('Error consultando notificaciones:', error);
  }
}

async function cargarBandejaNotificaciones(marcarLeidas) {
  try {
    const res = await fetch('/api/notificaciones');
    const data = await res.json();

    if (!data.ok) {
      return;
    }

    renderizarBandejaNotificaciones(data.notificaciones || []);

    const idsNoLeidas = (data.notificaciones || [])
      .filter(n => !n.leida)
      .map(n => n.id);

    actualizarBadgeNotificaciones(idsNoLeidas.length);

    if (marcarLeidas && idsNoLeidas.length) {
      await fetch('/api/notificaciones/leidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsNoLeidas })
      });

      actualizarBadgeNotificaciones(0);
      cargarBandejaNotificaciones(false);
    }
  } catch (error) {
    console.error('Error cargando bandeja:', error);
  }
}

function renderizarBandejaNotificaciones(notificaciones) {
  const lista =
    document.getElementById('notificacionesLista');

  if (!lista) {
    return;
  }

  if (!notificaciones.length) {
    lista.innerHTML = `
      <div class="notificaciones-vacio">
        No tienes notificaciones pendientes.
      </div>
    `;
    return;
  }

  lista.innerHTML = notificaciones
    .map(n => `
      <article
        class="notificacion-item ${n.leida ? '' : 'no-leida'}"
        data-url="${n.url || ''}"
      >
        <h3>${escaparHTML(n.titulo)}</h3>
        <p>${escaparHTML(n.mensaje)}</p>
        <time>${formatearFechaNotificacion(n.creadaEn)}</time>
      </article>
    `)
    .join('');

  lista.querySelectorAll('.notificacion-item')
    .forEach(item => {
      item.addEventListener('click', () => {
        const vista = item.dataset.url;

        if (vista) {
          abrirVista(vista);
        }
      });
    });
}

function mostrarToastNotificacion(notificacion) {
  const stack =
    document.getElementById('toastStack');

  if (!stack) {
    return;
  }

  const toast =
    document.createElement('div');

  toast.className = 'toast-notificacion';

  toast.innerHTML = `
    <h3>${escaparHTML(notificacion.titulo)}</h3>
    <button type="button" aria-label="Cerrar">x</button>
    <p>${escaparHTML(notificacion.mensaje)}</p>
  `;

  toast.querySelector('button')
    .addEventListener('click', () => {
      toast.remove();
    });

  toast.addEventListener('click', event => {
    if (event.target.tagName === 'BUTTON') {
      return;
    }

    if (notificacion.url) {
      abrirVista(notificacion.url);
    }

    toast.remove();
  });

  stack.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 7000);
}

function actualizarBadgeNotificaciones(total) {
  const badge =
    document.getElementById('notificacionesBadge');

  if (!badge) {
    return;
  }

  badge.hidden = total <= 0;
  badge.textContent = total > 99 ? '99+' : String(total);
}

function formatearFechaNotificacion(fecha) {
  if (!fecha) {
    return '';
  }

  return new Date(fecha).toLocaleString('es-GT', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function escaparHTML(valor) {
  return String(valor || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toggleSubmenu(id, btn) {

  const submenu = document.getElementById(id);

  const chevron =
    btn.querySelector('.chevron');

  const abierto =
    submenu.classList.toggle('visible');

  chevron.classList.toggle('rotado', abierto);

  btn.classList.toggle('abierto', abierto);
}

function usuarioEsSoporte(usuario) {

  return [37, 96, 145].includes(
    Number(
      usuario.Id_PuestoGeneral ||
      usuario.IdPuestoGeneral
    )
  );
}

function usuarioEsRegional(usuario) {

  const puesto = (
    usuario.puesto ||
    usuario.puestoGeneral ||
    usuario.Nombre ||
    ''
  ).toUpperCase();

  return puesto.includes('REGIONAL');
}

function validarAccesoSoporte(vista) {

  if (!usuarioEsSoporte(usuarioActual)) {
    return;
  }

  abrirVista(vista);
}

async function mostrarInicio() {

  document.querySelectorAll('.submenu-btn')
    .forEach(b => {
      b.classList.remove('activo');
    });

  const contenido =
    document.querySelector('.contenido');

  // =========================
  // LOADING
  // =========================

  contenido.innerHTML = `

    <div class="dashboard-loading">

      <div class="dashboard-spinner"></div>

      <h2>Cargando vista...</h2>

      <p>Preparando panel principal</p>

    </div>

  `;

  // =========================
  // PEQUEÑA ESPERA VISUAL
  // =========================

  await new Promise(resolve =>
    setTimeout(resolve, 150)
  );

  // =========================
  // DASHBOARD REGIONAL
  // =========================

  if (usuarioEsRegional(usuarioActual)) {

    contenido.innerHTML = `

      <section class="inicio-dashboard">

        <div class="inicio-header">
          <h1>Panel regional</h1>
          <p>
            Resumen de sucursales asignadas
          </p>
        </div>

        <div class="resumen-grid"></div>

      </section>

    `;
  }

  // =========================
  // DASHBOARD NORMAL
  // =========================

  else {

    contenido.innerHTML = `

      <section class="inicio-dashboard">

        <div class="inicio-header">
          <h1>Panel principal</h1>

          <p>
            Resumen general del sistema
            de Soporte IT
          </p>
        </div>

        <div class="resumen-grid">

          <div
            class="resumen-card pendiente"
            onclick="validarAccesoSoporte('cola')"
          >

            <div class="resumen-top">
              <span>Solicitudes pendientes</span>

              <div class="resumen-icono">
                🟡
              </div>
            </div>

            <strong id="totalPendientes">
              0
            </strong>

            <p>
              Equipos reportados sin iniciar
            </p>

          </div>

          <div
            class="resumen-card reparacion"
            onclick="validarAccesoSoporte('enProceso')"
          >

            <div class="resumen-top">
              <span>En reparación</span>

              <div class="resumen-icono">
                🔵
              </div>
            </div>

            <strong id="totalEnReparacion">
              0
            </strong>

            <p>
              Equipos siendo trabajados
            </p>

          </div>

          <div
            class="resumen-card repuesto"
            onclick="validarAccesoSoporte('pendienteRepuesto')"
          >

            <div class="resumen-top">
              <span>Pendiente repuesto</span>

              <div class="resumen-icono">
                🟠
              </div>
            </div>

            <strong id="totalPendienteRepuesto">
              0
            </strong>

            <p>
              Esperando piezas
            </p>

          </div>

          <div
            class="resumen-card reparado"
            onclick="validarAccesoSoporte('historialReparaciones')"
          >

            <div class="resumen-top">
              <span>Reparadas</span>

              <div class="resumen-icono">
                🟢
              </div>
            </div>

            <strong id="totalReparadas">
              0
            </strong>

            <p>
              Listas para entrega
            </p>

          </div>

          <div
            class="resumen-card entregado"
            onclick="validarAccesoSoporte('historialReparaciones')"
          >

            <div class="resumen-top">
              <span>Entregadas</span>

              <div class="resumen-icono">
                ⚪
              </div>
            </div>

            <strong id="totalEntregadas">
              0
            </strong>

            <p>
              Entregadas al usuario
            </p>

          </div>

          <div
            class="resumen-card cancelado"
            onclick="validarAccesoSoporte('historialReparaciones')"
          >

            <div class="resumen-top">
              <span>Canceladas</span>

              <div class="resumen-icono">
                🔴
              </div>
            </div>

            <strong id="totalCanceladas">
              0
            </strong>

            <p>
              Reparaciones canceladas
            </p>

          </div>

        </div>

      </section>

    `;
  }

  // =========================
  // CARGAR DATOS
  // =========================

  cargarResumenPantallaPrincipal();
}

async function cargarResumenPantallaPrincipal() {

  try {

    let endpoint = '';

    if (usuarioEsSoporte(usuarioActual)) {

      endpoint =
        '/api/pantalla-principal/resumen';

    } else if (usuarioEsRegional(usuarioActual)) {

      endpoint =
        '/api/pantalla-principal/regional-resumen';

    } else {

      endpoint =
        '/api/pantalla-principal/mis-resumen';
    }

    const res = await fetch(endpoint);

    const data = await res.json();

    if (!data.ok) {
      console.error(
        'Error al cargar resumen:',
        data
      );
      return;
    }

    // =====================================
    // DASHBOARD REGIONAL
    // =====================================

    if (usuarioEsRegional(usuarioActual)) {

      const grid =
        document.querySelector('.resumen-grid');

      if (!grid) return;

      const sucursales = {};

      (data.filas || []).forEach(f => {

        const nombre =
          f.NombreDepartamento || 'Sucursal';

        if (!sucursales[nombre]) {

          sucursales[nombre] = {
            pendientes: 0,
            enReparacion: 0,
            pendienteRepuesto: 0,
            reparadas: 0
          };
        }

        switch (Number(f.Estado)) {

          case 1:
            sucursales[nombre].pendientes =
              f.Total;
            break;

          case 2:
            sucursales[nombre].enReparacion =
              f.Total;
            break;

          case 3:
            sucursales[nombre].pendienteRepuesto =
              f.Total;
            break;

          case 4:
            sucursales[nombre].reparadas =
              f.Total;
            break;
        }
      });

      grid.innerHTML = Object.entries(sucursales)
        .map(([nombre, s]) => `

          <div class="regional-card">

            <div class="regional-header">

              <div>
                <h3>${nombre}</h3>
                <p>Resumen de reparaciones</p>
              </div>

              <div class="regional-icono">
                🏬
              </div>

            </div>

            <div class="regional-estados">

              <div class="regional-estado">
                <div class="dot dot-pendiente"></div>

                <div>
                  <span>Pendientes</span>
                  <strong>${s.pendientes || 0}</strong>
                </div>
              </div>

              <div class="regional-estado">
                <div class="dot dot-reparacion"></div>

                <div>
                  <span>En reparación</span>
                  <strong>${s.enReparacion || 0}</strong>
                </div>
              </div>

              <div class="regional-estado">
                <div class="dot dot-repuesto"></div>

                <div>
                  <span>Repuesto</span>
                  <strong>${s.pendienteRepuesto || 0}</strong>
                </div>
              </div>

              <div class="regional-estado">
                <div class="dot dot-reparado"></div>

                <div>
                  <span>Reparadas</span>
                  <strong>${s.reparadas || 0}</strong>
                </div>
              </div>

            </div>

          </div>

        `)
        .join('');

      return;
    }

    // =====================================
    // DASHBOARD NORMAL
    // =====================================

    document.getElementById('totalPendientes').textContent =
      data.resumen.pendientes || 0;

    document.getElementById('totalEnReparacion').textContent =
      data.resumen.enReparacion || 0;

    document.getElementById('totalPendienteRepuesto').textContent =
      data.resumen.pendienteRepuesto || 0;

    document.getElementById('totalReparadas').textContent =
      data.resumen.reparadas || 0;

    document.getElementById('totalEntregadas').textContent =
      data.resumen.entregadas || 0;

    document.getElementById('totalCanceladas').textContent =
      data.resumen.canceladas || 0;

  } catch (error) {

    console.error(
      'Error al obtener resumen de PantallaPrincipal:',
      error
    );
  }
}

const scriptsCargados = new Set();

function abrirVista(vista, event) {

  document.querySelectorAll('.submenu-btn')
    .forEach(b => {
      b.classList.remove('activo');
    });

  if (event) {
    event.currentTarget.classList.add('activo');
  }

  const contenido =
    document.querySelector('.contenido');

  fetch(`/vista/${vista}`)
    .then(r => r.text())
    .then(html => {

      contenido.innerHTML = html;

      const rutasJS = {

        equipo:
          '/logica/Reportar/Equipo.js',

        misSolicitudes:
          '/logica/Reportar/MisSolicitudes.js',

        cola:
          '/logica/SoporteTecnico/ColaReparacion.js',

        enProceso:
          '/logica/SoporteTecnico/ReparacionesProceso.js',

        pendienteRepuesto:
          '/logica/SoporteTecnico/PendienteRepuesto.js',

        historialReparaciones:
          '/logica/SoporteTecnico/HistorialReparaciones.js',

        detalleReparacion:
          '/logica/SoporteTecnico/DetalleReparacion.js'
      };

      const rutaJS = rutasJS[vista];

      if (!rutaJS) return;

      if (!scriptsCargados.has(vista)) {

        const script =
          document.createElement('script');

        script.src = rutaJS;

        document.body.appendChild(script);

        scriptsCargados.add(vista);

      } else {

        fetch(rutaJS)
          .then(r => r.text())
          .then(code => {
            new Function(code)();
          });
      }
    });
}
