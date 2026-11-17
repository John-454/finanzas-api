'use strict';

// Spec "eliminar-factura-completa": borrar una factura elimina también sus
// movimientos espejo (abonos) y solo la puede borrar su dueño.

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Factura = require('../models/Factura');
const MovimientoNequi = require('../models/MovimientoNequi');
const facturaController = require('../controllers/facturaController');
const { crearRes, crearMockEstatico } = require('./helpers');

const mockFactura = crearMockEstatico(Factura);
const mockMovimiento = crearMockEstatico(MovimientoNequi);

afterEach(() => {
  mockFactura.restaurar();
  mockMovimiento.restaurar();
});

test('eliminarFactura de OTRO usuario → 403 y no borra nada', async () => {
  let borroMovimientos = false;
  let borroFactura = false;

  mockFactura.set('findById', async () => ({
    _id: 'f1',
    usuarioId: { toString: () => 'otro-usuario' },
    deleteOne: async () => {
      borroFactura = true;
    },
  }));
  mockMovimiento.set('deleteMany', async () => {
    borroMovimientos = true;
  });

  const req = { params: { id: 'f1' }, usuario: { id: 'mi-usuario' } };
  const res = crearRes();

  await facturaController.eliminarFactura(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(borroMovimientos, false);
  assert.equal(borroFactura, false);
});

test('eliminarFactura inexistente → 404', async () => {
  mockFactura.set('findById', async () => null);

  const req = { params: { id: 'no-existe' }, usuario: { id: 'mi-usuario' } };
  const res = crearRes();

  await facturaController.eliminarFactura(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'Factura no encontrada.');
});

test('eliminarFactura PROPIA → borra factura y sus movimientos', async () => {
  let filtroMovimientos = null;
  let borroFactura = false;

  mockFactura.set('findById', async () => ({
    _id: 'f1',
    usuarioId: { toString: () => 'mi-usuario' },
    deleteOne: async () => {
      borroFactura = true;
    },
  }));
  mockMovimiento.set('deleteMany', async (filtro) => {
    filtroMovimientos = filtro;
  });

  const req = { params: { id: 'f1' }, usuario: { id: 'mi-usuario' } };
  const res = crearRes();

  await facturaController.eliminarFactura(req, res);

  assert.equal(borroFactura, true);
  assert.deepEqual(filtroMovimientos, { facturaId: 'f1' });
  assert.equal(res.body.mensaje, 'Factura eliminada correctamente');
});
