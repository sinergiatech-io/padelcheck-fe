import { useState } from 'react'
import {
  Trophy,
  Users,
  Mail,
  Lock,
  Search,
  Calendar,
  MapPin,
  Bell,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, InputGroup } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const swatches = [
  { name: 'Primary 500', token: 'primary-500', hex: '#C9CF38' },
  { name: 'Primary 600', token: 'primary-600', hex: '#B4BA2F' },
  { name: 'Primary 700', token: 'primary-700', hex: '#9DA226' },
  { name: 'Primary 100', token: 'primary-100', hex: '#F1F3C2' },
  { name: 'Dark 900', token: 'dark-900', hex: '#120F18' },
  { name: 'Dark 800', token: 'dark-800', hex: '#1E1A27' },
  { name: 'Dark 700', token: 'dark-700', hex: '#2A2536' },
  { name: 'Background', token: 'background', hex: '#F5F5F5' },
  { name: 'Surface', token: 'surface', hex: '#FFFFFF' },
  { name: 'Divider', token: 'divider', hex: '#E6E6E6' },
  { name: 'Success', token: 'success', hex: '#22C55E' },
  { name: 'Warning', token: 'warning', hex: '#F59E0B' },
  { name: 'Error', token: 'error', hex: '#EF4444' },
  { name: 'Info', token: 'info', hex: '#3B82F6' },
]

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-6 border-b border-divider pb-12 last:border-0">
      <div>
        <h2 className="text-h2 text-dark-900">{title}</h2>
        {description ? <p className="mt-2 text-body-sm text-dark-700">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function DesignSystemPage() {
  const [catA, setCatA] = useState(true)
  const [catB, setCatB] = useState(false)
  const [notif, setNotif] = useState(true)
  const [format, setFormat] = useState('grupos')

  return (
    <div className="min-h-screen bg-background px-4 py-10 md:px-10 md:py-12">
      <div className="mx-auto max-w-5xl space-y-16">
        <header>
          <p className="text-caption font-medium uppercase tracking-wide text-dark-700">
            Padel Check
          </p>
          <h1 className="mt-2 text-display text-dark-900">UI Kit / Design system</h1>
          <p className="mt-4 max-w-2xl text-body text-dark-700">
            Espejo de referencia del archivo de Figma: colores, tipografía, botones, inputs, cards,
            chips y tabla. Usá estos tokens y componentes en toda la app.
          </p>
        </header>

        <Section title="Colores" description="Tokens mapeados desde el brand manual.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {swatches.map(({ name, token, hex }) => (
              <div
                key={token}
                className="flex overflow-hidden rounded-lg border border-divider bg-surface shadow-card"
              >
                <div className="h-20 w-20 shrink-0 rounded-l-lg" style={{ backgroundColor: hex }} />
                <div className="flex flex-1 flex-col justify-center px-4 py-3">
                  <p className="text-body-sm font-medium text-dark-900">{name}</p>
                  <p className="text-caption text-dark-700">{hex}</p>
                  <p className="text-caption text-dark-700/80">{token}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-divider p-4 text-body-sm bg-success-bg text-success">
              Success BG
            </div>
            <div className="rounded-lg border border-divider p-4 text-body-sm bg-warning-bg text-warning">
              Warning BG
            </div>
            <div className="rounded-lg border border-divider p-4 text-body-sm bg-error-bg text-error">
              Error BG
            </div>
            <div className="rounded-lg border border-divider p-4 text-body-sm bg-info-bg text-info">
              Info BG
            </div>
          </div>
        </Section>

        <Section title="Tipografía" description="Familia Inter — escala del sistema.">
          <div className="space-y-6 rounded-lg border border-divider bg-surface p-4 shadow-card sm:p-8">
            <p className="text-display">H1 — Display · 32px Bold</p>
            <p className="text-h2">H2 — Heading · 24px SemiBold</p>
            <p className="text-h3">H3 — Subheading · 20px SemiBold</p>
            <p className="text-h4">H4 — Section · 18px Medium</p>
            <p className="text-body">
              Body — Regular · 16px. Padel Check profesionaliza la gestión de clubes y torneos.
            </p>
            <p className="text-body-sm">
              Body small — 14px. Menos planillas, más pádel. Simplificamos la administración.
            </p>
            <p className="text-caption text-dark-700">
              Caption — 12px. Última actualización: referencia de diseño.
            </p>
          </div>
        </Section>

        <Section title="Botones">
          <div className="space-y-8">
            <div>
              <h3 className="text-h4 text-dark-900">Primary</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button>Crear Torneo</Button>
                <Button>
                  <Users className="h-4 w-4" />
                  Nuevo Jugador
                </Button>
                <Button disabled>Procesando...</Button>
              </div>
            </div>
            <div>
              <h3 className="text-h4 text-dark-900">Secondary</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary">Cancelar</Button>
                <Button variant="secondary">
                  <Trophy className="h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-h4 text-dark-900">Destructive</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="destructive">Eliminar</Button>
              </div>
            </div>
            <div>
              <h3 className="text-h4 text-dark-900">Ghost &amp; link</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="ghost">Ver más</Button>
                <Button variant="link">
                  Más información
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <h3 className="text-h4 text-dark-900">Tamaños</h3>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" variant="secondary" aria-label="Calendario">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Inputs y controles">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ds-name">Nombre completo</Label>
                <Input id="ds-name" defaultValue="Juan Pérez" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-email">Email</Label>
                <InputGroup left={<Mail className="h-5 w-5" />}>
                  <Input id="ds-email" className="pl-10" type="email" defaultValue="juan@ejemplo.com" />
                </InputGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-pass">Contraseña</Label>
                <InputGroup left={<Lock className="h-5 w-5" />}>
                  <Input id="ds-pass" className="pl-10" type="password" defaultValue="••••••••" />
                </InputGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-search">Buscar jugador</Label>
                <InputGroup left={<Search className="h-5 w-5" />}>
                  <Input id="ds-search" className="pl-10" placeholder="Buscar..." />
                </InputGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-dis">Campo deshabilitado</Label>
                <Input id="ds-dis" disabled defaultValue="No editable" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select defaultValue="a">
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a">Categoría A</SelectItem>
                    <SelectItem value="b">Categoría B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-notes">Notas del torneo</Label>
                <Textarea
                  id="ds-notes"
                  placeholder="Escribe información adicional sobre el torneo..."
                />
              </div>
              <div className="space-y-3">
                <Label>Categorías disponibles</Label>
                <div className="flex items-center gap-2">
                  <Checkbox id="c1" checked={catA} onCheckedChange={(v) => setCatA(v === true)} />
                  <Label htmlFor="c1" className="font-normal">
                    Categoría A
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="c2" checked={catB} onCheckedChange={(v) => setCatB(v === true)} />
                  <Label htmlFor="c2" className="font-normal">
                    Categoría B
                  </Label>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="sw-notif">Notificaciones</Label>
                <Switch id="sw-notif" checked={notif} onCheckedChange={setNotif} />
              </div>
              <div className="space-y-2">
                <Label>Formato del torneo</Label>
                <RadioGroup value={format} onValueChange={setFormat} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="directa" id="r1" />
                    <Label htmlFor="r1" className="font-normal">
                      Eliminación directa
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="grupos" id="r2" />
                    <Label htmlFor="r2" className="font-normal">
                      Fase de grupos
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary">Activo</Badge>
                  </div>
                  <CardTitle>Torneo de Verano</CardTitle>
                  <CardDescription>Masculino · Intermedio</CardDescription>
                </div>
                <Trophy className="h-6 w-6 shrink-0 text-dark-700" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-body-sm text-dark-700">
                  <Calendar className="h-4 w-4" />
                  15 - 22 Marzo 2026
                </div>
                <Button className="w-full">Ver detalles</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Users className="h-6 w-6 text-dark-700" />
                <CardTitle>Jugadores activos</CardTitle>
                <CardDescription>Este mes</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-display">142</p>
                <p className="text-body-sm text-success">+12% vs mes anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <MapPin className="h-6 w-6 text-dark-700" />
                <CardTitle>Actividad reciente</CardTitle>
                <CardDescription>Últimas 24 horas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-body-sm">
                <p>Nuevo torneo creado</p>
                <p className="text-caption text-dark-700">Hace 2 horas</p>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Chips / Badges">
          <div className="flex flex-wrap gap-2">
            <Badge variant="primary">Activo</Badge>
            <Badge variant="neutral">Inscripciones abiertas</Badge>
            <Badge variant="info">En progreso</Badge>
            <Badge variant="warning">Próximo</Badge>
            <Badge variant="default">Finalizado</Badge>
            <Badge variant="destructive">Cancelado</Badge>
            <Badge variant="outline">Masculino</Badge>
            <Badge variant="success">Disponible</Badge>
            <Badge size="sm">Small</Badge>
            <Badge size="lg">Large</Badge>
          </div>
        </Section>

        <Section title="Iconografía" description="Lucide React (misma línea que el kit de diseño).">
          <div className="flex flex-wrap gap-4 text-dark-700">
            <Trophy className="h-8 w-8" />
            <Users className="h-8 w-8" />
            <Calendar className="h-8 w-8" />
            <Bell className="h-8 w-8" />
            <Search className="h-8 w-8" />
          </div>
        </Section>

        <Section title="Tabla">
          <Card>
            <CardHeader>
              <CardTitle>Partidos</CardTitle>
              <CardDescription>Ejemplo de tabla con tokens del sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableCaption>Fixture de ejemplo</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cancha</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>15 Mar</TableCell>
                    <TableCell>1</TableCell>
                    <TableCell>
                      <Badge variant="success" size="sm">
                        Finalizado
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>16 Mar</TableCell>
                    <TableCell>2</TableCell>
                    <TableCell>
                      <Badge variant="warning" size="sm">
                        Pendiente
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="text-caption text-dark-700">Padel Check · UI Kit</CardFooter>
          </Card>
        </Section>
      </div>
    </div>
  )
}
