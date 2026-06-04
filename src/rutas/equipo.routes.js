const { connectionString, connectionStringProductos } = require('../Conexion/conexion');
const { obtenerSesion } = require('../utils/sesiones');
const { crearNotificacion } = require('../utils/notificaciones');

module.exports = async function equipoRoutes(req, res) {

  // GET /api/equipo/buscar
  if (req.url.startsWith('/api/equipo/buscar') && req.method === 'GET') {
    const q = new URL(req.url, 'http://localhost').searchParams.get('q') || '';

    try {
      const db = await connectionStringProductos();

      const esUpc = /^[\d-]+$/.test(q.trim());

      let rows;

      if (esUpc) {
        rows = await db.query(`
          SELECT Upc AS upc, DescLarga AS descripcion
          FROM productos_deadstock
          WHERE Activo = 1 AND Upc LIKE ?
          LIMIT 15
        `, [`%${q.trim()}%`]);
      } else {
        const palabras = q.trim().split(/\s+/).filter(Boolean);
        const condiciones = palabras.map(() => 'DescLarga LIKE ?').join(' AND ');
        const params = palabras.map(p => `%${p}%`);

        rows = await db.query(`
          SELECT Upc AS upc, DescLarga AS descripcion
          FROM productos_deadstock
          WHERE Activo = 1 AND ${condiciones}
          LIMIT 15
        `, params);
      }

      await db.close();

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ resultados: rows }));

    } catch (err) {
      console.error('Error búsqueda productos:', err.message);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ resultados: [] }));
    }

    return true;
  }

  // POST /api/equipo/guardar
  if (req.url === '/api/equipo/guardar' && req.method === 'POST') {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        mensaje: 'Sesión expirada.'
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
        const { equipos, observaciones } = JSON.parse(body);

        await db.beginTransaction();

        const idDepaSucu =
          usuario.IdDepaSucu ||
          usuario.IdSucuDepa ||
          null;

        const dbRecursos = await connectionString();

        const sucursal = await dbRecursos.query(`
          SELECT NombreDepartamento
          FROM departamentos
          WHERE IdDepartamento = ?
          LIMIT 1
        `, [idDepaSucu]);

        await dbRecursos.close();

        const nombreSucursal =
          sucursal[0]?.NombreDepartamento ||
          usuario.departamento ||
          'Sucursal';

        const resultHeader = await db.query(`
          INSERT INTO reparaciones
            (
              IdUsuario,
              NombreUsuario,
              IdDepaSucu,
              DepaSucu,
              FechahoraReporte,
              Estado,
              Observaciones
            )
          VALUES (?, ?, ?, ?, NOW(), 1, ?)
        `, [
          usuario.IdPersonal,
          usuario.nombre,
          idDepaSucu,
          nombreSucursal,
          observaciones || ''
        ]);

        const IdReparacion = resultHeader.insertId;

        for (const eq of equipos) {
          await db.query(`
            INSERT INTO reparacionesdetalle
              (IdReparacion, Upc, Descripcion, Cantidad)
            VALUES (?, ?, ?, ?)
          `, [
            IdReparacion,
            eq.upc,
            eq.descripcion,
            eq.cantidad
          ]);
        }

        await db.commit();
        await db.close();

        crearNotificacion({
          titulo: 'Nuevo reporte de equipo',
          mensaje: `${usuario.nombre} creo el reporte #${IdReparacion}.`,
          tipo: 'reporte',
          rolDestinatario: 'soporte',
          url: 'cola'
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          IdReparacion
        }));

      } catch (err) {
        await db.rollback().catch(() => {});
        await db.close().catch(() => {});

        console.error('Error guardando reparación:', err.message);

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          mensaje: 'Error al guardar el reporte.'
        }));
      }
    });

    return true;
  }

  return false;
};
