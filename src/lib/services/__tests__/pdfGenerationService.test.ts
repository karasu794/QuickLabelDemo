// Mock puppeteer-core and chromium
jest.mock('puppeteer-core', () => ({
  launch: jest.fn()
}))

jest.mock('@sparticuz/chromium', () => ({
  executablePath: jest.fn().mockResolvedValue('/usr/bin/chromium'),
  args: ['--no-sandbox', '--disable-setuid-sandbox']
}))

import { PDFGenerationServiceImpl, getPDFGenerationService, cleanupPDFService } from '../pdfGenerationService'

// Mock objects
const mockPage = {
  setViewport: jest.fn().mockResolvedValue(undefined),
  setContent: jest.fn().mockResolvedValue(undefined),
  evaluateHandle: jest.fn().mockResolvedValue(undefined),
  pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4\nmock-pdf-content')),
  close: jest.fn().mockResolvedValue(undefined)
}

const mockBrowser = {
  newPage: jest.fn().mockResolvedValue(mockPage),
  isConnected: jest.fn().mockReturnValue(true),
  close: jest.fn().mockResolvedValue(undefined),
  version: jest.fn().mockResolvedValue('HeadlessChrome/91.0.4472.0'),
  userAgent: jest.fn().mockResolvedValue('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
  wsEndpoint: jest.fn().mockReturnValue('ws://localhost:9222'),
  on: jest.fn()
}

describe('PDFGenerationService', () => {
  let service: PDFGenerationServiceImpl

  beforeEach(() => {
    // Setup puppeteer mock
    const puppeteer = require('puppeteer-core')
    puppeteer.launch.mockResolvedValue(mockBrowser)
    
    // Reset all mock functions
    Object.values(mockPage).forEach(fn => {
      if (typeof fn === 'function' && fn.mockReset) {
        fn.mockReset()
      }
    })
    Object.values(mockBrowser).forEach(fn => {
      if (typeof fn === 'function' && fn.mockReset) {
        fn.mockReset()
      }
    })
    
    // Restore default mock implementations
    mockPage.setViewport.mockResolvedValue(undefined)
    mockPage.setContent.mockResolvedValue(undefined)
    mockPage.evaluateHandle.mockResolvedValue(undefined)
    mockPage.pdf.mockResolvedValue(Buffer.from('%PDF-1.4\nmock-pdf-content'))
    mockPage.close.mockResolvedValue(undefined)
    
    mockBrowser.newPage.mockResolvedValue(mockPage)
    mockBrowser.isConnected.mockReturnValue(true)
    mockBrowser.close.mockResolvedValue(undefined)
    mockBrowser.version.mockResolvedValue('HeadlessChrome/91.0.4472.0')
    mockBrowser.userAgent.mockResolvedValue('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36')
    mockBrowser.wsEndpoint.mockReturnValue('ws://localhost:9222')
    mockBrowser.on.mockImplementation(() => {})
    
    service = new PDFGenerationServiceImpl()
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await service.cleanup()
  })

  describe('generatePDF', () => {
    const mockHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Test Receipt</title>
        </head>
        <body>
          <h1>領収書</h1>
          <p>テスト内容</p>
        </body>
      </html>
    `

    it('should generate PDF from HTML successfully', async () => {
      const result = await service.generatePDF(mockHtml)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.toString()).toBe('%PDF-1.4\nmock-pdf-content')
      expect(mockPage.setViewport).toHaveBeenCalledWith({
        width: 794,
        height: 1123,
        deviceScaleFactor: 1
      })
      expect(mockPage.setContent).toHaveBeenCalledWith(mockHtml, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000
      })
      expect(mockPage.evaluateHandle).toHaveBeenCalledWith('document.fonts.ready')
      expect(mockPage.pdf).toHaveBeenCalledWith({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        preferCSSPageSize: false,
        displayHeaderFooter: false
      })
    })

    it('should close page after PDF generation', async () => {
      await service.generatePDF(mockHtml)
      expect(mockPage.close).toHaveBeenCalled()
    })

    it('should close page even if PDF generation fails', async () => {
      mockPage.pdf.mockRejectedValueOnce(new Error('PDF generation failed'))

      await expect(service.generatePDF(mockHtml)).rejects.toThrow('PDF generation failed')
      expect(mockPage.close).toHaveBeenCalled()
    })

    it('should handle page close errors gracefully', async () => {
      mockPage.close.mockRejectedValueOnce(new Error('Close failed'))
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await service.generatePDF(mockHtml)

      expect(consoleSpy).toHaveBeenCalledWith('Failed to close page:', expect.any(Error))
      consoleSpy.mockRestore()
    })

    it('should throw error with proper message when PDF generation fails', async () => {
      const error = new Error('Puppeteer timeout')
      mockPage.pdf.mockRejectedValueOnce(error)

      await expect(service.generatePDF(mockHtml)).rejects.toThrow('PDF generation failed in generatePDF: Puppeteer timeout')
    })

    it('should handle unknown errors', async () => {
      mockPage.pdf.mockRejectedValueOnce('Unknown error')

      await expect(service.generatePDF(mockHtml)).rejects.toThrow('PDF generation failed in generatePDF: Unknown error')
    })
  })

  describe('optimizePuppeteer', () => {
    it('should launch browser with correct configuration', async () => {
      const puppeteer = require('puppeteer-core')
      const chromium = require('@sparticuz/chromium')

      await service.optimizePuppeteer()

      expect(chromium.executablePath).toHaveBeenCalled()
      expect(puppeteer.launch).toHaveBeenCalledWith({
        executablePath: '/usr/bin/chromium',
        args: expect.arrayContaining([
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process'
        ]),
        headless: true,
        defaultViewport: null,
        ignoreHTTPSErrors: true,
        timeout: 30000
      })
    })

    it('should reuse existing browser if connected', async () => {
      const puppeteer = require('puppeteer-core')
      
      // First call should create browser
      const browser1 = await service.optimizePuppeteer()
      expect(puppeteer.launch).toHaveBeenCalledTimes(1)

      // Second call should reuse browser
      const browser2 = await service.optimizePuppeteer()
      expect(browser1).toBe(browser2)
      expect(puppeteer.launch).toHaveBeenCalledTimes(1)
    })

    it('should create new browser if existing one is disconnected', async () => {
      const puppeteer = require('puppeteer-core')
      
      // First call
      await service.optimizePuppeteer()
      expect(puppeteer.launch).toHaveBeenCalledTimes(1)

      // Simulate disconnection
      mockBrowser.isConnected.mockReturnValueOnce(false)

      // Second call should create new browser
      await service.optimizePuppeteer()
      expect(puppeteer.launch).toHaveBeenCalledTimes(2)
    })

    it('should handle browser launch errors', async () => {
      const puppeteer = require('puppeteer-core')
      const error = new Error('Failed to launch browser')
      puppeteer.launch.mockRejectedValueOnce(error)

      await expect(service.optimizePuppeteer()).rejects.toThrow('PDF generation failed in browser launch: Failed to launch browser')
    })

    it('should set up browser event handlers', async () => {
      await service.optimizePuppeteer()
      expect(mockBrowser.on).toHaveBeenCalledWith('disconnected', expect.any(Function))
    })
  })

  describe('cleanup', () => {
    it('should close browser and set to null', async () => {
      await service.optimizePuppeteer()
      expect(service.isBrowserReady()).toBe(true)

      await service.cleanup()
      expect(mockBrowser.close).toHaveBeenCalled()
      expect(service.isBrowserReady()).toBe(false)
    })

    it('should handle browser close errors gracefully', async () => {
      await service.optimizePuppeteer()
      mockBrowser.close.mockRejectedValueOnce(new Error('Close failed'))
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      await service.cleanup()

      expect(consoleSpy).toHaveBeenCalledWith('Failed to close browser:', expect.any(Error))
      expect(service.isBrowserReady()).toBe(false)
      consoleSpy.mockRestore()
    })

    it('should do nothing if no browser exists', async () => {
      await service.cleanup()
      expect(mockBrowser.close).not.toHaveBeenCalled()
    })
  })

  describe('isBrowserReady', () => {
    it('should return false when no browser exists', () => {
      expect(service.isBrowserReady()).toBe(false)
    })

    it('should return true when browser is connected', async () => {
      await service.optimizePuppeteer()
      expect(service.isBrowserReady()).toBe(true)
    })

    it('should return false when browser is disconnected', async () => {
      await service.optimizePuppeteer()
      mockBrowser.isConnected.mockReturnValue(false)
      expect(service.isBrowserReady()).toBe(false)
    })
  })

  describe('getBrowserInfo', () => {
    it('should return browser information when connected', async () => {
      await service.optimizePuppeteer()

      const info = await service.getBrowserInfo()

      expect(info).toEqual({
        isConnected: true,
        version: 'HeadlessChrome/91.0.4472.0',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        wsEndpoint: 'ws://localhost:9222'
      })
    })

    it('should return disconnected status when no browser', async () => {
      const info = await service.getBrowserInfo()
      expect(info).toEqual({ isConnected: false })
    })

    it('should return disconnected status when browser is not connected', async () => {
      await service.optimizePuppeteer()
      mockBrowser.isConnected.mockReturnValue(false)

      const info = await service.getBrowserInfo()
      expect(info).toEqual({ isConnected: false })
    })

    it('should handle errors when getting browser info', async () => {
      await service.optimizePuppeteer()
      mockBrowser.version.mockRejectedValueOnce(new Error('Version failed'))
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const info = await service.getBrowserInfo()

      expect(info).toEqual({ isConnected: false })
      expect(consoleSpy).toHaveBeenCalledWith('Failed to get browser info:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })
})

describe('Singleton functions', () => {
  afterEach(async () => {
    await cleanupPDFService()
  })

  describe('getPDFGenerationService', () => {
    it('should return same instance on multiple calls', () => {
      const service1 = getPDFGenerationService()
      const service2 = getPDFGenerationService()
      expect(service1).toBe(service2)
    })

    it('should return PDFGenerationServiceImpl instance', () => {
      const service = getPDFGenerationService()
      expect(service).toBeInstanceOf(PDFGenerationServiceImpl)
    })
  })

  describe('cleanupPDFService', () => {
    it('should cleanup singleton instance', async () => {
      const service = getPDFGenerationService()
      const cleanupSpy = jest.spyOn(service, 'cleanup')

      await cleanupPDFService()

      expect(cleanupSpy).toHaveBeenCalled()
    })

    it('should handle cleanup when no instance exists', async () => {
      await expect(cleanupPDFService()).resolves.not.toThrow()
    })
  })
})