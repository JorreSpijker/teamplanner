import { useDroppable } from '@dnd-kit/core'
import PlayerCard from './PlayerCard'
import AgeBandwidthBar from './AgeBandwidthBar'

function calculateAge(birthdate) {
  if (!birthdate) return null
  const today = new Date()
  const birth = new Date(birthdate)
  const age = (today - birth) / (365.25 * 24 * 60 * 60 * 1000)
  return isNaN(age) || age < 0 ? null : age
}

const U_CAT_MIN_YEAR = { U19: 2007, U17: 2009, U15: 2011 }

const COLOR_RULES = [
  { name: 'Rood',   min: 14, max: 18, bg: 'bg-red-100',    text: 'text-red-700',    specs: '2 vakken · 3.5m · K5 · wissel per 2 doelpunten' },
  { name: 'Oranje', min: 12, max: 13, bg: 'bg-orange-100', text: 'text-orange-700', specs: '2 vakken · 3.5m · K5 · wissel op tijd' },
  { name: 'Geel',   min: 10, max: 11, bg: 'bg-yellow-100', text: 'text-yellow-700', specs: '2 vakken · 3m · K4 · wissel op tijd' },
  { name: 'Groen',  min:  8, max:  9, bg: 'bg-green-100',  text: 'text-green-700',  specs: '1 vak · 3m · K4 · geen wissel' },
  { name: 'Blauw',  min:  5, max:  7, bg: 'bg-blue-100',   text: 'text-blue-700',   specs: '1 vak · 2.5m · K3 · geen wissel' },
]

function getTeamColor(avgAge) {
  if (avgAge === null) return null
  const age = Math.floor(avgAge)
  return COLOR_RULES.find(c => age >= c.min && age <= c.max) ?? null
}

function getTeamStats(team, allPlayers) {
  const players = team.playerIds.map(id => allPlayers.find(p => p.id === id)).filter(Boolean)
  const exactAges = players.map(p => calculateAge(p.birthdate)).filter(v => v !== null)
  const avgAge = exactAges.length
    ? Math.round(exactAges.reduce((a, b) => a + b, 0) / exactAges.length * 10) / 10
    : null
  const males = players.filter(p => p.gender !== 'f').length
  const females = players.filter(p => p.gender === 'f').length

  const warnings = []

  if (team.type === 'jeugd') {
    if (team.category === 'B') {
      const is4tal = team.format === '4tal'
      const maxSpread = is4tal ? 2 : 3
      if (exactAges.length >= 2) {
        const spread = Math.max(...exactAges) - Math.min(...exactAges)
        if (spread > maxSpread) {
          warnings.push(`Bandbreedte ${spread.toFixed(1)}j > max ${maxSpread}j`)
        }
      }
      if (!is4tal && avgAge !== null && avgAge < 9.0) {
        warnings.push(`Gem. leeftijd ${avgAge}j < 9.0j voor 8-tal`)
      }
    } else if (team.category === 'A') {
      const minYear = U_CAT_MIN_YEAR[team.uCategory]
      if (minYear) {
        const tooOld = players.filter(p => {
          if (!p.birthdate) return false
          return new Date(p.birthdate).getFullYear() < minYear
        })
        if (tooOld.length > 0) {
          warnings.push(`${tooOld.length} speler(s) te oud voor ${team.uCategory}`)
        }
      }
    }
  } else {
    if (team.category === 'A') {
      if (males < 4 || females < 4) warnings.push(`${males}/4 ♂  ${females}/4 ♀`)
    } else if (team.category === 'B') {
      if (players.length < 8) warnings.push(`${players.length}/8 spelers`)
    }
  }

  const valid = warnings.length === 0
  const validMsg = valid ? 'Geldig' : warnings.join(' · ')

  return { players, avgAge, males, females, valid, validMsg, exactAges }
}

export default function TeamCard({ team, players: allPlayers, selectedIds, onSelect, onRemove, onUpdate, onEditPlayer }) {
  const { setNodeRef, isOver } = useDroppable({ id: team.id })
  const stats = getTeamStats(team, allPlayers)
  const color = team.type === 'jeugd' ? getTeamColor(stats.avgAge) : null

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-colors ${
      isOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'
    }`}>
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-bold text-gray-900 text-sm">{team.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
            stats.valid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {stats.validMsg}
          </span>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 text-xl leading-none shrink-0 px-1"
        >
          ×
        </button>
      </div>

      <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <label className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-gray-200">
            <span className="font-medium text-gray-500">Cat</span>
            <select
              value={team.category}
              onChange={e => onUpdate({ category: e.target.value })}
              className="bg-transparent font-semibold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </label>

          {stats.avgAge !== null && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-gray-200">
              <span className="font-medium text-gray-500 mr-1">Gem. leeftijd</span>
              <span className="font-semibold text-gray-800">{stats.avgAge}j</span>
            </span>
          )}

          {team.type === 'jeugd' && team.category === 'A' && team.uCategory && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-gray-200 font-semibold text-indigo-700">
              {team.uCategory}
            </span>
          )}

          {team.type === 'jeugd' && team.category === 'B' && stats.exactAges.length >= 2 && (
            <span className="relative inline-flex">
              <span
                tabIndex={0}
                className="group inline-flex items-center px-2 py-1 rounded-md bg-white border border-gray-200 cursor-help"
              >
                <span className="font-medium text-gray-500 mr-1">Bandbreedte</span>
                <span className="font-semibold text-gray-800">
                  {(Math.max(...stats.exactAges) - Math.min(...stats.exactAges)).toFixed(1)}j
                </span>
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-max -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                  Max bandbreedte: {team.format === '4tal' ? '2 jaar (4-tal)' : '3 jaar (8-tal)'}
                </span>
              </span>
            </span>
          )}

          {team.type === 'jeugd' && team.category === 'B' && (
            <span className="inline-flex items-center px-2 py-1 rounded-md bg-white border border-gray-200 font-medium text-gray-700">
              {team.format === '4tal' ? '4-tal' : '8-tal'}
            </span>
          )}

          {stats.players.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-gray-200">
              <span className="text-blue-600 font-semibold">♂ {stats.males}</span>
              <span className="text-gray-300">/</span>
              <span className="text-pink-600 font-semibold">♀ {stats.females}</span>
            </span>
          )}

          {team.category === 'B' && color && (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium border border-white/30 ${color.bg} ${color.text}`}>
              {color.name}
              <span className="font-normal opacity-80">· {color.specs}</span>
            </span>
          )}
        </div>
      </div>

      {team.type === 'jeugd' && team.category === 'B' && stats.players.length > 0 && (
        <AgeBandwidthBar
          players={stats.players}
          maxSpread={team.format === '4tal' ? 2 : 3}
        />
      )}

      <div
        ref={setNodeRef}
        className={`p-3 min-h-20 flex flex-col gap-2 transition-colors ${isOver ? 'bg-blue-50' : ''}`}
      >
        {stats.players.length === 0 ? (
          <div className="text-center text-gray-400 text-xs py-4">
            Sleep spelers hiernaartoe
          </div>
        ) : (
          stats.players.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              sourceTeamId={team.id}
              isSelected={selectedIds?.has(player.id)}
              onSelect={onSelect}
              onEditPlayer={onEditPlayer}
            />
          ))
        )}
      </div>
    </div>
  )
}
