'use client'

import { useState, useEffect, useCallback } from 'react'

interface ControlBarProps {
  backendUrl: string
  /** Called whenever the auto-toggle state changes so the parent can react */
  onAutoToggleChange?: (running: boolean) => void
}

export function ControlBar({ backendUrl, onAutoToggleChange }: ControlBarProps) {
  const [autoToggle, setAutoToggle] = useState(true) // optimistic: starts as true (server default)
  const [isLoading, setIsLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState<'on' | 'off' | null>(null)
  const [flash, setFlash] = useState<'on' | 'off' | null>(null)

  // Fetch real simulator status on mount
  useEffect(() => {
    fetch(`${backendUrl}/api/simulator/status`)
      .then((r) => r.json())
      .then((data) => {
        setAutoToggle(data.running)
        onAutoToggleChange?.(data.running)
      })
      .catch(() => {/* silently fail */})
  }, [backendUrl, onAutoToggleChange])

  const handleAutoToggle = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`${backendUrl}/api/simulator/toggle`, { method: 'POST' })
      const data = await res.json()
      setAutoToggle(data.running)
      onAutoToggleChange?.(data.running)
    } catch {
      /* no-op */
    } finally {
      setIsLoading(false)
    }
  }, [backendUrl, onAutoToggleChange])

  const handleBulk = useCallback(async (state: 'on' | 'off') => {
    setBulkLoading(state)
    try {
      await fetch(`${backendUrl}/api/devices/all/${state}`, { method: 'POST' })
      setFlash(state)
      setTimeout(() => setFlash(null), 600)
    } catch {
      /* no-op */
    } finally {
      setBulkLoading(null)
    }
  }, [backendUrl])

  return (
    <div
      className="relative border-[4px] border-black shadow-[6px_6px_0px_#000000] p-5 rounded-none flex flex-wrap items-center gap-6 overflow-hidden"
      style={{
        background: autoToggle
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
          : '#F4F1EA',
        transition: 'background 0.4s ease',
      }}
    >
      {/* Flash overlay for bulk toggle */}
      {flash && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: flash === 'on' ? 'rgba(255,212,0,0.25)' : 'rgba(0,0,0,0.18)',
            animation: 'flashFade 0.6s ease-out forwards',
          }}
        />
      )}

      {/* Mode label */}
      <div className="flex items-center gap-3 mr-2">
        <div
          className={`w-2.5 h-2.5 rounded-full border-[2px] border-black ${
            autoToggle ? 'bg-[#00D97E]' : 'bg-[#FFD400]'
          }`}
          style={autoToggle ? { boxShadow: '0 0 6px 2px rgba(0,217,126,0.6)', animation: 'pulse 1.5s infinite' } : {}}
        />
        <span
          className="text-xs font-extrabold uppercase tracking-widest"
          style={{ color: autoToggle ? '#FFFFFF' : '#000000' }}
        >
          {autoToggle ? '⚡ Auto Mode' : '🎛 Manual Mode'}
        </span>
      </div>

      {/* Separator */}
      <div
        className="w-[3px] h-8 bg-black self-center hidden sm:block"
        style={{ opacity: autoToggle ? 0.3 : 1 }}
      />

      {/* AUTO TOGGLE button */}
      <button
        id="ctrl-auto-toggle"
        onClick={handleAutoToggle}
        disabled={isLoading}
        aria-pressed={autoToggle}
        className="flex items-center gap-3 border-[3px] border-black font-extrabold uppercase text-xs px-5 py-3 cursor-pointer transition-all duration-150 select-none"
        style={{
          background: autoToggle ? '#00D97E' : '#D9D9D9',
          color: '#000000',
          boxShadow: autoToggle ? '3px 3px 0px #000000' : '3px 3px 0px #000000',
          opacity: isLoading ? 0.6 : 1,
        }}
        title={autoToggle ? 'Click to stop auto simulation' : 'Click to start auto simulation'}
      >
        {/* Toggle pill */}
        <span
          className="relative inline-flex w-10 h-5 border-[2px] border-black rounded-full transition-all duration-200"
          style={{ background: autoToggle ? '#000000' : '#999999' }}
        >
          <span
            className="absolute top-0.5 w-3.5 h-3.5 rounded-full border-[1.5px] border-black transition-all duration-200"
            style={{
              left: autoToggle ? 'calc(100% - 16px)' : '2px',
              background: autoToggle ? '#FFD400' : '#FFFFFF',
            }}
          />
        </span>
        {isLoading ? 'Loading…' : 'Auto Toggle'}
      </button>

      {/* ALL ON button */}
      <button
        id="ctrl-all-on"
        onClick={() => handleBulk('on')}
        disabled={bulkLoading !== null}
        className="border-[3px] border-black font-extrabold uppercase text-xs px-5 py-3 cursor-pointer transition-all duration-75 select-none"
        style={{
          background: '#FFD400',
          color: '#000000',
          boxShadow: '3px 3px 0px #000000',
          opacity: bulkLoading !== null ? 0.6 : 1,
        }}
        title="Turn all devices ON"
      >
        {bulkLoading === 'on' ? '⏳ Turning On…' : '☀ All ON'}
      </button>

      {/* ALL OFF button */}
      <button
        id="ctrl-all-off"
        onClick={() => handleBulk('off')}
        disabled={bulkLoading !== null}
        className="border-[3px] border-black font-extrabold uppercase text-xs px-5 py-3 cursor-pointer transition-all duration-75 select-none"
        style={{
          background: autoToggle ? '#FFFFFF' : '#000000',
          color: autoToggle ? '#000000' : '#FFFFFF',
          boxShadow: '3px 3px 0px ' + (autoToggle ? '#000000' : '#444444'),
          opacity: bulkLoading !== null ? 0.6 : 1,
        }}
        title="Turn all devices OFF"
      >
        {bulkLoading === 'off' ? '⏳ Turning Off…' : '🌙 All OFF'}
      </button>

      {/* Hint */}
      {!autoToggle && (
        <div className="ml-auto hidden lg:flex items-center gap-2 border-[2px] border-black bg-[#FFD400] px-3 py-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-black animate-pulse">
            👆 Click lights &amp; fans on the floor plan below to switch them
          </span>
        </div>
      )}

      <style>{`
        @keyframes flashFade {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 6px 2px rgba(0,217,126,0.6); }
          50%       { box-shadow: 0 0 12px 5px rgba(0,217,126,0.8); }
        }
      `}</style>
    </div>
  )
}
