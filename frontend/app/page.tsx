'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Header } from '@/components/header'
import { Panel } from '@/components/panel'
import { OfficeLayout, type Device } from '@/components/office-layout'
import { DeviceStatus } from '@/components/device-status'
import { PowerConsumption } from '@/components/power-consumption'
import { ActiveAlerts, type Alert } from '@/components/active-alerts'
import { ControlBar } from '@/components/control-bar'

const getBackendUrl = () => process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

// Flatten devices from grouped format to flat array
const flattenDevices = (grouped: Record<string, Device[]>): Device[] => {
  return Object.values(grouped).flat()
}

export default function Home() {
  const [devices, setDevices] = useState<Device[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [autoToggle, setAutoToggle] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)

  // Fetch initial data on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      const backendUrl = getBackendUrl()
      try {
        const [devicesRes, alertsRes] = await Promise.all([
          fetch(`${backendUrl}/api/devices`),
          fetch(`${backendUrl}/api/alerts`),
        ])

        if (devicesRes.ok) {
          const grouped = await devicesRes.json()
          setDevices(flattenDevices(grouped))
        }

        if (alertsRes.ok) {
          const alertsData = await alertsRes.json()
          setAlerts(alertsData)
        }

        setIsLoading(false)
      } catch (error) {
        console.error('[v0] Failed to fetch initial data:', error)
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [])

  // WebSocket connection
  useEffect(() => {
    const backendUrl = getBackendUrl()
    const wsUrl = backendUrl.replace('http', 'ws') + '/ws'

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log('[v0] WebSocket connected')
          setIsConnected(true)
        }

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)

            if (message.type === 'snapshot') {
              // Initial snapshot on connect
              const flatDevices = flattenDevices(message.devices)
              setDevices(flatDevices)
            } else if (message.type === 'device_update') {
              // Update a single device
              setDevices((prev) =>
                prev.map((d) => (d.id === message.device.id ? message.device : d))
              )
            } else if (message.type === 'power_update') {
              // Power updates don't need to change device state, calculated on the fly
              console.log('[v0] Power update:', message)
            } else if (message.type === 'alert') {
              // Add new alert
              setAlerts((prev) => [message.alert, ...prev])
            }
          } catch (error) {
            console.error('[v0] Failed to parse WebSocket message:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('[v0] WebSocket error:', error)
          setIsConnected(false)
        }

        ws.onclose = () => {
          console.log('[v0] WebSocket disconnected')
          setIsConnected(false)
          // Attempt to reconnect after 3 seconds
          setTimeout(() => connectWebSocket(), 3000)
        }

        wsRef.current = ws
      } catch (error) {
        console.error('[v0] Failed to connect WebSocket:', error)
        setIsConnected(false)
        setTimeout(() => connectWebSocket(), 3000)
      }
    }

    // Only connect if window is defined (client-side)
    if (typeof window !== 'undefined') {
      connectWebSocket()
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const handleToggleDevice = useCallback((id: string) => {
    const backendUrl = getBackendUrl()
    fetch(`${backendUrl}/api/devices/${id}/toggle`, { method: 'POST' })
      .then(() => {
        // Don't update local state here - wait for device_update from WebSocket
        console.log('[v0] Toggle request sent for device:', id)
      })
      .catch((error) => {
        console.error('[v0] Failed to toggle device:', error)
      })
  }, [])

  // Calculate total and room-wise power consumption
  const powerData = useMemo(() => {
    const totalWatts = devices.reduce((sum, device) => sum + (device.powerWatts ?? 0), 0)
    const byRoom: { [room: string]: number } = {}

    devices.forEach((device) => {
      if (!byRoom[device.room]) {
        byRoom[device.room] = 0
      }
      byRoom[device.room] += device.powerWatts ?? 0
    })

    return { totalWatts, byRoom }
  }, [devices])

  return (
    <div className="min-h-screen bg-[#F4F1EA]">
      {/* Header */}
      <Header isConnected={isConnected} />

      {/* Main Content */}
      <main className="px-4 md:px-8 py-6 md:py-12">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-6xl font-extrabold text-black opacity-20 mb-6 animate-pulse">
                ⚡
              </div>
              <p className="text-sm font-extrabold uppercase tracking-widest text-black opacity-50">
                Loading Dashboard...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Control Bar — Auto Toggle, All ON/OFF */}
            <div className="mb-6">
              <ControlBar
                backendUrl={getBackendUrl()}
                onAutoToggleChange={setAutoToggle}
                devices={devices}
              />
            </div>

            {/* Office Layout Panel - Full Width */}
            <div className="mb-12">
              <OfficeLayout
                devices={devices}
                onToggleDevice={handleToggleDevice}
                autoToggle={autoToggle}
              />
            </div>

            {/* Divider */}
            <div className="border-t-[4px] border-black my-12" />

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
              {/* Panel 2: Device Status */}
              <div className="lg:col-span-1">
                <Panel title="Device Status">
                  <DeviceStatus devices={devices} />
                </Panel>
              </div>

              {/* Panel 3: Power & Alerts */}
              <div className="lg:col-span-2">
                <Panel title="Power & Alerts">
                  <div className="space-y-8">
                    {/* Power Consumption Section */}
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-black mb-4">
                        Power Consumption
                      </h3>
                      <PowerConsumption totalWatts={powerData.totalWatts} byRoom={powerData.byRoom} />
                    </div>

                    {/* Divider */}
                    <div className="border-t-[3px] border-black" />

                    {/* Active Alerts Section */}
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-widest text-black mb-4">
                        Active Alerts
                      </h3>
                      <ActiveAlerts alerts={alerts} />
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
