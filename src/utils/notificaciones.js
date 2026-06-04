const fs = require('fs');
const path = require('path');

const archivoNotificaciones = path.join(
  __dirname,
  '..',
  '..',
  'data',
  'notificaciones.json'
);

const presencia = new Map();
let notificaciones = cargarNotificaciones();
let siguienteId = obtenerSiguienteId();

function cargarNotificaciones() {
  try {
    if (!fs.existsSync(archivoNotificaciones)) {
      return [];
    }

    const contenido = fs.readFileSync(archivoNotificaciones, 'utf8');
    return contenido ? JSON.parse(contenido) : [];
  } catch (error) {
    console.error('Error leyendo notificaciones:', error.message);
    return [];
  }
}

function guardarNotificaciones() {
  try {
    fs.mkdirSync(path.dirname(archivoNotificaciones), { recursive: true });
    fs.writeFileSync(
      archivoNotificaciones,
      JSON.stringify(notificaciones, null, 2),
      'utf8'
    );
  } catch (error) {
    console.error('Error guardando notificaciones:', error.message);
  }
}

function obtenerSiguienteId() {
  return notificaciones.reduce(
    (max, notificacion) => Math.max(max, Number(notificacion.id) || 0),
    0
  ) + 1;
}

function obtenerIdUsuario(usuario) {
  return Number(
    usuario?.IdPersonal ||
    usuario?.IdUsuario ||
    usuario?.idusuario ||
    0
  );
}

function obtenerRolUsuario(usuario) {
  const puesto = (
    usuario?.puesto ||
    usuario?.puestoGeneral ||
    usuario?.Nombre ||
    ''
  ).toUpperCase();

  const idPuesto = Number(
    usuario?.IdPuestoGeneral ||
    usuario?.Id_PuestoGeneral ||
    0
  );

  if (
    [37, 96, 145].includes(idPuesto) ||
    puesto.includes('SOPORTE Y MANTENIMIENTO')
  ) {
    return 'soporte';
  }

  if (puesto.includes('REGIONAL')) {
    return 'regional';
  }

  return 'usuario';
}

function registrarPresencia(usuario) {
  const idUsuario = obtenerIdUsuario(usuario);

  if (!idUsuario) {
    return;
  }

  presencia.set(idUsuario, {
    idUsuario,
    rol: obtenerRolUsuario(usuario),
    nombre: usuario.nombre || 'Usuario',
    ultimoPing: Date.now()
  });
}

function limpiarPresencia() {
  const limite = Date.now() - 45000;

  for (const [idUsuario, info] of presencia.entries()) {
    if (info.ultimoPing < limite) {
      presencia.delete(idUsuario);
    }
  }
}

function usuarioEstaEnLinea(idUsuario) {
  limpiarPresencia();

  const info = presencia.get(Number(idUsuario));
  return Boolean(info && info.ultimoPing >= Date.now() - 45000);
}

function obtenerUsuariosEnLineaPorRol(rol) {
  limpiarPresencia();

  return [...presencia.values()]
    .filter(info => info.rol === rol)
    .map(info => info.idUsuario);
}

function destinatarioCoincide(notificacion, usuario) {
  const idUsuario = obtenerIdUsuario(usuario);
  const rol = obtenerRolUsuario(usuario);

  if (notificacion.idDestinatario) {
    return Number(notificacion.idDestinatario) === idUsuario;
  }

  return notificacion.rolDestinatario === rol;
}

function crearNotificacion(datos) {
  const idDestinatario = datos.idDestinatario
    ? Number(datos.idDestinatario)
    : null;

  let toastPara = [];

  if (idDestinatario && usuarioEstaEnLinea(idDestinatario)) {
    toastPara = [idDestinatario];
  } else if (datos.rolDestinatario) {
    toastPara = obtenerUsuariosEnLineaPorRol(datos.rolDestinatario);
  }

  const notificacion = {
    id: siguienteId++,
    titulo: datos.titulo || 'Notificacion',
    mensaje: datos.mensaje || '',
    tipo: datos.tipo || 'info',
    url: datos.url || '',
    idDestinatario,
    rolDestinatario: datos.rolDestinatario || null,
    creadaEn: new Date().toISOString(),
    toastPara,
    mostradaA: [],
    leidaPor: []
  };

  notificaciones.unshift(notificacion);
  notificaciones = notificaciones.slice(0, 500);
  guardarNotificaciones();

  return notificacion;
}

function listarNotificaciones(usuario) {
  return notificaciones
    .filter(notificacion => destinatarioCoincide(notificacion, usuario))
    .map(notificacion => ({
      ...notificacion,
      leida: notificacion.leidaPor.includes(obtenerIdUsuario(usuario))
    }));
}

function obtenerNuevasParaToast(usuario) {
  registrarPresencia(usuario);

  const idUsuario = obtenerIdUsuario(usuario);

  const nuevas = listarNotificaciones(usuario)
    .filter(notificacion => (notificacion.toastPara || []).includes(idUsuario))
    .filter(notificacion => !notificacion.mostradaA.includes(idUsuario))
    .filter(() => usuarioEstaEnLinea(idUsuario));

  nuevas.forEach(notificacion => {
    const original = notificaciones.find(n => n.id === notificacion.id);

    if (original && !original.mostradaA.includes(idUsuario)) {
      original.mostradaA.push(idUsuario);
    }
  });

  if (nuevas.length) {
    guardarNotificaciones();
  }

  return nuevas;
}

function marcarComoLeidas(usuario, ids) {
  const idUsuario = obtenerIdUsuario(usuario);
  const idsSet = new Set((ids || []).map(Number));

  notificaciones.forEach(notificacion => {
    if (!destinatarioCoincide(notificacion, usuario)) {
      return;
    }

    if (idsSet.size && !idsSet.has(Number(notificacion.id))) {
      return;
    }

    if (!notificacion.leidaPor.includes(idUsuario)) {
      notificacion.leidaPor.push(idUsuario);
    }
  });

  guardarNotificaciones();
}

module.exports = {
  crearNotificacion,
  listarNotificaciones,
  marcarComoLeidas,
  obtenerNuevasParaToast,
  registrarPresencia,
  usuarioEstaEnLinea
};
