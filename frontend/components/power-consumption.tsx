'use client'

interface PowerConsumptionProps {
  totalWatts: number
  byRoom: { [room: string]: number }
}

export function PowerConsumption({ totalWatts, byRoom }: PowerConsumptionProps) {
  // Ensure we have valid room data in order
  const rooms = ['Drawing Room', 'Work Room 1', 'Work Room 2']
  const roomData = rooms.map((room) => ({
    name: room,
    watts: byRoom[room] ?? 0,
  }))

  // Calculate percentage for each room (avoid division by zero)
  const getRoomPercentage = (watts: number): number => {
    if (totalWatts === 0) return 0
    return (watts / totalWatts) * 100
  }

  // Color palette for rooms (cycle through accent colors)
  const roomColors = ['#3D5AFE', '#00D97E', '#FFD400']

  return (
    <div className="space-y-6">
      {/* Total Wattage Display */}
      <div className="bg-[#FFD400] border-[4px] border-black shadow-[4px_4px_0px_#000000] rounded-none p-6">
        <div className="text-center">
          <p className="text-xs font-extrabold uppercase tracking-widest text-black mb-2">
            Total Power Consumption
          </p>
          <p className="text-5xl font-extrabold text-black font-mono">
            {totalWatts}
            <span className="text-3xl ml-1">W</span>
          </p>
        </div>
      </div>

      {/* Room Breakdown Bars */}
      <div className="space-y-4">
        {roomData.map((room, idx) => {
          const percentage = getRoomPercentage(room.watts)
          const barColor = roomColors[idx]

          return (
            <div key={room.name} className="space-y-2">
              {/* Room Label */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-black">
                  {room.name}
                </h3>
                <p className="text-sm font-mono font-bold text-black">
                  {room.watts}W
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="bg-white border-[3px] border-black shadow-[3px_3px_0px_#000000] rounded-none overflow-hidden h-10 flex items-center">
                {/* Filled Bar */}
                {totalWatts > 0 ? (
                  <div
                    className="h-full flex items-center justify-start pl-3 transition-all duration-300"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: barColor,
                    }}
                  >
                    {percentage > 15 && (
                      <span className="text-xs font-extrabold text-black font-mono">
                        {Math.round(percentage)}%
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs font-extrabold text-black opacity-40">
                      0%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary Stats */}
      <div className="border-t-[3px] border-black pt-4 mt-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="border-[2px] border-black p-3 rounded-none bg-[#F4F1EA]">
            <p className="text-xs font-extrabold uppercase tracking-widest text-black opacity-60 mb-1">
              Peak
            </p>
            <p className="text-lg font-extrabold text-black font-mono">
              {Math.max(...roomData.map((r) => r.watts))}W
            </p>
          </div>
          <div className="border-[2px] border-black p-3 rounded-none bg-[#F4F1EA]">
            <p className="text-xs font-extrabold uppercase tracking-widest text-black opacity-60 mb-1">
              Avg
            </p>
            <p className="text-lg font-extrabold text-black font-mono">
              {Math.round(roomData.length > 0 ? totalWatts / roomData.length : 0)}W
            </p>
          </div>
          <div className="border-[2px] border-black p-3 rounded-none bg-[#F4F1EA]">
            <p className="text-xs font-extrabold uppercase tracking-widest text-black opacity-60 mb-1">
              Rooms
            </p>
            <p className="text-lg font-extrabold text-black font-mono">
              {roomData.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
