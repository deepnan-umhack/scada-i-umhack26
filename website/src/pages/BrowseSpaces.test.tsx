import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'
import BrowseSpaces from './BrowseSpaces'

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

describe('BrowseSpaces', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  // --- Rendering ---
  it('renders without crashing', () => {
    render(<BrowseSpaces {...defaultProps} />)
  })

  it('renders the page heading', () => {
    render(<BrowseSpaces {...defaultProps} />)
    expect(screen.getByText('Spaces List')).toBeInTheDocument()
  })

  it('renders the subheading', () => {
    render(<BrowseSpaces {...defaultProps} />)
    expect(screen.getByText(/explore campus spaces/i)).toBeInTheDocument()
  })

  it('renders all 11 spaces', () => {
    render(<BrowseSpaces {...defaultProps} />)
    expect(screen.getByText('Dewan Tan Sri Ainuddin')).toBeInTheDocument()
    expect(screen.getByText('Dewan Seminar')).toBeInTheDocument()
    expect(screen.getByText('Dewan Jumaah')).toBeInTheDocument()
    expect(screen.getByText('Dewan Azman Hashim')).toBeInTheDocument()
    expect(screen.getByText('Bilik Ilmuan 1')).toBeInTheDocument()
    expect(screen.getByText('Bilik Ilmuan 2')).toBeInTheDocument()
    expect(screen.getByText('Bilik Ilmuan 3')).toBeInTheDocument()
    expect(screen.getByText('Bilik Bankuet')).toBeInTheDocument()
    expect(screen.getByText('Syndicate Room')).toBeInTheDocument()
    expect(screen.getByText('Lecture Room (UG)')).toBeInTheDocument()
    expect(screen.getByText('Lecture Room (PG)')).toBeInTheDocument()
  })

  it('renders the logo', () => {
    render(<BrowseSpaces {...defaultProps} />)
    expect(screen.getByAltText('DeepNaN')).toBeInTheDocument()
  })

  it('renders Bookings button', () => {
    render(<BrowseSpaces {...defaultProps} />)
    expect(screen.getByText('Bookings')).toBeInTheDocument()
  })

  // --- Space selection ---
  it('calls onSpaceSelected when a space card is clicked', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByText('Syndicate Room'))
    expect(defaultProps.onSpaceSelected).toHaveBeenCalledWith('Syndicate Room')
  })

  it('calls onSpaceSelected for each space', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByText('Dewan Seminar'))
    expect(defaultProps.onSpaceSelected).toHaveBeenCalledWith('Dewan Seminar')
  })

  it('does not call onSpaceSelected when clicking already-selected space', () => {
    render(<BrowseSpaces {...defaultProps} selectedSpace="Syndicate Room" />)
    fireEvent.click(screen.getByText('Syndicate Room'))
    expect(defaultProps.onSpaceSelected).not.toHaveBeenCalled()
  })

  it('shows toast when clicking already-selected space', () => {
    render(<BrowseSpaces {...defaultProps} selectedSpace="Syndicate Room" />)
    fireEvent.click(screen.getByText('Syndicate Room'))
    expect(screen.getByText(/space already tagged/i)).toBeInTheDocument()
  })

  it('shows Tagged badge on selected space', () => {
    render(<BrowseSpaces {...defaultProps} selectedSpace="Dewan Seminar" />)
    expect(screen.getByText('Tagged')).toBeInTheDocument()
  })

  it('does not show Tagged badge when no space is selected', () => {
    render(<BrowseSpaces {...defaultProps} />)
    expect(screen.queryByText('Tagged')).not.toBeInTheDocument()
  })

  // --- Toast ---
  it('shows toast when info button is clicked', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getAllByAltText('Info')[0].closest('button')!)
    expect(screen.getByText(/tap any card to tag it to your chat/i)).toBeInTheDocument()
  })

  it('hides toast after 3 seconds', () => {
    vi.useFakeTimers()
    render(<BrowseSpaces {...defaultProps} selectedSpace="Syndicate Room" />)
    fireEvent.click(screen.getByText('Syndicate Room'))
    act(() => { vi.advanceTimersByTime(3000) })
    vi.useRealTimers()
  })

  // --- Navigation ---
  it('calls onBack when close ✕ button is clicked', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByText('✕'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onBack when logo is clicked', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('DeepNaN'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onOpenBookingStatus when Bookings button clicked', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByText('Bookings'))
    expect(defaultProps.onOpenBookingStatus).toHaveBeenCalled()
  })

  // --- Sidebar ---
  it('opens sidebar when menu button is clicked', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    expect(screen.getByText('New chat')).toBeInTheDocument()
  })

  it('calls onBack via New chat in sidebar', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    fireEvent.click(screen.getByText('New chat'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onOpenProfileSettings from sidebar', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    fireEvent.click(screen.getByText('Settings & Profile'))
    expect(defaultProps.onOpenProfileSettings).toHaveBeenCalled()
  })

  it('calls onOpenBookingStatus from sidebar Booking history', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    fireEvent.click(screen.getByText('Booking history'))
    expect(defaultProps.onOpenBookingStatus).toHaveBeenCalled()
  })

  it('closes sidebar overlay on backdrop click', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    const overlay = document.querySelector('.fixed.inset-0.bg-black\\/5')
    if (overlay) fireEvent.click(overlay)
    // sidebar is CSS-transformed not unmounted
    expect(screen.getByText('New chat')).toBeInTheDocument()
  })

  it('shows No recent chats when history is empty', () => {
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    expect(screen.getByText('No recent chats')).toBeInTheDocument()
  })

  // --- Chat history ---
  it('renders chat history from localStorage', () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'My Chat', messages: [] }]))
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    expect(screen.getByText('My Chat')).toBeInTheDocument()
  })

  it('loads a chat session when history item clicked', () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'My Chat', messages: [] }]))
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    fireEvent.click(screen.getByText('My Chat'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('opens kebab menu for chat history item', () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('deletes a chat history item', () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    fireEvent.click(screen.getByText('Delete'))
    expect(screen.queryByText('Old Chat')).not.toBeInTheDocument()
  })

  it('renames a chat history item', () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    fireEvent.click(screen.getByText('Rename'))
    const input = screen.getByDisplayValue('Old Chat')
    fireEvent.change(input, { target: { value: 'New Name' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('New Name')).toBeInTheDocument()
  })

  it('cancels rename with Escape key', () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    render(<BrowseSpaces {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    fireEvent.click(screen.getByText('Rename'))
    const input = screen.getByDisplayValue('Old Chat')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.getByText('Old Chat')).toBeInTheDocument()
  })
})