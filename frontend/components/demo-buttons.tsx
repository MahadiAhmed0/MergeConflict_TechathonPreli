'use client'

export function DemoButtons() {
  return (
    <div className="bg-[#F4F1EA] border-[4px] border-black shadow-[6px_6px_0px_#000000] rounded-none p-8">
      <h3 className="text-lg font-extrabold tracking-widest uppercase text-black mb-8">
        BUTTON STYLES
      </h3>

      <div className="space-y-4">
        {/* Primary Black Button */}
        <button className="neo-button w-full">
          PRIMARY BUTTON
        </button>

        {/* Yellow Button */}
        <button className="neo-button-yellow w-full">
          ALERT / ACTION
        </button>

        {/* Green Button */}
        <button className="neo-button-green w-full">
          SUCCESS / ACTIVE
        </button>

        {/* Red Button */}
        <button className="neo-button-red w-full">
          ALERT / DANGER
        </button>

        {/* Blue Button */}
        <button className="neo-button-blue w-full">
          INFO / SYSTEM
        </button>
      </div>

      <div className="border-t-[3px] border-black mt-8 pt-6">
        <p className="text-xs font-extrabold uppercase tracking-widest text-black opacity-60">
          Press buttons to see active state (shadow shrinks, element shifts down-right)
        </p>
      </div>
    </div>
  )
}
