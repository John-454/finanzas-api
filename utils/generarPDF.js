const PDFDocument = require('pdfkit');
const fs          = require('fs');
const path        = require('path');
const Empresa     = require('../models/Empresa');

async function generarPDF(factura, callback) {
  // ── Buscar empresa del usuario ──────────────────────────────
  let empresa = null;
  try {
    empresa = await Empresa.findOne({ usuarioId: factura.usuarioId });
  } catch (e) {
    console.error('No se pudo cargar empresa:', e.message);
  }

  const doc          = new PDFDocument({ margin: 50, size: 'A4' });
  const nombreArchivo = `Factura_${factura.cliente.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const rutaPdfs      = path.join(__dirname, '../pdfs');

  if (!fs.existsSync(rutaPdfs)) fs.mkdirSync(rutaPdfs, { recursive: true });

  const ruta   = path.join(rutaPdfs, nombreArchivo);
  const stream = fs.createWriteStream(ruta);
  doc.pipe(stream);

  // ── Colores ─────────────────────────────────────────────────
  const AZUL    = '#1a5276';
  const AZUL_CL = '#2980b9';
  const GRIS    = '#7f8c8d';
  const NEGRO   = '#2c3e50';
  const BLANCO  = '#ffffff';
  const FONDO   = '#f2f3f4';

  const ancho = doc.page.width - 100; // ancho útil

  // ════════════════════════════════════════════════════════════
  // HEADER — Empresa + Logo
  // ════════════════════════════════════════════════════════════
  const headerY = 50;

  // Datos de la empresa (izquierda)
  doc.font('Helvetica-Bold')
     .fontSize(16)
     .fillColor(NEGRO)
     .text(empresa?.nombre || 'Mi Empresa', 50, headerY);

  doc.font('Helvetica')
     .fontSize(10)
     .fillColor(GRIS);

  let yEmpresa = headerY + 22;
  if (empresa?.direccion) {
    doc.text(`Dirección: ${empresa.direccion}`, 50, yEmpresa);
    yEmpresa += 14;
  }
  if (empresa?.ciudad) {
    doc.text(`Ciudad: ${empresa.ciudad}`, 50, yEmpresa);
    yEmpresa += 14;
  }
  if (empresa?.contacto) {
    doc.text(`Contacto: ${empresa.contacto}`, 50, yEmpresa);
    yEmpresa += 14;
  }

  // Logo (derecha)
  if (empresa?.logo) {
    try {
      let logoSource = null;

      // Si es URL (Cloudinary, CDN, etc.)
      if (
        empresa.logo.startsWith('http://') ||
        empresa.logo.startsWith('https://')
      ) {
        const response = await fetch(empresa.logo);

        if (response.ok) {
          logoSource = Buffer.from(await response.arrayBuffer());
        }
      }
      // Si es ruta local
      else {
        const logoPath = path.join(__dirname, '../', empresa.logo);

        if (fs.existsSync(logoPath)) {
          logoSource = logoPath;
        }
      }

      // Dibujar logo si se pudo cargar
      if (logoSource) {
        doc.image(
          logoSource,
          doc.page.width - 150,
          headerY - 10,
          {
            fit: [100, 80],
            align: 'right',
            valign: 'center'
          }
        );
      }
    } catch (e) {
      console.error('Error al cargar logo:', e.message);
    }
  }

  // ── Línea separadora ─────────────────────────────────────────
  const lineaY = Math.max(yEmpresa, headerY + 90) + 10;
  doc.moveTo(50, lineaY).lineTo(doc.page.width - 50, lineaY)
     .strokeColor(AZUL).lineWidth(2).stroke();

  // ════════════════════════════════════════════════════════════
  // TÍTULO FACTURA
  // ════════════════════════════════════════════════════════════
  doc.font('Helvetica-Bold')
     .fontSize(22)
     .fillColor(AZUL)
     .text('Factura de Venta', 50, lineaY + 15, { align: 'center' });

  // ── Datos del cliente y fecha ─────────────────────────────────
  const datosY = lineaY + 55;

  doc.font('Helvetica-Bold').fontSize(11).fillColor(NEGRO)
     .text(`Cliente: `, 50, datosY, { continued: true })
     .font('Helvetica').text(factura.cliente);

  doc.font('Helvetica-Bold').fontSize(11).fillColor(NEGRO)
     .text(`Fecha: `, 50, datosY + 18, { continued: true })
     .font('Helvetica')
     .text(new Date(factura.fecha).toLocaleDateString('es-CO', {
       day: 'numeric', month: 'long', year: 'numeric'
     }));

  // ════════════════════════════════════════════════════════════
  // TABLA DE PRODUCTOS
  // ════════════════════════════════════════════════════════════
  const tablaY = datosY + 50;

  // Anchos de columnas
  const colProducto = ancho * 0.40;
  const colPrecio   = ancho * 0.22;
  const colCantidad = ancho * 0.15;
  const colTotal    = ancho * 0.23;

  // Header de la tabla
  doc.rect(50, tablaY, ancho, 24).fill(AZUL);

  doc.font('Helvetica-Bold').fontSize(10).fillColor(BLANCO);
  doc.text('Producto',    55,             tablaY + 7);
  doc.text('Precio Ud.',  50 + colProducto, tablaY + 7);
  doc.text('Cantidad',    50 + colProducto + colPrecio, tablaY + 7);
  doc.text('Total',       50 + colProducto + colPrecio + colCantidad, tablaY + 7);

  // Filas de productos
  let filaY = tablaY + 24;

  factura.productos.forEach((p, i) => {
    const subtotal = p.cantidad * p.precioUnitario;
    const bgColor  = i % 2 === 0 ? BLANCO : FONDO;

    doc.rect(50, filaY, ancho, 22).fill(bgColor);

    doc.font('Helvetica').fontSize(10).fillColor(NEGRO);
    doc.text(p.nombre,                    55,             filaY + 6, { width: colProducto - 10 });
    doc.text(formatPesos(p.precioUnitario), 50 + colProducto, filaY + 6, { width: colPrecio - 5 });
    doc.text(String(p.cantidad),            50 + colProducto + colPrecio, filaY + 6, { width: colCantidad - 5 });
    doc.text(formatPesos(subtotal),         50 + colProducto + colPrecio + colCantidad, filaY + 6, { width: colTotal - 5 });

    // Línea separadora entre filas
    doc.moveTo(50, filaY + 22)
       .lineTo(50 + ancho, filaY + 22)
       .strokeColor('#dce1e7').lineWidth(0.5).stroke();

    filaY += 22;
  });

  // Borde de la tabla
  doc.rect(50, tablaY, ancho, filaY - tablaY)
     .strokeColor(AZUL_CL).lineWidth(1).stroke();

  // ════════════════════════════════════════════════════════════
  // TOTALES
  // ════════════════════════════════════════════════════════════
  const totalesX = 50 + ancho * 0.55;
  let   totalesY = filaY + 15;
  const totalesW = ancho * 0.45;

  const dibujarFilaTotal = (label, valor, bold = false, color = NEGRO) => {
    if (bold) {
      doc.rect(totalesX - 5, totalesY - 3, totalesW + 5, 20).fill(FONDO);
    }
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(bold ? 11 : 10)
       .fillColor(color)
       .text(label, totalesX, totalesY, { width: totalesW * 0.55 });
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(bold ? 11 : 10)
       .fillColor(color)
       .text(formatPesos(valor), totalesX + totalesW * 0.55, totalesY,
             { width: totalesW * 0.45, align: 'right' });
    totalesY += 20;
  };

  dibujarFilaTotal('Total:', factura.total, true, AZUL);
  if (factura.abono > 0) {
    dibujarFilaTotal('Abono:', factura.abono, false, '#27ae60');
    dibujarFilaTotal('Saldo pendiente:', factura.saldo, true,
      factura.saldo > 0 ? '#e74c3c' : '#27ae60');
  }

  // ════════════════════════════════════════════════════════════
  // HISTORIAL DE ABONOS
  // ════════════════════════════════════════════════════════════
  if (factura.historialAbonos && factura.historialAbonos.length > 0) {
    let histY = totalesY + 25;

    // Verificar si necesita nueva página
    if (histY > doc.page.height - 150) {
      doc.addPage();
      histY = 50;
    }

    doc.font('Helvetica-Bold').fontSize(13).fillColor(NEGRO)
       .text('Historial de Abonos:', 50, histY);

    histY += 20;

    // Header historial
    doc.rect(50, histY, ancho, 22).fill(AZUL);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(BLANCO);
    doc.text('Fecha',       55,         histY + 6);
    doc.text('Monto',       50 + ancho * 0.4, histY + 6);
    doc.text('Medio',       50 + ancho * 0.7, histY + 6);

    histY += 22;

    factura.historialAbonos.forEach((abono, i) => {
      const bg = i % 2 === 0 ? BLANCO : FONDO;
      doc.rect(50, histY, ancho, 20).fill(bg);

      doc.font('Helvetica').fontSize(10).fillColor(NEGRO);
      doc.text(
        new Date(abono.fecha).toLocaleDateString('es-CO'),
        55, histY + 5
      );
      doc.text(
        formatPesos(abono.monto),
        50 + ancho * 0.4, histY + 5
      );
      doc.text(
        abono.tipo?.charAt(0).toUpperCase() + abono.tipo?.slice(1) || '—',
        50 + ancho * 0.7, histY + 5
      );

      doc.moveTo(50, histY + 20)
         .lineTo(50 + ancho, histY + 20)
         .strokeColor('#dce1e7').lineWidth(0.5).stroke();

      histY += 20;
    });

    // Borde historial
    doc.rect(50, histY - factura.historialAbonos.length * 20 - 22, ancho,
             factura.historialAbonos.length * 20 + 22)
       .strokeColor(AZUL_CL).lineWidth(1).stroke();
  }

  // ════════════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════════════
  const footerY = doc.page.height - 75;
  doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY)
     .strokeColor(AZUL).lineWidth(1).stroke();

  doc.font('Helvetica').fontSize(9).fillColor(GRIS)
     .text(
       `Generado el ${new Date().toLocaleDateString('es-CO', {
         day: 'numeric', month: 'long', year: 'numeric'
       })}`,
       50, footerY + 10,
       { align: 'center', width: ancho, lineBreak: false }
     );

  doc.end();

  stream.on('finish', () => callback(ruta, nombreArchivo));
}

// ── Helper: formato pesos colombianos ─────────────────────────
function formatPesos(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(valor || 0);
}

module.exports = generarPDF;