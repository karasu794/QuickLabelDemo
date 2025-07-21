import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Open Shipmentの状態管理用インターフェース
export interface MPSShipment {
  id?: string // Database ID
  masterTrackingNumber?: string
  fedexIndex?: string
  status: 'draft' | 'created' | 'in_progress' | 'processing' | 'confirmed' | 'cancelled'
  totalPackages: number
  packagesAdded: number
  serviceType: string
  createdAt?: string
  confirmedAt?: string
}

export interface MPSPackage {
  id: string // フロントエンド用ID
  sequenceNumber: number
  weight: string
  type: string
  length?: string
  width?: string
  height?: string
  declaredValue?: string
  addedToFedEx: boolean // FedXに追加済みかどうか
}

export interface MPSShipperInfo {
  companyName: string
  contactName: string
  taxId?: string
  postalCode: string
  phoneNumber: string
  countryCode: string
  stateCode?: string
  cityName: string
  address1: string
  address2?: string
}

export interface MPSRecipientInfo {
  companyName: string
  contactName: string
  taxNumber?: string
  postalCode: string
  phoneNumber: string
  email: string
  countryCode: string
  stateCode?: string
  cityName: string
  address1: string
  address2?: string
  isResidential: boolean
}

export interface MPSItem {
  description: string
  countryOfManufacture: string
  quantity: number
  weight: number
  unitPrice: number
  currency: string
  hsCode?: string
}

export interface MPSPayment {
  sourceId?: string // Square決済トークン
  finalCharge?: number
  paymentId?: string // 決済完了後のID
}

// ストアの状態とアクションの型定義
interface MPSState {
  // Open Shipment情報
  shipment: MPSShipment | null
  
  // 送り状情報
  shipperInfo: MPSShipperInfo
  recipientInfo: MPSRecipientInfo
  
  // パッケージ情報
  packages: MPSPackage[]
  
  // 内容品情報
  items: MPSItem[]
  
  // 決済情報
  payment: MPSPayment
  
  // UI状態
  currentStep: 'setup' | 'add-packages' | 'confirm'
  isLoading: boolean
  error: string | null
  
  // アクション
  // Open Shipment管理
  setShipment: (shipment: MPSShipment) => void
  updateShipmentStatus: (status: MPSShipment['status']) => void
  
  // 送り状情報
  setShipperInfo: (info: MPSShipperInfo) => void
  updateShipperInfo: (field: keyof MPSShipperInfo, value: string) => void
  setRecipientInfo: (info: MPSRecipientInfo) => void
  updateRecipientInfo: (field: keyof MPSRecipientInfo, value: string | boolean) => void
  
  // パッケージ管理
  addPackage: () => void
  updatePackage: (id: string, field: keyof MPSPackage, value: string | number | boolean) => void
  removePackage: (id: string) => void
  markPackageAddedToFedEx: (id: string, sequenceNumber: number) => void
  resetPackages: () => void
  
  // 内容品管理
  addItem: () => void
  updateItem: (index: number, field: keyof MPSItem, value: string | number) => void
  removeItem: (index: number) => void
  setItems: (items: MPSItem[]) => void
  
  // 決済情報
  setPayment: (payment: MPSPayment) => void
  
  // UI状態管理
  setCurrentStep: (step: 'setup' | 'add-packages' | 'confirm') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // リセット
  resetAll: () => void
  
  // 見積もりデータからのインポート
  importFromQuote: (quoteParams: any, packages: any[], items: any[]) => void
}

// 初期値
const initialShipperInfo: MPSShipperInfo = {
  companyName: '',
  contactName: '',
  postalCode: '',
  phoneNumber: '',
  countryCode: 'JP',
  cityName: '',
  address1: ''
}

const initialRecipientInfo: MPSRecipientInfo = {
  companyName: '',
  contactName: '',
  postalCode: '',
  phoneNumber: '',
  email: '',
  countryCode: 'US',
  cityName: '',
  address1: '',
  isResidential: false
}

const initialItem: MPSItem = {
  description: '',
  countryOfManufacture: 'JP',
  quantity: 1,
  weight: 0,
  unitPrice: 0,
  currency: 'JPY'
}

const createInitialPackage = (sequenceNumber: number): MPSPackage => ({
  id: `pkg-${Date.now()}-${sequenceNumber}`,
  sequenceNumber,
  weight: '',
  type: 'YOUR_PACKAGING',
  addedToFedEx: false
})

// パッケージIDを生成
const generatePackageId = () => `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const useMPSStore = create<MPSState>()(
  persist(
    (set, get) => ({
      // 初期状態
      shipment: null,
      shipperInfo: initialShipperInfo,
      recipientInfo: initialRecipientInfo,
      packages: [createInitialPackage(1)],
      items: [initialItem],
      payment: {},
      currentStep: 'setup',
      isLoading: false,
      error: null,

      // Open Shipment管理
      setShipment: (shipment) => set({ shipment }),
      updateShipmentStatus: (status) => 
        set((state) => ({
          shipment: state.shipment ? { ...state.shipment, status } : null
        })),

      // 送り状情報
      setShipperInfo: (info) => set({ shipperInfo: info }),
      updateShipperInfo: (field, value) =>
        set((state) => ({
          shipperInfo: { ...state.shipperInfo, [field]: value }
        })),
      setRecipientInfo: (info) => set({ recipientInfo: info }),
      updateRecipientInfo: (field, value) =>
        set((state) => ({
          recipientInfo: { ...state.recipientInfo, [field]: value }
        })),

      // パッケージ管理
      addPackage: () => {
        const state = get()
        const nextSequence = state.packages.length + 1
        set({
          packages: [...state.packages, createInitialPackage(nextSequence)]
        })
      },
      updatePackage: (id, field, value) =>
        set((state) => ({
          packages: state.packages.map(pkg =>
            pkg.id === id ? { ...pkg, [field]: value } : pkg
          )
        })),
      removePackage: (id) =>
        set((state) => ({
          packages: state.packages.length > 1 
            ? state.packages.filter(pkg => pkg.id !== id)
            : state.packages
        })),
      markPackageAddedToFedEx: (id, sequenceNumber) =>
        set((state) => ({
          packages: state.packages.map(pkg =>
            pkg.id === id 
              ? { ...pkg, addedToFedEx: true, sequenceNumber } 
              : pkg
          )
        })),
      resetPackages: () => set({ packages: [createInitialPackage(1)] }),

      // 内容品管理
      addItem: () =>
        set((state) => ({
          items: [...state.items, { ...initialItem }]
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
      setItems: (items) => set({ items }),

      // 決済情報
      setPayment: (payment) => set({ payment }),

      // UI状態管理
      setCurrentStep: (step) => set({ currentStep: step }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // リセット
      resetAll: () => set({
        shipment: null,
        shipperInfo: initialShipperInfo,
        recipientInfo: initialRecipientInfo,
        packages: [createInitialPackage(1)],
        items: [initialItem],
        payment: {},
        currentStep: 'setup',
        isLoading: false,
        error: null
      }),

      // 見積もりデータからのインポート
      importFromQuote: (quoteParams, packages, items) => {
        // 見積もりデータから送り状情報を構築
        const newShipperInfo: MPSShipperInfo = {
          companyName: quoteParams.originCompanyName || '',
          contactName: quoteParams.originContactName || '',
          postalCode: quoteParams.originPostalCode || '',
          phoneNumber: quoteParams.originPhoneNumber || '',
          countryCode: quoteParams.originCountry || 'JP',
          stateCode: quoteParams.originStateCode,
          cityName: quoteParams.originCityName || '',
          address1: quoteParams.originAddress1 || ''
        }

        const newRecipientInfo: MPSRecipientInfo = {
          companyName: quoteParams.destinationCompanyName || '',
          contactName: quoteParams.destinationContactName || '',
          postalCode: quoteParams.destinationPostalCode || '',
          phoneNumber: quoteParams.destinationPhoneNumber || '',
          email: quoteParams.destinationEmail || '',
          countryCode: quoteParams.destinationCountry || 'US',
          stateCode: quoteParams.destinationStateCode,
          cityName: quoteParams.destinationCityName || '',
          address1: quoteParams.destinationAddress1 || '',
          isResidential: quoteParams.isResidential || false
        }

        // パッケージデータの変換
        const newPackages: MPSPackage[] = packages.map((pkg, index) => ({
          id: generatePackageId(),
          sequenceNumber: index + 1,
          weight: pkg.weight || '',
          type: pkg.packagingType || 'YOUR_PACKAGING',
          length: pkg.length,
          width: pkg.width,
          height: pkg.height,
          declaredValue: pkg.declaredValue,
          addedToFedEx: false
        }))

        // 内容品データの変換
        const newItems: MPSItem[] = items.map(item => ({
          description: item.description || '',
          countryOfManufacture: item.countryOfManufacture || 'JP',
          quantity: item.quantity || 1,
          weight: item.weight || 0,
          unitPrice: item.unitPrice || 0,
          currency: item.currency || 'JPY',
          hsCode: item.hsCode
        }))

        set({
          shipperInfo: newShipperInfo,
          recipientInfo: newRecipientInfo,
          packages: newPackages.length > 0 ? newPackages : [createInitialPackage(1)],
          items: newItems.length > 0 ? newItems : [initialItem],
          currentStep: 'setup',
          error: null
        })

        console.log('✅ MPSストアに見積もりデータをインポート完了')
      }
    }),
    {
      name: 'mps-store',
      // shipmentとUI状態は永続化しない（セッション管理のため）
      partialize: (state) => ({
        shipperInfo: state.shipperInfo,
        recipientInfo: state.recipientInfo,
        packages: state.packages,
        items: state.items,
        payment: state.payment
      })
    }
  )
) 