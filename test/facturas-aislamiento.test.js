'use strict';

// Spec "aislamiento-facturas-cliente-saldo": las consultas por cliente y de saldos
// deben filtrar por usuario y escapar el término de búsqueda.

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Factura = require('../models/Factura');
const facturaController = require('../controllers/facturaController');
const { crearRes, crearMockEstatico } = require('./helpers');

const mock = crearMockEstatico(Factura);

afterEach(() => mock.restaurar());

test('obtenerFacturasPorCliente filtra por usuario y escapa el regex', async () => {
  let filtro = null;
  mock.set('find', (f) => {
    filtro = f;
    return { sort: () => [] };
  });

  const req = { params: { nombre: 'Ana.*' }, usuario: { id: 'usuario-abc' } };
  const res = crearRes();

  await facturaController.obtenerFacturasPorCliente(req, res);

  assert.ok(filtro, 'find() debe llamarse');
  assert.equal(filtro.usuarioId, 'usuario-abc');
  // El `.*` debe tratarse como texto literal, no como patrón
  assert.equal(filtro.cliente.$regex.test('Ana.*'), true);
  assert.equal(filtro.cliente.$regex.test('AnaXGomez'), false);
});

test('obtenerSaldosPendientes filtra por usuario', async () => {
  let filtro = null;
  mock.set('find', (f) => {
    filtro = f;
    return { sort: () => [] };
  });

  const req = { usuario: { id: 'usuario-abc' } };
  const res = crearRes();

  await facturaController.obtenerSaldosPendientes(req, res);

  assert.equal(filtro.usuarioId, 'usuario-abc');
  assert.deepEqual(filtro.saldo, { $gt: 0 });
});

test('obtenerSaldosPendientesPorCliente filtra por usuario, cliente y saldo', async () => {
  let filtro = null;
  mock.set('find', (f) => {
    filtro = f;
    return { sort: () => [] };
  });

  const req = { params: { cliente: 'Juan (hijo)' }, usuario: { id: 'usuario-abc' } };
  const res = crearRes();

  await facturaController.obtenerSaldosPendientesPorCliente(req, res);

  assert.equal(filtro.usuarioId, 'usuario-abc');
  assert.equal(filtro.cliente.$regex.test('Juan (hijo)'), true);
  assert.equal(filtro.cliente.$regex.test('Juan hijo'), false);
  assert.deepEqual(filtro.saldo, { $gt: 0 });
});
