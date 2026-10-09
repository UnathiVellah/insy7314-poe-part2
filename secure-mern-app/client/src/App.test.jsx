import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderApp } from './test/renderApp'

describe('App', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('renders the HustleHub+ home page for a visitor', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { name: /hustlehub\+/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument()
  })

  it('shows a not-found page for unknown routes', () => {
    renderApp('/does-not-exist')
    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
  })
})