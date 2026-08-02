import { describe, expect, it } from 'vitest'
import { centerlineLayout } from './centerline'

describe('centerline layout', () => {
  it('vertically centers personal information beside the portrait', () => {
    expect(centerlineLayout.css).toMatch(
      /\.centerline-personal-info\s*\{[^}]*align-self:\s*center\s*!important/s,
    )
  })
})
