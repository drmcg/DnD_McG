const express = require('express')
const path = require('path')
const app = express()
const port = process.env.PORT || 5173
const dist = path.join(__dirname, 'dist')
app.use(express.static(dist))
app.get('*', (req, res) => {
  res.sendFile(path.join(dist, 'index.html'))
})
app.listen(port, ()=> {
  console.log('Serving on port', port)
})
