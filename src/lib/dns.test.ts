import { describe, expect, it } from 'vitest'
import {
  verifyRecordName,
  verifyRecordValue,
  VERIFY_RECORD_PREFIX,
  VERIFY_VALUE_PREFIX,
} from './dns'

describe('DNS record shaping', () => {
  it('builds the canonical record name', () => {
    expect(verifyRecordName('acme.com')).toBe('_feedback.acme.com')
    expect(verifyRecordName('eng.acme.com')).toBe('_feedback.eng.acme.com')
  })

  it('builds the canonical record value', () => {
    expect(verifyRecordValue('abc123')).toBe('feedback-verify=abc123')
  })

  it('constants are stable', () => {
    expect(VERIFY_RECORD_PREFIX).toBe('_feedback')
    expect(VERIFY_VALUE_PREFIX).toBe('feedback-verify=')
  })
})
