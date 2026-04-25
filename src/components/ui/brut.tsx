// React wrappers for the hi-* primitive classes in src/styles.css.
// Mirrors the primitives defined in the design bundle's hi-tokens.jsx
// (Chip, Btn, Slab, Tag, LogoMark) so route files don't hand-concat
// class strings.

import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

type ClassValue = string | false | null | undefined
function cx(...parts: Array<ClassValue>) {
  return parts.filter(Boolean).join(' ')
}

export function Chip({
  children,
  accent,
  className,
  style,
}: {
  children: ReactNode
  accent?: boolean
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={cx('hi-chip', accent && 'hi-chip-accent', className)}
      style={style}
    >
      {children}
    </span>
  )
}

type BtnVariant = 'default' | 'primary' | 'ghost'
type BtnSize = 'md' | 'sm'

type BtnCommonProps = {
  variant?: BtnVariant
  size?: BtnSize
  className?: string
  children: ReactNode
}

type BtnAsButton = BtnCommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    as?: 'button'
  }

type BtnAsAnchor = BtnCommonProps & {
  as: 'a'
  href: string
  onClick?: () => void
  target?: string
  rel?: string
}

export function Btn(props: BtnAsButton | BtnAsAnchor) {
  const { variant = 'default', size = 'md', className, children } = props
  const cls = cx(
    'hi-btn',
    variant === 'primary' && 'hi-btn-primary',
    variant === 'ghost' && 'hi-btn-ghost',
    size === 'sm' && 'hi-btn-sm',
    'hi-focus',
    className,
  )
  if (props.as === 'a') {
    const { href, onClick, target, rel } = props
    return (
      <a className={cls} href={href} onClick={onClick} target={target} rel={rel}>
        {children}
      </a>
    )
  }
  const { as: _ignored, ...rest } = props as BtnAsButton
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}

export function Slab({
  num,
  children,
  right,
}: {
  num: string
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <div className="hi-slab">
      <span className="hi-slab-num">{num}</span>
      <span style={{ flex: 1 }}>{children}</span>
      {right && <span style={{ color: 'var(--fg-faint)' }}>{right}</span>}
    </div>
  )
}

export type TagKind = 'bug' | 'feat' | 'query' | 'spam'

export function Tag({ kind, children }: { kind: TagKind; children?: ReactNode }) {
  return <span className={`hi-tag hi-tag-${kind}`}>{children ?? kind}</span>
}

export function LogoMark({
  size = 32,
  accent,
}: {
  size?: number
  accent?: string
}) {
  const a = accent ?? 'var(--accent)'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      style={{ display: 'block' }}
      aria-hidden
    >
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="2"
        stroke="var(--border)"
        strokeWidth="2"
        fill={a}
      />
      <path
        d="M8 11h16M8 16h10M8 21h13"
        stroke="var(--accent-ink)"
        strokeWidth="2"
        strokeLinecap="square"
      />
      <circle cx="22" cy="16" r="2" fill="var(--accent-ink)" />
      <circle cx="24" cy="21" r="2" fill="var(--accent-ink)" />
    </svg>
  )
}
