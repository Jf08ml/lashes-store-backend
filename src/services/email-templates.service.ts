interface OrderItem {
  name: string;
  image?: string;
  quantity: number;
  totalPrice: number;
  selectedVariant?: {
    selections?: Record<string, string>;
  };
}

interface DeliveryAddress {
  contactName: string;
  address: string;
  neighborhood?: string;
  city: string;
  department?: string;
  indications?: string;
}

interface OrderData {
  orderNumber: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address: {
      street: string;
      city: string;
      state?: string;
    };
  };
  items: OrderItem[];
  total: number;
  deliveryType?: string;
}

function generatePaymentEmailTemplate(orderData: OrderData): string {
  const itemsHtml = `
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
    <thead>
      <tr style="background-color: #f8f9fa;">
        <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Producto</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Imagen</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Variantes</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: center;">Cantidad</th>
        <th style="border: 1px solid #ddd; padding: 12px; text-align: right;">Precio Total</th>
      </tr>
    </thead>
    <tbody>
      ${orderData.items
        .map(
          (item) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 12px;">${item.name}</td>
        <td style="border: 1px solid #ddd; padding: 12px; text-align: center;">
          ${item.image ? 
            `<img src="${item.image}" alt="${item.name}" style="width: 80px; height: auto; border-radius: 4px;">` : 
            '<span style="color: #999;">Sin imagen</span>'
          }
        </td>
        <td style="border: 1px solid #ddd; padding: 12px;">
          ${
            item.selectedVariant?.selections && Object.keys(item.selectedVariant.selections).length > 0
              ? `
          <ul style="padding-left: 16px; margin: 0; list-style-type: none;">
            ${Object.entries(item.selectedVariant.selections)
              .map(([key, value]) => `<li style="margin: 2px 0;"><strong>${key}:</strong> ${value}</li>`)
              .join("")}
          </ul>`
              : '<span style="color: #999;">Sin variantes</span>'
          }
        </td>
        <td style="border: 1px solid #ddd; padding: 12px; text-align: center; font-weight: bold;">${
          item.quantity
        }</td>
        <td style="border: 1px solid #ddd; padding: 12px; text-align: right; font-weight: bold;">
          $${item.totalPrice.toLocaleString('es-CO')}
        </td>
      </tr>
    `
        )
        .join("")}
    </tbody>
  </table>
`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Pedido - Galaxia Glamour</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .container {
            max-width: 650px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ff69b4, #ff1493);
            color: #ffffff;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .order-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
        }
        .order-info h3 {
            margin: 0 0 15px 0;
            color: #333;
        }
        .info-row {
            margin-bottom: 8px;
        }
        .info-label {
            font-weight: bold;
            color: #555;
            display: inline-block;
            min-width: 140px;
        }
        .total-section {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: center;
        }
        .total-amount {
            font-size: 24px;
            font-weight: bold;
            color: #d63384;
        }
        .footer {
            background-color: #343a40;
            color: #ffffff;
            padding: 25px;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
        }
        .contact-info {
            background-color: #e9ecef;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
        }
        .highlight {
            color: #ff1493;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>¡Pedido Confirmado!</h1>
            <p>Gracias por tu compra en Galaxia Glamour</p>
        </div>
        
        <div class="content">
            <div class="order-info">
                <h3>📋 Información del Pedido</h3>
                <div class="info-row">
                    <span class="info-label">Número de Pedido:</span>
                    <span class="highlight">${orderData.orderNumber}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Cliente:</span>
                    ${orderData.customer.name}
                </div>
                ${orderData.customer.email ? `
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    ${orderData.customer.email}
                </div>` : ''}
                ${orderData.customer.phone ? `
                <div class="info-row">
                    <span class="info-label">Teléfono:</span>
                    ${orderData.customer.phone}
                </div>` : ''}
                <div class="info-row">
                    <span class="info-label">Fecha:</span>
                    ${new Date().toLocaleDateString('es-CO', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
            </div>

            <div class="order-info">
                <h3>📍 Dirección de Entrega</h3>
                <p style="margin: 0;">
                    ${orderData.customer.address.street}<br>
                    ${orderData.customer.address.city}, ${orderData.customer.address.state || 'Huila'}<br>
                </p>
                ${orderData.deliveryType ? `
                <div class="info-row" style="margin-top: 10px;">
                    <span class="info-label">Tipo de Entrega:</span>
                    ${orderData.deliveryType}
                </div>` : ''}
            </div>

            <h3>🛍️ Productos Pedidos</h3>
            ${itemsHtml}

            <div class="total-section">
                <p style="margin: 0 0 10px 0; font-size: 18px;">Total a Pagar:</p>
                <div class="total-amount">$${orderData.total.toLocaleString('es-CO')}</div>
            </div>

            <div class="contact-info">
                <h4 style="margin-top: 0; color: #333;">📞 Próximos Pasos</h4>
                <p style="margin-bottom: 10px;">
                    Nos comunicaremos contigo pronto por <strong>WhatsApp</strong> o <strong>llamada</strong> 
                    al número registrado para confirmar tu pedido y coordinar la entrega.
                </p>
                <p style="margin: 0;">
                    <strong>Método de Pago:</strong> Contraentrega (pago al recibir el pedido)
                </p>
            </div>
        </div>

        <div class="footer">
            <p><strong>Galaxia Glamour Store</strong></p>
            <p>Tu belleza, nuestra pasión ✨</p>
            <p style="font-size: 14px; opacity: 0.8;">
                © ${new Date().getFullYear()} - Todos los derechos reservados
            </p>
        </div>
    </div>
</body>
</html>`;
}

export { generatePaymentEmailTemplate };