import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import AuthPage from './AuthPage'

// Mock assets
vi.mock('../assets/LogoS.svg', () => ({ default: 'logo.svg' }))

// Mock supabase
const mockSignIn = vi.fn()
const mockSignUp = vi.fn()
vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignIn(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
    }
  }
}))

const mockOnLoginSuccess = vi.fn()

const renderAuthPage = () => render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />)

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  })

  // --- Rendering ---
  it('renders the logo', () => {
    renderAuthPage()
    expect(screen.getByAltText('DeepNaN Logo')).toBeInTheDocument()
  })

  it('renders email and password fields by default', () => {
    renderAuthPage()
    expect(screen.getByPlaceholderText('Email Address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('shows Login button by default', () => {
    renderAuthPage()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('does not show signup fields in login mode', () => {
    renderAuthPage()
    expect(screen.queryByPlaceholderText('Full Name')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Staff ID')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Phone Number')).not.toBeInTheDocument()
  })

  // --- Toggle ---
  it('toggles to signup mode when Sign Up link is clicked', () => {
    renderAuthPage()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Staff ID')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Phone Number')).toBeInTheDocument()
  })

  it('toggles back to login mode from signup mode', () => {
    renderAuthPage()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    fireEvent.click(screen.getByRole('button', { name: /login/i }))
    expect(screen.queryByPlaceholderText('Full Name')).not.toBeInTheDocument()
  })

  it('shows "No account yet?" text in login mode', () => {
    renderAuthPage()
    expect(screen.getByText(/no account yet/i)).toBeInTheDocument()
  })

  it('shows "Already have an account?" text in signup mode', () => {
    renderAuthPage()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
  })

  // --- Input changes ---
  it('updates email field on input', () => {
    renderAuthPage()
    const emailInput = screen.getByPlaceholderText('Email Address') as HTMLInputElement
    fireEvent.change(emailInput, { target: { name: 'email', value: 'test@utm.my' } })
    expect(emailInput.value).toBe('test@utm.my')
  })

  it('updates password field on input', () => {
    renderAuthPage()
    const passwordInput = screen.getByPlaceholderText('Password') as HTMLInputElement
    fireEvent.change(passwordInput, { target: { name: 'password', value: 'secret123' } })
    expect(passwordInput.value).toBe('secret123')
  })

  it('calls scrollTo on input blur', () => {
    renderAuthPage()
    fireEvent.blur(screen.getByPlaceholderText('Email Address'))
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0 })
  })

  // --- Login submission ---
  it('calls signInWithPassword on login submit', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    renderAuthPage()
    fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { name: 'email', value: 'user@utm.my' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { name: 'password', value: 'pass123' } })
    fireEvent.submit(screen.getByRole('button', { name: /login/i }).closest('form')!)
    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith({ email: 'user@utm.my', password: 'pass123' }))
  })

  it('calls onLoginSuccess on successful login', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    renderAuthPage()
    fireEvent.submit(screen.getByRole('button', { name: /login/i }).closest('form')!)
    await waitFor(() => expect(mockOnLoginSuccess).toHaveBeenCalled())
  })

  it('shows alert on login failure', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    renderAuthPage()
    fireEvent.submit(screen.getByRole('button', { name: /login/i }).closest('form')!)
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Login failed: Invalid credentials'))
  })

  // --- Signup submission ---
  it('calls signUp on signup submit', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    renderAuthPage()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { name: 'name', value: 'Ali' } })
    fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { name: 'email', value: 'ali@utm.my' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { name: 'password', value: 'pass123' } })
    fireEvent.submit(screen.getByPlaceholderText('Email Address').closest('form')!)
    await waitFor(() => expect(mockSignUp).toHaveBeenCalled())
  })

  it('shows success alert and switches to login on successful signup', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    renderAuthPage()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    fireEvent.submit(screen.getByPlaceholderText('Email Address').closest('form')!)
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Sign up successful! You can now log in.'))
    expect(screen.queryByPlaceholderText('Full Name')).not.toBeInTheDocument()
  })

  it('shows alert on signup failure', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Email taken' } })
    renderAuthPage()
    fireEvent.click(screen.getByRole('button', { name: /sign up/i }))
    fireEvent.submit(screen.getByPlaceholderText('Email Address').closest('form')!)
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Sign up failed: Email taken'))
  })

  it('shows Processing... while loading', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {})) // never resolves
    renderAuthPage()
    fireEvent.submit(screen.getByRole('button', { name: /login/i }).closest('form')!)
    await waitFor(() => expect(screen.getByText(/processing/i)).toBeInTheDocument())
  })

  it('disables submit button while loading', async () => {
    mockSignIn.mockImplementation(() => new Promise(() => {}))
    renderAuthPage()
    const form = screen.getByRole('button', { name: /login/i }).closest('form')!
    fireEvent.submit(form)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /processing/i })
      expect(btn).toBeDisabled()
    })
  })
})
