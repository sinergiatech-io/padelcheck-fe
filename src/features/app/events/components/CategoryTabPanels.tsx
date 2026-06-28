import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CategoryBracketsTab } from './CategoryBracketsTab'
import { CategoryQualifierTab } from './CategoryQualifierTab'
import { RegistrationList } from './RegistrationList'
import type { EventCategory } from '../types'

export function CategoryMatchesTab({ category }: { category: EventCategory }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Partidos · {category.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {category.matches.map((match) => (
          <div key={match.id} className="rounded-md border border-divider p-3">
            <p className="text-caption font-medium uppercase tracking-wide text-[#605e64]">{match.scheduledLabel}</p>
            <p className="text-body-sm text-dark-700">{match.court}</p>
            <p className="mt-2 text-body-sm font-medium text-dark-900">
              {match.teamA} vs {match.teamB}
            </p>
            {match.score ? <p className="text-body-sm text-dark-700">{match.score}</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function CategoryRegistrationsTab({ category }: { category: EventCategory }) {
  return <RegistrationList registrations={category.registrations} />
}

export function CategoryQualifierTabPanel({ category }: { category: EventCategory }) {
  return <CategoryQualifierTab zones={category.qualifierZones} />
}

export function CategoryBracketsTabPanel({ category }: { category: EventCategory }) {
  return <CategoryBracketsTab rounds={category.bracketRounds} />
}
