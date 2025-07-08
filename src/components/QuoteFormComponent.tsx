"use client"

import React from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Checkbox } from "./ui/checkbox"
import { Plus, X, Loader2 } from "lucide-react"

export interface Package {
  id: number
  packagingType: string
  weight: string
  length: string
  width: string
  height: string
}

export interface QuoteParams {
  originCountry: string
  originPostalCode: string
  destinationCountry: string
  destinationPostalCode: string
  shipDate: string
  isResidential: boolean
  higherInsurance: boolean
}

interface QuoteFormProps {
  quoteParams: QuoteParams
  packages: Package[]
  isLoading: boolean
  error: string
  onQuoteParamsChange: (field: keyof QuoteParams, value: string | boolean) => void
  onPackageChange: (id: number, field: keyof Package, value: string) => void
  onAddPackage: () => void
  onRemovePackage: (id: number) => void
  onSubmit: (e: React.FormEvent) => void
  originAutocomplete?: React.ReactNode
  destinationAutocomplete?: React.ReactNode
}

export default function QuoteFormComponent({
  quoteParams,
  packages,
  isLoading,
  error,
  onQuoteParamsChange,
  onPackageChange,
  onAddPackage,
  onRemovePackage,
  onSubmit,
  originAutocomplete,
  destinationAutocomplete
}: QuoteFormProps) {
  const getTotalWeight = () => {
    return packages
      .reduce((total, pkg) => {
        const weight = Number.parseFloat(pkg.weight) || 0
        return total + weight
      }, 0)
      .toFixed(1)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Main Title */}
        <h1 className="text-4xl font-bold text-center mb-12 text-gray-900">フェデックス運送料金の計算</h1>

        <Card className="shadow-lg">
          <CardContent className="p-8 space-y-8">
            <form onSubmit={onSubmit}>
              {/* Origin/Destination Section */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="origin-country" className="text-lg font-medium">
                      出荷地（国）
                    </Label>
                    <Select value={quoteParams.originCountry} onValueChange={(value: string) => onQuoteParamsChange("originCountry", value)}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="出荷地の国を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="JP">日本</SelectItem>
                        <SelectItem value="US">アメリカ</SelectItem>
                        <SelectItem value="CN">中国</SelectItem>
                        <SelectItem value="KR">韓国</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="origin-postal" className="text-lg font-medium">
                      出荷地（住所）
                    </Label>
                    {originAutocomplete || (
                      <Input 
                        id="origin-postal" 
                        placeholder="例: 150-0002" 
                        className="h-12 text-base"
                        value={quoteParams.originPostalCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onQuoteParamsChange("originPostalCode", e.target.value)}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="destination-country" className="text-lg font-medium">
                      仕向地（国）
                    </Label>
                    <Select value={quoteParams.destinationCountry} onValueChange={(value: string) => onQuoteParamsChange("destinationCountry", value)}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue placeholder="仕向地の国を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">アメリカ</SelectItem>
                        <SelectItem value="JP">日本</SelectItem>
                        <SelectItem value="CN">中国</SelectItem>
                        <SelectItem value="KR">韓国</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination-postal" className="text-lg font-medium">
                      仕向地（住所）
                    </Label>
                    {destinationAutocomplete || (
                      <Input 
                        id="destination-postal" 
                        placeholder="例: 10001" 
                        className="h-12 text-base"
                        value={quoteParams.destinationPostalCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onQuoteParamsChange("destinationPostalCode", e.target.value)}
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="residential"
                    checked={quoteParams.isResidential}
                    onCheckedChange={(checked: boolean) => onQuoteParamsChange("isResidential", checked)}
                  />
                  <Label htmlFor="residential" className="text-base">
                    個人宅住所への出荷
                  </Label>
                </div>
              </div>

              {/* Shipment Details Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">お客様の貨物詳細を教えてください</h2>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="insurance"
                    checked={quoteParams.higherInsurance}
                    onCheckedChange={(checked: boolean) => onQuoteParamsChange("higherInsurance", checked)}
                  />
                  <Label htmlFor="insurance" className="text-base">
                    より高額な賠償責任補償を利用する
                  </Label>
                </div>
              </div>

              {/* Packages Section */}
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-900">パッケージ情報</h2>

                <div className="space-y-4">
                  {packages.map((pkg, index) => (
                    <Card key={pkg.id} className="border-2 border-gray-200">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">パッケージ {index + 1}</CardTitle>
                          {packages.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemovePackage(pkg.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor={`packaging-${pkg.id}`} className="text-base font-medium">
                            梱包材
                          </Label>
                          <Select 
                            value={pkg.packagingType} 
                            onValueChange={(value: string) => onPackageChange(pkg.id, "packagingType", value)}
                          >
                            <SelectTrigger className="h-12 text-base">
                              <SelectValue placeholder="梱包材を選択してください" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="customer">お客様ご用意の梱包材</SelectItem>
                              <SelectItem value="fedex-box">FedEx Box</SelectItem>
                              <SelectItem value="fedex-pak">FedEx Pak</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`weight-${pkg.id}`} className="text-base font-medium">
                            パッケージ重量 (kg)
                          </Label>
                          <Input
                            id={`weight-${pkg.id}`}
                            type="number"
                            step="0.1"
                            placeholder="0.0"
                            value={pkg.weight}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPackageChange(pkg.id, "weight", e.target.value)}
                            className="h-12 text-base"
                          />
                        </div>

                        {pkg.packagingType === "customer" && (
                          <div className="space-y-2">
                            <Label className="text-base font-medium">寸法 L x W x H (cm)</Label>
                            <div className="grid grid-cols-3 gap-3">
                              <Input
                                type="number"
                                placeholder="長さ"
                                value={pkg.length}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPackageChange(pkg.id, "length", e.target.value)}
                                className="h-12 text-base"
                              />
                              <Input
                                type="number"
                                placeholder="幅"
                                value={pkg.width}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPackageChange(pkg.id, "width", e.target.value)}
                                className="h-12 text-base"
                              />
                              <Input
                                type="number"
                                placeholder="高さ"
                                value={pkg.height}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onPackageChange(pkg.id, "height", e.target.value)}
                                className="h-12 text-base"
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onAddPackage}
                    className="text-blue-600 hover:text-blue-800 p-0 h-auto font-normal"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    別のパッケージを追加
                  </Button>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-lg font-semibold">総重量: {getTotalWeight()} kg</div>
                  </div>
                </div>
              </div>

              {/* Ship Date Section */}
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-gray-900">希望出荷日はいつですか？</h2>
                <div className="space-y-2">
                  <Label htmlFor="ship-date" className="text-lg font-medium">
                    出荷日
                  </Label>
                  <Input 
                    id="ship-date" 
                    type="date" 
                    className="h-12 text-base max-w-xs"
                    value={quoteParams.shipDate}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onQuoteParamsChange("shipDate", e.target.value)}
                  />
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 font-medium">エラーが発生しました</div>
                  <div className="text-red-600">{error}</div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-6">
                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-14 text-lg font-semibold text-white" 
                  style={{ backgroundColor: "#FF6600" }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      見積もり中...
                    </>
                  ) : (
                    "料金を表示"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
