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

const viteApiBase = import.meta.env.VITE_API_BASE_URL

export const API_BASE =
  typeof viteApiBase === 'string' && viteApiBase.length > 0 ? viteApiBase : '/api'
