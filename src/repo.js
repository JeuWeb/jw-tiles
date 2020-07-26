import fetch from '@typicode/pegasus'

const url = 'https://raw.githubusercontent.com/RomainMazB/Annuaire_JeuWebOrg/master/inscrits.json'

function shrinkGame(game) {
  const { name, url, image, description } = game
  return { name, url, image, description }
}

function thransformData({data}) {
  return data.map(shrinkGame)
}

export default function load(fn) { 
  fetch(url).then(data => fn(thransformData(data)))
}