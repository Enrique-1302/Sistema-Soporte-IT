const path = require('path');

const { servirArchivo } = require('../utils/archivos');

module.exports = async function vistasRoutes(req, res) {

  // GET /vista/:nombre
  if (req.url.startsWith('/vista/') && req.method === 'GET') {

    const nombre = req.url.replace('/vista/', '');

    const mapa = {
      equipo: 'Reportar/Equipo.html',
      misSolicitudes: 'Reportar/MisSolicitudes.html',
      cola: 'SoporteTecnico/ColaReparacion.html',
      enProceso: 'SoporteTecnico/ReparacionesProceso.html',
      pendienteRepuesto: 'SoporteTecnico/PendienteRepuesto.html',
      historialReparaciones: 'SoporteTecnico/HistorialReparaciones.html',
      detalleReparacion: 'SoporteTecnico/DetalleReparacion.html'
    };

    const archivo = mapa[nombre];

    if (!archivo) {
      res.writeHead(404);
      res.end('Vista no encontrada');
      return true;
    }

    servirArchivo(
      res,
      path.join(__dirname, '..', 'vistas', archivo)
    );

    return true;
  }

  return false;
};