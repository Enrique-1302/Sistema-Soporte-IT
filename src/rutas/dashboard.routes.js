const { connectionStringProductos } = require('../Conexion/conexion');
const { obtenerSesion } = require('../utils/sesiones');

module.exports = async function dashboardRoutes(req, res) {

  if (req.url === '/api/dashboard/resumen' && req.method === 'GET') {
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
      const db = await connectionStringProductos();

      const estados = await db.query(`
        SELECT Estado, COUNT(*) AS total
        FROM reparaciones
        GROUP BY Estado
      `);

      const reparadasHoy = await db.query(`
        SELECT COUNT(*) AS total
        FROM reparaciones
        WHERE Estado = 4
          AND DATE(FechaFinalizacion) = CURDATE()
      `);

      const entregadasHoy = await db.query(`
        SELECT COUNT(*) AS total
        FROM reparaciones
        WHERE Estado = 5
          AND DATE(FechaEntrega) = CURDATE()
      `);

      const totalMes = await db.query(`
        SELECT COUNT(*) AS total
        FROM reparaciones
        WHERE MONTH(FechahoraReporte) = MONTH(CURDATE())
          AND YEAR(FechahoraReporte) = YEAR(CURDATE())
      `);

      await db.close();

      const resumen = {
        pendientes: 0,
        enProceso: 0,
        pendienteRepuesto: 0,
        reparadas: 0,
        entregadas: 0,
        canceladas: 0,
        sinReparacion: 0,
        reparadasHoy: reparadasHoy[0].total,
        entregadasHoy: entregadasHoy[0].total,
        totalMes: totalMes[0].total
      };

      estados.forEach(row => {
        const estado = Number(row.Estado);
        const total = Number(row.total);

        if (estado === 1) resumen.pendientes = total;
        if (estado === 2) resumen.enProceso = total;
        if (estado === 3) resumen.pendienteRepuesto = total;
        if (estado === 4) resumen.reparadas = total;
        if (estado === 5) resumen.entregadas = total;
        if (estado === 6) resumen.canceladas = total;
        if (estado === 7) resumen.sinReparacion = total;
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        resumen
      }));

    } catch (err) {
      console.error('Error cargando dashboard:', err.message);

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: false,
        mensaje: 'Error cargando dashboard.'
      }));
    }

    return true;
  }

  return false;
};