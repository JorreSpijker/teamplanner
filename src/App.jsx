import { useEffect, useRef, useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import TeamCard from './components/TeamCard'
import PlayerPool from './components/PlayerPool'
import AddTeamModal from './components/AddTeamModal'
import ImportModal from './components/ImportModal'
import PlayerCard from './components/PlayerCard'
import LoginScreen from './components/LoginScreen'
import PlannerInfo from './components/PlannerInfo'
import { loadState, saveState } from './utils/storage'
import { exportDocx } from './utils/exportDocx'
import { exportXlsx } from './utils/exportXlsx'

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem('auth') === '1')
  const [state, setState] = useState(() => loadState())
  const [activePlayer, setActivePlayer] = useState(null)
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [activeTab, setActiveTab] = useState('senioren')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showExportMenu, setShowExportMenu] = useState(false)
  const exportMenuRef = useRef(null)

  useEffect(() => {
    if (!showExportMenu) return
    const handler = (e) => {
      if (!exportMenuRef.current?.contains(e.target)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const persist = (newState) => {
    setState(newState)
    saveState(newState)
  }

  const visibleTeams = state.teams.filter(t => t.type === activeTab)
  const assignedIds = new Set(state.teams.flatMap(t => t.playerIds))
  const poolPlayers = state.players.filter(p => !assignedIds.has(p.id))

  const handleSelect = (playerId, shiftKey) => {
    if (!shiftKey) {
      setSelectedIds(prev => {
        if (prev.size === 1 && prev.has(playerId)) return new Set()
        return new Set([playerId])
      })
      return
    }
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(playerId)) next.delete(playerId)
      else next.add(playerId)
      return next
    })
  }

  const handleDragStart = (event) => {
    const player = state.players.find(p => p.id === event.active.data.current?.playerId)
    setActivePlayer(player ?? null)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    setActivePlayer(null)
    if (!over) return

    const { playerId, sourceTeamId } = active.data.current
    const overData = over.data.current ?? {}
    const destTeamId = overData.destTeamId ?? over.id
    const overPlayerId = overData.overPlayerId ?? null

    if (destTeamId === 'pool' && sourceTeamId === null) return

    const isDraggingSelected = selectedIds.has(playerId)
    const toMove = isDraggingSelected ? [...selectedIds] : [playerId]

    if (!isDraggingSelected && sourceTeamId && sourceTeamId === destTeamId && overPlayerId && overPlayerId !== playerId) {
      const newTeams = state.teams.map(team => {
        if (team.id !== sourceTeamId) return team
        const fromIndex = team.playerIds.indexOf(playerId)
        const toIndex = team.playerIds.indexOf(overPlayerId)
        if (fromIndex === -1 || toIndex === -1) return team

        const nextIds = [...team.playerIds]
        nextIds.splice(fromIndex, 1)
        const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex
        nextIds.splice(insertAt, 0, playerId)
        return { ...team, playerIds: nextIds }
      })

      persist({ ...state, teams: newTeams })
      return
    }

    if (destTeamId === sourceTeamId) return

    const sourceTeams = isDraggingSelected
      ? state.teams.reduce((acc, t) => {
          const hits = t.playerIds.filter(id => toMove.includes(id))
          if (hits.length) acc[t.id] = hits
          return acc
        }, {})
      : { [sourceTeamId]: [playerId] }

    const newTeams = state.teams.map(team => {
      let playerIds = [...team.playerIds]
      if (sourceTeams[team.id]) {
        playerIds = playerIds.filter(id => !sourceTeams[team.id].includes(id))
      }
      if (team.id === destTeamId) {
        toMove.forEach(id => { if (!playerIds.includes(id)) playerIds.push(id) })
      }
      return { ...team, playerIds }
    })

    setSelectedIds(new Set())
    persist({ ...state, teams: newTeams })
  }

  const addTeam = (team) => persist({ ...state, teams: [...state.teams, { ...team, type: activeTab }] })

  const removeTeam = (teamId) => persist({
    ...state,
    teams: state.teams.filter(t => t.id !== teamId),
  })

  const updateTeam = (teamId, updates) => persist({
    ...state,
    teams: state.teams.map(t => t.id === teamId ? { ...t, ...updates } : t),
  })

  const handleNewPlan = (importedPlayers) => persist({ players: importedPlayers, teams: [] })

  const handleAddPlayers = (importedPlayers) => {
    const existingNames = new Set(state.players.map(p => p.name.toLowerCase()))
    const newPlayers = importedPlayers.filter(p => !existingNames.has(p.name.toLowerCase()))
    persist({ ...state, players: [...state.players, ...newPlayers] })
  }

  const handleImportJSON = (jsonState) => persist(jsonState)

  const handleUpdatePlayer = (updatedPlayer) => persist({
    ...state,
    players: state.players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p),
  })

  const handleDeletePlayer = (playerId) => persist({
    ...state,
    players: state.players.filter(p => p.id !== playerId),
    teams: state.teams.map(t => ({ ...t, playerIds: t.playerIds.filter(id => id !== playerId) })),
  })

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'teamindeling.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
          <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
            <h1 className="text-lg font-bold text-gray-900">Teamindeling</h1>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                onClick={() => setShowImport(true)}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
              >
                Nieuwe teamindeling
              </button>
              <button
                onClick={() => setShowAddTeam(true)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                + Team toevoegen
              </button>
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(v => !v)}
                  disabled={state.teams.length === 0 && state.players.length === 0}
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Exporteren
                  <span className="text-xs">▾</span>
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={() => { exportXlsx(state); setShowExportMenu(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Exporteer Excel
                    </button>
                    <button
                      onClick={() => { exportDocx(state); setShowExportMenu(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Exporteer DOCX
                    </button>
                    <button
                      onClick={() => { exportJSON(); setShowExportMenu(false) }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Exporteer JSON
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-screen-2xl mx-auto px-6 py-6 flex gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
              {['senioren', 'jeugd'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-sm rounded-md font-medium capitalize transition-colors ${
                    activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
              Teams ({visibleTeams.length})
            </h2>
            {visibleTeams.length === 0 && (
              <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300 text-sm">
                Geen teams aangemaakt. Klik op "+ Team toevoegen" om te beginnen.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visibleTeams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  players={state.players}
                  selectedIds={selectedIds}
                  onSelect={handleSelect}
                  onRemove={() => removeTeam(team.id)}
                  onUpdate={(updates) => updateTeam(team.id, updates)}
                  onEditPlayer={handleUpdatePlayer}
                />
              ))}
            </div>
          </div>

          <div className="w-72 shrink-0">
            <div className="sticky top-[100px]">
              <PlayerPool players={poolPlayers} selectedIds={selectedIds} onSelect={handleSelect} onAddPlayers={handleAddPlayers} onEditPlayer={handleUpdatePlayer} onDeletePlayer={handleDeletePlayer} />
              <PlannerInfo />
            </div>
          </div>
        </main>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePlayer && <PlayerCard player={activePlayer} isDragging />}
      </DragOverlay>

      {showAddTeam && (
        <AddTeamModal onAdd={addTeam} onClose={() => setShowAddTeam(false)} type={activeTab} />
      )}
      {showImport && (
        <ImportModal
          onNewPlan={handleNewPlan}
          onAddPlayers={handleAddPlayers}
          onImportJSON={handleImportJSON}
          onClose={() => setShowImport(false)}
        />
      )}
    </DndContext>
  )
}
