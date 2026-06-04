window.abrirDetalleReparacion = async function (IdReparacion) {

  const contenido = document.querySelector('.contenido');

  if (!contenido) return;

  const html = await fetch('/vista/detalleReparacion')
    .then(r => r.text());

  contenido.innerHTML = html;

  cargarDetalleReparacion(IdReparacion);
};

window.cerrarDetalleReparacion = function () {

  const contenido = document.querySelector('.contenido');

  if (!contenido) return;

  fetch('/vista/historialReparaciones')
    .then(r => r.text())
    .then(html => {

      contenido.innerHTML = html;

      return fetch('/logica/SoporteTecnico/HistorialReparaciones.js');
    })
    .then(r => r.text())
    .then(code => {
      new Function(code)();
    });
};

async function cargarDetalleReparacion(IdReparacion) {

  const contenedor = document.getElementById('detalleContenido');

  if (!contenedor) return;

  try {

    const res = await fetch(
      `/api/reparacion/detalle?id=${IdReparacion}`
    );

    const data = await res.json();

    if (!data.ok) {
      contenedor.innerHTML = `
        <p>Error cargando detalle.</p>
      `;
      return;
    }

    renderDetalle(data);

  } catch (error) {

    console.error(error);

    contenedor.innerHTML = `
      <p>Error cargando detalle.</p>
    `;
  }
}

function obtenerEstadoTexto(estado) {

  const estados = {
    1: 'Pendiente',
    2: 'En reparación',
    3: 'Pendiente de repuesto',
    4: 'Reparado',
    5: 'Entregado',
    6: 'Cancelado',
    7: 'Sin reparación'
  };

  return estados[Number(estado)] || 'Desconocido';
}

function renderDetalle(data) {

  const {
    reparacion,
    equipos,
    comentarios,
    historial
  } = data;

  document.getElementById('detalleTitulo').textContent =
    `Reparación #${reparacion.IdReparacion}`;

  document.getElementById('detalleEstado').className =
    `estado estado-${reparacion.Estado}`;

  document.getElementById('detalleEstado').textContent =
    obtenerEstadoTexto(reparacion.Estado);

  const contenedor = document.getElementById('detalleContenido');

  const fechaReporte = reparacion.FechahoraReporte
    ? new Date(reparacion.FechahoraReporte).toLocaleString('es-GT')
    : 'Sin fecha';

  const fechaInicio = reparacion.FechaInicio
    ? new Date(reparacion.FechaInicio).toLocaleString('es-GT')
    : 'Sin iniciar';

  const fechaFinalizacion = reparacion.FechaFinalizacion
    ? new Date(reparacion.FechaFinalizacion).toLocaleString('es-GT')
    : 'Sin finalizar';

  const fechaEntrega = reparacion.FechaEntrega
    ? new Date(reparacion.FechaEntrega).toLocaleString('es-GT')
    : 'Sin entregar';

  contenedor.innerHTML = `

    <div class="detalle-grid">

      <div class="detalle-card">
        <h3>Información general</h3>

        <p><strong>Sucursal:</strong> ${reparacion.DepaSucu || 'No definida'}</p>
        <p><strong>Usuario:</strong> ${reparacion.NombreUsuario || 'No definido'}</p>
        <p>
          <strong>Estado actual:</strong>
          <span class="estado estado-${reparacion.Estado}">
            ${obtenerEstadoTexto(reparacion.Estado)}
          </span>
        </p>
        <p><strong>Fecha reporte:</strong> ${fechaReporte}</p>
        <p><strong>Fecha inicio:</strong> ${fechaInicio}</p>
        <p><strong>Fecha finalización:</strong> ${fechaFinalizacion}</p>
        <p><strong>Fecha entrega:</strong> ${fechaEntrega}</p>

        ${reparacion.Observaciones ? `
          <div class="detalle-observacion">
            <strong>Observación inicial</strong>
            <p>${reparacion.Observaciones}</p>
          </div>
        ` : ''}
      </div>

      <div class="detalle-card">
        <h3>Equipos reportados</h3>

        ${equipos.length
          ? equipos.map(eq => `
            <div class="detalle-equipo">
              <strong>${eq.Descripcion}</strong>
              <small>UPC: ${eq.Upc} | Cantidad: ${eq.Cantidad}</small>
            </div>
          `).join('')
          : '<p>Sin equipos registrados.</p>'
        }
      </div>

      <div class="detalle-card detalle-timeline">
        <h3>Comentarios técnicos</h3>

        ${comentarios.length
          ? comentarios.map(c => `
            <div class="detalle-comentario">
              <strong>${c.NombreUsuario}</strong>
              <p>${c.Comentario}</p>
              <small>
                ${new Date(c.FechaHora).toLocaleString('es-GT')}
              </small>
            </div>
          `).join('')
          : '<p>Sin comentarios técnicos.</p>'
        }
      </div>

      <div class="detalle-card detalle-timeline">
        <h3>Historial de estados</h3>

        ${historial.length
          ? historial.map(h => `
            <div class="timeline-item">

              <div class="timeline-header">

                <span class="estado estado-${h.EstadoAnterior}">
                  ${obtenerEstadoTexto(h.EstadoAnterior)}
                </span>

                <span class="timeline-arrow">→</span>

                <span class="estado estado-${h.EstadoNuevo}">
                  ${obtenerEstadoTexto(h.EstadoNuevo)}
                </span>

            </div>

            <div class="timeline-body">
              <strong>${h.NombreUsuarioCambio}</strong>

              <p>
                ${h.Comentario || 'Sin comentario'}
              </p>

              <small>
                ${new Date(h.FechaCambio).toLocaleString('es-GT')}
              </small>
            </div>

          </div>
          
          `).join('')
          : '<p>Sin historial registrado.</p>'
        }
      </div>

    </div>
  `;
}