import { redirect } from 'next/navigation'

export default async function KidsRedirectPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  redirect(`/kid/${encodeURIComponent(name.toLowerCase())}`)
}
