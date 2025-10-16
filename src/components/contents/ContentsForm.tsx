import React from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { buildContentsSchema, type ContentsFormValue, type ContentsMode } from './validation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { getCountryOptions } from '@/lib/data/locations'

export interface ContentsFormProps {
  mode: ContentsMode
  defaultValues: ContentsFormValue
  onSubmit: (values: ContentsFormValue) => Promise<void> | void
}

export function ContentsForm({ mode, defaultValues, onSubmit }: ContentsFormProps) {
  const countries = getCountryOptions()
  const schema = React.useMemo(() => buildContentsSchema(mode), [mode])

  const form = useForm<ContentsFormValue>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onSubmit',
  })
  const { control, handleSubmit, register, setValue, formState: { errors } } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const codeLabel = mode === 'hts' ? 'HTSコード（米国）' : 'HSコード'
  const codePlaceholder = mode === 'hts' ? '例: 01065165' : '例: 123456'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {fields.map((field, index) => {
        const codeError = (errors.items?.[index] as any)?.[(mode === 'hts') ? 'htsCode' : 'hsCode']?.message as string | undefined
        return (
          <Card key={field.id} className="border border-gray-200">
            <CardContent className="p-4 space-y-4" data-test="item-row">
              <div className="space-y-2">
                <Label htmlFor={`items.${index}.description`}>商品説明 <span className="text-red-500">*</span></Label>
                <textarea
                  id={`items.${index}.description`}
                  {...register(`items.${index}.description` as const)}
                  placeholder="商品の詳細な説明を入力してください"
                  rows={3}
                  data-test="item-description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`items.${index}.${mode === 'hts' ? 'htsCode' : 'hsCode'}`}>{codeLabel}</Label>
                  <Input
                    id={`items.${index}.${mode === 'hts' ? 'htsCode' : 'hsCode'}`}
                    placeholder={codePlaceholder}
                    data-test="item-code"
                    {...register(`items.${index}.${mode === 'hts' ? 'htsCode' : 'hsCode'}` as const)}
                  />
                  {codeError && <p className="text-red-600 text-sm" data-test="item-code-error">{codeError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`items.${index}.countryOfManufacture`}>製造国 <span className="text-red-500">*</span></Label>
                  <Combobox
                    options={countries}
                    value={defaultValues.items[index]?.countryOfManufacture || ''}
                    onSelect={(value) => setValue(`items.${index}.countryOfManufacture` as const, value, { shouldValidate: true })}
                    placeholder="製造国を選択してください"
                    searchPlaceholder="国名または国コードで検索..."
                    emptyText="該当する国が見つかりません"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`items.${index}.quantity`}>数量 <span className="text-red-500">*</span></Label>
                  <Input id={`items.${index}.quantity`} type="number" step="1" data-test="item-qty" {...register(`items.${index}.quantity` as const)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`items.${index}.weight`}>重量(kg) <span className="text-red-500">*</span></Label>
                  <Input id={`items.${index}.weight`} type="number" step="0.1" data-test="item-unit-weight" {...register(`items.${index}.weight` as const)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`items.${index}.unitPrice`}>単価(JPY) <span className="text-red-500">*</span></Label>
                  <Input id={`items.${index}.unitPrice`} type="number" step="0.01" data-test="item-unit-price" {...register(`items.${index}.unitPrice` as const)} />
                </div>
              </div>

              <div className="flex justify-end">
                {fields.length > 1 && (
                  <Button type="button" variant="outline" onClick={() => remove(index)}>削除</Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Button type="button" variant="outline" onClick={() => append({
        description: '', hsCode: '', htsCode: '', quantity: 1, weight: 0, unitPrice: 0, currency: 'JPY', countryOfManufacture: 'JP'
      } as any)}>商品を追加</Button>

      <div className="flex justify-end">
        <Button type="submit">次へ</Button>
      </div>
    </form>
  )
}

export default ContentsForm


