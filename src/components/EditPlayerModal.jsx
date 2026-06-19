import { useState } from 'react'

export default function EditPlayerModal({ player, onSave, onDelete, onClose }) {
  const [name, setName] = useState(player.name)
  const [birthdate, setBirthdate] = useState(player.birthdate || '')
  const [gender, setGender] = useState(player.gender || 'm')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({ ...player, name: trimmed, birthdate, gender })
    onClose()
  }

  const handleDelete = () => {
    onDelete(player.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl p-6 w-80 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-gray-900 mb-4">Speler aanpassen</h2>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Naam</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Geboortedatum</span>
            <input
              type="date"
              value={birthdate}
              onChange={e => setBirthdate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-600">Geslacht</span>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="m">♂ Man</option>
              <option value="f">♀ Vrouw</option>
            </select>
          </label>
        </div>

        <div className="flex justify-between mt-5">
          {onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Definitief verwijderen?</span>
                <button
                  onClick={handleDelete}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Ja
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  Nee
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Verwijderen
              </button>
            )
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
              Annuleren
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-40"
            >
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
