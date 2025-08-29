const express = require('express');
const router = express.Router();
const productoController = require('../controllers/productoController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, productoController.obtenerProductos);
router.get('/:id', productoController.obtenerProductoPorId);
router.post('/', authMiddleware, productoController.crearProducto);
router.put('/:id', productoController.actualizarProducto);
router.delete('/:id', productoController.eliminarProducto);
router.get('/buscar/nombre', productoController.buscarPorNombre);

module.exports = router;
