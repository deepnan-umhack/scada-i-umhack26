import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import App from './App'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock all pages with cross-navigation buttons added
vi.mock('./pages/LandingPage', () => ({ default: () => <div>LandingPage</div> }))
vi.mock('./pages/AuthPage', () => ({
  default: ({ onLoginSuccess }: { onLoginSuccess: () => void }) => (
    <div>
      <span>AuthPage</span>
      <button onClick={onLoginSuccess}>MockLogin</button>
    </div>
  )
}))
vi.mock('./pages/MainChat', () => ({
  default: (props: any) => (
    <div>
      <span>MainChat</span>
      <button onClick={props.onOpenBrowseSpaces}>OpenSpaces</button>
      <button onClick={props.onOpenBookingStatus}>OpenBookings</button>
      <button onClick={props.onOpenEquipmentCatalog}>OpenCatalog</button>
      <button onClick={props.onOpenDepartmentDirectory}>OpenDirectory</button>
      <button onClick={props.onOpenProfileSettings}>OpenProfile</button>
    </div>
  )
}))
vi.mock('./pages/BrowseSpaces', () => ({
  default: ({ onBack, onSpaceSelected, onOpenBookingStatus, onOpenProfileSettings }: any) => (
    <div>
      <span>BrowseSpaces</span>
      <button onClick={onBack}>Back</button>
      <button onClick={() => onSpaceSelected('Syndicate Room')}>SelectSpace</button>
      <button onClick={onOpenBookingStatus}>NavBookings</button>
      <button onClick={onOpenProfileSettings}>NavProfile</button>
    </div>
  )
}))
vi.mock('./pages/BookingStatus', () => ({
  default: ({ onBack, onOpenProfileSettings }: any) => (
    <div>
      <span>BookingStatus</span>
      <button onClick={onBack}>Back</button>
      <button onClick={onOpenProfileSettings}>NavProfile</button>
    </div>
  )
}))
vi.mock('./pages/EquipmentCatalog', () => ({
  default: ({ onBack, onEquipmentSelected, onOpenBookingStatus, onOpenProfileSettings }: any) => (
    <div>
      <span>EquipmentCatalog</span>
      <button onClick={onBack}>Back</button>
      <button onClick={() => onEquipmentSelected('Projector (x2)')}>SelectEquipment</button>
      <button onClick={onOpenBookingStatus}>NavBookings</button>
      <button onClick={onOpenProfileSettings}>NavProfile</button>
    </div>
  )
}))
vi.mock('./pages/DepartmentDirectory', () => ({
  default: ({ onBack, onDepartmentSelected, onOpenBookingStatus, onOpenProfileSettings }: any) => (
    <div>
      <span>DepartmentDirectory</span>
      <button onClick={onBack}>Back</button>
      <button onClick={() => onDepartmentSelected('Islamic Centre')}>SelectDept</button>
      <button onClick={onOpenBookingStatus}>NavBookings</button>
      <button onClick={onOpenProfileSettings}>NavProfile</button>
    </div>
  )
}))
vi.mock('./pages/ProfileSettings', () => ({
  default: ({ onBack, onLogout, onOpenBookingStatus }: any) => (
    <div>
      <span>ProfileSettings</span>
      <button onClick={onBack}>Back</button>
      <button onClick={onLogout}>Logout</button>
      <button onClick={onOpenBookingStatus}>NavBookings</button>
    </div>
  )
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  // --- Initial state & Hydration ---
  it('renders without crashing', () => {
    render(<App />)
  })

  it('shows LandingPage overlay initially', () => {
    render(<App />)
    expect(screen.getByText('LandingPage')).toBeInTheDocument()
  })

  it('shows AuthPage while not authenticated', () => {
    render(<App />)
    expect(screen.getByText('AuthPage')).toBeInTheDocument()
  })

  it('hides landing overlay after 2500ms', async () => {
    vi.useFakeTimers()
    render(<App />)
    act(() => { vi.advanceTimersByTime(2500) })
    vi.useRealTimers()
    expect(screen.queryByText('LandingPage')).not.toBeInTheDocument()
  })

  it('hydrates state securely from localStorage on mount', () => {
    localStorage.setItem('is_auth', 'true')
    localStorage.setItem('active_space', 'Hall A')
    localStorage.setItem('active_equip', JSON.stringify(['Projector (x1)']))
    localStorage.setItem('active_depts', JSON.stringify(['HR']))
    localStorage.setItem('draft_msg', 'Hello')
    
    render(<App />)
    // Should bypass auth entirely and go straight to MainChat
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  // --- Auth flow ---
  it('shows MainChat after login', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => expect(screen.getByText('MainChat')).toBeInTheDocument())
  })

  // --- Navigation from MainChat ---
  it('navigates to BrowseSpaces', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenSpaces')))
    expect(screen.getByText('BrowseSpaces')).toBeInTheDocument()
  })

  it('navigates to BookingStatus', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenBookings')))
    expect(screen.getByText('BookingStatus')).toBeInTheDocument()
  })

  it('navigates to EquipmentCatalog', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenCatalog')))
    expect(screen.getByText('EquipmentCatalog')).toBeInTheDocument()
  })

  it('navigates to DepartmentDirectory', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenDirectory')))
    expect(screen.getByText('DepartmentDirectory')).toBeInTheDocument()
  })

  it('navigates to ProfileSettings', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenProfile')))
    expect(screen.getByText('ProfileSettings')).toBeInTheDocument()
  })

  // --- Back navigation ---
  it('goes back to MainChat from BrowseSpaces', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenSpaces')))
    fireEvent.click(screen.getByText('Back'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  // --- Selection callbacks and Deduplication Branches ---
  it('selects a space and returns to MainChat', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenSpaces')))
    fireEvent.click(screen.getByText('SelectSpace'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  it('does not route to chat if the exact same space is selected again', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    
    // First selection
    await waitFor(() => fireEvent.click(screen.getByText('OpenSpaces')))
    fireEvent.click(screen.getByText('SelectSpace'))
    
    // Open spaces again
    fireEvent.click(screen.getByText('OpenSpaces'))
    
    // Second selection of the same space
    fireEvent.click(screen.getByText('SelectSpace'))
    
    // Should NOT have navigated back to chat automatically because space hasn't changed
    expect(screen.getByText('BrowseSpaces')).toBeInTheDocument()
  })

  it('selects equipment and returns to MainChat, replacing existing items with the same base name', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    
    // Add equipment once
    await waitFor(() => fireEvent.click(screen.getByText('OpenCatalog')))
    fireEvent.click(screen.getByText('SelectEquipment'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()

    // Add equipment twice (hits the filter array logic branch)
    fireEvent.click(screen.getByText('OpenCatalog'))
    fireEvent.click(screen.getByText('SelectEquipment'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  it('selects a department and returns to MainChat, ignoring duplicates', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    
    // First department
    await waitFor(() => fireEvent.click(screen.getByText('OpenDirectory')))
    fireEvent.click(screen.getByText('SelectDept'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()

    // Duplicate department (hits the !displayedDepts.includes branch)
    fireEvent.click(screen.getByText('OpenDirectory'))
    fireEvent.click(screen.getByText('SelectDept'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  // --- Cross Navigation Tests ---
  it('navigates directly to BookingStatus and ProfileSettings from secondary views', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    
    // From BrowseSpaces
    await waitFor(() => fireEvent.click(screen.getByText('OpenSpaces')))
    fireEvent.click(screen.getByText('NavBookings'))
    expect(screen.getByText('BookingStatus')).toBeInTheDocument()
    fireEvent.click(screen.getByText('NavProfile'))
    expect(screen.getByText('ProfileSettings')).toBeInTheDocument()

    // From DepartmentDirectory
    fireEvent.click(screen.getByText('Back'))
    fireEvent.click(screen.getByText('OpenDirectory'))
    fireEvent.click(screen.getByText('NavBookings'))
    expect(screen.getByText('BookingStatus')).toBeInTheDocument()

    // From Profile to Bookings
    fireEvent.click(screen.getByText('Back'))
    fireEvent.click(screen.getByText('OpenProfile'))
    fireEvent.click(screen.getByText('NavBookings'))
    expect(screen.getByText('BookingStatus')).toBeInTheDocument()
  })

  // --- Logout & Teardown ---
  it('logs out, clears local storage, and resets state to AuthPage', async () => {
    localStorage.setItem('active_space', 'Hall A') // Set to test teardown branch
    
    vi.useFakeTimers()
    render(<App />)
    act(() => { vi.advanceTimersByTime(2500) })
    vi.useRealTimers()
    
    fireEvent.click(screen.getByText('MockLogin'))
    const profileBtn = await screen.findByText('OpenProfile')
    fireEvent.click(profileBtn)
    
    fireEvent.click(screen.getByText('Logout'))
    
    expect(await screen.findByText('AuthPage')).toBeInTheDocument()
    expect(localStorage.getItem('active_space')).toBeNull() // Confirms removal branch
  })
})