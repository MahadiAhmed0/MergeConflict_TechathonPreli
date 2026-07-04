'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Device } from '@/components/office-layout'

interface ControlBarProps {
  backendUrl: string
  /** Called whenever the auto-toggle state changes so the parent can react */
  onAutoToggleChange?: (running: boolean) => void
  devices: Device[]
}

export function ControlBar({ backendUrl, onAutoToggleChange, devices }: ControlBarProps) {
  const [autoToggle, setAutoToggle] = useState(true) // optimistic: starts as true (server default)
  const [isLoading, setIsLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState<'on' | 'off' | null>(null)
  const [flash, setFlash] = useState<'on' | 'off' | null>(null)

  const allOn = devices.length > 0 && devices.every(d => d.status === 'on')
  const allOff = devices.length > 0 && devices.every(d => d.status === 'off')
  const groupState = allOn ? 'all-on' : allOff ? 'all-off' : 'custom'


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
      className="relative border-[4px] border-black shadow-[6px_6px_0px_#000000] p-4 sm:p-5 rounded-none flex flex-col xl:flex-row items-center justify-between gap-6 overflow-hidden"
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

      {/* Left Grouping: Mode & Auto Toggle */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
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
          {autoToggle ? '⚡ Auto Mode' : '👆 Manual Mode'}
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
      </div>

      {/* 3-Way Device State Toggle */}
      <div 
        className="flex border-[3px] border-black bg-white shadow-[3px_3px_0px_#000000] select-none transition-opacity"
        style={{ opacity: autoToggle ? 0.5 : 1, pointerEvents: autoToggle ? 'none' : 'auto' }}
      >
        <button
          onClick={() => handleBulk('on')}
          disabled={autoToggle || bulkLoading !== null || groupState === 'all-on'}
          className="px-4 py-3 text-xs font-extrabold uppercase tracking-widest border-r-[3px] border-black transition-colors disabled:cursor-not-allowed"
          style={{
            background: groupState === 'all-on' ? '#FFD400' : 'transparent',
            color: groupState === 'all-on' ? '#000' : '#666',
          }}
          title={autoToggle ? "Disabled during Auto Mode" : "Turn all devices ON"}
        >
          {bulkLoading === 'on' ? '...' : '☀ All ON'}
        </button>
        <div
          className="px-4 py-3 text-xs font-extrabold uppercase tracking-widest border-r-[3px] border-black flex items-center justify-center transition-colors"
          style={{
            background: groupState === 'custom' ? '#3D5AFE' : 'transparent',
            color: groupState === 'custom' ? '#FFF' : '#666',
          }}
          title="Mixed device states"
        >
          Custom
        </div>
        <button
          onClick={() => handleBulk('off')}
          disabled={autoToggle || bulkLoading !== null || groupState === 'all-off'}
          className="px-4 py-3 text-xs font-extrabold uppercase tracking-widest transition-colors disabled:cursor-not-allowed"
          style={{
            background: groupState === 'all-off' ? '#000' : 'transparent',
            color: groupState === 'all-off' ? '#FFF' : '#666',
          }}
          title={autoToggle ? "Disabled during Auto Mode" : "Turn all devices OFF"}
        >
          {bulkLoading === 'off' ? '...' : '🌙 All OFF'}
        </button>
      </div>

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
