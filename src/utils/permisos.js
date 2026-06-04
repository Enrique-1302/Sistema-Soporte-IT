function esSoporte(usuario) {
  const id = Number(
    usuario.Id_PuestoGeneral ||
    usuario.IdPuestoGeneral
  );

  const puestoTexto = (
    usuario.Nombre ||
    usuario.puesto ||
    usuario.puestoGeneral ||
    ''
  ).toUpperCase();

  return (
    //Agregar usuario para modulo de soporte técnico
    [37, 96, 145].includes(id) ||
    puestoTexto.includes('SOPORTE Y MANTENIMIENTO')
  );
}

function esRegional(usuario) {

  const puesto = (
    usuario.puesto ||
    usuario.puestoGeneral ||
    usuario.Nombre ||
    ''
  ).toUpperCase();

  return (
    puesto.includes('REGIONAL')
  );
}

module.exports = {
  esSoporte,
  esRegional
};