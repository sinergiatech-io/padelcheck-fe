import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { pointValid, type Point } from './venues-model'

/** No location permission is requested: a click is an explicit draft point, never an inferred venue. */
export function VenueMap({ center, initial, onConfirm, onCancel }: { center: Point; initial: Point | null; onConfirm: (point: Point) => void; onCancel: () => void }) {
  const canvas = useRef<HTMLDivElement>(null)
  const markCenter = useRef<(() => void) | null>(null)
  const [point, setPoint] = useState<Point | null>(initial)
  const selectedPoint = useRef<Point | null>(initial)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, retry] = useState(0)
  const latitude = center.latitude, longitude = center.longitude
  const initialLatitude = initial?.latitude, initialLongitude = initial?.longitude
  useEffect(() => {
    if (!canvas.current || !pointValid({ latitude, longitude })) { setFailed(true); return }
    setLoaded(false); setFailed(false)
    const map = L.map(canvas.current, { attributionControl: true }).setView([latitude, longitude], 14)
    map.attributionControl.setPrefix(false)
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>' }).addTo(map)
    let alive = true
    const timeout = window.setTimeout(() => { if (alive) setFailed(true) }, 12000)
    tiles.on('tileload', () => { if (alive) { setLoaded(true); setFailed(false); clearTimeout(timeout) } })
    let marker: L.CircleMarker | undefined
    const select = (p: Point) => {
      if (!pointValid(p)) return
      marker?.remove()
      marker = L.circleMarker([p.latitude, p.longitude], { radius: 10, color: '#120f18', fillColor: '#c9cf38', fillOpacity: 1, weight: 3 }).addTo(map)
      selectedPoint.current = p
      setPoint(p)
    }
    if (selectedPoint.current) select(selectedPoint.current)
    map.on('click', event => select({ latitude: event.latlng.lat, longitude: event.latlng.lng }))
    markCenter.current = () => { const p = map.getCenter(); select({ latitude: p.lat, longitude: p.lng }) }
    return () => { alive = false; markCenter.current = null; clearTimeout(timeout); map.remove() }
  }, [latitude, longitude, initialLatitude, initialLongitude, attempt])
  return <section className="flex flex-col gap-3" aria-label="Ubicación exacta de la sede">
    <h2 className="text-lg font-semibold">Ubicación de la sede</h2>
    <p className="text-sm text-[#605e64]">Tocá el mapa o movelo y marcá el centro. La vista inicial es una referencia de la localidad.</p>
    <div className="relative"><div ref={canvas} className="relative z-0 h-72 rounded-lg" aria-label="Mapa: seleccioná un punto" />{!loaded && !failed && <div role="status" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 rounded-lg bg-[#e7e7e8] text-sm text-[#605e64]"><span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-[#120f18] border-t-transparent motion-reduce:animate-none" />Cargando mapa…</div>}</div>
    <Button variant="secondary" className="h-11" disabled={!loaded || failed} onClick={() => markCenter.current?.()}>Marcar centro</Button>
    {failed && <div role="alert" className="rounded-lg border border-[#fac5c5] bg-[#fdecec] p-3 text-sm">No pudimos cargar el mapa. Podés reintentar o continuar sin ubicación exacta. <button className="min-h-11 underline" onClick={() => retry(n => n + 1)}>Reintentar mapa</button></div>}
    <Button className="h-12" disabled={!point || !loaded || failed} onClick={() => point && onConfirm(point)}>Confirmar punto de sede</Button>
    <Button variant="secondary" className="h-12 border-0 bg-[#e7e7e8]" onClick={onCancel}>Cancelar</Button>
  </section>
}
