const { obtenerSesion } = require('../utils/sesiones');
const {
  listarNotificaciones,
  marcarComoLeidas,
  obtenerNuevasParaToast,
  registrarPresencia
} = require('../utils/notificaciones');

function responderJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json'
  });

  res.end(JSON.stringify(data));
}

function leerBodyJSON(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

module.exports = async function notificacionesRoutes(req, res) {
  if (req.url === '/api/notificaciones/ping' && req.method === 'POST') {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      responderJSON(res, 401, { ok: false, mensaje: 'Sesion expirada.' });
      return true;
    }

    registrarPresencia(usuario);
    responderJSON(res, 200, { ok: true });
    return true;
  }

  if (req.url === '/api/notificaciones/nuevas' && req.method === 'GET') {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      responderJSON(res, 401, {
        ok: false,
        notificaciones: []
      });
      return true;
    }

    responderJSON(res, 200, {
      ok: true,
      notificaciones: obtenerNuevasParaToast(usuario)
    });
    return true;
  }

  if (req.url === '/api/notificaciones' && req.method === 'GET') {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      responderJSON(res, 401, {
        ok: false,
        notificaciones: []
      });
      return true;
    }

    responderJSON(res, 200, {
      ok: true,
      notificaciones: listarNotificaciones(usuario)
    });
    return true;
  }

  if (req.url === '/api/notificaciones/leidas' && req.method === 'POST') {
    const usuario = obtenerSesion(req);

    if (!usuario) {
      responderJSON(res, 401, { ok: false, mensaje: 'Sesion expirada.' });
      return true;
    }

    try {
      const datos = await leerBodyJSON(req);
      marcarComoLeidas(usuario, datos.ids || []);
      responderJSON(res, 200, { ok: true });
    } catch (error) {
      responderJSON(res, 400, { ok: false, mensaje: 'JSON invalido.' });
    }

    return true;
  }

  return false;
};
