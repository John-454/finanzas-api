'use strict';

// Secreto SOLO para tests (no es un secreto real de producción).
process.env.JWT_SECRET = 'secreto-de-prueba-solo-para-tests';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/authMiddleware');
const { crearRes } = require('./helpers');

test('sin header de autorización → 403 Acceso denegado', () => {
  const req = { headers: {} };
  const res = crearRes();
  let nextLlamado = false;

  authMiddleware(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'Acceso denegado');
  assert.equal(nextLlamado, false);
});

test('token inválido → 401 Token inválido', () => {
  const req = { headers: { authorization: 'Bearer token-basura' } };
  const res = crearRes();
  let nextLlamado = false;

  authMiddleware(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'Token inválido');
  assert.equal(nextLlamado, false);
});

test('token válido → pobla req.usuario y llama next()', () => {
  const token = jwt.sign({ id: 'usuario123', nombre: 'Ana' }, process.env.JWT_SECRET);
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = crearRes();
  let nextLlamado = false;

  authMiddleware(req, res, () => {
    nextLlamado = true;
  });

  assert.equal(nextLlamado, true);
  assert.equal(req.usuario.id, 'usuario123');
  assert.equal(res.statusCode, null);
});
