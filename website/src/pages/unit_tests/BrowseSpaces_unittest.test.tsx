import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import BrowseSpaces from './unit_tests'

// Mock assets used by BrowseSpaces to keep this a focused unit test suite
vi.mock('../assets/LogoS.svg', () => ({ default: 'logo.svg' }))
vi.mock('../assets/Menu.svg', () => ({ default: 'menu.svg' }))
vi.mock('../assets/Settings.svg', () => ({ default: 'settings.svg' }))
vi.mock('../assets/Inbox.svg', () => ({ default: 'inbox.svg' }))
vi.mock('../assets/Edit.svg', () => ({ default: 'edit.svg' }))
vi.mock('../assets/Search.svg', () => ({ default: 'search.svg' }))
vi.mock('../assets/Info.svg', () => ({ default: 'info.svg' }))
vi.mock('../assets/DTSA.png', () => ({ default: 'DTSA.png' }))
vi.mock('../assets/DS.png', () => ({ default: 'DS.png' }))
vi.mock('../assets/DJ.png', () => ({ default: 'DJ.png' }))
vi.mock('../assets/DAH.png', () => ({ default: 'DAH.png' }))
vi.mock('../assets/BI1.png', () => ({ default: 'BI1.png' }))
vi.mock('../assets/BI2.png', () => ({ default: 'BI2.png' }))
vi.mock('../assets/BI3.png', () => ({ default: 'BI3.png' }))
vi.mock('../assets/BB.png', () => ({ default: 'BB.png' }))
vi.mock('../assets/SR.png', () => ({ default: 'SR.png' }))
vi.mock('../assets/LRU.png', () => ({ default: 'LRU.png' }))
vi.mock('../assets/LRP.png', () => ({ default: 'LRP.png' }))

const defaultProps = {
  onBack: vi.fn(),
  onSpaceSelected: vi.fn(),
  onOpenBookingStatus: vi.fn(),
  onOpenProfileSettings: vi.fn(),
  selectedSpace: null,
}

describe('BrowseSpaces (targeted unit tests)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('UT-01: renders core heading', () => {
    render(<BrowseSpaces {...defaultProps} />)
    expect(screen.getByText('Spaces List')).toBeInTheDocument()
  })

  it('UT-02: calls onSpaceSelected with selected room name', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByText('Syndicate Room'))
    expect(defaultProps.onSpaceSelected).toHaveBeenCalledWith('Syndicate Room')
  })

  it('UT-03: calls onBack when close button is clicked', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByText('✕'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('UT-04: calls onOpenBookingStatus when Bookings is clicked', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByText('Bookings'))
    expect(defaultProps.onOpenBookingStatus).toHaveBeenCalled()
  })
})
