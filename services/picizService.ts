/**
 * Simulates validation against the Piciz Logistics System API
 */
export const validateWithPiciz = async (blNumber: string, vcesCode: string): Promise<{ valid: boolean; message: string }> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock logic: valid if VCES code starts with 'VCES'
  if (vcesCode.startsWith('VCES') && blNumber.length > 3) {
    return { valid: true, message: 'Validación exitosa con Piciz.' };
  }

  return { valid: false, message: 'Datos no encontrados en sistema Piciz.' };
};