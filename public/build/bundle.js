
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
(function () {
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
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
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

    function destroy_block(block, lookup) {
        block.d(1);
        lookup.delete(block.key);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next, lookup.has(block.key));
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }
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
    const file = "src/App.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-ruwvgs-style";
    	style.textContent = ".jw-tiles-inner.svelte-ruwvgs.svelte-ruwvgs{position:relative;box-sizing:border-box;font-family:-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen-Sans, Ubuntu, Cantarell, \"Helvetica Neue\", sans-serif}.jw-tiles-tileset.svelte-ruwvgs.svelte-ruwvgs{min-height:13em;max-height:18em;display:flex;justify-content:space-between;align-items:stretch}img.svelte-ruwvgs.svelte-ruwvgs{display:block;width:100%;height:calc(100% - 30px);object-fit:cover}.jw-tiles-tile.svelte-ruwvgs.svelte-ruwvgs{width:calc(25% - 9px);text-decoration:none}.jw-tiles-tile.svelte-ruwvgs div.svelte-ruwvgs{height:30px;background:#2c2c2c;color:#fff;padding:0 8px;width:calc(100% - 2 * 8px);font-size:14px;line-height:calc(2 * 14px);text-align:right}.jw-tiles-arrow.svelte-ruwvgs.svelte-ruwvgs{border-radius:50%;position:absolute;top:50%;height:3em;width:3em;line-height:3em;margin-top:-1.5em;user-select:none;text-align:center;background:rgba(0, 0, 0, 0.75);color:#999;cursor:pointer}.jw-tiles-arrow.svelte-ruwvgs span.svelte-ruwvgs{font-size:21px}.jw-tiles-arrow-left.svelte-ruwvgs.svelte-ruwvgs{left:5px}.jw-tiles-arrow-left.svelte-ruwvgs span.svelte-ruwvgs{margin-right:4px}.jw-tiles-arrow-right.svelte-ruwvgs.svelte-ruwvgs{right:5px}.jw-tiles-arrow-right.svelte-ruwvgs span.svelte-ruwvgs{margin-left:4px}.jw-tiles-tile.svelte-ruwvgs:first-child div.svelte-ruwvgs{border-radius:0 0 0 8px}.jw-tiles-tile.svelte-ruwvgs:first-child img.svelte-ruwvgs{border-radius:8px 0 0 0}.jw-tiles-tile.svelte-ruwvgs:last-child>div.svelte-ruwvgs{border-radius:0 0 8px 0}.jw-tiles-tile.svelte-ruwvgs:last-child img.svelte-ruwvgs{border-radius:0 8px 0 0}.jw-tiles-hidden.svelte-ruwvgs.svelte-ruwvgs{display:none}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c3ZlbHRlOm9wdGlvbnMgaW1tdXRhYmxlPXt0cnVlfS8+XG5cbjxzY3JpcHQ+XG5cdGltcG9ydCB7IHNodWZmbGUgfSBmcm9tICcuL3V0aWxzJ1xuXHRleHBvcnQgbGV0IHRpbGVzZXRcblx0bGV0IHNodWZmbGVkID0gdGlsZXNldC5zbGljZSgpXG5cdHNodWZmbGUoc2h1ZmZsZWQpXG5cdFxuXHRmdW5jdGlvbiBnb0xlZnQoKSB7XG5cdFx0c2h1ZmZsZWQgPSBbc2h1ZmZsZWRbc2h1ZmZsZWQubGVuZ3RoIC0gMV1dLmNvbmNhdChzaHVmZmxlZC5zbGljZSgwLCBzaHVmZmxlZC5sZW5ndGggLSAxKSlcblx0fVxuXHRmdW5jdGlvbiBnb1JpZ2h0KCkge1xuXHRcdHNodWZmbGVkID0gc2h1ZmZsZWQuc2xpY2UoMSkuY29uY2F0KFtzaHVmZmxlZFswXV0pXG5cdH1cblxuXHQkOiBzZWxlY3RlZFRpbGVzID0gc2h1ZmZsZWQuc2xpY2UoMCwgNClcblx0JDogcHJlbG9hZF9uZXh0ID0gc2h1ZmZsZWRbNF1cblx0JDogcHJlbG9hZF9iZWZvcmUgPSBzaHVmZmxlZFtzaHVmZmxlZC5sZW5ndGgtMV1cbjwvc2NyaXB0PlxuXG48ZGl2IGNsYXNzPVwianctdGlsZXMtaW5uZXJcIj5cblx0PGRpdiBjbGFzcz1cImp3LXRpbGVzLXRpbGVzZXRcIj5cblx0eyNlYWNoIHNlbGVjdGVkVGlsZXMgYXMgdGlsZSAodGlsZS51cmwpfVxuXHRcdDxhIGNsYXNzPVwianctdGlsZXMtdGlsZVwiIGhyZWY9XCJ7dGlsZS51cmx9XCI+XG5cdCAgICAgICAgPGltZyBzcmM9XCJ7dGlsZS5pbWFnZX1cIiBhbHQ9XCJ7dGlsZS5uYW1lfVwiIC8+XG5cdCAgICAgICAgPGRpdj57dGlsZS5uYW1lfTwvZGl2PlxuXHRcdDwvYT5cblx0ey9lYWNofVxuXHQ8L2Rpdj5cblx0PGRpdiBjbGFzcz1cImp3LXRpbGVzLWFycm93IGp3LXRpbGVzLWFycm93LWxlZnRcIiBvbjpjbGljaz17Z29MZWZ0fT48c3Bhbj7il4A8L3NwYW4+PC9kaXY+XG5cdDxkaXYgY2xhc3M9XCJqdy10aWxlcy1hcnJvdyBqdy10aWxlcy1hcnJvdy1yaWdodFwiIG9uOmNsaWNrPXtnb1JpZ2h0fT48c3Bhbj7ilrY8L3NwYW4+PC9kaXY+XG48L2Rpdj5cbnsjaWYgcHJlbG9hZF9uZXh0fTxpbWcgY2xhc3M9XCJqdy10aWxlcy1oaWRkZW5cIiBzcmM9XCJ7cHJlbG9hZF9uZXh0LmltYWdlfVwiIGFsdD1cInByZWxvYWRpbmdcIiAvPnsvaWZ9XG57I2lmIHByZWxvYWRfYmVmb3JlfTxpbWcgY2xhc3M9XCJqdy10aWxlcy1oaWRkZW5cIiBzcmM9XCJ7cHJlbG9hZF9iZWZvcmUuaW1hZ2V9XCIgYWx0PVwicHJlbG9hZGluZ1wiIC8+ey9pZn1cblxuPHN0eWxlPlxuXHQuanctdGlsZXMtaW5uZXIge1xuXHRcdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0XHRib3gtc2l6aW5nOiBib3JkZXItYm94O1xuXHRcdGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsIFwiU2Vnb2UgVUlcIiwgUm9ib3RvLCBPeHlnZW4tU2FucywgVWJ1bnR1LCBDYW50YXJlbGwsIFwiSGVsdmV0aWNhIE5ldWVcIiwgc2Fucy1zZXJpZjtcblx0fVxuXHQuanctdGlsZXMtdGlsZXNldCB7XG5cdFx0bWluLWhlaWdodDogMTNlbTtcblx0XHRtYXgtaGVpZ2h0OiAxOGVtO1xuXHRcdGRpc3BsYXk6IGZsZXg7XG5cdFx0anVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuXHRcdGFsaWduLWl0ZW1zOiBzdHJldGNoO1xuXHR9XG5cdGltZyB7XG5cdFx0ZGlzcGxheTogYmxvY2s7XG5cdFx0d2lkdGg6IDEwMCU7XG5cdFx0aGVpZ2h0OiBjYWxjKDEwMCUgLSAzMHB4KTtcblx0XHRvYmplY3QtZml0OiBjb3Zlcjtcblx0fVxuXHQuanctdGlsZXMtdGlsZSB7XG5cdFx0d2lkdGg6IGNhbGMoMjUlIC0gOXB4KTtcblx0XHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG5cdH1cblx0Lmp3LXRpbGVzLXRpbGUgZGl2IHtcblx0XHRoZWlnaHQ6IDMwcHg7XG5cdFx0YmFja2dyb3VuZDogIzJjMmMyYztcblx0XHRjb2xvcjogI2ZmZjtcblx0XHRwYWRkaW5nOiAwIDhweDtcblx0XHR3aWR0aDogY2FsYygxMDAlIC0gMiAqIDhweCk7XG5cdFx0Zm9udC1zaXplOiAxNHB4O1xuXHRcdGxpbmUtaGVpZ2h0OiBjYWxjKDIgKiAxNHB4KTtcblx0XHR0ZXh0LWFsaWduOiByaWdodDtcblx0fVxuXHQuanctdGlsZXMtYXJyb3cge1xuXHRcdGJvcmRlci1yYWRpdXM6IDUwJTtcblx0XHRwb3NpdGlvbjogYWJzb2x1dGU7XG5cdFx0dG9wOiA1MCU7XG5cdFx0aGVpZ2h0OiAzZW07XG5cdFx0d2lkdGg6IDNlbTtcblx0XHRsaW5lLWhlaWdodDogM2VtO1xuXHRcdG1hcmdpbi10b3A6IC0xLjVlbTtcblx0XHR1c2VyLXNlbGVjdDogbm9uZTtcblx0XHR0ZXh0LWFsaWduOiBjZW50ZXI7XG5cdFx0YmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjc1KTtcblx0XHRjb2xvcjogIzk5OTtcblx0XHRjdXJzb3I6IHBvaW50ZXI7XG5cdH1cblx0Lmp3LXRpbGVzLWFycm93IHNwYW4ge1xuXHRcdGZvbnQtc2l6ZTogMjFweDtcblx0fVxuXHQuanctdGlsZXMtYXJyb3ctbGVmdCB7XG5cdFx0bGVmdDogNXB4O1xuXHR9XG5cdC5qdy10aWxlcy1hcnJvdy1sZWZ0IHNwYW4ge1xuXHRcdG1hcmdpbi1yaWdodDogNHB4O1xuXHR9XG5cdC5qdy10aWxlcy1hcnJvdy1yaWdodCB7XG5cdFx0cmlnaHQ6IDVweDtcblx0fVxuXHQuanctdGlsZXMtYXJyb3ctcmlnaHQgc3BhbiB7XG5cdFx0bWFyZ2luLWxlZnQ6IDRweDtcblx0fVxuXHQuanctdGlsZXMtdGlsZTpmaXJzdC1jaGlsZCBkaXYgeyBib3JkZXItcmFkaXVzOiAwIDAgMCA4cHg7IH1cblx0Lmp3LXRpbGVzLXRpbGU6Zmlyc3QtY2hpbGQgaW1nIHsgYm9yZGVyLXJhZGl1czogOHB4IDAgMCAwOyB9XG5cdC5qdy10aWxlcy10aWxlOmxhc3QtY2hpbGQgPiBkaXYgeyBib3JkZXItcmFkaXVzOiAwIDAgOHB4IDA7IH1cblx0Lmp3LXRpbGVzLXRpbGU6bGFzdC1jaGlsZCBpbWcgeyBib3JkZXItcmFkaXVzOiAwIDhweCAwIDA7IH1cblx0XG5cdC5qdy10aWxlcy1oaWRkZW4geyBkaXNwbGF5OiBub25lOyB9XG48L3N0eWxlPlxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQW9DQyxlQUFlLDRCQUFDLENBQUMsQUFDaEIsUUFBUSxDQUFFLFFBQVEsQ0FDbEIsVUFBVSxDQUFFLFVBQVUsQ0FDdEIsV0FBVyxDQUFFLGFBQWEsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxVQUFVLEFBQ2pJLENBQUMsQUFDRCxpQkFBaUIsNEJBQUMsQ0FBQyxBQUNsQixVQUFVLENBQUUsSUFBSSxDQUNoQixVQUFVLENBQUUsSUFBSSxDQUNoQixPQUFPLENBQUUsSUFBSSxDQUNiLGVBQWUsQ0FBRSxhQUFhLENBQzlCLFdBQVcsQ0FBRSxPQUFPLEFBQ3JCLENBQUMsQUFDRCxHQUFHLDRCQUFDLENBQUMsQUFDSixPQUFPLENBQUUsS0FBSyxDQUNkLEtBQUssQ0FBRSxJQUFJLENBQ1gsTUFBTSxDQUFFLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDekIsVUFBVSxDQUFFLEtBQUssQUFDbEIsQ0FBQyxBQUNELGNBQWMsNEJBQUMsQ0FBQyxBQUNmLEtBQUssQ0FBRSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQ3RCLGVBQWUsQ0FBRSxJQUFJLEFBQ3RCLENBQUMsQUFDRCw0QkFBYyxDQUFDLEdBQUcsY0FBQyxDQUFDLEFBQ25CLE1BQU0sQ0FBRSxJQUFJLENBQ1osVUFBVSxDQUFFLE9BQU8sQ0FDbkIsS0FBSyxDQUFFLElBQUksQ0FDWCxPQUFPLENBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FDZCxLQUFLLENBQUUsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQzNCLFNBQVMsQ0FBRSxJQUFJLENBQ2YsV0FBVyxDQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDM0IsVUFBVSxDQUFFLEtBQUssQUFDbEIsQ0FBQyxBQUNELGVBQWUsNEJBQUMsQ0FBQyxBQUNoQixhQUFhLENBQUUsR0FBRyxDQUNsQixRQUFRLENBQUUsUUFBUSxDQUNsQixHQUFHLENBQUUsR0FBRyxDQUNSLE1BQU0sQ0FBRSxHQUFHLENBQ1gsS0FBSyxDQUFFLEdBQUcsQ0FDVixXQUFXLENBQUUsR0FBRyxDQUNoQixVQUFVLENBQUUsTUFBTSxDQUNsQixXQUFXLENBQUUsSUFBSSxDQUNqQixVQUFVLENBQUUsTUFBTSxDQUNsQixVQUFVLENBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FDL0IsS0FBSyxDQUFFLElBQUksQ0FDWCxNQUFNLENBQUUsT0FBTyxBQUNoQixDQUFDLEFBQ0QsNkJBQWUsQ0FBQyxJQUFJLGNBQUMsQ0FBQyxBQUNyQixTQUFTLENBQUUsSUFBSSxBQUNoQixDQUFDLEFBQ0Qsb0JBQW9CLDRCQUFDLENBQUMsQUFDckIsSUFBSSxDQUFFLEdBQUcsQUFDVixDQUFDLEFBQ0Qsa0NBQW9CLENBQUMsSUFBSSxjQUFDLENBQUMsQUFDMUIsWUFBWSxDQUFFLEdBQUcsQUFDbEIsQ0FBQyxBQUNELHFCQUFxQiw0QkFBQyxDQUFDLEFBQ3RCLEtBQUssQ0FBRSxHQUFHLEFBQ1gsQ0FBQyxBQUNELG1DQUFxQixDQUFDLElBQUksY0FBQyxDQUFDLEFBQzNCLFdBQVcsQ0FBRSxHQUFHLEFBQ2pCLENBQUMsQUFDRCw0QkFBYyxZQUFZLENBQUMsR0FBRyxjQUFDLENBQUMsQUFBQyxhQUFhLENBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxBQUFFLENBQUMsQUFDNUQsNEJBQWMsWUFBWSxDQUFDLEdBQUcsY0FBQyxDQUFDLEFBQUMsYUFBYSxDQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQUFBRSxDQUFDLEFBQzVELDRCQUFjLFdBQVcsQ0FBRyxHQUFHLGNBQUMsQ0FBQyxBQUFDLGFBQWEsQ0FBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEFBQUUsQ0FBQyxBQUM3RCw0QkFBYyxXQUFXLENBQUMsR0FBRyxjQUFDLENBQUMsQUFBQyxhQUFhLENBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxBQUFFLENBQUMsQUFFM0QsZ0JBQWdCLDRCQUFDLENBQUMsQUFBQyxPQUFPLENBQUUsSUFBSSxBQUFFLENBQUMifQ== */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (23:1) {#each selectedTiles as tile (tile.url)}
    function create_each_block(key_1, ctx) {
    	let a;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let div;
    	let t1_value = /*tile*/ ctx[7].name + "";
    	let t1;
    	let t2;
    	let a_href_value;

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			a = element("a");
    			img = element("img");
    			t0 = space();
    			div = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			if (img.src !== (img_src_value = /*tile*/ ctx[7].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*tile*/ ctx[7].name);
    			attr_dev(img, "class", "svelte-ruwvgs");
    			add_location(img, file, 24, 9, 638);
    			attr_dev(div, "class", "svelte-ruwvgs");
    			add_location(div, file, 25, 9, 692);
    			attr_dev(a, "class", "jw-tiles-tile svelte-ruwvgs");
    			attr_dev(a, "href", a_href_value = /*tile*/ ctx[7].url);
    			add_location(a, file, 23, 2, 585);
    			this.first = a;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, img);
    			append_dev(a, t0);
    			append_dev(a, div);
    			append_dev(div, t1);
    			append_dev(a, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*selectedTiles*/ 1 && img.src !== (img_src_value = /*tile*/ ctx[7].image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*selectedTiles*/ 1 && img_alt_value !== (img_alt_value = /*tile*/ ctx[7].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*selectedTiles*/ 1 && t1_value !== (t1_value = /*tile*/ ctx[7].name + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*selectedTiles*/ 1 && a_href_value !== (a_href_value = /*tile*/ ctx[7].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(23:1) {#each selectedTiles as tile (tile.url)}",
    		ctx
    	});

    	return block;
    }

    // (33:0) {#if preload_next}
    function create_if_block_1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "jw-tiles-hidden svelte-ruwvgs");
    			if (img.src !== (img_src_value = /*preload_next*/ ctx[1].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "preloading");
    			add_location(img, file, 32, 18, 942);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*preload_next*/ 2 && img.src !== (img_src_value = /*preload_next*/ ctx[1].image)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(33:0) {#if preload_next}",
    		ctx
    	});

    	return block;
    }

    // (34:0) {#if preload_before}
    function create_if_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "jw-tiles-hidden svelte-ruwvgs");
    			if (img.src !== (img_src_value = /*preload_before*/ ctx[2].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "preloading");
    			add_location(img, file, 33, 20, 1043);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*preload_before*/ 4 && img.src !== (img_src_value = /*preload_before*/ ctx[2].image)) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(34:0) {#if preload_before}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div3;
    	let div0;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t0;
    	let div1;
    	let span0;
    	let t2;
    	let div2;
    	let span1;
    	let t4;
    	let t5;
    	let if_block1_anchor;
    	let dispose;
    	let each_value = /*selectedTiles*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*tile*/ ctx[7].url;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	let if_block0 = /*preload_next*/ ctx[1] && create_if_block_1(ctx);
    	let if_block1 = /*preload_before*/ ctx[2] && create_if_block(ctx);

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
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(div0, "class", "jw-tiles-tileset svelte-ruwvgs");
    			add_location(div0, file, 21, 1, 510);
    			attr_dev(span0, "class", "svelte-ruwvgs");
    			add_location(span0, file, 29, 67, 806);
    			attr_dev(div1, "class", "jw-tiles-arrow jw-tiles-arrow-left svelte-ruwvgs");
    			add_location(div1, file, 29, 1, 740);
    			attr_dev(span1, "class", "svelte-ruwvgs");
    			add_location(span1, file, 30, 69, 896);
    			attr_dev(div2, "class", "jw-tiles-arrow jw-tiles-arrow-right svelte-ruwvgs");
    			add_location(div2, file, 30, 1, 828);
    			attr_dev(div3, "class", "jw-tiles-inner svelte-ruwvgs");
    			add_location(div3, file, 20, 0, 480);
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
    			insert_dev(target, t4, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t5, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(div1, "click", /*goLeft*/ ctx[3], false, false, false),
    				listen_dev(div2, "click", /*goRight*/ ctx[4], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*selectedTiles*/ 1) {
    				const each_value = /*selectedTiles*/ ctx[0];
    				validate_each_argument(each_value);
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div0, destroy_block, create_each_block, null, get_each_context);
    			}

    			if (/*preload_next*/ ctx[1]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(t5.parentNode, t5);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*preload_before*/ ctx[2]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching) detach_dev(t4);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t5);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
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
    		$$invalidate(6, shuffled = [shuffled[shuffled.length - 1]].concat(shuffled.slice(0, shuffled.length - 1)));
    	}

    	function goRight() {
    		$$invalidate(6, shuffled = shuffled.slice(1).concat([shuffled[0]]));
    	}

    	const writable_props = ["tileset"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	$$self.$set = $$props => {
    		if ("tileset" in $$props) $$invalidate(5, tileset = $$props.tileset);
    	};

    	$$self.$capture_state = () => ({
    		shuffle,
    		tileset,
    		shuffled,
    		goLeft,
    		goRight,
    		selectedTiles,
    		preload_next,
    		preload_before
    	});

    	$$self.$inject_state = $$props => {
    		if ("tileset" in $$props) $$invalidate(5, tileset = $$props.tileset);
    		if ("shuffled" in $$props) $$invalidate(6, shuffled = $$props.shuffled);
    		if ("selectedTiles" in $$props) $$invalidate(0, selectedTiles = $$props.selectedTiles);
    		if ("preload_next" in $$props) $$invalidate(1, preload_next = $$props.preload_next);
    		if ("preload_before" in $$props) $$invalidate(2, preload_before = $$props.preload_before);
    	};

    	let selectedTiles;
    	let preload_next;
    	let preload_before;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*shuffled*/ 64) {
    			 $$invalidate(0, selectedTiles = shuffled.slice(0, 4));
    		}

    		if ($$self.$$.dirty & /*shuffled*/ 64) {
    			 $$invalidate(1, preload_next = shuffled[4]);
    		}

    		if ($$self.$$.dirty & /*shuffled*/ 64) {
    			 $$invalidate(2, preload_before = shuffled[shuffled.length - 1]);
    		}
    	};

    	return [selectedTiles, preload_next, preload_before, goLeft, goRight, tileset];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-ruwvgs-style")) add_css();
    		init(this, options, instance, create_fragment, not_equal, { tileset: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tileset*/ ctx[5] === undefined && !("tileset" in props)) {
    			console.warn("<App> was created without expected prop 'tileset'");
    		}
    	}

    	get tileset() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tileset(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // a   url (naming it a, because it will be reused to store callbacks)
    // e   timeout error placeholder to avoid using var, not to be used
    // xhr placeholder to avoid using var, not to be used
    function pegasus(a, e, xhr) {
      xhr = new XMLHttpRequest();

      // Set URL
      xhr.open('GET', a);

      // Don't need a to store URL anymore
      // Reuse it to store callbacks
      a = [];

      pegasus.timeout && (xhr.timeout = pegasus.timeout);

      xhr.ontimeout = function (event) {
        e = event;
      };

      xhr.onreadystatechange = xhr.then = function(onSuccess, onError, cb, data) {
        // Test if onSuccess is a function
        // Means that the user called xhr.then
        if (onSuccess && onSuccess.call) {
          a = [,onSuccess, onError];
        }

        // Test if there's a timeout error
        e && a[2] && a[2](e, xhr);

        // Test if request is complete
        if (xhr.readyState == 4) {
          // index will be:
          // 0 if undefined
          // 1 if status is between 200 and 399
          // 2 if status is over
          cb = a[0|xhr.status / 200];
          if (cb) {
            try {
              data = JSON.parse(xhr.responseText);
            } catch (e) {
              data = null;
            }
            cb(data, xhr);
          }
        }
      };

      // Send the GET request
      xhr.send();

      // Return request
      return xhr;
    }


    var pegasusCommonjs = pegasus;

    const url = 'https://www.jeuweb.org/our-games.json';

    function shrinkGame(game) {
      const { name, url, image, description } = game;
      return { name, url, image, description }
    }

    function thransformData({data}) {
      return data.map(shrinkGame)
    }

    function load(fn) { 
      pegasusCommonjs(url).then(data => fn(thransformData(data)));
    }

    load(function(tileset){
    	const app = new App({
    		target: document.getElementById('jw-tiles'),
    		props: {
    			tileset
    		}
    	});
    });

}());
//# sourceMappingURL=bundle.js.map
