import React from 'react';
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

    // 2. Verify that fetch was called
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://scada-i-umhack26.onrender.com/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );

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