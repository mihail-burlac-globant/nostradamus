/**
 * Add watermark (logo and copyright) to exported chart image
 */
export const addWatermarkToChart = async (
  chartDataURL: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Create canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    // Load chart image
    const chartImg = new Image()
    chartImg.crossOrigin = 'anonymous'

    chartImg.onload = async () => {
      // Set canvas size to match chart
      canvas.width = chartImg.width
      canvas.height = chartImg.height

      // Draw chart image
      ctx.drawImage(chartImg, 0, 0)

      // Load logo
      try {
        const logoImg = await loadLogo()

        // Watermark settings
        const logoSize = 40
        const padding = 20
        const x = canvas.width - logoSize - padding
        const y = canvas.height - logoSize - padding

        // Add semi-transparent white background for watermark
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillRect(x - 10, y - 10, logoSize + 120, logoSize + 20)

        // Draw logo
        ctx.globalAlpha = 0.8
        ctx.drawImage(logoImg, x, y, logoSize, logoSize)
        ctx.globalAlpha = 1.0

        // Add copyright text
        ctx.fillStyle = '#2E2E36'
        ctx.font = '12px Inter, sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('© 2025 Nostradamus', x + logoSize + 10, y + 20)
        ctx.font = '10px Inter, sans-serif'
        ctx.fillStyle = '#5A5A66'
        ctx.fillText('Mihail Burlac', x + logoSize + 10, y + 35)

        // Convert to data URL
        const watermarkedDataURL = canvas.toDataURL('image/png')
        resolve(watermarkedDataURL)
      } catch (error) {
        // If logo fails to load, just return the original chart
        console.warn('Could not load logo for watermark:', error)
        resolve(chartDataURL)
      }
    }

    chartImg.onerror = () => {
      reject(new Error('Could not load chart image'))
    }

    chartImg.src = chartDataURL
  })
}

/**
 * Load logo image
 */
const loadLogo = (): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load logo'))

    // Use the icon.svg from public folder
    img.src = '/icon.svg'
  })
}
