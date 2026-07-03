import { ReactNode } from 'react'

interface PanelProps {
  title: string
  children?: ReactNode
}

export function Panel({ title, children }: PanelProps) {
  return (
    <div className="bg-[#F4F1EA] border-[4px] border-black shadow-[6px_6px_0px_#000000] rounded-none flex flex-col h-full">
      {/* Panel Header */}
      <div className="border-b-[4px] border-black pb-5 mb-8 px-6 pt-6">
        <h2 className="text-lg font-extrabold tracking-widest uppercase text-black">
          {title}
        </h2>
      </div>

      {/* Panel Content */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        {children ? (
          children
        ) : (
          <div className="flex items-center justify-center min-h-[320px]">
            <div className="text-center">
              <div className="text-7xl font-extrabold text-black opacity-15 mb-6 select-none">
                —
              </div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-black opacity-50">
                Content Coming Soon
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
