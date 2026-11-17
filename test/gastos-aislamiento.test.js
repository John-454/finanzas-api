'use strict';

// Regresión de la spec "aislamiento-gastos-usuario":
// los gastos deben filtrarse por creador y nadie debe poder borrar/editar gastos ajenos.

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const GastoDiario = require('../models/GastoDiario');
const contabilidadController = require('../controllers/contabilidadController');
const { crearRes, crearMockEstatico } = require('./helpers');

const mock = crearMockEstatico(GastoDiario);

afterEach(() => mock.restaurar());

test('eliminar gasto de OTRO usuario → 403 y no se ejecuta el borrado', async () => {
  let borrado = false;
  mock.set('findById', async () => ({
    creadoPor: { toString: () => 'otro-usuario-id' },
    deleteOne: async () => {
      borrado = true;
    },
  }));

  const req = { params: { id: 'id-falso' }, usuario: { id: 'mi-usuario' } };
  const res = crearRes();

  await contabilidadController.eliminarGasto(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'No tienes permiso para eliminar este gasto.');
  assert.equal(borrado, false);
});

test('eliminar gasto inexistente → 404', async () => {
  mock.set('findById', async () => null);

  const req = { params: { id: 'no-existe' }, usuario: { id: 'mi-usuario' } };
  const res = crearRes();

  await contabilidadController.eliminarGasto(req, res);

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.error, 'Gasto no encontrado');
});

test('eliminar gasto PROPIO → se elimina', async () => {
  let borrado = false;
  mock.set('findById', async () => ({
    creadoPor: { toString: () => 'mi-usuario' },
    deleteOne: async () => {
      borrado = true;
    },
  }));

  const req = { params: { id: 'id-mio' }, usuario: { id: 'mi-usuario' } };
  const res = crearRes();

  await contabilidadController.eliminarGasto(req, res);

  assert.equal(borrado, true);
  assert.equal(res.body.mensaje, 'Gasto eliminado exitosamente');
});

test('editar gasto de OTRO usuario → 403 y no se ejecuta la edición', async () => {
  let editado = false;
  mock.set(
    'findById',
    async () => ({ creadoPor: { toString: () => 'otro-usuario-id' } })
  );
  mock.set('findByIdAndUpdate', async () => {
    editado = true;
    return {};
  });

  const req = {
    params: { id: 'id-falso' },
    usuario: { id: 'mi-usuario' },
    body: { monto: 50000 },
  };
  const res = crearRes();

  await contabilidadController.actualizarGasto(req, res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error, 'No tienes permiso para actualizar este gasto.');
  assert.equal(editado, false);
});

test('obtenerGastosDia consulta SIEMPRE con creadoPor del usuario', async () => {
  let filtroRecibido = null;
  mock.set('find', (filtro) => {
    filtroRecibido = filtro;
    return { sort: () => [] };
  });

  const req = { params: { fecha: '2026-11-16' }, usuario: { id: 'usuario-abc' } };
  const res = crearRes();

  await contabilidadController.obtenerGastosDia(req, res);

  assert.ok(filtroRecibido, 'find() debe ser llamado');
  assert.equal(filtroRecibido.creadoPor, 'usuario-abc');
  assert.equal(res.statusCode, null);
  assert.equal(res.body.totalGastos, 0);
});
