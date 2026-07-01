import { jsPDF } from 'jspdf';
import { Client, Product, RouteItem, UserProfile } from '../types';

// Helper to format currency to BRL
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Helper to format date cleanly
export const formatDate = (isoString?: string): string => {
  if (!isoString) return new Date().toLocaleString('pt-BR');
  try {
    return new Date(isoString).toLocaleString('pt-BR');
  } catch (e) {
    return new Date().toLocaleString('pt-BR');
  }
};

interface ReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// Extract and enrich receipt items with prices from the products list
const getReceiptItems = (item: RouteItem, products: Product[]): ReceiptItem[] => {
  return item.items.map((it) => {
    const matchedProduct = products.find((p) => p.id === it.productId);
    const unitPrice = matchedProduct?.price || 0;
    return {
      productName: it.productName,
      quantity: it.quantity,
      unitPrice,
      totalPrice: unitPrice * it.quantity,
    };
  });
};

/**
 * Generates and downloads or shares a beautifully formatted PDF receipt
 */
export const generateReceiptPDF = async (
  item: RouteItem,
  client: Client,
  products: Product[],
  profile?: UserProfile | null,
  options?: { action?: 'download' | 'share' }
): Promise<{ success: boolean; method: 'native' | 'download' }> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const receiptItems = getReceiptItems(item, products);
  const totalAmount = receiptItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

  // Styling properties
  const primaryColor = [79, 70, 229]; // Indigo-600
  const darkTextColor = [30, 41, 59]; // Slate-800
  const lightTextColor = [100, 116, 139]; // Slate-500
  const borderColor = [226, 232, 240]; // Slate-200

  // Header / Title
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 38, 'F');

  // Business Info on the header
  doc.setTextColor(255, 255, 255);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(18);
  const companyName = profile?.companyName || 'Recibo de Entrega';
  doc.text(companyName.toUpperCase(), 15, 16);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  const companyCNPJ = profile?.cnpj ? `CNPJ: ${profile.cnpj}` : '';
  const companyAddr = profile?.companyAddress ? `Endereço: ${profile.companyAddress}` : '';
  const companyPhone = profile?.phone ? `Contato: ${profile.phone}` : '';
  const subtitle = [companyCNPJ, companyPhone, companyAddr].filter(Boolean).join('  |  ');
  doc.text(subtitle, 15, 24, { maxWidth: 180 });

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('COMPROVANTE DE ENTREGA E VENDA', 15, 32);

  // Client and Receipt Meta Info
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 15, 50);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(15, 52, 195, 52);

  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('Nome:', 15, 58);
  doc.text('Endereço:', 15, 64);
  doc.text('Telefone:', 15, 70);
  doc.text('Data/Hora:', 15, 76);

  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.text(client.name, 40, 58);
  doc.setFont('Helvetica', 'normal');
  doc.text(client.address, 40, 64, { maxWidth: 155 });
  doc.text(client.phone, 40, 70);
  doc.text(formatDate(item.deliveredAt), 40, 76);

  // Table of Items
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('MERCADORIAS ENTREGUES', 15, 90);
  doc.line(15, 92, 195, 92);

  // Table Headers
  doc.setFillColor(248, 250, 252); // Slate-50 background
  doc.rect(15, 96, 180, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text('Descrição do Produto', 18, 101);
  doc.text('Qtd', 125, 101, { align: 'center' });
  doc.text('V. Unitário', 150, 101, { align: 'right' });
  doc.text('V. Total', 190, 101, { align: 'right' });

  // Table Items
  let currentY = 108;
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  receiptItems.forEach((it, idx) => {
    // Alternate row backgrounds or borders
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 250);
      doc.rect(15, currentY - 4, 180, 6, 'F');
    }
    
    doc.text(it.productName, 18, currentY);
    doc.text(it.quantity.toString(), 125, currentY, { align: 'center' });
    doc.text(formatCurrency(it.unitPrice), 150, currentY, { align: 'right' });
    doc.text(formatCurrency(it.totalPrice), 190, currentY, { align: 'right' });

    doc.setDrawColor(241, 245, 249); // Slate-100 line
    doc.line(15, currentY + 2, 195, currentY + 2);
    currentY += 7;
  });

  // Totals Section
  currentY += 2;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(15, currentY, 195, currentY);
  
  currentY += 6;
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL DO RECIBO:', 120, currentY);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(formatCurrency(totalAmount), 190, currentY, { align: 'right' });

  // Status Badge
  currentY += 12;
  doc.setFillColor(240, 253, 250); // Emerald-50
  doc.setDrawColor(16, 185, 129); // Emerald-500
  doc.rect(15, currentY - 5, 180, 10, 'FD');
  
  doc.setFontSize(10);
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(4, 120, 87); // Emerald-700
  doc.text('ENTREGA CONCLUÍDA E CONFIRMADA COM SUCESSO', 105, currentY + 1.5, { align: 'center' });

  // Signature Block
  currentY += 26;
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(20, currentY, 90, currentY);
  doc.line(120, currentY, 190, currentY);

  currentY += 4;
  doc.setFontSize(8);
  doc.setFont('Helvetica', 'normal');
  doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
  doc.text('Assinatura do Responsável', 55, currentY, { align: 'center' });
  doc.text('Assinatura do Cliente / Recebedor', 155, currentY, { align: 'center' });

  // Footer Branding
  currentY = 280;
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text('Controle de Clientes & Rotas Inteligentes - Comprovante de Entrega eletrônico', 105, currentY, { align: 'center' });

  // Save or Share the PDF
  const filename = `recibo_${client.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.pdf`;
  const action = options?.action || 'download';

  if (action === 'share') {
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], filename, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Recibo - ${client.name}`,
          text: `Comprovante de entrega para ${client.name}`,
        });
        return { success: true, method: 'native' };
      } catch (error) {
        console.warn('Native share failed or was cancelled, falling back to download:', error);
        doc.save(filename);
        return { success: true, method: 'download' };
      }
    } else {
      doc.save(filename);
      return { success: true, method: 'download' };
    }
  } else {
    doc.save(filename);
    return { success: true, method: 'download' };
  }
};

/**
 * Generates and triggers WhatsApp redirect with beautiful text receipt
 */
export const shareReceiptWhatsApp = (
  item: RouteItem,
  client: Client,
  products: Product[],
  profile?: UserProfile | null
) => {
  const receiptItems = getReceiptItems(item, products);
  const totalAmount = receiptItems.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const companyName = profile?.companyName || 'Minha Empresa';
  const deliverDate = formatDate(item.deliveredAt);

  // Clean client phone to be 100% dialable
  const cleanPhone = client.phone.replace(/\D/g, '');
  const prefix = cleanPhone.startsWith('55') ? '' : '55'; // default to Brazil prefix if not present
  const fullPhone = cleanPhone ? `${prefix}${cleanPhone}` : '';

  // Format professional receipt text
  let message = `*🧾 COMPROVANTE DE ENTREGA E VENDA*\n`;
  message += `*${companyName.toUpperCase()}*\n`;
  if (profile?.cnpj) message += `CNPJ: ${profile.cnpj}\n`;
  if (profile?.phone) message += `Tel: ${profile.phone}\n`;
  message += `----------------------------------------\n\n`;

  message += `*CLIENTE:* ${client.name}\n`;
  message += `*ENDEREÇO:* ${client.address}\n`;
  message += `*DATA DE ENTREGA:* ${deliverDate}\n`;
  message += `----------------------------------------\n\n`;

  message += `*PRODUTOS ENTREGUES:*\n`;
  receiptItems.forEach((it) => {
    message += `• _${it.productName}_ - ${it.quantity} un x ${formatCurrency(it.unitPrice)} = *${formatCurrency(it.totalPrice)}*\n`;
  });
  message += `\n----------------------------------------\n`;
  message += `*VALOR TOTAL DO RECIBO:* ${formatCurrency(totalAmount)}\n`;
  message += `----------------------------------------\n\n`;
  message += `*Status:* ✅ Entrega realizada com sucesso!\n\n`;
  message += `_Obrigado pela preferência! Se tiver alguma dúvida, entre em contato conosco._`;

  const encodedText = encodeURIComponent(message);
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodedText}`;
  window.open(whatsappUrl, '_blank');
};
