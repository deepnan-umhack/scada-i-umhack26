import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import AuthPage from '../AuthPage'

vi.mock('../../assets/LogoS.svg', () => ({ default: 'logo.svg' }))

const mockSignIn = vi.fn()
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignIn(...args),
      signUp: vi.fn(),
    },
  },
}))

const mockOnLoginSuccess = vi.fn()

const renderAuthPage = () => render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />)

describe('AuthPage (targeted unit tests)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('UT-01: renders login form fields by default', () => {
    renderAuthPage()
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('UT-02: toggles into sign-up mode and shows extra fields', async () => {
    renderAuthPage()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    expect(await screen.findByPlaceholderText(/full name/i)).toBeInTheDocument()
    expect(await screen.findByPlaceholderText(/staff id/i)).toBeInTheDocument()
    expect(await screen.findByPlaceholderText(/phone number/i)).toBeInTheDocument()
  })
  })

  it('UT-03: calls onLoginSuccess when login succeeds', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    renderAuthPage()
    fireEvent.submit(screen.getByRole('button', { name: /login/i }).closest('form')!)
    await waitFor(() => expect(mockOnLoginSuccess).toHaveBeenCalled())
  })

  it('UT-04: shows alert when login fails', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    renderAuthPage()
    fireEvent.submit(screen.getByRole('button', { name: /login/i }).closest('form')!)
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Login failed: Invalid credentials'))
  })

