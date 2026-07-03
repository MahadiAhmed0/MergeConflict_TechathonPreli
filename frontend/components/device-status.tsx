'use client'

import { Device } from './office-layout'

interface DeviceStatusProps {
  devices: Device[]
}

// Format relative time like "2m ago", "1h ago", etc.
function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - target.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function DeviceStatus({ devices }: DeviceStatusProps) {
  // Group devices by room
  const roomOrder = ['Drawing Room', 'Work Room 1', 'Work Room 2']
  const groupedByRoom = roomOrder.reduce(
    (acc, room) => {
      acc[room] = devices.filter((d) => d.room === room)
      return acc
    },
    {} as Record<string, Device[]>
  )

  return (
    <div className="space-y-8">
      {roomOrder.map((room) => (
        <div key={room}>
          {/* Room Sub-header */}
          <div className="border-b-[3px] border-black pb-3 mb-5">
            <h3 className="text-sm font-extrabold tracking-widest uppercase text-black">
              {room}
            </h3>
          </div>

          {/* Devices in Room */}
          <div className="space-y-3">
            {groupedByRoom[room].map((device) => (
              <div
                key={device.id}
                className="bg-white border-[3px] border-black shadow-[3px_3px_0px_#000000] rounded-none px-4 py-3 flex items-center justify-between gap-4"
              >
                {/* Left: Status Indicator & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Status Dot */}
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 border-[2px] border-black ${
                      device.status === 'on' ? 'bg-[#00D97E]' : 'bg-[#D9D9D9]'
                    }`}
                  />

                  {/* Device Name & Type */}
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-black truncate">
                      {device.name}
                    </p>
                    <p className="text-xs text-black opacity-60 uppercase tracking-wide">
                      {device.type === 'light' ? 'Light' : 'Fan'}
                    </p>
                  </div>
                </div>

                {/* Right: Time & Power */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <p className="text-xs font-bold text-black whitespace-nowrap">
                    {formatRelativeTime(device.lastChanged)}
                  </p>
                  {device.powerWatts !== undefined && (
                    <p className="text-xs font-mono text-black opacity-70">
                      {device.powerWatts}W
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
