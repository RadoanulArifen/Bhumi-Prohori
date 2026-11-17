import { test, expect, parcel } from './fixtures.mjs'

for (const mismatch of [false, true]) {
  test(`document comparison shows ${mismatch ? 'a mismatched Dag and investigation link' : 'seven matching fields'}`, async ({ page }) => {
    const fields = {
      district: parcel.district, upazila: parcel.upazila, mouza: parcel.mouza,
      khatian: parcel.khatian_no, dag: mismatch ? 'D-OTHER' : parcel.dag_no,
      area: '০.১ একর', owner: parcel.current_owner_name,
    }
    await page.route('**/api/document/extract', route => route.fulfill({ json: {
      filename: 'synthetic.png', document_type: 'digital/typed', page_count: 1,
      readable_text: true, used_ocr: false,
      fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, { value, confidence: 'Medium' }])),
    } }))
    await page.route('**/api/document/verify', route => route.fulfill({ json: { matches: [parcel], multiple: false } }))
    await page.goto('/documents')
    // Tiny synthetic PNG; extraction itself is mocked and does not invoke OCR.
    await page.locator('input[type="file"]').setInputFiles({
      name: 'synthetic.png', mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64'),
    })
    await page.getByRole('button', { name: 'Extract information', exact: true }).click()
    await page.getByRole('button', { name: 'Start verification', exact: true }).click()
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('cell', { name: '✓ Matched', exact: true })).toHaveCount(mismatch ? 6 : 7)
    if (mismatch) {
      const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: 'D-OTHER', exact: true }) })
      await expect(row.getByText('! Mismatch', { exact: true })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Send for investigation', exact: true }))
        .toHaveAttribute('href', '/investigate?parcel_id=P-000001')
    } else {
      await expect(page.getByText('No significant differences were found in this initial check.', { exact: true })).toBeVisible()
    }
  })
}
