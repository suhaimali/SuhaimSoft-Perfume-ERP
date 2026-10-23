import PDFDocument from 'pdfkit';
import { BusinessSetting } from '../models/index.js';

export async function generateInvoicePdf(sale, stream) {
  const settings = await BusinessSetting.findOne({ key: 'default' });
  const biz = settings?.business || { name: 'SuhaimSoft Perfumes', phone: '', email: '' };

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  doc.pipe(stream);

  // Header
  doc.fillColor('#1A1A1A').fontSize(20).text(biz.name.toUpperCase(), { align: 'left' });
  doc.fontSize(9).fillColor('#71717A').text(biz.tagline || 'Manage Every Fragrance. Control Every Sale.');
  if (biz.address?.line1) doc.text(`${biz.address.line1}, ${biz.address.city || ''} ${biz.address.state || ''}`);
  if (biz.phone) doc.text(`Phone: ${biz.phone} | Email: ${biz.email || ''}`);
  if (biz.taxId) doc.text(`GSTIN / Tax ID: ${biz.taxId}`);

  doc.moveDown(1);
  doc.strokeColor('#E4E4E7').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(1);

  // Invoice Meta
  const metaY = doc.y;
  doc.fontSize(12).fillColor('#1A1A1A').text(`TAX INVOICE: ${sale.invoiceNo}`, 40, metaY);
  doc.fontSize(9).fillColor('#52525B')
    .text(`Date: ${new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}`, 40, metaY + 18)
    .text(`Payment Status: ${(sale.paymentStatus || 'paid').toUpperCase()}`, 40, metaY + 30);

  doc.fontSize(10).fillColor('#1A1A1A').text('BILL TO:', 340, metaY);
  doc.fontSize(9).fillColor('#52525B')
    .text(sale.customerName || 'Walk-in Customer', 340, metaY + 16)
    .text(`Phone: ${sale.customerPhone || 'N/A'}`, 340, metaY + 28);

  doc.y = metaY + 55;

  // Table Header
  const tableTop = doc.y;
  doc.rect(40, tableTop, 515, 20).fill('#F4F4F5');
  doc.fillColor('#18181B').fontSize(9)
    .text('Item Description', 45, tableTop + 5, { width: 220 })
    .text('Qty', 270, tableTop + 5, { width: 35, align: 'right' })
    .text('Price', 315, tableTop + 5, { width: 55, align: 'right' })
    .text('Disc', 380, tableTop + 5, { width: 45, align: 'right' })
    .text('Tax', 435, tableTop + 5, { width: 45, align: 'right' })
    .text('Total', 490, tableTop + 5, { width: 60, align: 'right' });

  let curY = tableTop + 24;

  for (const item of sale.items) {
    if (curY > 720) {
      doc.addPage();
      curY = 40;
    }

    doc.fillColor('#27272A').fontSize(8)
      .text(item.name, 45, curY, { width: 220 })
      .text(String(item.quantity), 270, curY, { width: 35, align: 'right' })
      .text(`₹${item.unitPrice?.toFixed(2)}`, 315, curY, { width: 55, align: 'right' })
      .text(`₹${(item.discount || 0)?.toFixed(2)}`, 380, curY, { width: 45, align: 'right' })
      .text(`₹${(item.taxAmount || 0)?.toFixed(2)}`, 435, curY, { width: 45, align: 'right' })
      .text(`₹${item.lineTotal?.toFixed(2)}`, 490, curY, { width: 60, align: 'right' });

    curY += 18;
  }

  doc.strokeColor('#E4E4E7').lineWidth(1).moveTo(40, curY).lineTo(555, curY).stroke();
  curY += 10;

  // Summary
  const sumX = 350;
  const valX = 490;
  doc.fontSize(9).fillColor('#52525B')
    .text('Subtotal:', sumX, curY)
    .text(`₹${sale.subtotal?.toFixed(2)}`, valX, curY, { width: 60, align: 'right' });
  curY += 14;

  if (sale.itemDiscountTotal || sale.cartDiscount || sale.couponDiscount || sale.loyaltyDiscount) {
    const totalDisc = (sale.itemDiscountTotal || 0) + (sale.cartDiscount || 0) + (sale.couponDiscount || 0) + (sale.loyaltyDiscount || 0);
    doc.text('Total Discount:', sumX, curY)
      .text(`-₹${totalDisc?.toFixed(2)}`, valX, curY, { width: 60, align: 'right' });
    curY += 14;
  }

  doc.text('Tax (GST):', sumX, curY)
    .text(`₹${sale.taxTotal?.toFixed(2)}`, valX, curY, { width: 60, align: 'right' });
  curY += 14;

  if (sale.roundOff) {
    doc.text('Round Off:', sumX, curY)
      .text(`₹${sale.roundOff?.toFixed(2)}`, valX, curY, { width: 60, align: 'right' });
    curY += 14;
  }

  doc.rect(sumX - 5, curY - 2, 210, 22).fill('#18181B');
  doc.fontSize(11).fillColor('#FFFFFF')
    .text('Grand Total:', sumX + 5, curY + 3)
    .text(`₹${sale.grandTotal?.toFixed(2)}`, valX, curY + 3, { width: 60, align: 'right' });
  curY += 28;

  doc.fontSize(9).fillColor('#52525B')
    .text('Paid Amount:', sumX, curY)
    .text(`₹${sale.paidAmount?.toFixed(2)}`, valX, curY, { width: 60, align: 'right' });
  curY += 14;

  if (sale.balanceDue > 0) {
    doc.fillColor('#DC2626')
      .text('Balance Due:', sumX, curY)
      .text(`₹${sale.balanceDue?.toFixed(2)}`, valX, curY, { width: 60, align: 'right' });
    curY += 14;
  }

  // Footer notes
  doc.fontSize(8).fillColor('#71717A')
    .text(settings?.invoice?.terms || 'Goods once sold can be returned within 7 days in original sealed condition.', 40, 750, { width: 515, align: 'center' })
    .text(settings?.invoice?.footer || 'Thank you for shopping with SuhaimSoft Perfumes!', 40, 765, { width: 515, align: 'center' });

  doc.end();
}
