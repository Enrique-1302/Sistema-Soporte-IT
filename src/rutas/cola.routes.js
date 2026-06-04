const { connectionStringProductos } = require('../Conexion/conexion');
const { obtenerSesion } = require('../utils/sesiones');
const { esSoporte } = require('../utils/permisos');
const { crearNotificacion } = require('../utils/notificaciones');

module.exports = async function colaRoutes(req, res) {

  // GET /api/cola/listar
  if (req.url === '/api/cola/listar' && req.method === 'GET') {

    try {

      const db = await connectionStringProductos();

      const rows = await db.query(`
        SELECT
          r.IdReparacion,
          r.NombreUsuario,
          r.DepaSucu,
          r.FechahoraReporte,
          r.Observaciones,
          rd.Upc,
          rd.Descripcion,
          rd.Cantidad
        FROM reparaciones r
        INNER JOIN reparacionesdetalle rd
          ON r.IdReparacion = rd.IdReparacion
        WHERE r.Estado = 1
        ORDER BY
          r.FechahoraReporte ASC,
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
            Observaciones: row.Observaciones,
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
        reparaciones: [...mapa.values()]
      }));

    } catch (err) {

      console.error('Error listando cola:', err.message);

      res.writeHead(500, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        reparaciones: []
      }));

    }

    return true;
  }

  // POST /api/cola/iniciar
  if (req.url === '/api/cola/iniciar' && req.method === 'POST') {

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

    if (!esSoporte(usuario)) {

      res.writeHead(403, {
        'Content-Type': 'application/json'
      });

      res.end(JSON.stringify({
        ok: false,
        mensaje: 'No tienes permiso para iniciar reparaciones.'
      }));

      return true;
    }

    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {

      const db = await connectionStringProductos();

      try {

        const { IdReparacion } = JSON.parse(body);

        if (!IdReparacion) {

          await db.close();

          res.writeHead(400, {
            'Content-Type': 'application/json'
          });

          res.end(JSON.stringify({
            ok: false,
            mensaje: 'ID de reparación inválido.'
          }));

          return;
        }

        await db.beginTransaction();

        const reparacion = await db.query(`
          SELECT Estado, IdUsuario
          FROM reparaciones
          WHERE IdReparacion = ?
          LIMIT 1
        `, [IdReparacion]);

        if (reparacion.length === 0) {

          await db.rollback();
          await db.close();

          res.writeHead(404, {
            'Content-Type': 'application/json'
          });

          res.end(JSON.stringify({
            ok: false,
            mensaje: 'La reparación no existe.'
          }));

          return;
        }

        const estadoActual = Number(reparacion[0].Estado);

        if (estadoActual !== 1) {

          await db.rollback();
          await db.close();

          res.writeHead(200, {
            'Content-Type': 'application/json'
          });

          res.end(JSON.stringify({
            ok: false,
            mensaje: 'Esta reparación ya fue iniciada.'
          }));

          return;
        }

        await db.query(`
          UPDATE reparaciones
          SET
            Estado = 2,
            IdTecnicoAsignado = ?,
            FechaInicio = NOW(),
            FechaActualizacion = NOW()
          WHERE IdReparacion = ?
            AND Estado = 1
        `, [
          usuario.IdPersonal,
          IdReparacion
        ]);

        await db.query(`
          INSERT INTO reparaciones_historial
          (
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
          1,
          2,
          usuario.IdPersonal,
          usuario.nombre,
          'Reparación iniciada'
        ]);

        await db.commit();
        await db.close();

        crearNotificacion({
          titulo: 'Reparacion iniciada',
          mensaje: `Soporte inicio tu reparacion #${IdReparacion}.`,
          tipo: 'estado',
          idDestinatario: reparacion[0].IdUsuario,
          url: 'misSolicitudes'
        });

        res.writeHead(200, {
          'Content-Type': 'application/json'
        });

        res.end(JSON.stringify({
          ok: true,
          mensaje: 'Reparación iniciada correctamente.'
        }));

      } catch (err) {

        await db.rollback().catch(() => {});
        await db.close().catch(() => {});

        console.error('Error iniciando reparación:', err.message);

        res.writeHead(500, {
          'Content-Type': 'application/json'
        });

        res.end(JSON.stringify({
          ok: false,
          mensaje: 'Error al iniciar la reparación.'
        }));

      }

    });

    return true;
  }

  return false;
};
