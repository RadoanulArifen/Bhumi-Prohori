import { test as base, expect } from '@playwright/test'

export const parcel = {
  parcel_id: 'P-000001', district: 'Test District', upazila: 'Test Upazila', mouza: 'Test Mouza',
  khatian_no: 'K-001', dag_no: 'D-001', total_area_decimal: 10,
  current_owner_name: 'Synthetic Owner', integrity_status: 'High Concern',
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      localStorage.setItem('landguard-language', 'en')
      localStorage.removeItem('lg_demo')
    })
    // Abort unhandled API calls: never forward requests to a real backend.
    await page.route('**/api/**', route => route.abort('blockedbyclient'))
    await page.route('**/api/auth/me', route => route.fulfill({ json: {
      name: 'Synthetic Investigator', email: 'test@example.invalid', role: 'Investigator',
    } }))
    await page.route('**/api/meta/locations*', route => route.fulfill({ json: {
      districts: ['Test District'], upazilas: ['Test Upazila'], mouzas: ['Test Mouza'],
    } }))
    await page.route('**/api/parcels?*', route => {
      const query = new URL(route.request().url()).searchParams
      const empty = query.get('district') === 'Missing District'
        || query.get('dag') === 'D-MISSING'
        || (query.get('integrity_status') && query.get('integrity_status') !== parcel.integrity_status)
      return route.fulfill({ json: { total: empty ? 0 : 1, items: empty ? [] : [parcel], limit: 12, offset: 0 } })
    })
    // Browser assets may load locally; outside HTTP requests are blocked.
    await page.route(url => /^https?:/.test(url.protocol) && url.origin !== 'http://127.0.0.1:5187', route => route.abort())
    await use(page)
  },
})
export { expect }
