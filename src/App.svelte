<script>
  import { shuffle } from './utils'
  import { fade } from 'svelte/transition'
  const srcOnError = '//jeuweb.org/jscripts/jeuweb/no-game-image.png'
  export let tileset = []
  let shuffled = tileset.slice()
  shuffle(shuffled)

  function goLeft() {
    shuffled.splice(0, 0, shuffled.pop())
    shuffled = shuffled
  }

  function goRight() {
    shuffled.push(shuffled.shift())
    shuffled = shuffled
  }

  $: selectedTiles = shuffled.slice(0, 4)
  $: preload_next = shuffled[4]
  $: preload_before = shuffled[shuffled.length - 1]

  let hovered = null

  function setHovered(id) {
    hovered = id
  }

  function handleImageError(error, tile) {
    if (tile.image !== srcOnError) {
      tile.fit = 'contain'
      tile.image = srcOnError
      shuffled = shuffled
    }
  }

  function topicUrl(tid) {
    return `//jeuweb.org/showthread.php?tid=${tid}`
  }
</script>

<p>{hovered}</p>
<div class="jw-tiles-inner">
  <div class="jw-tiles-tileset">
    {#each selectedTiles as tile (tile.id)}
      <div
        class="jw-tiles-tile"
        class:jw-tiles-active={hovered === tile.id}
        on:mouseenter={() => setHovered(tile.id)}
        on:mouseleave={() => setHovered(null)}>
        <div class="jw-tiles-ratio">
          <img
            src={tile.image}
            alt={tile.name}
            on:error={error => handleImageError(error, tile)}
            style="object-fit: {tile.fit}" />
          {#if hovered === tile.id || true}
            <div class="jw-tiles-infopane" transition:fade={{ duration: 200 }}>
              <div class="jw-tiles-game-descr">
                <p>{tile.description}</p>
              </div>
              <div class="jw-tiles-game-actions">
                <a target="_blank" rel="noopener" href={topicUrl(tile.id_thread)}>Topic</a>
                <a target="_blank" rel="noopener" href={tile.url}>▶ Jouer</a>
              </div>
            </div>
          {/if}
          <a target="_blank" rel="noopener" href={tile.url} title={tile.name} class="jw-tiles-game-title">
            {tile.name}
          </a>
        </div>
      </div>
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
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue',
      sans-serif;
  }
  .jw-tiles-inner,
  .jw-tiles-inner * {
    box-sizing: border-box;
  }
  .jw-tiles-tileset {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
  }
  .jw-tiles-tile {
    width: calc(25% - 9px);
  }
  .jw-tiles-tile a:link {
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
  .jw-tiles-infopane {
    position: absolute;
    top: 0;
    bottom: 31px;
    width: 100%;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.5em;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .jw-tiles-game-descr {
    max-height: 70%;
    overflow: hidden;
  }
  .jw-tiles-game-actions {
    display: flex;
    justify-content: space-between;
  }
  .jw-tiles-game-actions a {
    background: rgb(41, 93, 146);
    color: white;
    display: block;
    line-height: 1.5em;
    text-align: center;
    padding: 0.25em;
    width: calc(50% - 0.25em);
  }
  .jw-tiles-game-title {
    position: absolute;
    bottom: 0;
    /* overlap 1px */
    height: 31px;
    background: #2c2c2c;
    color: #fff;
    padding: 0 8px;
    width: 100%;
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
