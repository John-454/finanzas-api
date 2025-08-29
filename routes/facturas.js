const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, facturaController.crearFactura);
router.get('/', authMiddleware, facturaController.obtenerFacturas);
router.patch('/:id/abonar', facturaController.registrarAbono);
router.get('/cliente/:nombre', facturaController.obtenerFacturasPorCliente);
router.get('/saldos-pendientes', facturaController.obtenerSaldosPendientes);
router.get('/saldos-pendientes/:cliente', facturaController.obtenerSaldosPendientesPorCliente);
router.put('/facturas/:id/abono', facturaController.registrarAbono);

module.exports = router;
