const Factura = require('../models/Factura');
const GastoDiario = require('../models/GastoDiario');
const mongoose = require('mongoose');
const MovimientoNequi = require('../models/MovimientoNequi');

// Agregar un nuevo gasto diario
exports.agregarGasto = async (req, res) => {
  try {
    const { descripcion, monto, categoria, fecha, tipo } = req.body;

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
      // Guardar fecha explícita en UTC
      const [year, month, day] = fecha.split('-').map(Number);
      fechaGasto = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      // Fecha actual en UTC
      const ahora = new Date();
      fechaGasto = new Date(Date.UTC(
        ahora.getUTCFullYear(),
        ahora.getUTCMonth(),
        ahora.getUTCDate(),
        ahora.getUTCHours(),
        ahora.getUTCMinutes(),
        ahora.getUTCSeconds()
      ));
    }

    const nuevoGasto = new GastoDiario({
      descripcion: descripcion.trim(),
      monto: parseFloat(monto),
      categoria: categoria || 'General',
      tipo: tipo || 'efectivo',
      fecha: fechaGasto,
      creadoPor: req.usuario?.id
    });

    await nuevoGasto.save();

    // Registrar movimiento del gasto
    const nuevoMovimiento = new MovimientoNequi({
      fecha: fechaGasto,
      tipo: 'gasto',
      monto: parseFloat(monto),
      metodoPago: tipo || 'efectivo',
      descripcion: descripcion.trim(),
      gastoId: nuevoGasto._id,
      usuarioId: req.usuario?.id
    });

    await nuevoMovimiento.save();

    res.status(201).json({
      mensaje: 'Gasto registrado exitosamente',
      gasto: nuevoGasto
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// 🔧 FUNCIÓN AUXILIAR CORREGIDA - Considera zona horaria UTC-5 (Colombia)
function crearRangoLocalUTC(fechaString, offsetHoras = -5) {
  const [year, month, day] = fechaString.split('-').map(Number);
  
  // Para el día local, necesitamos ajustar el rango UTC
  // Si estamos en UTC-5, el día 29 local va desde:
  // 29 00:00 local = 29 05:00 UTC
  // 29 23:59 local = 30 04:59 UTC
  
  const inicioLocal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const finLocal = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  
  // Ajustar por zona horaria (restar el offset porque UTC-5 significa que UTC está adelantado)
  const inicio = new Date(inicioLocal.getTime() - (offsetHoras * 60 * 60 * 1000));
  const fin = new Date(finLocal.getTime() - (offsetHoras * 60 * 60 * 1000));
  
  return { inicio, fin };
}


// Obtener gastos de un día específico
exports.obtenerGastosDia = async (req, res) => {
  try {
    const { fecha } = req.params;
    
    if (!fecha) {
      return res.status(400).json({ error: 'Fecha es requerida' });
    }

    // 🔧 CORREGIDO: Usar función que considera zona horaria local
    const { inicio: inicioDia, fin: finDia } = crearRangoLocalUTC(fecha);

    console.log('Fecha consulta:', fecha);
    console.log('Inicio día (UTC):', inicioDia.toISOString());
    console.log('Fin día (UTC):', finDia.toISOString());

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
    const { descripcion, monto, categoria, tipo } = req.body;

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
    ...(categoria && { categoria }),
    ...(tipo && { tipo })
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

// 🔧 RESUMEN DIARIO CORREGIDO
exports.resumenDiario = async (req, res) => {
  try {
    const { fecha } = req.params;
    
    if (!fecha) {
      return res.status(400).json({ error: 'Fecha es requerida (formato: YYYY-MM-DD)' });
    }

    // 🔧 CORREGIDO: Usar función que considera zona horaria local
    const { inicio: inicioDia, fin: finDia } = crearRangoLocalUTC(fecha);

    console.log("=== DEBUG resumenDiario ===");
    console.log("Fecha solicitada:", fecha);
    console.log("Rango UTC ajustado:");
    console.log("  Inicio (UTC):", inicioDia.toISOString());
    console.log("  Fin (UTC):", finDia.toISOString());

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
        $project: { cliente: 1, total: 1, fecha: 1, abono: 1, saldo: 1 } 
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

    console.log("Facturas encontradas:", ventasDelDia);

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
    const saldoNetoEfectivo = totalAbonado;

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
        saldoNeto: saldoNeto,
        saldoNetoEfectivo: saldoNetoEfectivo,
        efectivoDisponible: totalAbonado - totalGastos
      }
    };

    res.json(resumen);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔧 RESUMEN POR RANGO CORREGIDO
exports.resumenPorRango = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ 
        error: 'fechaInicio y fechaFin son requeridas (formato: YYYY-MM-DD)' 
      });
    }

    // 🔧 CORREGIDO: Usar función que considera zona horaria local
    const { inicio } = crearRangoLocalUTC(fechaInicio);
    const { fin } = crearRangoLocalUTC(fechaFin);

    console.log("=== DEBUG resumenPorRango ===");
    console.log("Rango solicitado:", fechaInicio, "a", fechaFin);
    console.log("Rango UTC ajustado:", inicio.toISOString(), "a", fin.toISOString());

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
          usuarioId: new mongoose.Types.ObjectId(req.usuario.id)
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

const ResumenMensual = require('../models/ResumenMensual');

// 🔧 CERRAR MES CORREGIDO
exports.cerrarMes = async (req, res) => {
  try {
    const { anio, mes } = req.body;

    if (!anio || !mes) {
      return res.status(400).json({ error: 'anio y mes son requeridos' });
    }

    // 🔧 CORREGIDO: Calcular rango considerando zona horaria
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDiaNum = new Date(anio, mes, 0).getDate();
    const ultimoDia = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`;
    
    const { inicio } = crearRangoLocalUTC(primerDia);
    const { fin } = crearRangoLocalUTC(ultimoDia);

    console.log("=== DEBUG cerrarMes ===");
    console.log("Mes:", anio, mes);
    console.log("Rango UTC:", inicio.toISOString(), "a", fin.toISOString());

    // Ventas
    const ventas = await Factura.aggregate([
      {
        $match: {
          usuarioId: new mongoose.Types.ObjectId(req.usuario.id),
          fecha: { $gte: inicio, $lte: fin }
        }
      },
      {
        $group: {
          _id: null,
          totalVentas: { $sum: "$total" },
          totalAbonos: { $sum: "$abono" },
          saldoPendiente: { $sum: "$saldo" },
          cantidadFacturas: { $sum: 1 }
        }
      }
    ]);

    // Gastos
    const gastos = await GastoDiario.aggregate([
      {
        $match: {
          creadoPor: new mongoose.Types.ObjectId(req.usuario.id),
          fecha: { $gte: inicio, $lte: fin }
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

    const totalVentas = ventas[0]?.totalVentas || 0;
    const totalAbonos = ventas[0]?.totalAbonos || 0;
    const totalGastos = gastos[0]?.totalGastos || 0;
    const saldoNeto = totalAbonos - totalGastos;

    // Guardar
    const resumen = new ResumenMensual({
      usuarioId: req.usuario.id,
      anio,
      mes,
      totalVentas,
      totalAbonos,
      totalGastos,
      saldoNeto
    });

    await resumen.save();

    res.json({ mensaje: "Cierre mensual guardado", resumen });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Listar historial de cierres mensuales guardados
exports.historialMensual = async (req, res) => {
  try {
    const historial = await ResumenMensual.find({
      usuarioId: req.usuario.id
    })
    .sort({ anio: -1, mes: -1 });

    res.json(historial);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔧 RESUMEN MENSUAL POR MES CORREGIDO
exports.resumenMensualPorMes = async (req, res) => {
  try {
    const { anio, mes } = req.params;

    if (!anio || !mes) {
      return res.status(400).json({ error: "anio y mes son requeridos" });
    }

    // 🔧 CORREGIDO: Calcular rango considerando zona horaria
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const ultimoDiaNum = new Date(anio, mes, 0).getDate();
    const ultimoDia = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`;
    
    const { inicio } = crearRangoLocalUTC(primerDia);
    const { fin } = crearRangoLocalUTC(ultimoDia);

    // Ventas
    const ventas = await Factura.aggregate([
      {
        $match: {
          usuarioId: new mongoose.Types.ObjectId(req.usuario.id),
          fecha: { $gte: inicio, $lte: fin }
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

    // Gastos
    const gastos = await GastoDiario.aggregate([
      {
        $match: {
          creadoPor: new mongoose.Types.ObjectId(req.usuario.id),
          fecha: { $gte: inicio, $lte: fin }
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

    const totalVentas = ventas[0]?.totalVentas || 0;
    const totalAbonado = ventas[0]?.totalAbonado || 0;
    const totalGastos = gastos[0]?.totalGastos || 0;
    const saldoNeto = totalAbonado - totalGastos;

    res.json({
      ventas: { total: totalVentas, totalAbonado },
      gastos: { total: totalGastos },
      saldos: { saldoNeto }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};