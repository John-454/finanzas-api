'use strict';

// Middleware central de errores.
// Oculta detalles internos al cliente y deja el detalle completo en el log.
// Los errores de validación de Mongoose (400 esperados) sí exponen un mensaje útil.

function esErrorDeValidacion(err) {
  return err && (err.name === 'ValidationError' || err.name === 'CastError');
}

function mensajeSeguro(err) {
  if (!esErrorDeValidacion(err)) return 'Error interno del servidor';

  if (err.name === 'CastError') return `Valor inválido para el campo ${err.path}`;

  // ValidationError: "nombre: Path `nombre` is required."
  const campo = Object.keys(err.errors || {})[0];
  return campo ? `Dato inválido en el campo ${campo}` : 'Datos inválidos';
}

// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  const status = esErrorDeValidacion(err) ? 400 : (err.status || 500);

  // Log interno completo (queda en la consola de Railway, no en la respuesta)
  console.error(`[${status}] ${req.method} ${req.originalUrl}`, {
    name: err?.name,
    message: err?.message,
    stack: err?.stack,
  });

  if (res.headersSent) return;

  res.status(status).json({ error: mensajeSeguro(err) });
}

module.exports = { manejadorErrores, mensajeSeguro, esErrorDeValidacion };
