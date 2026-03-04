/**
 * Validates a Brazilian CPF number.
 * @param cpf - The CPF string (can include formatting like dots and dashes)
 * @returns true if valid, false if invalid
 */
export function validateCPF(cpf: string): boolean {
  // Remove non-numeric characters
  const cleanCpf = cpf.replace(/\D/g, '');

  // Must have exactly 11 digits
  if (cleanCpf.length !== 11) {
    return false;
  }

  // Check for known invalid CPFs (all same digits)
  const invalidCpfs = [
    '00000000000',
    '11111111111',
    '22222222222',
    '33333333333',
    '44444444444',
    '55555555555',
    '66666666666',
    '77777777777',
    '88888888888',
    '99999999999',
  ];

  if (invalidCpfs.includes(cleanCpf)) {
    return false;
  }

  // Validate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleanCpf.charAt(9))) {
    return false;
  }

  // Validate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }
  if (remainder !== parseInt(cleanCpf.charAt(10))) {
    return false;
  }

  return true;
}

/**
 * Formats a CPF string to the standard format (XXX.XXX.XXX-XX)
 * @param cpf - The CPF string (numeric only or partially formatted)
 * @returns The formatted CPF string
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Removes all formatting from a CPF string
 * @param cpf - The formatted CPF string
 * @returns The CPF with only numbers
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}
