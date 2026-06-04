(function () {

  const estados = {
    1: 'Pendiente',
    2: 'En reparación',
    3: 'Pendiente de repuesto',
    4: 'Reparado',
    5: 'Entregado',
    6: 'Cancelado',
    7: 'Sin reparación'
  };

  function cargarMisSolicitudes() {
    const contenedor = document.getElementById('misSolicitudesContenido');

    if (!contenedor) return;

    contenedor.innerHTML = `
      <div class="mis-cargando">
        Cargando solicitudes...
      </div>
    `;

    fetch('/api/mis-solicitudes')
      .then(res => res.json())
      .then(data => {
        renderSolicitudes(data.solicitudes || []);
      })
      .catch(() => {
        contenedor.innerHTML = `
          <p class="mis-error">Error al cargar tus solicitudes.</p>
        `;
      });
  }

  async function aceptarReparacion(IdReparacion) {
    const confirmar = confirm(
      '¿Confirmas que la sucursal recibió y acepta esta reparación?'
    );

    if (!confirmar) return;

    const Comentario = prompt(
      'Comentario de recepción:',
      'Reparación recibida y aceptada por la sucursal.'
    );

    if (Comentario === null) return;

    if (!Comentario.trim()) {
      alert('Debes ingresar un comentario.');
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
        alert(data.mensaje || 'No se pudo aceptar la reparación.');
        return;
      }

      cargarMisSolicitudes();

    } catch (error) {
      console.error(error);
      alert('Error aceptando reparación.');
    }
  }

  function renderSolicitudes(solicitudes) {
    const contenedor = document.getElementById('misSolicitudesContenido');

    if (!contenedor) return;

    if (solicitudes.length === 0) {
      contenedor.innerHTML = `
        <div class="mis-vacio">
          <p>No tienes solicitudes registradas.</p>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = `
      <div class="mis-tabla-contenedor">
        <table class="mis-tabla">
          <thead>
            <tr>
              <th>ID</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Equipos</th>
              <th>Observaciones</th>
              <th>Comentario técnico</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            ${solicitudes.map(sol => {
              const fecha = new Date(sol.FechahoraReporte).toLocaleString('es-GT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              const estadoTexto = estados[Number(sol.Estado)] || 'Desconocido';

              const mostrarSucursal =
                sol.DepaSucu
                  ? `<small class="mis-sucursal">${sol.DepaSucu}</small>`
                  : '';

              return `
                <tr>
                  <td>
                    <strong>#${sol.IdReparacion}</strong>
                    ${mostrarSucursal}
                    </td>
                  <td>
                    <span class="estado estado-${sol.Estado}">
                      ${estadoTexto}
                    </span>
                  </td>

                  <td>${fecha}</td>

                  <td>
                    ${sol.equipos.map(eq => `
                      <div class="mis-equipo">
                        <strong>${eq.Descripcion}</strong>
                        <small>${eq.Upc} | x${eq.Cantidad}</small>
                      </div>
                    `).join('')}
                  </td>

                  <td class="mis-obs">
                    ${sol.Observaciones || '-'}
                  </td>

                  <td class="mis-comentario">
                    <p>${sol.UltimoComentario || '-'}</p>

                    ${sol.UsuarioComentario ? `
                      <small>Por: ${sol.UsuarioComentario}</small>
                    ` : ''}

                    ${sol.FechaComentario ? `
                      <small>${new Date(sol.FechaComentario).toLocaleString('es-GT')}</small>
                    ` : ''}
                  </td>

                  <td>
                    ${Number(sol.Estado) === 4 ? `
                      <button
                        class="btn-aceptar-reparacion"
                        onclick="aceptarReparacion(${sol.IdReparacion})"
                      >
                        Aceptar
                      </button>
                    ` : '-'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    window.aceptarReparacion = aceptarReparacion;
  }

  const btnRefrescar = document.getElementById('btnRefrescarMis');

  if (btnRefrescar) {
    btnRefrescar.addEventListener('click', cargarMisSolicitudes);
  }

  cargarMisSolicitudes();

})();