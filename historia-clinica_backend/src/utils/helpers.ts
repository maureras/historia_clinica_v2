// src/utils/helpers.ts - Utilidades comunes del backend

import { randomUUID } from 'crypto';

/**
 * Formateo de fechas para Ecuador
 */
export class DateHelper {
  /**
   * Formato: DD/MM/YYYY
   */
  static formatDateEC(date: Date | string): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  }

  /**
   * Formato: DD de MMMM de YYYY
   */
  static formatDateLongEC(date: Date | string): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(d);
  }

  /**
   * Formato: DD/MM/YYYY HH:mm
   */
  static formatDateTimeEC(date: Date | string): string {
    const d = new Date(date);
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d);
  }

  /**
   * Calcular edad desde fecha de nacimiento
   */
  static calculateAge(birthDate: Date | string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Verificar si una fecha es válida
   */
  static isValidDate(date: any): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Obtener inicio y fin del día
   */
  static getDateRange(date: Date | string): { start: Date; end: Date } {
    const d = new Date(date);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }
}

/**
 * Validadores específicos para Ecuador
 */
export class ValidatorEC {
  /**
   * Validar cédula ecuatoriana
   */
  static validateCedula(cedula: string): boolean {
    if (!cedula || cedula.length !== 10) return false;
    
    const digits = cedula.split('').map(Number);
    const provinceCode = parseInt(cedula.substring(0, 2));
    
    // Validar código de provincia (01-24)
    if (provinceCode < 1 || provinceCode > 24) return false;
    
    // Algoritmo de validación
    const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      let value = digits[i] * coefficients[i];
      if (value >= 10) value -= 9;
      sum += value;
    }
    
    const checkDigit = sum % 10 === 0 ? 0 : 10 - (sum % 10);
    return checkDigit === digits[9];
  }

  /**
   * Validar teléfono ecuatoriano
   */
  static validatePhoneEC(phone: string): boolean {
    if (!phone) return false;
    
    // Remover espacios y guiones
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    // Formatos válidos:
    // 09xxxxxxxx (celular)
    // 02xxxxxxx (Quito)
    // 03xxxxxxx, 04xxxxxxx, etc. (otras provincias)
    const phoneRegex = /^(09\d{8}|0[2-7]\d{7})$/;
    
    return phoneRegex.test(cleanPhone);
  }

  /**
   * Validar email
   */
  static validateEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Utilidades para manejo de archivos
 */
export class FileHelper {
  /**
   * Generar nombre único para archivo
   */
  static generateUniqueFileName(originalName: string, prefix: string = ''): string {
    const extension = originalName.split('.').pop() || '';
    const timestamp = Date.now();
    const uuid = randomUUID().split('-')[0]; // Solo primeros 8 caracteres
    
    return `${prefix}${prefix ? '_' : ''}${timestamp}_${uuid}.${extension}`;
  }

  /**
   * Obtener extensión de archivo
   */
  static getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Verificar si es imagen
   */
  static isImageFile(filename: string): boolean {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
    return imageExtensions.includes(this.getFileExtension(filename));
  }

  /**
   * Verificar si es PDF
   */
  static isPDFFile(filename: string): boolean {
    return this.getFileExtension(filename) === 'pdf';
  }

  /**
   * Formatear tamaño de archivo
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

/**
 * Utilidades médicas
 */
export class MedicalHelper {
  /**
   * Calcular IMC
   */
  static calculateIMC(weight: number, height: number): number | null {
    if (!weight || !height || height <= 0) return null;
    
    // Convertir altura a metros si viene en centímetros
    const heightInMeters = height > 10 ? height / 100 : height;
    const imc = weight / (heightInMeters * heightInMeters);
    
    return Math.round(imc * 10) / 10;
  }

  /**
   * Clasificar IMC
   */
  static classifyIMC(imc: number): string {
    if (imc < 18.5) return 'Bajo peso';
    if (imc < 25) return 'Normal';
    if (imc < 30) return 'Sobrepeso';
    if (imc < 35) return 'Obesidad I';
    if (imc < 40) return 'Obesidad II';
    return 'Obesidad III';
  }

  /**
   * Validar presión arterial
   */
  static validateBloodPressure(bp: string): boolean {
    const bpRegex = /^\d{2,3}\/\d{2,3}$/;
    return bpRegex.test(bp);
  }

  /**
   * Clasificar presión arterial
   */
  static classifyBloodPressure(systolic: number, diastolic: number): string {
    if (systolic < 120 && diastolic < 80) return 'Normal';
    if (systolic < 130 && diastolic < 80) return 'Elevada';
    if (systolic < 140 || diastolic < 90) return 'HTA Grado 1';
    if (systolic < 180 || diastolic < 120) return 'HTA Grado 2';
    return 'Crisis Hipertensiva';
  }

  /**
   * Generar código de consulta único
   */
  static generateConsultationCode(patientId: number): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const sequence = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    
    return `C${year}${month}${day}-${patientId.toString().padStart(4, '0')}-${sequence}`;
  }
}

/**
 * Utilidades de texto
 */
export class TextHelper {
  /**
   * Capitalizar primera letra
   */
  static capitalize(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  /**
   * Capitalizar cada palabra
   */
  static capitalizeWords(text: string): string {
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Limpiar texto para búsqueda
   */
  static normalizeForSearch(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^\w\s]/g, '') // Remover caracteres especiales
      .trim();
  }

  /**
   * Truncar texto
   */
  static truncate(text: string, maxLength: number, ellipsis: string = '...'): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - ellipsis.length) + ellipsis;
  }

  /**
   * Generar iniciales
   */
  static getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 3);
  }
}

/**
 * Utilidades de respuesta API
 */
export class APIHelper {
  /**
   * Respuesta exitosa estándar
   */
  static success(data?: any, message?: string) {
    return {
      ok: true,
      ...(message && { message }),
      ...(data && { data }),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Respuesta de error estándar
   */
  static error(message: string, code?: string, details?: any) {
    return {
      ok: false,
      error: code || 'UNKNOWN_ERROR',
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Respuesta paginada
   */
  static paginated(data: any[], pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }) {
    return {
      ok: true,
      data,
      pagination,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Utilidades de logging
 */
export class Logger {
  /**
   * Log con timestamp
   */
  static log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const emoji = level === 'INFO' ? '📝' : level === 'WARN' ? '⚠️' : '❌';
    
    console.log(`${emoji} [${timestamp}] ${level}: ${message}`);
    
    if (data) {
      console.log('   Data:', JSON.stringify(data, null, 2));
    }
  }

  static info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  static warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  static error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }
}