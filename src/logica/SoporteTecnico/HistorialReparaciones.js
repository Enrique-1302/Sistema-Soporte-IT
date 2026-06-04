if (typeof window.abrirDetalleReparacion !== 'function') {
  const script = document.createElement('script');
  script.src = '/logica/SoporteTecnico/DetalleReparacion.js';
  document.body.appendChild(script);
}

cargarHistorialReparaciones();

async function cargarHistorialReparaciones() {
  const contenedor = document.getElementById('historialReparacionesListado');
  if (!contenedor) return;

  contenedor.innerHTML = `<p>Cargando historial...</p>`;

  try {
    const res = await fetch('/api/reparaciones/historial');
    const data = await res.json();

    if (!data.ok) {
      contenedor.innerHTML = `<p>Error cargando historial.</p>`;
      return;
    }

    renderHistorial(data.reparaciones || []);

  } catch (error) {
    console.error(error);
    contenedor.innerHTML = `<p>Error de conexión.</p>`;
  }
}

function obtenerEstadoTexto(estado) {
  const estados = {
    3: 'Pendiente de repuesto',
    4: 'Reparado',
    5: 'Entregado',
    6: 'Cancelado',
    7: 'Sin reparación'
  };

  return estados[estado] || 'Desconocido';
}

const estados = {
  1: 'Pendiente',
  2: 'En reparación',
  3: 'Pendiente de repuesto',
  4: 'Reparado',
  5: 'Entregado',
  6: 'Cancelado',
  7: 'Sin reparación'
};

const filtrosHistorial = {
  texto: '',
  estado: '',
  sucursal: ''
};

function renderHistorial(reparaciones) {

  const contenedor =
    document.getElementById('historialReparacionesListado');

  if (!contenedor) return;

  if (!reparaciones.length) {

    contenedor.innerHTML =
      `<p>No hay historial disponible.</p>`;

    return;
  }

  contenedor.innerHTML = `

    <div class="historial-filtros">

      <input
       type="text"
        id="buscarHistorial"
        placeholder="Buscar usuario, UPC, equipo..."
        value="${filtrosHistorial.texto}"
      >

      <select id="filtroEstadoHistorial">

        <option value="">
          Todos los estados
        </option>

        <option
          value="1"
          ${filtrosHistorial.estado === '1' ? 'selected' : ''}
        >
          Pendiente
        </option>

        <option
          value="2"
          ${filtrosHistorial.estado === '2' ? 'selected' : ''}
        >
          En reparación
        </option>

        <option
          value="3"
          ${filtrosHistorial.estado === '3' ? 'selected' : ''}
        >
          Pendiente repuesto
        </option>

        <option
          value="4"
          ${filtrosHistorial.estado === '4' ? 'selected' : ''}
        >
          Reparado
        </option>

        <option
          value="5"
          ${filtrosHistorial.estado === '5' ? 'selected' : ''}
        >
          Entregado
        </option>

        <option
          value="6"
          ${filtrosHistorial.estado === '6' ? 'selected' : ''}
        >
          Cancelado
        </option>

        <option
          value="7"
          ${filtrosHistorial.estado === '7' ? 'selected' : ''}
        >
          Sin reparación
        </option>

      </select>

      <select id="filtroSucursalHistorial">

        <option value="">
          Todas las sucursales
        </option>

        ${[...new Set(
          reparaciones.map(r => r.DepaSucu)
        )]
          .sort()
          .map(s => `
            <option
              value="${s}"
              ${filtrosHistorial.sucursal === s ? 'selected' : ''}
            >
              ${s}
            </option>
          `).join('')}

      </select>

    </div>

    <div class="historial-tabla-contenedor">

      <table class="historial-tabla">

        <thead>

          <tr>
            <th>ID</th>
            <th>Estado</th>
            <th>Usuario</th>
            <th>Sucursal</th>
            <th>Fecha</th>
            <th>Equipos</th>
            <th>Observaciones</th>
            <th>Comentario técnico</th>
            <th>Acciones</th>
          </tr>

        </thead>

        <tbody>

          ${filtrarReparaciones(reparaciones).map(rep => {

            const fecha = new Date(
              rep.FechahoraReporte
            ).toLocaleString('es-GT', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const estadoTexto =
              estados[Number(rep.Estado)] || 'Desconocido';

            return `

              <tr>

                <td>
                  #${rep.IdReparacion}
                </td>

                <td>

                  <span class="estado estado-${rep.Estado}">
                    ${estadoTexto}
                  </span>

                </td>

                <td>
                  ${rep.NombreUsuario}
                </td>

                <td>
                  ${rep.DepaSucu || '-'}
                </td>

                <td>
                  ${fecha}
                </td>

                <td>

                  ${rep.equipos.map(eq => `

                    <div class="historial-equipo">

                      <strong>
                        ${eq.Descripcion}
                      </strong>

                      <small>
                        ${eq.Upc} | x${eq.Cantidad}
                      </small>

                    </div>

                  `).join('')}

                </td>

                <td class="historial-obs">
                  ${rep.Observaciones || '-'}
                </td>

                <td class="historial-comentario">

                  <p>
                    ${rep.UltimoComentario || '-'}
                  </p>

                  ${rep.UsuarioComentario ? `
                    <small>
                      Por: ${rep.UsuarioComentario}
                    </small>
                  ` : ''}

                </td>

                <td>

                  <button
                    class="btn-detalle"
                    onclick="abrirDetalleReparacion(${rep.IdReparacion})"
                  >
                    Ver detalle
                  </button>

                </td>

              </tr>

            `;

          }).join('')}

        </tbody>

      </table>

    </div>

  `;

  setTimeout(() => {

  const buscar =
    document.getElementById('buscarHistorial');

  const estado =
    document.getElementById('filtroEstadoHistorial');

  const sucursal =
    document.getElementById('filtroSucursalHistorial');

  buscar?.addEventListener('input', () => {

    filtrosHistorial.texto = buscar.value;

    actualizarTablaHistorial(reparaciones);
  });

  estado?.addEventListener('change', () => {

    filtrosHistorial.estado = estado.value;

    actualizarTablaHistorial(reparaciones);
  });

  sucursal?.addEventListener('change', () => {

    filtrosHistorial.sucursal = sucursal.value;

    actualizarTablaHistorial(reparaciones);
  });

}, 0);
}

function filtrarReparaciones(reparaciones) {

  const texto =
    filtrosHistorial.texto.toLowerCase();

  const estado =
    filtrosHistorial.estado;

  const sucursal =
    filtrosHistorial.sucursal;

  return reparaciones.filter(rep => {

    // =========================
    // ESTADO
    // =========================

    if (
      estado &&
      Number(rep.Estado) !== Number(estado)
    ) {
      return false;
    }

    // =========================
    // SUCURSAL
    // =========================

    if (
      sucursal &&
      rep.DepaSucu !== sucursal
    ) {
      return false;
    }

    // =========================
    // TEXTO
    // =========================

    const textoEquipos = (rep.equipos || [])
      .map(eq =>
        `${eq.Upc} ${eq.Descripcion}`
      )
      .join(' ')
      .toLowerCase();

    const contenido = `
      ${rep.NombreUsuario}
      ${rep.DepaSucu}
      ${textoEquipos}
      ${rep.Observaciones || ''}
    `.toLowerCase();

    return contenido.includes(texto);

  });
}

function actualizarTablaHistorial(reparaciones) {

  const tbody =
    document.querySelector('.historial-tabla tbody');

  if (!tbody) return;

  tbody.innerHTML = filtrarReparaciones(reparaciones)
    .map(rep => {

      const fecha = new Date(
        rep.FechahoraReporte
      ).toLocaleString('es-GT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const estadoTexto =
        estados[Number(rep.Estado)] || 'Desconocido';

      return `

        <tr>

          <td>
            #${rep.IdReparacion}
          </td>

          <td>

            <span class="estado estado-${rep.Estado}">
              ${estadoTexto}
            </span>

          </td>

          <td>
            ${rep.NombreUsuario}
          </td>

          <td>
            ${rep.DepaSucu || '-'}
          </td>

          <td>
            ${fecha}
          </td>

          <td>

            ${rep.equipos.map(eq => `

              <div class="historial-equipo">

                <strong>
                  ${eq.Descripcion}
                </strong>

                <small>
                  ${eq.Upc} | x${eq.Cantidad}
                </small>

              </div>

            `).join('')}

          </td>

          <td class="historial-obs">
            ${rep.Observaciones || '-'}
          </td>

          <td class="historial-comentario">

            <p>
              ${rep.UltimoComentario || '-'}
            </p>

            ${rep.UsuarioComentario ? `
              <small>
                Por: ${rep.UsuarioComentario}
              </small>
            ` : ''}

          </td>

          <td>

            <button
              class="btn-detalle"
              onclick="abrirDetalleReparacion(${rep.IdReparacion})"
            >
              Ver detalle
            </button>

          </td>

        </tr>

      `;
    })
    .join('');
}

async function entregarEquipo(IdReparacion) {
  const Comentario = prompt('Comentario de entrega:');

  if (Comentario === null) return;

  if (!Comentario.trim()) {
    alert('Debes ingresar un comentario de entrega.');
    return;
  }

  try {
    const res = await fetch('/api/reparacion/entregar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        IdReparacion,
        comentario: Comentario.trim()
      })
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.mensaje || 'No se pudo entregar el equipo.');
      return;
    }

    cargarHistorialReparaciones();

  } catch (error) {
    console.error(error);
    alert('Error entregando equipo.');
  }
}