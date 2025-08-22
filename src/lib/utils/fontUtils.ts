/**
 * Font Utilities for Vercel Environment
 * 
 * Handles font loading for PDF generation in serverless environments
 */

import path from 'path'
import fs from 'fs'

/**
 * Get font CSS for PDF generation in Vercel environment
 * Prioritizes local font files, with Google Fonts as fallback
 */
export function getFontCSS(): string {
  const isVercel = process.env.VERCEL === '1'
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Check if local font file exists
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.woff2')
  const hasLocalFont = fs.existsSync(fontPath)
  
  if (hasLocalFont && !isVercel) {
    // Local development with local font file
    return `
      @font-face {
        font-family: 'Noto Sans JP';
        font-style: normal;
        font-weight: 400;
        src: url('/fonts/NotoSansJP-Regular.woff2') format('woff2');
        font-display: swap;
      }
    `
  } else {
    // Vercel environment or fallback - use Google Fonts
    // This ensures fonts are always available even if local file is missing
    return `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap');
    `
  }
}

/**
 * Get font family CSS property
 */
export function getFontFamily(): string {
  return "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic Medium', 'Meiryo', sans-serif"
}

/**
 * Check if local font file exists
 */
export function hasLocalFont(): boolean {
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.woff2')
    return fs.existsSync(fontPath)
  } catch (error) {
    console.warn('Failed to check local font file:', error)
    return false
  }
}

/**
 * Get optimized font loading CSS for different environments
 */
export function getOptimizedFontCSS(): string {
  const isVercel = process.env.VERCEL === '1'
  const hasLocal = hasLocalFont()
  
  let css = getFontCSS()
  
  // Add font optimization for different environments
  if (isVercel) {
    // Vercel environment - preload critical fonts
    css += `
      /* Vercel optimization: preload critical fonts */
      link[rel="preload"][as="font"] {
        crossorigin: anonymous;
      }
    `
  }
  
  return css
}

/**
 * Get complete font setup for PDF generation
 */
export function getPDFOptimizedFontCSS(): string {
  return `
    ${getFontCSS()}
    
    /* Fallback font stack for maximum compatibility */
    body, html {
      font-family: ${getFontFamily()};
    }
    
    /* Ensure proper font rendering in PDF */
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Force font loading before PDF generation */
    .font-preload {
      font-family: ${getFontFamily()};
      position: absolute;
      left: -9999px;
      top: -9999px;
      visibility: hidden;
    }
  `
}
