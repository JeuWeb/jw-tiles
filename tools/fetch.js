const https = require("https")
const fs = require('fs')
const url = 'https://raw.githubusercontent.com/RomainMazB/Annuaire_JeuWebOrg/master/inscrits.json'
https.get(url, res => {
  let body = ''
  res.on('data', d => body += d)
  res.on('end', () => {
    handleData(JSON.parse(body).data)
  })
})

function shrinkGame(game) {
  const { name, url, image, description } = game
  return { name, url, image, description }
}

function handleData(data) {
  const json = JSON.stringify(data.map(shrinkGame))
  fs.writeFileSync('src/data.js', `export default ${json}`)
  console.log('Done')
}

