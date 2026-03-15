// Route handled by pages/api/users/[id].js (parent file)
// This index.js exists only because the [id]/ directory exists for future sub-routes.
export default function handler(req, res) {
  const { id } = req.query
  res.setHeader('Location', `/api/users/${id}`)
  return res.status(308).end()
}
