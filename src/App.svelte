<script>
  import { shuffle } from './utils'
  const srcOnError = '//jeuweb.org/jscripts/jeuweb/no-game-image.png'
  export let tileset = []
  let shuffled = tileset.slice()
  shuffle(shuffled)

  function goLeft() {
    shuffled.splice(0, 0, shuffled.pop())
    shuffled = shuffled
    console.log(`shuffled.length`, shuffled.length)
  }
  function goRight() {
    shuffled.push(shuffled.shift())
    shuffled = shuffled
    console.log(`shuffled.length`, shuffled.length)
  }

  $: selectedTiles = shuffled.slice(0, 4)
  $: preload_next = shuffled[4]
  $: preload_before = shuffled[shuffled.length - 1]

  function handleImageError(error, tile) {
    if (tile.image !== srcOnError) {
      tile.fit = 'contain'
      tile.image = srcOnError
      shuffled = shuffled
    }
  }
</script>

<div class="jw-tiles-inner">
  <div class="jw-tiles-tileset">
    {#each selectedTiles as tile (tile.id)}
      <a class="jw-tiles-tile" href={tile.url}>
        <div class="jw-tiles-ratio">
          <img
            src={tile.image}
            alt={tile.name}
            on:error={error => handleImageError(error, tile)}
            style="object-fit: {tile.fit}" />
          <div class="jw-tiles-game-title">{tile.name}</div>
        </div>
      </a>
    {/each}
  </div>
  <div class="jw-tiles-arrow jw-tiles-arrow-left" on:click={goLeft}>
    <span>◀</span>
  </div>
  <div class="jw-tiles-arrow jw-tiles-arrow-right" on:click={goRight}>
    <span>▶</span>
  </div>
</div>
{#if preload_next}
  <img class="jw-tiles-hidden" src={preload_next.image} alt="preloading" />
{/if}
{#if preload_before}
  <img class="jw-tiles-hidden" src={preload_before.image} alt="preloading" />
{/if}
<img class="jw-tiles-hidden" src={srcOnError} alt="preloading" />

<style>
  .jw-tiles-inner {
    position: relative;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue',
      sans-serif;
  }
  .jw-tiles-tileset {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
  }
  .jw-tiles-tile {
    width: calc(25% - 9px);
    text-decoration: none;
  }
  .jw-tiles-ratio {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: calc(62.5% + 30px);
  }
  img {
    position: absolute;
    display: block;
    height: calc(100% - 30px);
    width: 100%;
    height: calc(100% - 30px);
  }
  .jw-tiles-game-title {
    position: absolute;
    bottom: 0;
    /* overlap 1px */
    height: 31px;
    background: #2c2c2c;
    color: #fff;
    padding: 0 8px;
    width: calc(100% - 2 * 8px);
    font-size: 14px;
    line-height: calc(2 * 14px);
    text-align: right;
  }
  .jw-tiles-arrow {
    border-radius: 50%;
    position: absolute;
    top: 50%;
    height: 3em;
    width: 3em;
    line-height: 3em;
    margin-top: -1.5em;
    user-select: none;
    text-align: center;
    background: rgba(0, 0, 0, 0.75);
    color: #999;
    cursor: pointer;
  }
  .jw-tiles-arrow span {
    font-size: 21px;
  }
  .jw-tiles-arrow-left {
    left: 5px;
  }
  .jw-tiles-arrow-left span {
    margin-right: 4px;
  }
  .jw-tiles-arrow-right {
    right: 5px;
  }
  .jw-tiles-arrow-right span {
    margin-left: 4px;
  }

  .jw-tiles-hidden {
    display: none;
  }
</style>
