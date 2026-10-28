import { resolveApiBase, isLocalEnvironment } from './api-config'
export const APP_NAME = 'Padel Check'

export const ROUTES = {
  home: '/',
  designSystem: '/design-system',
  pricing: '/pricing',
  faq: '/faq',
  login: '/login',
  register: '/register',
  app: '/app',
  dashboard: '/app',
  events: '/app/events',
  myTournaments: '/app/my-tournaments',
  eventLocation: '/app/events/location',
  eventDetail: '/app/events/:eventId',
  eventCategory: '/app/events/:eventId/categories/:categoryId/:tab',
  eventCategoryEnroll: '/app/events/:eventId/categories/:categoryId/enroll',
  tournaments: '/app/tournaments',
  categories: '/app/categories',
  players: '/app/players',
  pairs: '/app/pairs',
  courts: '/app/courts',
  matches: '/app/matches',
  settings: '/app/settings',
} as const

export const API_BASE = resolveApiBase(
  import.meta.env.VITE_API_BASE_URL,
  isLocalEnvironment(import.meta.env.VITE_APP_ENV, import.meta.env.DEV && import.meta.env.MODE === 'development'),
  '/api',
)
