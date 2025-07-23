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
  historialAbonos: [abonoSchema]
});

module.exports = mongoose.model('Factura', facturaSchema);
