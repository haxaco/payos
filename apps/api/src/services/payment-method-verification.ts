/**
 * Payment Method Verification Service
 * Story 51.4: Payment Method Verification
 *
 * Validates and verifies payment methods:
 * - PIX keys (CPF, CNPJ, email, phone, EVP) with DICT lookup simulation
 * - CLABE (Mexican bank accounts) with check digit validation
 * - Bank accounts with routing/account number validation
 *
 * @see Epic 51: Unified Platform Onboarding
 */

// ============================================
// Types
// ============================================

export type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';

export interface PixVerificationResult {
  valid: boolean;
  verified: boolean;
  owner_name?: string;
  owner_document?: string;
  bank_name?: string;
  bank_code?: string;
  branch?: string;
  account_number?: string;
  account_type?: 'checking' | 'savings';
  error?: string;
  error_code?: string;
}

export interface ClabeVerificationResult {
  valid: boolean;
  bank_code?: string;
  bank_name?: string;
  city_code?: string;
  account_number?: string;
  check_digit?: string;
  error?: string;
}

export interface BankAccountVerificationResult {
  valid: boolean;
  bank_name?: string;
  account_type?: string;
  error?: string;
}

// ============================================
// PIX Verification
// ============================================

/**
 * Mexican bank codes and names
 */
const MEXICAN_BANKS: Record<string, string> = {
  '002': 'BANAMEX',
  '012': 'BBVA BANCOMER',
  '014': 'SANTANDER',
  '021': 'HSBC',
  '030': 'BAJIO',
  '036': 'INBURSA',
  '044': 'SCOTIABANK',
  '058': 'MIFEL',
  '072': 'BANORTE',
  '127': 'AZTECA',
  '128': 'AUTOFIN',
  '129': 'BARCLAYS',
  '130': 'COMPARTAMOS',
  '131': 'BANCO FAMSA',
  '132': 'MULTIVA BANCO',
  '133': 'ACTINVER',
  '134': 'WAL-MART',
  '135': 'NAFIN',
  '136': 'INTERBANCO',
  '137': 'BANCOPPEL',
  '138': 'ABC CAPITAL',
  '139': 'UBS BANK',
  '140': 'CONSUBANCO',
  '141': 'VOLKSWAGEN',
  '143': 'CIBANCO',
  '145': 'BBASE',
  '166': 'BANSEFI',
  '168': 'HIPOTECARIA FED',
  '600': 'MONEXCB',
  '601': 'GBM',
  '602': 'MASARI',
  '606': 'ARCUS',
  '646': 'STP',
  '659': 'ASP INTEGRA OPC',
  '901': 'CLS',
  '902': 'INDEVAL',
  '670': 'LIBERTAD',
};

/**
 * Brazilian bank codes and names (sample)
 */
const BRAZILIAN_BANKS: Record<string, string> = {
  '001': 'Banco do Brasil',
  '033': 'Santander',
  '104': 'Caixa Econômica Federal',
  '237': 'Bradesco',
  '341': 'Itaú',
  '260': 'Nubank',
  '077': 'Inter',
  '212': 'Original',
  '756': 'Sicoob',
};

/**
 * Validate CPF (Brazilian individual taxpayer ID)
 * 11 digits with 2 check digits
 */
export function validateCPF(cpf: string): { valid: boolean; error?: string } {
  // Remove non-digits
  const digits = cpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    return { valid: false, error: 'CPF must have exactly 11 digits' };
  }

  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(digits)) {
    return { valid: false, error: 'CPF cannot have all identical digits' };
  }

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9], 10)) {
    return { valid: false, error: 'Invalid CPF check digit' };
  }

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i], 10) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10], 10)) {
    return { valid: false, error: 'Invalid CPF check digit' };
  }

  return { valid: true };
}

/**
 * Validate CNPJ (Brazilian business taxpayer ID)
 * 14 digits with 2 check digits
 */
export function validateCNPJ(cnpj: string): { valid: boolean; error?: string } {
  // Remove non-digits
  const digits = cnpj.replace(/\D/g, '');

  if (digits.length !== 14) {
    return { valid: false, error: 'CNPJ must have exactly 14 digits' };
  }

  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(digits)) {
    return { valid: false, error: 'CNPJ cannot have all identical digits' };
  }

  // First check digit weights
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * weights1[i];
  }
  let remainder = sum % 11;
  const checkDigit1 = remainder < 2 ? 0 : 11 - remainder;
  if (checkDigit1 !== parseInt(digits[12], 10)) {
    return { valid: false, error: 'Invalid CNPJ check digit' };
  }

  // Second check digit weights
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits[i], 10) * weights2[i];
  }
  remainder = sum % 11;
  const checkDigit2 = remainder < 2 ? 0 : 11 - remainder;
  if (checkDigit2 !== parseInt(digits[13], 10)) {
    return { valid: false, error: 'Invalid CNPJ check digit' };
  }

  return { valid: true };
}

/**
 * Validate Brazilian phone number
 */
export function validateBrazilianPhone(phone: string): { valid: boolean; error?: string } {
  // Remove non-digits
  const digits = phone.replace(/\D/g, '');

  // Should be 10-11 digits (area code + number), or 12-13 with country code
  if (digits.length < 10 || digits.length > 13) {
    return { valid: false, error: 'Invalid phone number length' };
  }

  // If starts with 55 (country code), strip it
  const localDigits = digits.startsWith('55') ? digits.slice(2) : digits;

  if (localDigits.length !== 10 && localDigits.length !== 11) {
    return { valid: false, error: 'Phone number must be 10-11 digits (excluding country code)' };
  }

  // Check area code (first 2 digits) - must be valid Brazilian DDD
  const areaCode = parseInt(localDigits.slice(0, 2), 10);
  const validAreaCodes = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // São Paulo
    21, 22, 24, // Rio de Janeiro
    27, 28, // Espírito Santo
    31, 32, 33, 34, 35, 37, 38, // Minas Gerais
    41, 42, 43, 44, 45, 46, // Paraná
    47, 48, 49, // Santa Catarina
    51, 53, 54, 55, // Rio Grande do Sul
    61, // Distrito Federal
    62, 64, // Goiás
    63, // Tocantins
    65, 66, // Mato Grosso
    67, // Mato Grosso do Sul
    68, // Acre
    69, // Rondônia
    71, 73, 74, 75, 77, // Bahia
    79, // Sergipe
    81, 87, // Pernambuco
    82, // Alagoas
    83, // Paraíba
    84, // Rio Grande do Norte
    85, 88, // Ceará
    86, 89, // Piauí
    91, 93, 94, // Pará
    92, 97, // Amazonas
    95, // Roraima
    96, // Amapá
    98, 99, // Maranhão
  ];

  if (!validAreaCodes.includes(areaCode)) {
    return { valid: false, error: 'Invalid area code' };
  }

  return { valid: true };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
}

/**
 * Validate EVP (random PIX key)
 * Must be a valid UUID format
 */
export function validateEVP(evp: string): { valid: boolean; error?: string } {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(evp)) {
    return { valid: false, error: 'EVP must be a valid UUID format' };
  }
  return { valid: true };
}

/**
 * Detect PIX key type from value
 */
export function detectPixKeyType(key: string): PixKeyType | null {
  const cleaned = key.replace(/\D/g, '');

  // CPF: 11 digits
  if (/^\d{11}$/.test(cleaned) && validateCPF(cleaned).valid) {
    return 'cpf';
  }

  // CNPJ: 14 digits
  if (/^\d{14}$/.test(cleaned) && validateCNPJ(cleaned).valid) {
    return 'cnpj';
  }

  // Email
  if (validateEmail(key).valid) {
    return 'email';
  }

  // Phone: 10-13 digits starting optionally with 55
  if (/^(\+?55)?\d{10,11}$/.test(cleaned) && validateBrazilianPhone(cleaned).valid) {
    return 'phone';
  }

  // EVP: UUID format
  if (validateEVP(key).valid) {
    return 'evp';
  }

  return null;
}

/**
 * Verify a PIX key
 * In sandbox mode, simulates DICT lookup
 * In production, would call Central Bank DICT API
 */
export async function verifyPixKey(
  pixKey: string,
  keyType?: PixKeyType
): Promise<PixVerificationResult> {
  // Auto-detect key type if not provided
  const detectedType = keyType || detectPixKeyType(pixKey);

  if (!detectedType) {
    return {
      valid: false,
      verified: false,
      error: 'Unable to determine PIX key type',
      error_code: 'INVALID_KEY_TYPE',
    };
  }

  // Validate based on type
  let validation: { valid: boolean; error?: string };

  switch (detectedType) {
    case 'cpf':
      validation = validateCPF(pixKey);
      break;
    case 'cnpj':
      validation = validateCNPJ(pixKey);
      break;
    case 'email':
      validation = validateEmail(pixKey);
      break;
    case 'phone':
      validation = validateBrazilianPhone(pixKey);
      break;
    case 'evp':
      validation = validateEVP(pixKey);
      break;
    default:
      validation = { valid: false, error: 'Unknown key type' };
  }

  if (!validation.valid) {
    return {
      valid: false,
      verified: false,
      error: validation.error,
      error_code: 'VALIDATION_FAILED',
    };
  }

  // In sandbox/development, simulate DICT response
  const isSandbox = process.env.NODE_ENV !== 'production' || process.env.SANDBOX_MODE === 'true';

  if (isSandbox) {
    // Generate mock DICT response
    const mockBank = Object.entries(BRAZILIAN_BANKS)[Math.floor(Math.random() * Object.keys(BRAZILIAN_BANKS).length)];

    return {
      valid: true,
      verified: true,
      owner_name: detectedType === 'cnpj' ? 'Mock Business Ltda' : 'Mock Person Name',
      owner_document: pixKey.replace(/\D/g, '').slice(-4).padStart(4, '*'),
      bank_name: mockBank[1],
      bank_code: mockBank[0],
      branch: String(Math.floor(Math.random() * 9999)).padStart(4, '0'),
      account_number: String(Math.floor(Math.random() * 99999999)).padStart(8, '0'),
      account_type: 'checking',
    };
  }

  // Production would call real DICT API
  // For now, return validation-only result
  return {
    valid: true,
    verified: false,
    error: 'DICT lookup not available in production mode',
    error_code: 'DICT_UNAVAILABLE',
  };
}

// ============================================
// CLABE Verification (Mexico)
// ============================================

/**
 * Validate CLABE (Clave Bancaria Estandarizada)
 * 18 digits: BBB-CCC-AAAAAAAAAAA-D
 * BBB = Bank code (3 digits)
 * CCC = City code (3 digits)
 * AAAAAAAAAAA = Account number (11 digits)
 * D = Check digit (1 digit)
 */
export function verifyCLABE(clabe: string): ClabeVerificationResult {
  // Remove non-digits
  const digits = clabe.replace(/\D/g, '');

  if (digits.length !== 18) {
    return {
      valid: false,
      error: 'CLABE must be exactly 18 digits',
    };
  }

  // Extract components
  const bankCode = digits.slice(0, 3);
  const cityCode = digits.slice(3, 6);
  const accountNumber = digits.slice(6, 17);
  const providedCheckDigit = parseInt(digits[17], 10);

  // Validate bank code
  const bankName = MEXICAN_BANKS[bankCode];
  if (!bankName) {
    return {
      valid: false,
      bank_code: bankCode,
      error: `Unknown bank code: ${bankCode}`,
    };
  }

  // Calculate check digit using weighted sum mod 10
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += (parseInt(digits[i], 10) * weights[i]) % 10;
  }
  const calculatedCheckDigit = (10 - (sum % 10)) % 10;

  if (calculatedCheckDigit !== providedCheckDigit) {
    return {
      valid: false,
      bank_code: bankCode,
      bank_name: bankName,
      city_code: cityCode,
      account_number: accountNumber,
      check_digit: String(providedCheckDigit),
      error: `Invalid check digit: expected ${calculatedCheckDigit}, got ${providedCheckDigit}`,
    };
  }

  return {
    valid: true,
    bank_code: bankCode,
    bank_name: bankName,
    city_code: cityCode,
    account_number: accountNumber,
    check_digit: String(providedCheckDigit),
  };
}

// ============================================
// Bank Account Verification (US)
// ============================================

/**
 * US Bank routing number validation (ABA RTN)
 * 9 digits with check digit validation
 */
export function validateRoutingNumber(routingNumber: string): { valid: boolean; error?: string } {
  const digits = routingNumber.replace(/\D/g, '');

  if (digits.length !== 9) {
    return { valid: false, error: 'Routing number must be exactly 9 digits' };
  }

  // Check digit validation using weighted sum
  // Weights: 3, 7, 1, 3, 7, 1, 3, 7, 1
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i], 10) * weights[i];
  }

  if (sum % 10 !== 0) {
    return { valid: false, error: 'Invalid routing number check digit' };
  }

  return { valid: true };
}

/**
 * Verify US bank account
 */
export function verifyBankAccount(
  routingNumber: string,
  accountNumber: string
): BankAccountVerificationResult {
  // Validate routing number
  const routingValidation = validateRoutingNumber(routingNumber);
  if (!routingValidation.valid) {
    return {
      valid: false,
      error: routingValidation.error,
    };
  }

  // Basic account number validation (typically 4-17 digits)
  const accountDigits = accountNumber.replace(/\D/g, '');
  if (accountDigits.length < 4 || accountDigits.length > 17) {
    return {
      valid: false,
      error: 'Account number must be between 4 and 17 digits',
    };
  }

  // In sandbox mode, return mock bank info
  const isSandbox = process.env.NODE_ENV !== 'production' || process.env.SANDBOX_MODE === 'true';

  if (isSandbox) {
    return {
      valid: true,
      bank_name: 'Mock Bank USA',
      account_type: 'checking',
    };
  }

  return {
    valid: true,
    bank_name: undefined, // Would need bank lookup service
    account_type: undefined,
  };
}

// ============================================
// Unified Verification Interface
// ============================================

export type PaymentMethodType = 'pix' | 'spei' | 'bank_account_us';

export interface PaymentMethodVerificationInput {
  type: PaymentMethodType;
  // PIX fields
  pix_key?: string;
  pix_key_type?: PixKeyType;
  // SPEI/CLABE fields
  clabe?: string;
  // US Bank account fields
  routing_number?: string;
  account_number?: string;
}

export interface PaymentMethodVerificationResult {
  valid: boolean;
  verified: boolean;
  type: PaymentMethodType;
  details: Record<string, unknown>;
  error?: string;
  error_code?: string;
}

/**
 * Unified payment method verification
 */
export async function verifyPaymentMethod(
  input: PaymentMethodVerificationInput
): Promise<PaymentMethodVerificationResult> {
  switch (input.type) {
    case 'pix':
      if (!input.pix_key) {
        return {
          valid: false,
          verified: false,
          type: 'pix',
          details: {},
          error: 'PIX key is required',
          error_code: 'MISSING_PIX_KEY',
        };
      }
      const pixResult = await verifyPixKey(input.pix_key, input.pix_key_type);
      return {
        valid: pixResult.valid,
        verified: pixResult.verified,
        type: 'pix',
        details: {
          owner_name: pixResult.owner_name,
          bank_name: pixResult.bank_name,
          bank_code: pixResult.bank_code,
          account_type: pixResult.account_type,
        },
        error: pixResult.error,
        error_code: pixResult.error_code,
      };

    case 'spei':
      if (!input.clabe) {
        return {
          valid: false,
          verified: false,
          type: 'spei',
          details: {},
          error: 'CLABE is required',
          error_code: 'MISSING_CLABE',
        };
      }
      const clabeResult = verifyCLABE(input.clabe);
      return {
        valid: clabeResult.valid,
        verified: clabeResult.valid, // CLABE validation is deterministic
        type: 'spei',
        details: {
          bank_name: clabeResult.bank_name,
          bank_code: clabeResult.bank_code,
          city_code: clabeResult.city_code,
          account_number_masked: clabeResult.account_number
            ? '****' + clabeResult.account_number.slice(-4)
            : undefined,
        },
        error: clabeResult.error,
        error_code: clabeResult.error ? 'INVALID_CLABE' : undefined,
      };

    case 'bank_account_us':
      if (!input.routing_number || !input.account_number) {
        return {
          valid: false,
          verified: false,
          type: 'bank_account_us',
          details: {},
          error: 'Routing number and account number are required',
          error_code: 'MISSING_BANK_DETAILS',
        };
      }
      const bankResult = verifyBankAccount(input.routing_number, input.account_number);
      return {
        valid: bankResult.valid,
        verified: bankResult.valid,
        type: 'bank_account_us',
        details: {
          bank_name: bankResult.bank_name,
          account_type: bankResult.account_type,
          account_number_masked: '****' + input.account_number.slice(-4),
        },
        error: bankResult.error,
        error_code: bankResult.error ? 'INVALID_BANK_ACCOUNT' : undefined,
      };

    default:
      return {
        valid: false,
        verified: false,
        type: input.type,
        details: {},
        error: `Unknown payment method type: ${input.type}`,
        error_code: 'UNKNOWN_TYPE',
      };
  }
}
