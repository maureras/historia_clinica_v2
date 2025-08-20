// src/services/watermark.service.ts - Servicio de marcas de agua

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';

export interface UserData {
  nombre: string;
  id: string;
}

export interface WatermarkOptions {
  model?: 'diagonal' | 'grid' | 'border' | 'corner';
  intensity?: number;
  user: UserData;
}

export class WatermarkService {
  /**
   * Agrega marca de agua a un PDF
   */
  static async addWatermarkToPDF(
    filePath: string,
    options: WatermarkOptions
  ): Promise<Buffer> {
    const { model = 'grid', intensity = 0.15, user } = options;

    try {
      // 1. Leer el archivo PDF original
      const existingPdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // 2. Configurar fuente
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // 3. Generar texto de marca de agua
      const fecha = new Date().toLocaleDateString('es-EC', {
        year: 'numeric',
        month: '2-digit', 
        day: '2-digit'
      });
      const hora = new Date().toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const watermarkText = `${user.nombre} • ${user.id} • ${fecha} ${hora}`;

      // 4. Obtener todas las páginas
      const pages = pdfDoc.getPages();

      // 5. Aplicar marca de agua según el modelo
      for (const page of pages) {
        const { width, height } = page.getSize();

        switch (model) {
          case 'diagonal':
            await this.addDiagonalWatermark(page, watermarkText, font, intensity, width, height);
            break;

          case 'grid':
            await this.addGridWatermark(page, watermarkText, font, intensity, width, height);
            break;

          case 'border':
            await this.addBorderWatermark(page, watermarkText, font, intensity, width, height);
            break;

          case 'corner':
            await this.addCornerWatermark(page, watermarkText, font, intensity, width, height);
            break;

          default:
            await this.addDiagonalWatermark(page, watermarkText, font, intensity, width, height);
        }
      }

      // 6. Generar PDF con marca de agua
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);

    } catch (error) {
      console.error('❌ Error agregando marca de agua:', error);
      // En caso de error, devolver archivo original
      return await fs.readFile(filePath);
    }
  }

  /**
   * Marca de agua diagonal central
   */
  private static async addDiagonalWatermark(
    page: any,
    text: string,
    font: any,
    intensity: number,
    width: number,
    height: number
  ) {
    const fontSize = Math.min(width, height) * 0.08; // Tamaño responsivo
    
    page.drawText(text, {
      x: width / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.47, 0.47, 0.47), // Gris similar al CSS
      opacity: intensity,
      rotate: {
        type: 'degrees',
        angle: -45
      },
      xSkew: 0,
      ySkew: 0,
      maxWidth: width * 0.8,
    });
  }

  /**
   * Marca de agua en cuadrícula
   */
  private static async addGridWatermark(
    page: any,
    text: string,
    font: any,
    intensity: number,
    width: number,
    height: number
  ) {
    const fontSize = 16;
    const spacingX = 300;
    const spacingY = 200;

    // Crear cuadrícula de marcas de agua
    for (let x = spacingX / 2; x < width; x += spacingX) {
      for (let y = spacingY / 2; y < height; y += spacingY) {
        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(0.47, 0.47, 0.47),
          opacity: intensity,
          rotate: {
            type: 'degrees',
            angle: -30
          }
        });
      }
    }
  }

  /**
   * Marca de agua en borde inferior derecho
   */
  private static async addBorderWatermark(
    page: any,
    text: string,
    font: any,
    intensity: number,
    width: number,
    height: number
  ) {
    const fontSize = 10;
    const margin = 20;

    page.drawText(text, {
      x: width - margin,
      y: margin,
      size: fontSize,
      font,
      color: rgb(0.47, 0.47, 0.47),
      opacity: intensity,
      maxWidth: width * 0.4,
    });
  }

  /**
   * Marca de agua en esquina superior derecha
   */
  private static async addCornerWatermark(
    page: any,
    text: string,
    font: any,
    intensity: number,
    width: number,
    height: number
  ) {
    const fontSize = 12;
    const margin = 30;

    page.drawText(text, {
      x: width - margin,
      y: height - margin,
      size: fontSize,
      font,
      color: rgb(0.47, 0.47, 0.47),
      opacity: intensity,
    });
  }

  /**
   * Simula obtener datos del usuario autenticado
   * En producción, esto vendría del token JWT o sesión
   */
  static getCurrentUser(): UserData {
    // TODO: Implementar autenticación real
    return {
      nombre: "Dra. Ana Gómez",
      id: "AG-1123"
    };
  }

  /**
   * Verifica si un archivo es PDF
   */
  static isPDF(filePath: string): boolean {
    return filePath.toLowerCase().endsWith('.pdf');
  }

  /**
   * Genera marca de agua para imágenes (futuro)
   */
  static async addWatermarkToImage(
    filePath: string,
    options: WatermarkOptions
  ): Promise<Buffer> {
    // TODO: Implementar marca de agua para imágenes usando canvas
    // Por ahora, devolver imagen original
    return await fs.readFile(filePath);
  }
}