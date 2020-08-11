import fetch from '@typicode/pegasus'

const url = '//jeuweb.org/our-games.json'

function enhanceGame(game) {
  return { ...game, fit: 'cover' }
}

function thransformData({data}) {
  return data.map(enhanceGame)
}

export default function load(fn) { 
  fetch(url).then(data => fn(thransformData(data)))
}