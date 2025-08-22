import puppeteer, { Browser, Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { PDFGenerationService, PuppeteerConfig } from '@/types/receipt'
import {
  getOptimizedPuppeteerConfig,
  getReceiptPDFOptions,
  getReceiptViewport,
  getPageLoadOptions,
  validatePDFBuffer,
  formatPDFError,
  safeCleanup
} from '@/lib/utils/pdfUtils'

/**
 * PDF Generation Service
 * 
 * Handles HTML to PDF conversion using Puppeteer with optimized settings
 * for Vercel serverless environment. Includes memory management and
 * browser instance lifecycle management.
 */
export class PDFGenerationServiceImpl implements PDFGenerationService {
  private browser: Browser | null = null
  private readonly config: PuppeteerConfig

  constructor() {
    this.config = getOptimizedPuppeteerConfig()
  }

  /**
   * Generate PDF from HTML string
   * 
   * @param html - HTML content to convert to PDF
   * @returns Promise<Buffer> - PDF buffer
   */
  async generatePDF(html: string): Promise<Buffer> {
    let page: Page | null = null
    
    try {
      // Get or create browser instance
      const browser = await this.optimizePuppeteer()
      
      // Create new page
      page = await browser.newPage()
      
      // Set viewport for consistent rendering
      await page.setViewport(getReceiptViewport())

      // Set content with proper encoding
      await page.setContent(html, getPageLoadOptions(this.config.timeout))

      // Wait for fonts to load (important for Japanese fonts)
      await page.evaluateHandle('document.fonts.ready')
      
      // Additional font loading wait for Vercel environment
      if (process.env.VERCEL === '1') {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // Generate PDF with optimized settings
      const pdfBuffer = await page.pdf(getReceiptPDFOptions())
      const buffer = Buffer.from(pdfBuffer)

      // Validate the generated PDF
      if (!validatePDFBuffer(buffer)) {
        throw new Error('Generated PDF is invalid or empty')
      }

      return buffer

    } catch (error) {
      console.error('PDF generation failed:', error)
      throw new Error(formatPDFError(error, 'generatePDF'))
    } finally {
      // Always close the page to free memory
      if (page) {
        await safeCleanup(page, 'page')
      }
    }
  }

  /**
   * Get or create optimized Puppeteer browser instance
   * 
   * @returns Promise<Browser> - Puppeteer browser instance
   */
  async optimizePuppeteer(): Promise<Browser> {
    // Reuse existing browser if available and connected
    if (this.browser && this.browser.isConnected()) {
      return this.browser
    }

    try {
      // Determine environment and configure Chromium accordingly
      const isVercel = process.env.VERCEL === '1'
      const isProduction = process.env.NODE_ENV === 'production'
      
      let executablePath: string
      let launchArgs: string[]
      
      if (isVercel || isProduction) {
        // Vercel/Production environment - use @sparticuz/chromium
        executablePath = await chromium.executablePath()
        launchArgs = chromium.args.concat(this.config.args)
      } else {
        // Local development environment - try to find local Chrome/Chromium
        const possiblePaths = [
          // Windows paths
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Users\\' + (process.env.USERNAME || 'user') + '\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
          // Alternative: use the downloaded Chromium if available
          process.env.CHROMIUM_PATH || ''
        ].filter(Boolean)
        
        // Try to find existing Chrome installation
        const fs = require('fs')
        executablePath = possiblePaths.find(path => fs.existsSync(path)) || ''
        
        if (!executablePath) {
          // If no local Chrome found, try to use @sparticuz/chromium in dev too
          console.warn('No local Chrome found, attempting to use @sparticuz/chromium in development')
          try {
            executablePath = await chromium.executablePath()
            launchArgs = chromium.args.concat(this.config.args)
          } catch (chromiumError) {
            throw new Error(`Could not find Chrome executable. Please install Google Chrome or set CHROMIUM_PATH environment variable. Chromium error: ${chromiumError}`)
          }
        } else {
          console.log('Using local Chrome executable:', executablePath)
          launchArgs = this.config.args
        }
      }

      // Launch browser with optimized configuration
      this.browser = await puppeteer.launch({
        executablePath,
        args: launchArgs,
        headless: this.config.headless,
        defaultViewport: null,
        timeout: this.config.timeout
      })

      // Set up browser event handlers for cleanup
      this.browser.on('disconnected', () => {
        console.log('Browser disconnected')
        this.browser = null
      })

      return this.browser

    } catch (error) {
      console.error('Failed to launch browser:', error)
      this.browser = null
      throw new Error(formatPDFError(error, 'browser launch'))
    }
  }

  /**
   * Close browser instance and cleanup resources
   * 
   * Should be called when the service is no longer needed
   * or in serverless function cleanup
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await safeCleanup(this.browser, 'browser')
      this.browser = null
    }
  }

  /**
   * Check if browser is available and connected
   * 
   * @returns boolean - True if browser is ready to use
   */
  isBrowserReady(): boolean {
    return this.browser !== null && this.browser.isConnected()
  }

  /**
   * Get browser process information for monitoring
   * 
   * @returns Promise<object> - Browser process info
   */
  async getBrowserInfo(): Promise<{
    isConnected: boolean
    version?: string
    userAgent?: string
    wsEndpoint?: string
  }> {
    if (!this.browser || !this.browser.isConnected()) {
      return { isConnected: false }
    }

    try {
      const version = await this.browser.version()
      const userAgent = await this.browser.userAgent()
      const wsEndpoint = this.browser.wsEndpoint()

      return {
        isConnected: true,
        version,
        userAgent,
        wsEndpoint
      }
    } catch (error) {
      console.warn('Failed to get browser info:', error)
      return { isConnected: false }
    }
  }
}

// Export singleton instance for reuse across requests
let pdfGenerationServiceInstance: PDFGenerationServiceImpl | null = null

/**
 * Get singleton instance of PDF Generation Service
 * 
 * @returns PDFGenerationServiceImpl - Service instance
 */
export function getPDFGenerationService(): PDFGenerationServiceImpl {
  if (!pdfGenerationServiceInstance) {
    pdfGenerationServiceInstance = new PDFGenerationServiceImpl()
  }
  return pdfGenerationServiceInstance
}

/**
 * Cleanup function for serverless environments
 * Should be called at the end of serverless function execution
 */
export async function cleanupPDFService(): Promise<void> {
  if (pdfGenerationServiceInstance) {
    await pdfGenerationServiceInstance.cleanup()
    pdfGenerationServiceInstance = null
  }
}

export default PDFGenerationServiceImpl