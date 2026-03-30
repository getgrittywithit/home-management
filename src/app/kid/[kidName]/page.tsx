'use client'

import { use } from 'react'
import KidPortalNew from '@/components/KidPortalNew'

export default function KidPage({ params }: { params: Promise<{ kidName: string }> }) {
  const { kidName } = use(params)

  return <KidPortalNew kidName={kidName} />
}
