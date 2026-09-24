import { Coffee, Code2, Database, Network, Terminal, Layers3 } from 'lucide-react'
import type { LearningPath } from '../types'

const icons = { coffee: Coffee, code: Code2, database: Database, network: Network, terminal: Terminal, layers: Layers3 }

export function PathIcon({ path, small = false }: { path: LearningPath; small?: boolean }) {
  const Icon = icons[path.icon]
  return <span className={`path-icon ${path.color} ${small ? 'small' : ''}`}><Icon size={small ? 16 : 23} strokeWidth={1.65} aria-hidden="true" /></span>
}
