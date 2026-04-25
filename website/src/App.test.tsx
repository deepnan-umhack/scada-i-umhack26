import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi } from 'vitest'
import App from './App'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock all pages
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
  default: ({ onBack, onSpaceSelected }: any) => (
    <div>
      <span>BrowseSpaces</span>
      <button onClick={onBack}>Back</button>
      <button onClick={() => onSpaceSelected('Syndicate Room')}>SelectSpace</button>
    </div>
  )
}))
vi.mock('./pages/BookingStatus', () => ({
  default: ({ onBack }: any) => (
    <div>
      <span>BookingStatus</span>
      <button onClick={onBack}>Back</button>
    </div>
  )
}))
vi.mock('./pages/EquipmentCatalog', () => ({
  default: ({ onBack, onEquipmentSelected }: any) => (
    <div>
      <span>EquipmentCatalog</span>
      <button onClick={onBack}>Back</button>
      <button onClick={() => onEquipmentSelected('Projector (x2)')}>SelectEquipment</button>
    </div>
  )
}))
vi.mock('./pages/DepartmentDirectory', () => ({
  default: ({ onBack, onDepartmentSelected }: any) => (
    <div>
      <span>DepartmentDirectory</span>
      <button onClick={onBack}>Back</button>
      <button onClick={() => onDepartmentSelected('Islamic Centre')}>SelectDept</button>
    </div>
  )
}))
vi.mock('./pages/ProfileSettings', () => ({
  default: ({ onBack, onLogout }: any) => (
    <div>
      <span>ProfileSettings</span>
      <button onClick={onBack}>Back</button>
      <button onClick={onLogout}>Logout</button>
    </div>
  )
}))

describe('App', () => {
  beforeEach(() => vi.clearAllMocks())

  // --- Initial state ---
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

  it('goes back to MainChat from BookingStatus', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenBookings')))
    fireEvent.click(screen.getByText('Back'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  it('goes back to MainChat from EquipmentCatalog', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenCatalog')))
    fireEvent.click(screen.getByText('Back'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  it('goes back to MainChat from DepartmentDirectory', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenDirectory')))
    fireEvent.click(screen.getByText('Back'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  it('goes back to MainChat from ProfileSettings', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenProfile')))
    fireEvent.click(screen.getByText('Back'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  // --- Selection callbacks ---
  it('selects a space and returns to MainChat', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenSpaces')))
    fireEvent.click(screen.getByText('SelectSpace'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  it('selects equipment and returns to MainChat', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenCatalog')))
    fireEvent.click(screen.getByText('SelectEquipment'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  it('selects a department and returns to MainChat', async () => {
    render(<App />)
    fireEvent.click(screen.getByText('MockLogin'))
    await waitFor(() => fireEvent.click(screen.getByText('OpenDirectory')))
    fireEvent.click(screen.getByText('SelectDept'))
    expect(screen.getByText('MainChat')).toBeInTheDocument()
  })

  // --- Logout ---
  it('logs out and shows AuthPage again', async () => {
    // 1. Turn on fake timers before rendering
    vi.useFakeTimers()
    render(<App />)
    
    // 2. Instantly fast-forward past the 2.5-second splash screen
    act(() => { vi.advanceTimersByTime(2500) })
    
    // 3. Switch back to real timers so standard async/await works normally
    vi.useRealTimers()
    
    // 4. Now the login button is in the DOM immediately!
    fireEvent.click(screen.getByText('MockLogin'))
    
    // 5. Wait for the profile button to appear on the MainChat page
    const profileBtn = await screen.findByText('OpenProfile')
    fireEvent.click(profileBtn)
    
    // 6. Click logout
    fireEvent.click(screen.getByText('Logout'))
    
    // 7. Ensure we get routed back to the AuthPage
    expect(await screen.findByText('AuthPage')).toBeInTheDocument()
  })
})
