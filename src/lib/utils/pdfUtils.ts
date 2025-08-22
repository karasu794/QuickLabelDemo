/**
 * PDF Generation Utilities
 * 
 * Helper functions for PDF generation and optimization
 */

import { PuppeteerConfig } from '@/types/receipt'

/**
 * Get optimized Puppeteer configuration for Vercel environment
 */
export function getOptimizedPuppeteerConfig(): PuppeteerConfig {
  return {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--disable-extensions',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-pings',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ],
    headless: true,
    timeout: 15000
  }
}

/**
 * Get PDF generation options optimized for receipts
 */
export function getReceiptPDFOptions() {
  return {
    format: 'A4' as const,
    printBackground: true,
    margin: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm'
    },
    preferCSSPageSize: false,
    displayHeaderFooter: false
  }
}

/**
 * Get viewport settings optimized for A4 receipts
 */
export function getReceiptViewport() {
  return {
    width: 794, // A4 width in pixels at 96 DPI
    height: 1123, // A4 height in pixels at 96 DPI
    deviceScaleFactor: 1
  }
}

/**
 * Get page load options for reliable rendering
 */
export function getPageLoadOptions(timeout: number = 30000) {
  return {
    waitUntil: ['domcontentloaded'] as ('domcontentloaded')[],
    timeout
  }
}

/**
 * Validate PDF buffer
 */
export function validatePDFBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) {
    return false
  }
  
  // Check PDF header
  const header = buffer.toString('ascii', 0, 4)
  return header === '%PDF'
}

/**
 * Get memory-optimized browser launch options
 */
export function getMemoryOptimizedOptions() {
  return {
    defaultViewport: null,
    ignoreHTTPSErrors: true,
    // Disable images and CSS to save memory (can be enabled if needed)
    args: [
      '--disable-images',
      '--disable-javascript', // Can be enabled if JS is needed
      '--disable-plugins',
      '--disable-extensions'
    ]
  }
}

/**
 * Calculate estimated memory usage for PDF generation
 */
export function estimateMemoryUsage(htmlLength: number): number {
  // Rough estimation: base memory + HTML size factor
  const baseMemory = 50 * 1024 * 1024 // 50MB base
  const htmlFactor = htmlLength * 10 // 10 bytes per HTML character
  return baseMemory + htmlFactor
}

/**
 * Check if current environment supports PDF generation
 */
export function isPDFGenerationSupported(): boolean {
  // Check if we're in a supported environment
  if (typeof window !== 'undefined') {
    // Browser environment - not supported
    return false
  }
  
  // Check for required dependencies
  try {
    require('puppeteer-core')
    require('@sparticuz/chromium')
    return true
  } catch (error) {
    return false
  }
}

/**
 * Format error message for PDF generation failures
 */
export function formatPDFError(error: unknown, context: string): string {
  const errorMessage = error instanceof Error ? error.message : String(error)
  return `PDF generation failed in ${context}: ${errorMessage}`
}

/**
 * Cleanup resources and handle errors gracefully
 */
export async function safeCleanup<T>(
  resource: T & { close?: () => Promise<void> },
  resourceName: string
): Promise<void> {
  if (resource && typeof resource.close === 'function') {
    try {
      await resource.close()
      console.log(`${resourceName} closed successfully`)
    } catch (error) {
      console.warn(`Failed to close ${resourceName}:`, error)
    }
  }
}

/**
 * Retry PDF generation with exponential backoff
 */
export async function retryPDFGeneration<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.warn(`PDF generation attempt ${attempt} failed, retrying in ${delay}ms:`, error)
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}