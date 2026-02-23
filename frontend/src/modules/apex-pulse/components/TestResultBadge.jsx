const BADGE_STYLES = {
  PASS: 'bg-green-400/15 text-green-400',
  FAIL: 'bg-red-400/15 text-red-400',
  SKIP: 'bg-slate-400/15 text-slate-400',
  COMPILE_FAIL: 'bg-orange-400/15 text-orange-400',
  Pass: 'bg-green-400/15 text-green-400',
  Fail: 'bg-red-400/15 text-red-400',
  Skip: 'bg-slate-400/15 text-slate-400',
  CompileFail: 'bg-orange-400/15 text-orange-400',
}

export default function TestResultBadge({ outcome }) {
  const style = BADGE_STYLES[outcome] || 'bg-slate-400/15 text-slate-400'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {outcome}
    </span>
  )
}
