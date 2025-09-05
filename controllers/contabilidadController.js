const Factura = require('../models/Factura');
const GastoDiario = require('../models/GastoDiario');
const mongoose = require('mongoose');

// Agregar un nuevo gasto diario
exports.agregarGasto = async (req, res) => {
  try {
    const { descripcion, monto, categoria, fecha } = req.body;

    if (!descripcion || !monto) {
      return res.status(400).json({ 
        error: 'Descripción y monto son campos obligatorios' 
      });
    }

    if (monto <= 0) {
      return res.status(400).json({ 
        error: 'El monto debe ser mayor a cero' 
      });
    }

    // SOLUCIÓN: Crear fecha local sin conversión UTC
    let fechaGasto;
    if (fecha) {
      // Si viene una fecha específica, usarla como fecha local
      const [year, month, day] = fecha.split('-').map(Number);
      fechaGasto = new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar problemas de zona horaria
    } else {
      // Si no viene fecha, usar la fecha actual
      fechaGasto = new Date();
    }

    const nuevoGasto = new GastoDiario({
      descripcion: descripcion.trim(),
      monto: parseFloat(monto),
      categoria: categoria || 'General',
      fecha: fechaGasto,
      creadoPor: req.usuario?.id
    });

    await nuevoGasto.save();
    res.status(201).json({
      mensaje: 'Gasto registrado exitosamente',
      gasto: nuevoGasto
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Función auxiliar para crear fechas locales
function crearFechaLocal(fechaString) {
  const [año, mes, dia] = fechaString.split('-').map(Number);
  return new Date(año, mes - 1, dia); // mes es 0-indexado
}

// Obtener gastos de un día específico
exports.obtenerGastosDia = async (req, res) => {
  try {
    const { fecha } = req.params;
    
    if (!fecha) {
      return res.status(400).json({ error: 'Fecha es requerida' });
    }

    // SOLUCIÓN: Crear fechas locales sin UTC
    const [year, month, day] = fecha.split('-').map(Number);
    const inicioDia = new Date(year, month - 1, day, 0, 0, 0, 0);
    const finDia = new Date(year, month - 1, day, 23, 59, 59, 999);

    console.log('Fecha consulta:', fecha);
    console.log('Inicio día:', inicioDia);
    console.log('Fin día:', finDia);

    const gastos = await GastoDiario.find({
      fecha: {
        $gte: inicioDia,
        $lte: finDia
      }
    }).sort({ fecha: -1 });

    const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0);

    res.json({
      fecha: fecha,
      gastos: gastos,
      totalGastos: totalGastos,
      cantidadGastos: gastos.length
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Eliminar un gasto específico
exports.eliminarGasto = async (req, res) => {
  try {
    const { id } = req.params;

    const gasto = await GastoDiario.findByIdAndDelete(id);
    
    if (!gasto) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    res.json({
      mensaje: 'Gasto eliminado exitosamente',
      gasto: gasto
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Actualizar un gasto existente
exports.actualizarGasto = async (req, res) => {
  try {
    const { id } = req.params;
    const { descripcion, monto, categoria } = req.body;

    if (monto !== undefined && monto <= 0) {
      return res.status(400).json({ 
        error: 'El monto debe ser mayor a cero' 
      });
    }

    const gastoActualizado = await GastoDiario.findByIdAndUpdate(
      id,
      {
        ...(descripcion && { descripcion: descripcion.trim() }),
        ...(monto && { monto: parseFloat(monto) }),
        ...(categoria && { categoria })
      },
      { new: true, runValidators: true }
    );

    if (!gastoActualizado) {
      return res.status(404).json({ error: 'Gasto no encontrado' });
    }

    res.json({
      mensaje: 'Gasto actualizado exitosamente',
      gasto: gastoActualizado
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Resumen diario: ventas, gastos y saldo neto
exports.resumenDiario = async (req, res) => {
  try {
    const { fecha } = req.params;
    
    if (!fecha) {
      return res.status(400).json({ error: 'Fecha es requerida (formato: YYYY-MM-DD)' });
    }

    // SOLUCIÓN: Crear fechas locales
    const [year, month, day] = fecha.split('-').map(Number);
    const inicioDia = new Date(year, month - 1, day, 0, 0, 0, 0);
    const finDia = new Date(year, month - 1, day, 23, 59, 59, 999);

    // Resto del código permanece igual...
    // Obtener ventas del día (facturas)
    const ventasDelDia = await Factura.aggregate([
      {
        $match: {
          fecha: {
            $gte: inicioDia,
            $lte: finDia
          },
          usuarioId: new mongoose.Types.ObjectId(req.usuario.id)
        }
      },
      {
        $group: {
          _id: null,
          totalVentas: { $sum: "$total" },
          totalAbonado: { $sum: "$abono" },
          saldoPendiente: { $sum: "$saldo" },
          cantidadFacturas: { $sum: 1 }
        }
      }
    ]);

    // Obtener gastos del día
    const gastosDelDia = await GastoDiario.aggregate([
      {
        $match: {
          fecha: {
            $gte: inicioDia,
            $lte: finDia
          }
        }
      },
      {
        $group: {
          _id: null,
          totalGastos: { $sum: "$monto" },
          cantidadGastos: { $sum: 1 }
        }
      }
    ]);

    const totalVentas = ventasDelDia.length > 0 ? ventasDelDia[0].totalVentas || 0 : 0;
    const totalAbonado = ventasDelDia.length > 0 ? ventasDelDia[0].totalAbonado || 0 : 0;
    const saldoPendiente = ventasDelDia.length > 0 ? ventasDelDia[0].saldoPendiente || 0 : 0;
    const cantidadFacturas = ventasDelDia.length > 0 ? ventasDelDia[0].cantidadFacturas || 0 : 0;
    
    const totalGastos = gastosDelDia.length > 0 ? gastosDelDia[0].totalGastos || 0 : 0;
    const cantidadGastos = gastosDelDia.length > 0 ? gastosDelDia[0].cantidadGastos || 0 : 0;

    // Calcular saldo neto (ventas - gastos)
    const saldoNeto = totalAbonado - totalGastos;
    const saldoNetoEfectivo = totalAbonado ; // Saldo real en efectivo

    const resumen = {
      fecha: fecha,
      ventas: {
        total: totalVentas,
        totalAbonado: totalAbonado,
        saldoPendiente: saldoPendiente,
        cantidadFacturas: cantidadFacturas
      },
      gastos: {
        total: totalGastos,
        cantidadGastos: cantidadGastos
      },
      saldos: {
        saldoNeto: saldoNeto, // Ventas totales - gastos
        saldoNetoEfectivo: saldoNetoEfectivo, // Dinero cobrado - gastos
        efectivoDisponible: totalAbonado - totalGastos
      }
    };

    res.json(resumen);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Resumen de varios días (rango de fechas)
exports.resumenPorRango = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ 
        error: 'fechaInicio y fechaFin son requeridas (formato: YYYY-MM-DD)' 
      });
    }

    const inicio = new Date(fechaInicio);
    inicio.setHours(0, 0, 0, 0);
    
    const fin = new Date(fechaFin);
    fin.setHours(23, 59, 59, 999);

    // Aggregate ventas por día
    const ventasPorDia = await Factura.aggregate([
      {
        $match: {
          fecha: { $gte: inicio, $lte: fin },
          usuarioId: new mongoose.Types.ObjectId(req.usuario.id)
        }
      },
      {
        $group: {
          _id: {
            año: { $year: "$fecha" },
            mes: { $month: "$fecha" },
            dia: { $dayOfMonth: "$fecha" }
          },
          totalVentas: { $sum: "$total" },
          totalAbonado: { $sum: "$abono" },
          cantidadFacturas: { $sum: 1 }
        }
      },
      {
        $project: {
          fecha: {
            $dateFromParts: {
              year: "$_id.año",
              month: "$_id.mes",
              day: "$_id.dia"
            }
          },
          totalVentas: 1,
          totalAbonado: 1,
          cantidadFacturas: 1,
          _id: 0
        }
      }
    ]);

    // Aggregate gastos por día
    const gastosPorDia = await GastoDiario.aggregate([
      {
        $match: {
          fecha: { $gte: inicio, $lte: fin }
        }
      },
      {
        $group: {
          _id: {
            año: { $year: "$fecha" },
            mes: { $month: "$fecha" },
            dia: { $dayOfMonth: "$fecha" }
          },
          totalGastos: { $sum: "$monto" },
          cantidadGastos: { $sum: 1 }
        }
      },
      {
        $project: {
          fecha: {
            $dateFromParts: {
              year: "$_id.año",
              month: "$_id.mes",
              day: "$_id.dia"
            }
          },
          totalGastos: 1,
          cantidadGastos: 1,
          _id: 0
        }
      }
    ]);

    // Combinar datos por fecha
    const resumenPorDia = [];
    const fechasMap = new Map();

    // Agregar ventas
    ventasPorDia.forEach(venta => {
      const fechaStr = venta.fecha.toISOString().split('T')[0];
      fechasMap.set(fechaStr, {
        fecha: fechaStr,
        totalVentas: venta.totalVentas,
        totalAbonado: venta.totalAbonado,
        cantidadFacturas: venta.cantidadFacturas,
        totalGastos: 0,
        cantidadGastos: 0
      });
    });

    // Agregar gastos
    gastosPorDia.forEach(gasto => {
      const fechaStr = gasto.fecha.toISOString().split('T')[0];
      if (fechasMap.has(fechaStr)) {
        fechasMap.get(fechaStr).totalGastos = gasto.totalGastos;
        fechasMap.get(fechaStr).cantidadGastos = gasto.cantidadGastos;
      } else {
        fechasMap.set(fechaStr, {
          fecha: fechaStr,
          totalVentas: 0,
          totalAbonado: 0,
          cantidadFacturas: 0,
          totalGastos: gasto.totalGastos,
          cantidadGastos: gasto.cantidadGastos
        });
      }
    });

    // Convertir a array y calcular saldos
    fechasMap.forEach(dia => {
      dia.saldoNeto = dia.totalAbonado - dia.totalGastos;
      dia.saldoNetoEfectivo = dia.totalAbonado - dia.totalGastos;
      resumenPorDia.push(dia);
    });

    // Ordenar por fecha
    resumenPorDia.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    res.json({
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      resumenPorDia: resumenPorDia,
      totales: {
        totalVentas: resumenPorDia.reduce((sum, dia) => sum + dia.totalVentas, 0),
        totalAbonado: resumenPorDia.reduce((sum, dia) => sum + dia.totalAbonado, 0),
        totalGastos: resumenPorDia.reduce((sum, dia) => sum + dia.totalGastos, 0),
        saldoNetoTotal: resumenPorDia.reduce((sum, dia) => sum + dia.saldoNeto, 0)
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Mantener el método original para compatibilidad
exports.resumenMensual = async (req, res) => {
  try {
    const resumen = await Factura.aggregate([
      {
    $match: {
      usuarioId: new mongoose.Types.ObjectId(req.usuario.id) // ✅ AGREGAR ESTO
    }
  },
      {
        $group: {
          _id: {
            año: { $year: "$fecha" },
            mes: { $month: "$fecha" }
          },
          totalVentas: { $sum: "$total" },
          totalAbonado: { $sum: "$abono" },
          saldoPendiente: { $sum: "$saldo" }
        }
      },
      {
        $project: {
          _id: 0,
          mes: {
            $concat: [
              { $toString: "$_id.año" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.mes", 10] },
                  { $concat: ["0", { $toString: "$_id.mes" }] },
                  { $toString: "$_id.mes" }
                ]
              }
            ]
          },
          totalVentas: 1,
          totalAbonado: 1,
          saldoPendiente: 1
        }
      },
      { $sort: { mes: -1 } }
    ]);

    res.json(resumen);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};