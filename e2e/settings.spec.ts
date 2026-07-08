import { test, expect } from '@playwright/test'

const TVH_URL = process.env.TVH_URL || 'http://your-tvh-server:9981/'

test.describe('Settings screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('renders settings form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'TVHeadend Client' })).toBeVisible()
    await expect(page.getByLabel('TVHeadend server URL')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Test' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible()
  })

  test('fills url and enables test connection flow', async ({ page }) => {
    const urlInput = page.getByLabel('TVHeadend server URL')
    await urlInput.fill(TVH_URL)

    await expect(page.getByRole('button', { name: 'Test' })).toBeEnabled()
  })

  test('runs connection test against real TVHeadend server', async ({ page }) => {
    await page.getByLabel('TVHeadend server URL').fill(TVH_URL)
    await page.getByRole('button', { name: 'Test' }).click()

    await expect(page.getByText('Connection test result')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Server', { exact: true })).toBeVisible()
    await expect(page.getByText('Playlist', { exact: true })).toBeVisible()
    await expect(page.getByText('OK')).toHaveCount(3)
  })

  test('saves settings and shows channel list', async ({ page }) => {
    await page.getByLabel('TVHeadend server URL').fill(TVH_URL)
    await page.getByRole('button', { name: 'Test' }).click()
    await expect(page.getByText('Connection test result')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('OK')).toHaveCount(3)

    const saveButton = page.getByRole('button', { name: 'Save' })
    await expect(saveButton).toBeEnabled({ timeout: 5000 })
    await saveButton.click()

    await expect(page.getByRole('heading', { name: 'Channels' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('26 channels')).toBeVisible()
  })
})
