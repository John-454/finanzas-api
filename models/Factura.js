// /models/Factura.js
const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema({
  nombre: String,
  cantidad: Number,
  precioUnitario: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const abonoSchema = new mongoose.Schema({
  monto: Number,
  tipo: { 
    type: String, 
    enum: ['efectivo', 'nequi'], // Solo acepta estos dos valores
    required: true 
  },
  fecha: { type: Date, default: Date.now }
});

const facturaSchema = new mongoose.Schema({
  cliente: String,
  fecha: { type: Date, default: Date.now },
  productos: [productoSchema],
  total: Number,
  abono: { type: Number, default: 0 },
  saldo: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now
  },
  historialAbonos: [abonoSchema],
  usuarioId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  }
});

module.exports = mongoose.model('Factura', facturaSchema);
