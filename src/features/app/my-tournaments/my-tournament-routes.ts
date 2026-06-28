import { eventCategoryTabPath, getDefaultCategoryTab } from '../events/category-routes'
import type { MyTournament } from './types'

export function myTournamentCategoryPath(tournament: MyTournament) {
  return eventCategoryTabPath(tournament.eventId, tournament.categoryId, getDefaultCategoryTab(tournament.status))
}
