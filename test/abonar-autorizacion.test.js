'use strict';

// Spec seguimiento: registrar abono debe requerir autenticación y propiedad.
// Cubre el hueco detectado en "aislamiento-facturas-cliente-saldo".

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Factura = require('../models/Factura');
const facturaController = require('../controllers/facturaController');
const { crearRes, crearMockEstatico } = require('./helpers');

const mockFactura = crearMockEstatico(Factura);

afterEach(() => {
  mockFactura.restaurar();
});

function reqAbono(id) {
  return {
    params: { id },
    usuario: { id: 'mi-usuario' },
    body: { abono: 1000, tipo: 'efectivo' },
  };
}

test('registrarAbono sobre factura de OTRO usuario → 403 y no guarda nada', async () => {
  let guardado = false;

  mockFactura.set('findById', async () => ({
    _id: 'f1',
    usuarioId: { toString: () => 'otro-usuario' },
    total: 5000,
    abono: 0,
    saldo: 5000,
    historialAbonos: [],
    cliente: 'Cliente ajeno',
    save: async () => {
      guardado = true;
    },
  }));

  const res = crearRes();
  await facturaController.registrarAbono(reqAbono('f1'), res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'No tienes permiso para abonar a esta factura.');
  assert.equal(guardado, false);
});

test('registrarAbono sobre factura inexistente → 404', async () => {
  mockFactura.set('findById', async () => null);

  const res = crearRes();
  await facturaController.registrarAbono(reqAbono('no-existe'), res);

  assert.equal(res.statusCode, 404);
});

test('registrarAbono sobre factura PROPIA → pasa la verificación de propiedad', async () => {
  const factura = {
    _id: '000000000000000000000999',
    usuarioId: { toString: () => '000000000000000000000001' },
    total: 5000,
    abono: 0,
    saldo: 5000,
    historialAbonos: [],
    cliente: 'Mi cliente',
    save: async () => {},
  };

  mockFactura.set('findById', async () => factura);

  const req = reqAbono('000000000000000000000999');
  req.usuario.id = '000000000000000000000001';
  const res = crearRes();
  let errorRecibido = null;
  await facturaController.registrarAbono(req, res, (e) => {
    errorRecibido = e;
  });

  // La actualización del saldo ocurre antes de guardar el movimiento
  assert.equal(factura.abono, 1000);
  assert.equal(factura.saldo, 4000);
  assert.equal(factura.historialAbonos.length, 1);
  // No debe ser rechazada por permisos
  assert.notEqual(res.statusCode, 403);
  // El error esperado (si lo hay) es de conexión a Mongo, no de autorización
  assert.ok(errorRecibido === null || !/permiso/i.test(errorRecibido.message));
});
