import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
  backHref?: string
  backLabel?: string
  children: ReactNode
}

export function PageShell({ title, subtitle, actions, backHref, backLabel = 'Back', children }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
        {backHref && (
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-2 rounded-md text-sm font-medium text-slate-500 transition-colors hover:text-cyan-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 break-words sm:text-3xl">{title}</h1>
            {subtitle && <p className="text-slate-500 mt-1 text-sm sm:text-base">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}
