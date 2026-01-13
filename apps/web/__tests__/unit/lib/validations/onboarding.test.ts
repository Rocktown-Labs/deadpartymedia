import { describe, it, expect } from 'vitest'
import {
  artistOnboardingSchema,
  fanOnboardingSchema,
  type ArtistOnboardingFormData,
  type FanOnboardingFormData,
} from '@/lib/validations/onboarding'

describe('artistOnboardingSchema', () => {
  const validArtistData: ArtistOnboardingFormData = {
    name: 'Test Artist',
    location: 'Little Rock, AR',
    genre: 'EDM',
    bio: 'This is a valid bio with more than 10 characters',
  }

  it('should validate correct artist data', () => {
    const result = artistOnboardingSchema.safeParse(validArtistData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Test Artist')
      expect(result.data.location).toBe('Little Rock, AR')
      expect(result.data.genre).toBe('EDM')
    }
  })

  it('should require name', () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      name: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('required')
    }
  })

  it('should require location', () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      location: '',
    })
    expect(result.success).toBe(false)
  })

  it('should require genre', () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      genre: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('should require valid genre enum', () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      genre: 'INVALID_GENRE',
    })
    expect(result.success).toBe(false)
  })

  it('should require bio with minimum 10 characters', () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      bio: 'short',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('at least 10')
    }
  })

  it('should enforce bio maximum length of 500 characters', () => {
    const longBio = 'a'.repeat(501)
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      bio: longBio,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('less than 500')
    }
  })

  it('should validate URL fields', () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      spotifyUrl: 'https://open.spotify.com/artist/123',
      instagram: 'https://instagram.com/artist',
      twitter: 'https://twitter.com/artist',
      website: 'https://example.com',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid URLs', () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      spotifyUrl: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('should transform empty strings to undefined for optional URL fields', () => {
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      spotifyUrl: '',
      instagram: '',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.spotifyUrl).toBeUndefined()
      expect(result.data.instagram).toBeUndefined()
    }
  })

  it('should enforce name max length of 100 characters', () => {
    const longName = 'a'.repeat(101)
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      name: longName,
    })
    expect(result.success).toBe(false)
  })

  it('should enforce location max length of 100 characters', () => {
    const longLocation = 'a'.repeat(101)
    const result = artistOnboardingSchema.safeParse({
      ...validArtistData,
      location: longLocation,
    })
    expect(result.success).toBe(false)
  })
})

describe('fanOnboardingSchema', () => {
  const validFanData: FanOnboardingFormData = {
    name: 'Test Fan',
  }

  it('should validate correct fan data with only name', () => {
    const result = fanOnboardingSchema.safeParse(validFanData)
    expect(result.success).toBe(true)
  })

  it('should require name', () => {
    const result = fanOnboardingSchema.safeParse({
      name: '',
    })
    expect(result.success).toBe(false)
  })

  it('should trim and validate name is not only whitespace', () => {
    const result = fanOnboardingSchema.safeParse({
      name: '   ',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('whitespace')
    }
  })

  it('should allow optional fields', () => {
    const result = fanOnboardingSchema.safeParse({
      name: 'Test Fan',
      location: 'Little Rock, AR',
      genre: 'EDM',
      bio: 'Optional bio',
    })
    expect(result.success).toBe(true)
  })

  it('should validate optional URL fields when provided', () => {
    const result = fanOnboardingSchema.safeParse({
      name: 'Test Fan',
      spotifyUrl: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('should transform empty strings to undefined for optional fields', () => {
    const result = fanOnboardingSchema.safeParse({
      name: 'Test Fan',
      spotifyUrl: '',
      location: '',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.spotifyUrl).toBeUndefined()
    }
  })

  it('should enforce name max length of 100 characters', () => {
    const longName = 'a'.repeat(101)
    const result = fanOnboardingSchema.safeParse({
      name: longName,
    })
    expect(result.success).toBe(false)
  })
})
