'use client'

import { useEffect } from 'react'
import { getApiUrl } from '@/lib/api'

export default function ApiInitializer() {
  useEffect(() => {
    // Initialize API URL detection on app load
    getApiUrl().then(url => {
      console.log('API initialized:', url)
    }).catch(err => {
      console.error('Failed to initialize API:', err)
    })
  }, [])

  return null
}
