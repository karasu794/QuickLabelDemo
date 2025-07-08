"use client"

import React, { useEffect, useState } from 'react'
import Script from 'next/script'

// Google Maps APIの型定義
declare global {
  interface Window {
    google: any
  }
}

interface GoogleMapsProviderProps {
  children: React.ReactNode
}

export default function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // 既にGoogle Maps APIが読み込まれているかチェック
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      setIsLoaded(true)
    }
  }, [])

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_Maps_API_KEY}&libraries=places`}
        strategy="afterInteractive"
        onLoad={() => setIsLoaded(true)}
      />
      {children}
    </>
  )
} 