'use client'

import { useCallback } from 'react'

export interface Device {
  id: string
  name: string
  type: 'light' | 'fan'
  room: string
  status: 'on' | 'off'
  powerWatts?: number
  lastChanged?: Date | string
}

interface OfficeLayoutProps {
  devices: Device[]
  onToggleDevice: (id: string) => void
  autoToggle?: boolean
}

export function OfficeLayout({ devices, onToggleDevice, autoToggle = false }: OfficeLayoutProps) {
  const rooms = ['Drawing Room', 'Work Room 1', 'Work Room 2']
  const roomsData = rooms.map((roomName) => ({
    name: roomName,
    devices: devices.filter((d) => d.room === roomName),
  }))

  const getLightPosition = (index: number): { x: string; y: string } => {
    const positions = [
      { x: '20%', y: '25%' },
      { x: '80%', y: '25%' },
      { x: '50%', y: '75%' },
    ]
    return positions[index] || { x: '50%', y: '50%' }
  }

  const getFanPosition = (index: number): { x: string; y: string } => {
    const positions = [
      { x: '35%', y: '50%' },
      { x: '65%', y: '50%' },
    ]
    return positions[index] || { x: '50%', y: '50%' }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Floor Plan */}
      <div
        className="border-[4px] border-black shadow-[6px_6px_0px_#000000] p-8 rounded-none"
        style={{ background: autoToggle ? '#F4F1EA' : '#FFFEF7' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-black">
            Floor Plan — Top View
          </h3>

          {/* Mode indicator banner */}
          {autoToggle ? (
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#1a1a2e] text-[#00D97E] px-3 py-1.5 border-[2px] border-black animate-pulse">
              ⚡ Auto Simulation Running
            </span>
          ) : (
            <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#FFD400] text-black px-3 py-1.5 border-[2px] border-black" style={{ animation: 'softPulse 2s ease-in-out infinite' }}>
              👆 Interactive — Click Devices to Switch
            </span>
          )}
        </div>
        {/* Rooms Container */}
        <div className="flex gap-6 justify-between">
          {roomsData.map((room, roomIndex) => {
            const lightsInRoom = room.devices.filter((d) => d.type === 'light')
            const fansInRoom = room.devices.filter((d) => d.type === 'fan')

            return (
              <div key={room.name} className="flex-1">
                {/* Room Box */}
                <div className="relative bg-[#F9F8F5] border-[3px] border-black shadow-[4px_4px_0px_#000000] aspect-square rounded-none overflow-hidden">
                  {/* Room Label */}
                  <div className="absolute top-3 left-3 z-20">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-black bg-[#F4F1EA] px-2 py-1 border-[2px] border-black">
                      {room.name}
                    </p>
                  </div>

                  {/* Light Markers */}
                  <div className="absolute inset-0 pointer-events-none">
                    {lightsInRoom.map((light, lightIndex) => {
                      const pos = getLightPosition(lightIndex)
                      const isOn = light.status === 'on'

                      return (
                        <button
                          key={light.id}
                          onClick={() => !autoToggle && onToggleDevice(light.id)}
                          className="absolute w-8 h-8 rounded-full border-[2px] border-black transition-all duration-200 pointer-events-auto"
                          style={{
                            left: pos.x,
                            top: pos.y,
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: isOn ? '#FFD400' : '#D9D9D9',
                            boxShadow: isOn
                              ? '0 0 0 3px #FFD400, 0 0 8px 3px rgba(255, 212, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.6)'
                              : 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
                            cursor: autoToggle ? 'not-allowed' : 'pointer',
                            opacity: autoToggle ? 0.75 : 1,
                            // Ring hint when interactive
                            outline: !autoToggle ? '2px dashed rgba(0,0,0,0.3)' : 'none',
                            outlineOffset: '3px',
                          }}
                          title={autoToggle ? `${light.name} (Auto mode — disable Auto Toggle to control)` : `${light.name} — Click to toggle`}
                          aria-label={`${light.name} (${light.status})`}
                          aria-disabled={autoToggle}
                        />
                      )
                    })}
                  </div>

                  {/* Fan Markers */}
                  <div className="absolute inset-0 pointer-events-none">
                    {fansInRoom.map((fan, fanIndex) => {
                      const pos = getFanPosition(fanIndex)
                      const isOn = fan.status === 'on'

                      return (
                        <button
                          key={fan.id}
                          onClick={() => !autoToggle && onToggleDevice(fan.id)}
                          className="absolute w-10 h-10 flex items-center justify-center rounded-none border-[2px] border-black transition-all duration-200 pointer-events-auto"
                          style={{
                            left: pos.x,
                            top: pos.y,
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: isOn ? '#3D5AFE' : '#D9D9D9',
                            boxShadow: isOn
                              ? '0 0 0 2px #3D5AFE, 0 0 6px 2px rgba(61, 90, 254, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.2)'
                              : 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
                            cursor: autoToggle ? 'not-allowed' : 'pointer',
                            opacity: autoToggle ? 0.75 : 1,
                            outline: !autoToggle ? '2px dashed rgba(0,0,0,0.3)' : 'none',
                            outlineOffset: '3px',
                          }}
                          title={autoToggle ? `${fan.name} (Auto mode — disable Auto Toggle to control)` : `${fan.name} — Click to toggle`}
                          aria-label={`${fan.name} (${fan.status})`}
                          aria-disabled={autoToggle}
                        >
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className={isOn ? 'animate-spin' : ''}
                            style={{
                              animationDuration: isOn ? '2s' : '0s',
                              color: isOn ? '#FFFFFF' : '#666666',
                            }}
                          >
                            {/* 3-blade fan icon */}
                            <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round">
                              {/* Center dot */}
                              <circle cx="10" cy="10" r="1.5" fill="currentColor" />

                              {/* Blade 1 */}
                              <path d="M 10 10 L 10 2" />
                              {/* Blade 2 */}
                              <path d="M 10 10 L 17 17" />
                              {/* Blade 3 */}
                              <path d="M 10 10 L 3 17" />
                            </g>
                          </svg>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Device Summary */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#F4F1EA] border-[3px] border-black shadow-[4px_4px_0px_#000000] p-4 rounded-none">
          <p className="text-xs font-extrabold uppercase tracking-widest text-black mb-3">
            Room Overview
          </p>
          <div className="space-y-2 text-xs font-mono">
            {roomsData.map((room) => (
              <div key={room.name} className="flex justify-between">
                <span className="font-bold">{room.name}</span>
                <span>
                  {room.devices.filter((d) => d.type === 'fan').length}F ·{' '}
                  {room.devices.filter((d) => d.type === 'light').length}L
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#F4F1EA] border-[3px] border-black shadow-[4px_4px_0px_#000000] p-4 rounded-none">
          <p className="text-xs font-extrabold uppercase tracking-widest text-black mb-3">
            Total Devices
          </p>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span>Fans:</span>
              <span className="font-bold">{devices.filter((d) => d.type === 'fan').length}</span>
            </div>
            <div className="flex justify-between">
              <span>Lights:</span>
              <span className="font-bold">{devices.filter((d) => d.type === 'light').length}</span>
            </div>
            <div className="border-t-[2px] border-black mt-2 pt-2 flex justify-between">
              <span>Total:</span>
              <span className="font-bold">{devices.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-[#F4F1EA] border-[3px] border-black shadow-[4px_4px_0px_#000000] p-4 rounded-none">
        <p className="text-xs font-extrabold uppercase tracking-widest text-black mb-4">Legend</p>
        <div className="grid grid-cols-2 gap-4">
          {/* Light Legend */}
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full border-[2px] border-black"
              style={{
                backgroundColor: '#FFD400',
                boxShadow: '0 0 0 2px #FFD400, 0 0 6px 2px rgba(255, 212, 0, 0.4)',
              }}
            />
            <span className="text-xs font-bold uppercase">Light (On)</span>
          </div>

          {/* Fan Legend */}
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 flex items-center justify-center border-[2px] border-black"
              style={{
                backgroundColor: '#3D5AFE',
                boxShadow: '0 0 0 2px #3D5AFE, 0 0 6px 2px rgba(61, 90, 254, 0.3)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round">
                  <circle cx="10" cy="10" r="1.5" fill="white" />
                  <path d="M 10 10 L 10 2" />
                  <path d="M 10 10 L 17 17" />
                  <path d="M 10 10 L 3 17" />
                </g>
              </svg>
            </div>
            <span className="text-xs font-bold uppercase">Fan (On)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
