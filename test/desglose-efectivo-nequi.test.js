'use strict';

// Spec "desglose-efectivo-nequi": el resumen mensual separa efectivo y Nequi
// y la suma de ambos debe cuadrar con el total.

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const Factura = require('../models/Factura');
const GastoDiario = require('../models/GastoDiario');
const contabilidadController = require('../controllers/contabilidadController');
const { crearRes, crearMockEstatico } = require('./helpers');

const mockFactura = crearMockEstatico(Factura);
const mockGasto = crearMockEstatico(GastoDiario);

afterEach(() => {
  mockFactura.restaurar();
  mockGasto.restaurar();
});

test('resumenMensualPorMes devuelve desglose efectivo/nequi cuadrado', async () => {
  // 1ª agregación Factura = totales; 2ª = abonos desglosados
  let llamadaFactura = 0;
  mockFactura.set('aggregate', async () => {
    llamadaFactura++;
    if (llamadaFactura === 1) {
      return [{ totalVentas: 1000000, totalAbonado: 600000, saldoPendiente: 400000 }];
    }
    return [
      { _id: 'efectivo', total: 400000 },
      { _id: 'nequi', total: 200000 },
    ];
  });

  mockGasto.set('aggregate', async () => [
    { _id: 'efectivo', total: 50000 },
    { _id: 'nequi', total: 30000 },
  ]);

  const req = { params: { anio: '2026', mes: '11' }, usuario: { id: '507f1f77bcf86cd799439011' } };
  const res = crearRes();

  await contabilidadController.resumenMensualPorMes(req, res);

  const body = res.body;
  assert.equal(body.ventas.totalAbonadoEfectivo + body.ventas.totalAbonadoNequi, body.ventas.totalAbonado);
  assert.equal(body.gastos.totalGastosEfectivo + body.gastos.totalGastosNequi, body.gastos.total);
  assert.equal(body.ventas.totalAbonadoEfectivo, 400000);
  assert.equal(body.ventas.totalAbonadoNequi, 200000);
  assert.equal(body.gastos.total, 80000);
  assert.equal(body.saldos.efectivoDisponible, 350000);
  assert.equal(body.saldos.nequiDisponible, 170000);
  // Campos existentes intactos
  assert.equal(body.ventas.total, 1000000);
  assert.equal(body.saldos.saldoNeto, 520000);
});

test('resumenMensualPorMes sin movimientos → todo en 0 y sin errores', async () => {
  mockFactura.set('aggregate', async () => []);
  mockGasto.set('aggregate', async () => []);

  const req = { params: { anio: '2026', mes: '01' }, usuario: { id: '507f1f77bcf86cd799439011' } };
  const res = crearRes();

  await contabilidadController.resumenMensualPorMes(req, res);

  assert.equal(res.body.ventas.total, 0);
  assert.equal(res.body.gastos.total, 0);
  assert.equal(res.body.saldos.efectivoDisponible, 0);
  assert.equal(res.body.saldos.nequiDisponible, 0);
});
