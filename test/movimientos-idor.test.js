'use strict';

// CS-2026-002: un movimiento manual no puede referenciar facturas o gastos
// existentes (IDOR). Solo el servidor crea esos vínculos.

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const MovimientoNequi = require('../models/MovimientoNequi');
const movimientosController = require('../controllers/movimientosController');
const { crearRes, crearMockEstatico } = require('./helpers');

const mock = crearMockEstatico(MovimientoNequi);

afterEach(() => mock.restaurar());

function req(body) {
  return {
    body: {
      tipo: 'abono',
      monto: 50000,
      metodoPago: 'nequi',
      descripcion: 'Pago cliente',
      ...body,
    },
    usuario: { id: 'mi-usuario' },
  };
}

test('movimiento con facturaId ajeno → 400 y no guarda', async () => {
  const res = crearRes();
  await movimientosController.registrarMovimiento(
    req({ facturaId: '000000000000000000000777' }),
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /facturaId ni gastoId/);
});

test('movimiento con gastoId → 400', async () => {
  const res = crearRes();
  await movimientosController.registrarMovimiento(
    req({ gastoId: '000000000000000000000888' }),
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /facturaId ni gastoId/);
});

test('validaciones de tipo y monto se mantienen', async () => {
  let res = crearRes();
  await movimientosController.registrarMovimiento(req({ tipo: 'otro' }), res);
  assert.equal(res.statusCode, 400);

  res = crearRes();
  await movimientosController.registrarMovimiento(req({ monto: 0 }), res);
  assert.equal(res.statusCode, 400);

  res = crearRes();
  await movimientosController.registrarMovimiento(req({ metodoPago: 'tarjeta' }), res);
  assert.equal(res.statusCode, 400);
});
