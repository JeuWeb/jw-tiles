import fetch from '@typicode/pegasus'

const url = '//jeuweb.org/our-games.json'

function shrinkGame(game) {
  const { name, url, image, description, id } = game
  return { name, url, image, description, id, fit: "cover" }
}

function thransformData({data}) {
  return data.map(shrinkGame)
}

export default function load(fn) { 
  fetch(url).then(data => fn(thransformData(data)))
}