import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Page from '@/app/debug/page'

describe('Debug tab schema validation', () => {
  test('shows warning on schema mismatch', () => {
    render(React.createElement(Page as any))
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement
    fireEvent.change(ta, { target: { value: '[{"bad":1}]' } })
    expect(screen.getByText(/Schema mismatch/)).toBeInTheDocument()
  })
})


