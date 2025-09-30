const mongoose = require('mongoose');

const movimientoNequiSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    required: true,
    default: Date.now
  },
  tipo: {
    type: String,
    enum: ['abono', 'gasto'],
    required: true
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  metodoPago: {
    type: String,
    enum: ['efectivo', 'nequi'],
    required: true
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  // Referencia a la factura (si es un abono)
  facturaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Factura',
    required: false
  },
  // Referencia al gasto (si es un gasto)
  gastoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GastoDiario',
    required: false
  },
  cliente: {
    type: String,
    required: false,
    trim: true
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
movimientoNequiSchema.index({ fecha: 1, usuarioId: 1 });
movimientoNequiSchema.index({ metodoPago: 1, usuarioId: 1 });
movimientoNequiSchema.index({ tipo: 1, metodoPago: 1, usuarioId: 1 });

module.exports = mongoose.model('MovimientoNequi', movimientoNequiSchema);