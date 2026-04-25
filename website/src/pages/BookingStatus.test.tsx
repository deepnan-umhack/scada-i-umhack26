import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import BookingStatus from './BookingStatus'

// Mock assets
vi.mock('../assets/LogoS.svg', () => ({ default: 'logo.svg' }))
vi.mock('../assets/Menu.svg', () => ({ default: 'menu.svg' }))
vi.mock('../assets/Settings.svg', () => ({ default: 'settings.svg' }))
vi.mock('../assets/Inbox.svg', () => ({ default: 'inbox.svg' }))
vi.mock('../assets/Edit.svg', () => ({ default: 'edit.svg' }))
vi.mock('../assets/Search.svg', () => ({ default: 'search.svg' }))

// Mock supabase
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => mockFrom()
        })
      })
    })
  }
}))

const defaultProps = {
  onBack: vi.fn(),
  onOpenProfileSettings: vi.fn(),
}

describe('BookingStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- No user ---
  it('renders without crashing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
  })

  it('shows loading state initially', () => {
    mockGetUser.mockImplementation(() => new Promise(() => {}))
    render(<BookingStatus {...defaultProps} />)
    expect(screen.getByText(/loading your bookings/i)).toBeInTheDocument()
  })

  it('stops loading when no user is found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
  })

  // --- With user, empty bookings ---
  it('renders four kanban columns', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({ data: [], error: null })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Confirmed')).toBeInTheDocument()
      expect(screen.getByText('Cancelled')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  it('shows "No bookings" in each empty column', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({ data: [], error: null })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => {
      const noBtnTexts = screen.getAllByText(/no bookings/i)
      expect(noBtnTexts.length).toBe(4)
    })
  })

  it('renders the page heading', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Bookings Status')).toBeInTheDocument())
  })

  it('renders the subheading', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText(/events & equipment tracking/i)).toBeInTheDocument())
  })

  // --- Supabase error ---
  it('stops loading on supabase fetch error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
  })

  // --- With booking data ---
  it('renders a booking card in the correct column', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1',
        purpose: 'Team Meeting',
        start_time: '2025-01-10T09:00:00Z',
        end_time: '2025-01-10T11:00:00Z',
        status: 'CONFIRMED',
        created_at: '2025-01-01T00:00:00Z',
        source_prompt: 'Book a room for team meeting',
        rooms: { name: 'Bilik A' },
        booking_equipment: []
      }],
      error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Team Meeting')).toBeInTheDocument())
  })

  it('shows equipment as None when no equipment booked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1',
        purpose: 'Solo Work',
        start_time: '2025-01-10T09:00:00Z',
        end_time: '2025-01-10T11:00:00Z',
        status: 'PENDING',
        created_at: '2025-01-01T00:00:00Z',
        source_prompt: null,
        rooms: { name: 'Bilik B' },
        booking_equipment: []
      }],
      error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('None')).toBeInTheDocument())
  })

  it('renders equipment string correctly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1',
        purpose: 'Conference',
        start_time: '2025-01-10T09:00:00Z',
        end_time: '2025-01-10T11:00:00Z',
        status: 'PENDING',
        created_at: '2025-01-01T00:00:00Z',
        source_prompt: null,
        rooms: { name: 'Bilik C' },
        booking_equipment: [
          { quantity: 2, equipment_inventory: { name: 'Microphone' } }
        ]
      }],
      error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('2 x Microphone')).toBeInTheDocument())
  })

  // --- Header interactions ---
  it('calls onBack when Main Page button is clicked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /main page/i })))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onBack when close (✕) button is clicked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => {
      const closeBtn = screen.getByText('✕')
      fireEvent.click(closeBtn)
    })
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  // --- Sidebar ---
  it('toggles sidebar open on menu button click', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    expect(screen.getByText('New chat')).toBeInTheDocument()
  })

  it('calls onBack via New chat in sidebar', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    fireEvent.click(screen.getByText('New chat'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onOpenProfileSettings from sidebar', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    fireEvent.click(screen.getByText('Settings & Profile'))
    expect(defaultProps.onOpenProfileSettings).toHaveBeenCalled()
  })

  it('renders unknown status booking into PENDING column', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1',
        purpose: 'Mystery Event',
        start_time: '2025-01-10T09:00:00Z',
        end_time: '2025-01-10T11:00:00Z',
        status: 'UNKNOWN_STATUS',
        created_at: '2025-01-01T00:00:00Z',
        source_prompt: null,
        rooms: null,
        booking_equipment: []
      }],
      error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Mystery Event')).toBeInTheDocument())
  })
})
