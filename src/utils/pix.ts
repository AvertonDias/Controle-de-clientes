/**
 * Helper to remove accents and special characters for EMV compatibility
 */
function sanitizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '') // Keep letters, numbers, and spaces
    .toUpperCase();
}

/**
 * Format tag following EMV schema: [ID][Length][Value]
 */
function formatTag(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

interface PixOptions {
  pixKey: string;
  holderName: string;
  bankCity: string;
  amount: number;
  txId?: string;
}

/**
 * Generates the valid EMV standard PIX Copy & Paste string
 */
export function generatePixPayload({
  pixKey,
  holderName,
  bankCity,
  amount,
  txId = '***'
}: PixOptions): string {
  // Sanitize key (remove spaces and special characters except alphanumeric, @, dot, dash)
  const cleanKey = pixKey.replace(/[^\w@.-]/g, '');
  const cleanName = sanitizeString(holderName).substring(0, 25);
  const cleanCity = sanitizeString(bankCity).substring(0, 15);
  const cleanTxId = sanitizeString(txId).replace(/\s+/g, '').substring(0, 25) || '***';

  const merchantAccountInfo = 
    formatTag('00', 'br.gov.bcb.pix') + 
    formatTag('01', cleanKey);

  const additionalData = formatTag('05', cleanTxId);

  let payload = 
    formatTag('00', '01') + // Payload Format Indicator
    formatTag('01', '11') + // Point of Initiation Method
    formatTag('26', merchantAccountInfo) +
    formatTag('52', '0000') + // Merchant Category Code
    formatTag('53', '986') + // Transaction Currency (986 = BRL)
    formatTag('54', amount.toFixed(2)) + // Transaction Amount
    formatTag('58', 'BR') + // Country Code
    formatTag('59', cleanName) + // Merchant Name
    formatTag('60', cleanCity) + // Merchant City
    formatTag('62', additionalData); // Additional Data

  payload += '6304'; // CRC16 indicator and length

  // Compute standard CRC16 CCITT
  let crc = 0xFFFF;
  for (let c = 0; c < payload.length; c++) {
    const code = payload.charCodeAt(c);
    crc ^= (code << 8);
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }

  const hexCrc = (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  return payload + hexCrc;
}
