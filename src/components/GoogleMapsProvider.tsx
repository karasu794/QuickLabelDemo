"use client"

import React from 'react'
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
  return (
    <>
      <Script
        id="google-maps"
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_Maps_API_KEY}&libraries=places&loading=async`}
        strategy="afterInteractive"
        onLoad={() => {
          console.log('Google Maps API loaded successfully')
        }}
      />
      {children}
    </>
  )
} 