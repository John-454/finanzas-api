const mongoose = require('mongoose');

const gastoDiarioSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    required: true,
    default: Date.now
  },
  descripcion: {
    type: String,
    required: true,
    trim: true
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  categoria: {
    type: String,
    required: false,
    trim: true,
    default: 'General'
  },
  tipo: {
  type: String,
  enum: ['efectivo', 'nequi'],
  required: false,
  default: 'efectivo'
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: false
  }
}, {
  timestamps: true
});

// Índice para búsquedas por fecha
gastoDiarioSchema.index({ fecha: 1 });

// Índice compuesto: filtra por usuario (igualdad) y recorre el rango de fechas.
// Necesario porque todas las consultas del resumen filtran por creadoPor + fecha.
gastoDiarioSchema.index({ creadoPor: 1, fecha: -1 });

module.exports = mongoose.model('GastoDiario', gastoDiarioSchema);