// Route handled by pages/api/devices/[id].js (parent file)
// This index.js exists only because the [id]/ directory exists for sub-routes.
// Next.js will use [id].js for /api/devices/:id and this file should not be reached.
export default function handler(req, res) {
  const { id } = req.query
  res.setHeader('Location', `/api/devices/${id}`)
  return res.status(308).end()
}
