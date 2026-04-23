'use client'
import { useState, KeyboardEvent } from 'react'

interface SkillInputProps {
  skills: string[]
  onChange: (skills: string[]) => void
  placeholder?: string
  quickSuggestions?: string[]
  chipVariant?: 'indigo' | 'violet'
}

export default function SkillInput({
  skills,
  onChange,
  placeholder = 'Type a skill and press Enter',
  quickSuggestions,
  chipVariant = 'indigo',
}: Readonly<SkillInputProps>) {
  const [input, setInput] = useState('')

  const add = (s?: string) => {
    const skill = (s ?? input).trim()
    if (skill && !skills.includes(skill)) {
      onChange([...skills, skill])
      setInput('')
    }
  }

  const remove = (s: string) => onChange(skills.filter(x => x !== s))

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !input && skills.length) {
      const lastSkill = skills.at(-1)
      if (lastSkill) {
        remove(lastSkill)
      }
    }
  }

  const chipCls = chipVariant === 'violet'
    ? 'bg-violet-50 text-violet-700 border-violet-100 ring-1 ring-violet-200'
    : 'bg-indigo-50 text-indigo-700 border-indigo-100 ring-1 ring-indigo-200'
  const dotCls  = chipVariant === 'violet' ? 'hover:bg-violet-200 text-violet-400' : 'hover:bg-indigo-200 text-indigo-400'
  const inputCls = chipVariant === 'violet' ? 'input-hr' : 'input'
  const btnCls   = chipVariant === 'violet'
    ? 'bg-violet-100 hover:bg-violet-200 text-violet-700'
    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className={`flex-1 ${inputCls}`}
        />
        <button
          type="button"
          onClick={() => add()}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${btnCls}`}
        >
          Add
        </button>
      </div>

      {quickSuggestions && quickSuggestions.some(s => !skills.includes(s)) && (
        <div className="flex flex-wrap gap-1.5">
          {quickSuggestions.filter(s => !skills.includes(s)).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="text-xs border border-dashed border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 px-2.5 py-1 rounded-full transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map(s => (
            <span key={s} className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${chipCls}`}>
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${dotCls}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
