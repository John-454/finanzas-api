'use strict';

// CS-2026-004: límite de intentos en /api/auth (configuración de los limitadores).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { limiteLogin, limiteRegistro, claveLogin } = require('../middlewares/rateLimit');

test('los limitadores son funciones middleware', () => {
  assert.equal(typeof limiteLogin, 'function');
  assert.equal(typeof limiteRegistro, 'function');
  assert.equal(limiteLogin.length, 3);
  assert.equal(limiteRegistro.length, 3);
});

test('la clave de login combina IP y email normalizado', () => {
  const req = { ip: '1.2.3.4', body: { email: '  Ana@Example.COM ' } };
  assert.equal(claveLogin(req), '1.2.3.4|ana@example.com');
});

test('la clave de login distingue emails en la misma IP', () => {
  const base = { ip: '1.2.3.4' };
  const a = claveLogin({ ...base, body: { email: 'a@x.com' } });
  const b = claveLogin({ ...base, body: { email: 'b@x.com' } });
  assert.notEqual(a, b);
});

test('la clave de login maneja peticiones sin body', () => {
  assert.equal(claveLogin({ ip: '1.2.3.4' }), '1.2.3.4|');
});

test('express-rate-limit está declarado como dependencia', () => {
  const pkg = require('../package.json');
  assert.ok(pkg.dependencies['express-rate-limit']);
});
