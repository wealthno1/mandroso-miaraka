import Link from "next/link"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-72 bg-gray-900 p-6 text-white">
        <h2 className="mb-8 text-2xl font-bold">
          Mandroso Miaraka
        </h2>

        <nav className="flex flex-col gap-4 text-sm">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/campaigns">Campagnes</Link>
          <Link href="/dashboard/contributions">Contributions</Link>
          <Link href="/dashboard/enveloppes">Enveloppes Iray Volana</Link>
          <Link href="/dashboard/rakitra">Rakitra faha-4</Link>
          <Link href="/dashboard/tanjona">Tanjom-pinoana</Link>
          <Link href="/dashboard/categories">Catégories</Link>
          <Link href="/dashboard/visuels">Visuels</Link>
          <Link href="/dashboard/organization">Organisation</Link>
          <Link href="/dashboard/members">Membres</Link>
          <Link href="/public">Page publique</Link>
        </nav>
      </aside>

      <main className="flex-1 bg-gray-100 p-10">
        {children}
      </main>
    </div>
  )
}