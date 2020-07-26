
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
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
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
      var currentIndex = array.length,
        temporaryValue,
        randomIndex;

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

      return array
    }

    function keyUpdate(list, propName, propVal, fn) {
      let i;
      for (i = 0; i < list.length; i++) {
        const item = list[i];
        if (item[propName] === propVal) {
          return [...list.slice(0, i), fn(item), ...list.slice(i + 1)]
        }
      }
      return list
    }

    /* src/App.svelte generated by Svelte v3.20.1 */
    const file = "src/App.svelte";

    function add_css() {
    	var style = element("style");
    	style.id = "svelte-3f7w3q-style";
    	style.textContent = ".jw-tiles-inner.svelte-3f7w3q.svelte-3f7w3q{position:relative;box-sizing:border-box;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue',\n      sans-serif}.jw-tiles-tileset.svelte-3f7w3q.svelte-3f7w3q{height:13em;display:flex;justify-content:space-between;align-items:stretch}img.svelte-3f7w3q.svelte-3f7w3q{display:block;width:100%;height:calc(100% - 30px)}.jw-tiles-tile.svelte-3f7w3q.svelte-3f7w3q{width:calc(25% - 9px);text-decoration:none;background:rgb(209, 209, 209)}.jw-tiles-tile.svelte-3f7w3q div.svelte-3f7w3q{height:30px;background:#2c2c2c;color:#fff;padding:0 8px;width:calc(100% - 2 * 8px);font-size:14px;line-height:calc(2 * 14px);text-align:right}.jw-tiles-arrow.svelte-3f7w3q.svelte-3f7w3q{border-radius:50%;position:absolute;top:50%;height:3em;width:3em;line-height:3em;margin-top:-1.5em;user-select:none;text-align:center;background:rgba(0, 0, 0, 0.75);color:#999;cursor:pointer}.jw-tiles-arrow.svelte-3f7w3q span.svelte-3f7w3q{font-size:21px}.jw-tiles-arrow-left.svelte-3f7w3q.svelte-3f7w3q{left:5px}.jw-tiles-arrow-left.svelte-3f7w3q span.svelte-3f7w3q{margin-right:4px}.jw-tiles-arrow-right.svelte-3f7w3q.svelte-3f7w3q{right:5px}.jw-tiles-arrow-right.svelte-3f7w3q span.svelte-3f7w3q{margin-left:4px}.jw-tiles-tile.svelte-3f7w3q:first-child div.svelte-3f7w3q{border-radius:0 0 0 8px}.jw-tiles-tile.svelte-3f7w3q:first-child img.svelte-3f7w3q{border-radius:8px 0 0 0}.jw-tiles-tile.svelte-3f7w3q:last-child>div.svelte-3f7w3q{border-radius:0 0 8px 0}.jw-tiles-tile.svelte-3f7w3q:last-child img.svelte-3f7w3q{border-radius:0 8px 0 0}.jw-tiles-hidden.svelte-3f7w3q.svelte-3f7w3q{display:none}\n/*# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXBwLnN2ZWx0ZSIsInNvdXJjZXMiOlsiQXBwLnN2ZWx0ZSJdLCJzb3VyY2VzQ29udGVudCI6WyI8c2NyaXB0PlxuICBpbXBvcnQgeyBzaHVmZmxlLCBrZXlVcGRhdGUgfSBmcm9tICcuL3V0aWxzJ1xuICBjb25zdCBzcmNPbkVycm9yID0gJ2h0dHBzOi8vd3d3LmRyb3Bib3guY29tL3MvdnpuZXc5NWZxNnplaHpmL25vLWdhbWUtaW1hZ2UucG5nP2RsPTEnXG4gIGV4cG9ydCBsZXQgdGlsZXNldCA9IFtdXG4gIGxldCBzaHVmZmxlZCA9IHRpbGVzZXQuc2xpY2UoKVxuICBzaHVmZmxlKHNodWZmbGVkKVxuXG4gIGZ1bmN0aW9uIGdvTGVmdCgpIHtcbiAgICBzaHVmZmxlZCA9IFtzaHVmZmxlZFtzaHVmZmxlZC5sZW5ndGggLSAxXV0uY29uY2F0KHNodWZmbGVkLnNsaWNlKDAsIHNodWZmbGVkLmxlbmd0aCAtIDEpKVxuICB9XG4gIGZ1bmN0aW9uIGdvUmlnaHQoKSB7XG4gICAgc2h1ZmZsZWQgPSBzaHVmZmxlZC5zbGljZSgxKS5jb25jYXQoW3NodWZmbGVkWzBdXSlcbiAgfVxuXG4gICQ6IHNlbGVjdGVkVGlsZXMgPSBzaHVmZmxlZC5zbGljZSgwLCA0KVxuICAkOiBwcmVsb2FkX25leHQgPSBzaHVmZmxlZFs0XVxuICAkOiBwcmVsb2FkX2JlZm9yZSA9IHNodWZmbGVkW3NodWZmbGVkLmxlbmd0aCAtIDFdXG5cbiAgZnVuY3Rpb24gaGFuZGxlSW1hZ2VFcnJvcihlcnJvciwgdGlsZSkge1xuICAgIGlmICh0aWxlLmltYWdlICE9PSBzcmNPbkVycm9yKSB7XG4gICAgICBzaHVmZmxlZCA9IGtleVVwZGF0ZShzaHVmZmxlZCwgJ2ltYWdlJywgdGlsZS5pbWFnZSwgdGlsZSA9PiAoeyAuLi50aWxlLCBpbWFnZTogc3JjT25FcnJvciwgZml0OiAnY29udGFpbicgfSkpXG4gICAgfVxuICB9XG48L3NjcmlwdD5cblxuPHN2ZWx0ZTpvcHRpb25zIGltbXV0YWJsZT17dHJ1ZX0gLz5cbjxkaXYgY2xhc3M9XCJqdy10aWxlcy1pbm5lclwiPlxuICA8ZGl2IGNsYXNzPVwianctdGlsZXMtdGlsZXNldFwiPlxuICAgIHsjZWFjaCBzZWxlY3RlZFRpbGVzIGFzIHRpbGUgKHRpbGUuaWQpfVxuICAgICAgPGEgY2xhc3M9XCJqdy10aWxlcy10aWxlXCIgaHJlZj17dGlsZS51cmx9PlxuICAgICAgICA8aW1nXG4gICAgICAgICAgc3JjPXt0aWxlLmltYWdlfVxuICAgICAgICAgIGFsdD17dGlsZS5uYW1lfVxuICAgICAgICAgIG9uOmVycm9yPXtlcnJvciA9PiBoYW5kbGVJbWFnZUVycm9yKGVycm9yLCB0aWxlKX1cbiAgICAgICAgICBzdHlsZT1cIm9iamVjdC1maXQ6IHt0aWxlLmZpdH1cIiAvPlxuICAgICAgICA8ZGl2Pnt0aWxlLm5hbWV9PC9kaXY+XG4gICAgICA8L2E+XG4gICAgey9lYWNofVxuICA8L2Rpdj5cbiAgPGRpdiBjbGFzcz1cImp3LXRpbGVzLWFycm93IGp3LXRpbGVzLWFycm93LWxlZnRcIiBvbjpjbGljaz17Z29MZWZ0fT5cbiAgICA8c3Bhbj7il4A8L3NwYW4+XG4gIDwvZGl2PlxuICA8ZGl2IGNsYXNzPVwianctdGlsZXMtYXJyb3cganctdGlsZXMtYXJyb3ctcmlnaHRcIiBvbjpjbGljaz17Z29SaWdodH0+XG4gICAgPHNwYW4+4pa2PC9zcGFuPlxuICA8L2Rpdj5cbjwvZGl2PlxueyNpZiBwcmVsb2FkX25leHR9XG4gIDxpbWcgY2xhc3M9XCJqdy10aWxlcy1oaWRkZW5cIiBzcmM9e3ByZWxvYWRfbmV4dC5pbWFnZX0gYWx0PVwicHJlbG9hZGluZ1wiIC8+XG57L2lmfVxueyNpZiBwcmVsb2FkX2JlZm9yZX1cbiAgPGltZyBjbGFzcz1cImp3LXRpbGVzLWhpZGRlblwiIHNyYz17cHJlbG9hZF9iZWZvcmUuaW1hZ2V9IGFsdD1cInByZWxvYWRpbmdcIiAvPlxuey9pZn1cbjxpbWcgY2xhc3M9XCJqdy10aWxlcy1oaWRkZW5cIiBzcmM9e3NyY09uRXJyb3J9IGFsdD1cInByZWxvYWRpbmdcIiAvPlxuXG48c3R5bGU+XG4gIC5qdy10aWxlcy1pbm5lciB7XG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xuICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gICAgZm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgUm9ib3RvLCBPeHlnZW4tU2FucywgVWJ1bnR1LCBDYW50YXJlbGwsICdIZWx2ZXRpY2EgTmV1ZScsXG4gICAgICBzYW5zLXNlcmlmO1xuICB9XG4gIC5qdy10aWxlcy10aWxlc2V0IHtcbiAgICBoZWlnaHQ6IDEzZW07XG4gICAgZGlzcGxheTogZmxleDtcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG4gICAgYWxpZ24taXRlbXM6IHN0cmV0Y2g7XG4gIH1cbiAgaW1nIHtcbiAgICBkaXNwbGF5OiBibG9jaztcbiAgICB3aWR0aDogMTAwJTtcbiAgICBoZWlnaHQ6IGNhbGMoMTAwJSAtIDMwcHgpO1xuICB9XG4gIC5qdy10aWxlcy10aWxlIHtcbiAgICB3aWR0aDogY2FsYygyNSUgLSA5cHgpO1xuICAgIHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbiAgICBiYWNrZ3JvdW5kOiByZ2IoMjA5LCAyMDksIDIwOSk7XG4gIH1cbiAgLmp3LXRpbGVzLXRpbGUgZGl2IHtcbiAgICBoZWlnaHQ6IDMwcHg7XG4gICAgYmFja2dyb3VuZDogIzJjMmMyYztcbiAgICBjb2xvcjogI2ZmZjtcbiAgICBwYWRkaW5nOiAwIDhweDtcbiAgICB3aWR0aDogY2FsYygxMDAlIC0gMiAqIDhweCk7XG4gICAgZm9udC1zaXplOiAxNHB4O1xuICAgIGxpbmUtaGVpZ2h0OiBjYWxjKDIgKiAxNHB4KTtcbiAgICB0ZXh0LWFsaWduOiByaWdodDtcbiAgfVxuICAuanctdGlsZXMtYXJyb3cge1xuICAgIGJvcmRlci1yYWRpdXM6IDUwJTtcbiAgICBwb3NpdGlvbjogYWJzb2x1dGU7XG4gICAgdG9wOiA1MCU7XG4gICAgaGVpZ2h0OiAzZW07XG4gICAgd2lkdGg6IDNlbTtcbiAgICBsaW5lLWhlaWdodDogM2VtO1xuICAgIG1hcmdpbi10b3A6IC0xLjVlbTtcbiAgICB1c2VyLXNlbGVjdDogbm9uZTtcbiAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XG4gICAgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjc1KTtcbiAgICBjb2xvcjogIzk5OTtcbiAgICBjdXJzb3I6IHBvaW50ZXI7XG4gIH1cbiAgLmp3LXRpbGVzLWFycm93IHNwYW4ge1xuICAgIGZvbnQtc2l6ZTogMjFweDtcbiAgfVxuICAuanctdGlsZXMtYXJyb3ctbGVmdCB7XG4gICAgbGVmdDogNXB4O1xuICB9XG4gIC5qdy10aWxlcy1hcnJvdy1sZWZ0IHNwYW4ge1xuICAgIG1hcmdpbi1yaWdodDogNHB4O1xuICB9XG4gIC5qdy10aWxlcy1hcnJvdy1yaWdodCB7XG4gICAgcmlnaHQ6IDVweDtcbiAgfVxuICAuanctdGlsZXMtYXJyb3ctcmlnaHQgc3BhbiB7XG4gICAgbWFyZ2luLWxlZnQ6IDRweDtcbiAgfVxuICAuanctdGlsZXMtdGlsZTpmaXJzdC1jaGlsZCBkaXYge1xuICAgIGJvcmRlci1yYWRpdXM6IDAgMCAwIDhweDtcbiAgfVxuICAuanctdGlsZXMtdGlsZTpmaXJzdC1jaGlsZCBpbWcge1xuICAgIGJvcmRlci1yYWRpdXM6IDhweCAwIDAgMDtcbiAgfVxuICAuanctdGlsZXMtdGlsZTpsYXN0LWNoaWxkID4gZGl2IHtcbiAgICBib3JkZXItcmFkaXVzOiAwIDAgOHB4IDA7XG4gIH1cbiAgLmp3LXRpbGVzLXRpbGU6bGFzdC1jaGlsZCBpbWcge1xuICAgIGJvcmRlci1yYWRpdXM6IDAgOHB4IDAgMDtcbiAgfVxuXG4gIC5qdy10aWxlcy1oaWRkZW4ge1xuICAgIGRpc3BsYXk6IG5vbmU7XG4gIH1cbjwvc3R5bGU+XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBdURFLGVBQWUsNEJBQUMsQ0FBQyxBQUNmLFFBQVEsQ0FB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 */";
    	append_dev(document.head, style);
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (29:4) {#each selectedTiles as tile (tile.id)}
    function create_each_block(key_1, ctx) {
    	let a;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let div;
    	let t1_value = /*tile*/ ctx[9].name + "";
    	let t1;
    	let t2;
    	let a_href_value;
    	let dispose;

    	function error_handler(...args) {
    		return /*error_handler*/ ctx[8](/*tile*/ ctx[9], ...args);
    	}

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
    			if (img.src !== (img_src_value = /*tile*/ ctx[9].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*tile*/ ctx[9].name);
    			set_style(img, "object-fit", /*tile*/ ctx[9].fit);
    			attr_dev(img, "class", "svelte-3f7w3q");
    			add_location(img, file, 30, 8, 969);
    			attr_dev(div, "class", "svelte-3f7w3q");
    			add_location(div, file, 35, 8, 1139);
    			attr_dev(a, "class", "jw-tiles-tile svelte-3f7w3q");
    			attr_dev(a, "href", a_href_value = /*tile*/ ctx[9].url);
    			add_location(a, file, 29, 6, 919);
    			this.first = a;
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, a, anchor);
    			append_dev(a, img);
    			append_dev(a, t0);
    			append_dev(a, div);
    			append_dev(div, t1);
    			append_dev(a, t2);
    			if (remount) dispose();
    			dispose = listen_dev(img, "error", error_handler, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*selectedTiles*/ 1 && img.src !== (img_src_value = /*tile*/ ctx[9].image)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*selectedTiles*/ 1 && img_alt_value !== (img_alt_value = /*tile*/ ctx[9].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*selectedTiles*/ 1) {
    				set_style(img, "object-fit", /*tile*/ ctx[9].fit);
    			}

    			if (dirty & /*selectedTiles*/ 1 && t1_value !== (t1_value = /*tile*/ ctx[9].name + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*selectedTiles*/ 1 && a_href_value !== (a_href_value = /*tile*/ ctx[9].url)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(29:4) {#each selectedTiles as tile (tile.id)}",
    		ctx
    	});

    	return block;
    }

    // (47:0) {#if preload_next}
    function create_if_block_1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "jw-tiles-hidden svelte-3f7w3q");
    			if (img.src !== (img_src_value = /*preload_next*/ ctx[1].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "preloading");
    			add_location(img, file, 47, 2, 1418);
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
    		source: "(47:0) {#if preload_next}",
    		ctx
    	});

    	return block;
    }

    // (50:0) {#if preload_before}
    function create_if_block(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "jw-tiles-hidden svelte-3f7w3q");
    			if (img.src !== (img_src_value = /*preload_before*/ ctx[2].image)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "preloading");
    			add_location(img, file, 50, 2, 1521);
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
    		source: "(50:0) {#if preload_before}",
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
    	let t6;
    	let img;
    	let img_src_value;
    	let dispose;
    	let each_value = /*selectedTiles*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*tile*/ ctx[9].id;
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
    			t6 = space();
    			img = element("img");
    			attr_dev(div0, "class", "jw-tiles-tileset svelte-3f7w3q");
    			add_location(div0, file, 27, 2, 838);
    			attr_dev(span0, "class", "svelte-3f7w3q");
    			add_location(span0, file, 40, 4, 1267);
    			attr_dev(div1, "class", "jw-tiles-arrow jw-tiles-arrow-left svelte-3f7w3q");
    			add_location(div1, file, 39, 2, 1196);
    			attr_dev(span1, "class", "svelte-3f7w3q");
    			add_location(span1, file, 43, 4, 1366);
    			attr_dev(div2, "class", "jw-tiles-arrow jw-tiles-arrow-right svelte-3f7w3q");
    			add_location(div2, file, 42, 2, 1293);
    			attr_dev(div3, "class", "jw-tiles-inner svelte-3f7w3q");
    			add_location(div3, file, 26, 0, 807);
    			attr_dev(img, "class", "jw-tiles-hidden svelte-3f7w3q");
    			if (img.src !== (img_src_value = srcOnError)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "preloading");
    			add_location(img, file, 52, 0, 1603);
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
    			insert_dev(target, t6, anchor);
    			insert_dev(target, img, anchor);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(div1, "click", /*goLeft*/ ctx[3], false, false, false),
    				listen_dev(div2, "click", /*goRight*/ ctx[4], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*selectedTiles, handleImageError*/ 33) {
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
    					if_block1.m(t6.parentNode, t6);
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
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(img);
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

    const srcOnError = "https://www.dropbox.com/s/vznew95fq6zehzf/no-game-image.png?dl=1";

    function instance($$self, $$props, $$invalidate) {
    	let { tileset = [] } = $$props;
    	let shuffled = tileset.slice();
    	shuffle(shuffled);

    	function goLeft() {
    		$$invalidate(7, shuffled = [shuffled[shuffled.length - 1]].concat(shuffled.slice(0, shuffled.length - 1)));
    	}

    	function goRight() {
    		$$invalidate(7, shuffled = shuffled.slice(1).concat([shuffled[0]]));
    	}

    	function handleImageError(error, tile) {
    		if (tile.image !== srcOnError) {
    			$$invalidate(7, shuffled = keyUpdate(shuffled, "image", tile.image, tile => ({
    				...tile,
    				image: srcOnError,
    				fit: "contain"
    			})));
    		}
    	}

    	const writable_props = ["tileset"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const error_handler = (tile, error) => handleImageError(error, tile);

    	$$self.$set = $$props => {
    		if ("tileset" in $$props) $$invalidate(6, tileset = $$props.tileset);
    	};

    	$$self.$capture_state = () => ({
    		shuffle,
    		keyUpdate,
    		srcOnError,
    		tileset,
    		shuffled,
    		goLeft,
    		goRight,
    		handleImageError,
    		selectedTiles,
    		preload_next,
    		preload_before
    	});

    	$$self.$inject_state = $$props => {
    		if ("tileset" in $$props) $$invalidate(6, tileset = $$props.tileset);
    		if ("shuffled" in $$props) $$invalidate(7, shuffled = $$props.shuffled);
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
    		if ($$self.$$.dirty & /*shuffled*/ 128) {
    			 $$invalidate(0, selectedTiles = shuffled.slice(0, 4));
    		}

    		if ($$self.$$.dirty & /*shuffled*/ 128) {
    			 $$invalidate(1, preload_next = shuffled[4]);
    		}

    		if ($$self.$$.dirty & /*shuffled*/ 128) {
    			 $$invalidate(2, preload_before = shuffled[shuffled.length - 1]);
    		}
    	};

    	return [
    		selectedTiles,
    		preload_next,
    		preload_before,
    		goLeft,
    		goRight,
    		handleImageError,
    		tileset,
    		shuffled,
    		error_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		if (!document.getElementById("svelte-3f7w3q-style")) add_css();
    		init(this, options, instance, create_fragment, not_equal, { tileset: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
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
      const { name, url, image, description, id } = game;
      return { name, url, image, description, id, fit: "cover" }
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
