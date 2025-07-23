const Factura = require('../models/Factura');

exports.resumenMensual = async (req, res) => {
  try {
    const resumen = await Factura.aggregate([
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
