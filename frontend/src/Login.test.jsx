import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './hooks/useAuth'
import { DemoProvider } from './hooks/useDemo'
import { LanguageProvider } from './i18n'
import Login from './pages/Login'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

function showLogin() {
  render(<MemoryRouter><AuthProvider><Login /></AuthProvider></MemoryRouter>)
}

it('shows the login form immediately without checking for a session when signed out', () => {
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)

  render(
    <MemoryRouter>
      <AuthProvider>
        <DemoProvider>
          <LanguageProvider><App /></LanguageProvider>
        </DemoProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('link', { name: 'Login' }))

  expect(screen.getByRole('heading', { name: 'Investigator Login' })).toBeTruthy()
  expect(fetch).not.toHaveBeenCalled()
})

it('checks an existing session and shows the form if it has expired', async () => {
  localStorage.setItem('lg_auth_token', 'expired-session')
  const fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ detail: 'Session expired' }) })
  vi.stubGlobal('fetch', fetch)

  showLogin()

  expect(screen.getByRole('status').textContent).toContain('Checking your session')
  expect(await screen.findByRole('heading', { name: 'Investigator Login' })).toBeTruthy()
  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/api\/auth\/me$/), {
    headers: { Authorization: 'Bearer expired-session' },
  })
  expect(localStorage.getItem('lg_auth_token')).toBeNull()
})
