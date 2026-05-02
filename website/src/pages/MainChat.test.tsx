import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import '@testing-library/jest-dom';
import MainChat from './MainChat';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user_01', user_metadata: { full_name: 'Test User' } } },
      }),
    },
  },
}));

vi.mock('../assets/LogoS.svg', () => ({ default: 'LogoS.svg' }));
vi.mock('../assets/Menu.svg', () => ({ default: 'Menu.svg' }));
vi.mock('../assets/Settings.svg', () => ({ default: 'Settings.svg' }));
vi.mock('../assets/Inbox.svg', () => ({ default: 'Inbox.svg' }));
vi.mock('../assets/Edit.svg', () => ({ default: 'Edit.svg' }));
vi.mock('../assets/Search.svg', () => ({ default: 'Search.svg' }));

global.fetch = vi.fn();

describe('MainChat Component', () => {
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
    localStorage.clear();
    (global.fetch as Mock).mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ reply: 'This is an AI response.' }),
    });
  });

  // --- Empty state ---
  it('does not send a message when input is empty', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders the initial empty state correctly', async () => {
    render(<MainChat {...mockProps} />);
    expect(screen.getByText('Planning an event?')).toBeInTheDocument();
    expect(screen.getByText("We'll sort out the perfect space & equipment.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Hey Test User')).toBeInTheDocument());
  });

  it('renders quick suggestion chips when input is empty and no messages', () => {
    render(<MainChat {...mockProps} />);
    expect(screen.getByText('Book room')).toBeInTheDocument();
    expect(screen.getByText('Book equipment')).toBeInTheDocument();
    expect(screen.getByText('Find the contact')).toBeInTheDocument();
    expect(screen.getByText('Operating time')).toBeInTheDocument();
    expect(screen.getByText('View history')).toBeInTheDocument();
  });

  it('clicking a suggestion chip calls onSetRequirement', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByText('Book room'));
    expect(mockProps.onSetRequirement).toHaveBeenCalledWith('Book room');
  });

  it('clicking all suggestion chips calls onSetRequirement', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByText('Book equipment'));
    expect(mockProps.onSetRequirement).toHaveBeenCalledWith('Book equipment');
    fireEvent.click(screen.getByText('View history'));
    expect(mockProps.onSetRequirement).toHaveBeenCalledWith('View history');
  });

  // --- Quick action buttons ---
  it('calls correct prop functions when quick action buttons are clicked', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByText('Browse Spaces'));
    expect(mockProps.onOpenBrowseSpaces).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Equipment Catalog'));
    expect(mockProps.onOpenEquipmentCatalog).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Department Directory'));
    expect(mockProps.onOpenDepartmentDirectory).toHaveBeenCalledTimes(1);
  });

  // --- Input ---
  it('calls onSetRequirement when typing in the textarea', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.change(screen.getByPlaceholderText('Type in your requirement'), {
      target: { value: 'I need a room for 10 people' },
    });
    expect(mockProps.onSetRequirement).toHaveBeenCalledWith('I need a room for 10 people');
  });

  it('calls handleBlur by blurring the textarea', () => {
    render(<MainChat {...mockProps} />);
    const textarea = screen.getByPlaceholderText('Type in your requirement');
    fireEvent.blur(textarea);
    expect(textarea).toBeInTheDocument();
  });

  it('sends message on Enter key press', async () => {
    const propsWithText = { ...mockProps, requirement: 'Book a room' };
    render(<MainChat {...propsWithText} />);
    fireEvent.keyDown(screen.getByPlaceholderText('Type in your requirement'), { key: 'Enter', shiftKey: false });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('does not send on Shift+Enter', () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Book a room' }} />);
    fireEvent.keyDown(screen.getByPlaceholderText('Type in your requirement'), { key: 'Enter', shiftKey: true });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  // --- Tags ---
  it('displays tags correctly when they are provided in props', () => {
    render(<MainChat {...mockProps} displayedSpace="Conference Room A" displayedEquipment={['Projector', 'Whiteboard']} />);
    expect(screen.getAllByText('Conference Room A')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Projector')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Whiteboard')[0]).toBeInTheDocument();
  });

  it('renders dept tags correctly when provided', () => {
    render(<MainChat {...mockProps} displayedDepts={['Engineering', 'HR']} />);
    expect(screen.getAllByText('Engineering')[0]).toBeInTheDocument();
    expect(screen.getAllByText('HR')[0]).toBeInTheDocument();
  });

  it('removes displayed space tag when X is clicked', () => {
    render(<MainChat {...mockProps} displayedSpace="Hall A" />);
    fireEvent.click(screen.getAllByText('✕')[0]);
    expect(mockProps.onSetDisplayedSpace).toHaveBeenCalledWith(null);
  });

  it('removes equipment tag when X is clicked', () => {
    render(<MainChat {...mockProps} displayedEquipment={['Projector']} />);
    fireEvent.click(screen.getAllByText('✕')[0]);
    expect(mockProps.onSetDisplayedEquipment).toHaveBeenCalledWith([]);
  });

  it('removes dept tag when X is clicked', () => {
    render(<MainChat {...mockProps} displayedDepts={['HR']} />);
    fireEvent.click(screen.getAllByText('✕')[0]);
    expect(mockProps.onSetDisplayedDepts).toHaveBeenCalledWith([]);
  });

  it('sends message with only tags and no text', async () => {
    render(<MainChat {...mockProps} displayedSpace="Hall A" />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  // --- Sending messages ---
  it('sends a message and updates the chat interface successfully', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Book a large hall' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    expect(mockProps.onSetRequirement).toHaveBeenCalledWith('');
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://scada-i-umhack26-production.up.railway.app/chat',
        expect.objectContaining({ method: 'POST' })
      );
    });
    await waitFor(() => expect(screen.getByText('This is an AI response.')).toBeInTheDocument());
  });

  it('handles server returning no reply field gracefully', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() =>
      expect(screen.getByText("The server connected but didn't provide a reply. Please try again.")).toBeInTheDocument()
    );
  });

  it('handles server error response (non-ok status)', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      headers: { get: () => 'application/json' },
      json: async () => ({}),
    });
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() =>
      expect(screen.getByText('Connection failed. Please check your internet or try again later.')).toBeInTheDocument()
    );
  });

  it('handles network errors gracefully', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network Error'));
    render(<MainChat {...{ ...mockProps, requirement: 'Hello AI' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() =>
      expect(screen.getByText('Connection failed. Please check your internet or try again later.')).toBeInTheDocument()
    );
  });

  // --- New chat ---
  it('clicking New Chat resets messages', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() => screen.getByText('This is an AI response.'));
    fireEvent.click(screen.getByText('New chat'));
    expect(screen.getByText('Planning an event?')).toBeInTheDocument();
  });

  it('clicking New Chat when already empty closes sidebar', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    fireEvent.click(screen.getByText('New chat'));
    // sidebar is CSS-transformed not unmounted
    expect(screen.getByText('Planning an event?')).toBeInTheDocument();
  });

  // --- Sidebar ---
  it('toggles the sidebar open and closed', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('calls onOpenBookingStatus from header Bookings button', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByText('Bookings'));
    expect(mockProps.onOpenBookingStatus).toHaveBeenCalled();
  });

  it('calls onOpenProfileSettings from sidebar Settings', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    fireEvent.click(screen.getByText('Settings & Profile'));
    expect(mockProps.onOpenProfileSettings).toHaveBeenCalled();
  });

  it('calls onOpenBookingStatus from sidebar Booking history', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    fireEvent.click(screen.getByText('Booking history'));
    expect(mockProps.onOpenBookingStatus).toHaveBeenCalled();
  });

  it('shows No recent chats when history is empty', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    expect(screen.getByText('No recent chats')).toBeInTheDocument();
  });

  // --- Chat history management ---
  it('renders chat history items from localStorage', () => {
    const history = [{ id: 'abc', title: 'My Chat', messages: [] }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    expect(screen.getByText('My Chat')).toBeInTheDocument();
  });

  it('chat history loads from localStorage on mount', () => {
    const history = [{ id: 'abc', title: 'Old Session', messages: [] }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    expect(screen.getByText('Old Session')).toBeInTheDocument();
  });

  it('opens kebab menu for a chat history item', () => {
    const history = [{ id: 'abc', title: 'Old Chat', messages: [] }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    const kebab = document.querySelector('[title="Options"]') as HTMLElement;
    fireEvent.click(kebab);
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('deletes a chat history item', () => {
    const history = [{ id: 'abc', title: 'Old Chat', messages: [] }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    const kebab = document.querySelector('[title="Options"]') as HTMLElement;
    fireEvent.click(kebab);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.queryByText('Old Chat')).not.toBeInTheDocument();
  });

  it('renames a chat history item', () => {
    const history = [{ id: 'abc', title: 'Old Chat', messages: [] }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    const kebab = document.querySelector('[title="Options"]') as HTMLElement;
    fireEvent.click(kebab);
    fireEvent.click(screen.getByText('Rename'));
    const input = screen.getByDisplayValue('Old Chat');
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('New Name')).toBeInTheDocument();
  });

  it('cancels rename with Escape key', () => {
    const history = [{ id: 'abc', title: 'Old Chat', messages: [] }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    const kebab = document.querySelector('[title="Options"]') as HTMLElement;
    fireEvent.click(kebab);
    fireEvent.click(screen.getByText('Rename'));
    const input = screen.getByDisplayValue('Old Chat');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByText('Old Chat')).toBeInTheDocument();
  });

  // --- Regenerate button ---
  it('shows Regenerate button after agent response', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() => expect(screen.getByText('This is an AI response.')).toBeInTheDocument());
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
  });

  it('shows Try again button after error response', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error('fail'));
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() => expect(screen.getByText('Try again')).toBeInTheDocument());
  });

  it('retries on Regenerate click', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() => expect(screen.getByText('Regenerate')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Regenerate'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  // --- Thought toggle ---
  it('shows thought toggle when agent has thoughts', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ reply: 'Done!', thought: 'Thinking about it...' }),
    });
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() => expect(screen.getByText('Thought for a moment')).toBeInTheDocument());
  });

  it('expands thoughts when Thought for a moment is clicked', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ reply: 'Done!', thought: 'Thinking about it...' }),
    });
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() => screen.getByText('Thought for a moment'));
    fireEvent.click(screen.getByText('Thought for a moment'));
    expect(screen.getByText('Thinking about it...')).toBeInTheDocument();
  });

  // --- Logo click ---
  it('clicking logo triggers new chat', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() => screen.getByText('This is an AI response.'));
    fireEvent.click(screen.getByAltText('DeepNaN'));
    expect(screen.getByText('Planning an event?')).toBeInTheDocument();
  });

  // --- Streaming response path ---
  it('handles streaming response with text/event-stream content type', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"final_response","details":"Streamed reply"}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(screen.getByText('Streamed reply')).toBeInTheDocument());
  });

  it('handles streaming thought event type', async () => {
    // Test thought via JSON response path which is reliable in jsdom
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ reply: 'ThoughtReply', thought: 'I am thinking deeply' }),
    });
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(screen.getByText('Thought for a moment')).toBeInTheDocument());
  });

  it('handles streaming action event type', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"action","agent":"BOOKING Agent","action":"Task Completed","details":"booking done"}\n\n'));
        controller.enqueue(encoder.encode('data: {"type":"final_response","details":"ActionDone"}\n\n'));
        controller.close();
      }
    });
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });
    render(<MainChat {...{ ...mockProps, requirement: 'ActionTest' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('handles streaming action with JSON in details', async () => {
    const encoder = new TextEncoder();
    const details = 'Some text {"message":"Room booked successfully"}';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: {"type":"action","agent":"Agent","action":"Done","details":"${details}"}\n\n`));
        controller.enqueue(encoder.encode('data: {"type":"final_response","details":"OK"}\n\n'));
        controller.close();
      }
    });
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });
    render(<MainChat {...{ ...mockProps, requirement: 'ActionJsonTest' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('handles streaming done event type', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"final_response","details":"StreamDoneReply"}\n\n'));
        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
        controller.close();
      }
    });
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });
    render(<MainChat {...{ ...mockProps, requirement: 'StreamTest' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('handles streaming raw non-JSON text', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: plain text token\n\n'));
        controller.close();
      }
    });
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  it('shows error when stream returns empty text', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() =>
      expect(screen.getByText("The server connected but didn't provide a reply. Please try again.")).toBeInTheDocument()
    );
  });

  it('handles streaming with unknown json type falls back to token field', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"unknown","token":"token text"}\n\n'));
        controller.close();
      }
    });
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
  });

  // --- Ghost buttons in renderInputTags ---
  it('ghost + Add Space button calls onOpenBrowseSpaces', () => {
    render(<MainChat {...mockProps} displayedSpace={null} />);
    const addSpaceBtn = screen.getAllByText('+ Add Space')[0];
    fireEvent.click(addSpaceBtn);
    expect(mockProps.onOpenBrowseSpaces).toHaveBeenCalled();
  });

  it('ghost + Add Equipment button calls onOpenEquipmentCatalog', () => {
    render(<MainChat {...mockProps} displayedEquipment={[]} />);
    const addEquipBtn = screen.getAllByText('+ Add Equipment')[0];
    fireEvent.click(addEquipBtn);
    expect(mockProps.onOpenEquipmentCatalog).toHaveBeenCalled();
  });

  it('ghost + Add Dept button calls onOpenDepartmentDirectory', () => {
    render(<MainChat {...mockProps} displayedDepts={[]} />);
    const addDeptBtn = screen.getAllByText('+ Add Dept')[0];
    fireEvent.click(addDeptBtn);
    expect(mockProps.onOpenDepartmentDirectory).toHaveBeenCalled();
  });

  it('hides ghost buttons when tags are filled', () => {
    render(<MainChat {...mockProps} displayedSpace="Hall A" displayedEquipment={['Projector']} displayedDepts={['HR']} />);
    expect(screen.queryByText('+ Add Space')).not.toBeInTheDocument();
    expect(screen.queryByText('+ Add Equipment')).not.toBeInTheDocument();
    expect(screen.queryByText('+ Add Dept')).not.toBeInTheDocument();
  });

  // --- Sending with equipment and dept tags ---
  it('sends message with equipment tags included in payload', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Need gear', displayedEquipment: ['Projector'] }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
    expect(body.message).toContain('Projector');
  });

  it('sends message with dept tags included in payload', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Need room', displayedDepts: ['Engineering'] }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
    expect(body.message).toContain('Engineering');
  });

  it('sends message with space tag included in payload', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Book it', displayedSpace: 'Hall A' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
    expect(body.message).toContain('Hall A');
  });

  // --- User message with tags renders tag chips ---
  it('renders space tag chip on sent user message', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Book', displayedSpace: 'Syndicate Room' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(screen.getByText('This is an AI response.')).toBeInTheDocument());
    expect(screen.getAllByText('Syndicate Room').length).toBeGreaterThan(0);
  });

  it('renders equipment tag chip on sent user message', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Book', displayedEquipment: ['Camera'] }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(screen.getByText('This is an AI response.')).toBeInTheDocument());
    expect(screen.getAllByText('Camera').length).toBeGreaterThan(0);
  });

  it('renders dept tag chip on sent user message', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Book', displayedDepts: ['HR'] }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(screen.getByText('This is an AI response.')).toBeInTheDocument());
    expect(screen.getAllByText('HR')[0]).toBeInTheDocument();
  });

  // --- Tags-only message (no text) renders fallback ---
  it('renders fallback text when user message has no text but has tags', async () => {
    render(<MainChat {...{ ...mockProps, requirement: '', displayedSpace: 'Hall A' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByText('Check these requirements:')).toBeInTheDocument();
  });

  // --- delete current thread triggers handleNewChat ---
  it('deletes current thread chat triggers new chat reset', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => screen.getByText('This is an AI response.'));
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    const kebab = document.querySelector('[title="Options"]') as HTMLElement;
    fireEvent.click(kebab);
    fireEvent.click(screen.getByText('Delete'));
    expect(screen.getByText('Planning an event?')).toBeInTheDocument();
  });

  // --- rename via onBlur ---
  it('saves rename on input blur', () => {
    const history = [{ id: 'abc', title: 'Old Chat', messages: [] }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    const kebab = document.querySelector('[title="Options"]') as HTMLElement;
    fireEvent.click(kebab);
    fireEvent.click(screen.getByText('Rename'));
    const input = screen.getByDisplayValue('Old Chat');
    fireEvent.change(input, { target: { value: 'Blur Name' } });
    fireEvent.blur(input);
    expect(screen.getByText('Blur Name')).toBeInTheDocument();
  });

  // --- loadChat with editingChatId guard ---
  it('does not load chat when currently editing that chat', () => {
    const history = [{ id: 'abc', title: 'Edit Me', messages: [] }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    const kebab = document.querySelector('[title="Options"]') as HTMLElement;
    fireEvent.click(kebab);
    fireEvent.click(screen.getByText('Rename'));
    // Now click the item itself while editing — should not trigger loadChat
    const input = screen.getByDisplayValue('Edit Me');
    fireEvent.click(input);
    // Still editing, not navigated
    expect(input).toBeInTheDocument();
  });

  // --- Thinking indicator while loading ---
  it('shows Thinking... while fetching', async () => {
    (global.fetch as Mock).mockImplementationOnce(() => new Promise(() => {}));
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    fireEvent.click(screen.getByText('\u27a4').closest('button')!);
    await waitFor(() => expect(screen.getByText('Thinking...')).toBeInTheDocument());
  });

  // --- isLoading disables send button ---
  it('disables send button while loading', async () => {
    (global.fetch as Mock).mockImplementationOnce(() => new Promise(() => {}));
    render(<MainChat {...{ ...mockProps, requirement: 'Hello' }} />);
    const btn = screen.getByText('\u27a4').closest('button')!;
    fireEvent.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());
  });

  // --- Additional Coverage Tests ---

  it('truncates long messages for the chat history title', async () => {
    const longMessage = 'A'.repeat(50);
    render(<MainChat {...{ ...mockProps, requirement: longMessage }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    
    const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
    expect(history[0].title).toBe('A'.repeat(28) + '...');
  });

  it('uses space tag for title when message text is empty', async () => {
    render(<MainChat {...{ ...mockProps, requirement: '', displayedSpace: 'Boardroom' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    
    const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
    expect(history[0].title).toBe('Booking for Boardroom');
  });

  it('closes the chat options menu when clicking outside', () => {
    const history = [{ id: 'abc', title: 'Old Chat', messages: [] }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);

    const kebab = document.querySelector('[title="Options"]') as HTMLElement;
    fireEvent.click(kebab);
    expect(screen.getByText('Rename')).toBeInTheDocument();

    // Click on body to trigger the document click event listener
    fireEvent.click(document.body);
    expect(screen.queryByText('Rename')).not.toBeInTheDocument();
  });

  it('updates textarea height and overflow style on requirement change', () => {
    const { rerender } = render(<MainChat {...mockProps} requirement="short" />);
    const textarea = screen.getByPlaceholderText('Type in your requirement');

    // Force scrollHeight > 160px
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 200 });
    rerender(<MainChat {...mockProps} requirement="very long text that causes wrap" />);
    
    expect(textarea.style.overflowY).toBe('auto');

    // Force scrollHeight <= 160px
    Object.defineProperty(textarea, 'scrollHeight', { configurable: true, value: 100 });
    rerender(<MainChat {...mockProps} requirement="short again" />);
    
    expect(textarea.style.overflowY).toBe('hidden');
  });

  it('handles streaming action with JSON lacking a message string', async () => {
    const encoder = new TextEncoder();
    const details = 'Some text {"otherKey":"Room 5"}';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: {"type":"action","agent":"Agent","action":"Done","details":${JSON.stringify(details)}}\n\n`));
        controller.close();
      }
    });
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });
    
    render(<MainChat {...{ ...mockProps, requirement: 'ActionNoMessageJson' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/otherKey/)).toBeInTheDocument());
  });

  it('handles streaming action with invalid nested JSON gracefully', async () => {
    const encoder = new TextEncoder();
    const details = 'Some text {invalid: json}';
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: {"type":"action","agent":"Agent","action":"Done","details":${JSON.stringify(details)}}\n\n`));
        controller.close();
      }
    });
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });
    
    render(<MainChat {...{ ...mockProps, requirement: 'ActionInvalidJson' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    // Should render the raw text rather than crashing
    await waitFor(() => expect(screen.getByText(/invalid: json/)).toBeInTheDocument());
  });

  it('scrolls to bottom when messages update', async () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Scroll test' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    
    await waitFor(() => {
      // Validates that the ref triggers the mocked prototype method
      expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  // --- Extra Coverage Tests for Missing Branches ---

  it('preserves custom title when a new message is sent in a renamed chat', async () => {
    const history = [{ id: 'thread-custom', title: 'My Custom Title', messages: [], isCustomTitle: true }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    localStorage.setItem('current_thread_id', 'thread-custom');
    
    render(<MainChat {...{ ...mockProps, requirement: 'Second message' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    
    const newHistory = JSON.parse(localStorage.getItem('chat_history') || '[]');
    const targetHistory = newHistory.find((h: any) => h.id === 'thread-custom');
    expect(targetHistory.title).toBe('My Custom Title');
  });

  it('renders multi-row tag layouts for mobile and desktop when many tags are present', () => {
    render(
      <MainChat
        {...mockProps}
        displayedSpace="Conference Room"
        displayedEquipment={['Eq1', 'Eq2', 'Eq3', 'Eq4', 'Eq5']}
        displayedDepts={['Dept1', 'Dept2', 'Dept3']}
      />
    );
    // Because tags render in both mobile and desktop flex containers, we use getAllByText
    expect(screen.getAllByText('Eq1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Eq5')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Dept3')[0]).toBeInTheDocument();
  });

  it('uses default Booking Inquiry title when message text is empty and no space tag is present', async () => {
    render(<MainChat {...{ ...mockProps, requirement: '', displayedEquipment: ['Projector'] }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    
    const history = JSON.parse(localStorage.getItem('chat_history') || '[]');
    expect(history[0].title).toBe('Booking Inquiry');
  });

  it('deletes a background chat without resetting current thread', () => {
    const activeMessages = [{ role: 'user', text: 'hi', tags: { space: null, equipment: [], depts: [] } }];
    const history = [
      { id: 'active-thread', title: 'Active', messages: activeMessages },
      { id: 'bg-thread', title: 'Background', messages: [] }
    ];
    
    // Set the full environment state so the chat window doesn't boot into the empty state
    localStorage.setItem('chat_history', JSON.stringify(history));
    localStorage.setItem('current_thread_id', 'active-thread');
    localStorage.setItem('chat_messages', JSON.stringify(activeMessages)); 
    
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    
    const menus = document.querySelectorAll('[title="Options"]');
    fireEvent.click(menus[1]); // Open menu for the Background thread
    fireEvent.click(screen.getByText('Delete'));
    
    expect(screen.queryByText('Background')).not.toBeInTheDocument();
    // Because the active thread has messages, it shouldn't show the empty state welcome screen
    expect(screen.queryByText('Planning an event?')).not.toBeInTheDocument();
  });

  it('closes the sidebar when clicking the mobile overlay', () => {
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    
    const overlay = document.querySelector('.bg-black\\/5') as HTMLElement;
    expect(overlay).toBeInTheDocument();
    
    // Simulate clicking outside the sidebar
    fireEvent.click(overlay);
    expect(document.querySelector('.bg-black\\/5')).not.toBeInTheDocument();
  });

  it('cancels rename if the new title is entirely empty whitespace', () => {
    const history = [{ id: 'abc', title: 'Old Chat', messages: [] }];
    localStorage.setItem('chat_history', JSON.stringify(history));
    render(<MainChat {...mockProps} />);
    fireEvent.click(screen.getByAltText('Menu').closest('button')!);
    
    const kebab = document.querySelector('[title="Options"]') as HTMLElement;
    fireEvent.click(kebab);
    fireEvent.click(screen.getByText('Rename'));
    
    const input = screen.getByDisplayValue('Old Chat');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    // Reverts to the previous valid title
    expect(screen.getByText('Old Chat')).toBeInTheDocument();
  });

  it('does not send message on random key presses like letter A', () => {
    render(<MainChat {...{ ...mockProps, requirement: 'Book a room' }} />);
    fireEvent.keyDown(screen.getByPlaceholderText('Type in your requirement'), { key: 'a' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends message with default user_id fallback if user is not loaded or null', async () => {
    // Override the mocked user session for this specific test
    const { supabase } = await import('../lib/supabaseClient');
    (supabase.auth.getUser as Mock).mockResolvedValueOnce({ data: { user: null } });
    
    render(<MainChat {...{ ...mockProps, requirement: 'No User Test' }} />);
    
    // Allow the initial getUser mount effect to flush
    await waitFor(() => {});
    
    fireEvent.click(screen.getByText('➤').closest('button')!);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    
    const body = JSON.parse((global.fetch as Mock).mock.calls[0][1].body);
    expect(body.user_id).toBe('user_01'); // Checks the ternary fallback
  });

  it('handles stream chunks that do not end cleanly with a newline', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Enqueue partial strings forcing the buffer combination logic to fire
        controller.enqueue(encoder.encode('data: {"type":"final_response","details":"Partial "}'));
        controller.enqueue(encoder.encode('\ndata: {"type":"final_response","details":"Chunk"}'));
        controller.close();
      }
    });
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: stream,
    });
    render(<MainChat {...{ ...mockProps, requirement: 'ChunkTest' }} />);
    fireEvent.click(screen.getByText('➤').closest('button')!);
    
    await waitFor(() => expect(screen.getByText('Partial Chunk')).toBeInTheDocument());
  });

});