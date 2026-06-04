const inputDPI = document.getElementById('dpi');
const mensajeError = document.getElementById('mensajeError');
const formLogin = document.getElementById('formLogin');
const btnLogin = document.getElementById('btnLogin');

inputDPI.addEventListener('input', () => {
  let valor = inputDPI.value.replace(/\D/g, '');

  if (valor.length > 13) {
    valor = valor.slice(0, 13);
  }

  if (valor.length > 9) {
    valor =
      valor.slice(0, 4) + ' ' +
      valor.slice(4, 9) + ' ' +
      valor.slice(9, 13);
  } else if (valor.length > 4) {
    valor =
      valor.slice(0, 4) + ' ' +
      valor.slice(4);
  }

  inputDPI.value = valor;
});

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();

  mensajeError.textContent = '';

  const dpi = inputDPI.value.replace(/\s/g, '');

  if (dpi.length !== 13) {
    mensajeError.textContent = 'El DPI debe tener 13 dígitos.';
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = 'Ingresando...';

  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ dpi })
    });

    if (!response.ok) {
      throw new Error('Error del servidor');
    }

    const data = await response.json();

    if (data.ok) {
      window.location.href = '/principal';
      return;
    }

    mensajeError.textContent =
      data.mensaje || 'DPI no autorizado.';

  } catch (error) {
    console.error(error);

    mensajeError.textContent =
      'Error de conexión. Intenta nuevamente.';
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Ingresar';
  }
});