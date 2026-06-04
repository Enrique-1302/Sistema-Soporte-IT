const crypto = require('crypto');

// Sesiones en memoria: token → datos del usuario
const sesiones = new Map();

function crearSesion(usuario) {
  const token = crypto.randomBytes(32).toString('hex');

  sesiones.set(token, {
  IdPersonal: usuario.IdPersonal,
  IdSucuDepa: usuario.IdSucuDepa,

  nombre: `${usuario.PrimerNombre} ${usuario.PrimerApellido}`,

  departamento: usuario.NombreDepartamento,

  puesto: usuario.Nombre,

  IdPuestoGeneral: usuario.Id_PuestoGeneral,

  dpi: usuario.DPI
});

  return token;
}

function obtenerSesion(req) {
  const cookieHeader = req.headers['cookie'] || '';
  const match = cookieHeader.match(/sesion=([a-f0-9]+)/);

  if (!match) return null;

  return sesiones.get(match[1]) || null;
}

function obtenerTokenSesion(req) {
  const cookieHeader = req.headers['cookie'] || '';
  const match = cookieHeader.match(/sesion=([a-f0-9]+)/);

  return match ? match[1] : null;
}

function cerrarSesion(req) {
  const token = obtenerTokenSesion(req);

  if (token) {
    sesiones.delete(token);
  }
}

module.exports = {
  crearSesion,
  obtenerSesion,
  cerrarSesion
};
