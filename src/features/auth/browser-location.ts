import { PositionError, type PositionProvider } from './registration-location'

export const browserPosition: PositionProvider = {
  async permission() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unavailable'
    try { return (await navigator.permissions.query({ name: 'geolocation' })).state }
    catch { return 'prompt' }
  },
  position(signal) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation || signal.aborted) { reject(new PositionError('unavailable')); return }
      const abort = () => reject(new PositionError('unavailable'))
      signal.addEventListener('abort', abort, { once: true })
      navigator.geolocation.getCurrentPosition(position => {
        signal.removeEventListener('abort', abort)
        if (!signal.aborted) resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      }, error => {
        signal.removeEventListener('abort', abort)
        reject(new PositionError(error.code === 1 ? 'denied' : 'unavailable'))
      }, { timeout: 14000, maximumAge: 30000, enableHighAccuracy: false })
    })
  },
}
