/** Placeholders (and banner mode) per wizard. The player registration keeps its original text and inline retry. */
export interface LocationFieldCopy {
  provincePlaceholder: string
  localityPlaceholder: string
  localityWaiting: string
  localityLoading: string
  /** Club wizard (KAN-251): banners with «Reintentar carga» and the province-change notice instead of inline retry text. */
  banners?: boolean
}
export const playerLocationCopy: LocationFieldCopy = {
  provincePlaceholder: 'Seleccioná una provincia',
  localityPlaceholder: 'Seleccioná una localidad',
  localityWaiting: 'Seleccioná una localidad',
  localityLoading: 'Cargando localidades…',
}
export const clubLocationCopy: LocationFieldCopy = {
  provincePlaceholder: 'Seleccioná provincia',
  localityPlaceholder: 'Seleccioná localidad',
  localityWaiting: 'Elegí primero provincia',
  localityLoading: 'Cargando localidades…',
  banners: true,
}
