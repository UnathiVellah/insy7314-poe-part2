import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { AuthProvider } from '../context/AuthProvider'

// Renders the whole app (router + auth) starting at a given URL, the same way
// main.jsx wires it up in the browser.
export const renderApp = (route = '/') =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )