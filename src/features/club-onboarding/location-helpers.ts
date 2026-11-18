import { PositionError, type PositionProvider, type ResolvedLocation } from '@/features/auth/registration-location'
import type { SavedLocation } from './flow'

/** The administrator's device location never decides the club or venue location (KAN-251): no GPS here. */
export const noDevicePosition: PositionProvider = {
  permission: async () => 'unavailable',
  position: async () => { throw new PositionError('unavailable') },
}
export const toSavedLocation = (value: ResolvedLocation): SavedLocation => ({
  countryCode: 'AR', provinceId: value.provinceId, localityId: value.localityId, provinceName: value.provinceName, localityName: value.localityName,
})
export function focusFirstInvalid() {
  requestAnimationFrame(() => {
    const invalid = [...document.querySelectorAll<HTMLElement>('[aria-invalid="true"]')]
    ;(invalid.find(field => !field.hasAttribute('disabled')) ?? invalid[0])?.focus()
  })
}
