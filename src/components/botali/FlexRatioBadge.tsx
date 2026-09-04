import { FLEX_REFERENCE_PERCENT } from '../../utils/flexFuel'

interface Props {
  percentage: number
  favorable: boolean
  compact?: boolean
}

export function FlexRatioBadge({ percentage, favorable, compact = false }: Props) {
  const text = favorable ? 'Etanol compensa' : 'Gasolina tende a compensar'
  return <span className={`flex-ratio ${favorable ? 'favorable' : 'unfavorable'}`} title={`Referência configurada: ${FLEX_REFERENCE_PERCENT}%`}>
    {compact ? `Etanol ${percentage}%` : `${text} · ${percentage}%`}
  </span>
}
