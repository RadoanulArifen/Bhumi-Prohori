import { test, expect, parcel } from './fixtures.mjs'

test('shows parcels immediately when the investigation page opens', async ({ page }) => {
  await page.goto('/investigate')
  await expect(page.getByRole('heading', { name: 'Search results', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: parcel.parcel_id, exact: true })).toBeVisible()
  await expect(page.getByText('1 parcels found', { exact: true })).toBeVisible()
})

test('searches by Dag and clearing restores the initial list', async ({ page }) => {
  await page.goto('/investigate')
  await expect(page.getByRole('heading', { name: parcel.parcel_id, exact: true })).toBeVisible()
  await page.getByLabel('Dag number', { exact: true }).fill('D-MISSING')
  const request = page.waitForRequest(req => {
    const url = new URL(req.url())
    return url.pathname === '/api/parcels' && url.searchParams.get('dag') === 'D-MISSING'
  })
  await page.getByRole('button', { name: 'Search parcels', exact: true }).click()
  await request
  await expect(page.getByText('No parcels found', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear all fields', exact: true }).click()
  await expect(page.getByLabel('Dag number', { exact: true })).toHaveValue('')
  await expect(page.getByRole('heading', { name: parcel.parcel_id, exact: true })).toBeVisible()
})

test('shows an API error and retries successfully', async ({ page }) => {
  let fail = true
  await page.route('**/api/parcels?*', route => {
    if (fail) return route.fulfill({ status: 503, json: { detail: 'Synthetic service unavailable' } })
    return route.fallback()
  })
  await page.goto('/investigate')
  await expect(page.getByText('Synthetic service unavailable', { exact: true })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: /retry|try again/i }).click()
  await expect(page.getByRole('heading', { name: parcel.parcel_id, exact: true })).toBeVisible()
})
