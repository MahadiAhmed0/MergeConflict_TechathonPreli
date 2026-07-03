'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface HeaderProps {
  isConnected?: boolean
}

export function Header({ isConnected = false }: HeaderProps) {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    // Set initial time
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: true 
      }))
    }

    updateTime()

    // Update time every second
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="bg-[#F4F1EA] border-b-[5px] border-black shadow-[0_5px_0px_#000000]">
      <div className="px-8 py-6 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 relative border-[3px] border-black bg-white p-1">
            <Image
              src="/logo.png"
              alt="Smart Office Dashboard"
              width={52}
              height={52}
              className="w-full h-full object-contain"
              priority
            />
          </div>
        </div>

        {/* Center: Title */}
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-extrabold tracking-widest uppercase text-black">
            SMART OFFICE DASHBOARD
          </h1>
        </div>

        {/* Right: Status & Time */}
        <div className="flex items-center gap-8">
          {/* Connection Status */}
          <div className="flex items-center gap-3 border-l-[4px] border-black pl-8">
            <div className={`status-dot ${isConnected ? 'status-dot-active' : 'status-dot-inactive'}`} />
            <span className="text-xs font-extrabold uppercase tracking-widest">
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {/* Time */}
          <div className="font-mono text-sm font-bold border-l-[4px] border-black pl-8 min-w-[110px]">
            {time || '--:--:-- AM'}
          </div>
        </div>
      </div>
    </header>
  )
}
