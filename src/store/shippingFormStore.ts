import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 型定義
export interface ShipperInfo {
  contactName: string
  companyName: string
  taxId: string
  phoneNumber: string
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
}

export interface PackageInfo {
  type: string
  weight: string
  length: string
  width: string
  height: string
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

// 見積もりフォームの情報を送り状フォームに変換する際の型定義
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

  // 荷送人情報のアクション
  setShipperInfo: (info: ShipperInfo) => void
  updateShipperInfo: (field: keyof ShipperInfo, value: string) => void

  // 荷受人情報のアクション
  setRecipientInfo: (info: RecipientInfo) => void
  updateRecipientInfo: (field: keyof RecipientInfo, value: string) => void

  // 見積もり情報から送り状情報への変換アクション
  setInitialShippingInfoFromQuote: (quoteParams: QuoteToShippingParams) => void

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

  // リセット機能
  resetForm: () => void
}

// 初期値の定義
const initialShipperInfo: ShipperInfo = {
  contactName: '',
  companyName: '',
  taxId: '',
  phoneNumber: '',
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
  address2: ''
}

const initialPackage: PackageInfo = {
  type: 'YOUR_PACKAGING',
  weight: '',
  length: '',
  width: '',
  height: ''
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
      setInitialShippingInfoFromQuote: (quoteParams) => {
        console.log('📋 Setting initial shipping info from quote:', quoteParams);
        
        const newShipperInfo: ShipperInfo = {
          contactName: '',
          companyName: '',
          taxId: '',
          phoneNumber: '',
          countryCode: quoteParams.originCountry || 'JP',
          stateCode: quoteParams.originStateCode || '',
          address1: quoteParams.originAddressInput || '',
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
          address1: quoteParams.destinationAddressInput || '',
          address2: ''
        }

        console.log('🚚 Generated shipper info (English):', {
          country: newShipperInfo.countryCode,
          state: newShipperInfo.stateCode,
          city: newShipperInfo.cityName,
          address: newShipperInfo.address1,
          postalCode: newShipperInfo.postalCode
        });
        
        console.log('📦 Generated recipient info (English):', {
          country: newRecipientInfo.countryCode,
          state: newRecipientInfo.stateCode,
          city: newRecipientInfo.cityName,
          address: newRecipientInfo.address1,
          postalCode: newRecipientInfo.postalCode
        });

        set({ 
          shipperInfo: newShipperInfo,
          recipientInfo: newRecipientInfo
        })
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
          completedSteps: []
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
        completedSteps: state.completedSteps
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