import App from './App.svelte';
import tileset from './data'

const app = new App({
	target: document.getElementById('jw-tiles'),
	props: {
		tileset
	}
});

export default app;