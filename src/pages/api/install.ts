import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { NextApiRequest, NextApiResponse } from 'next'
import { withMethods } from '@/lib/api-middlewares/with-methods'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Read the PowerShell script from private directory
    const scriptPath = path.join(process.cwd(), 'src', 'lib', 'private', 'install.ps1')
    const scriptContent = await fs.readFile(scriptPath, 'utf8')
    let updatedScriptContent = scriptContent

    if (req.headers.host) {
      updatedScriptContent = updatedScriptContent.replace(/\/dotabod\.com/g, `/${req.headers.host}`)
    }

    // Set appropriate headers for PowerShell script
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', 'attachment; filename=install.ps1')
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    // Send the file content
    return res.status(200).send(updatedScriptContent)
  } catch (error) {
    console.error('Error serving install.ps1:', error)
    return res.status(500).json({ error: 'Failed to serve installation script' })
  }
}

export default withMethods(['GET'], handler)
