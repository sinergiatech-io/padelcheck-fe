const STORAGE_KEY = 'padelcheck-selected-location-id'

export const DEFAULT_LOCATION_ID = 'buenos-aires'

export function getSelectedLocationId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LOCATION_ID
  } catch {
    return DEFAULT_LOCATION_ID
  }
}

export function setSelectedLocationId(locationId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, locationId)
  } catch {
    /* ignore */
  }
}
