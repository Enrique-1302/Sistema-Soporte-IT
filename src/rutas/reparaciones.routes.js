const { connectionString, connectionStringProductos } = require('../Conexion/conexion');
const { obtenerSesion } = require('../utils/sesiones');
const { esSoporte, esRegional } = require('../utils/permisos');
const { crearNotificacion } = require('../utils/notificaciones');


function leerBodyJSON(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function nombreEstado(estado) {
  const estados = {
    1: 'Pendiente',
    2: 'En reparacion',
    3: 'Pendiente de repuesto',
    4: 'Reparada',
    5: 'Entregada',
    6: 'Cancelada',
    7: 'Sin reparacion'
  };

  return estados[Number(estado)] || 'Actualizada';
}

module.exports = async function reparacionesRoutes(req, res) {

  // GET /api/reparaciones/proceso
  if (req.url === '/api/reparaciones/proceso' && req.method === 'GET') {

    const usuario = obtenerSesion(req);

    if (!usuario) {
      res.writeHead(401, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: false,
        reparaciones: []
      }));

      return true;
    }

    if (!esSoporte(usuario)) {
      res.writeHead(403, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: false,
        reparaciones: []
      }));

      return true;
    }

    try {

      const db = await connectionStringProductos();

      const rows = await db.query(`
        SELECT
          r.IdReparacion,
          r.NombreUsuario,
          r.DepaSucu,
          r.FechahoraReporte,
          r.FechaInicio,
          r.FechaActualizacion,
          r.Observaciones,
          r.IdTecnicoAsignado,
          rd.Upc,
          rd.Descripcion,
          rd.Cantidad
        FROM reparaciones r
        INNER JOIN reparacionesdetalle rd
          ON r.IdReparacion = rd.IdReparacion
        WHERE r.Estado = 2
        ORDER BY
          r.FechaInicio ASC,
          rd.IdDetalleReparacion ASC
      `);

      await db.close();

      const mapa = new Map();

      rows.forEach(row => {

        if (!mapa.has(row.IdReparacion)) {

          mapa.set(row.IdReparacion, {
            IdReparacion: row.IdReparacion,
            NombreUsuario: row.NombreUsuario,
            DepaSucu: row.DepaSucu,
            FechahoraReporte: row.FechahoraReporte,
            FechaInicio: row.FechaInicio,
            FechaActualizacion: row.FechaActualizacion,
            Observaciones: row.Observaciones,
            IdTecnicoAsignado: row.IdTecnicoAsignado,
            equipos: []
          });

        }

        mapa.get(row.IdReparacion).equipos.push({
          Upc: row.Upc,
          Descripcion: row.Descripcion,
          Cantidad: row.Cantidad
        });

      });

      res.writeHead(200, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: true,
        reparaciones: [...mapa.values()]
      }));

    } catch (err) {

      console.error(
        'Error listando reparaciones en proceso:',
        err.message
      );

      res.writeHead(500, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: false,
        reparaciones: []
      }));

    }

    return true;
  }

  // GET /api/reparaciones/pendiente-repuesto
  if (
    req.url === '/api/reparaciones/pendiente-repuesto' &&
    req.method === 'GET'
  ) {

    const usuario = obtenerSesion(req);

    if (!usuario) {

      res.writeHead(401, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: false,
        reparaciones: []
      }));

      return true;
    }

    if (!esSoporte(usuario)) {

      res.writeHead(403, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: false,
        reparaciones: []
      }));

      return true;
    }

    try {

      const db = await connectionStringProductos();

      const rows = await db.query(`
        SELECT
          r.IdReparacion,
          r.NombreUsuario,
          r.DepaSucu,
          r.FechahoraReporte,
          r.FechaInicio,
          r.FechaActualizacion,
          r.Observaciones,
          r.IdTecnicoAsignado,
          rc.Comentario AS UltimoComentario,
          rc.NombreUsuario AS UsuarioComentario,
          rc.FechaHora AS FechaComentario,
          rd.Upc,
          rd.Descripcion,
          rd.Cantidad
        FROM reparaciones r
        INNER JOIN reparacionesdetalle rd
          ON r.IdReparacion = rd.IdReparacion
        LEFT JOIN reparaciones_comentarios rc
          ON rc.IdComentario = (
            SELECT rc2.IdComentario
            FROM reparaciones_comentarios rc2
            WHERE rc2.IdReparacion = r.IdReparacion
            ORDER BY rc2.FechaHora DESC
            LIMIT 1
          )
        WHERE r.Estado = 3
        ORDER BY
          r.FechaActualizacion DESC,
          rd.IdDetalleReparacion ASC
      `);

      await db.close();

      const mapa = new Map();

      rows.forEach(row => {

        if (!mapa.has(row.IdReparacion)) {

          mapa.set(row.IdReparacion, {
            IdReparacion: row.IdReparacion,
            NombreUsuario: row.NombreUsuario,
            DepaSucu: row.DepaSucu,
            FechahoraReporte: row.FechahoraReporte,
            FechaInicio: row.FechaInicio,
            FechaActualizacion: row.FechaActualizacion,
            Observaciones: row.Observaciones,
            IdTecnicoAsignado: row.IdTecnicoAsignado,
            UltimoComentario: row.UltimoComentario,
            UsuarioComentario: row.UsuarioComentario,
            FechaComentario: row.FechaComentario,
            equipos: []
          });

        }

        mapa.get(row.IdReparacion).equipos.push({
          Upc: row.Upc,
          Descripcion: row.Descripcion,
          Cantidad: row.Cantidad
        });

      });

      res.writeHead(200, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: true,
        reparaciones: [...mapa.values()]
      }));

    } catch (err) {

      console.error(
        'Error listando pendientes de repuesto:',
        err.message
      );

      res.writeHead(500, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: false,
        reparaciones: []
      }));

    }

    return true;
  }

  // GET /api/reparaciones/historial
  if (req.url === '/api/reparaciones/historial' && req.method === 'GET') {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, reparaciones: [] }));
      return true;
    }

    if (!esSoporte(usuario)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, reparaciones: [] }));
      return true;
    }

    try {
      const db = await connectionStringProductos();

      const rows = await db.query(`
        SELECT
          r.IdReparacion,
          r.NombreUsuario,
          r.DepaSucu,
          r.FechahoraReporte,
          r.FechaInicio,
          r.FechaFinalizacion,
          r.FechaActualizacion,
          r.Estado,
          r.Observaciones,
          rc.Comentario AS UltimoComentario,
          rc.NombreUsuario AS UsuarioComentario,
          rc.FechaHora AS FechaComentario,
          rd.Upc,
          rd.Descripcion,
          rd.Cantidad
        FROM reparaciones r
        INNER JOIN reparacionesdetalle rd
          ON r.IdReparacion = rd.IdReparacion
        LEFT JOIN reparaciones_comentarios rc
          ON rc.IdComentario = (
            SELECT rc2.IdComentario
            FROM reparaciones_comentarios rc2
            WHERE rc2.IdReparacion = r.IdReparacion
            ORDER BY rc2.FechaHora DESC
            LIMIT 1
          )
        WHERE r.Estado IN (3, 4, 5, 6, 7)
        ORDER BY r.FechaActualizacion DESC, rd.IdDetalleReparacion ASC
      `);

      await db.close();

      const mapa = new Map();

      rows.forEach(row => {
        if (!mapa.has(row.IdReparacion)) {
          mapa.set(row.IdReparacion, {
            IdReparacion: row.IdReparacion,
            NombreUsuario: row.NombreUsuario,
            DepaSucu: row.DepaSucu,
            FechahoraReporte: row.FechahoraReporte,
            FechaInicio: row.FechaInicio,
            FechaFinalizacion: row.FechaFinalizacion,
            FechaActualizacion: row.FechaActualizacion,
            Estado: row.Estado,
            Observaciones: row.Observaciones,
            UltimoComentario: row.UltimoComentario,
            UsuarioComentario: row.UsuarioComentario,
            FechaComentario: row.FechaComentario,
            equipos: []
          });
        }

        mapa.get(row.IdReparacion).equipos.push({
          Upc: row.Upc,
          Descripcion: row.Descripcion,
          Cantidad: row.Cantidad
        });
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        reparaciones: [...mapa.values()]
      }));

    } catch (err) {
      console.error('Error listando historial de reparaciones:', err.message);

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, reparaciones: [] }));
    }

    return true;
  }

    // GET /api/reparacion/detalle?id=123
  if (req.url.startsWith('/api/reparacion/detalle') && req.method === 'GET') {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, mensaje: 'Sesión expirada.' }));
      return true;
    }

    const id = new URL(req.url, 'http://localhost').searchParams.get('id');

    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, mensaje: 'ID de reparación requerido.' }));
      return true;
    }

    try {
      const db = await connectionStringProductos();

      const reparaciones = await db.query(`
        SELECT
          r.IdReparacion,
          r.IdUsuario,
          r.NombreUsuario,
          r.IdDepaSucu,
          r.DepaSucu,
          r.FechahoraReporte,
          r.Estado,
          r.Observaciones,
          r.FechaInicio,
          r.FechaFinalizacion,
          r.FechaActualizacion,
          r.FechaEntrega,
          r.IdTecnicoAsignado
        FROM reparaciones r
        WHERE r.IdReparacion = ?
        LIMIT 1
      `, [id]);

      if (reparaciones.length === 0) {
        await db.close();

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, mensaje: 'Reparación no encontrada.' }));
        return true;
      }

      const reparacion = reparaciones[0];

      const esMismaSucursal =
        Number(reparacion.IdDepaSucu) === Number(usuario.IdDepaSucu);

      if (!esSoporte(usuario) && !esMismaSucursal) {
        await db.close();

        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, mensaje: 'No tienes permiso para ver esta reparación.' }));
        return true;
      }

      const equipos = await db.query(`
        SELECT
          IdDetalleReparacion,
          Upc,
          Descripcion,
          Cantidad
        FROM reparacionesdetalle
        WHERE IdReparacion = ?
        ORDER BY IdDetalleReparacion ASC
      `, [id]);

      const comentarios = await db.query(`
        SELECT
          IdComentario,
          IdUsuario,
          NombreUsuario,
          TipoComentario,
          Comentario,
          FechaHora
        FROM reparaciones_comentarios
        WHERE IdReparacion = ?
        ORDER BY FechaHora ASC
      `, [id]);

      const historial = await db.query(`
        SELECT
          IdHistorial,
          EstadoAnterior,
          EstadoNuevo,
          IdUsuarioCambio,
          NombreUsuarioCambio,
          Comentario,
          FechaCambio
        FROM reparaciones_historial
        WHERE IdReparacion = ?
        ORDER BY FechaCambio ASC
      `, [id]);

      await db.close();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        reparacion,
        equipos,
        comentarios,
        historial
      }));

    } catch (err) {
      console.error('Error cargando detalle de reparación:', err.message);

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        mensaje: 'Error cargando detalle de reparación.'
      }));
    }

    return true;
  }

  // GET /api/pantalla-principal/mis-resumen
if (
  req.url === '/api/pantalla-principal/mis-resumen' &&
  req.method === 'GET'
) {

  const usuario = obtenerSesion(req);

  if (!usuario) {

    res.writeHead(401, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
      ok: false,
      mensaje: 'Sesión expirada.'
    }));

    return true;
  }

  try {

    const db = await connectionStringProductos();

    const idSucursal =
      usuario.IdDepaSucu ||
      usuario.IdSucuDepa;

    const filas = await db.query(`

      SELECT
        Estado,
        COUNT(*) AS Total
      FROM reparaciones
      WHERE IdDepaSucu = ?
      GROUP BY Estado

    `, [idSucursal]);

    await db.close();

    const resumen = {
      pendientes: 0,
      enReparacion: 0,
      pendienteRepuesto: 0,
      reparadas: 0,
      entregadas: 0,
      canceladas: 0,
      sinReparacion: 0
    };

    filas.forEach(f => {

      switch (Number(f.Estado)) {

        case 1:
          resumen.pendientes = f.Total;
          break;

        case 2:
          resumen.enReparacion = f.Total;
          break;

        case 3:
          resumen.pendienteRepuesto = f.Total;
          break;

        case 4:
          resumen.reparadas = f.Total;
          break;

        case 5:
          resumen.entregadas = f.Total;
          break;

        case 6:
          resumen.canceladas = f.Total;
          break;

        case 7:
          resumen.sinReparacion = f.Total;
          break;
      }
    });

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
      ok: true,
      resumen
    }));

  } catch (err) {

    console.error(err);

    res.writeHead(500, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
      ok: false,
      mensaje: 'Error cargando resumen.'
    }));
  }

  return true;
}

if (
  req.url === '/api/pantalla-principal/regional-resumen' &&
  req.method === 'GET'
) {

  const usuario = obtenerSesion(req);

  if (!usuario) {

    res.writeHead(401, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
      ok: false,
      mensaje: 'Sesión expirada.'
    }));

    return true;
  }

  try {

    // =========================
    // OBTENER SUCURSALES
    // =========================

    const dbRecursos = await connectionString();

    const departamentos = await dbRecursos.query(`
      SELECT
        IdDepartamento,
        NombreDepartamento
      FROM departamentos
      WHERE IdEncargadoRegional = ?
    `, [usuario.IdPersonal]);

    await dbRecursos.close();

    if (!departamentos.length) {

      res.writeHead(200, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: true,
        filas: []
      }));

      return true;
    }

    // =========================
    // IDS SUCURSALES
    // =========================

    const ids = departamentos.map(d => d.IdDepartamento);

    const placeholders = ids.map(() => '?').join(',');

    // =========================
    // REPARACIONES
    // =========================

    const dbProductos = await connectionStringProductos();

    const filas = await dbProductos.query(`
      SELECT
        IdDepaSucu,
        Estado,
        COUNT(*) AS Total
      FROM reparaciones
      WHERE IdDepaSucu IN (${placeholders})
      GROUP BY IdDepaSucu, Estado
    `, ids);

    await dbProductos.close();

    // =========================
    // MAPEAR NOMBRES
    // =========================

    const mapaDepartamentos = {};

    departamentos.forEach(dep => {
      mapaDepartamentos[dep.IdDepartamento] =
        dep.NombreDepartamento;
    });

    const resultado = filas.map(f => ({
      ...f,
      NombreDepartamento:
        mapaDepartamentos[f.IdDepaSucu] || 'Sucursal'
    }));

    // =========================
    // RESPUESTA
    // =========================

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
      ok: true,
      filas: resultado
    }));

  } catch (err) {

    console.error(err);

    res.writeHead(500, {
      'Content-Type': 'application/json'
    });

    res.end(JSON.stringify({
      ok: false,
      mensaje: 'Error cargando resumen regional.'
    }));
  }

  return true;
} 

// GET /api/pantalla-principal/resumen
  if (
    req.url === '/api/pantalla-principal/resumen' &&
    req.method === 'GET'
  ) {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        resumen: {}
      }));
      return true;
    }

    try {
      const db = await connectionStringProductos();

      const rows = await db.query(`
        SELECT
          SUM(CASE WHEN Estado = 1 THEN 1 ELSE 0 END) AS pendientes,
          SUM(CASE WHEN Estado = 2 THEN 1 ELSE 0 END) AS enReparacion,
          SUM(CASE WHEN Estado = 3 THEN 1 ELSE 0 END) AS pendienteRepuesto,
          SUM(CASE WHEN Estado = 4 THEN 1 ELSE 0 END) AS reparadas,
          SUM(CASE WHEN Estado = 5 THEN 1 ELSE 0 END) AS entregadas,
          SUM(CASE WHEN Estado = 6 THEN 1 ELSE 0 END) AS canceladas,
          SUM(CASE WHEN Estado = 7 THEN 1 ELSE 0 END) AS sinReparacion
        FROM reparaciones
      `);

      await db.close();

      const resumen = rows[0] || {};

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        resumen: {
          pendientes: resumen.pendientes || 0,
          enReparacion: resumen.enReparacion || 0,
          pendienteRepuesto: resumen.pendienteRepuesto || 0,
          reparadas: resumen.reparadas || 0,
          entregadas: resumen.entregadas || 0,
          canceladas: resumen.canceladas || 0,
          sinReparacion: resumen.sinReparacion || 0
        }
      }));

    } catch (err) {
      console.error('Error cargando resumen de PantallaPrincipal:', err.message);

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        resumen: {}
      }));
    }

    return true;
  }

  // POST /api/reparacion/entregar
  if (
    req.url.startsWith('/api/reparacion/entregar') &&
    req.method === 'POST'
  ) {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        mensaje: 'Sesión expirada.'
      }));
      return true;
    }

    try {
      const datos = await leerBodyJSON(req);
      const { IdReparacion, comentario } = datos;

      const comentarioEntrega =
        (comentario || '').trim() || 'Equipo entregado al usuario.';

      const idUsuarioEntrega =
        usuario.IdUsuario || usuario.idusuario || usuario.IdUsuarioGeneral || 0;

      const nombreUsuarioEntrega =
        usuario.nombre || usuario.NombreUsuario || 'Usuario';

      if (!IdReparacion) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          mensaje: 'ID de reparación requerido.'
        }));
        return true;
      }

      const db = await connectionStringProductos();

      const reparaciones = await db.query(`
        SELECT
          IdReparacion,
          Estado,
          IdUsuario
        FROM reparaciones
        WHERE IdReparacion = ?
        LIMIT 1
      `, [IdReparacion]);

      if (reparaciones.length === 0) {
        await db.close();

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          mensaje: 'Reparación no encontrada.'
        }));
        return true;
      }

      const reparacion = reparaciones[0];

      if (Number(reparacion.Estado) !== 4) {
        await db.close();

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          mensaje: 'Solo se pueden entregar reparaciones en estado Reparado.'
        }));
        return true;
      }

      await db.query(`
        UPDATE reparaciones
        SET
          Estado = 5,
          FechaEntrega = NOW(),
          FechaActualizacion = NOW(),
          IdUsuarioEntrega = ?,
          NombreUsuarioEntrega = ?,
          ComentarioEntrega = ?
        WHERE IdReparacion = ?
      `, [
        idUsuarioEntrega,
        nombreUsuarioEntrega,
        comentarioEntrega,
        IdReparacion
      ]);

      await db.query(`
        INSERT INTO reparaciones_historial (
          IdReparacion,
          EstadoAnterior,
          EstadoNuevo,
          IdUsuarioCambio,
          NombreUsuarioCambio,
          Comentario,
          FechaCambio
        )
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        IdReparacion,
        4,
        5,
        usuario.IdUsuario || usuario.idusuario || usuario.IdUsuarioGeneral || 0,
        usuario.nombre || usuario.NombreUsuario || 'Usuario',
        comentario || 'Equipo entregado al usuario.'
      ]);

      await db.close();

      crearNotificacion({
        titulo: 'Equipo entregado',
        mensaje: `Tu reparacion #${IdReparacion} fue marcada como entregada.`,
        tipo: 'estado',
        idDestinatario: reparacion.IdUsuario,
        url: 'misSolicitudes'
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        mensaje: 'Equipo entregado correctamente.'
      }));

    } catch (err) {
      console.error('Error entregando reparación:', err.message);

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        mensaje: 'Error entregando reparación.'
      }));
    }

    return true;
  }

// POST /api/reparacion/cambiar-estado
if (
  req.url.startsWith('/api/reparacion/cambiar-estado') &&
  req.method === 'POST'
) {
  const usuario = obtenerSesion(req);

  if (!usuario) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: false,
      mensaje: 'Sesión expirada.'
    }));
    return true;
  }

  try {
    const datos = await leerBodyJSON(req);

    const IdReparacion = datos.IdReparacion;
    const EstadoNuevo = Number(datos.EstadoNuevo);

    const comentario = (
      datos.comentario ||
      datos.Comentario ||
      datos.observacion ||
      datos.Observacion ||
      datos.motivo ||
      ''
    ).trim();

    const comentarioFinal = comentario || 'Cambio de estado de reparación.';

    if (!IdReparacion || !EstadoNuevo) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        mensaje: 'Datos incompletos.'
      }));
      return true;
    }

    const estadosPermitidos = [2, 3, 4, 6, 7];

    if (!estadosPermitidos.includes(EstadoNuevo)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        mensaje: 'Estado no permitido.'
      }));
      return true;
    }

    const db = await connectionStringProductos();

    const actual = await db.query(`
      SELECT IdReparacion, Estado, IdUsuario
      FROM reparaciones
      WHERE IdReparacion = ?
      LIMIT 1
    `, [IdReparacion]);

    if (actual.length === 0) {
      await db.close();

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        mensaje: 'Reparación no encontrada.'
      }));
      return true;
    }

    const EstadoAnterior = Number(actual[0].Estado);

    if (EstadoAnterior === 5) {
      await db.close();

      res.writeHead(400, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: false,
        mensaje: 'Esta reparación ya fue entregada y no puede modificarse.'
      }));

      return true;
    }

    await db.query(`
      UPDATE reparaciones
      SET
        Estado = ?,
        FechaActualizacion = NOW(),
        FechaFinalizacion = CASE
          WHEN ? IN (4, 6, 7) THEN NOW()
          ELSE FechaFinalizacion
        END
      WHERE IdReparacion = ?
    `, [EstadoNuevo, EstadoNuevo, IdReparacion]);

    await db.query(`
      INSERT INTO reparaciones_historial (
        IdReparacion,
        EstadoAnterior,
        EstadoNuevo,
        IdUsuarioCambio,
        NombreUsuarioCambio,
        Comentario,
        FechaCambio
      )
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      IdReparacion,
      EstadoAnterior,
      EstadoNuevo,
      usuario.IdUsuario || usuario.idusuario || usuario.IdPersonal || 0,
      usuario.nombre || usuario.NombreUsuario || 'Usuario',
      comentarioFinal
    ]);

    await db.query(`
      INSERT INTO reparaciones_comentarios (
        IdReparacion,
        IdUsuario,
        NombreUsuario,
        TipoComentario,
        Comentario,
        FechaHora
      )
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      IdReparacion,
      usuario.IdUsuario || usuario.idusuario || usuario.IdUsuarioGeneral || 0,
      usuario.nombre || usuario.NombreUsuario || 'Usuario',
      2, // Comentario de estado
      comentarioFinal
    ]);

    await db.close();

    crearNotificacion({
      titulo: `Reparacion ${nombreEstado(EstadoNuevo).toLowerCase()}`,
      mensaje: `Tu reparacion #${IdReparacion} cambio a ${nombreEstado(EstadoNuevo)}.`,
      tipo: 'estado',
      idDestinatario: actual[0].IdUsuario,
      url: 'misSolicitudes'
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      mensaje: 'Estado actualizado correctamente.'
    }));

  } catch (err) {
    console.error('Error actualizando estado de reparación:', err.message);

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: false,
      mensaje: 'Error actualizando reparación.'
    }));
  }

  return true;
}

  return false;
};
