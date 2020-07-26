export function shuffle(array) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }

  return array
}

export function keyUpdate(list, propName, propVal, fn) {
  let i
  for (i = 0; i < list.length; i++) {
    const item = list[i]
    if (item[propName] === propVal) {
      return [...list.slice(0, i), fn(item), ...list.slice(i + 1)]
    }
  }
  return list
}
