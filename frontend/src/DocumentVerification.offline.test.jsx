import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DocumentVerification from './pages/DocumentVerification'
import { api } from './services/api'

vi.mock('./services/api', () => ({ api: { extractDocument: vi.fn(), verifyDocument: vi.fn() } }))
vi.mock('./i18n', () => ({ useLanguage: () => ({ language: 'en' }) }))
const record = { parcel_id: 'P-000001', district: 'Test District', upazila: 'Test Upazila', mouza: 'Test Mouza',
  khatian_no: 'K-001', dag_no: 'D-001', total_area_decimal: 10, current_owner_name: 'Synthetic Owner' }
const fields = { district: record.district, upazila: record.upazila, mouza: record.mouza,
  khatian: record.khatian_no, dag: record.dag_no, area: '০.১ একর', owner: record.current_owner_name }
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network disabled in offline tests') }))
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL = vi.fn(() => 'blob:synthetic-test')
    static revokeObjectURL = vi.fn()
  })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
async function verify(overrides = {}) {
  api.extractDocument.mockResolvedValue({ readable_text: true, page_count: 1, document_type: 'digital/typed',
    fields: Object.fromEntries(Object.entries({ ...fields, ...overrides }).map(([key, value]) => [key, { value, confidence: 'Medium' }])) })
  api.verifyDocument.mockResolvedValue({ matches: [record], multiple: false })
  const { container } = render(<MemoryRouter><DocumentVerification /></MemoryRouter>)
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(['synthetic'], 'test.png', { type: 'image/png' })] } })
  fireEvent.click(screen.getByRole('button', { name: 'Extract information' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Start verification' }))
  await screen.findByRole('table')
}
it('shows seven matching fields including Bangla acre conversion', async () => {
  await verify()
  expect(screen.getAllByText('✓ Matched')).toHaveLength(7)
  expect(screen.queryByText('! Mismatch')).toBeNull()
  expect(screen.getByText('No significant differences were found in this initial check.')).toBeTruthy()
  expect(api.verifyDocument).toHaveBeenCalledWith(expect.objectContaining({ area: '০.১ একর' }))
})
it('identifies a mismatched field and offers investigation', async () => {
  await verify({ dag: 'D-OTHER' })
  const row = screen.getByRole('cell', { name: 'D-OTHER' }).closest('tr')
  expect(within(row).getByText('! Mismatch')).toBeTruthy()
  expect(screen.getAllByText('✓ Matched')).toHaveLength(6)
  expect(screen.getByRole('link', { name: 'Send for investigation' }).getAttribute('href')).toBe('/investigate?parcel_id=P-000001')
})
it('shows missing fields as unavailable', async () => {
  await verify({ owner: '' })
  const row = screen.getByRole('cell', { name: 'Owner name' }).closest('tr')
  expect(within(row).getByText('— No data found')).toBeTruthy()
  expect(screen.getAllByText('✓ Matched')).toHaveLength(6)
})
