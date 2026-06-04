cargarPendientesRepuesto();

async function cargarPendientesRepuesto() {
  const contenedor = document.getElementById('pendienteRepuestoListado');
  if (!contenedor) return;

  contenedor.innerHTML = `<p>Cargando reparaciones...</p>`;

  try {
    const res = await fetch('/api/reparaciones/pendiente-repuesto');
    const data = await res.json();

    if (!data.ok) {
      contenedor.innerHTML = `<p>Error cargando pendientes.</p>`;
      return;
    }

    renderPendientesRepuesto(data.reparaciones || []);

  } catch (error) {
    console.error(error);
    contenedor.innerHTML = `<p>Error de conexión.</p>`;
  }
}

function obtenerTextoEstado(estado) {
  const estados = {
    2: 'En reparación',
    4: 'Reparado',
    5: 'Entregado',
    6: 'Cancelado',
    7: 'Sin reparación'
  };

  return estados[Number(estado)] || 'Cambio de estado';
}

async function cambiarEstadoDesdePendiente(IdReparacion, EstadoNuevo) {
  const textoEstado = obtenerTextoEstado(EstadoNuevo);

  const Comentario = prompt(`Comentario técnico para "${textoEstado}":`);

  if (Comentario === null) return;

  if (!Comentario.trim()) {
    alert('Debes ingresar un comentario técnico.');
    return;
  }

  try {
    const res = await fetch('/api/reparacion/cambiar-estado', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        IdReparacion,
        EstadoNuevo: Number(EstadoNuevo),
        Comentario: Comentario.trim()
      })
    });

    const data = await res.json();

    if (!data.ok) {
      alert(data.mensaje || 'No se pudo actualizar.');
      return;
    }

    cargarPendientesRepuesto();

  } catch (error) {
    console.error(error);
    alert('Error actualizando reparación.');
  }
}

function renderPendientesRepuesto(reparaciones) {
  const contenedor = document.getElementById('pendienteRepuestoListado');
  if (!contenedor) return;

  if (!reparaciones.length) {
    contenedor.innerHTML = `<p>No hay reparaciones pendientes de repuesto.</p>`;
    return;
  }

  contenedor.innerHTML = reparaciones.map(rep => `
    <div class="reparacion-card">

      <div class="reparacion-top">
        <div>
          <h3>Reparación #${rep.IdReparacion}</h3>
            <p><strong>Usuario:</strong> ${rep.NombreUsuario}</p>
            <p><strong>Sucursal:</strong> ${rep.DepaSucu}</p>
        </div>

        <span class="estado estado-3">
          Pendiente de repuesto
        </span>
      </div>

      <div class="equipos-listado">
        ${rep.equipos.map(eq => `
          <div class="equipo-item">
            <div>
              <strong>${eq.Descripcion}</strong>
              <p>${eq.Upc}</p>
            </div>
            <span>x${eq.Cantidad}</span>
          </div>
        `).join('')}
      </div>

      <div class="comentario-tecnico">
        <strong>Último comentario técnico:</strong>
        <p>${rep.UltimoComentario || 'Sin comentarios'}</p>

        ${rep.UsuarioComentario ? `
          <small>Por: ${rep.UsuarioComentario}</small>
        ` : ''}

        ${rep.FechaComentario ? `
          <small>Fecha: ${new Date(rep.FechaComentario).toLocaleString('es-GT')}</small>
        ` : ''}
      </div>

      <div class="proceso-acciones">
        <button
          class="btn-estado btn-reparado"
          onclick="cambiarEstadoDesdePendiente(${rep.IdReparacion}, 2)"
        >
          Volver a reparación
        </button>

        <button
          class="btn-estado btn-reparado"
          onclick="cambiarEstadoDesdePendiente(${rep.IdReparacion}, 4)"
        >
          Reparado
        </button>

        <button
          class="btn-estado btn-sin-reparacion"
          onclick="cambiarEstadoDesdePendiente(${rep.IdReparacion}, 7)"
        >
          Sin reparación
        </button>

        <button
          class="btn-estado btn-cancelado"
          onclick="cambiarEstadoDesdePendiente(${rep.IdReparacion}, 6)"
        >
          Cancelar
        </button>
      </div>

    </div>
  `).join('');
}