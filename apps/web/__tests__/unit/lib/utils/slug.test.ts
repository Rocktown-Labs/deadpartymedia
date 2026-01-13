import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/utils/slug'

describe('generateSlug', () => {
  it('should convert title to lowercase slug', () => {
    expect(generateSlug('Test Artist Name')).toBe('test-artist-name')
  })

  it('should remove special characters', () => {
    expect(generateSlug('Test & Artist!')).toBe('test-artist')
    expect(generateSlug('Test@Artist#Name')).toBe('testartistname')
  })

  it('should replace spaces and underscores with hyphens', () => {
    expect(generateSlug('Test Artist_Name')).toBe('test-artist-name')
  })

  it('should remove leading and trailing hyphens', () => {
    expect(generateSlug('-Test Artist-')).toBe('test-artist')
    expect(generateSlug('---Test---')).toBe('test')
  })

  it('should handle multiple consecutive spaces', () => {
    expect(generateSlug('Test    Artist')).toBe('test-artist')
  })

  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('')
  })

  it('should handle string with only special characters', () => {
    expect(generateSlug('!!!@@@###')).toBe('')
  })

  it('should trim whitespace', () => {
    expect(generateSlug('  Test Artist  ')).toBe('test-artist')
  })

  it('should handle unicode characters', () => {
    expect(generateSlug('Test Ártist')).toBe('test-rtist')
  })
})
