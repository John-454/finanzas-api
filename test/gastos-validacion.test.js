'use strict';

// Validaciones de entrada de agregarGasto (no llega a tocar la base de datos).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const contabilidadController = require('../controllers/contabilidadController');
const { crearRes } = require('./helpers');

test('agregarGasto sin descripción ni monto → 400', async () => {
  const req = { body: {}, usuario: { id: 'usuario-abc' } };
  const res = crearRes();

  await contabilidadController.agregarGasto(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /obligatorios/);
});

test('agregarGasto con monto negativo → 400', async () => {
  const req = {
    body: { descripcion: 'Café', monto: -1000 },
    usuario: { id: 'usuario-abc' },
  };
  const res = crearRes();

  await contabilidadController.agregarGasto(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'El monto debe ser mayor a cero');
});
