import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'
import DepartmentDirectory from './DepartmentDirectory'

vi.mock('../assets/LogoS.svg', () => ({ default: 'logo.svg' }))
vi.mock('../assets/Menu.svg', () => ({ default: 'menu.svg' }))
vi.mock('../assets/Settings.svg', () => ({ default: 'settings.svg' }))
vi.mock('../assets/Inbox.svg', () => ({ default: 'inbox.svg' }))
vi.mock('../assets/Edit.svg', () => ({ default: 'edit.svg' }))
vi.mock('../assets/Search.svg', () => ({ default: 'search.svg' }))
vi.mock('../assets/Info.svg', () => ({ default: 'info.svg' }))

const defaultProps = {
  onBack: vi.fn(),
  onDepartmentSelected: vi.fn(),
  onOpenBookingStatus: vi.fn(),
  onOpenProfileSettings: vi.fn(),
  selectedDepts: [],
}

describe('DepartmentDirectory', () => {
  beforeEach(() => vi.clearAllMocks())

  // --- Rendering ---
  it('renders without crashing', () => {
    render(<DepartmentDirectory {...defaultProps} />)
  })

  it('renders the page heading', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    expect(screen.getByText('Department Directory')).toBeInTheDocument()
  })

  it('renders the subheading', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    expect(screen.getByText(/contact and office information/i)).toBeInTheDocument()
  })

  it('renders all departments initially', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    expect(screen.getByText('Admission Office')).toBeInTheDocument()
    expect(screen.getByText('Islamic Centre')).toBeInTheDocument()
    expect(screen.getByText('UTM International')).toBeInTheDocument()
  })

  it('renders the search/filter input', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    expect(screen.getByPlaceholderText(/filter departments/i)).toBeInTheDocument()
  })

  // --- Search/filter ---
  it('filters departments based on search query', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/filter departments/i), { target: { value: 'library' } })
    expect(screen.getByText('Library Administration')).toBeInTheDocument()
    expect(screen.queryByText('Admission Office')).not.toBeInTheDocument()
  })

  it('is case-insensitive when filtering', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/filter departments/i), { target: { value: 'UTM SPORTS' } })
    expect(screen.getByText('UTM Sports Excellence')).toBeInTheDocument()
  })

  it('shows no results message when filter has no match', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/filter departments/i), { target: { value: 'zzznomatch' } })
    expect(screen.getByText(/no departments found/i)).toBeInTheDocument()
  })

  it('clears search when Clear Search is clicked', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/filter departments/i), { target: { value: 'zzznomatch' } })
    fireEvent.click(screen.getByText('Clear Search'))
    expect(screen.getByText('Admission Office')).toBeInTheDocument()
  })

  // --- Selection ---
  it('calls onDepartmentSelected when a dept is clicked', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.click(screen.getByText('Islamic Centre'))
    expect(defaultProps.onDepartmentSelected).toHaveBeenCalledWith('Islamic Centre')
  })

  it('does not call onDepartmentSelected for already-selected dept', () => {
    render(<DepartmentDirectory {...defaultProps} selectedDepts={['Islamic Centre']} />)
    fireEvent.click(screen.getByText('Islamic Centre'))
    expect(defaultProps.onDepartmentSelected).not.toHaveBeenCalled()
  })

  it('shows Tagged badge for selected department', () => {
    render(<DepartmentDirectory {...defaultProps} selectedDepts={['Admission Office']} />)
    expect(screen.getByText('Tagged')).toBeInTheDocument()
  })

  it('shows toast when clicking already-selected dept', () => {
    render(<DepartmentDirectory {...defaultProps} selectedDepts={['Admission Office']} />)
    fireEvent.click(screen.getByText('Admission Office'))
    expect(screen.getByText(/department already tagged/i)).toBeInTheDocument()
  })

  it('shows toast when info button is clicked with no selection', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Info').closest('button')!)
    expect(screen.getByText(/tap any card to tag it to your chat/i)).toBeInTheDocument()
  })

  it('hides toast after 3 seconds', () => {
    vi.useFakeTimers()
    render(<DepartmentDirectory {...defaultProps} selectedDepts={['Admission Office']} />)
    fireEvent.click(screen.getByText('Admission Office'))
    act(() => { vi.advanceTimersByTime(3000) })
    vi.useRealTimers()
  })

  // --- Navigation ---
  it('calls onBack when close ✕ button clicked', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.click(screen.getByText('✕'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onOpenBookingStatus when Bookings button clicked', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.click(screen.getByText('Bookings'))
    expect(defaultProps.onOpenBookingStatus).toHaveBeenCalled()
  })

  // --- Sidebar ---
  it('opens sidebar when menu clicked', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    expect(screen.getByText('New chat')).toBeInTheDocument()
  })

  it('calls onBack via New chat', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    fireEvent.click(screen.getByText('New chat'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onOpenProfileSettings from sidebar', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    fireEvent.click(screen.getByText('Settings & Profile'))
    expect(defaultProps.onOpenProfileSettings).toHaveBeenCalled()
  })

  it('renders static contact info for each department', () => {
    render(<DepartmentDirectory {...defaultProps} />)
    expect(screen.getAllByText('+607-553 3333').length).toBeGreaterThan(0)
    expect(screen.getAllByText('8:00 AM - 5:00 PM').length).toBeGreaterThan(0)
  })
})
