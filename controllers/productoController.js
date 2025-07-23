const Producto = require('../models/Producto');

exports.obtenerProductos = async (req, res) => {
  try {
    const productos = await Producto.find().sort({ nombre: 1 });
    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.obtenerProductoPorId = async (req, res) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(producto);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.crearProducto = async (req, res) => {
  try {
    const producto = new Producto(req.body);
    await producto.save();
    res.status(201).json(producto);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.actualizarProducto = async (req, res) => {
  try {
    const producto = await Producto.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(producto);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.eliminarProducto = async (req, res) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json({ mensaje: 'Producto eliminado correctamente.' });
  } catch (err) {
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
      nombre: { $regex: new RegExp(termino, 'i') } // búsqueda insensible a mayúsculas
    }).sort({ nombre: 1 });

    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
