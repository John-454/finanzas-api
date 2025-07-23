const express = require('express');
const router = express.Router();
const contabilidadController = require('../controllers/contabilidadController');

router.get('/resumen-mensual', contabilidadController.resumenMensual);

module.exports = router;
