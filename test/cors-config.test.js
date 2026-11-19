'use strict';

// CS-2026-001: CORS debe limitarse a los orígenes configurados.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { crearCorsOptions, origenesPermitidos } = require('../middlewares/corsConfig');

function permitido(options, origin) {
  let resultado;
  options.origin(origin, (_err, ok) => {
    resultado = ok;
  });
  return resultado;
}

const PROD = { NODE_ENV: 'production', CORS_ORIGIN: 'https://cashsave.vercel.app' };

test('origenesPermitidos parsea listas con comas y espacios', () => {
  assert.deepEqual(origenesPermitidos(' https://a.com , https://b.com '), [
    'https://a.com',
    'https://b.com',
  ]);
  assert.deepEqual(origenesPermitidos(undefined), []);
});

test('producción: permite el origen configurado', () => {
  const opts = crearCorsOptions(PROD);
  assert.equal(permitido(opts, 'https://cashsave.vercel.app'), true);
});

test('producción: bloquea orígenes desconocidos', () => {
  const opts = crearCorsOptions(PROD);
  assert.equal(permitido(opts, 'https://atacante.evil'), false);
  assert.equal(permitido(opts, 'http://localhost:4200'), false);
});

test('producción sin CORS_ORIGIN: bloquea todo origen cruzado', () => {
  const opts = crearCorsOptions({ NODE_ENV: 'production' });
  assert.equal(permitido(opts, 'https://cualquiera.com'), false);
});

test('peticiones sin Origin (curl/health) se permiten', () => {
  const opts = crearCorsOptions(PROD);
  assert.equal(permitido(opts, undefined), true);
});

test('desarrollo: permite localhost para el proxy de ng serve', () => {
  const opts = crearCorsOptions({ NODE_ENV: 'development' });
  assert.equal(permitido(opts, 'http://localhost:4200'), true);
});

test('no usa comodín de credenciales ni cabeceras arbitrarias', () => {
  const opts = crearCorsOptions(PROD);
  assert.equal(opts.credentials, false);
  assert.deepEqual(opts.allowedHeaders, ['Content-Type', 'Authorization']);
});
