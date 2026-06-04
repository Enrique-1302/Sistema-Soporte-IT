const path = require('path');

const { servirArchivo } = require('../utils/archivos');
const { connectionString } = require('../Conexion/conexion');
const {
  crearSesion,
  obtenerSesion,
  cerrarSesion
} = require('../utils/sesiones');

module.exports = async function authRoutes(req, res) {

  // GET / o /login → página de login
  if ((req.url === '/' || req.url === '/login') && req.method === 'GET') {
    servirArchivo(res, path.join(__dirname, '..', 'vistas', 'Login.html'));
    return true;
  }

  // POST /login → validar DPI contra la base de datos
  if (req.url === '/login' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const { dpi } = JSON.parse(body);

        //Agregar ID de puesto para ingresar al sistema
        const sql = `
          SELECT
            personal.IdPersonal,
            personal.IdSucuDepa,
            personal.PrimerNombre,
            personal.SegundoNombre,
            personal.TercerNombre,
            personal.PrimerApellido,
            personal.SegundoApellido,
            personal.DPI,
            departamentos.NombreDepartamento,
            Puestos.Nombre,
            Puestos.Id_PuestoGeneral
          FROM
            personal
            INNER JOIN departamentos ON personal.IdSucuDepa = departamentos.IdDepartamento
            INNER JOIN Puestos ON personal.IdPuesto = Puestos.IdPuesto,
            PuestosGenerales
          WHERE
            personal.TipoPersonal = 1 AND
            personal.Estado = 1 AND
            Puestos.Id_PuestoGeneral IN (37, 91, 94, 95, 96, 143, 145, 170)
            AND personal.DPI = ?
        `;

        const db = await connectionString();
        const rows = await db.query(sql, [dpi]);
        await db.close();

        if (rows.length === 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: false,
            mensaje: 'DPI no autorizado o sin acceso al sistema.'
          }));
          return;
        }

        // Crear sesión
        const usuario = rows[0];
        const token = crearSesion(usuario);

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Set-Cookie': `sesion=${token}; HttpOnly; Path=/`
        });

        res.end(JSON.stringify({ ok: true }));

      } catch (err) {
        console.error('Error en login:', err);

        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: false,
          mensaje: 'Error interno del servidor.'
        }));
      }
    });

    return true;
  }

  if (req.url === '/logout' && req.method === 'POST') {
    cerrarSesion(req);

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': 'sesion=; HttpOnly; Path=/; Max-Age=0'
    });

    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  // GET /principal → PantallaPrincipal (requiere sesión)
  if (req.url === '/principal' && req.method === 'GET') {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      res.writeHead(302, { Location: '/login' });
      res.end();
      return true;
    }

    servirArchivo(res, path.join(__dirname, '..', 'vistas', 'PantallaPrincipal.html'));
    return true;
  }

  // GET /sesion → devuelve datos del usuario activo (para usarlos en el frontend)
  if (req.url === '/sesion' && req.method === 'GET') {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false }));
      return true;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, usuario }));
    return true;
  }

  return false;
};
