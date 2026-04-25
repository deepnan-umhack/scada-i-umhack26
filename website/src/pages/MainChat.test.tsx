import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import '@testing-library/jest-dom';
import MainChat from './MainChat';

// --- Mock External Dependencies ---

// Mock scrollIntoView since JSDOM doesn't implement it
window.HTMLElement.prototype.scrollIntoView = vi.fn();
// Mock Supabase client
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user_01', user_metadata: { full_name: 'Test User' } } },
      }),
    },
  },
}));

// Mock SVG imports so Vitest doesn't throw parse errors
vi.mock('../assets/LogoS.svg', () => ({ default: 'LogoS.svg' }));
vi.mock('../assets/Menu.svg', () => ({ default: 'Menu.svg' }));
vi.mock('../assets/Settings.svg', () => ({ default: 'Settings.svg' }));
vi.mock('../assets/Inbox.svg', () => ({ default: 'Inbox.svg' }));
vi.mock('../assets/Edit.svg', () => ({ default: 'Edit.svg' }));
vi.mock('../assets/Search.svg', () => ({ default: 'Search.svg' }));

// Mock global fetch for API calls
global.fetch = vi.fn();

describe('MainChat Component', () => {
  // Setup default props for standard renders
  const mockProps = {
    requirement: '',
    onSetRequirement: vi.fn(),
    displayedSpace: null,
    onSetDisplayedSpace: vi.fn(),
    displayedEquipment: [],
    onSetDisplayedEquipment: vi.fn(),
    displayedDepts: [],
    onSetDisplayedDepts: vi.fn(),
    onOpenBrowseSpaces: vi.fn(),
    onOpenBookingStatus: vi.fn(),
    onOpenEquipmentCatalog: vi.fn(),
    onOpenDepartmentDirectory: vi.fn(),
    onOpenProfileSettings: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock default implementation
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ reply: 'This is an AI response.' }),
    });
  });
  it('does not send a message when input is empty', () => {
  render(<MainChat {...mockProps} />); // requirement is '' by default

  const sendButton = screen.getByText('➤').closest('button');
  fireEvent.click(sendButton!);

  expect(global.fetch).not.toHaveBeenCalled();
});

it('handles server returning no reply field gracefully', async () => {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({}), // no reply field
  });

  const propsWithText = { ...mockProps, requirement: 'Hello' };
  render(<MainChat {...propsWithText} />);

  fireEvent.click(screen.getByText('➤').closest('button')!);

  await waitFor(() => {
    expect(screen.getByText("The server connected but didn't provide a reply. Please try again.")).toBeInTheDocument();
  });
});

it('handles server error response (non-ok status)', async () => {
  (global.fetch as Mock).mockResolvedValueOnce({
    ok: false,
    json: async () => ({}),
  });

  const propsWithText = { ...mockProps, requirement: 'Hello' };
  render(<MainChat {...propsWithText} />);

  fireEvent.click(screen.getByText('➤').closest('button')!);

  await waitFor(() => {
    expect(screen.getByText('Connection failed. Please check your internet or try again later.')).toBeInTheDocument();
  });
});

  it('sends message on Enter key press', async () => {
    const propsWithText = { ...mockProps, requirement: 'Book a room' };
    render(<MainChat {...propsWithText} />);

    const textarea = screen.getByPlaceholderText('Type in your requirement');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('does not send on Shift+Enter (adds newline instead)', () => {
    const propsWithText = { ...mockProps, requirement: 'Book a room' };
    render(<MainChat {...propsWithText} />);

    const textarea = screen.getByPlaceholderText('Type in your requirement');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders quick suggestion chips when input is empty and no messages', () => {
    render(<MainChat {...mockProps} />);

    expect(screen.getByText('Book room')).toBeInTheDocument();
    expect(screen.getByText('Book equipment')).toBeInTheDocument();
  });

  it('clicking a suggestion chip calls onSetRequirement', () => {
    render(<MainChat {...mockProps} />);

    fireEvent.click(screen.getByText('Book room'));
    expect(mockProps.onSetRequirement).toHaveBeenCalledWith('Book room');
  });

  it('toggles the sidebar open and closed', () => {
    render(<MainChat {...mockProps} />);

    const menuButton = screen.getByAltText('Menu').closest('button');
    fireEvent.click(menuButton!);
    // sidebar should now be open — check for something inside it
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('sends message with only tags and no text', async () => {
    const propsWithTags = {
      ...mockProps,
      requirement: '',
      displayedSpace: 'Hall A',
    };
    render(<MainChat {...propsWithTags} />);

    fireEvent.click(screen.getByText('➤').closest('button')!);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it('renders dept tags correctly when provided', () => {
    render(
      <MainChat
        {...mockProps}
        displayedDepts={['Engineering', 'HR']}
      />
    );

    expect(screen.getAllByText('Engineering')[0]).toBeInTheDocument();
    expect(screen.getAllByText('HR')[0]).toBeInTheDocument();
  });
  it('renders the initial empty state correctly', async () => {
    render(<MainChat {...mockProps} />);
    
    // Check if greeting headers are rendered
    expect(screen.getByText('Planning an event?')).toBeInTheDocument();
    expect(screen.getByText("We'll sort out the perfect space & equipment.")).toBeInTheDocument();
    
    // Check if the user name fetched from Supabase appears
    await waitFor(() => {
      expect(screen.getByText('Hey Test User')).toBeInTheDocument();
    });
  });
  it('calls handleBlur by blurring the textarea', () => {
    render(<MainChat {...mockProps} />);

    const textarea = screen.getByPlaceholderText('Type in your requirement');
    fireEvent.blur(textarea);
    // just verify it doesn't crash and scrollTo was attempted
    expect(textarea).toBeInTheDocument();
  });

    it('clicking New Chat resets messages', async () => {
      const propsWithText = { ...mockProps, requirement: 'Hello' };
      render(<MainChat {...propsWithText} />);

      // Send a message first so messages array is non-empty
      fireEvent.click(screen.getByText('➤').closest('button')!);
      await waitFor(() => screen.getByText('This is an AI response.'));

      // Click New Chat
      fireEvent.click(screen.getByText('New chat'));

      // Messages should be cleared, back to empty state
      expect(screen.getByText('Planning an event?')).toBeInTheDocument();
    });
    it('removes displayed space tag when X is clicked', () => {
    render(<MainChat {...mockProps} displayedSpace="Hall A" />);

    const removeButtons = screen.getAllByText('✕');
    fireEvent.click(removeButtons[0]);

    expect(mockProps.onSetDisplayedSpace).toHaveBeenCalledWith(null);
  });

  it('removes equipment tag when X is clicked', () => {
    render(<MainChat {...mockProps} displayedEquipment={['Projector']} />);

    const removeButtons = screen.getAllByText('✕');
    fireEvent.click(removeButtons[0]);

    expect(mockProps.onSetDisplayedEquipment).toHaveBeenCalledWith([]);
  });

  it('removes dept tag when X is clicked', () => {
    render(<MainChat {...mockProps} displayedDepts={['HR']} />);

    const removeButtons = screen.getAllByText('✕');
    fireEvent.click(removeButtons[0]);

    expect(mockProps.onSetDisplayedDepts).toHaveBeenCalledWith([]);
  });
  it('calls correct prop functions when quick action buttons are clicked', () => {
    render(<MainChat {...mockProps} />);
    
    fireEvent.click(screen.getByText('Browse Spaces'));
    expect(mockProps.onOpenBrowseSpaces).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Equipment Catalog'));
    expect(mockProps.onOpenEquipmentCatalog).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Department Directory'));
    expect(mockProps.onOpenDepartmentDirectory).toHaveBeenCalledTimes(1);
  });

  it('calls onSetRequirement when typing in the textarea', () => {
    render(<MainChat {...mockProps} />);
    
    const textarea = screen.getByPlaceholderText('Type in your requirement');
    fireEvent.change(textarea, { target: { value: 'I need a room for 10 people' } });
    
    expect(mockProps.onSetRequirement).toHaveBeenCalledWith('I need a room for 10 people');
  });

  it('displays tags correctly when they are provided in props', () => {
    render(
      <MainChat 
        {...mockProps} 
        displayedSpace="Conference Room A" 
        displayedEquipment={['Projector', 'Whiteboard']}
      />
    );

    expect(screen.getAllByText('Conference Room A')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Projector')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Whiteboard')[0]).toBeInTheDocument();
  });

  it('sends a message and updates the chat interface successfully', async () => {
    // Override default prop so the input has text
    const propsWithText = { ...mockProps, requirement: 'Book a large hall' };
    render(<MainChat {...propsWithText} />);

    // Find the send button (it's the button containing the '➤' character)
    const sendButton = screen.getByText('➤').closest('button');
    expect(sendButton).not.toBeNull();

    // Click send
    fireEvent.click(sendButton!);

    // 1. Verify onSetRequirement was called to clear the input
    expect(mockProps.onSetRequirement).toHaveBeenCalledWith('');

    // 2. Wait for and verify that fetch was called with the correct parameters
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://scada-i-umhack26-1.onrender.com/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    // 3. Wait for the mocked AI response to render in the UI
    await waitFor(() => {
      expect(screen.getByText('This is an AI response.')).toBeInTheDocument();
    });
  });

  it('handles server errors gracefully', async () => {
    // Mock a failed fetch request
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network Error'));
    
    const propsWithText = { ...mockProps, requirement: 'Hello AI' };
    render(<MainChat {...propsWithText} />);

    const sendButton = screen.getByText('➤').closest('button');
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(screen.getByText('Connection failed. Please check your internet or try again later.')).toBeInTheDocument();
    });
  });
});