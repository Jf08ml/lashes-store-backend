interface OrderItem {
  name: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  regularPrice?: number;
  hasDiscount?: boolean;
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
  subtotal: number;
  discountAmount?: number;
  shippingCost?: number;
  total: number;
  deliveryType?: string;
}

function generatePaymentEmailTemplate(orderData: OrderData): string {
  const itemsHtml = orderData.items
    .map(
      (item, index) => `
    <div style="background: ${index % 2 === 0 ? '#fafafa' : '#fff'}; padding: 20px; border-bottom: 2px solid #e0e0e0; border-radius: 8px; margin-bottom: 12px;">
      <div style="display: table; width: 100%; border-collapse: collapse;">
        <!-- Fila 1: Imagen y nombre -->
        <div style="display: table-row;">
          <div style="display: table-cell; vertical-align: top; width: 80px; padding-right: 16px;">
            ${item.image ? 
              `<img src="${item.image}" alt="${item.name}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: block;">` : 
              '<div style="width: 70px; height: 70px; background: linear-gradient(135deg, #e0e0e0, #f5f5f5); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 10px; text-align: center;">Sin imagen</div>'
            }
          </div>
          <div style="display: table-cell; vertical-align: top;">
            <div style="font-size: 15px; font-weight: 600; color: #000; margin-bottom: 8px;">${item.name}</div>
            ${item.hasDiscount ? '<div style="margin-bottom: 8px;"><span style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #000; padding: 5px 10px; border-radius: 5px; font-size: 11px; font-weight: 700; display: inline-block;">⭐ PRECIO MAYORISTA</span></div>' : ''}
            
            ${
              item.selectedVariant?.selections && Object.keys(item.selectedVariant.selections).length > 0
                ? `
            <div style="margin-bottom: 12px;">
              ${Object.entries(item.selectedVariant.selections)
                .map(([key, value]) => `
                  <div style="background: #fff; border: 1px solid #ddd; padding: 6px 10px; border-radius: 5px; font-size: 12px; display: inline-block; margin-right: 6px; margin-bottom: 6px;">
                    <strong style="color: #000;">${key}:</strong> <span style="color: #555;">${value}</span>
                  </div>
                `)
                .join("")}
            </div>`
                : ''
            }
            
            <div style="display: table; width: 100%; margin-top: 12px;">
              <div style="display: table-row;">
                <div style="display: table-cell; padding: 8px 12px; background: #f5f5f5; border-radius: 6px; margin-right: 8px; width: 100px;">
                  <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Cantidad</div>
                  <div style="font-size: 18px; font-weight: 700; color: #000;">${item.quantity}</div>
                </div>
                <div style="display: table-cell; padding: 8px 12px; background: ${item.hasDiscount ? '#e8f5e9' : '#f5f5f5'}; border-radius: 6px; text-align: right; width: auto;">
                  ${item.hasDiscount ? `
                    <div style="font-size: 11px; color: #999; text-decoration: line-through; margin-bottom: 2px;">$${(item.regularPrice! * item.quantity).toLocaleString('es-CO')}</div>
                    <div style="font-size: 18px; font-weight: 700; color: #4caf50; margin-bottom: 2px;">$${item.totalPrice.toLocaleString('es-CO')}</div>
                    <div style="font-size: 10px; color: #2e7d32; font-weight: 600;">Ahorras $${((item.regularPrice! - item.unitPrice) * item.quantity).toLocaleString('es-CO')}</div>
                  ` : `
                    <div style="font-size: 11px; color: #666; margin-bottom: 2px;">Total</div>
                    <div style="font-size: 18px; font-weight: 700; color: #000;">$${item.totalPrice.toLocaleString('es-CO')}</div>
                  `}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmación de Pedido - Galaxia Glamour</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        
        <!-- Header con gradiente negro -->
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #000 100%); padding: 30px 20px; text-align: center; position: relative;">
            <div style="margin-bottom: 10px;">
                <span style="font-size: 40px;">✨</span>
            </div>
            <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -0.5px;">¡Pedido Confirmado!</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.85); font-weight: 400;">Gracias por tu compra en <strong>Galaxia Glamour</strong></p>
            
            <!-- Badge de número de orden -->
            <div style="margin-top: 20px; display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 10px 20px; border-radius: 6px; box-shadow: 0 2px 8px rgba(251, 191, 36, 0.25);">
                <span style="font-size: 12px; color: #000; font-weight: 700; letter-spacing: 0.5px;">PEDIDO #${orderData.orderNumber}</span>
            </div>
        </div>
        
        <div style="padding: 24px 20px;">
            
            <!-- Información del cliente -->
            <div style="background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); padding: 18px; border-radius: 10px; margin-bottom: 20px; border-left: 3px solid #000;">
                <h3 style="margin: 0 0 14px 0; color: #000; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    <span>👤</span> Información del Cliente
                </h3>
                <div style="font-size: 13px; line-height: 1.8;">
                    <div style="margin-bottom: 6px;">
                        <strong style="color: #666; min-width: 70px; display: inline-block;">Nombre:</strong>
                        <span style="color: #000; font-weight: 500;">${orderData.customer.name}</span>
                    </div>
                    ${orderData.customer.email ? `
                    <div style="margin-bottom: 6px;">
                        <strong style="color: #666; min-width: 70px; display: inline-block;">Email:</strong>
                        <span style="color: #000;">${orderData.customer.email}</span>
                    </div>` : ''}
                    ${orderData.customer.phone ? `
                    <div style="margin-bottom: 6px;">
                        <strong style="color: #666; min-width: 70px; display: inline-block;">Teléfono:</strong>
                        <span style="color: #000; font-weight: 500;">${orderData.customer.phone}</span>
                    </div>` : ''}
                    <div>
                        <strong style="color: #666; min-width: 70px; display: inline-block;">Fecha:</strong>
                        <span style="color: #000;">${new Date().toLocaleDateString('es-CO', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</span>
                    </div>
                </div>
            </div>

            <!-- Dirección de entrega -->
            <div style="background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); padding: 18px; border-radius: 10px; margin-bottom: 20px; border-left: 3px solid #000;">
                <h3 style="margin: 0 0 14px 0; color: #000; font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    <span>📍</span> Dirección de Entrega
                </h3>
                <p style="margin: 0; color: #333; font-size: 13px; line-height: 1.6;">
                    ${orderData.customer.address.street}<br>
                    ${orderData.customer.address.city}, ${orderData.customer.address.state || 'Huila'}
                </p>
                ${orderData.deliveryType ? `
                <div style="margin-top: 12px; padding: 10px 12px; background: #fff; border-radius: 6px; border: 1px solid #e0e0e0;">
                    <strong style="color: #666; font-size: 12px;">Tipo de Entrega:</strong><br>
                    <span style="color: #000; font-size: 13px; font-weight: 500;">${orderData.deliveryType}</span>
                </div>` : ''}
            </div>

            <!-- Lista de productos -->
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #000 100%); padding: 16px 20px; border-radius: 8px 8px 0 0; margin-bottom: 0;">
                <h3 style="margin: 0; color: #fff; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    <span>🛍️</span> Productos Pedidos
                </h3>
            </div>
            <div style="background: #fff; border-radius: 0 0 8px 8px; padding: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                ${itemsHtml}
            </div>

            <!-- Total -->
            <div style="background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%); padding: 20px; border-radius: 10px; margin-top: 20px; border: 2px solid #e0e0e0;">
                <h3 style="margin: 0 0 16px 0; color: #000; font-size: 16px; font-weight: 700; text-align: center;">Resumen del Pedido</h3>
                
                <!-- Subtotal -->
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-size: 14px;">
                    <span style="color: #666; font-weight: 500;">Subtotal productos:</span>
                    <span style="color: #000; font-weight: 600;">$${orderData.subtotal.toLocaleString('es-CO')}</span>
                </div>
                
                ${orderData.discountAmount && orderData.discountAmount > 0 ? `
                <!-- Descuento -->
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-size: 14px;">
                    <span style="color: #4caf50; font-weight: 500;">
                        🏷️ Descuento aplicado:
                    </span>
                    <span style="color: #4caf50; font-weight: 700;">-$${orderData.discountAmount.toLocaleString('es-CO')}</span>
                </div>` : ''}
                
                ${orderData.shippingCost && orderData.shippingCost > 0 ? `
                <!-- Envío -->
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-size: 14px;">
                    <span style="color: #666; font-weight: 500;">Costo de envío:</span>
                    <span style="color: #000; font-weight: 600;">$${orderData.shippingCost.toLocaleString('es-CO')}</span>
                </div>` : `
                <!-- Envío gratis -->
                <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; font-size: 14px;">
                    <span style="color: #666; font-weight: 500;">Costo de envío:</span>
                    <span style="color: #4caf50; font-weight: 700;">GRATIS</span>
                </div>`}
                
                <!-- Total final -->
                <div style="background: linear-gradient(135deg, #1a1a1a 0%, #000 100%); padding: 16px; border-radius: 6px; margin-top: 12px; text-align: center;">
                    <p style="margin: 0 0 6px 0; font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 600; letter-spacing: 0.5px;">TOTAL A PAGAR</p>
                    <div style="font-size: 28px; font-weight: 800; color: #fbbf24; letter-spacing: -0.5px;">
                        $${orderData.total.toLocaleString('es-CO')}
                    </div>
                </div>
            </div>

            <!-- Próximos pasos -->
            <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 18px; border-radius: 10px; margin-top: 20px; border-left: 3px solid #4caf50;">
                <h4 style="margin: 0 0 12px 0; color: #2e7d32; font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
                    <span>📞</span> Próximos Pasos
                </h4>
                <p style="margin: 0 0 10px 0; color: #1b5e20; font-size: 13px; line-height: 1.6;">
                    Nos comunicaremos contigo pronto por <strong>WhatsApp</strong> o <strong>llamada</strong> 
                    al número registrado para confirmar tu pedido y coordinar la entrega.
                </p>
                <div style="background: rgba(255,255,255,0.5); padding: 10px; border-radius: 6px; margin-top: 10px;">
                    <strong style="color: #1b5e20; font-size: 13px;">Método de Pago:</strong> 
                    <span style="color: #2e7d32; font-size: 13px;">Contraentrega (pago al recibir el pedido)</span>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #000 100%); padding: 24px 20px; text-align: center;">
            <div style="margin-bottom: 8px;">
                <span style="font-size: 28px;">✨</span>
            </div>
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.5px;">Galaxia Glamour Store</p>
            <p style="margin: 6px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.7); font-weight: 400;">Tu belleza, nuestra pasión</p>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);">
                <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.5);">
                    © ${new Date().getFullYear()} Galaxia Glamour - Todos los derechos reservados
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
}

export { generatePaymentEmailTemplate };