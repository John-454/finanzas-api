const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  precioUnitario: { type: Number, required: true },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  }
});

// Índice compuesto: listado y búsqueda por usuario, ordenando por nombre
productoSchema.index({ usuarioId: 1, nombre: 1 });

module.exports = mongoose.model('Producto', productoSchema);
