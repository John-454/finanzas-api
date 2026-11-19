'use strict';

// CS-2026-003/006: los errores internos no deben filtrar detalles al cliente.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mensajeSeguro, esErrorDeValidacion, manejadorErrores } = require('../middlewares/errorHandler');

test('error interno → mensaje genérico', () => {
  const err = new Error('MongoServerError: connection to cluster0.abc.mongodb.net failed');
  assert.equal(esErrorDeValidacion(err), false);
  assert.equal(mensajeSeguro(err), 'Error interno del servidor');
});

test('ValidationError → mensaje del campo, sin detalles internos', () => {
  const err = new Error('Usuario validation failed');
  err.name = 'ValidationError';
  err.errors = { password: { path: 'password' } };

  assert.equal(esErrorDeValidacion(err), true);
  assert.equal(mensajeSeguro(err), 'Dato inválido en el campo password');
});

test('CastError → mensaje del campo', () => {
  const err = new Error('Cast to ObjectId failed');
  err.name = 'CastError';
  err.path = 'facturaId';

  assert.equal(mensajeSeguro(err), 'Valor inválido para el campo facturaId');
});

test('manejadorErrores responde 500 sin stack ni message', () => {
  const res = {
    headersSent: false,
    statusCode: null,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };

  const err = new Error('ConnectionString mongodb+srv://usuario:clave@cluster');
  manejadorErrores(err, { method: 'GET', originalUrl: '/api/x' }, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Error interno del servidor' });
  assert.equal(JSON.stringify(res.body).includes('mongodb+srv'), false);
});

test('manejadorErrores responde 400 en ValidationError', () => {
  const res = {
    headersSent: false,
    statusCode: null,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };

  const err = new Error('validation failed');
  err.name = 'ValidationError';
  err.errors = { nombre: {} };
  manejadorErrores(err, { method: 'POST', originalUrl: '/api/x' }, res, () => {});

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'Dato inválido en el campo nombre');
});
