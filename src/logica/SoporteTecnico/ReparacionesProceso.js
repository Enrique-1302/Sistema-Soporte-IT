(function () {

  function cargarProceso() {
    const contenedor = document.getElementById('procesoContenido');

    if (!contenedor) {
      console.error('No existe el elemento #procesoContenido en ReparacionesProceso.html');
      return;
    }

    contenedor.innerHTML = `
      <div class="proceso-cargando">
        Cargando reparaciones en proceso...
      </div>
    `;

    fetch('/api/reparaciones/proceso')
      .then(res => res.json())
      .then(data => {
        renderProceso(data.reparaciones || []);
        activarBotonesEstado();
      })
      .catch(() => {
        contenedor.innerHTML = `
          <p class="proceso-error">Error al cargar reparaciones en proceso.</p>
        `;
      });
  }

  function obtenerTextoEstado(estado) {
    const estados = {
      2: 'En reparación',
      3: 'Pendiente de repuesto',
      4: 'Reparado',
      5: 'Entregado',
      6: 'Cancelado',
      7: 'Sin reparación'
    };

  return estados[Number(estado)] || 'Cambio de estado';
}

  function pedirComentario(estado) {
    const textoEstado = obtenerTextoEstado(estado);

    const comentario = prompt(
      `Comentario técnico para "${textoEstado}":`
    );

    if (comentario === null) {
      return null;
    }

    if (!comentario.trim()) {
      alert('Debes ingresar un comentario técnico.');
      return null;
    }

    return comentario.trim();
  }

  function activarBotonesEstado() {
    document.querySelectorAll('.btn-estado').forEach(btn => {

      btn.addEventListener('click', async () => {

        const IdReparacion = btn.dataset.id;
        const EstadoNuevo = btn.dataset.estado;

        const Comentario = pedirComentario(EstadoNuevo);

        if (!Comentario) return;

        btn.disabled = true;

        try {

          const res = await fetch('/api/reparacion/cambiar-estado', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              IdReparacion,
              EstadoNuevo: Number(EstadoNuevo),
              Comentario
            })
          });

          const data = await res.json();

          if (!data.ok) {
            alert(data.mensaje || 'No se pudo actualizar.');
            btn.disabled = false;
            return;
          }

          cargarProceso();

        } catch (err) {
          console.error(err);

          alert('Error actualizando reparación.');

          btn.disabled = false;
        }

      });

    });
  }

  function renderProceso(reparaciones) {
    const contenedor = document.getElementById('procesoContenido');

    if (reparaciones.length === 0) {
      contenedor.innerHTML = `
        <div class="proceso-vacio">
          <p>No hay reparaciones en proceso.</p>
        </div>
      `;
      return;
    }

    contenedor.innerHTML = reparaciones.map(rep => {
      const fechaInicio = rep.FechaInicio
        ? new Date(rep.FechaInicio).toLocaleString('es-GT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        : 'Sin fecha';

      return `
        <div class="proceso-card">
          <div class="proceso-card-header">
            <div>
              <span class="proceso-id">#${rep.IdReparacion}</span>
              <h3>En reparación</h3>
              <p>Inicio: ${fechaInicio}</p>
            </div>

            <span class="estado estado-2">
              En reparación
            </span>
          </div>

          <div class="proceso-info">
            <strong>Sucursal:</strong> ${rep.DepaSucu || 'No definida'}
          </div>

          <div class="proceso-info">
            <strong>Reportado por:</strong> ${rep.NombreUsuario || 'No definido'}
          </div>

          ${rep.Observaciones ? `
            <div class="proceso-obs">
              <strong>Observaciones:</strong>
              <p>${rep.Observaciones}</p>
            </div>
          ` : ''}

          <table class="proceso-tabla">
            <thead>
              <tr>
                <th>Descripción</th>
                <th>UPC</th>
                <th>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              ${rep.equipos.map(eq => `
                <tr>
                  <td>${eq.Descripcion}</td>
                  <td>${eq.Upc}</td>
                  <td>${eq.Cantidad}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="proceso-acciones">
            <button class="btn-estado btn-repuesto" data-id="${rep.IdReparacion}" data-estado="3">
              Pendiente repuesto
            </button>

            <button class="btn-estado btn-reparado" data-id="${rep.IdReparacion}" data-estado="4">
              Reparado
            </button>

            <button class="btn-estado btn-sin-reparacion" data-id="${rep.IdReparacion}" data-estado="7">
              Sin reparación
            </button>

            <button class="btn-estado btn-cancelado" data-id="${rep.IdReparacion}" data-estado="6">
              Cancelar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  const btnRefrescar = document.getElementById('btnRefrescarProceso');

  if (btnRefrescar) {
    btnRefrescar.addEventListener('click', cargarProceso);
  }

  cargarProceso();

})();