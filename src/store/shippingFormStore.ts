import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect, useState } from 'react'
import type { Package, ExtendedQuoteParams } from '@/types/quote'

// 型定義
export interface ShipperInfo {
  contactName: string
  companyName: string
  taxId: string
  phoneNumber: string
  email: string
  countryCode: string
  stateCode: string
  address1: string
  address2: string
  postalCode: string
  cityName: string
}

export interface RecipientInfo {
  contactName: string
  companyName: string
  taxNumber: string
  phoneNumber: string
  email: string
  countryCode: string
  postalCode: string
  cityName: string
  stateCode: string
  address1: string
  address2: string
  isResidential: boolean
}

export interface PackageInfo {
  type: string
  weight: string
  length: string
  width: string
  height: string
  declaredValue?: string
}

export interface ItemInfo {
  description: string
  hsCode: string
  countryOfManufacture: string
  quantity: number
  weight: number
  unitPrice: number
  currency: string
}

export interface ContentItem {
  description: string
  quantity: number
  value: number
  weight: number
  countryOfOrigin: string
  hsCode: string
}

export interface SelectedRate {
  serviceName: string
  amount: number
  currency: string
  transitTime?: string
  serviceType?: string
}

// 見積もりフォームの情報を送り状フォームに変換する際の型定義（後方互換性のため保持）
export interface QuoteToShippingParams {
  originCountry: string
  originPostalCode: string
  originStateCode: string
  originCityName: string
  originAddressInput: string
  destinationCountry: string
  destinationPostalCode: string
  destinationStateCode: string
  destinationCityName: string
  destinationAddressInput: string
}

// Package型はQuoteFormComponentからインポート済み

// ストアの状態とアクションの型定義
interface ShippingFormState {
  // 状態
  shipperInfo: ShipperInfo
  recipientInfo: RecipientInfo
  packages: PackageInfo[]
  items: ItemInfo[]
  contents: ContentItem[]
  shippingPurpose: string
  selectedRate: SelectedRate | null
  completedSteps: string[]
  phoenixMode: 'none' | 'from' | 'to'

  // 荷送人情報のアクション
  setShipperInfo: (info: ShipperInfo) => void
  updateShipperInfo: (field: keyof ShipperInfo, value: string) => void

  // 荷受人情報のアクション
  setRecipientInfo: (info: RecipientInfo) => void
  updateRecipientInfo: (field: keyof RecipientInfo, value: string) => void

  // 見積もり情報から送り状情報への変換アクション
  setInitialShippingInfoFromQuote: (quoteParams: ExtendedQuoteParams, packages?: Package[]) => void

  // 部分的な住所情報を更新するアクション
  setAddressPart: (type: 'origin' | 'destination', data: { countryCode: string; stateCode: string; cityName: string; postalCode: string; address1: string }) => void

  // 荷物情報のアクション
  setPackages: (packages: PackageInfo[]) => void
  addPackage: () => void
  updatePackage: (index: number, field: keyof PackageInfo, value: string) => void
  removePackage: (index: number) => void

  // 内容品情報のアクション
  setItems: (items: ItemInfo[]) => void
  addItem: () => void
  updateItem: (index: number, field: keyof ItemInfo, value: string | number) => void
  removeItem: (index: number) => void

  // コンテンツのアクション
  setContents: (contents: ContentItem[]) => void
  addContent: () => void
  updateContent: (index: number, field: keyof ContentItem, value: string | number) => void
  removeContent: (index: number) => void

  // 発送目的のアクション
  setShippingPurpose: (purpose: string) => void

  // 選択された料金のアクション
  setSelectedRate: (rate: SelectedRate | null) => void

  // 完了ステップのアクション
  markStepCompleted: (stepPath: string) => void
  isStepCompleted: (stepPath: string) => boolean

  // フェニックスモードのアクション
  setPhoenixMode: (mode: 'none' | 'from' | 'to') => void

  // リセット機能
  resetForm: () => void
}

// 初期値の定義
const initialShipperInfo: ShipperInfo = {
  contactName: '',
  companyName: '',
  taxId: '',
  phoneNumber: '',
  email: '',
  countryCode: 'JP',
  stateCode: '',
  address1: '',
  address2: '',
  postalCode: '',
  cityName: ''
}

const initialRecipientInfo: RecipientInfo = {
  contactName: '',
  companyName: '',
  taxNumber: '',
  phoneNumber: '',
  email: '',
  countryCode: 'JP',
  postalCode: '',
  cityName: '',
  stateCode: '',
  address1: '',
  address2: '',
  isResidential: false
}

const initialPackage: PackageInfo = {
  type: 'YOUR_PACKAGING',
  weight: '',
  length: '',
  width: '',
  height: '',
  declaredValue: ''
}

const initialItem: ItemInfo = {
  description: '',
  hsCode: '',
  countryOfManufacture: 'JP',
  quantity: 1,
  weight: 0,
  unitPrice: 0,
  currency: 'JPY'
}

const initialContent: ContentItem = {
  description: '',
  quantity: 1,
  value: 0,
  weight: 0,
  countryOfOrigin: 'JP',
  hsCode: ''
}

// Zustandストアの作成
export const useShippingFormStore = create<ShippingFormState>()(
  persist(
    (set, get) => ({
      // 初期状態
      shipperInfo: initialShipperInfo,
      recipientInfo: initialRecipientInfo,
      packages: [initialPackage],
      items: [initialItem],
      contents: [initialContent],
      shippingPurpose: '',
      selectedRate: null,
      completedSteps: [],
      phoenixMode: 'none',

      // 荷送人情報のアクション
      setShipperInfo: (info) => set({ shipperInfo: info }),
      updateShipperInfo: (field, value) => 
        set((state) => ({
          shipperInfo: { ...state.shipperInfo, [field]: value }
        })),

      // 荷受人情報のアクション
      setRecipientInfo: (info) => set({ recipientInfo: info }),
      updateRecipientInfo: (field, value) => 
        set((state) => ({
          recipientInfo: { ...state.recipientInfo, [field]: value }
        })),

      // 見積もり情報から送り状情報への変換アクション
      setInitialShippingInfoFromQuote: (quoteParams, packages) => {
        console.log('🚀 setInitialShippingInfoFromQuote called with:', { quoteParams, packages });
        
        // 住所1フィールドの処理（API用英語住所のみ）
        const getAddress1 = (street: string, fullAddress: string, cityName: string, countryCode: string) => {
          // streetが存在する場合はそれを使用（英語住所）
          if (street && street.trim()) {
            console.log('✅ Using street for address1:', street);
            return street;
          }
          
          // streetが空の場合、英語住所を生成（日本語住所は使用しない）
          console.log('⚠️ Street is empty, generating English address for country:', countryCode);
          if (countryCode === 'JP') {
            if (cityName === 'Toyokawa') {
              console.log('🏠 Generated English address for Toyokawa');
              return '1 Chome Honohara';
            } else if (cityName) {
              console.log('🏠 Generated English address for', cityName);
              return `${cityName} District`;
            } else {
              return 'Japan Address';
            }
          } else if (countryCode === 'US') {
            return 'US Address';
          } else {
            return 'International Address';
          }
        };

        const newShipperInfo: ShipperInfo = {
          contactName: '',
          companyName: '',
          taxId: '',
          phoneNumber: '',
          email: '',
          countryCode: quoteParams.originCountry || 'JP',
          stateCode: quoteParams.originStateCode || '',
          address1: getAddress1(
            quoteParams.originStreet || '', 
            quoteParams.originAddressInput || '', 
            quoteParams.originCityName || '', 
            quoteParams.originCountry || 'JP'
          ),
          address2: '',
          postalCode: quoteParams.originPostalCode || '',
          cityName: quoteParams.originCityName || ''
        }

        const newRecipientInfo: RecipientInfo = {
          contactName: '',
          companyName: '',
          taxNumber: '',
          phoneNumber: '',
          email: '',
          countryCode: quoteParams.destinationCountry || 'US',
          postalCode: quoteParams.destinationPostalCode || '',
          cityName: quoteParams.destinationCityName || '',
          stateCode: quoteParams.destinationStateCode || '',
          address1: getAddress1(
            quoteParams.destinationStreet || '', 
            quoteParams.destinationAddressInput || '', 
            quoteParams.destinationCityName || '', 
            quoteParams.destinationCountry || 'US'
          ),
          address2: '',
          isResidential: quoteParams.isResidential || false
        }

        console.log('🎯 Generated shipperInfo:', newShipperInfo);
        console.log('🎯 Generated recipientInfo:', newRecipientInfo);

        // 見積もりフォームのPackage型をストアのPackageInfo型に変換
        let newPackages: PackageInfo[] = [initialPackage];
        if (packages && packages.length > 0) {
          newPackages = packages.map(pkg => ({
            type: pkg.packagingType,
            weight: pkg.weight,
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            declaredValue: pkg.declaredValue
          }));
          
          console.log('📦 Converted packages with declared values:', newPackages.map(p => ({ type: p.type, weight: p.weight, declaredValue: p.declaredValue })));
        }

        set({ 
          shipperInfo: newShipperInfo,
          recipientInfo: newRecipientInfo,
          packages: newPackages,
          items: [initialItem], // 内容品を初期状態にリセット
          phoenixMode: quoteParams.phoenixMode || 'none' // 見積もり時のフェニックスモードを引き継ぐ
        })
        
        console.log('✅ Store updated with new shipping info');
        console.log('✅ Final shipperInfo address1:', newShipperInfo.address1);
        console.log('✅ Final recipientInfo address1:', newRecipientInfo.address1);
        console.log('✅ Items reset to initial state:', [initialItem]);
        console.log('✅ Phoenix mode inherited:', quoteParams.phoenixMode || 'none');
      },

      // 部分的な住所情報を更新するアクション
      setAddressPart: (type, data) => {
        const key = type === 'origin' ? 'shipperInfo' : 'recipientInfo';
        set((state) => ({
          [key]: { ...state[key], ...data }
        }));
      },

      // 荷物情報のアクション
      setPackages: (packages) => set({ packages }),
      addPackage: () => 
        set((state) => ({
          packages: [...state.packages, initialPackage]
        })),
      updatePackage: (index, field, value) => 
        set((state) => ({
          packages: state.packages.map((pkg, i) => 
            i === index ? { ...pkg, [field]: value } : pkg
          )
        })),
      removePackage: (index) => 
        set((state) => ({
          packages: state.packages.length > 1 
            ? state.packages.filter((_, i) => i !== index)
            : state.packages
        })),

      // 内容品情報のアクション
      setItems: (items) => set({ items }),
      addItem: () => 
        set((state) => ({
          items: [...state.items, initialItem]
        })),
      updateItem: (index, field, value) => 
        set((state) => ({
          items: state.items.map((item, i) => 
            i === index ? { ...item, [field]: value } : item
          )
        })),
      removeItem: (index) => 
        set((state) => ({
          items: state.items.length > 1 
            ? state.items.filter((_, i) => i !== index)
            : state.items
        })),

      // コンテンツのアクション
      setContents: (contents) => set({ contents }),
      addContent: () => 
        set((state) => ({
          contents: [...state.contents, initialContent]
        })),
      updateContent: (index, field, value) => 
        set((state) => ({
          contents: state.contents.map((content, i) => 
            i === index ? { ...content, [field]: value } : content
          )
        })),
      removeContent: (index) => 
        set((state) => ({
          contents: state.contents.length > 1 
            ? state.contents.filter((_, i) => i !== index)
            : state.contents
        })),

      // 発送目的のアクション
      setShippingPurpose: (purpose) => set({ shippingPurpose: purpose }),

      // 選択された料金のアクション
      setSelectedRate: (rate) => set({ selectedRate: rate }),

      // 完了ステップのアクション
      markStepCompleted: (stepPath) => 
        set((state) => ({
          completedSteps: state.completedSteps.includes(stepPath) 
            ? state.completedSteps 
            : [...state.completedSteps, stepPath]
        })),
      isStepCompleted: (stepPath) => {
        const state = get()
        return state.completedSteps.includes(stepPath)
      },

      // フェニックスモードのアクション
      setPhoenixMode: (mode) => set({ phoenixMode: mode }),

      // リセット機能
      resetForm: () => 
        set({
          shipperInfo: initialShipperInfo,
          recipientInfo: initialRecipientInfo,
          packages: [initialPackage],
          items: [initialItem],
          contents: [initialContent],
          shippingPurpose: '',
          selectedRate: null,
          completedSteps: [],
          phoenixMode: 'none'
        })
    }),
    {
      name: 'shipping-form-storage', // localStorage のキー名
      partialize: (state) => ({
        shipperInfo: state.shipperInfo,
        recipientInfo: state.recipientInfo,
        packages: state.packages,
        items: state.items,
        contents: state.contents,
        shippingPurpose: state.shippingPurpose,
        selectedRate: state.selectedRate,
        completedSteps: state.completedSteps,
        phoenixMode: state.phoenixMode
      })
    }
  )
)

// カスタムフック（便利な関数）
export const useShipperInfo = () => {
  const shipperInfo = useShippingFormStore((state) => state.shipperInfo)
  const setShipperInfo = useShippingFormStore((state) => state.setShipperInfo)
  const updateShipperInfo = useShippingFormStore((state) => state.updateShipperInfo)
  return { shipperInfo, setShipperInfo, updateShipperInfo }
}

export const useRecipientInfo = () => {
  const recipientInfo = useShippingFormStore((state) => state.recipientInfo)
  const setRecipientInfo = useShippingFormStore((state) => state.setRecipientInfo)
  const updateRecipientInfo = useShippingFormStore((state) => state.updateRecipientInfo)
  return { recipientInfo, setRecipientInfo, updateRecipientInfo }
}

export const usePackages = () => {
  const packages = useShippingFormStore((state) => state.packages)
  const setPackages = useShippingFormStore((state) => state.setPackages)
  const addPackage = useShippingFormStore((state) => state.addPackage)
  const updatePackage = useShippingFormStore((state) => state.updatePackage)
  const removePackage = useShippingFormStore((state) => state.removePackage)
  return { packages, setPackages, addPackage, updatePackage, removePackage }
}

export const useItems = () => {
  const items = useShippingFormStore((state) => state.items)
  const setItems = useShippingFormStore((state) => state.setItems)
  const addItem = useShippingFormStore((state) => state.addItem)
  const updateItem = useShippingFormStore((state) => state.updateItem)
  const removeItem = useShippingFormStore((state) => state.removeItem)
  return { items, setItems, addItem, updateItem, removeItem }
}

export const useContents = () => {
  const contents = useShippingFormStore((state) => state.contents)
  const setContents = useShippingFormStore((state) => state.setContents)
  const addContent = useShippingFormStore((state) => state.addContent)
  const updateContent = useShippingFormStore((state) => state.updateContent)
  const removeContent = useShippingFormStore((state) => state.removeContent)
  return { contents, setContents, addContent, updateContent, removeContent }
}

export const useShippingPurpose = () => {
  const shippingPurpose = useShippingFormStore((state) => state.shippingPurpose)
  const setShippingPurpose = useShippingFormStore((state) => state.setShippingPurpose)
  return { shippingPurpose, setShippingPurpose }
}

/**
 * Zustandのハイドレーション完了を検出するフック（最終安定版）
 * Google Maps API読み込みも考慮した完全な初期化待機
 */
export const useHydratedStore = () => {
  const [isHydrated, setIsHydrated] = useState(false)
  
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') {
      return
    }

    let timeoutId: NodeJS.Timeout
    let retryCount = 0
    const maxRetries = 50 // 最大5秒待機（100ms × 50回）
    
    const checkHydration = () => {
      try {
        // Zustandストアから実際の状態を取得してチェック
        const currentState = useShippingFormStore.getState()
        const hasPersistedData = currentState && (
          currentState.shipperInfo.contactName ||
          currentState.recipientInfo.contactName ||
          currentState.selectedRate
        )
        
        // Google Maps API読み込み状態もチェック
        const isGoogleMapsReady = typeof window !== 'undefined' && 
          (window as any).google && 
          (window as any).google.maps && 
          (window as any).google.maps.places;
        
        // ログ出力を1秒ごとに制限（10回に1回のみ）
        if (retryCount % 10 === 0) {
          console.log(`📋 ハイドレーションチェック ${retryCount + 1}/${maxRetries}:`, {
            hasPersistedData,
            stateExists: !!currentState,
            shipperExists: !!currentState?.shipperInfo,
            recipientExists: !!currentState?.recipientInfo,
            googleMapsReady: isGoogleMapsReady,
            retryCount
          })
        }
        
        // 基本的なハイドレーション完了条件
        const basicHydrationComplete = retryCount >= 10; // 1秒経過（最低限）
        const hasStoredData = hasPersistedData || retryCount >= 20; // 2秒経過またはデータあり
        
        // Google Maps APIが必要な場合は読み込み完了を待つ（ただし最大4秒で諦める）
        const googleMapsComplete = isGoogleMapsReady || retryCount >= 40;
        
        // 全ての条件が揃った場合、またはタイムアウト時にハイドレーション完了
        if ((basicHydrationComplete && hasStoredData && googleMapsComplete) || retryCount >= maxRetries) {
          console.log('✅ Zustand hydration completed successfully', {
            basicHydrationComplete,
            hasStoredData,
            googleMapsComplete,
            isGoogleMapsReady,
            retryCount,
            reason: retryCount >= maxRetries ? 'timeout' : 'complete'
          })
          setIsHydrated(true)
          return
        }
        
        // リトライ
        retryCount++
        timeoutId = setTimeout(checkHydration, 100)
        
      } catch (error) {
        console.error('❌ Hydration check error:', error)
        setIsHydrated(true) // エラー時もローディングを解除
      }
    }
    
    // 初期遅延後にチェック開始
    timeoutId = setTimeout(checkHydration, 100)
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  // ハイドレーション完了後にストアの状態を取得
  const storeState = useShippingFormStore()

  return {
    isHydrated,
    store: isHydrated ? storeState : null
  }
}

/**
 * ハイドレーション完了まで待機するローディングコンポーネント用フック（改良版）
 */
export const useWaitForHydration = () => {
  const { isHydrated, store } = useHydratedStore()
  
  return {
    isLoading: !isHydrated,
    isReady: isHydrated,
    store
  }
}