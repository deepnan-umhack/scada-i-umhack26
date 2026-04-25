import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'
import EquipmentCatalog from './EquipmentCatalog'

vi.mock('../assets/LogoS.svg', () => ({ default: 'logo.svg' }))
vi.mock('../assets/Menu.svg', () => ({ default: 'menu.svg' }))
vi.mock('../assets/Settings.svg', () => ({ default: 'settings.svg' }))
vi.mock('../assets/Inbox.svg', () => ({ default: 'inbox.svg' }))
vi.mock('../assets/Edit.svg', () => ({ default: 'edit.svg' }))
vi.mock('../assets/Search.svg', () => ({ default: 'search.svg' }))
vi.mock('../assets/Info.svg', () => ({ default: 'info.svg' }))
vi.mock('../assets/Projector.jpg', () => ({ default: 'projector.jpg' }))
vi.mock('../assets/Desktop.jpg', () => ({ default: 'desktop.jpg' }))
vi.mock('../assets/ExtraFlipChart.jpg', () => ({ default: 'flipchart.jpg' }))
vi.mock('../assets/Extension.jpg', () => ({ default: 'extension.jpg' }))
vi.mock('../assets/Microphone.gif', () => ({ default: 'microphone.gif' }))
vi.mock('../assets/Camera.jpg', () => ({ default: 'camera.jpg' }))
vi.mock('../assets/Table.jpg', () => ({ default: 'table.jpg' }))
vi.mock('../assets/Chair.jpg', () => ({ default: 'chair.jpg' }))

const defaultProps = {
  onBack: vi.fn(),
  onEquipmentSelected: vi.fn(),
  onOpenBookingStatus: vi.fn(),
  onOpenProfileSettings: vi.fn(),
  selectedEquipment: [],
}

describe('EquipmentCatalog', () => {
  beforeEach(() => vi.clearAllMocks())

  // --- Rendering ---
  it('renders without crashing', () => {
    render(<EquipmentCatalog {...defaultProps} />)
  })

  it('renders the page heading', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    expect(screen.getByText('Equipment Catalog')).toBeInTheDocument()
  })

  it('renders the subheading', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    expect(screen.getByText(/browse and request event gear/i)).toBeInTheDocument()
  })

  it('renders all 8 equipment items', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    expect(screen.getByText('Projector')).toBeInTheDocument()
    expect(screen.getByText('Desktop')).toBeInTheDocument()
    expect(screen.getByText('Extra Flip Chart')).toBeInTheDocument()
    expect(screen.getByText('Extension')).toBeInTheDocument()
    expect(screen.getByText('Microphone')).toBeInTheDocument()
    expect(screen.getByText('Camera')).toBeInTheDocument()
    expect(screen.getByText('Table')).toBeInTheDocument()
    expect(screen.getByText('Chair')).toBeInTheDocument()
  })

  it('renders the logo', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    expect(screen.getByAltText('DeepNaN')).toBeInTheDocument()
  })

  // --- Quantity Modal ---
  it('opens quantity modal when equipment card is clicked', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('Projector'))
    expect(screen.getByText(/how many do you need/i)).toBeInTheDocument()
  })

  it('shows the correct item name in the modal', () => {
  render(<EquipmentCatalog {...defaultProps} />)
  fireEvent.click(screen.getByAltText('Camera'))  // click the image instead
  expect(screen.getByText(/how many do you need/i)).toBeInTheDocument()
})

  it('defaults quantity to 1 in modal', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('Projector'))
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('increments quantity when + is clicked', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('Projector'))
    fireEvent.click(screen.getByText('+'))
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('decrements quantity when - is clicked', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('Projector'))
    fireEvent.click(screen.getByText('+'))
    fireEvent.click(screen.getByText('+'))
    fireEvent.click(screen.getByText('-'))
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('does not decrement quantity below 1', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('Projector'))
    fireEvent.click(screen.getByText('-'))
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('closes modal when Cancel is clicked', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('Projector'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText(/how many do you need/i)).not.toBeInTheDocument()
  })

  it('resets quantity to 1 after cancel', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('Projector'))
    fireEvent.click(screen.getByText('+'))
    fireEvent.click(screen.getByText('+'))
    fireEvent.click(screen.getByText('Cancel'))
    fireEvent.click(screen.getByText('Projector'))
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('calls onEquipmentSelected with correct string on confirm', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('Microphone'))
    fireEvent.click(screen.getByText('+'))
    fireEvent.click(screen.getByText('+'))
    fireEvent.click(screen.getByText('Add to Chat'))
    expect(defaultProps.onEquipmentSelected).toHaveBeenCalledWith('Microphone (x3)')
  })

  it('closes modal after confirming', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('Table'))
    fireEvent.click(screen.getByText('Add to Chat'))
    expect(screen.queryByText(/how many do you need/i)).not.toBeInTheDocument()
  })

  // --- Tagged badge ---
  it('shows tagged badge on already-selected equipment', () => {
    render(<EquipmentCatalog {...defaultProps} selectedEquipment={['Camera (x2)']} />)
    expect(screen.getByText('ADDED: x2')).toBeInTheDocument()
  })

  it('shows Update Tag instead of Add to Chat for already-tagged item', () => {
    render(<EquipmentCatalog {...defaultProps} selectedEquipment={['Table (x1)']} />)
    fireEvent.click(screen.getAllByText('Table')[0])
    expect(screen.getByText('Update Tag')).toBeInTheDocument()
  })

  // --- Toast ---
  it('shows toast when info button is clicked', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Info').closest('button')!)
    expect(screen.getByText(/tap any card to tag it to your chat/i)).toBeInTheDocument()
  })

  it('hides toast after 3 seconds', () => {
    vi.useFakeTimers()
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Info').closest('button')!)
    act(() => { vi.advanceTimersByTime(3000) })
    vi.useRealTimers()
  })

  // --- Navigation ---
  it('calls onBack when close ✕ button clicked', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('✕'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onOpenBookingStatus when Bookings clicked', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByText('Bookings'))
    expect(defaultProps.onOpenBookingStatus).toHaveBeenCalled()
  })

  // --- Sidebar ---
  it('opens sidebar when menu clicked', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    expect(screen.getByText('New chat')).toBeInTheDocument()
  })

  it('calls onBack via New chat in sidebar', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    fireEvent.click(screen.getByText('New chat'))
    expect(defaultProps.onBack).toHaveBeenCalled()
  })

  it('calls onOpenProfileSettings from sidebar', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    fireEvent.click(screen.getByText('Settings & Profile'))
    expect(defaultProps.onOpenProfileSettings).toHaveBeenCalled()
  })

  it('closes sidebar overlay on backdrop click', () => {
    render(<EquipmentCatalog {...defaultProps} />)
    fireEvent.click(screen.getByAltText('Menu'))
    const overlay = document.querySelector('.fixed.inset-0.bg-black\\/5')
    if (overlay) fireEvent.click(overlay)
  })
})
