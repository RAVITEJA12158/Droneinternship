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
      <div className="space-y-3">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-md"
          >
            <ArrowLeft size={16} />
            {backLabel}
          </Link>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white break-words">{title}</h1>
            {subtitle && <p className="text-slate-400 mt-1">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </div>
      {children}
    </div>
  )
}
