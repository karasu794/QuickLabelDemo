import { useState, useEffect } from 'react'

export interface ValidationResult {
  isValid: boolean
  errorMessage?: string
  value: string
  className: string
}

export function useAsciiValidation(initialValue: string = '') {
  const [value, setValue] = useState(initialValue)
  const [isValid, setIsValid] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  // 非ASCII文字を検出する正規表現
  const hasNonAsciiChars = (str: string): boolean => {
    return /[^\x00-\x7F]/.test(str)
  }

  // バリデーション実行
  const validateInput = (inputValue: string): ValidationResult => {
    const hasNonAscii = hasNonAsciiChars(inputValue)
    
    if (hasNonAscii) {
      return {
        isValid: false,
        errorMessage: '半角英数字で入力してください',
        value: inputValue,
        className: 'border-red-500 focus:border-red-500 focus:ring-red-500'
      }
    }

    return {
      isValid: true,
      value: inputValue,
      className: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
  }

  // 入力値が変更されたときのハンドラー
  const handleChange = (inputValue: string) => {
    setValue(inputValue)
    const result = validateInput(inputValue)
    setIsValid(result.isValid)
    setErrorMessage(result.errorMessage)
  }

  // 初期値が変更されたときの処理
  useEffect(() => {
    if (initialValue !== value) {
      handleChange(initialValue)
    }
  }, [initialValue])

  return {
    value,
    isValid,
    errorMessage,
    className: isValid ? 'border-gray-300 focus:border-blue-500 focus:ring-blue-500' : 'border-red-500 focus:border-red-500 focus:ring-red-500',
    handleChange,
    validateInput
  }
}

// 複数のフィールドを管理するためのフック
export function useMultipleAsciiValidation(initialValues: Record<string, string> = {}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [validations, setValidations] = useState<Record<string, ValidationResult>>({})

  // 非ASCII文字を検出する正規表現
  const hasNonAsciiChars = (str: string): boolean => {
    return /[^\x00-\x7F]/.test(str)
  }

  // バリデーション実行
  const validateInput = (inputValue: string): ValidationResult => {
    const hasNonAscii = hasNonAsciiChars(inputValue)
    
    if (hasNonAscii) {
      return {
        isValid: false,
        errorMessage: '半角英数字で入力してください',
        value: inputValue,
        className: 'border-red-500 focus:border-red-500 focus:ring-red-500'
      }
    }

    return {
      isValid: true,
      value: inputValue,
      className: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
  }

  // 特定のフィールドの値を更新
  const updateValue = (fieldName: string, inputValue: string) => {
    setValues(prev => ({
      ...prev,
      [fieldName]: inputValue
    }))

    const result = validateInput(inputValue)
    setValidations(prev => ({
      ...prev,
      [fieldName]: result
    }))
  }

  // 特定のフィールドのバリデーション結果を取得
  const getValidation = (fieldName: string): ValidationResult => {
    return validations[fieldName] || {
      isValid: true,
      value: values[fieldName] || '',
      className: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
  }

  // 全てのフィールドが有効かどうかを確認
  const isAllValid = (): boolean => {
    return Object.values(validations).every(validation => validation.isValid)
  }

  // 初期値が変更されたときの処理
  useEffect(() => {
    Object.keys(initialValues).forEach(key => {
      if (initialValues[key] !== values[key]) {
        updateValue(key, initialValues[key])
      }
    })
  }, [initialValues])

  return {
    values,
    validations,
    updateValue,
    getValidation,
    isAllValid,
    validateInput
  }
} 