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

  it('handles OpenAI-compat envelope (Gemma 3+ choices[0].message.content stringified)', () => {
    const envelope = {
      id: 'chatcmpl-x',
      object: 'chat.completion',
      created: 1700000000,
      model: '@cf/google/gemma-3-12b-it',
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: JSON.stringify(VALID),
          },
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
    }
    expect(extractClassificationPayload(envelope)).toEqual(VALID)
  })

  it('handles OpenAI-compat envelope with object content (no string parse needed)', () => {
    const envelope = {
      choices: [{ message: { content: VALID } }],
    }
    expect(extractClassificationPayload(envelope)).toEqual(VALID)
  })

  it('returns null on OpenAI envelope where the model ran out of tokens (content: null)', () => {
    // Real failure mode we hit on Gemma 4 with finish_reason='length'.
    const envelope = {
      choices: [
        {
          finish_reason: 'length',
          message: { content: null, reasoning: 'thinking out loud...' },
        },
      ],
    }
    expect(extractClassificationPayload(envelope)).toBeNull()
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
