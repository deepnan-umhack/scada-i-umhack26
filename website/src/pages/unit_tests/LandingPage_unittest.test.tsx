import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LandingPage from '../LandingPage'

// Keep animation wrappers simple in jsdom
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}))

// Mock logo asset import
vi.mock('../../assets/Logo.svg', () => ({ default: 'logo.svg' }))

describe('LandingPage (targeted unit tests)', () => {
  it('UT-01: renders DeepNaN logo', () => {
    render(<LandingPage />)
    expect(screen.getByAltText('DeepNaN Logo')).toBeInTheDocument()
  })

  it('UT-02: uses mocked logo src', () => {
    render(<LandingPage />)
    expect(screen.getByAltText('DeepNaN Logo')).toHaveAttribute('src', 'logo.svg')
  })

  it('UT-03: renders exactly two splash ripple elements', () => {
    const { container } = render(<LandingPage />)
    expect(container.querySelectorAll('.border-slate-400')).toHaveLength(2)
  })
})
