import { useCallback, useEffect, useState } from 'react'
import { myTournamentsMockService } from '../api/my-tournaments.mock'
import type { MyTournament } from '../types'

export function useMyTournamentsQuery() {
  const [active, setActive] = useState<MyTournament[]>([])
  const [history, setHistory] = useState<MyTournament[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const [nextActive, nextHistory] = await Promise.all([
      myTournamentsMockService.listActive(),
      myTournamentsMockService.listHistory(),
    ])
    setActive(nextActive)
    setHistory(nextHistory)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { active, history, loading, reload: load }
}
