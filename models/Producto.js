const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  precioUnitario: { type: Number, required: true }
});

module.exports = mongoose.model('Producto', productoSchema);
