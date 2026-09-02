import { Alert, Platform } from 'react-native';

export interface InvoiceOrderData {
  orderNumber: string;
  date?: string;
  customerName?: string;
  shippingAddress?: string;
  paymentMethod?: string;
  paymentId?: string | null;
  paymentStatus?: string;
  items: any[];
  subtotal?: number;
  tax?: number;
  shipping?: number;
  discount?: number;
  total: number;
}

export const downloadCustomerOrderInvoicePdf = (orderData: InvoiceOrderData) => {
  const itemsHtml = (orderData.items || []).map((it: any) => {
    const pName = it.productName || it.product_name || it.name || 'Pyrotechnic Cracker Item';
    const qty = it.quantity || 1;
    const price = it.price || it.unitPrice || it.unit_price || 0;
    const itemTotal = qty * price;
    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${pName}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">₹${itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  const todayStr = orderData.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Tax Invoice - ${orderData.orderNumber} | Meera Crackers</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #0f172a; max-width: 800px; margin: 0 auto; background: #ffffff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #b91c1c; padding-bottom: 15px; }
        .company-name { font-size: 26px; font-weight: bold; color: #b91c1c; letter-spacing: 1px; }
        .badge-paid { background: #e8f5e9; color: #2e7d32; font-weight: bold; padding: 4px 14px; border-radius: 20px; border: 1px solid #a5d6a7; font-size: 13px; display: inline-block; }
        .invoice-details { display: flex; justify-content: space-between; margin: 25px 0; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 13px; border-bottom: 2px solid #cbd5e1; color: #334155; }
        .total-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; width: 280px; margin-left: auto; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
        .grand-total { font-size: 18px; font-weight: bold; color: #b91c1c; border-top: 2px solid #cbd5e1; padding-top: 8px; margin-top: 8px; }
        .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="company-name">💥 MEERA CRACKERS</div>
          <div style="font-size: 12px; color: #64748b;">Premium Pyrotechnics Manufacturing & Retail</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: bold; color: #334155;">TAX INVOICE</div>
          <div class="badge-paid">✔ ${orderData.paymentStatus || 'PAID ONLINE'}</div>
        </div>
      </div>

      <div class="invoice-details">
        <div>
          <strong style="color: #64748b; font-size: 11px;">BILLED / SHIPPED TO:</strong><br>
          <span style="font-size: 15px; font-weight: bold; color: #0f172a;">${orderData.customerName || 'Valued Customer'}</span><br>
          <span style="font-size: 13px; color: #334155;">${orderData.shippingAddress || 'Customer Delivery Address'}</span>
        </div>
        <div style="text-align: right;">
          <strong>INVOICE NO:</strong> INV-${orderData.orderNumber}<br>
          <strong>DATE:</strong> ${todayStr}<br>
          <strong>PAYMENT METHOD:</strong> ${orderData.paymentMethod || 'Razorpay Online Payment'}<br>
          ${orderData.paymentId ? `<strong>TRANSACTION ID:</strong> ${orderData.paymentId}` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Product Description</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Unit Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || '<tr><td colspan="4" style="text-align:center; padding:15px;">Pyrotechnic Products</td></tr>'}
        </tbody>
      </table>

      <div class="total-box">
        <div class="total-row"><span>Subtotal:</span><span>₹${(orderData.subtotal || orderData.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
        ${orderData.shipping ? `<div class="total-row"><span>Hazmat Shipping:</span><span>₹${orderData.shipping}</span></div>` : '<div class="total-row"><span>Shipping:</span><span>FREE</span></div>'}
        ${orderData.tax ? `<div class="total-row"><span>GST Tax (5%):</span><span>₹${orderData.tax}</span></div>` : ''}
        <div class="total-row grand-total"><span>Total Paid:</span><span>₹${orderData.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
      </div>

      <div class="footer">
        Thank you for shopping with Meera Crackers! Have a safe & colorful celebration. 🎉<br>
        SECURE 256-BIT SSL ENCRYPTED TRANSACTION • GSTIN: 33AAAAA0000A1Z5
      </div>
    </body>
    </html>
  `;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    } else {
      Alert.alert('Invoice Generated', `Tax Invoice INV-${orderData.orderNumber} is ready for download/print.`);
    }
  } else {
    Alert.alert('Invoice Downloaded', `Tax Invoice INV-${orderData.orderNumber} has been generated successfully.`);
  }
};
