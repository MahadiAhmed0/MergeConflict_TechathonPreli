'use client'

/* ─────────────────────────────────────────────────────────────────────────
 * OfficeLayout — SVG floor plan (viewBox 0 0 930 520)
 *
 * Room interiors (inner boundary, excluding 8-px outer walls):
 *   Drawing Room : x 8–307,  y 8–512   (299 × 504 px)
 *   Work Room 1  : x 319–619, y 8–512  (300 × 504 px)
 *   Work Room 2  : x 631–922, y 8–512  (291 × 504 px)
 *
 * Dividing walls : x 307–319 (Drawing/Work1), x 619–631 (Work1/Work2)
 * Door gaps       : y 215–305 in each dividing wall
 * Entry gap       : x 415–515 in bottom outer wall
 * ───────────────────────────────────────────────────────────────────────── */

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

// ── Exact device positions in SVG coordinate space ─────────────────────────
const DEVICE_POSITIONS: Record<string, { x: number; y: number }> = {
  // Drawing Room — 2 fans, 3 lights
  'drawing-light-1': { x: 68, y: 68 },
  'drawing-light-2': { x: 262, y: 68 },
  'drawing-light-3': { x: 230, y: 430 },
  'drawing-fan-1': { x: 170, y: 68 },
  'drawing-fan-2': { x: 230, y: 370 },

  // Work Room 1 — 2 fans, 3 lights
  'work1-light-1': { x: 367, y: 66 },
  'work1-light-2': { x: 575, y: 66 },
  'work1-light-3': { x: 475, y: 430 },
  'work1-fan-1': { x: 475, y: 66 },
  'work1-fan-2': { x: 475, y: 350 },

  // Work Room 2 — 2 fans, 3 lights
  'work2-light-1': { x: 673, y: 66 },
  'work2-light-2': { x: 880, y: 66 },
  'work2-light-3': { x: 775, y: 430 },
  'work2-fan-1': { x: 775, y: 66 },
  'work2-fan-2': { x: 775, y: 350 },
}

// ── Fan icon (SVG, centered at local 0,0) ──────────────────────────────────
function FanIcon({ isOn }: { isOn: boolean }) {
  const R = 18   // outer radius
  const bL = 14   // blade length

  return (
    <g>
      {/* Drop shadow */}
      <circle cx={2} cy={2} r={R + 1} fill="rgba(0,0,0,0.18)" />
      {/* Outer ring */}
      <circle r={R} fill={isOn ? '#16213e' : '#BDBAB1'} stroke="#000" strokeWidth={2.5} />
      {/* Spinning blades */}
      <g stroke={isOn ? '#5B7BFF' : '#888'} strokeWidth={2.5} strokeLinecap="round" fill="none">
        {isOn && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 0 0"
            to="360 0 0"
            dur="1.8s"
            repeatCount="indefinite"
          />
        )}
        <line x1={0} y1={0} x2={0} y2={-bL} />
        <line x1={0} y1={0} x2={12} y2={7} />
        <line x1={0} y1={0} x2={-12} y2={7} />
      </g>
      {/* Hub */}
      <circle r={4} fill={isOn ? '#5B7BFF' : '#777'} stroke="#000" strokeWidth={1.8} />
    </g>
  )
}

// ── Light icon (SVG, centered at local 0,0) ────────────────────────────────
function LightIcon({ isOn }: { isOn: boolean }) {
  return (
    <g>
      {isOn && <circle r={22} fill="rgba(255,212,0,0.12)" />}
      {isOn && <circle r={15} fill="rgba(255,212,0,0.28)" />}
      <circle r={11} fill={isOn ? '#FFD400' : '#AFACA2'} stroke="#000" strokeWidth={2.5} />
      {isOn && <circle cx={-4} cy={-4} r={3.5} fill="rgba(255,255,255,0.55)" />}
    </g>
  )
}

// ── Flower vase (SVG element, positioned via transform) ────────────────────
function FlowerVase({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} style={{ pointerEvents: 'none' }}>
      {/* Pot body */}
      <polygon points="-10,14 10,14 7,-2 -7,-2" fill="#7A5215" stroke="#000" strokeWidth={2} />
      {/* Soil */}
      <rect x={-10} y={-2} width={20} height={6} rx={1} fill="#3E2810" stroke="#000" strokeWidth={1.5} />
      {/* Main leaf cluster */}
      <ellipse cx={0} cy={-17} rx={8} ry={13} fill="#2E7D32" stroke="#000" strokeWidth={1.5} />
      <ellipse cx={-9} cy={-11} rx={6} ry={9} fill="#388E3C" stroke="#000" strokeWidth={1}
        transform="rotate(-35,-9,-11)" />
      <ellipse cx={9} cy={-11} rx={6} ry={9} fill="#388E3C" stroke="#000" strokeWidth={1}
        transform="rotate(35,9,-11)" />
      {/* Flower */}
      <circle cx={0} cy={-28} r={4} fill="#FFD400" stroke="#000" strokeWidth={1.5} />
      <circle cx={0} cy={-28} r={2} fill="#FF8C00" />
    </g>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export function OfficeLayout({ devices, onToggleDevice, autoToggle = false }: OfficeLayoutProps) {
  const deviceMap = Object.fromEntries(devices.map((d) => [d.id, d]))

  const handleClick = (id: string) => {
    if (!autoToggle) onToggleDevice(id)
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Mode indicator ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-widest text-black">
          Floor Plan — Top View
        </span>
        {autoToggle ? (
          <span className="text-[10px] font-extrabold uppercase tracking-widest bg-[#16213e] text-[#00D97E] px-3 py-1.5 border-[2px] border-black animate-pulse">
            ⚡ Auto Simulation Running
          </span>
        ) : (
          <span
            className="text-[10px] font-extrabold uppercase tracking-widest bg-[#FFD400] text-black px-3 py-1.5 border-[2px] border-black"
            style={{ animation: 'softPulse 2s ease-in-out infinite' }}
          >
            👆 Interactive — Click Devices to Switch
          </span>
        )}
      </div>

      {/* ── SVG Floor Plan ─────────────────────────────────────────────── */}
      <div className="w-full overflow-hidden border-[4px] border-black shadow-[8px_8px_0px_#000000]">
          <svg
            viewBox="0 0 930 520"
            width="100%"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >

          {/* ── FLOORS ─────────────────────────────────────────────────── */}
          {/* Outer area (walls) */}
          <rect x={0} y={0} width={930} height={520} fill="#1a1a1a" />
          {/* Drawing Room floor */}
          <rect x={8} y={8} width={299} height={504} fill="#F2EFE5" />
          {/* Work Room 1 floor */}
          <rect x={319} y={8} width={300} height={504} fill="#EBE6D6" />
          {/* Work Room 2 floor */}
          <rect x={631} y={8} width={291} height={504} fill="#EBE6D6" />

          {/* ── DIVIDING WALLS (with door gaps) ────────────────────────── */}
          {/* Drawing / Work Room 1 — wall, door at y 215–305 */}


          {/* Work Room 1 / Work Room 2 — wall, door at y 215–305 */}
          {/* <rect x={619} y={8} width={12} height={207} fill="#1a1a1a" />
          <rect x={619} y={305} width={12} height={207} fill="#1a1a1a" />
          <rect x={619} y={215} width={6} height={90} fill="#EBE6D6" />
          <rect x={625} y={215} width={6} height={90} fill="#EBE6D6" />
          <path d="M631,215 A90,90 0 0,0 619,305"
            fill="rgba(180,170,145,0.25)" stroke="#888" strokeWidth={1.5} strokeDasharray="5,4" /> */}

          {/* Entry gap in bottom wall  Work Room 1*/}
          <rect x={370} y={512} width={100} height={8} fill="#C8C0A8" />
          <line x1={370} y1={512} x2={370} y2={520} stroke="#555" strokeWidth={2} />
          <line x1={470} y1={512} x2={470} y2={520} stroke="#555" strokeWidth={2} />

          {/* Entry gap in bottom wall  Drawing Room*/}
          <rect x={130} y={512} width={100} height={8} fill="#C8C0A8" />
          <line x1={130} y1={512} x2={130} y2={520} stroke="#555" strokeWidth={2} />
          <line x1={230} y1={512} x2={230} y2={520} stroke="#555" strokeWidth={2} />

          {/* Entry gap in bottom wall  Work room 2*/}
          <rect x={680} y={512} width={100} height={8} fill="#C8C0A8" />
          <line x1={680} y1={512} x2={680} y2={520} stroke="#555" strokeWidth={2} />
          <line x1={780} y1={512} x2={780} y2={520} stroke="#555" strokeWidth={2} />


          {/* ── ROOM LABELS ────────────────────────────────────────────── */}
          <text x={157} y={26} textAnchor="middle" fontSize={11} fontWeight="900"
            fill="#000" letterSpacing="2" fontFamily="system-ui,sans-serif">
            DRAWING ROOM
          </text>
          <text x={469} y={26} textAnchor="middle" fontSize={11} fontWeight="900"
            fill="#000" letterSpacing="2" fontFamily="system-ui,sans-serif">
            WORK ROOM 1
          </text>
          <text x={775} y={26} textAnchor="middle" fontSize={11} fontWeight="900"
            fill="#000" letterSpacing="2" fontFamily="system-ui,sans-serif">
            WORK ROOM 2
          </text>

          {/* Entry label */}
          <text x={420} y={509} textAnchor="middle" fontSize={8} fontWeight="700"
            fill="#999" letterSpacing="2" fontFamily="system-ui,sans-serif">
            ↑ ENTRY
          </text>
          <text x={175} y={509} textAnchor="middle" fontSize={8} fontWeight="700"
            fill="#999" letterSpacing="2" fontFamily="system-ui,sans-serif">
            ↑ ENTRY
          </text>
          <text x={725} y={509} textAnchor="middle" fontSize={8} fontWeight="700"
            fill="#999" letterSpacing="2" fontFamily="system-ui,sans-serif">
            ↑ ENTRY
          </text>

          {/* ════════════════════════════════════════════════════════════ */}
          {/*  DRAWING ROOM FURNITURE                                      */}
          {/* ════════════════════════════════════════════════════════════ */}

          {/* ── Sofa (along left wall) ─── */}
          {/* Back rest */}
          <rect x={14} y={232} width={22} height={196} fill="#3D2B1F" stroke="#000" strokeWidth={2.5} />
          {/* Top armrest */}
          <rect x={14} y={230} width={92} height={22} fill="#3D2B1F" stroke="#000" strokeWidth={2.5} />
          {/* Bottom armrest */}
          <rect x={14} y={408} width={92} height={22} fill="#3D2B1F" stroke="#000" strokeWidth={2.5} />
          {/* Seat */}
          <rect x={36} y={252} width={68} height={156} fill="#7A5C44" stroke="#000" strokeWidth={2} />
          {/* Cushion divider */}
          <line x1={36} y1={330} x2={104} y2={330} stroke="#5A3F2E" strokeWidth={2} />
          <line x1={70} y1={252} x2={70} y2={408} stroke="#5A3F2E" strokeWidth={1.5} />
          {/* Cushion highlights */}
          <rect x={38} y={254} width={30} height={74} fill="rgba(255,255,255,0.06)" />
          <rect x={38} y={332} width={30} height={74} fill="rgba(255,255,255,0.06)" />

          {/* ── Coffee table ─── */}
          <rect x={118} y={298} width={74} height={52} fill="#C9AB7C" stroke="#000" strokeWidth={2.5} />
          {/* Legs */}
          <rect x={120} y={300} width={8} height={8} fill="#8A6E3E" stroke="#000" strokeWidth={1} />
          <rect x={182} y={300} width={8} height={8} fill="#8A6E3E" stroke="#000" strokeWidth={1} />
          <rect x={120} y={340} width={8} height={8} fill="#8A6E3E" stroke="#000" strokeWidth={1} />
          <rect x={182} y={340} width={8} height={8} fill="#8A6E3E" stroke="#000" strokeWidth={1} />
          {/* Surface line detail */}
          <rect x={122} y={302} width={68} height={46} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={1} />

          {/* ── Flower vases ─── */}
          <FlowerVase x={28} y={45} />
          <FlowerVase x={288} y={495} />

          {/* ════════════════════════════════════════════════════════════ */}
          {/*  WORK ROOM 1 FURNITURE                                       */}
          {/* ════════════════════════════════════════════════════════════ */}

          {/* ── Top row: desks face south, chairs below ─── */}

          {/* Desk 1 */}
          <rect x={333} y={86} width={88} height={50} fill="#5C4A3A" stroke="#000" strokeWidth={2.5} />
          {/* Monitor */}
          <rect x={354} y={92} width={14} height={22} fill="#16213e" stroke="#000" strokeWidth={1.5} />
          <rect x={358} y={113} width={6} height={4} fill="#2a2a40" />
          {/* Chair */}
          <rect x={344} y={136} width={66} height={28} rx={3} fill="#5A5A6A" stroke="#000" strokeWidth={2} />
          <circle cx={377} cy={136} r={4} fill="#4A4A5A" stroke="#000" strokeWidth={1.5} />

          {/* Desk 2 */}
          <rect x={522} y={86} width={88} height={50} fill="#5C4A3A" stroke="#000" strokeWidth={2.5} />
          <rect x={540} y={92} width={14} height={22} fill="#16213e" stroke="#000" strokeWidth={1.5} />
          <rect x={544} y={113} width={6} height={4} fill="#2a2a40" />
          <rect x={531} y={136} width={66} height={28} rx={3} fill="#5A5A6A" stroke="#000" strokeWidth={2} />
          <circle cx={564} cy={136} r={4} fill="#4A4A5A" stroke="#000" strokeWidth={1.5} />

          {/* ── Bottom row: desks face north, chairs above ─── */}

          {/* Desk 3 */}
          <rect x={333} y={338} width={88} height={50} fill="#5C4A3A" stroke="#000" strokeWidth={2.5} />
          <rect x={354} y={344} width={14} height={22} fill="#16213e" stroke="#000" strokeWidth={1.5} />
          <rect x={358} y={365} width={6} height={4} fill="#2a2a40" />
          {/* Chair above */}
          <rect x={344} y={310} width={66} height={28} rx={3} fill="#5A5A6A" stroke="#000" strokeWidth={2} />
          <circle cx={377} cy={338} r={4} fill="#4A4A5A" stroke="#000" strokeWidth={1.5} />

          {/* Desk 4 */}
          <rect x={522} y={338} width={88} height={50} fill="#5C4A3A" stroke="#000" strokeWidth={2.5} />
          <rect x={540} y={344} width={14} height={22} fill="#16213e" stroke="#000" strokeWidth={1.5} />
          <rect x={544} y={365} width={6} height={4} fill="#2a2a40" />
          <rect x={531} y={310} width={66} height={28} rx={3} fill="#5A5A6A" stroke="#000" strokeWidth={2} />
          <circle cx={564} cy={338} r={4} fill="#4A4A5A" stroke="#000" strokeWidth={1.5} />

          {/* ════════════════════════════════════════════════════════════ */}
          {/*  WORK ROOM 2 FURNITURE  (mirrored layout of Work Room 1)     */}
          {/* ════════════════════════════════════════════════════════════ */}

          {/* Top row */}
          {/* Desk 5 */}
          <rect x={639} y={86} width={88} height={50} fill="#5C4A3A" stroke="#000" strokeWidth={2.5} />
          <rect x={660} y={92} width={14} height={22} fill="#16213e" stroke="#000" strokeWidth={1.5} />
          <rect x={664} y={113} width={6} height={4} fill="#2a2a40" />
          <rect x={650} y={136} width={66} height={28} rx={3} fill="#5A5A6A" stroke="#000" strokeWidth={2} />
          <circle cx={683} cy={136} r={4} fill="#4A4A5A" stroke="#000" strokeWidth={1.5} />

          {/* Desk 6 */}
          <rect x={820} y={86} width={88} height={50} fill="#5C4A3A" stroke="#000" strokeWidth={2.5} />
          <rect x={840} y={92} width={14} height={22} fill="#16213e" stroke="#000" strokeWidth={1.5} />
          <rect x={844} y={113} width={6} height={4} fill="#2a2a40" />
          <rect x={831} y={136} width={66} height={28} rx={3} fill="#5A5A6A" stroke="#000" strokeWidth={2} />
          <circle cx={864} cy={136} r={4} fill="#4A4A5A" stroke="#000" strokeWidth={1.5} />

          {/* Bottom row */}
          {/* Desk 7 */}
          <rect x={639} y={338} width={88} height={50} fill="#5C4A3A" stroke="#000" strokeWidth={2.5} />
          <rect x={660} y={344} width={14} height={22} fill="#16213e" stroke="#000" strokeWidth={1.5} />
          <rect x={664} y={365} width={6} height={4} fill="#2a2a40" />
          <rect x={650} y={310} width={66} height={28} rx={3} fill="#5A5A6A" stroke="#000" strokeWidth={2} />
          <circle cx={683} cy={338} r={4} fill="#4A4A5A" stroke="#000" strokeWidth={1.5} />

          {/* Desk 8 */}
          <rect x={820} y={338} width={88} height={50} fill="#5C4A3A" stroke="#000" strokeWidth={2.5} />
          <rect x={840} y={344} width={14} height={22} fill="#16213e" stroke="#000" strokeWidth={1.5} />
          <rect x={844} y={365} width={6} height={4} fill="#2a2a40" />
          <rect x={831} y={310} width={66} height={28} rx={3} fill="#5A5A6A" stroke="#000" strokeWidth={2} />
          <circle cx={864} cy={338} r={4} fill="#4A4A5A" stroke="#000" strokeWidth={1.5} />

          {/* ════════════════════════════════════════════════════════════ */}
          {/*  INTERACTIVE DEVICES (lights + fans)                         */}
          {/* ════════════════════════════════════════════════════════════ */}

          {Object.entries(DEVICE_POSITIONS).map(([id, pos]) => {
            const device = deviceMap[id]
            if (!device) return null

            const isOn = device.status === 'on'
            const isFan = device.type === 'fan'
            const title = autoToggle
              ? `${device.name} (Auto mode — disable Auto Toggle to control)`
              : `${device.name} — Click to toggle`

            return (
              <g
                key={id}
                transform={`translate(${pos.x},${pos.y})`}
                onClick={() => handleClick(id)}
                style={{ cursor: autoToggle ? 'not-allowed' : 'pointer' }}
                opacity={autoToggle ? 0.8 : 1}
              >
                <title>{title}</title>

                {isFan ? <FanIcon isOn={isOn} /> : <LightIcon isOn={isOn} />}

                {/* Dashed ring hint in manual/interactive mode */}
                {!autoToggle && (
                  <circle
                    r={isFan ? 24 : 17}
                    fill="none"
                    stroke="rgba(0,0,0,0.32)"
                    strokeWidth={1.5}
                    strokeDasharray="4,3"
                  />
                )}
              </g>
            )
          })}

        </svg>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">

        {/* Lighting */}
        <div className="bg-[#F4F1EA] border-[3px] border-black shadow-[3px_3px_0px_#000] p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-widest mb-2 text-black">Lighting</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-full bg-[#FFD400] border-[2px] border-black flex-shrink-0"
              style={{ boxShadow: '0 0 5px 2px rgba(255,212,0,0.5)' }} />
            <span className="text-[10px] font-bold">On</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#AFACA2] border-[2px] border-black flex-shrink-0" />
            <span className="text-[10px] font-bold">Off</span>
          </div>
        </div>

        {/* Fans */}
        <div className="bg-[#F4F1EA] border-[3px] border-black shadow-[3px_3px_0px_#000] p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-widest mb-2 text-black">Fans</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-full bg-[#16213e] border-[2px] border-black flex-shrink-0" />
            <span className="text-[10px] font-bold">On (dark ring)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#BDBAB1] border-[2px] border-black flex-shrink-0" />
            <span className="text-[10px] font-bold">Off (grey)</span>
          </div>
        </div>

        {/* Furniture */}
        <div className="bg-[#F4F1EA] border-[3px] border-black shadow-[3px_3px_0px_#000] p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-widest mb-2 text-black">Furniture</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 bg-[#5C4A3A] border-[2px] border-black flex-shrink-0" />
            <span className="text-[10px] font-bold">Desk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#7A5C44] border-[2px] border-black flex-shrink-0" />
            <span className="text-[10px] font-bold">Sofa</span>
          </div>
        </div>

        {/* Other */}
        <div className="bg-[#F4F1EA] border-[3px] border-black shadow-[3px_3px_0px_#000] p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-widest mb-2 text-black">Other</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-full bg-[#2E7D32] border-[2px] border-black flex-shrink-0" />
            <span className="text-[10px] font-bold">Plant / Vase</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-sm bg-[#5A5A6A] border-[2px] border-black flex-shrink-0" />
            <span className="text-[10px] font-bold">Chair</span>
          </div>
        </div>

      </div>
    </div>
  )
}
