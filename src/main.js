import App from './App.svelte';
import loadData from './repo.js'

loadData(function(tileset){
	const app = new App({
		target: document.getElementById('jw-tiles'),
		props: {
			tileset
		}
	});
})