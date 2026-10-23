import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generate and download a luxury, certified PDF invoice or POS receipt using jsPDF.
 * @param {Object} sale - Sale object with items, customer, cashier, and financial amounts.
 */
export function createSaleInvoicePdfDoc(sale) {
  if (!sale) return null;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors (RGB)
  const primaryColor = [15, 23, 42]; // Slate 900 #0F172A
  const secondaryColor = [100, 116, 139]; // Slate 500 #64748B
  const accentColor = [37, 99, 235]; // Royal Blue #2563EB
  const lightBg = [248, 250, 252]; // Slate 50 #F8FAFC
  const borderGrey = [226, 232, 240]; // Slate 200 #E2E8F0

  // 1. Clean Minimalist Header (Light Theme)
  // Brand Name
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SUHAIMSOFT PERFUMES', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Flagship Boutique & Luxury Fragrances', 14, 21);

  // Invoice / Receipt Badge on Top Right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text('TAX INVOICE', pageWidth - 14, 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text(sale.invoiceNo || 'INV-ORIGINAL', pageWidth - 14, 21, { align: 'right' });

  // Elegant divider line
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.line(14, 27, pageWidth - 14, 27);

  // 2. Invoice Metadata Block
  const infoY = 38;

  // Left Column: Business & Branch Details
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ISSUED BY:', 14, infoY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('SuhaimSoft Luxury Fragrance Showroom', 14, infoY + 5);
  doc.text('Main Flagship Showroom & Boutique', 14, infoY + 9.5);
  doc.text('GSTIN: 27AABCS1429B1Z8 | FSSAI: 11521018000213', 14, infoY + 14);

  // Middle Column: Customer Details
  const col2X = 90;
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('BILLED TO:', col2X, infoY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  const customerName = sale.customerName || sale.customer?.name || (typeof sale.customer === 'string' ? sale.customer : 'Walk-in Retail Client');
  doc.text(customerName, col2X, infoY + 5);
  const phone = sale.customerPhone || sale.customer?.phone;
  if (phone) {
    doc.text(`Phone: ${phone}`, col2X, infoY + 9.5);
  }
  const email = sale.customerEmail || sale.customer?.email;
  if (email) {
    doc.text(`Email: ${email}`, col2X, infoY + 14);
  }

  // Right Column: Invoice Specs
  const col3X = pageWidth - 14;
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('INVOICE SPECS:', col3X, infoY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  const rawDate = sale.saleDate || sale.date || sale.createdAt;
  const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) : new Date().toLocaleDateString();

  doc.text(`Date: ${formattedDate}`, col3X, infoY + 5, { align: 'right' });
  const paymentMode = sale.payments?.[0]?.method || sale.paymentMethod || 'Cash';
  doc.text(`Payment: ${paymentMode.toUpperCase()}`, col3X, infoY + 9.5, { align: 'right' });
  doc.text(`Status: ${(sale.paymentStatus || sale.status || 'Paid').toUpperCase()}`, col3X, infoY + 14, { align: 'right' });

  // 3. Itemized Products Table
  const tableRows = (sale.items || []).map((item, index) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    const lineTotal = Number(item.lineTotal || (qty * unitPrice));

    return [
      String(index + 1),
      item.name || item.product?.name || 'Luxury Fragrance Perfume',
      item.sku || (item.sizeMl ? `${item.sizeMl}ml ${item.concentration || 'EDP'}` : 'Standard Spec'),
      String(qty),
      `Rs. ${unitPrice.toLocaleString('en-IN')}`,
      `Rs. ${lineTotal.toLocaleString('en-IN')}`,
    ];
  });

  autoTable(doc, {
    startY: infoY + 22,
    head: [['Sl No', 'Fragrance Product', 'SKU / Spec', 'Qty', 'Unit Price', 'Line Total']],
    theme: 'plain',
    headStyles: {
      fillColor: lightBg,
      textColor: primaryColor,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 63 },
      2: { cellWidth: 38 },
      3: { cellWidth: 16, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    styles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 3,
      lineColor: borderGrey,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
  });

  // 4. Financial Totals Section
  const finalY = doc.lastAutoTable.finalY + 6;

  // Left Note Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(14, finalY, 95, 34, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('NOTES & RETURN POLICY', 18, finalY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('1. Returns accepted within 7 days with intact bottle seal.', 18, finalY + 13);
  doc.text('2. Store in a cool, dark environment away from heat.', 18, finalY + 18);
  doc.text('3. This is a computer-verified fiscal invoice.', 18, finalY + 23);
  doc.text(`Cashier / Terminal: ${sale.cashier?.name || 'Point of Sale Station 1'}`, 18, finalY + 28);

  // Compute items breakdown to guard against missing/mismatched properties
  const itemsSum = (sale.items || []).reduce((acc, item) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.unitPrice) || 0;
    return acc + (qty * unitPrice);
  }, 0);

  const grandTotal = Number(
    sale.grandTotal != null
      ? sale.grandTotal
      : sale.totalAmount != null
      ? sale.totalAmount
      : itemsSum
  );

  let discount =
    Number(sale.discountAmount || 0) +
    Number(sale.itemDiscountTotal || 0) +
    Number(sale.cartDiscount || 0) +
    Number(sale.couponDiscount || 0) +
    Number(sale.loyaltyDiscount || 0);

  const tax = Number(sale.taxTotal != null ? sale.taxTotal : sale.taxAmount != null ? sale.taxAmount : 0);

  let subTotal = 0;
  if (sale.subtotal != null && Number(sale.subtotal) > 0) {
    subTotal = Number(sale.subtotal);
  } else if (sale.subTotal != null && Number(sale.subTotal) > 0) {
    subTotal = Number(sale.subTotal);
  } else if (itemsSum > 0) {
    subTotal = itemsSum;
  } else {
    subTotal = grandTotal + discount - tax;
  }

  // If discount was not recorded explicitly, calculate difference between subtotal and grandTotal
  if (discount === 0 && subTotal > (grandTotal - tax)) {
    discount = Math.max(0, subTotal - (grandTotal - tax));
  }

  const paid = Number(sale.paidAmount != null ? sale.paidAmount : grandTotal);
  const change = Number(sale.changeDue != null ? sale.changeDue : (sale.changeAmount || 0));
  const balance = Number(sale.balanceDue != null ? sale.balanceDue : Math.max(0, grandTotal - paid));

  // Right Totals Calculations
  const totalsX = pageWidth - 14;
  const labelX = pageWidth - 65;
  let runningY = finalY + 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Subtotal:', labelX, runningY);
  doc.text(`Rs. ${subTotal.toLocaleString('en-IN')}`, totalsX, runningY, { align: 'right' });

  if (discount > 0) {
    runningY += 5.5;
    doc.setTextColor(225, 29, 72); // Rose
    doc.text('Discount Applied:', labelX, runningY);
    doc.text(`-Rs. ${discount.toLocaleString('en-IN')}`, totalsX, runningY, { align: 'right' });
  }

  if (tax > 0) {
    runningY += 5.5;
    doc.setTextColor(...secondaryColor);
    doc.text('GST / Tax:', labelX, runningY);
    doc.text(`Rs. ${tax.toLocaleString('en-IN')}`, totalsX, runningY, { align: 'right' });
  }

  runningY += 7;
  doc.setFillColor(...lightBg);
  doc.roundedRect(labelX - 3, runningY - 4.5, totalsX - labelX + 6, 9, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text('GRAND TOTAL:', labelX, runningY + 1.5);
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, totalsX, runningY + 1.5, { align: 'right' });

  runningY += 8.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  doc.text('Amount Paid:', labelX, runningY);
  doc.text(`Rs. ${paid.toLocaleString('en-IN')}`, totalsX, runningY, { align: 'right' });

  if (change > 0) {
    runningY += 4.5;
    doc.text('Change Returned:', labelX, runningY);
    doc.text(`Rs. ${change.toLocaleString('en-IN')}`, totalsX, runningY, { align: 'right' });
  } else if (balance > 0) {
    runningY += 4.5;
    doc.setTextColor(225, 29, 72);
    doc.text('Balance Due:', labelX, runningY);
    doc.text(`Rs. ${balance.toLocaleString('en-IN')}`, totalsX, runningY, { align: 'right' });
  }

  // 5. Footer Signature Bar
  const footerY = pageHeight - 12;
  doc.setDrawColor(...borderGrey);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('SuhaimSoft Perfumes ERP System &bull; Certified Fiscal Sales Receipt', 14, footerY);
  doc.text(`Page 1 of 1`, pageWidth - 14, footerY, { align: 'right' });

  return doc;
}

export function generateSaleInvoicePdf(sale) {
  if (!sale) return;
  const doc = createSaleInvoicePdfDoc(sale);
  const filename = `Invoice-${sale.invoiceNo || Date.now()}.pdf`;
  doc.save(filename);
}

export function printSaleInvoicePdf(sale) {
  if (!sale) return;
  const doc = createSaleInvoicePdfDoc(sale);
  doc.autoPrint();
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl, '_blank');
}

/**
 * Returns a Blob URL for embedding the Tax Invoice PDF directly into an in-page Chrome iframe viewer.
 * No external tabs or window redirection required!
 */
export function getSaleInvoicePdfBlobUrl(sale) {
  if (!sale) return null;
  const doc = createSaleInvoicePdfDoc(sale);
  return doc.output('bloburl');
}

/**
 * Generate a clean, modern, luxury minimalist Payment Voucher PDF using jsPDF.
 * Clean A4 layout matching Tax Invoice with zero clunky nested boxes.
 * @param {Object} payment - Payment object containing number, date, party, method, amount.
 */
export function createPaymentVoucherPdfDoc(payment) {
  if (!payment) return null;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Clean Slate & Luxury Palette (matching Tax Invoice)
  const primaryColor = [15, 23, 42]; // #0F172A
  const secondaryColor = [100, 116, 139]; // #64748B
  const borderGrey = [226, 232, 240]; // #E2E8F0
  const lightBg = [248, 250, 252]; // #F8FAFC

  // 1. Clean Minimalist Header (Light Theme)
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SUHAIMSOFT PERFUMES', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('Flagship Boutique & Luxury Fragrance House', 14, 21);

  // Voucher Badge on Top Right
  const isReceipt = payment.direction === 'in';
  const voucherTitle = isReceipt ? 'PAYMENT RECEIPT' : 'PAYMENT VOUCHER';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(voucherTitle, pageWidth - 14, 15, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text(payment.number || 'PAY-VOUCHER', pageWidth - 14, 21, { align: 'right' });

  // Elegant divider line
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.line(14, 27, pageWidth - 14, 27);

  // 2. Metadata Columns (No clunky nested boxes!)
  const infoY = 38;

  // Left Column: Business & Branch Details
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ISSUED BY:', 14, infoY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text('SuhaimSoft Luxury Fragrance Showroom', 14, infoY + 5);
  doc.text('Main Flagship Boutique & Treasury', 14, infoY + 9.5);
  doc.text('GSTIN: 27AABCS1429B1Z8 | Official Fiscal Record', 14, infoY + 14);

  // Middle Column: Party Details
  const col2X = 85;
  const partyType = isReceipt ? 'RECEIVED FROM:' : 'PAID TO (PARTY):';
  const partyName =
    payment.customer?.name ||
    payment.supplier?.name ||
    payment.customerName ||
    payment.supplierName ||
    'Walk-in Retail Client';
  const partyPhone = payment.customer?.phone || payment.supplier?.phone || '';

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(partyType, col2X, infoY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text(partyName, col2X, infoY + 5);
  if (partyPhone) {
    doc.text(`Phone: ${partyPhone}`, col2X, infoY + 9.5);
  } else {
    const kindLabel = payment.kind ? payment.kind.replace('_', ' ').toUpperCase() : (isReceipt ? 'CASH INFLOW' : 'CASH OUTFLOW');
    doc.text(`Purpose: ${kindLabel}`, col2X, infoY + 9.5);
  }
  doc.text(`Accounting: ${isReceipt ? 'Cash Inflow (Credit)' : 'Cash Outflow (Debit)'}`, col2X, infoY + 14);

  // Right Column: Voucher Specs
  const col3X = pageWidth - 14;
  const methodLabel = (payment.method || 'Cash').toUpperCase();
  const rawDate = payment.date || payment.createdAt;
  const formattedDate = rawDate
    ? new Date(rawDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN');

  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('VOUCHER SPECS:', col3X, infoY, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text(`Date: ${formattedDate}`, col3X, infoY + 5, { align: 'right' });
  doc.text(`Mode: ${methodLabel}`, col3X, infoY + 9.5, { align: 'right' });
  doc.text(`Status: ${(payment.status || 'Verified').toUpperCase()}`, col3X, infoY + 14, { align: 'right' });

  // 3. Clean Itemized Details Table
  const amountNumber = Number(payment.amount || 0);
  const amountFormatted = `Rs. ${amountNumber.toLocaleString('en-IN')}`;

  const tableRows = [
    [
      '1',
      isReceipt
        ? 'Customer Account Settlement / Sales Invoice Receipt'
        : 'Vendor Disbursement / Official Supplier Payout',
      methodLabel,
      payment.reference || 'None / Cash',
      amountFormatted,
    ],
  ];

  autoTable(doc, {
    startY: infoY + 22,
    head: [['#', 'Transaction Description / Details', 'Payment Mode', 'Reference / Cheque No', 'Amount Paid']],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: lightBg,
      textColor: primaryColor,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 80 },
      2: { cellWidth: 30 },
      3: { cellWidth: 35 },
      4: { cellWidth: 25, halign: 'right' },
    },
    styles: {
      fontSize: 8,
      textColor: [51, 65, 85],
      cellPadding: 3.5,
      lineColor: borderGrey,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
  });

  // 4. Financial Totals & Narration Section
  const finalY = doc.lastAutoTable.finalY + 8;

  // Left Note Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(14, finalY, 105, 30, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('REMARKS & NARRATION', 18, finalY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text(payment.notes || 'Payment recorded and officially verified.', 18, finalY + 13);
  doc.text(`Payment Mode: ${methodLabel} • Type: ${isReceipt ? 'Cash Inflow' : 'Cash Outflow'}`, 18, finalY + 18);
  doc.text('This voucher is an authorized accounting record of SuhaimSoft Perfumes.', 18, finalY + 23);

  // Right Total Amount Box
  const totalsX = pageWidth - 14;
  const labelX = pageWidth - 65;
  const runningY = finalY + 10;

  doc.setFillColor(...lightBg);
  doc.roundedRect(labelX - 3, runningY - 6, totalsX - labelX + 6, 14, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...primaryColor);
  doc.text('TOTAL AMOUNT:', labelX, runningY + 2.5);
  doc.text(amountFormatted, totalsX, runningY + 2.5, { align: 'right' });

  // 5. Signatures Section
  const sigY = pageHeight - 32;

  // Left: Prepared By
  doc.setDrawColor(...borderGrey);
  doc.setLineWidth(0.3);
  doc.line(18, sigY, 68, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  doc.text('Prepared / Cashier', 43, sigY + 5, { align: 'center' });

  // Right: Receiver / Authorized Signatory
  doc.line(pageWidth - 68, sigY, pageWidth - 18, sigY);
  doc.text('Authorized Signatory', pageWidth - 43, sigY + 5, { align: 'center' });

  // 6. Subtle bottom footer
  const footerY = pageHeight - 12;
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

  doc.setFontSize(7.5);
  doc.setTextColor(...secondaryColor);
  doc.text('SuhaimSoft Perfume ERP • Certified Fiscal Payment Voucher', 14, footerY);
  doc.text('Page 1 of 1', pageWidth - 14, footerY, { align: 'right' });

  return doc;
}

export function generatePaymentVoucherPdf(payment) {
  if (!payment) return;
  const doc = createPaymentVoucherPdfDoc(payment);
  const filename = `Voucher-${payment.number || Date.now()}.pdf`;
  doc.save(filename);
}

export function printPaymentVoucherPdf(payment) {
  if (!payment) return;
  const doc = createPaymentVoucherPdfDoc(payment);
  doc.autoPrint();
  const blobUrl = doc.output('bloburl');
  window.open(blobUrl, '_blank');
}

export function getPaymentVoucherPdfBlobUrl(payment) {
  if (!payment) return null;
  const doc = createPaymentVoucherPdfDoc(payment);
  return doc.output('bloburl');
}

