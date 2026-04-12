'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SchedulePeriodEntry } from '@/types/domain'
import { PERIODS, type SchoolType } from '@/lib/school-periods'

const DAY_LABELS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳']
const DAY_NAMES  = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי']

interface Props {
  schoolType: SchoolType
  initialPeriods: SchedulePeriodEntry[]
  onChange: (periods: SchedulePeriodEntry[]) => void
  disabled?: boolean
}

function toSet(periods: SchedulePeriodEntry[]): Set<string> {
  return new Set(periods.map(p => `${p.day}-${p.period}`))
}

function toArray(occupied: Set<string>, maxPeriod: number): SchedulePeriodEntry[] {
  const result: SchedulePeriodEntry[] = []
  for (let d = 0; d < 6; d++) {
    for (let p = 1; p <= maxPeriod; p++) {
      if (occupied.has(`${d}-${p}`)) result.push({ day: d, period: p })
    }
  }
  return result
}

export default function ScheduleTemplateEditor({ schoolType, initialPeriods, onChange, disabled }: Props) {
  const periodDefs = PERIODS[schoolType]
  const maxPeriod = periodDefs.length

  const [occupied, setOccupied] = useState<Set<string>>(() => toSet(initialPeriods))
  const [dragging, setDragging] = useState(false)
  const [dragValue, setDragValue] = useState(true)

  // Track whether a change is coming from props (so we don't fire onChange)
  const fromProps = useRef(false)

  // Reset when initialPeriods changes from parent
  useEffect(() => {
    fromProps.current = true
    setOccupied(toSet(initialPeriods))
  }, [initialPeriods])

  // Emit onChange only for user-driven changes
  useEffect(() => {
    if (fromProps.current) {
      fromProps.current = false
      return
    }
    onChange(toArray(occupied, maxPeriod))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occupied])

  const key = (day: number, period: number) => `${day}-${period}`
  const isOccupied = (day: number, period: number) => occupied.has(key(day, period))

  const setCell = (day: number, period: number, value: boolean) => {
    setOccupied(prev => {
      const next = new Set(prev)
      if (value) next.add(key(day, period))
      else next.delete(key(day, period))
      return next
    })
  }

  const handleMouseDown = (day: number, period: number) => {
    if (disabled) return
    const val = !isOccupied(day, period)
    setDragValue(val)
    setDragging(true)
    setCell(day, period, val)
  }

  const handleMouseEnter = (day: number, period: number) => {
    if (!dragging || disabled) return
    setCell(day, period, dragValue)
  }

  const handleMouseUp = useCallback(() => setDragging(false), [])

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseUp])

  const fillDay = (day: number, value: boolean) => {
    if (disabled) return
    setOccupied(prev => {
      const next = new Set(prev)
      for (let p = 1; p <= maxPeriod; p++) {
        if (value) next.add(key(day, p))
        else next.delete(key(day, p))
      }
      return next
    })
  }

  return (
    <div className="overflow-x-auto select-none" dir="rtl">
      <table className="border-collapse text-xs">
        <thead>
          <tr>
            <th className="w-28" />
            {DAY_LABELS.map((label, d) => (
              <th key={d} className="w-12 text-center pb-1">
                <div className="font-semibold text-gray-700">{label}</div>
                <div className="text-gray-400 font-normal text-[10px]">{DAY_NAMES[d]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periodDefs.map((pd) => (
            <tr key={pd.number}>
              <td className="pl-2 text-right text-gray-600 whitespace-nowrap py-0.5">
                <span className="font-medium">{pd.label}</span>
                <span className="text-gray-400 mr-1 text-[10px]">{pd.start}–{pd.end}</span>
              </td>
              {Array.from({ length: 6 }, (_, d) => {
                const occ = isOccupied(d, pd.number)
                return (
                  <td key={d} className="px-0.5 py-0.5">
                    <div
                      onMouseDown={() => handleMouseDown(d, pd.number)}
                      onMouseEnter={() => handleMouseEnter(d, pd.number)}
                      className={[
                        'w-10 h-8 rounded cursor-pointer border transition-colors',
                        occ
                          ? 'bg-red-400 border-red-500 hover:bg-red-500'
                          : 'bg-white border-gray-200 hover:bg-gray-50',
                        disabled ? 'cursor-default opacity-60 pointer-events-none' : '',
                      ].join(' ')}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
          {/* Column toggle buttons */}
          {!disabled && (
            <tr>
              <td />
              {Array.from({ length: 6 }, (_, d) => {
                const allFull = Array.from({ length: maxPeriod }, (__, i) => i + 1).every(p => isOccupied(d, p))
                return (
                  <td key={d} className="px-0.5 pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => fillDay(d, !allFull)}
                      className="text-[10px] text-gray-400 hover:text-gray-700 underline"
                    >
                      {allFull ? 'נקה' : 'מלא'}
                    </button>
                  </td>
                )
              })}
            </tr>
          )}
        </tbody>
      </table>
      {!disabled && (
        <p className="text-xs text-gray-400 mt-2">לחץ או גרור כדי לסמן/לבטל תפוסה (אדום = תפוס)</p>
      )}
    </div>
  )
}
