import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LandingPage from './LandingPage'

// Mock framer-motion — animations don't run in jsdom
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...props}>{children}</div>
    ),
  },
}))

// Mock the SVG logo import
vi.mock('../assets/Logo.svg', () => ({ default: 'logo.svg' }))

describe('LandingPage', () => {
  it('renders without crashing', () => {
    render(<LandingPage />)
  })

  it('renders the DeepNaN logo', () => {
    render(<LandingPage />)
    const logo = screen.getByAltText('DeepNaN Logo')
    expect(logo).toBeInTheDocument()
  })

  it('logo has correct src', () => {
    render(<LandingPage />)
    const logo = screen.getByAltText('DeepNaN Logo')
    expect(logo).toHaveAttribute('src', 'logo.svg')
  })

  it('renders the background container', () => {
    const { container } = render(<LandingPage />)
    const root = container.firstChild as HTMLElement
    expect(root).toHaveClass('bg-[#F0F4F8]')
  })

  it('renders two splash ripple elements', () => {
    const { container } = render(<LandingPage />)
    // Both ripples share the same border class
    const ripples = container.querySelectorAll('.border-slate-400')
    expect(ripples).toHaveLength(2)
  })

  it('renders the water drop element', () => {
    const { container } = render(<LandingPage />)
    const drop = container.querySelector('.bg-slate-900.rounded-full')
    expect(drop).toBeInTheDocument()
  })

  it('renders the ground shadow', () => {
    const { container } = render(<LandingPage />)
    const shadow = container.querySelector('.bg-black.rounded-\\[100\\%\\]')
    expect(shadow).toBeInTheDocument()
  })
})