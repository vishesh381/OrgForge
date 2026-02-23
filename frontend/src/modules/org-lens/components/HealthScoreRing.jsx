/**
 * HealthScoreRing
 * SVG circular progress ring showing a score (0–100) with label.
 *
 * Props:
 *   label  {string}  — caption rendered below the ring
 *   score  {number}  — value between 0 and 100
 *   color  {string}  — Tailwind stroke class, e.g. "stroke-blue-400"
 */
export default function HealthScoreRing({ label, score, color = 'stroke-blue-400' }) {
  const safeScore = Math.min(100, Math.max(0, score ?? 0))
  const radius = 44
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (safeScore / 100) * circumference

  const textColor =
    safeScore >= 75
      ? 'text-green-400'
      : safeScore >= 50
      ? 'text-yellow-400'
      : 'text-red-400'

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg
          className="w-full h-full -rotate-90"
          viewBox="0 0 100 100"
          fill="none"
          aria-label={`${label}: ${safeScore}`}
        >
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-slate-700"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Score value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${textColor}`}>
            {Math.round(safeScore)}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-slate-400 text-center leading-tight max-w-[7rem]">
        {label}
      </span>
    </div>
  )
}
