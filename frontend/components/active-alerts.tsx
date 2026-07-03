'use client'

import { AlertTriangle, CheckCircle } from 'lucide-react'

export interface Alert {
  id: string
  type: 'after_hours' | 'room_stuck_on'
  message: string
  room: string
  created_at: string | Date
}

interface ActiveAlertsProps {
  alerts: Alert[]
}

function formatTime(createdAt: string | Date): string {
  const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function getAlertTypeLabel(type: string): string {
  switch (type) {
    case 'after_hours':
      return 'AFTER HOURS'
    case 'room_stuck_on':
      return 'STUCK ON'
    default:
      return 'ALERT'
  }
}

export function ActiveAlerts({ alerts }: ActiveAlertsProps) {
  // Sort by newest first
  const sortedAlerts = [...alerts].sort((a, b) => {
    const dateA = typeof a.created_at === 'string' ? new Date(a.created_at) : a.created_at
    const dateB = typeof b.created_at === 'string' ? new Date(b.created_at) : b.created_at
    return dateB.getTime() - dateA.getTime()
  })

  if (sortedAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] py-8">
        <CheckCircle className="w-12 h-12 text-[#00D97E] mb-4" strokeWidth={2} />
        <p className="text-sm font-extrabold uppercase tracking-widest text-black">
          All Clear
        </p>
        <p className="text-xs text-black opacity-50 mt-2">No Active Alerts</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
      {sortedAlerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-white border-[3px] border-black border-l-[6px] border-l-[#FF3B3B] shadow-[3px_3px_0px_#000000] rounded-none p-4"
        >
          {/* Alert Header with Icon and Close */}
          <div className="flex items-start gap-3 mb-2">
            <AlertTriangle
              className="w-5 h-5 flex-shrink-0 text-[#FF3B3B] mt-0.5"
              strokeWidth={3}
            />
            <div className="flex-1">
              <p className="text-sm font-extrabold text-black">{alert.message}</p>
            </div>
          </div>

          {/* Alert Metadata */}
          <div className="flex items-center justify-between gap-2 ml-8 mt-3">
            {/* Type and Room Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="bg-[#FF3B3B] text-white px-2 py-1 border-[2px] border-black text-xs font-extrabold uppercase tracking-wider rounded-none">
                {getAlertTypeLabel(alert.type)}
              </div>
              <div className="bg-[#D9D9D9] text-black px-2 py-1 border-[2px] border-black text-xs font-bold uppercase rounded-none">
                {alert.room}
              </div>
            </div>

            {/* Timestamp */}
            <div className="text-xs font-mono font-bold text-black opacity-70 flex-shrink-0">
              {formatTime(alert.created_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
