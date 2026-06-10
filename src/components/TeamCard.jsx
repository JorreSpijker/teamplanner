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

      <div className="px-4 py-2 flex flex-wrap gap-3 text-xs text-gray-500 border-b border-gray-100">
        <label className="flex items-center gap-1">
          <span className="font-medium text-gray-600">Klasse:</span>
          <input
            type="text"
            value={team.class || ''}
            onChange={e => onUpdate({ class: e.target.value })}
            placeholder="–"
            className="w-14 bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-blue-400 text-xs"
          />
        </label>
        <label className="flex items-center gap-1">
          <span className="font-medium text-gray-600">Cat:</span>
          <select
            value={team.category}
            onChange={e => onUpdate({ category: e.target.value })}
            className="bg-transparent text-xs focus:outline-none cursor-pointer"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>
        {stats.avgAge !== null && (
          <span>
            <span className="font-medium text-gray-600">Gem. leeftijd:</span> {stats.avgAge}j
          </span>
        )}
        {team.type === 'jeugd' && team.category === 'A' && team.uCategory && (
          <span className="font-medium text-purple-600">{team.uCategory}</span>
        )}
        {team.type === 'jeugd' && team.category === 'B' && stats.exactAges.length >= 2 && (
          <span>
            <span className="font-medium text-gray-600">Bandbreedte:</span>{' '}
            {(Math.max(...stats.exactAges) - Math.min(...stats.exactAges)).toFixed(1)}j
          </span>
        )}
        {team.type === 'jeugd' && team.category === 'B' && (
          <span className="text-gray-500">{team.format === '4tal' ? '4-tal' : '8-tal'}</span>
        )}
        {team.category === 'A' && team.type !== 'jeugd' && stats.players.length > 0 && (
          <span>
            <span className="text-blue-600 font-medium">♂ {stats.males}</span>
            {' · '}
            <span className="text-pink-600 font-medium">♀ {stats.females}</span>
          </span>
        )}
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
