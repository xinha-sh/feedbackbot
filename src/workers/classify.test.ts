import { describe, expect, it } from 'vitest'

import { extractClassificationPayload } from './classify'

const VALID = {
  primary_type: 'bug',
  secondary_types: [],
  confidence: 0.9,
  summary: 's',
  suggested_title: 't',
  reasoning: 'r',
}

describe('extractClassificationPayload', () => {
  it('handles { response: <object> } (already-parsed)', () => {
    expect(extractClassificationPayload({ response: VALID })).toEqual(VALID)
  })

  it('handles { response: "<json string>" }', () => {
    expect(
      extractClassificationPayload({ response: JSON.stringify(VALID) }),
    ).toEqual(VALID)
  })

  it('handles { result: <object> }', () => {
    expect(extractClassificationPayload({ result: VALID })).toEqual(VALID)
  })

  it('handles { result: "<json string>" }', () => {
    expect(
      extractClassificationPayload({ result: JSON.stringify(VALID) }),
    ).toEqual(VALID)
  })

  it('handles top-level shape (SDK already unwrapped)', () => {
    expect(extractClassificationPayload(VALID)).toEqual(VALID)
  })

  it('returns null on unrecognized envelope', () => {
    expect(extractClassificationPayload({ foo: 'bar' })).toBeNull()
    expect(extractClassificationPayload(null)).toBeNull()
    expect(extractClassificationPayload('plain string')).toBeNull()
  })

  it('returns null when the inner object is missing primary_type', () => {
    expect(
      extractClassificationPayload({ response: { confidence: 0.9 } }),
    ).toBeNull()
  })

  it('returns null on un-parseable JSON string', () => {
    expect(
      extractClassificationPayload({ response: 'not json {' }),
    ).toBeNull()
  })
})
