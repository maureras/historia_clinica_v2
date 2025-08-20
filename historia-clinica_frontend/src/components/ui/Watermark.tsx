// src/components/Watermark.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth'; // <-- usa tu hook real

type WatermarkProps = {
  model?: 'diagonal' | 'grid' | 'border' | 'border-repeating';
  intensity?: number; 
  animation?: 'none' | 'pulse';
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const Watermark: React.FC<WatermarkProps> = ({
  model = 'grid',
  intensity = 0.1,
  animation = 'none',
}) => {
  const { user, isAuthenticated } = useAuth();
  const [styleContent, setStyleContent] = useState('');

  const alpha = clamp(intensity, 0.02, 0.25); // evita que quede invisible o muy fuerte
  const color = `rgba(120, 120, 120, ${alpha})`;

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setStyleContent('');
      return;
    }

    const nombre = [user.nombres, user.apellidos].filter(Boolean).join(' ').trim();
    const ident = (user as any)?.email || (user as any)?.id || (user as any)?.numeroIdentificacion || '';
    const fecha = new Date().toLocaleDateString('es-EC');
    const hora = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

    const rawText = [nombre || 'Usuario', ident, `${fecha} ${hora}`]
      .filter(Boolean)
      .join(' • ');

    // Para content:"..."; en CSS
    const textForCss = rawText.replace(/"/g, '\\"');

    // Para SVG embebido en data URL
    const textForSvg = rawText;

    let css = '';

    const keyframes = `
      @keyframes pulseOpacity {
        0%, 100% { opacity: ${alpha}; }
        50% { opacity: ${alpha * 0.6}; }
      }
    `;

    const animationStyle = animation === 'pulse' ? 'animation: pulseOpacity 10s infinite;' : '';

    const createRepeatingBackground = (svg: string) => `
      body::after {
        content: "";
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background-image: url("data:image/svg+xml,${encodeURIComponent(svg)}");
        background-repeat: repeat;
        background-size: auto;
        pointer-events: none;
        z-index: 9999;
        ${animationStyle}
      }
    `;

    switch (model) {
      case 'grid': {
        const gridSvg =
          `<svg xmlns="http://www.w3.org/2000/svg" width="500" height="300">
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              transform="rotate(-30, 250, 150)" font-size="20" fill="${color}"
              font-family="sans-serif" font-weight="500">${textForSvg}</text>
          </svg>`;
        css = createRepeatingBackground(gridSvg);
        break;
      }
      case 'border': {
        css = `
          body::after {
            content: "${textForCss}";
            position: fixed;
            bottom: 15px;
            right: 20px;
            font-size: 12px;
            font-family: sans-serif;
            color: ${color};
            font-weight: 500;
            pointer-events: none;
            z-index: 9999;
            ${animationStyle}
          }
        `;
        break;
      }
      case 'border-repeating': {
        const borderSvg =
          `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="200">
            <text x="95%" y="95%" dominant-baseline="auto" text-anchor="end"
              font-size="12" fill="${color}" font-family="sans-serif" font-weight="500">
              ${textForSvg}
            </text>
          </svg>`;
        css = createRepeatingBackground(borderSvg);
        break;
      }
      case 'diagonal':
      default: {
        css = `
          body::after {
            content: "${textForCss}";
            position: fixed;
            color: ${color};
            font-weight: 600;
            pointer-events: none;
            z-index: 9999;
            white-space: nowrap;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 2.5vw;
            ${animationStyle}
          }
        `;
        break;
      }
    }

    setStyleContent(animation === 'pulse' ? keyframes + css : css);
  }, [isAuthenticated, user, model, alpha, animation, color]);

  if (!isAuthenticated) return null;

  return <style>{styleContent}</style>;
};

export default Watermark;
