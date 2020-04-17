
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function not_equal(a, b) {
        return a != a ? b == b : a !== b;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function shuffle(array) {
      var currentIndex = array.length, temporaryValue, randomIndex;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
    }

    /* src/App.svelte generated by Svelte v3.20.1 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-u46lll-style";
    	style.textContent = ".jw-tiles-inner.svelte-u46lll.svelte-u46lll{position:relative;box-sizing:border-box;font-family:-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\", sans-serif}.jw-tiles-tileset.svelte-u46lll.svelte-u46lll{display:flex;justify-content:space-between}img.svelte-u46lll.svelte-u46lll{display:block;width:100%}.jw-tiles-tile.svelte-u46lll.svelte-u46lll{width:calc(25% - 9px)}.jw-tiles-tile.svelte-u46lll div.svelte-u46lll{height:30px;background:#2c2c2c;color:#fff;padding:0 8px;width:calc(100% - 2 * 8px);font-size:14px;line-height:calc(2 * 14px);text-align:right;margin-top:-3px}.jw-tiles-arrow.svelte-u46lll.svelte-u46lll{border-radius:50%;position:absolute;top:50%;height:3em;width:3em;line-height:3em;margin-top:-1.5em;user-select:none;text-align:center;background:rgba(0, 0, 0, 0.75);color:#999;cursor:pointer}.jw-tiles-arrow.svelte-u46lll span.svelte-u46lll{font-size:21px}.jw-tiles-arrow-left.svelte-u46lll.svelte-u46lll{left:5px}.jw-tiles-arrow-left.svelte-u46lll span.svelte-u46lll{margin-right:4px}.jw-tiles-arrow-right.svelte-u46lll.svelte-u46lll{right:5px}.jw-tiles-arrow-right.svelte-u46lll span.svelte-u46lll{margin-left:4px}.jw-tiles-tile.svelte-u46lll:first-child div.svelte-u46lll{border-radius:0 0 0 8px}.jw-tiles-tile.svelte-u46lll:first-child img.svelte-u46lll{border-radius:8px 0 0 0}.jw-tiles-tile.svelte-u46lll:last-child>div.svelte-u46lll{border-radius:0 0 8px 0}.jw-tiles-tile.svelte-u46lll:last-child img.svelte-u46lll{border-radius:0 8px 0 0}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgaW1tdXRhYmxlPXt0cnVlfS8+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IHNodWZmbGUgfSBmcm9tICcuL3V0aWxzJ1xuXHRleHBvcnQgbGV0IHRpbGVzZXRcblx0bGV0IHNodWZmbGVkID0gdGlsZXNldC5zbGljZSgpXG5cdHNodWZmbGUoc2h1ZmZsZWQpXG5cdCQ6IHNlbGVjdGVkVGlsZXMgPSBzaHVmZmxlZC5zbGljZSgwLCA0KVxuXHRmdW5jdGlvbiBnb0xlZnQoKSB7XG5cdFx0c2h1ZmZsZWQgPSBbc2h1ZmZsZWRbc2h1ZmZsZWQubGVuZ3RoIC0gMV1dLmNvbmNhdChzaHVmZmxlZC5zbGljZSgwLCBzaHVmZmxlZC5sZW5ndGggLSAxKSlcblx0XHRjb25zb2xlLmxvZyhgc2h1ZmZsZWRbMF1gLCBzaHVmZmxlZFswXSlcblx0fVxuXHRmdW5jdGlvbiBnb1JpZ2h0KCkge1xuXHRcdHNodWZmbGVkID0gc2h1ZmZsZWQuc2xpY2UoMSkuY29uY2F0KFtzaHVmZmxlZFswXV0pXG5cdFx0Y29uc29sZS5sb2coYHNodWZmbGVkWzBdYCwgc2h1ZmZsZWRbMF0pXG5cdH1cbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPVwianctdGlsZXMtaW5uZXJcIj5cblx0PGRpdiBjbGFzcz1cImp3LXRpbGVzLXRpbGVzZXRcIj5cblx0eyNlYWNoIHNlbGVjdGVkVGlsZXMgYXMgdGlsZX1cblx0XHQ8ZGl2IGNsYXNzPVwianctdGlsZXMtdGlsZVwiPlxuXHQgICAgICAgIDxpbWcgc3JjPVwie3RpbGUuaW1hZ2V9XCIgYWx0PVwie3RpbGUubmFtZX1cIiAvPlxuXHQgICAgICAgIDxkaXY+e3RpbGUubmFtZX08L2Rpdj5cblx0ICAgICAgPC9kaXY+XG5cdHsvZWFjaH1cblx0PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJqdy10aWxlcy1hcnJvdyBqdy10aWxlcy1hcnJvdy1sZWZ0XCIgb246Y2xpY2s9e2dvTGVmdH0+PHNwYW4+4peAPC9zcGFuPjwvZGl2PlxuXHQ8ZGl2IGNsYXNzPVwianctdGlsZXMtYXJyb3cganctdGlsZXMtYXJyb3ctcmlnaHRcIiBvbjpjbGljaz17Z29SaWdodH0+PHNwYW4+4pa2PC9zcGFuPjwvZGl2PlxuPC9kaXY+XG5cbjxzdHlsZT5cblx0Lmp3LXRpbGVzLWlubmVyIHtcblx0XHRwb3NpdGlvbjogcmVsYXRpdmU7XG5cdFx0Ym94LXNpemluZzogYm9yZGVyLWJveDtcblx0XHRmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCBcIlNlZ29lIFVJXCIsIFJvYm90bywgT3h5Z2VuLVNhbnMsIFVidW50dSwgQ2FudGFyZWxsLCBcIkhlbHZldGljYSBOZXVlXCIsIHNhbnMtc2VyaWY7XG5cdH1cblx0Lmp3LXRpbGVzLXRpbGVzZXQge1xuXHRcdGRpc3BsYXk6IGZsZXg7XG5cdFx0anVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuXHR9XG5cdGltZyB7XG5cdFx0ZGlzcGxheTogYmxvY2s7XG5cdFx0d2lkdGg6IDEwMCU7XG5cdH1cblx0Lmp3LXRpbGVzLXRpbGUge1xuXHRcdHdpZHRoOiBjYWxjKDI1JSAtIDlweCk7XG5cdH1cblx0Lmp3LXRpbGVzLXRpbGUgZGl2IHtcblx0XHRoZWlnaHQ6IDMwcHg7XG5cdFx0YmFja2dyb3VuZDogIzJjMmMyYztcblx0XHRjb2xvcjogI2ZmZjtcblx0XHRwYWRkaW5nOiAwIDhweDtcblx0XHR3aWR0aDogY2FsYygxMDAlIC0gMiAqIDhweCk7XG5cdFx0Zm9udC1zaXplOiAxNHB4O1xuXHRcdGxpbmUtaGVpZ2h0OiBjYWxjKDIgKiAxNHB4KTtcblx0XHR0ZXh0LWFsaWduOiByaWdodDtcblx0XHRtYXJnaW4tdG9wOiAtM3B4O1xuXHR9XG5cdC5qdy10aWxlcy1hcnJvdyB7XG5cdFx0Ym9yZGVyLXJhZGl1czogNTAlO1xuXHRcdHBvc2l0aW9uOiBhYnNvbHV0ZTtcblx0XHR0b3A6IDUwJTtcblx0XHRoZWlnaHQ6IDNlbTtcblx0XHR3aWR0aDogM2VtO1xuXHRcdGxpbmUtaGVpZ2h0OiAzZW07XG5cdFx0bWFyZ2luLXRvcDogLTEuNWVtO1xuXHRcdHVzZXItc2VsZWN0OiBub25lO1xuXHRcdHRleHQtYWxpZ246IGNlbnRlcjtcblx0XHRiYWNrZ3JvdW5kOiByZ2JhKDAsIDAsIDAsIDAuNzUpO1xuXHRcdGNvbG9yOiAjOTk5O1xuXHRcdGN1cnNvcjogcG9pbnRlcjtcblx0fVxuXHQuanctdGlsZXMtYXJyb3cgc3BhbiB7XG5cdFx0Zm9udC1zaXplOiAyMXB4O1xuXHR9XG5cdC5qdy10aWxlcy1hcnJvdy1sZWZ0IHtcblx0XHRsZWZ0OiA1cHg7XG5cdH1cblx0Lmp3LXRpbGVzLWFycm93LWxlZnQgc3BhbiB7XG5cdFx0bWFyZ2luLXJpZ2h0OiA0cHg7XG5cdH1cblx0Lmp3LXRpbGVzLWFycm93LXJpZ2h0IHtcblx0XHRyaWdodDogNXB4O1xuXHR9XG5cdC5qdy10aWxlcy1hcnJvdy1yaWdodCBzcGFuIHtcblx0XHRtYXJnaW4tbGVmdDogNHB4O1xuXHR9XG5cdC5qdy10aWxlcy10aWxlOmZpcnN0LWNoaWxkIGRpdiB7IGJvcmRlci1yYWRpdXM6IDAgMCAwIDhweDsgfVxuXHQuanctdGlsZXMtdGlsZTpmaXJzdC1jaGlsZCBpbWcgeyBib3JkZXItcmFkaXVzOiA4cHggMCAwIDA7IH1cblx0Lmp3LXRpbGVzLXRpbGU6bGFzdC1jaGlsZCA+IGRpdiB7IGJvcmRlci1yYWRpdXM6IDAgMCA4cHggMDsgfVxuXHQuanctdGlsZXMtdGlsZTpsYXN0LWNoaWxkIGltZyB7IGJvcmRlci1yYWRpdXM6IDAgOHB4IDAgMDsgfVxuICAgIFxuPC9zdHlsZT4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZ0NDLGVBQWUsNEJBQUMsQ0FBQyxBQUNoQixRQUFRLENBQUUsUUFBUSxDQUNsQixVQUFVLENBQUUsVUFBVSxDQUN0QixXQUFXLENBQUUsYUFBYSxDQUFDLENBQUMsa0JBQWtCLENB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 */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (21:1) {#each selectedTiles as tile}
    function create_each_block(ctx) {
    	let div1;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let div0;
    	let t1_value = /*tile*/ ctx[5].name + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			if (img.src !== (img_src_value = /*tile*/ ctx[5].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*tile*/ ctx[5].name);
    			attr_dev(img, "class", "svelte-u46lll");
    			add_location(img, file, 22, 9, 612);
    			attr_dev(div0, "class", "svelte-u46lll");
    			add_location(div0, file, 23, 9, 666);
    			attr_dev(div1, "class", "jw-tiles-tile svelte-u46lll");
    			add_location(div1, file, 21, 2, 575);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, t1);
    			append_dev(div1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectedTiles*/ 1 && img.src !== (img_src_value = /*tile*/ ctx[5].image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*selectedTiles*/ 1 && img_alt_value !== (img_alt_value = /*tile*/ ctx[5].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*selectedTiles*/ 1 && t1_value !== (t1_value = /*tile*/ ctx[5].name + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(21:1) {#each selectedTiles as tile}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div1;
    	let span0;
    	let t2;
    	let div2;
    	let span1;
    	let dispose;
    	let each_value = /*selectedTiles*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div1 = element("div");
    			span0 = element("span");
    			span0.textContent = "◀";
    			t2 = space();
    			div2 = element("div");
    			span1 = element("span");
    			span1.textContent = "▶";
    			attr_dev(div0, "class", "jw-tiles-tileset svelte-u46lll");
    			add_location(div0, file, 19, 1, 511);
    			attr_dev(span0, "class", "svelte-u46lll");
    			add_location(span0, file, 27, 67, 787);
    			attr_dev(div1, "class", "jw-tiles-arrow jw-tiles-arrow-left svelte-u46lll");
    			add_location(div1, file, 27, 1, 721);
    			attr_dev(span1, "class", "svelte-u46lll");
    			add_location(span1, file, 28, 69, 877);
    			attr_dev(div2, "class", "jw-tiles-arrow jw-tiles-arrow-right svelte-u46lll");
    			add_location(div2, file, 28, 1, 809);
    			attr_dev(div3, "class", "jw-tiles-inner svelte-u46lll");
    			add_location(div3, file, 18, 0, 481);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div1, span0);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, span1);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(div1, "click", /*goLeft*/ ctx[1], false, false, false),
    				listen_dev(div2, "click", /*goRight*/ ctx[2], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*selectedTiles*/ 1) {
    				each_value = /*selectedTiles*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			destroy_each(each_blocks, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { tileset } = $$props;
    	let shuffled = tileset.slice();
    	shuffle(shuffled);

    	function goLeft() {
    		$$invalidate(4, shuffled = [shuffled[shuffled.length - 1]].concat(shuffled.slice(0, shuffled.length - 1)));
    		console.log(`shuffled[0]`, shuffled[0]);
    	}

    	function goRight() {
    		$$invalidate(4, shuffled = shuffled.slice(1).concat([shuffled[0]]));
    		console.log(`shuffled[0]`, shuffled[0]);
    	}

    	const writable_props = ["tileset"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$set = $$props => {
    		if ("tileset" in $$props) $$invalidate(3, tileset = $$props.tileset);
    	};

    	$$self.$capture_state = () => ({
    		shuffle,
    		tileset,
    		shuffled,
    		goLeft,
    		goRight,
    		selectedTiles
    	});

    	$$self.$inject_state = $$props => {
    		if ("tileset" in $$props) $$invalidate(3, tileset = $$props.tileset);
    		if ("shuffled" in $$props) $$invalidate(4, shuffled = $$props.shuffled);
    		if ("selectedTiles" in $$props) $$invalidate(0, selectedTiles = $$props.selectedTiles);
    	};

    	let selectedTiles;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*shuffled*/ 16) {
    			 $$invalidate(0, selectedTiles = shuffled.slice(0, 4));
    		}
    	};

    	return [selectedTiles, goLeft, goRight, tileset];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-u46lll-style")) add_css();
    		init(this, options, instance, create_fragment, not_equal, { tileset: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tileset*/ ctx[3] === undefined && !("tileset" in props)) {
    			console_1.warn("<App> was created without expected prop 'tileset'");
    		}
    	}

    	get tileset() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tileset(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var tileset = [{"name":"Disease-it","url":"http://disease-it.jeuweb.org/","image":"https://img.itch.zone/aW1nLzMxMTA5ODQucG5n/original/zO55Li.png","description":null},{"name":"L'ile du coeur","url":"http: //www.ile-du-coeur.com/","image":"http://www.ile-du-coeur.com/graphisme/banniere.png","description":null},{"name":"L'ile du coeur","url":"http: //www.ile-du-coeur.com/","image":"https://i.picsum.photos/id/327/300/300.jpg?grayscale","description":null},{"name":"L'ile du coeur","url":"http: //www.ile-du-coeur.com/","image":"https://i.picsum.photos/id/327/800/600.jpg?grayscale","description":null},{"name":"L'ile du coeur","url":"http: //www.ile-du-coeur.com/","image":"https://i.picsum.photos/id/866/1000/200.jpg","description":null},{"name":"L'ile du coeur","url":"http: //www.ile-du-coeur.com/","image":"https://i.picsum.photos/id/866/1200/1200.jpg","description":null}];

    const app = new App({
    	target: document.getElementById('jw-tiles'),
    	props: {
    		tileset
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
