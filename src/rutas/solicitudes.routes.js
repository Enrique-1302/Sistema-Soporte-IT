const { connectionString ,connectionStringProductos } = require('../Conexion/conexion');
const { obtenerSesion } = require('../utils/sesiones');
const { esRegional } = require('../utils/permisos');

module.exports = async function solicitudesRoutes(req, res) {

  // GET /api/mis-solicitudes
  if (req.url === '/api/mis-solicitudes' && req.method === 'GET') {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, solicitudes: [] }));
      return true;
    }

    try {
      const db = await connectionStringProductos();

      const idSucursal =
        usuario.IdDepaSucu ||
        usuario.IdSucuDepa;

      let whereSQL = 'r.IdDepaSucu = ?';
      let params = [idSucursal];

      // =========================
      // USUARIO REGIONAL
      // =========================

      if (esRegional(usuario)) {

        const dbRecursos = await connectionString();
        
        const departamentos = await dbRecursos.query(`
         SELECT IdDepartamento
          FROM departamentos
          WHERE IdEncargadoRegional = ?
        `, [usuario.IdPersonal]);

        await dbRecursos.close();

        const ids = departamentos.map(d => d.IdDepartamento);

        if (ids.length > 0) {

          const placeholders = ids.map(() => '?').join(',');

          whereSQL = `
            r.IdDepaSucu IN (${placeholders})
          `;

          params = ids;
        }
      }

      const rows = await db.query(`
        SELECT
          r.IdReparacion,
          r.NombreUsuario,
          r.DepaSucu,
          r.FechahoraReporte,
          r.Estado,
          r.Observaciones,
          r.FechaInicio,
          r.FechaFinalizacion,
          r.FechaActualizacion,
          rd.Upc,
          rd.Descripcion,
          rd.Cantidad,
          rc.Comentario AS UltimoComentario,
          rc.NombreUsuario AS UsuarioComentario,
          rc.FechaHora AS FechaComentario
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
        WHERE ${whereSQL}
        ORDER BY
          r.FechahoraReporte DESC,
          rd.IdDetalleReparacion ASC
      `, params);

      await db.close();

      const mapa = new Map();

      rows.forEach(row => {
        if (!mapa.has(row.IdReparacion)) {
          mapa.set(row.IdReparacion, {
            IdReparacion: row.IdReparacion,
            NombreUsuario: row.NombreUsuario,
            DepaSucu: row.DepaSucu,
            FechahoraReporte: row.FechahoraReporte,
            Estado: row.Estado,
            Observaciones: row.Observaciones,
            FechaInicio: row.FechaInicio,
            FechaFinalizacion: row.FechaFinalizacion,
            FechaActualizacion: row.FechaActualizacion,
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
        solicitudes: [...mapa.values()]
      }));

    } catch (err) {
      console.error('Error cargando mis solicitudes:', err.message);

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        solicitudes: []
      }));
    }

    return true;
  }

  return false;
};