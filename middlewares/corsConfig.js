'use strict';

// CORS restringido al origen configurado en CORS_ORIGIN (lista separada por comas).
// Si la variable no está definida, en producción se rechazan todos los orígenes
// cruzados; en desarrollo local se permite localhost para no bloquear el proxy.

function origenesPermitidos(valor) {
  return String(valor || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function crearCorsOptions(env = process.env) {
  const permitidos = origenesPermitidos(env.CORS_ORIGIN);
  const esProduccion = env.NODE_ENV === 'production';

  return {
    origin(origin, callback) {
      // Peticiones sin Origin (curl, health checks, server-to-server)
      if (!origin) return callback(null, true);

      if (permitidos.includes(origin)) return callback(null, true);

      // En desarrollo se permite cualquier localhost (proxy de ng serve)
      if (!esProduccion && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600,
  };
}

module.exports = { crearCorsOptions, origenesPermitidos };
