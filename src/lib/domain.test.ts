import { describe, expect, it } from 'vitest'
import {
  domainFromHeader,
  normalizeDomain,
  sameRegistrableDomain,
} from './domain'

describe('normalizeDomain', () => {
  it('strips scheme + path + www', () => {
    expect(normalizeDomain('https://www.Example.co.uk/path')).toBe(
      'example.co.uk',
    )
  })
  it('collapses subdomains to the eTLD+1', () => {
    expect(normalizeDomain('sub.example.com')).toBe('example.com')
    expect(normalizeDomain('api.team.acme.io')).toBe('acme.io')
  })
  it('returns null for IPs', () => {
    expect(normalizeDomain('127.0.0.1')).toBeNull()
    expect(normalizeDomain('https://192.168.0.1/x')).toBeNull()
  })
  it('returns null for empty / unparseable input', () => {
    expect(normalizeDomain(null)).toBeNull()
    expect(normalizeDomain(undefined)).toBeNull()
    expect(normalizeDomain('')).toBeNull()
    expect(normalizeDomain('localhost')).toBeNull()
  })
  it('lowercases', () => {
    expect(normalizeDomain('FOO.COM')).toBe('foo.com')
  })
})

describe('domainFromHeader', () => {
  it('prefers origin over referer', () => {
    expect(
      domainFromHeader('https://a.com', 'https://b.com/page'),
    ).toBe('a.com')
  })
  it('falls back to referer', () => {
    expect(domainFromHeader(null, 'https://b.com/page')).toBe('b.com')
  })
  it('returns null if both missing', () => {
    expect(domainFromHeader(null, null)).toBeNull()
  })
})

describe('sameRegistrableDomain', () => {
  it('matches subdomains of the same eTLD+1', () => {
    expect(sameRegistrableDomain('eng.acme.com', 'acme.com')).toBe(true)
    expect(sameRegistrableDomain('acme.com', 'acme.com')).toBe(true)
  })
  it('rejects different registrable domains', () => {
    expect(sameRegistrableDomain('foo.com', 'bar.com')).toBe(false)
  })
  it('null-safe when neither parses', () => {
    expect(sameRegistrableDomain('localhost', 'localhost')).toBe(false)
  })
})
