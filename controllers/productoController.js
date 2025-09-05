const Producto = require('../models/Producto');

exports.obtenerProductos = async (req, res) => {
  try {
    const productos = await Producto.find({ usuarioId: req.usuario.id }).sort({ nombre: 1 });
    res.json(productos);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.obtenerProductoPorId = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(producto);
  } catch (err) {
    console.error('Error al obtener producto por ID:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.crearProducto = async (req, res) => {
  try {
    const {nombre, precioUnitario} = req.body;

    const producto = new Producto({
      nombre,
      precioUnitario,
      usuarioId: req.usuario.id
    });

    await producto.save();
    res.status(201).json(producto);
  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    console.log('Actualizando producto:', req.params.id, 'Usuario:', req.usuario.id);
    
    // Buscamos el producto por ID
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    // Verificamos que el producto pertenezca al usuario logueado
    if (producto.usuarioId.toString() !== req.usuario.id) {
      return res.status(403).json({ error: 'No tienes permiso para actualizar este producto.' });
    }

    // Actualizamos con los datos enviados
    producto.nombre = req.body.nombre || producto.nombre;
    producto.precioUnitario = req.body.precioUnitario || producto.precioUnitario;

    await producto.save();
    console.log('Producto actualizado exitosamente:', producto._id);

    res.json(producto);
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(400).json({ error: err.message });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    console.log('Eliminando producto:', req.params.id, 'Usuario:', req.usuario.id);
    
    // Buscamos el producto por ID
    const producto = await Producto.findById(req.params.id);

    if (!producto) {
      console.log('Producto no encontrado:', req.params.id);
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    // Verificamos que el producto pertenezca al usuario logueado
    if (producto.usuarioId.toString() !== req.usuario.id) {
      console.log('Usuario sin permisos. Producto pertenece a:', producto.usuarioId, 'Usuario actual:', req.usuario.id);
      return res.status(403).json({ error: 'No tienes permiso para eliminar este producto.' });
    }

    await producto.deleteOne();
    console.log('Producto eliminado exitosamente:', req.params.id);

    res.json({ mensaje: 'Producto eliminado correctamente.' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.buscarPorNombre = async (req, res) => {
  try {
    const termino = req.query.nombre;
    if (!termino) {
      return res.status(400).json({ error: 'Debe proporcionar un nombre de búsqueda.' });
    }

    const productos = await Producto.find({
      nombre: { $regex: new RegExp(termino, 'i') }, // búsqueda insensible a mayúsculas
      usuarioId: req.usuario.id // Solo productos del usuario autenticado
    }).sort({ nombre: 1 });

    res.json(productos);
  } catch (err) {
    console.error('Error al buscar productos:', err);
    res.status(500).json({ error: err.message });
  }
};