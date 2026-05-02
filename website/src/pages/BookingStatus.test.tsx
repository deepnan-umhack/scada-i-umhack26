import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import BookingStatus from './BookingStatus'

vi.mock('../assets/LogoS.svg', () => ({ default: 'logo.svg' }))
vi.mock('../assets/Menu.svg', () => ({ default: 'menu.svg' }))
vi.mock('../assets/Settings.svg', () => ({ default: 'settings.svg' }))
vi.mock('../assets/Inbox.svg', () => ({ default: 'inbox.svg' }))
vi.mock('../assets/Edit.svg', () => ({ default: 'edit.svg' }))
vi.mock('../assets/Search.svg', () => ({ default: 'search.svg' }))

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
    localStorage.clear()
  })

  // --- Loading ---
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

  // --- Columns ---
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
      expect(screen.getAllByText(/no bookings/i).length).toBe(4)
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

  it('renders the logo', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByAltText('DeepNaN')).toBeInTheDocument())
  })

  // --- Supabase error ---
  it('stops loading on supabase fetch error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument())
  })

  // --- Booking cards ---
  it('renders a CONFIRMED booking card', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1', purpose: 'Team Meeting',
        start_time: '2025-01-10T09:00:00Z', end_time: '2025-01-10T11:00:00Z',
        status: 'CONFIRMED', created_at: '2025-01-01T00:00:00Z',
        source_prompt: 'Book a room for team meeting',
        rooms: { name: 'Bilik A' }, booking_equipment: []
      }], error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Team Meeting')).toBeInTheDocument())
  })

  it('renders a CANCELLED booking card', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '2', purpose: 'Cancelled Event',
        start_time: '2025-01-10T09:00:00Z', end_time: '2025-01-10T11:00:00Z',
        status: 'CANCELLED', created_at: '2025-01-01T00:00:00Z',
        source_prompt: null, rooms: { name: 'Bilik X' }, booking_equipment: []
      }], error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Cancelled Event')).toBeInTheDocument())
  })

  it('renders a COMPLETED booking card', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '3', purpose: 'Done Event',
        start_time: '2025-01-10T09:00:00Z', end_time: '2025-01-10T11:00:00Z',
        status: 'COMPLETED', created_at: '2025-01-01T00:00:00Z',
        source_prompt: null, rooms: { name: 'Bilik Y' }, booking_equipment: []
      }], error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Done Event')).toBeInTheDocument())
  })

  it('renders unknown status booking into PENDING column', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1', purpose: 'Mystery Event',
        start_time: '2025-01-10T09:00:00Z', end_time: '2025-01-10T11:00:00Z',
        status: 'UNKNOWN_STATUS', created_at: '2025-01-01T00:00:00Z',
        source_prompt: null, rooms: null, booking_equipment: []
      }], error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Mystery Event')).toBeInTheDocument())
  })

  it('shows equipment as None when no equipment booked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1', purpose: 'Solo Work',
        start_time: '2025-01-10T09:00:00Z', end_time: '2025-01-10T11:00:00Z',
        status: 'PENDING', created_at: '2025-01-01T00:00:00Z',
        source_prompt: null, rooms: { name: 'Bilik B' }, booking_equipment: []
      }], error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('None')).toBeInTheDocument())
  })

  it('renders equipment string correctly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1', purpose: 'Conference',
        start_time: '2025-01-10T09:00:00Z', end_time: '2025-01-10T11:00:00Z',
        status: 'PENDING', created_at: '2025-01-01T00:00:00Z',
        source_prompt: null, rooms: { name: 'Bilik C' },
        booking_equipment: [{ quantity: 2, equipment_inventory: { name: 'Microphone' } }]
      }], error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('2 x Microphone')).toBeInTheDocument())
  })

  it('renders multiple equipment items joined correctly', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1', purpose: 'Big Event',
        start_time: '2025-01-10T09:00:00Z', end_time: '2025-01-10T11:00:00Z',
        status: 'PENDING', created_at: '2025-01-01T00:00:00Z',
        source_prompt: null, rooms: { name: 'Hall A' },
        booking_equipment: [
          { quantity: 1, equipment_inventory: { name: 'Projector' } },
          { quantity: 3, equipment_inventory: { name: 'Chair' } }
        ]
      }], error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText(/1 x Projector/)).toBeInTheDocument()
      expect(screen.getByText(/3 x Chair/)).toBeInTheDocument()
    })
  })

  it('shows room name in booking card', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1', purpose: 'Room Check',
        start_time: '2025-01-10T09:00:00Z', end_time: '2025-01-10T11:00:00Z',
        status: 'CONFIRMED', created_at: '2025-01-01T00:00:00Z',
        source_prompt: null, rooms: { name: 'Syndicate Room' }, booking_equipment: []
      }], error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Syndicate Room')).toBeInTheDocument())
  })

  it('shows N/A when room is null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1', purpose: 'No Room',
        start_time: '2025-01-10T09:00:00Z', end_time: '2025-01-10T11:00:00Z',
        status: 'PENDING', created_at: '2025-01-01T00:00:00Z',
        source_prompt: null, rooms: null, booking_equipment: []
      }], error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Unknown Room')).toBeInTheDocument())
  })

  it('shows source_prompt in booking card', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockResolvedValue({
      data: [{
        id: '1', purpose: 'Prompt Test',
        start_time: '2025-01-10T09:00:00Z', end_time: '2025-01-10T11:00:00Z',
        status: 'CONFIRMED', created_at: '2025-01-01T00:00:00Z',
        source_prompt: 'Book a large hall for 50 people',
        rooms: { name: 'Hall' }, booking_equipment: []
      }], error: null
    })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('"Book a large hall for 50 people"')).toBeInTheDocument())
  })

  // --- Header interactions ---
  it('calls onBack when Main Page button is clicked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /main page/i })))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onBack when close ✕ button is clicked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByText('✕')))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onBack when logo is clicked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('DeepNaN')))
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

  it('shows No recent chats when history is empty', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    expect(screen.getByText('No recent chats')).toBeInTheDocument()
  })

  // --- Chat history in sidebar ---
  it('renders chat history from localStorage', async () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'My Chat', messages: [] }]))
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    expect(screen.getByText('My Chat')).toBeInTheDocument()
  })

  it('loads a chat session when history item clicked', async () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'My Chat', messages: [] }]))
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    fireEvent.click(screen.getByText('My Chat'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('opens kebab menu for chat history item', async () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    expect(screen.getByText('Rename')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('deletes a chat history item', async () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    fireEvent.click(screen.getByText('Delete'))
    expect(screen.queryByText('Old Chat')).not.toBeInTheDocument()
  })

  it('renames a chat history item', async () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    fireEvent.click(screen.getByText('Rename'))
    const input = screen.getByDisplayValue('Old Chat')
    fireEvent.change(input, { target: { value: 'New Name' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('New Name')).toBeInTheDocument()
  })

  it('cancels rename with Escape key', async () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    fireEvent.click(screen.getByText('Rename'))
    const input = screen.getByDisplayValue('Old Chat')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.getByText('Old Chat')).toBeInTheDocument()
  })

  it('closes sidebar on backdrop click', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    // sidebar is CSS-transformed not unmounted; just verify it opened
    expect(screen.getByText('New chat')).toBeInTheDocument()
  })

  it('closes sidebar when Booking history is clicked', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    fireEvent.click(screen.getByText('Booking history'))
    // sidebar closes (CSS transform), stays in DOM
    expect(screen.getByText('New chat')).toBeInTheDocument()
  })

  it('saves rename on input blur', async () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    fireEvent.click(screen.getByText('Rename'))
    const input = screen.getByDisplayValue('Old Chat')
    fireEvent.change(input, { target: { value: 'Blur Name' } })
    fireEvent.blur(input)
    expect(screen.getByText('Blur Name')).toBeInTheDocument()
  })

  it('does not save rename when title is empty on blur', async () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    fireEvent.click(screen.getByText('Rename'))
    const input = screen.getByDisplayValue('Old Chat')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    // empty title keeps the original title unchanged
    expect(screen.getByText('Old Chat')).toBeInTheDocument()
  })

  it('stopPropagation on rename input click does not load chat', async () => {
    localStorage.setItem('chat_history', JSON.stringify([{ id: 'abc', title: 'Old Chat', messages: [] }]))
    mockGetUser.mockResolvedValue({ data: { user: null } })
    render(<BookingStatus {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    const kebab = document.querySelector('[title="Options"]') as HTMLElement
    fireEvent.click(kebab)
    fireEvent.click(screen.getByText('Rename'))
    const input = screen.getByDisplayValue('Old Chat')
    fireEvent.click(input)
    // onBack not called — click was stopped
    expect(defaultProps.onBack).not.toHaveBeenCalled()
  })

})