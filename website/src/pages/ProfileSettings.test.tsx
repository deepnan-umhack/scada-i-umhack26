import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ProfileSettings from './ProfileSettings'

vi.mock('../assets/LogoS.svg', () => ({ default: 'logo.svg' }))
vi.mock('../assets/Menu.svg', () => ({ default: 'menu.svg' }))
vi.mock('../assets/Settings.svg', () => ({ default: 'settings.svg' }))
vi.mock('../assets/Inbox.svg', () => ({ default: 'inbox.svg' }))
vi.mock('../assets/Edit.svg', () => ({ default: 'edit.svg' }))
vi.mock('../assets/Search.svg', () => ({ default: 'search.svg' }))

const mockGetUser = vi.fn()
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() }
  }
}))

const defaultProps = {
  onBack: vi.fn(),
  onOpenBookingStatus: vi.fn(),
  onLogout: vi.fn(),
}

describe('ProfileSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: null } })
  })

  // --- Rendering ---
  it('renders without crashing', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Profile & Settings')).toBeInTheDocument())
  })

  it('renders the page heading', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Profile & Settings')).toBeInTheDocument())
  })

  it('renders the subheading', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText(/manage account and preferences/i)).toBeInTheDocument())
  })

  it('renders the logo', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByAltText('DeepNaN')).toBeInTheDocument())
  })

  it('shows fallback name when no user', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Dr. Username')).toBeInTheDocument())
  })

  it('shows fallback email when no user', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('username@utm.my')).toBeInTheDocument())
  })

  it('shows user full name when user is loaded', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'ali@utm.my', user_metadata: { full_name: 'Ali Hassan' } } }
    })
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Ali Hassan')).toBeInTheDocument())
  })

  it('shows user email when user is loaded', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: 'ali@utm.my', user_metadata: { full_name: 'Ali Hassan' } } }
    })
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('ali@utm.my')).toBeInTheDocument())
  })

  it('renders Faculty Identity section', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Faculty Identity')).toBeInTheDocument())
  })

  it('renders System Preferences section', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('System Preferences')).toBeInTheDocument())
  })

  it('renders static staff ID', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('UTM-FAC-2026-99')).toBeInTheDocument())
  })

  it('renders static office location', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => expect(screen.getByText('Building N28, Room 402')).toBeInTheDocument())
  })

  it('renders preference toggles', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('Dark Mode')).toBeInTheDocument()
      expect(screen.getByText('Smart Notifications')).toBeInTheDocument()
      expect(screen.getByText('Biometric Login')).toBeInTheDocument()
    })
  })

  // --- Navigation ---
  it('calls onBack when close ✕ is clicked', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByText('✕')))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onLogout when Sign Out is clicked', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByText('Sign Out')))
    expect(defaultProps.onLogout).toHaveBeenCalled()
  })

  it('calls onOpenBookingStatus when Bookings is clicked', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByText('Bookings')))
    expect(defaultProps.onOpenBookingStatus).toHaveBeenCalled()
  })

  // --- Sidebar ---
  it('opens sidebar when menu is clicked', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    expect(screen.getByText('New chat')).toBeInTheDocument()
  })

  it('calls onBack via New chat in sidebar', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    fireEvent.click(screen.getByText('New chat'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onOpenBookingStatus from sidebar', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    fireEvent.click(screen.getByText('Booking history'))
    expect(defaultProps.onOpenBookingStatus).toHaveBeenCalled()
  })

  it('closes sidebar on backdrop click', async () => {
    render(<ProfileSettings {...defaultProps} />)
    await waitFor(() => fireEvent.click(screen.getByAltText('Menu')))
    const overlay = document.querySelector('.fixed.inset-0.bg-black\\/5')
    if (overlay) fireEvent.click(overlay)
  })
})
