import { describe, expect, it } from 'vitest'
import { blocklistSeedData } from './seed'

describe('blocklistSeedData', () => {
  const data = blocklistSeedData()

  it('includes expected freemail providers', () => {
    expect(data.freemail).toContain('gmail.com')
    expect(data.freemail).toContain('protonmail.com')
    expect(data.freemail).toContain('yahoo.com')
  })

  it('includes known disposable providers', () => {
    expect(data.disposable).toContain('mailinator.com')
    expect(data.disposable).toContain('10minutemail.com')
  })

  it('includes strict-only TLDs', () => {
    expect(data.strict).toContain('edu')
    expect(data.strict).toContain('gov')
    expect(data.strict).toContain('mil')
  })

  it('has no empty entries', () => {
    for (const bucket of ['freemail', 'disposable', 'strict'] as const) {
      expect(data[bucket].every((d) => d.length > 0)).toBe(true)
    }
  })
})
