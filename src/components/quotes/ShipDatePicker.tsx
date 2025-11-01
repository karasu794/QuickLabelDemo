"use client"

import React from 'react'
import { toast } from 'react-hot-toast'

interface ShipDatePickerProps {
  value: string // YYYY-MM-DD format
  onChange: (date: string) => void // YYYY-MM-DD format
  min?: string
  max?: string
  className?: string
  id?: string
  'data-test'?: string
}

export default function ShipDatePicker(props: ShipDatePickerProps) {
  return (
    <input
      id={props.id}
      data-test={props['data-test']}
      type="date"
      value={props.value}
      min={props.min}
      max={props.max}
      className={props.className}
      onChange={(e) => {
        if (!e.target.value) {
          props.onChange('')
          return
        }
        const selectedDate = new Date(e.target.value)
        const day = selectedDate.getDay()
        if (day === 0) { // Sunday
          const monday = new Date(selectedDate)
          monday.setDate(selectedDate.getDate() + 1)
          const year = monday.getFullYear()
          const month = String(monday.getMonth() + 1).padStart(2, '0')
          const dayStr = String(monday.getDate()).padStart(2, '0')
          const mondayStr = `${year}-${month}-${dayStr}`
          
          toast.warning('日曜日は出荷できません。翌営業日に自動補正しました。')
          props.onChange(mondayStr)
          return
        }
        props.onChange(e.target.value)
      }}
    />
  )
}

