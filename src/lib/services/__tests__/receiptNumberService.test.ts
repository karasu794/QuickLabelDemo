/**
 * 📋 ReceiptNumberService のテストケース
 * 
 * 要件:
 * - 2.1: YYMMDD + 0 + 日ごとの連番4桁の形式で領収書番号を生成
 * - 2.2: 同日に複数の領収書が生成される場合、連番を正しくインクリメント
 * - 2.3: 日付が変わった場合、連番を0001にリセット
 */

// Mock Supabase before importing the service
jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(() => ({
    from: jest.fn()
  }))
}))

import { ReceiptNumberServiceImpl } from '../receiptNumberService'

describe('ReceiptNumberService', () => {
  describe('Static utility methods', () => {
    describe('validateReceiptNumberFormat', () => {
      it('should validate correct receipt number format', () => {
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat('24031500001')).toBe(true)
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat('24123109999')).toBe(true)
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat('25010100001')).toBe(true)
      })

      it('should reject invalid receipt number formats', () => {
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat('2403150001')).toBe(false) // 桁数不足 (10桁)
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat('240315000001')).toBe(false) // 桁数過多 (12桁)
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat('24031510001')).toBe(false) // 7桁目が0でない
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat('2403150000a')).toBe(false) // 数字以外
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat('')).toBe(false) // 空文字
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat('abcdefghijk')).toBe(false) // 全て文字
      })
    })

    describe('extractDateKey', () => {
      it('should extract date key from valid receipt number', () => {
        expect(ReceiptNumberServiceImpl.extractDateKey('24031500001')).toBe('240315')
        expect(ReceiptNumberServiceImpl.extractDateKey('24123109999')).toBe('241231')
        expect(ReceiptNumberServiceImpl.extractDateKey('25010100001')).toBe('250101')
      })

      it('should throw error for invalid receipt number', () => {
        expect(() => ReceiptNumberServiceImpl.extractDateKey('invalid')).toThrow('無効な領収書番号形式です')
        expect(() => ReceiptNumberServiceImpl.extractDateKey('2403150001')).toThrow('無効な領収書番号形式です')
      })
    })

    describe('extractSequenceNumber', () => {
      it('should extract sequence number from valid receipt number', () => {
        expect(ReceiptNumberServiceImpl.extractSequenceNumber('24031500001')).toBe(1)
        expect(ReceiptNumberServiceImpl.extractSequenceNumber('24031500123')).toBe(123)
        expect(ReceiptNumberServiceImpl.extractSequenceNumber('24031509999')).toBe(9999)
      })

      it('should throw error for invalid receipt number', () => {
        expect(() => ReceiptNumberServiceImpl.extractSequenceNumber('invalid')).toThrow('無効な領収書番号形式です')
        expect(() => ReceiptNumberServiceImpl.extractSequenceNumber('2403150001')).toThrow('無効な領収書番号形式です')
      })
    })
  })

  describe('Date formatting', () => {
    it('should format date keys correctly', () => {
      const service = new ReceiptNumberServiceImpl()
      
      // プライベートメソッドをテストするため、any型でキャスト
      const formatDateKey = (service as any).formatDateKey.bind(service)
      
      expect(formatDateKey(new Date('2024-03-15'))).toBe('240315')
      expect(formatDateKey(new Date('2024-12-31'))).toBe('241231')
      expect(formatDateKey(new Date('2025-01-01'))).toBe('250101')
      expect(formatDateKey(new Date('2024-02-29'))).toBe('240229') // うるう年
    })

    it('should format receipt numbers correctly', () => {
      const service = new ReceiptNumberServiceImpl()
      
      // プライベートメソッドをテストするため、any型でキャスト
      const formatReceiptNumber = (service as any).formatReceiptNumber.bind(service)
      
      expect(formatReceiptNumber('240315', 1)).toBe('24031500001')
      expect(formatReceiptNumber('240315', 123)).toBe('24031500123')
      expect(formatReceiptNumber('240315', 9999)).toBe('24031509999')
      expect(formatReceiptNumber('241231', 1)).toBe('24123100001')
    })
  })

  describe('Edge cases and boundary conditions', () => {
    it('should handle leap year dates correctly', () => {
      const service = new ReceiptNumberServiceImpl()
      const formatDateKey = (service as any).formatDateKey.bind(service)
      
      // 2024年はうるう年
      expect(formatDateKey(new Date('2024-02-29'))).toBe('240229')
      
      // 2023年はうるう年ではない
      expect(formatDateKey(new Date('2023-02-28'))).toBe('230228')
    })

    it('should handle year boundary correctly', () => {
      const service = new ReceiptNumberServiceImpl()
      const formatDateKey = (service as any).formatDateKey.bind(service)
      
      expect(formatDateKey(new Date('2024-12-31'))).toBe('241231')
      expect(formatDateKey(new Date('2025-01-01'))).toBe('250101')
    })

    it('should handle maximum sequence number (9999)', () => {
      const service = new ReceiptNumberServiceImpl()
      const formatReceiptNumber = (service as any).formatReceiptNumber.bind(service)
      
      expect(formatReceiptNumber('240315', 9999)).toBe('24031509999')
      
      // 10000を超える場合（実際の運用では制御が必要）
      expect(formatReceiptNumber('240315', 10000)).toBe('240315010000')
    })
  })

  describe('Format validation comprehensive tests', () => {
    it('should validate various date formats', () => {
      // 有効な形式
      const validNumbers = [
        '24031500001', // 通常の日付
        '24123100001', // 年末
        '25010100001', // 年始
        '24022900001', // うるう年
        '24031509999', // 最大連番
      ]

      validNumbers.forEach(number => {
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat(number)).toBe(true)
      })

      // 無効な形式
      const invalidNumbers = [
        '2403150001',   // 10桁（短い）
        '240315000001', // 12桁（長い）
        '24031510001',  // 7桁目が1
        '24031520001',  // 7桁目が2
        '2403150000a',  // 文字が含まれる
        '240315000a1',  // 途中に文字
        'a4031500001',  // 先頭が文字
        '24031500001a', // 末尾が文字
        '',             // 空文字
      ]

      invalidNumbers.forEach(number => {
        expect(ReceiptNumberServiceImpl.validateReceiptNumberFormat(number)).toBe(false)
      })
    })

    it('should extract components correctly from various receipt numbers', () => {
      const testCases = [
        { number: '24031500001', dateKey: '240315', sequence: 1 },
        { number: '24123109999', dateKey: '241231', sequence: 9999 },
        { number: '25010100123', dateKey: '250101', sequence: 123 },
        { number: '24022900456', dateKey: '240229', sequence: 456 },
      ]

      testCases.forEach(({ number, dateKey, sequence }) => {
        expect(ReceiptNumberServiceImpl.extractDateKey(number)).toBe(dateKey)
        expect(ReceiptNumberServiceImpl.extractSequenceNumber(number)).toBe(sequence)
      })
    })
  })
})

// 統合テスト用のモック（実際のデータベース操作をテストする場合）
describe('ReceiptNumberService Integration Tests (Mocked)', () => {
  // 注意: これらのテストは実際のSupabaseクライアントのモックが必要
  // 現在は基本的な機能テストのみを実装
  
  it('should be ready for integration testing', () => {
    // このテストは、統合テストの準備ができていることを示す
    expect(ReceiptNumberServiceImpl).toBeDefined()
    expect(typeof ReceiptNumberServiceImpl.validateReceiptNumberFormat).toBe('function')
    expect(typeof ReceiptNumberServiceImpl.extractDateKey).toBe('function')
    expect(typeof ReceiptNumberServiceImpl.extractSequenceNumber).toBe('function')
  })
})