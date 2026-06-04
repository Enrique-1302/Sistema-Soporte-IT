const http = require('http');
const path = require('path');

const { servirArchivo } = require('./utils/archivos');

const authRoutes = require('./rutas/auth.routes');
const vistasRoutes = require('./rutas/vistas.routes');
const equipoRoutes = require('./rutas/equipo.routes');
const colaRoutes = require('./rutas/cola.routes');
const solicitudesRoutes = require('./rutas/solicitudes.routes');
const reparacionesRoutes = require('./rutas/reparaciones.routes');
const dashboardRoutes = require('./rutas/dashboard.routes');
const notificacionesRoutes = require('./rutas/notificaciones.routes');

const PORT = 3000;

const server = http.createServer(async (req, res) => {

  if (await authRoutes(req, res)) return;
  if (await vistasRoutes(req, res)) return;
  if (await equipoRoutes(req, res)) return;
  if (await colaRoutes(req, res)) return;
  if (await solicitudesRoutes(req, res)) return;
  if (await reparacionesRoutes(req, res)) return;
  if (await dashboardRoutes(req, res)) return;
  if (await notificacionesRoutes(req, res)) return;
  
  // Archivos estáticos
  const filePath = path.join(__dirname, req.url);
  servirArchivo(res, filePath);

});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
