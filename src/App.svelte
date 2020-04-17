<svelte:options immutable={true}/>

<script>
	import { shuffle } from './utils'
	export let tileset
	let shuffled = tileset.slice()
	shuffle(shuffled)
	$: selectedTiles = shuffled.slice(0, 4)
	function goLeft() {
		shuffled = [shuffled[shuffled.length - 1]].concat(shuffled.slice(0, shuffled.length - 1))
		console.log(`shuffled[0]`, shuffled[0])
	}
	function goRight() {
		shuffled = shuffled.slice(1).concat([shuffled[0]])
		console.log(`shuffled[0]`, shuffled[0])
	}
</script>

<div class="jw-tiles-inner">
	<div class="jw-tiles-tileset">
	{#each selectedTiles as tile}
		<div class="jw-tiles-tile">
	        <img src="{tile.image}" alt="{tile.name}" />
	        <div>{tile.name}</div>
	      </div>
	{/each}
	</div>
	<div class="jw-tiles-arrow jw-tiles-arrow-left" on:click={goLeft}><span>◀</span></div>
	<div class="jw-tiles-arrow jw-tiles-arrow-right" on:click={goRight}><span>▶</span></div>
</div>

<style>
	.jw-tiles-inner {
		position: relative;
		box-sizing: border-box;
		font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
	}
	.jw-tiles-tileset {
		display: flex;
		justify-content: space-between;
	}
	img {
		display: block;
		width: 100%;
	}
	.jw-tiles-tile {
		width: calc(25% - 9px);
	}
	.jw-tiles-tile div {
		height: 30px;
		background: #2c2c2c;
		color: #fff;
		padding: 0 8px;
		width: calc(100% - 2 * 8px);
		font-size: 14px;
		line-height: calc(2 * 14px);
		text-align: right;
		margin-top: -3px;
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
	.jw-tiles-tile:first-child div { border-radius: 0 0 0 8px; }
	.jw-tiles-tile:first-child img { border-radius: 8px 0 0 0; }
	.jw-tiles-tile:last-child > div { border-radius: 0 0 8px 0; }
	.jw-tiles-tile:last-child img { border-radius: 0 8px 0 0; }
    
</style>