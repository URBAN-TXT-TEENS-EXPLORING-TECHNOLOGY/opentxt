import { ssrElement, escape, mergeProps, ssr, getRequestEvent, useAssets as useAssets$1, isServer, createComponent as createComponent$1, delegateEvents, ssrHydrationKey, NoHydration, Hydration, ssrAttribute, HydrationScript, renderToString, renderToStream } from "solid-js/web";
import { sharedConfig, onCleanup, lazy as lazy$1, getOwner, runWithOwner, createMemo, createSignal, createRenderEffect, on as on$1, useContext, createContext, startTransition, resetErrorBoundaries, batch, untrack, createComponent, children, Show, createRoot, Suspense, catchError, ErrorBoundary as ErrorBoundary$1 } from "solid-js";
import { Readable, PassThrough } from "node:stream";
import { provideRequestEvent } from "solid-js/web/storage";
const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _UNC_REGEX = /^[/\\]{2}/;
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
const normalize = function(path) {
  if (path.length === 0) {
    return ".";
  }
  path = normalizeWindowsPath(path);
  const isUNCPath = path.match(_UNC_REGEX);
  const isPathAbsolute = isAbsolute(path);
  const trailingSeparator = path[path.length - 1] === "/";
  path = normalizeString(path, !isPathAbsolute);
  if (path.length === 0) {
    if (isPathAbsolute) {
      return "/";
    }
    return trailingSeparator ? "./" : ".";
  }
  if (trailingSeparator) {
    path += "/";
  }
  if (_DRIVE_LETTER_RE.test(path)) {
    path += "/";
  }
  if (isUNCPath) {
    if (!isPathAbsolute) {
      return `//./${path}`;
    }
    return `//${path}`;
  }
  return isPathAbsolute && !isAbsolute(path) ? `/${path}` : path;
};
const join = function(...segments) {
  let path = "";
  for (const seg of segments) {
    if (!seg) {
      continue;
    }
    if (path.length > 0) {
      const pathTrailing = path[path.length - 1] === "/";
      const segLeading = seg[0] === "/";
      const both = pathTrailing && segLeading;
      if (both) {
        path += seg.slice(1);
      } else {
        path += pathTrailing || segLeading ? seg : `/${seg}`;
      }
    } else {
      path += seg;
    }
  }
  return normalize(path);
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ;
      else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p2) {
  return _IS_ABSOLUTE_RE.test(p2);
};
const clientViteManifest = { "_web-jsQWF9xa.js": { "file": "_build/assets/web-jsQWF9xa.js", "name": "web" }, "src/entry-client.tsx": { "file": "_build/assets/entry-client-D64kvB-G.js", "name": "entry-client", "src": "src/entry-client.tsx", "isEntry": true, "imports": ["_web-jsQWF9xa.js"], "dynamicImports": ["src/routes/chat.tsx?pick=default&pick=$css", "src/routes/chat.tsx?pick=default&pick=$css", "src/routes/index.tsx?pick=default&pick=$css", "src/routes/index.tsx?pick=default&pick=$css"] }, "src/routes/chat.tsx?pick=default&pick=$css": { "file": "_build/assets/chat-Cel_sIqe.js", "name": "chat", "src": "src/routes/chat.tsx?pick=default&pick=$css", "isEntry": true, "isDynamicEntry": true, "imports": ["_web-jsQWF9xa.js"], "css": ["_build/assets/chat-CXZN0zOc.css"] }, "src/routes/index.tsx?pick=default&pick=$css": { "file": "_build/assets/index-oRp-fOre.js", "name": "index", "src": "src/routes/index.tsx?pick=default&pick=$css", "isEntry": true, "isDynamicEntry": true, "imports": ["_web-jsQWF9xa.js"] } };
function getSsrProdManifest() {
  const viteManifest = clientViteManifest;
  return {
    path(id) {
      if (id.startsWith("./")) id = id.slice(2);
      const viteManifestEntry = clientViteManifest[
        id
        /*import.meta.env.START_CLIENT_ENTRY*/
      ];
      if (!viteManifestEntry) throw new Error(`No entry found in vite manifest for '${id}'`);
      return join("/", viteManifestEntry.file);
    },
    async getAssets(id) {
      if (id.startsWith("./")) id = id.slice(2);
      return createHtmlTagsForAssets(findAssetsInViteManifest(clientViteManifest, id));
    },
    async json() {
      const json = {};
      const entryKeys = Object.keys(viteManifest).filter((id) => viteManifest[id]?.isEntry || viteManifest[id]?.isDynamicEntry).map((id) => id);
      for (const entryKey of entryKeys) {
        json[entryKey] = {
          output: join("/", viteManifest[entryKey].file),
          assets: await this.getAssets(entryKey)
        };
      }
      return json;
    }
  };
}
function createHtmlTagsForAssets(assets) {
  return assets.filter((asset) => asset.endsWith(".css") || asset.endsWith(".js") || asset.endsWith(".ts") || asset.endsWith(".mjs")).map((asset) => ({
    tag: "link",
    attrs: {
      href: "/" + asset,
      key: asset,
      ...asset.endsWith(".css") ? {
        rel: "stylesheet"
      } : {
        rel: "modulepreload"
      }
    }
  }));
}
const entryId = "./src/entry-client.tsx".slice(2);
let entryImports = void 0;
function findAssetsInViteManifest(manifest, id, assetMap2 = /* @__PURE__ */ new Map(), stack = []) {
  if (stack.includes(id)) {
    return [];
  }
  const cached = assetMap2.get(id);
  if (cached) {
    return cached;
  }
  const chunk = manifest[id];
  if (!chunk) {
    return [];
  }
  if (!entryImports) {
    entryImports = [entryId, ...manifest[entryId]?.imports ?? []];
  }
  const excludeEntryImports = id !== entryId;
  const assets = chunk.css?.filter(Boolean) || [];
  if (chunk.imports) {
    stack.push(id);
    for (let i2 = 0, l2 = chunk.imports.length; i2 < l2; i2++) {
      const importId = chunk.imports[i2];
      if (!importId || excludeEntryImports && entryImports.includes(importId)) continue;
      assets.push(...findAssetsInViteManifest(manifest, importId, assetMap2, stack));
    }
    stack.pop();
  }
  assets.push(chunk.file);
  const all = Array.from(new Set(assets));
  assetMap2.set(id, all);
  return all;
}
function getSsrManifest(target) {
  return getSsrProdManifest();
}
var _tmpl$$3 = " ";
const assetMap = {
  style: (props) => ssrElement("style", props.attrs, () => props.children, true),
  link: (props) => ssrElement("link", props.attrs, void 0, true),
  script: (props) => {
    return props.attrs.src ? ssrElement("script", mergeProps(() => props.attrs, {
      get id() {
        return props.key;
      }
    }), () => ssr(_tmpl$$3), true) : null;
  },
  noscript: (props) => ssrElement("noscript", props.attrs, () => escape(props.children), true)
};
function renderAsset(asset, nonce) {
  let {
    tag,
    attrs: {
      key,
      ...attrs
    } = {
      key: void 0
    },
    children: children2
  } = asset;
  return assetMap[tag]({
    attrs: {
      ...attrs,
      nonce
    },
    key,
    children: children2
  });
}
const REGISTRY = /* @__PURE__ */ Symbol("assetRegistry");
const NOOP = () => "";
const keyAttrs = ["href", "rel", "data-vite-dev-id"];
const getEntity = (registry, asset) => {
  let key = asset.tag;
  for (const k2 of keyAttrs) {
    if (!(k2 in asset.attrs)) continue;
    key += `[${k2}='${asset.attrs[k2]}']`;
  }
  const entity = registry[key] ??= {
    key,
    consumers: 0
  };
  return entity;
};
const useAssets = (assets, nonce) => {
  if (!assets.length) return;
  const registry = getRequestEvent().locals[REGISTRY] ??= {};
  const ssrRequestAssets = sharedConfig.context?.assets;
  const cssKeys = [];
  for (const asset of assets) {
    const entity = getEntity(registry, asset);
    const isCSSLink = asset.tag === "link" && asset.attrs.rel === "stylesheet";
    const isCSS = isCSSLink || asset.tag === "style";
    if (isCSS) {
      cssKeys.push(entity.key);
    }
    entity.consumers++;
    if (entity.consumers > 1) continue;
    useAssets$1(() => renderAsset(asset, nonce));
    entity.ssrIdx = ssrRequestAssets.length - 1;
  }
  onCleanup(() => {
    for (const key of cssKeys) {
      const entity = registry[key];
      entity.consumers--;
      if (entity.consumers != 0) {
        continue;
      }
      ssrRequestAssets.splice(entity.ssrIdx, 1, NOOP);
      delete registry[key];
    }
  });
};
const assetsById = {};
const getAssets = async (id) => {
  if (assetsById[id]) return assetsById[id];
  const manifest = getSsrManifest();
  const assets = await manifest.getAssets(id);
  assetsById[id] = assets;
  return assets;
};
const withAssets = function(fn2) {
  const wrapper = async () => {
    const mod = await fn2();
    const id = mod.id$$;
    if (!id) return mod;
    if (!mod.default) {
      console.error(`Module ${id} does not export default`);
      return {
        default: () => []
      };
    }
    const assets = await getAssets(id);
    if (!assets.length) return mod;
    return {
      default: (props) => {
        const {
          nonce
        } = getRequestEvent();
        useAssets(assets, nonce);
        return mod.default(props);
      }
    };
  };
  return wrapper;
};
const lazy = !isServer ? lazy$1 : (fn2) => lazy$1(withAssets(fn2));
function createBeforeLeave() {
  let listeners = /* @__PURE__ */ new Set();
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  let ignore = false;
  function confirm(to2, options) {
    if (ignore) return !(ignore = false);
    const e = {
      to: to2,
      options,
      defaultPrevented: false,
      preventDefault: () => e.defaultPrevented = true
    };
    for (const l2 of listeners) l2.listener({
      ...e,
      from: l2.location,
      retry: (force) => {
        force && (ignore = true);
        l2.navigate(to2, {
          ...options,
          resolve: false
        });
      }
    });
    return !e.defaultPrevented;
  }
  return {
    subscribe,
    confirm
  };
}
let depth;
function saveCurrentDepth() {
  if (!window.history.state || window.history.state._depth == null) {
    window.history.replaceState({
      ...window.history.state,
      _depth: window.history.length - 1
    }, "");
  }
  depth = window.history.state._depth;
}
if (!isServer) {
  saveCurrentDepth();
}
function keepDepth(state) {
  return {
    ...state,
    _depth: window.history.state && window.history.state._depth
  };
}
function notifyIfNotBlocked(notify, block) {
  let ignore = false;
  return () => {
    const prevDepth = depth;
    saveCurrentDepth();
    const delta = prevDepth == null ? null : depth - prevDepth;
    if (ignore) {
      ignore = false;
      return;
    }
    if (delta && block(delta)) {
      ignore = true;
      window.history.go(-delta);
    } else {
      notify();
    }
  };
}
const hasSchemeRegex = /^(?:[a-z0-9]+:)?\/\//i;
const trimPathRegex = /^\/+|(\/)\/+$/g;
const mockBase = "http://sr";
function normalizePath(path, omitSlash = false) {
  const s = path.replace(trimPathRegex, "$1");
  return s ? omitSlash || /^[?#]/.test(s) ? s : "/" + s : "";
}
function resolvePath(base, path, from) {
  if (hasSchemeRegex.test(path)) {
    return void 0;
  }
  const basePath = normalizePath(base);
  const fromPath = from && normalizePath(from);
  let result = "";
  if (!fromPath || path.startsWith("/")) {
    result = basePath;
  } else if (fromPath.toLowerCase().indexOf(basePath.toLowerCase()) !== 0) {
    result = basePath + fromPath;
  } else {
    result = fromPath;
  }
  return (result || "/") + normalizePath(path, !result);
}
function joinPaths(from, to2) {
  return normalizePath(from).replace(/\/*(\*.*)?$/g, "") + normalizePath(to2);
}
function extractSearchParams(url) {
  const params = {};
  url.searchParams.forEach((value, key) => {
    if (key in params) {
      if (Array.isArray(params[key])) params[key].push(value);
      else params[key] = [params[key], value];
    } else params[key] = value;
  });
  return params;
}
function createMatcher$1(path, partial, matchFilters) {
  const [pattern, splat] = path.split("/*", 2);
  const segments = pattern.split("/").filter(Boolean);
  const len = segments.length;
  return (location) => {
    const locSegments = location.split("/").filter(Boolean);
    const lenDiff = locSegments.length - len;
    if (lenDiff < 0 || lenDiff > 0 && splat === void 0 && !partial) {
      return null;
    }
    const match = {
      path: len ? "" : "/",
      params: {}
    };
    const matchFilter = (s) => matchFilters === void 0 ? void 0 : matchFilters[s];
    for (let i2 = 0; i2 < len; i2++) {
      const segment = segments[i2];
      const dynamic = segment[0] === ":";
      const locSegment = dynamic ? locSegments[i2] : locSegments[i2].toLowerCase();
      const key = dynamic ? segment.slice(1) : segment.toLowerCase();
      if (dynamic && matchSegment(locSegment, matchFilter(key))) {
        match.params[key] = locSegment;
      } else if (dynamic || !matchSegment(locSegment, key)) {
        return null;
      }
      match.path += `/${locSegment}`;
    }
    if (splat) {
      const remainder = lenDiff ? locSegments.slice(-lenDiff).join("/") : "";
      if (matchSegment(remainder, matchFilter(splat))) {
        match.params[splat] = remainder;
      } else {
        return null;
      }
    }
    return match;
  };
}
function matchSegment(input, filter) {
  const isEqual = (s) => s === input;
  if (filter === void 0) {
    return true;
  } else if (typeof filter === "string") {
    return isEqual(filter);
  } else if (typeof filter === "function") {
    return filter(input);
  } else if (Array.isArray(filter)) {
    return filter.some(isEqual);
  } else if (filter instanceof RegExp) {
    return filter.test(input);
  }
  return false;
}
function scoreRoute(route) {
  const [pattern, splat] = route.pattern.split("/*", 2);
  const segments = pattern.split("/").filter(Boolean);
  return segments.reduce((score, segment) => score + (segment.startsWith(":") ? 2 : 3), segments.length - (splat === void 0 ? 0 : 1));
}
function createMemoObject(fn2) {
  const map = /* @__PURE__ */ new Map();
  const owner = getOwner();
  return new Proxy({}, {
    get(_2, property) {
      if (!map.has(property)) {
        runWithOwner(owner, () => map.set(property, createMemo(() => fn2()[property])));
      }
      return map.get(property)();
    },
    getOwnPropertyDescriptor() {
      return {
        enumerable: true,
        configurable: true
      };
    },
    ownKeys() {
      return Reflect.ownKeys(fn2());
    },
    has(_2, property) {
      return property in fn2();
    }
  });
}
function expandOptionals(pattern) {
  let match = /(\/?\:[^\/]+)\?/.exec(pattern);
  if (!match) return [pattern];
  let prefix = pattern.slice(0, match.index);
  let suffix = pattern.slice(match.index + match[0].length);
  const prefixes = [prefix, prefix += match[1]];
  while (match = /^(\/\:[^\/]+)\?/.exec(suffix)) {
    prefixes.push(prefix += match[1]);
    suffix = suffix.slice(match[0].length);
  }
  return expandOptionals(suffix).reduce((results, expansion) => [...results, ...prefixes.map((p2) => p2 + expansion)], []);
}
const MAX_REDIRECTS = 100;
const RouterContextObj = createContext();
const RouteContextObj = createContext();
function createRoutes$1(routeDef, base = "") {
  const {
    component,
    preload,
    load,
    children: children2,
    info
  } = routeDef;
  const isLeaf = !children2 || Array.isArray(children2) && !children2.length;
  const shared = {
    key: routeDef,
    component,
    preload: preload || load,
    info
  };
  return asArray(routeDef.path).reduce((acc, originalPath) => {
    for (const expandedPath of expandOptionals(originalPath)) {
      const path = joinPaths(base, expandedPath);
      let pattern = isLeaf ? path : path.split("/*", 1)[0];
      pattern = pattern.split("/").map((s) => {
        return s.startsWith(":") || s.startsWith("*") ? s : encodeURIComponent(s);
      }).join("/");
      acc.push({
        ...shared,
        originalPath,
        pattern,
        matcher: createMatcher$1(pattern, !isLeaf, routeDef.matchFilters)
      });
    }
    return acc;
  }, []);
}
function createBranch(routes2, index = 0) {
  return {
    routes: routes2,
    score: scoreRoute(routes2[routes2.length - 1]) * 1e4 - index,
    matcher(location) {
      const matches = [];
      for (let i2 = routes2.length - 1; i2 >= 0; i2--) {
        const route = routes2[i2];
        const match = route.matcher(location);
        if (!match) {
          return null;
        }
        matches.unshift({
          ...match,
          route
        });
      }
      return matches;
    }
  };
}
function asArray(value) {
  return Array.isArray(value) ? value : [value];
}
function createBranches(routeDef, base = "", stack = [], branches = []) {
  const routeDefs = asArray(routeDef);
  for (let i2 = 0, len = routeDefs.length; i2 < len; i2++) {
    const def = routeDefs[i2];
    if (def && typeof def === "object") {
      if (!def.hasOwnProperty("path")) def.path = "";
      const routes2 = createRoutes$1(def, base);
      for (const route of routes2) {
        stack.push(route);
        const isEmptyArray = Array.isArray(def.children) && def.children.length === 0;
        if (def.children && !isEmptyArray) {
          createBranches(def.children, route.pattern, stack, branches);
        } else {
          const branch = createBranch([...stack], branches.length);
          branches.push(branch);
        }
        stack.pop();
      }
    }
  }
  return stack.length ? branches : branches.sort((a, b2) => b2.score - a.score);
}
function getRouteMatches(branches, location) {
  for (let i2 = 0, len = branches.length; i2 < len; i2++) {
    const match = branches[i2].matcher(location);
    if (match) {
      return match;
    }
  }
  return [];
}
function createLocation(path, state, queryWrapper) {
  const origin = new URL(mockBase);
  const url = createMemo((prev) => {
    const path_ = path();
    try {
      return new URL(path_, origin);
    } catch (err) {
      console.error(`Invalid path ${path_}`);
      return prev;
    }
  }, origin, {
    equals: (a, b2) => a.href === b2.href
  });
  const pathname = createMemo(() => url().pathname);
  const search = createMemo(() => url().search, true);
  const hash = createMemo(() => url().hash);
  const key = () => "";
  const queryFn = on$1(search, () => extractSearchParams(url()));
  return {
    get pathname() {
      return pathname();
    },
    get search() {
      return search();
    },
    get hash() {
      return hash();
    },
    get state() {
      return state();
    },
    get key() {
      return key();
    },
    query: queryWrapper ? queryWrapper(queryFn) : createMemoObject(queryFn)
  };
}
let intent;
function getIntent() {
  return intent;
}
function createRouterContext(integration, branches, getContext, options = {}) {
  const {
    signal: [source, setSource],
    utils = {}
  } = integration;
  const parsePath = utils.parsePath || ((p2) => p2);
  const renderPath = utils.renderPath || ((p2) => p2);
  const beforeLeave = utils.beforeLeave || createBeforeLeave();
  const basePath = resolvePath("", options.base || "");
  if (basePath === void 0) {
    throw new Error(`${basePath} is not a valid base path`);
  } else if (basePath && !source().value) {
    setSource({
      value: basePath,
      replace: true,
      scroll: false
    });
  }
  const [isRouting, setIsRouting] = createSignal(false);
  let lastTransitionTarget;
  const transition = (newIntent, newTarget) => {
    if (newTarget.value === reference() && newTarget.state === state()) return;
    if (lastTransitionTarget === void 0) setIsRouting(true);
    intent = newIntent;
    lastTransitionTarget = newTarget;
    startTransition(() => {
      if (lastTransitionTarget !== newTarget) return;
      setReference(lastTransitionTarget.value);
      setState(lastTransitionTarget.state);
      resetErrorBoundaries();
      if (!isServer) submissions[1]((subs) => subs.filter((s) => s.pending));
    }).finally(() => {
      if (lastTransitionTarget !== newTarget) return;
      batch(() => {
        intent = void 0;
        if (newIntent === "navigate") navigateEnd(lastTransitionTarget);
        setIsRouting(false);
        lastTransitionTarget = void 0;
      });
    });
  };
  const [reference, setReference] = createSignal(source().value);
  const [state, setState] = createSignal(source().state);
  const location = createLocation(reference, state, utils.queryWrapper);
  const referrers = [];
  const submissions = createSignal(isServer ? initFromFlash2() : []);
  const matches = createMemo(() => {
    if (typeof options.transformUrl === "function") {
      return getRouteMatches(branches(), options.transformUrl(location.pathname));
    }
    return getRouteMatches(branches(), location.pathname);
  });
  const buildParams = () => {
    const m2 = matches();
    const params2 = {};
    for (let i2 = 0; i2 < m2.length; i2++) {
      Object.assign(params2, m2[i2].params);
    }
    return params2;
  };
  const params = utils.paramsWrapper ? utils.paramsWrapper(buildParams, branches) : createMemoObject(buildParams);
  const baseRoute = {
    pattern: basePath,
    path: () => basePath,
    outlet: () => null,
    resolvePath(to2) {
      return resolvePath(basePath, to2);
    }
  };
  createRenderEffect(on$1(source, (source2) => transition("native", source2), {
    defer: true
  }));
  return {
    base: baseRoute,
    location,
    params,
    isRouting,
    renderPath,
    parsePath,
    navigatorFactory,
    matches,
    beforeLeave,
    preloadRoute,
    singleFlight: options.singleFlight === void 0 ? true : options.singleFlight,
    submissions
  };
  function navigateFromRoute(route, to2, options2) {
    untrack(() => {
      if (typeof to2 === "number") {
        if (!to2) ;
        else if (utils.go) {
          utils.go(to2);
        } else {
          console.warn("Router integration does not support relative routing");
        }
        return;
      }
      const queryOnly = !to2 || to2[0] === "?";
      const {
        replace,
        resolve,
        scroll,
        state: nextState
      } = {
        replace: false,
        resolve: !queryOnly,
        scroll: true,
        ...options2
      };
      const resolvedTo = resolve ? route.resolvePath(to2) : resolvePath(queryOnly && location.pathname || "", to2);
      if (resolvedTo === void 0) {
        throw new Error(`Path '${to2}' is not a routable path`);
      } else if (referrers.length >= MAX_REDIRECTS) {
        throw new Error("Too many redirects");
      }
      const current = reference();
      if (resolvedTo !== current || nextState !== state()) {
        if (isServer) {
          const e = getRequestEvent();
          e && (e.response = {
            status: 302,
            headers: new Headers({
              Location: resolvedTo
            })
          });
          setSource({
            value: resolvedTo,
            replace,
            scroll,
            state: nextState
          });
        } else if (beforeLeave.confirm(resolvedTo, options2)) {
          referrers.push({
            value: current,
            replace,
            scroll,
            state: state()
          });
          transition("navigate", {
            value: resolvedTo,
            state: nextState
          });
        }
      }
    });
  }
  function navigatorFactory(route) {
    route = route || useContext(RouteContextObj) || baseRoute;
    return (to2, options2) => navigateFromRoute(route, to2, options2);
  }
  function navigateEnd(next) {
    const first = referrers[0];
    if (first) {
      setSource({
        ...next,
        replace: first.replace,
        scroll: first.scroll
      });
      referrers.length = 0;
    }
  }
  function preloadRoute(url, preloadData) {
    const matches2 = getRouteMatches(branches(), url.pathname);
    const prevIntent = intent;
    intent = "preload";
    for (let match in matches2) {
      const {
        route,
        params: params2
      } = matches2[match];
      route.component && route.component.preload && route.component.preload();
      const {
        preload
      } = route;
      preloadData && preload && runWithOwner(getContext(), () => preload({
        params: params2,
        location: {
          pathname: url.pathname,
          search: url.search,
          hash: url.hash,
          query: extractSearchParams(url),
          state: null,
          key: ""
        },
        intent: "preload"
      }));
    }
    intent = prevIntent;
  }
  function initFromFlash2() {
    const e = getRequestEvent();
    return e && e.router && e.router.submission ? [e.router.submission] : [];
  }
}
function createRouteContext(router2, parent, outlet, match) {
  const {
    base,
    location,
    params
  } = router2;
  const {
    pattern,
    component,
    preload
  } = match().route;
  const path = createMemo(() => match().path);
  component && component.preload && component.preload();
  const data = preload ? preload({
    params,
    location,
    intent: intent || "initial"
  }) : void 0;
  const route = {
    parent,
    pattern,
    path,
    outlet: () => component ? createComponent(component, {
      params,
      location,
      data,
      get children() {
        return outlet();
      }
    }) : outlet(),
    resolvePath(to2) {
      return resolvePath(base.path(), to2, path());
    }
  };
  return route;
}
const createRouterComponent = (router2) => (props) => {
  const {
    base
  } = props;
  const routeDefs = children(() => props.children);
  const branches = createMemo(() => createBranches(routeDefs(), props.base || ""));
  let context;
  const routerState = createRouterContext(router2, branches, () => context, {
    base,
    singleFlight: props.singleFlight,
    transformUrl: props.transformUrl
  });
  router2.create && router2.create(routerState);
  return createComponent$1(RouterContextObj.Provider, {
    value: routerState,
    get children() {
      return createComponent$1(Root, {
        routerState,
        get root() {
          return props.root;
        },
        get preload() {
          return props.rootPreload || props.rootLoad;
        },
        get children() {
          return [(context = getOwner()) && null, createComponent$1(Routes, {
            routerState,
            get branches() {
              return branches();
            }
          })];
        }
      });
    }
  });
};
function Root(props) {
  const location = props.routerState.location;
  const params = props.routerState.params;
  const data = createMemo(() => props.preload && untrack(() => {
    props.preload({
      params,
      location,
      intent: getIntent() || "initial"
    });
  }));
  return createComponent$1(Show, {
    get when() {
      return props.root;
    },
    keyed: true,
    get fallback() {
      return props.children;
    },
    children: (Root2) => createComponent$1(Root2, {
      params,
      location,
      get data() {
        return data();
      },
      get children() {
        return props.children;
      }
    })
  });
}
function Routes(props) {
  if (isServer) {
    const e = getRequestEvent();
    if (e && e.router && e.router.dataOnly) {
      dataOnly(e, props.routerState, props.branches);
      return;
    }
    e && ((e.router || (e.router = {})).matches || (e.router.matches = props.routerState.matches().map(({
      route,
      path,
      params
    }) => ({
      path: route.originalPath,
      pattern: route.pattern,
      match: path,
      params,
      info: route.info
    }))));
  }
  const disposers = [];
  let root;
  const routeStates = createMemo(on$1(props.routerState.matches, (nextMatches, prevMatches, prev) => {
    let equal = prevMatches && nextMatches.length === prevMatches.length;
    const next = [];
    for (let i2 = 0, len = nextMatches.length; i2 < len; i2++) {
      const prevMatch = prevMatches && prevMatches[i2];
      const nextMatch = nextMatches[i2];
      if (prev && prevMatch && nextMatch.route.key === prevMatch.route.key) {
        next[i2] = prev[i2];
      } else {
        equal = false;
        if (disposers[i2]) {
          disposers[i2]();
        }
        createRoot((dispose) => {
          disposers[i2] = dispose;
          next[i2] = createRouteContext(props.routerState, next[i2 - 1] || props.routerState.base, createOutlet(() => routeStates()[i2 + 1]), () => {
            const routeMatches = props.routerState.matches();
            return routeMatches[i2] ?? routeMatches[0];
          });
        });
      }
    }
    disposers.splice(nextMatches.length).forEach((dispose) => dispose());
    if (prev && equal) {
      return prev;
    }
    root = next[0];
    return next;
  }));
  return createOutlet(() => routeStates() && root)();
}
const createOutlet = (child) => {
  return () => createComponent$1(Show, {
    get when() {
      return child();
    },
    keyed: true,
    children: (child2) => createComponent$1(RouteContextObj.Provider, {
      value: child2,
      get children() {
        return child2.outlet();
      }
    })
  });
};
function dataOnly(event, routerState, branches) {
  const url = new URL(event.request.url);
  const prevMatches = getRouteMatches(branches, new URL(event.router.previousUrl || event.request.url).pathname);
  const matches = getRouteMatches(branches, url.pathname);
  for (let match = 0; match < matches.length; match++) {
    if (!prevMatches[match] || matches[match].route !== prevMatches[match].route) event.router.dataOnly = true;
    const {
      route,
      params
    } = matches[match];
    route.preload && route.preload({
      params,
      location: routerState.location,
      intent: "preload"
    });
  }
}
function intercept([value, setValue], get, set) {
  return [value, set ? (v2) => setValue(set(v2)) : setValue];
}
function createRouter$2(config) {
  let ignore = false;
  const wrap = (value) => typeof value === "string" ? {
    value
  } : value;
  const signal = intercept(createSignal(wrap(config.get()), {
    equals: (a, b2) => a.value === b2.value && a.state === b2.state
  }), void 0, (next) => {
    !ignore && config.set(next);
    if (sharedConfig.registry && !sharedConfig.done) sharedConfig.done = true;
    return next;
  });
  config.init && onCleanup(config.init((value = config.get()) => {
    ignore = true;
    signal[1](wrap(value));
    ignore = false;
  }));
  return createRouterComponent({
    signal,
    create: config.create,
    utils: config.utils
  });
}
function bindEvent(target, type, handler) {
  target.addEventListener(type, handler);
  return () => target.removeEventListener(type, handler);
}
function scrollToHash(hash, fallbackTop) {
  const el = hash && document.getElementById(hash);
  if (el) {
    el.scrollIntoView();
  } else if (fallbackTop) {
    window.scrollTo(0, 0);
  }
}
function getPath(url) {
  const u2 = new URL(url);
  return u2.pathname + u2.search;
}
function StaticRouter(props) {
  let e;
  const obj = {
    value: props.url || (e = getRequestEvent()) && getPath(e.request.url) || ""
  };
  return createRouterComponent({
    signal: [() => obj, (next) => Object.assign(obj, next)]
  })(props);
}
const actions = /* @__PURE__ */ new Map();
function setupNativeEvents({
  preload = true,
  explicitLinks = false,
  actionBase = "/_server",
  transformUrl
} = {}) {
  return (router2) => {
    const basePath = router2.base.path();
    const navigateFromRoute = router2.navigatorFactory(router2.base);
    let preloadTimeout;
    let lastElement;
    function isSvg(el) {
      return el.namespaceURI === "http://www.w3.org/2000/svg";
    }
    function handleAnchor(evt) {
      if (evt.defaultPrevented || evt.button !== 0 || evt.metaKey || evt.altKey || evt.ctrlKey || evt.shiftKey) return;
      const a = evt.composedPath().find((el) => el instanceof Node && el.nodeName.toUpperCase() === "A");
      if (!a || explicitLinks && !a.hasAttribute("link")) return;
      const svg = isSvg(a);
      const href = svg ? a.href.baseVal : a.href;
      const target = svg ? a.target.baseVal : a.target;
      if (target || !href && !a.hasAttribute("state")) return;
      const rel = (a.getAttribute("rel") || "").split(/\s+/);
      if (a.hasAttribute("download") || rel && rel.includes("external")) return;
      const url = svg ? new URL(href, document.baseURI) : new URL(href);
      if (url.origin !== window.location.origin || basePath && url.pathname && !url.pathname.toLowerCase().startsWith(basePath.toLowerCase())) return;
      return [a, url];
    }
    function handleAnchorClick(evt) {
      const res = handleAnchor(evt);
      if (!res) return;
      const [a, url] = res;
      const to2 = router2.parsePath(url.pathname + url.search + url.hash);
      const state = a.getAttribute("state");
      evt.preventDefault();
      navigateFromRoute(to2, {
        resolve: false,
        replace: a.hasAttribute("replace"),
        scroll: !a.hasAttribute("noscroll"),
        state: state ? JSON.parse(state) : void 0
      });
    }
    function handleAnchorPreload(evt) {
      const res = handleAnchor(evt);
      if (!res) return;
      const [a, url] = res;
      transformUrl && (url.pathname = transformUrl(url.pathname));
      router2.preloadRoute(url, a.getAttribute("preload") !== "false");
    }
    function handleAnchorMove(evt) {
      clearTimeout(preloadTimeout);
      const res = handleAnchor(evt);
      if (!res) return lastElement = null;
      const [a, url] = res;
      if (lastElement === a) return;
      transformUrl && (url.pathname = transformUrl(url.pathname));
      preloadTimeout = setTimeout(() => {
        router2.preloadRoute(url, a.getAttribute("preload") !== "false");
        lastElement = a;
      }, 20);
    }
    function handleFormSubmit(evt) {
      if (evt.defaultPrevented) return;
      let actionRef = evt.submitter && evt.submitter.hasAttribute("formaction") ? evt.submitter.getAttribute("formaction") : evt.target.getAttribute("action");
      if (!actionRef) return;
      if (!actionRef.startsWith("https://action/")) {
        const url = new URL(actionRef, mockBase);
        actionRef = router2.parsePath(url.pathname + url.search);
        if (!actionRef.startsWith(actionBase)) return;
      }
      if (evt.target.method.toUpperCase() !== "POST") throw new Error("Only POST forms are supported for Actions");
      const handler = actions.get(actionRef);
      if (handler) {
        evt.preventDefault();
        const data = new FormData(evt.target, evt.submitter);
        handler.call({
          r: router2,
          f: evt.target
        }, evt.target.enctype === "multipart/form-data" ? data : new URLSearchParams(data));
      }
    }
    delegateEvents(["click", "submit"]);
    document.addEventListener("click", handleAnchorClick);
    if (preload) {
      document.addEventListener("mousemove", handleAnchorMove, {
        passive: true
      });
      document.addEventListener("focusin", handleAnchorPreload, {
        passive: true
      });
      document.addEventListener("touchstart", handleAnchorPreload, {
        passive: true
      });
    }
    document.addEventListener("submit", handleFormSubmit);
    onCleanup(() => {
      document.removeEventListener("click", handleAnchorClick);
      if (preload) {
        document.removeEventListener("mousemove", handleAnchorMove);
        document.removeEventListener("focusin", handleAnchorPreload);
        document.removeEventListener("touchstart", handleAnchorPreload);
      }
      document.removeEventListener("submit", handleFormSubmit);
    });
  };
}
function Router(props) {
  if (isServer) return StaticRouter(props);
  const getSource = () => {
    const url = window.location.pathname.replace(/^\/+/, "/") + window.location.search;
    const state = window.history.state && window.history.state._depth && Object.keys(window.history.state).length === 1 ? void 0 : window.history.state;
    return {
      value: url + window.location.hash,
      state
    };
  };
  const beforeLeave = createBeforeLeave();
  return createRouter$2({
    get: getSource,
    set({
      value,
      replace,
      scroll,
      state
    }) {
      if (replace) {
        window.history.replaceState(keepDepth(state), "", value);
      } else {
        window.history.pushState(state, "", value);
      }
      scrollToHash(decodeURIComponent(window.location.hash.slice(1)), scroll);
      saveCurrentDepth();
    },
    init: (notify) => bindEvent(window, "popstate", notifyIfNotBlocked(notify, (delta) => {
      if (delta) {
        return !beforeLeave.confirm(delta);
      } else {
        const s = getSource();
        return !beforeLeave.confirm(s.value, {
          state: s.state
        });
      }
    })),
    create: setupNativeEvents({
      preload: props.preload,
      explicitLinks: props.explicitLinks,
      actionBase: props.actionBase,
      transformUrl: props.transformUrl
    }),
    utils: {
      go: (delta) => window.history.go(delta),
      beforeLeave
    }
  })(props);
}
const fileRoutes = [{ "page": true, "$component": { "src": "src/routes/chat.tsx?pick=default&pick=$css", "build": () => import("./_build/assets/chat-DQT2yb3F.js"), "import": () => import("./_build/assets/chat-DQT2yb3F.js") }, "path": "/chat" }, { "page": true, "$component": { "src": "src/routes/index.tsx?pick=default&pick=$css", "build": () => import("./_build/assets/index-dhXWkRjL.js"), "import": () => import("./_build/assets/index-dhXWkRjL.js") }, "path": "/" }, { "page": false, "$POST": { "src": "src/routes/api/chat.ts?pick=POST", "build": () => import("./_build/assets/chat-NKo_y1Ve.js"), "import": () => import("./_build/assets/chat-NKo_y1Ve.js") }, "path": "/api/chat" }, { "page": false, "$GET": { "src": "src/routes/api/history.ts?pick=GET", "build": () => import("./_build/assets/history-BewlOGEg.js"), "import": () => import("./_build/assets/history-BewlOGEg.js") }, "$HEAD": { "src": "src/routes/api/history.ts?pick=GET", "build": () => import("./_build/assets/history-BewlOGEg.js"), "import": () => import("./_build/assets/history-BewlOGEg.js") }, "path": "/api/history" }, { "page": false, "$GET": { "src": "src/routes/api/models.ts?pick=GET", "build": () => import("./_build/assets/models-Bq2ZPceR.js"), "import": () => import("./_build/assets/models-Bq2ZPceR.js") }, "$HEAD": { "src": "src/routes/api/models.ts?pick=GET", "build": () => import("./_build/assets/models-Bq2ZPceR.js"), "import": () => import("./_build/assets/models-Bq2ZPceR.js") }, "path": "/api/models" }, { "page": false, "$POST": { "src": "src/routes/api/stt.ts?pick=POST", "build": () => import("./_build/assets/stt-ChVhFHD4.js"), "import": () => import("./_build/assets/stt-ChVhFHD4.js") }, "path": "/api/stt" }, { "page": false, "$GET": { "src": "src/routes/m/[id].ts?pick=GET", "build": () => import("./_build/assets/_id_-Bysdw5Zx.js"), "import": () => import("./_build/assets/_id_-Bysdw5Zx.js") }, "$HEAD": { "src": "src/routes/m/[id].ts?pick=GET", "build": () => import("./_build/assets/_id_-Bysdw5Zx.js"), "import": () => import("./_build/assets/_id_-Bysdw5Zx.js") }, "path": "/m/:id" }, { "page": false, "$POST": { "src": "src/routes/api/auth/register.ts?pick=POST", "build": () => import("./_build/assets/register-DCMEBi34.js"), "import": () => import("./_build/assets/register-DCMEBi34.js") }, "path": "/api/auth/register" }, { "page": false, "$POST": { "src": "src/routes/api/auth/token.ts?pick=POST", "build": () => import("./_build/assets/token-Bz_MHRSh.js"), "import": () => import("./_build/assets/token-Bz_MHRSh.js") }, "path": "/api/auth/token" }, { "page": false, "$DELETE": { "src": "src/routes/api/chat/[id].ts?pick=DELETE", "build": () => import("./_build/assets/_id_-DY6sIlR3.js"), "import": () => import("./_build/assets/_id_-DY6sIlR3.js") }, "$GET": { "src": "src/routes/api/chat/[id].ts?pick=GET", "build": () => import("./_build/assets/_id_-B9nP8DDN.js"), "import": () => import("./_build/assets/_id_-B9nP8DDN.js") }, "$HEAD": { "src": "src/routes/api/chat/[id].ts?pick=GET", "build": () => import("./_build/assets/_id_-B9nP8DDN.js"), "import": () => import("./_build/assets/_id_-B9nP8DDN.js") }, "path": "/api/chat/:id" }, { "page": false, "$POST": { "src": "src/routes/api/files/upload.ts?pick=POST", "build": () => import("./_build/assets/upload-IIfmwVXE.js"), "import": () => import("./_build/assets/upload-IIfmwVXE.js") }, "path": "/api/files/upload" }, { "page": false, "$POST": { "src": "src/routes/api/voice/livekit.ts?pick=POST", "build": () => import("./_build/assets/livekit-41xfhw3d.js"), "import": () => import("./_build/assets/livekit-41xfhw3d.js") }, "path": "/api/voice/livekit" }, { "page": false, "$POST": { "src": "src/routes/api/voice/realtime.ts?pick=POST", "build": () => import("./_build/assets/realtime-DjPptrU8.js"), "import": () => import("./_build/assets/realtime-DjPptrU8.js") }, "path": "/api/voice/realtime" }];
const NODE_TYPES = {
  NORMAL: 0,
  WILDCARD: 1,
  PLACEHOLDER: 2
};
function createRouter$1(options = {}) {
  const ctx = {
    options,
    rootNode: createRadixNode(),
    staticRoutesMap: {}
  };
  const normalizeTrailingSlash = (p2) => options.strictTrailingSlash ? p2 : p2.replace(/\/$/, "") || "/";
  if (options.routes) {
    for (const path in options.routes) {
      insert(ctx, normalizeTrailingSlash(path), options.routes[path]);
    }
  }
  return {
    ctx,
    lookup: (path) => lookup(ctx, normalizeTrailingSlash(path)),
    insert: (path, data) => insert(ctx, normalizeTrailingSlash(path), data),
    remove: (path) => remove(ctx, normalizeTrailingSlash(path))
  };
}
function lookup(ctx, path) {
  const staticPathNode = ctx.staticRoutesMap[path];
  if (staticPathNode) {
    return staticPathNode.data;
  }
  const sections = path.split("/");
  const params = {};
  let paramsFound = false;
  let wildcardNode = null;
  let node = ctx.rootNode;
  let wildCardParam = null;
  for (let i2 = 0; i2 < sections.length; i2++) {
    const section = sections[i2];
    if (node.wildcardChildNode !== null) {
      wildcardNode = node.wildcardChildNode;
      wildCardParam = sections.slice(i2).join("/");
    }
    const nextNode = node.children.get(section);
    if (nextNode === void 0) {
      if (node && node.placeholderChildren.length > 1) {
        const remaining = sections.length - i2;
        node = node.placeholderChildren.find((c2) => c2.maxDepth === remaining) || null;
      } else {
        node = node.placeholderChildren[0] || null;
      }
      if (!node) {
        break;
      }
      if (node.paramName) {
        params[node.paramName] = section;
      }
      paramsFound = true;
    } else {
      node = nextNode;
    }
  }
  if ((node === null || node.data === null) && wildcardNode !== null) {
    node = wildcardNode;
    params[node.paramName || "_"] = wildCardParam;
    paramsFound = true;
  }
  if (!node) {
    return null;
  }
  if (paramsFound) {
    return {
      ...node.data,
      params: paramsFound ? params : void 0
    };
  }
  return node.data;
}
function insert(ctx, path, data) {
  let isStaticRoute = true;
  const sections = path.split("/");
  let node = ctx.rootNode;
  let _unnamedPlaceholderCtr = 0;
  const matchedNodes = [node];
  for (const section of sections) {
    let childNode;
    if (childNode = node.children.get(section)) {
      node = childNode;
    } else {
      const type = getNodeType(section);
      childNode = createRadixNode({ type, parent: node });
      node.children.set(section, childNode);
      if (type === NODE_TYPES.PLACEHOLDER) {
        childNode.paramName = section === "*" ? `_${_unnamedPlaceholderCtr++}` : section.slice(1);
        node.placeholderChildren.push(childNode);
        isStaticRoute = false;
      } else if (type === NODE_TYPES.WILDCARD) {
        node.wildcardChildNode = childNode;
        childNode.paramName = section.slice(
          3
          /* "**:" */
        ) || "_";
        isStaticRoute = false;
      }
      matchedNodes.push(childNode);
      node = childNode;
    }
  }
  for (const [depth2, node2] of matchedNodes.entries()) {
    node2.maxDepth = Math.max(matchedNodes.length - depth2, node2.maxDepth || 0);
  }
  node.data = data;
  if (isStaticRoute === true) {
    ctx.staticRoutesMap[path] = node;
  }
  return node;
}
function remove(ctx, path) {
  let success = false;
  const sections = path.split("/");
  let node = ctx.rootNode;
  for (const section of sections) {
    node = node.children.get(section);
    if (!node) {
      return success;
    }
  }
  if (node.data) {
    const lastSection = sections.at(-1) || "";
    node.data = null;
    if (Object.keys(node.children).length === 0 && node.parent) {
      node.parent.children.delete(lastSection);
      node.parent.wildcardChildNode = null;
      node.parent.placeholderChildren = [];
    }
    success = true;
  }
  return success;
}
function createRadixNode(options = {}) {
  return {
    type: options.type || NODE_TYPES.NORMAL,
    maxDepth: 0,
    parent: options.parent || null,
    children: /* @__PURE__ */ new Map(),
    data: options.data || null,
    paramName: options.paramName || null,
    wildcardChildNode: null,
    placeholderChildren: []
  };
}
function getNodeType(str) {
  if (str.startsWith("**")) {
    return NODE_TYPES.WILDCARD;
  }
  if (str[0] === ":" || str === "*") {
    return NODE_TYPES.PLACEHOLDER;
  }
  return NODE_TYPES.NORMAL;
}
const pageRoutes = defineRoutes(fileRoutes.filter((o2) => o2.page));
function defineRoutes(fileRoutes2) {
  function processRoute(routes2, route, id, full) {
    const parentRoute = Object.values(routes2).find((o2) => {
      return id.startsWith(o2.id + "/");
    });
    if (!parentRoute) {
      routes2.push({
        ...route,
        id,
        path: id.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/")
      });
      return routes2;
    }
    processRoute(parentRoute.children || (parentRoute.children = []), route, id.slice(parentRoute.id.length));
    return routes2;
  }
  return fileRoutes2.sort((a, b2) => a.path.length - b2.path.length).reduce((prevRoutes, route) => {
    return processRoute(prevRoutes, route, route.path, route.path);
  }, []);
}
const router = createRouter$1({
  routes: fileRoutes.reduce((memo, route) => {
    if (!containsHTTP(route)) return memo;
    const path = route.path.replace(/\([^)/]+\)/g, "").replace(/\/+/g, "/").replace(/\*([^/]*)/g, (_2, m2) => `**:${m2}`).split("/").map((s) => s.startsWith(":") || s.startsWith("*") ? s : encodeURIComponent(s)).join("/");
    if (/:[^/]*\?/g.test(path)) {
      throw new Error(`Optional parameters are not supported in API routes: ${path}`);
    }
    if (memo[path]) {
      throw new Error(`Duplicate API routes for "${path}" found at "${memo[path].route.path}" and "${route.path}"`);
    }
    memo[path] = {
      route
    };
    return memo;
  }, {})
});
function containsHTTP(route) {
  return route["$HEAD"] || route["$GET"] || route["$POST"] || route["$PUT"] || route["$PATCH"] || route["$DELETE"];
}
function matchAPIRoute(path, method) {
  const match = router.lookup(path);
  if (match && match.route) {
    const route = match.route;
    const handler = method === "HEAD" ? route.$HEAD || route.$GET : route[`$${method}`];
    if (handler === void 0) return;
    const isPage = route.page === true && route.$component !== void 0;
    return {
      handler,
      params: match.params,
      isPage
    };
  }
  return void 0;
}
const components = {};
function createRoutes() {
  function createRoute(route) {
    const component = route.$component && (components[route.$component.src] ??= lazy(route.$component.import));
    return {
      ...route,
      ...route.$$route ? route.$$route.require().route : void 0,
      info: {
        ...route.$$route ? route.$$route.require().route.info : {},
        filesystem: true
      },
      component,
      children: route.children ? route.children.map(createRoute) : void 0
    };
  }
  const routes2 = pageRoutes.map(createRoute);
  return routes2;
}
let routes;
const FileRoutes = isServer ? () => getRequestEvent().routes : () => routes || (routes = createRoutes());
function App$1() {
  return createComponent$1(Router, {
    root: (props) => createComponent$1(Suspense, {
      get children() {
        return props.children;
      }
    }),
    get children() {
      return createComponent$1(FileRoutes, {});
    }
  });
}
const app = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: App$1
}, Symbol.toStringTag, { value: "Module" }));
const HttpStatusCode = isServer ? (props) => {
  const event = getRequestEvent();
  event.response.status = props.code;
  event.response.statusText = props.text;
  onCleanup(() => (
    // !event.nativeEvent.handled &&
    !event.complete && (event.response.status = 200)
  ));
  return null;
} : (_props) => null;
var _tmpl$$2 = ["<span", ' style="font-size:1.5em;text-align:center;position:fixed;left:0px;bottom:55%;width:100%;">', "</span>"], _tmpl$2$1 = ["<span", ' style="font-size:1.5em;text-align:center;position:fixed;left:0px;bottom:55%;width:100%;">500 | Internal Server Error</span>'];
const ErrorBoundary = (props) => {
  const message = isServer ? "500 | Internal Server Error" : "Error | Uncaught Client Exception";
  return createComponent$1(ErrorBoundary$1, {
    fallback: (error) => {
      console.error(error);
      return [ssr(_tmpl$$2, ssrHydrationKey(), escape(message)), createComponent$1(HttpStatusCode, {
        code: 500
      })];
    },
    get children() {
      return props.children;
    }
  });
};
const TopErrorBoundary = (props) => {
  let isError = false;
  const res = catchError(() => props.children, (err) => {
    console.error(err);
    isError = !!err;
  });
  return isError ? [ssr(_tmpl$2$1, ssrHydrationKey()), createComponent$1(HttpStatusCode, {
    code: 500
  })] : res;
};
const PatchVirtualDevStyles = (props) => {
};
var _tmpl$$1 = ["<script", ' type="module"', " async", "><\/script>"];
const docType = ssr("<!DOCTYPE html>");
function StartServer(props) {
  const context = getRequestEvent();
  const nonce = context.nonce;
  useAssets(context.assets, nonce);
  return createComponent$1(NoHydration, {
    get children() {
      return [docType, createComponent$1(TopErrorBoundary, {
        get children() {
          return createComponent$1(props.document, {
            get assets() {
              return createComponent$1(HydrationScript, {});
            },
            get scripts() {
              return [createComponent$1(PatchVirtualDevStyles, {
                nonce
              }), ssr(_tmpl$$1, ssrHydrationKey(), ssrAttribute("nonce", escape(nonce, true), false), ssrAttribute("src", escape(getSsrManifest().path("./src/entry-client.tsx"), true), false))];
            },
            get children() {
              return createComponent$1(Hydration, {
                get children() {
                  return createComponent$1(ErrorBoundary, {
                    get children() {
                      return createComponent$1(App$1, {});
                    }
                  });
                }
              });
            }
          });
        }
      })];
    }
  });
}
const middleware = {};
const NullProtoObj = /* @__PURE__ */ (() => {
  const e = function() {
  };
  return e.prototype = /* @__PURE__ */ Object.create(null), Object.freeze(e.prototype), e;
})();
function createRouter() {
  return {
    root: { key: "" },
    static: new NullProtoObj()
  };
}
function expandGroupDelimiters(path) {
  let i2 = 0;
  let depth2 = 0;
  for (; i2 < path.length; i2++) {
    const c2 = path.charCodeAt(i2);
    if (c2 === 92) {
      i2++;
      continue;
    }
    if (c2 === 40) {
      depth2++;
      continue;
    }
    if (c2 === 41 && depth2 > 0) {
      depth2--;
      continue;
    }
    if (c2 === 123 && depth2 === 0) break;
  }
  if (i2 >= path.length) return;
  let j2 = i2 + 1;
  depth2 = 0;
  for (; j2 < path.length; j2++) {
    const c2 = path.charCodeAt(j2);
    if (c2 === 92) {
      j2++;
      continue;
    }
    if (c2 === 40) {
      depth2++;
      continue;
    }
    if (c2 === 41 && depth2 > 0) {
      depth2--;
      continue;
    }
    if (c2 === 125 && depth2 === 0) break;
  }
  if (j2 >= path.length) return;
  const mod = path[j2 + 1];
  const hasMod = mod === "?" || mod === "+" || mod === "*";
  const pre = path.slice(0, i2);
  const body = path.slice(i2 + 1, j2);
  const suf = path.slice(j2 + (hasMod ? 2 : 1));
  if (!hasMod) return [pre + body + suf];
  if (mod === "?") return [pre + body + suf, pre + suf];
  if (body.includes("/")) throw new Error("unsupported group repetition across segments");
  return [`${pre}(?:${body})${mod}${suf}`];
}
const UNNAMED_GROUP_PREFIX = "__rou3_unnamed_";
const _unnamedGroupPrefixLength = 15;
function hasSegmentWildcard(segment) {
  let depth2 = 0;
  for (let i2 = 0; i2 < segment.length; i2++) {
    const ch = segment.charCodeAt(i2);
    if (ch === 92) {
      i2++;
      continue;
    }
    if (ch === 40) {
      depth2++;
      continue;
    }
    if (ch === 41 && depth2 > 0) {
      depth2--;
      continue;
    }
    if (ch === 42 && depth2 === 0) return true;
  }
  return false;
}
function replaceSegmentWildcards(segment, unnamedStart, toGroupKey = toUnnamedGroupKey) {
  let depth2 = 0;
  let nextIndex = unnamedStart;
  let replaced = "";
  for (let i2 = 0; i2 < segment.length; i2++) {
    const ch = segment.charCodeAt(i2);
    if (ch === 92) {
      replaced += segment[i2];
      if (i2 + 1 < segment.length) replaced += segment[++i2];
      continue;
    }
    if (ch === 40) {
      depth2++;
      replaced += segment[i2];
      continue;
    }
    if (ch === 41 && depth2 > 0) {
      depth2--;
      replaced += segment[i2];
      continue;
    }
    if (ch === 42 && depth2 === 0) {
      replaced += `(?<${toGroupKey(nextIndex++)}>[^/]*)`;
      continue;
    }
    replaced += segment[i2];
  }
  return [replaced, nextIndex];
}
function toUnnamedGroupKey(index) {
  return `${UNNAMED_GROUP_PREFIX}${index}`;
}
function normalizeUnnamedGroupKey(key) {
  return key.startsWith("__rou3_unnamed_") ? key.slice(_unnamedGroupPrefixLength) : key;
}
function encodeEscapes(path) {
  return path.replace(/\\:/g, "�A").replace(/\\\(/g, "�B").replace(/\\\)/g, "�C").replace(/\\\{/g, "�D").replace(/\\\}/g, "�E");
}
function decodeEscaped(segment) {
  return segment.replace(/\uFFFD([A-E])/g, (_2, c2) => c2 === "A" ? ":" : c2 === "B" ? "(" : c2 === "C" ? ")" : c2 === "D" ? "{" : "}");
}
function expandModifiers(segments) {
  for (let i2 = 0; i2 < segments.length; i2++) {
    const m2 = segments[i2].match(/^(.*:[\w-]+(?:\([^)]*\))?)([?+*])$/);
    if (!m2) continue;
    const pre = segments.slice(0, i2);
    const suf = segments.slice(i2 + 1);
    if (m2[2] === "?") return ["/" + pre.concat(m2[1]).concat(suf).join("/"), "/" + pre.concat(suf).join("/")];
    const name = m2[1].match(/:([\w-]+)/)?.[1] || "_";
    const wc = "/" + [
      ...pre,
      `**:${name}`,
      ...suf
    ].join("/");
    const without = "/" + [...pre, ...suf].join("/");
    return m2[2] === "+" ? [wc] : [wc, without];
  }
}
function splitPath(path) {
  const [_2, ...s] = path.split("/");
  return s[s.length - 1] === "" ? s.slice(0, -1) : s;
}
function getMatchParams(segments, paramsMap) {
  const params = new NullProtoObj();
  for (const [index, name] of paramsMap) {
    const segment = index < 0 ? segments.slice(-(index + 1)).join("/") : segments[index];
    if (typeof name === "string") params[name] = segment;
    else {
      const match = segment.match(name);
      if (match) for (const key in match.groups) params[normalizeUnnamedGroupKey(key)] = match.groups[key];
    }
  }
  return params;
}
function addRoute(ctx, method = "", path, data) {
  method = method.toUpperCase();
  if (path.charCodeAt(0) !== 47) path = `/${path}`;
  const groupExpanded = expandGroupDelimiters(path);
  if (groupExpanded) {
    for (const expandedPath of groupExpanded) addRoute(ctx, method, expandedPath, data);
    return;
  }
  path = encodeEscapes(path);
  const segments = splitPath(path);
  const expanded = expandModifiers(segments);
  if (expanded) {
    for (const p2 of expanded) addRoute(ctx, method, p2, data);
    return;
  }
  let node = ctx.root;
  let _unnamedParamIndex = 0;
  const paramsMap = [];
  const paramsRegexp = [];
  for (let i2 = 0; i2 < segments.length; i2++) {
    let segment = segments[i2];
    if (segment.startsWith("**")) {
      if (!node.wildcard) node.wildcard = { key: "**" };
      node = node.wildcard;
      paramsMap.push([
        -(i2 + 1),
        segment.split(":")[1] || "_",
        segment.length === 2
      ]);
      break;
    }
    if (segment === "*" || segment.includes(":") || segment.includes("(") || hasSegmentWildcard(segment)) {
      if (!node.param) node.param = { key: "*" };
      node = node.param;
      if (segment === "*") paramsMap.push([
        i2,
        String(_unnamedParamIndex++),
        true
      ]);
      else if (segment.includes(":", 1) || segment.includes("(") || hasSegmentWildcard(segment) || !/^:[\w-]+$/.test(segment)) {
        const [regexp, nextIndex] = getParamRegexp(segment, _unnamedParamIndex);
        _unnamedParamIndex = nextIndex;
        paramsRegexp[i2] = regexp;
        node.hasRegexParam = true;
        paramsMap.push([
          i2,
          regexp,
          false
        ]);
      } else paramsMap.push([
        i2,
        segment.slice(1),
        false
      ]);
      continue;
    }
    if (segment === "\\*") segment = segments[i2] = "*";
    else if (segment === "\\*\\*") segment = segments[i2] = "**";
    segment = segments[i2] = decodeEscaped(segment);
    const child = node.static?.[segment];
    if (child) node = child;
    else {
      const staticNode = { key: segment };
      if (!node.static) node.static = new NullProtoObj();
      node.static[segment] = staticNode;
      node = staticNode;
    }
  }
  const hasParams = paramsMap.length > 0;
  if (!node.methods) node.methods = new NullProtoObj();
  node.methods[method] ??= [];
  node.methods[method].push({
    data: data || null,
    paramsRegexp,
    paramsMap: hasParams ? paramsMap : void 0
  });
  if (!hasParams) ctx.static["/" + segments.join("/")] = node;
}
function getParamRegexp(segment, unnamedStart = 0) {
  let _i = unnamedStart;
  let _s = "", _d = 0;
  for (let j2 = 0; j2 < segment.length; j2++) {
    const c2 = segment.charCodeAt(j2);
    if (c2 === 40) _d++;
    else if (c2 === 41 && _d > 0) _d--;
    else if (c2 === 92 && _d === 0 && j2 + 1 < segment.length) {
      const n2 = segment[j2 + 1];
      if (n2 !== ":" && n2 !== "(" && n2 !== "*" && n2 !== "\\") {
        _s += "￾" + n2;
        j2++;
        continue;
      }
    }
    _s += segment[j2];
  }
  [_s, _i] = replaceSegmentWildcards(_s, _i);
  const regex = _s.replace(/:([\w-]+)(?:\(([^)]*)\))?/g, (_2, id, p2) => `(?<${id}>${p2 || "[^/]+"})`).replace(/\((?![?<])/g, () => `(?<${toUnnamedGroupKey(_i++)}>`).replace(/\./g, "\\.").replace(/\uFFFE(.)/g, (_2, c2) => /[.*+?^${}()|[\]\\]/.test(c2) ? `\\${c2}` : c2);
  return [new RegExp(`^${regex}$`), _i];
}
function findRoute(ctx, method = "", path, opts) {
  if (path.charCodeAt(path.length - 1) === 47) path = path.slice(0, -1);
  const staticNode = ctx.static[path];
  if (staticNode && staticNode.methods) {
    const staticMatch = staticNode.methods[method] || staticNode.methods[""];
    if (staticMatch !== void 0) return staticMatch[0];
  }
  const segments = splitPath(path);
  const match = _lookupTree(ctx.root, method, segments, 0)?.[0];
  if (match === void 0) return;
  return {
    data: match.data,
    params: match.paramsMap ? getMatchParams(segments, match.paramsMap) : void 0
  };
}
function _lookupTree(node, method, segments, index) {
  if (index === segments.length) {
    if (node.methods) {
      const match = node.methods[method] || node.methods[""];
      if (match) return match;
    }
    if (node.param && node.param.methods) {
      const match = node.param.methods[method] || node.param.methods[""];
      if (match) {
        const pMap = match[0].paramsMap;
        if (pMap?.[pMap?.length - 1]?.[2]) return match;
      }
    }
    if (node.wildcard && node.wildcard.methods) {
      const match = node.wildcard.methods[method] || node.wildcard.methods[""];
      if (match) {
        const pMap = match[0].paramsMap;
        if (pMap?.[pMap?.length - 1]?.[2]) return match;
      }
    }
    return;
  }
  const segment = segments[index];
  if (node.static) {
    const staticChild = node.static[segment];
    if (staticChild) {
      const match = _lookupTree(staticChild, method, segments, index + 1);
      if (match) return match;
    }
  }
  if (node.param) {
    const match = _lookupTree(node.param, method, segments, index + 1);
    if (match) {
      if (node.param.hasRegexParam) {
        const exactMatch = match.find((m2) => m2.paramsRegexp[index]?.test(segment)) || match.find((m2) => !m2.paramsRegexp[index]);
        return exactMatch ? [exactMatch] : void 0;
      }
      return match;
    }
  }
  if (node.wildcard && node.wildcard.methods) return node.wildcard.methods[method] || node.wildcard.methods[""];
}
const _P = "￾";
function replaceEscapesOutsideGroups(segment) {
  let r = "", d2 = 0;
  for (let i2 = 0; i2 < segment.length; i2++) {
    const c2 = segment.charCodeAt(i2);
    if (c2 === 40) d2++;
    else if (c2 === 41 && d2 > 0) d2--;
    else if (c2 === 92 && d2 === 0 && i2 + 1 < segment.length) {
      const n2 = segment[i2 + 1];
      if (n2 !== ":" && n2 !== "(" && n2 !== "*" && n2 !== "\\") {
        r += _P + n2;
        i2++;
        continue;
      }
    }
    r += segment[i2];
  }
  return r;
}
function resolveEscapePlaceholders(str) {
  return str.replace(/\uFFFE(.)/g, (_2, c2) => /[.*+?^${}()|[\]\\]/.test(c2) ? `\\${c2}` : c2);
}
function routeToRegExp(route = "/") {
  const groupExpanded = expandGroupDelimiters(route);
  if (groupExpanded) {
    const sources = groupExpanded.map((expandedRoute) => routeToRegExp(expandedRoute).source.slice(1, -1));
    return new RegExp(`^(?:${sources.join("|")})$`);
  }
  return _routeToRegExp(route);
}
function _routeToRegExp(route) {
  const reSegments = [];
  let idCtr = 0;
  for (const segment of route.split("/")) {
    if (!segment) continue;
    if (segment === "*") reSegments.push(`(?<${toRegExpUnnamedKey(idCtr++)}>[^/]*)`);
    else if (segment.startsWith("**")) reSegments.push(segment === "**" ? "?(?<_>.*)" : `?(?<${segment.slice(3)}>.+)`);
    else if (segment.includes(":") || /(^|[^\\])\(/.test(segment) || hasSegmentWildcard(segment)) {
      const modMatch = segment.match(/^(.*:[\w-]+(?:\([^)]*\))?)([?+*])$/);
      if (modMatch) {
        const [, base, mod] = modMatch;
        const name = base.match(/:([\w-]+)/)?.[1] || `_${idCtr++}`;
        if (mod === "?") {
          const inner = base.replace(/:([\w-]+)(?:\(([^)]*)\))?/g, (_2, id, pattern2) => `(?<${id}>${pattern2 || "[^/]+"})`).replace(/\./g, "\\.");
          if (reSegments.length > 0) {
            const prevQ = reSegments.pop();
            reSegments.push(`${prevQ}(?:/${inner})?`);
          } else reSegments.push(`?${inner}?`);
          continue;
        }
        const pattern = base.match(/:(\w+)(?:\(([^)]*)\))?/)?.[2];
        if (reSegments.length > 0) {
          const prevMod = reSegments.pop();
          if (pattern) {
            const repeated = `${pattern}(?:/${pattern})*`;
            reSegments.push(mod === "+" ? `${prevMod}/(?<${name}>${repeated})` : `${prevMod}(?:/(?<${name}>${repeated}))?`);
          } else reSegments.push(mod === "+" ? `${prevMod}/(?<${name}>.+)` : `${prevMod}(?:/(?<${name}>.*))?`);
        } else if (pattern) {
          const repeated = `${pattern}(?:/${pattern})*`;
          reSegments.push(mod === "+" ? `?(?<${name}>${repeated})` : `?(?<${name}>${repeated})?`);
        } else reSegments.push(mod === "+" ? `?(?<${name}>.+)` : `?(?<${name}>.*)`);
        continue;
      }
      let dynamicSegment = replaceEscapesOutsideGroups(segment);
      [dynamicSegment, idCtr] = replaceSegmentWildcards(dynamicSegment, idCtr, toRegExpUnnamedKey);
      reSegments.push(resolveEscapePlaceholders(dynamicSegment.replace(/:([\w-]+)(?:\(([^)]*)\))?/g, (_2, id, pattern) => `(?<${id}>${pattern || "[^/]+"})`).replace(/(^|[^\\])\((?![?<])/g, (_2, p2) => `${p2}(?<${toRegExpUnnamedKey(idCtr++)}>`).replace(/\./g, "\\.")));
    } else reSegments.push(segment.replace(/\\(.)/g, "$1").replace(/[.*+?^${}()|[\]]/g, "\\$&"));
  }
  return new RegExp(`^/${reSegments.join("/")}/?$`);
}
function toRegExpUnnamedKey(index) {
  return `_${index}`;
}
function lazyInherit(target, source, sourceKey) {
  for (const key of [...Object.getOwnPropertyNames(source), ...Object.getOwnPropertySymbols(source)]) {
    if (key === "constructor") continue;
    const targetDesc = Object.getOwnPropertyDescriptor(target, key);
    const desc = Object.getOwnPropertyDescriptor(source, key);
    let modified = false;
    if (desc.get) {
      modified = true;
      desc.get = targetDesc?.get || function() {
        return this[sourceKey][key];
      };
    }
    if (desc.set) {
      modified = true;
      desc.set = targetDesc?.set || function(value) {
        this[sourceKey][key] = value;
      };
    }
    if (!targetDesc?.value && typeof desc.value === "function") {
      modified = true;
      desc.value = function(...args) {
        return this[sourceKey][key](...args);
      };
    }
    if (modified) Object.defineProperty(target, key, desc);
  }
}
const _needsNormRE = /(?:(?:^|\/)(?:\.|\.\.|%2e|%2e\.|\.%2e|%2e%2e)(?:\/|$))|[\\^#"<>{}`\x80-\uffff]/i;
const _searchNeedsNormRE = /[#"'<>]/;
const FastURL = /* @__PURE__ */ (() => {
  const NativeURL = globalThis.URL;
  const FastURL2 = class URL {
    #url;
    #href;
    #protocol;
    #host;
    #pathname;
    #search;
    #searchParams;
    #pos;
    constructor(url) {
      if (typeof url === "string") {
        const isOriginForm = url[0] === "/";
        if (isOriginForm && !_searchNeedsNormRE.test(url)) this.#href = url;
        else this.#url = new NativeURL(isOriginForm ? `http://localhost${url}` : url);
      } else if (_needsNormRE.test(url.pathname) || url.search && _searchNeedsNormRE.test(url.search)) this.#url = new NativeURL(`${url.protocol || "http:"}//${url.host || "localhost"}${url.pathname}${url.search || ""}`);
      else {
        this.#protocol = url.protocol;
        this.#host = url.host;
        this.#pathname = url.pathname;
        this.#search = url.search;
      }
    }
    static [Symbol.hasInstance](val) {
      return val instanceof NativeURL;
    }
    get _url() {
      if (this.#url) return this.#url;
      this.#url = new NativeURL(this.href);
      this.#href = void 0;
      this.#protocol = void 0;
      this.#host = void 0;
      this.#pathname = void 0;
      this.#search = void 0;
      this.#searchParams = void 0;
      this.#pos = void 0;
      return this.#url;
    }
    get href() {
      if (this.#url) return this.#url.href;
      if (!this.#href) this.#href = `${this.#protocol || "http:"}//${this.#host || "localhost"}${this.#pathname || "/"}${this.#search || ""}`;
      return this.#href;
    }
    #getPos() {
      if (!this.#pos) {
        const url = this.href;
        const protoIndex = url.indexOf("://");
        const pathnameIndex = protoIndex === -1 ? -1 : url.indexOf("/", protoIndex + 4);
        const qIndex = pathnameIndex === -1 ? -1 : url.indexOf("?", pathnameIndex);
        this.#pos = [
          protoIndex,
          pathnameIndex,
          qIndex
        ];
      }
      return this.#pos;
    }
    get pathname() {
      if (this.#url) return this.#url.pathname;
      if (this.#pathname === void 0) {
        const [, pathnameIndex, queryIndex] = this.#getPos();
        if (pathnameIndex === -1) return this._url.pathname;
        this.#pathname = this.href.slice(pathnameIndex, queryIndex === -1 ? void 0 : queryIndex);
      }
      return this.#pathname;
    }
    get search() {
      if (this.#url) return this.#url.search;
      if (this.#search === void 0) {
        const [, pathnameIndex, queryIndex] = this.#getPos();
        if (pathnameIndex === -1) return this._url.search;
        const url = this.href;
        this.#search = queryIndex === -1 || queryIndex === url.length - 1 ? "" : url.slice(queryIndex);
      }
      return this.#search;
    }
    get searchParams() {
      if (this.#url) return this.#url.searchParams;
      if (!this.#searchParams) this.#searchParams = new URLSearchParams(this.search);
      return this.#searchParams;
    }
    get protocol() {
      if (this.#url) return this.#url.protocol;
      if (this.#protocol === void 0) {
        const [protocolIndex] = this.#getPos();
        if (protocolIndex === -1) return this._url.protocol;
        const url = this.href;
        this.#protocol = url.slice(0, protocolIndex + 1);
      }
      return this.#protocol;
    }
    toString() {
      return this.href;
    }
    toJSON() {
      return this.href;
    }
  };
  lazyInherit(FastURL2.prototype, NativeURL.prototype, "_url");
  Object.setPrototypeOf(FastURL2.prototype, NativeURL.prototype);
  Object.setPrototypeOf(FastURL2, NativeURL);
  return FastURL2;
})();
const NodeResponse = /* @__PURE__ */ (() => {
  const NativeResponse = globalThis.Response;
  const STATUS_CODES = globalThis.process?.getBuiltinModule?.("node:http")?.STATUS_CODES || {};
  class NodeResponse2 {
    #body;
    #init;
    #headers;
    #response;
    constructor(body, init) {
      this.#body = body;
      this.#init = init;
    }
    static [Symbol.hasInstance](val) {
      return val instanceof NativeResponse;
    }
    get status() {
      return this.#response?.status || this.#init?.status || 200;
    }
    get statusText() {
      return this.#response?.statusText || this.#init?.statusText || STATUS_CODES[this.status] || "";
    }
    get headers() {
      if (this.#response) return this.#response.headers;
      if (this.#headers) return this.#headers;
      const initHeaders = this.#init?.headers;
      return this.#headers = initHeaders instanceof Headers ? initHeaders : new Headers(initHeaders);
    }
    get ok() {
      if (this.#response) return this.#response.ok;
      const status = this.status;
      return status >= 200 && status < 300;
    }
    get _response() {
      if (this.#response) return this.#response;
      let body = this.#body;
      if (body && typeof body.pipe === "function" && !(body instanceof Readable)) {
        const stream = new PassThrough();
        body.pipe(stream);
        const abort = body.abort;
        if (abort) stream.once("close", () => abort());
        body = stream;
      }
      this.#response = new NativeResponse(body, this.#headers ? {
        ...this.#init,
        headers: this.#headers
      } : this.#init);
      this.#init = void 0;
      this.#headers = void 0;
      this.#body = void 0;
      return this.#response;
    }
    _toNodeResponse() {
      const status = this.status;
      const statusText = this.statusText;
      let body;
      let contentType;
      let contentLength;
      if (this.#response) body = this.#response.body;
      else if (this.#body) if (this.#body instanceof ReadableStream) body = this.#body;
      else if (typeof this.#body === "string") {
        body = this.#body;
        contentType = "text/plain; charset=UTF-8";
        contentLength = Buffer.byteLength(this.#body);
      } else if (this.#body instanceof ArrayBuffer) {
        body = Buffer.from(this.#body);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Uint8Array) {
        body = this.#body;
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof DataView) {
        body = Buffer.from(this.#body.buffer);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Blob) {
        body = this.#body.stream();
        contentType = this.#body.type;
        contentLength = this.#body.size;
      } else if (typeof this.#body.pipe === "function") body = this.#body;
      else body = this._response.body;
      const headers = [];
      const initHeaders = this.#init?.headers;
      const headerEntries = this.#response?.headers || this.#headers || (initHeaders ? Array.isArray(initHeaders) ? initHeaders : initHeaders?.entries ? initHeaders.entries() : Object.entries(initHeaders) : void 0);
      let hasContentTypeHeader;
      let hasContentLength;
      if (headerEntries) for (const [key, value] of headerEntries) {
        const lowerKey = typeof key === "string" ? key.toLowerCase() : String(key);
        if (Array.isArray(value)) for (const v2 of value) headers.push(lowerKey, v2);
        else headers.push(lowerKey, value);
        if (lowerKey === "content-type") hasContentTypeHeader = true;
        else if (lowerKey === "content-length") hasContentLength = true;
      }
      if (contentType && !hasContentTypeHeader) headers.push("content-type", contentType);
      if (contentLength && !hasContentLength) headers.push("content-length", String(contentLength));
      this.#init = void 0;
      this.#headers = void 0;
      this.#response = void 0;
      this.#body = void 0;
      return {
        status,
        statusText,
        headers,
        body
      };
    }
  }
  lazyInherit(NodeResponse2.prototype, NativeResponse.prototype, "_response");
  Object.setPrototypeOf(NodeResponse2, NativeResponse);
  Object.setPrototypeOf(NodeResponse2.prototype, NativeResponse.prototype);
  return NodeResponse2;
})();
const kEventNS = "h3.internal.event.";
const kEventRes = /* @__PURE__ */ Symbol.for(`${kEventNS}res`);
const kEventResHeaders = /* @__PURE__ */ Symbol.for(`${kEventNS}res.headers`);
var H3Event = class {
  app;
  req;
  url;
  context;
  static __is_event__ = true;
  constructor(req, context, app2) {
    this.context = context || req.context || new NullProtoObj();
    this.req = req;
    this.app = app2;
    const _url = req._url;
    this.url = _url && _url instanceof URL ? _url : new FastURL(req.url);
  }
  get res() {
    return this[kEventRes] ||= new H3EventResponse();
  }
  get runtime() {
    return this.req.runtime;
  }
  waitUntil(promise) {
    this.req.waitUntil?.(promise);
  }
  toString() {
    return `[${this.req.method}] ${this.req.url}`;
  }
  toJSON() {
    return this.toString();
  }
  get node() {
    return this.req.runtime?.node;
  }
  get headers() {
    return this.req.headers;
  }
  get path() {
    return this.url.pathname + this.url.search;
  }
  get method() {
    return this.req.method;
  }
};
var H3EventResponse = class {
  status;
  statusText;
  get headers() {
    return this[kEventResHeaders] ||= new Headers();
  }
};
const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) return defaultStatusCode;
  if (typeof statusCode === "string") statusCode = +statusCode;
  if (statusCode < 100 || statusCode > 599) return defaultStatusCode;
  return statusCode;
}
var HTTPError = class HTTPError2 extends Error {
  get name() {
    return "HTTPError";
  }
  status;
  statusText;
  headers;
  cause;
  data;
  body;
  unhandled;
  static isError(input) {
    return input instanceof Error && input?.name === "HTTPError";
  }
  static status(status, statusText, details) {
    return new HTTPError2({
      ...details,
      statusText,
      status
    });
  }
  constructor(arg1, arg2) {
    let messageInput;
    let details;
    if (typeof arg1 === "string") {
      messageInput = arg1;
      details = arg2;
    } else details = arg1;
    const status = sanitizeStatusCode(details?.status || details?.cause?.status || details?.status || details?.statusCode, 500);
    const statusText = sanitizeStatusMessage(details?.statusText || details?.cause?.statusText || details?.statusText || details?.statusMessage);
    const message = messageInput || details?.message || details?.cause?.message || details?.statusText || details?.statusMessage || [
      "HTTPError",
      status,
      statusText
    ].filter(Boolean).join(" ");
    super(message, { cause: details });
    this.cause = details;
    this.status = status;
    this.statusText = statusText || void 0;
    const rawHeaders = details?.headers || details?.cause?.headers;
    this.headers = rawHeaders ? new Headers(rawHeaders) : void 0;
    this.unhandled = details?.unhandled ?? details?.cause?.unhandled ?? void 0;
    this.data = details?.data;
    this.body = details?.body;
  }
  get statusCode() {
    return this.status;
  }
  get statusMessage() {
    return this.statusText;
  }
  toJSON() {
    const unhandled = this.unhandled;
    return {
      status: this.status,
      statusText: this.statusText,
      unhandled,
      message: unhandled ? "HTTPError" : this.message,
      data: unhandled ? void 0 : this.data,
      ...unhandled ? void 0 : this.body
    };
  }
};
function isJSONSerializable(value, _type) {
  if (value === null || value === void 0) return true;
  if (_type !== "object") return _type === "boolean" || _type === "number" || _type === "string";
  if (typeof value.toJSON === "function") return true;
  if (Array.isArray(value)) return true;
  if (typeof value.pipe === "function" || typeof value.pipeTo === "function") return false;
  if (value instanceof NullProtoObj) return true;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
const kNotFound = /* @__PURE__ */ Symbol.for("h3.notFound");
const kHandled = /* @__PURE__ */ Symbol.for("h3.handled");
function toResponse(val, event, config = {}) {
  if (typeof val?.then === "function") return (val.catch?.((error) => error) || Promise.resolve(val)).then((resolvedVal) => toResponse(resolvedVal, event, config));
  const response = prepareResponse(val, event, config);
  if (typeof response?.then === "function") return toResponse(response, event, config);
  const { onResponse } = config;
  return onResponse ? Promise.resolve(onResponse(response, event)).then(() => response) : response;
}
var HTTPResponse = class {
  #headers;
  #init;
  body;
  constructor(body, init) {
    this.body = body;
    this.#init = init;
  }
  get status() {
    return this.#init?.status || 200;
  }
  get statusText() {
    return this.#init?.statusText || "OK";
  }
  get headers() {
    return this.#headers ||= new Headers(this.#init?.headers);
  }
};
function prepareResponse(val, event, config, nested) {
  if (val === kHandled) return new NodeResponse(null);
  if (val === kNotFound) val = new HTTPError({
    status: 404,
    message: `Cannot find any route matching [${event.req.method}] ${event.url}`
  });
  if (val && val instanceof Error) {
    const isHTTPError = HTTPError.isError(val);
    const error = isHTTPError ? val : new HTTPError(val);
    if (!isHTTPError) {
      error.unhandled = true;
      if (val?.stack) error.stack = val.stack;
    }
    if (error.unhandled && !config.silent) console.error(error);
    const { onError } = config;
    return onError && !nested ? Promise.resolve(onError(error, event)).catch((error2) => error2).then((newVal) => prepareResponse(newVal ?? val, event, config, true)) : errorResponse(error, config.debug);
  }
  const preparedRes = event[kEventRes];
  const preparedHeaders = preparedRes?.[kEventResHeaders];
  event[kEventRes] = void 0;
  if (!(val instanceof Response)) {
    const res = prepareResponseBody(val, event, config);
    const status = res.status || preparedRes?.status;
    return new NodeResponse(nullBody(event.req.method, status) ? null : res.body, {
      status,
      statusText: res.statusText || preparedRes?.statusText,
      headers: res.headers && preparedHeaders ? mergeHeaders$1(res.headers, preparedHeaders) : res.headers || preparedHeaders
    });
  }
  if (!preparedHeaders || nested || !val.ok) return val;
  try {
    mergeHeaders$1(val.headers, preparedHeaders, val.headers);
    return val;
  } catch {
    return new NodeResponse(nullBody(event.req.method, val.status) ? null : val.body, {
      status: val.status,
      statusText: val.statusText,
      headers: mergeHeaders$1(val.headers, preparedHeaders)
    });
  }
}
function mergeHeaders$1(base, overrides, target = new Headers(base)) {
  for (const [name, value] of overrides) if (name === "set-cookie") target.append(name, value);
  else target.set(name, value);
  return target;
}
const frozen = (name) => (...args) => {
  throw new Error(`Headers are frozen (${name} ${args.join(", ")})`);
};
var FrozenHeaders = class extends Headers {
  set = frozen("set");
  append = frozen("append");
  delete = frozen("delete");
};
const emptyHeaders = /* @__PURE__ */ new FrozenHeaders({ "content-length": "0" });
const jsonHeaders = /* @__PURE__ */ new FrozenHeaders({ "content-type": "application/json;charset=UTF-8" });
function prepareResponseBody(val, event, config) {
  if (val === null || val === void 0) return {
    body: "",
    headers: emptyHeaders
  };
  const valType = typeof val;
  if (valType === "string") return { body: val };
  if (val instanceof Uint8Array) {
    event.res.headers.set("content-length", val.byteLength.toString());
    return { body: val };
  }
  if (val instanceof HTTPResponse || val?.constructor?.name === "HTTPResponse") return val;
  if (isJSONSerializable(val, valType)) return {
    body: JSON.stringify(val, void 0, config.debug ? 2 : void 0),
    headers: jsonHeaders
  };
  if (valType === "bigint") return {
    body: val.toString(),
    headers: jsonHeaders
  };
  if (val instanceof Blob) {
    const headers = new Headers({
      "content-type": val.type,
      "content-length": val.size.toString()
    });
    let filename = val.name;
    if (filename) {
      filename = encodeURIComponent(filename);
      headers.set("content-disposition", `filename="${filename}"; filename*=UTF-8''${filename}`);
    }
    return {
      body: val.stream(),
      headers
    };
  }
  if (valType === "symbol") return { body: val.toString() };
  if (valType === "function") return { body: `${val.name}()` };
  return { body: val };
}
function nullBody(method, status) {
  return method === "HEAD" || status === 100 || status === 101 || status === 102 || status === 204 || status === 205 || status === 304;
}
function errorResponse(error, debug) {
  return new NodeResponse(JSON.stringify({
    ...error.toJSON(),
    stack: debug && error.stack ? error.stack.split("\n").map((l2) => l2.trim()) : void 0
  }, void 0, debug ? 2 : void 0), {
    status: error.status,
    statusText: error.statusText,
    headers: error.headers ? mergeHeaders$1(jsonHeaders, error.headers) : new Headers(jsonHeaders)
  });
}
function normalizeMiddleware(input, opts = {}) {
  const matcher = createMatcher(opts);
  if (!matcher && (input.length > 1 || input.constructor?.name === "AsyncFunction")) return input;
  return (event, next) => {
    if (matcher && !matcher(event)) return next();
    const res = input(event, next);
    return res === void 0 || res === kNotFound ? next() : res;
  };
}
function createMatcher(opts) {
  if (!opts.route && !opts.method && !opts.match) return;
  const routeMatcher = opts.route ? routeToRegExp(opts.route) : void 0;
  const method = opts.method?.toUpperCase();
  return function _middlewareMatcher(event) {
    if (method && event.req.method !== method) return false;
    if (opts.match && !opts.match(event)) return false;
    if (!routeMatcher) return true;
    const match = event.url.pathname.match(routeMatcher);
    if (!match) return false;
    if (match.groups) event.context.middlewareParams = {
      ...event.context.middlewareParams,
      ...match.groups
    };
    return true;
  };
}
function callMiddleware(event, middleware2, handler, index = 0) {
  if (index === middleware2.length) return handler(event);
  const fn2 = middleware2[index];
  let nextCalled;
  let nextResult;
  const next = () => {
    if (nextCalled) return nextResult;
    nextCalled = true;
    nextResult = callMiddleware(event, middleware2, handler, index + 1);
    return nextResult;
  };
  const ret = fn2(event, next);
  return isUnhandledResponse(ret) ? next() : typeof ret?.then === "function" ? ret.then((resolved) => isUnhandledResponse(resolved) ? next() : resolved) : ret;
}
function isUnhandledResponse(val) {
  return val === void 0 || val === kNotFound;
}
function toRequest(input, options) {
  if (typeof input === "string") {
    let url = input;
    if (url[0] === "/") {
      const headers = options?.headers ? new Headers(options.headers) : void 0;
      const host = headers?.get("host") || "localhost";
      url = `${headers?.get("x-forwarded-proto") === "https" ? "https" : "http"}://${host}${url}`;
    }
    return new Request(url, options);
  } else if (options || input instanceof URL) return new Request(input, options);
  return input;
}
function getRequestIP(event, opts = {}) {
  if (opts.xForwardedFor) {
    const _header = event.req.headers.get("x-forwarded-for");
    if (_header) {
      const xForwardedFor = _header.split(",")[0].trim();
      if (xForwardedFor) return xForwardedFor;
    }
  }
  return event.req.context?.clientAddress || event.req.ip || void 0;
}
function defineHandler(input) {
  if (typeof input === "function") return handlerWithFetch(input);
  const handler = input.handler || (input.fetch ? function _fetchHandler(event) {
    return input.fetch(event.req);
  } : NoHandler);
  return Object.assign(handlerWithFetch(input.middleware?.length ? function _handlerMiddleware(event) {
    return callMiddleware(event, input.middleware, handler);
  } : handler), input);
}
function handlerWithFetch(handler) {
  if ("fetch" in handler) return handler;
  return Object.assign(handler, { fetch: (req) => {
    if (typeof req === "string") req = new URL(req, "http://_");
    if (req instanceof URL) req = new Request(req);
    const event = new H3Event(req);
    try {
      return Promise.resolve(toResponse(handler(event), event));
    } catch (error) {
      return Promise.resolve(toResponse(error, event));
    }
  } });
}
function toEventHandler(handler) {
  if (typeof handler === "function") return handler;
  if (typeof handler?.handler === "function") return handler.handler;
  if (typeof handler?.fetch === "function") return function _fetchHandler(event) {
    return handler.fetch(event.req);
  };
}
const NoHandler = () => kNotFound;
var H3Core = class {
  config;
  "~middleware";
  "~routes" = [];
  constructor(config = {}) {
    this["~middleware"] = [];
    this.config = config;
    this.fetch = this.fetch.bind(this);
    this.handler = this.handler.bind(this);
  }
  fetch(request) {
    return this["~request"](request);
  }
  handler(event) {
    const route = this["~findRoute"](event);
    if (route) {
      event.context.params = route.params;
      event.context.matchedRoute = route.data;
    }
    const routeHandler = route?.data.handler || NoHandler;
    const middleware2 = this["~getMiddleware"](event, route);
    return middleware2.length > 0 ? callMiddleware(event, middleware2, routeHandler) : routeHandler(event);
  }
  "~request"(request, context) {
    const event = new H3Event(request, context, this);
    let handlerRes;
    try {
      if (this.config.onRequest) {
        const hookRes = this.config.onRequest(event);
        handlerRes = typeof hookRes?.then === "function" ? hookRes.then(() => this.handler(event)) : this.handler(event);
      } else handlerRes = this.handler(event);
    } catch (error) {
      handlerRes = Promise.reject(error);
    }
    return toResponse(handlerRes, event, this.config);
  }
  "~findRoute"(_event) {
  }
  "~addRoute"(_route) {
    this["~routes"].push(_route);
  }
  "~getMiddleware"(_event, route) {
    const routeMiddleware = route?.data.middleware;
    const globalMiddleware = this["~middleware"];
    return routeMiddleware ? [...globalMiddleware, ...routeMiddleware] : globalMiddleware;
  }
};
const H3 = /* @__PURE__ */ (() => {
  class H32 extends H3Core {
    "~rou3";
    constructor(config = {}) {
      super(config);
      this["~rou3"] = createRouter();
      this.request = this.request.bind(this);
      config.plugins?.forEach((plugin) => plugin(this));
    }
    register(plugin) {
      plugin(this);
      return this;
    }
    request(_req, _init, context) {
      return this["~request"](toRequest(_req, _init), context);
    }
    mount(base, input) {
      if ("handler" in input) {
        if (input["~middleware"].length > 0) this["~middleware"].push((event, next) => {
          const originalPathname = event.url.pathname;
          if (!originalPathname.startsWith(base)) return next();
          event.url.pathname = event.url.pathname.slice(base.length) || "/";
          return callMiddleware(event, input["~middleware"], () => {
            event.url.pathname = originalPathname;
            return next();
          });
        });
        for (const r of input["~routes"]) this["~addRoute"]({
          ...r,
          route: base + r.route
        });
      } else {
        const fetchHandler = "fetch" in input ? input.fetch : input;
        this.all(`${base}/**`, function _mountedMiddleware(event) {
          const url = new URL(event.url);
          url.pathname = url.pathname.slice(base.length) || "/";
          return fetchHandler(new Request(url, event.req));
        });
      }
      return this;
    }
    on(method, route, handler, opts) {
      const _method = (method || "").toUpperCase();
      route = new URL(route, "http://_").pathname;
      this["~addRoute"]({
        method: _method,
        route,
        handler: toEventHandler(handler),
        middleware: opts?.middleware,
        meta: {
          ...handler.meta,
          ...opts?.meta
        }
      });
      return this;
    }
    all(route, handler, opts) {
      return this.on("", route, handler, opts);
    }
    "~findRoute"(_event) {
      return findRoute(this["~rou3"], _event.req.method, _event.url.pathname);
    }
    "~addRoute"(_route) {
      addRoute(this["~rou3"], _route.method, _route.route, _route);
      super["~addRoute"](_route);
    }
    use(arg1, arg2, arg3) {
      let route;
      let fn2;
      let opts;
      if (typeof arg1 === "string") {
        route = arg1;
        fn2 = arg2;
        opts = arg3;
      } else {
        fn2 = arg1;
        opts = arg2;
      }
      this["~middleware"].push(normalizeMiddleware(fn2, {
        ...opts,
        route
      }));
      return this;
    }
  }
  for (const method of [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
    "HEAD",
    "OPTIONS",
    "CONNECT",
    "TRACE"
  ]) H3Core.prototype[method.toLowerCase()] = function(route, handler, opts) {
    return this.on(method, route, handler, opts);
  };
  return H32;
})();
function redirect(location, status = 302, statusText) {
  return new HTTPResponse(`<html><head><meta http-equiv="refresh" content="0; url=${location.replace(/"/g, "%22")}" /></head></html>`, {
    status,
    statusText: status === 301 ? "Moved Permanently" : "Found",
    headers: {
      "content-type": "text/html; charset=utf-8",
      location
    }
  });
}
function parse(str, options) {
  if (typeof str !== "string") throw new TypeError("argument str must be a string");
  const obj = {};
  const opt = {};
  const dec = opt.decode || decode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) break;
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) endIdx = str.length;
    else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (opt?.filter && !opt?.filter(key)) {
      index = endIdx + 1;
      continue;
    }
    if (void 0 === obj[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.codePointAt(0) === 34) val = val.slice(1, -1);
      obj[key] = tryDecode(val, dec);
    }
    index = endIdx + 1;
  }
  return obj;
}
function decode(str) {
  return str.includes("%") ? decodeURIComponent(str) : str;
}
function tryDecode(str, decode2) {
  try {
    return decode2(str);
  } catch {
    return str;
  }
}
const fieldContentRegExp = /^[\u0009\u0020-\u007E\u0080-\u00FF]+$/;
function serialize(name, value, options) {
  const opt = options || {};
  const enc = opt.encode || encodeURIComponent;
  if (typeof enc !== "function") throw new TypeError("option encode is invalid");
  if (!fieldContentRegExp.test(name)) throw new TypeError("argument name is invalid");
  const encodedValue = enc(value);
  if (encodedValue && !fieldContentRegExp.test(encodedValue)) throw new TypeError("argument val is invalid");
  let str = name + "=" + encodedValue;
  if (void 0 !== opt.maxAge && opt.maxAge !== null) {
    const maxAge = opt.maxAge - 0;
    if (Number.isNaN(maxAge) || !Number.isFinite(maxAge)) throw new TypeError("option maxAge is invalid");
    str += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) throw new TypeError("option domain is invalid");
    str += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) throw new TypeError("option path is invalid");
    str += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || Number.isNaN(opt.expires.valueOf())) throw new TypeError("option expires is invalid");
    str += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) str += "; HttpOnly";
  if (opt.secure) str += "; Secure";
  if (opt.priority) switch (typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority) {
    case "low":
      str += "; Priority=Low";
      break;
    case "medium":
      str += "; Priority=Medium";
      break;
    case "high":
      str += "; Priority=High";
      break;
    default:
      throw new TypeError("option priority is invalid");
  }
  if (opt.sameSite) switch (typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite) {
    case true:
      str += "; SameSite=Strict";
      break;
    case "lax":
      str += "; SameSite=Lax";
      break;
    case "strict":
      str += "; SameSite=Strict";
      break;
    case "none":
      str += "; SameSite=None";
      break;
    default:
      throw new TypeError("option sameSite is invalid");
  }
  if (opt.partitioned) str += "; Partitioned";
  return str;
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}
function parseSetCookie$1(setCookieValue, options) {
  const parts = (setCookieValue || "").split(";").filter((str) => typeof str === "string" && !!str.trim());
  const parsed = _parseNameValuePair$1(parts.shift() || "");
  const name = parsed.name;
  let value = parsed.value;
  try {
    value = options?.decode === false ? value : (options?.decode || decodeURIComponent)(value);
  } catch {
  }
  const cookie = {
    name,
    value
  };
  for (const part of parts) {
    const sides = part.split("=");
    const partKey = (sides.shift() || "").trimStart().toLowerCase();
    const partValue = sides.join("=");
    switch (partKey) {
      case "expires":
        cookie.expires = new Date(partValue);
        break;
      case "max-age":
        cookie.maxAge = Number.parseInt(partValue, 10);
        break;
      case "secure":
        cookie.secure = true;
        break;
      case "httponly":
        cookie.httpOnly = true;
        break;
      case "samesite":
        cookie.sameSite = partValue;
        break;
      default:
        cookie[partKey] = partValue;
    }
  }
  return cookie;
}
function _parseNameValuePair$1(nameValuePairStr) {
  let name = "";
  let value = "";
  const nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else value = nameValuePairStr;
  return {
    name,
    value
  };
}
function parseCookies(event) {
  return parse(event.req.headers.get("cookie") || "");
}
function getCookie(event, name) {
  return parseCookies(event)[name];
}
function setCookie(event, name, value, options) {
  const newCookie = serialize(name, value, {
    path: "/",
    ...options
  });
  const currentCookies = event.res.headers.getSetCookie();
  if (currentCookies.length === 0) {
    event.res.headers.set("set-cookie", newCookie);
    return;
  }
  const newCookieKey = _getDistinctCookieKey(name, options || {});
  event.res.headers.delete("set-cookie");
  for (const cookie of currentCookies) {
    if (_getDistinctCookieKey(cookie.split("=")?.[0], parseSetCookie$1(cookie)) === newCookieKey) continue;
    event.res.headers.append("set-cookie", cookie);
  }
  event.res.headers.append("set-cookie", newCookie);
}
function _getDistinctCookieKey(name, options) {
  return [
    name,
    options.domain || "",
    options.path || "/"
  ].join(";");
}
new TextEncoder();
const FETCH_EVENT_CONTEXT = "solidFetchEvent";
function createFetchEvent(event) {
  return {
    request: event.req,
    response: event.res,
    clientAddress: getRequestIP(event),
    locals: {},
    nativeEvent: event
  };
}
function getFetchEvent(h3Event) {
  if (!h3Event.context[FETCH_EVENT_CONTEXT]) {
    const fetchEvent = createFetchEvent(h3Event);
    h3Event.context[FETCH_EVENT_CONTEXT] = fetchEvent;
  }
  return h3Event.context[FETCH_EVENT_CONTEXT];
}
function mergeResponseHeaders(h3Event, headers) {
  for (const [key, value] of headers.entries()) {
    h3Event.res.headers.append(key, value);
  }
}
const decorateHandler = (fn2) => (event) => provideRequestEvent(getFetchEvent(event), () => fn2(event));
const decorateMiddleware = (fn2) => (event, next) => provideRequestEvent(getFetchEvent(event), () => fn2(event, next));
function parseSetCookie(setCookieValue, options) {
  const parts = (setCookieValue || "").split(";").filter((str) => typeof str === "string" && !!str.trim());
  const nameValuePairStr = parts.shift() || "";
  const parsed = _parseNameValuePair(nameValuePairStr);
  const name = parsed.name;
  let value = parsed.value;
  try {
    value = options?.decode === false ? value : (options?.decode || decodeURIComponent)(value);
  } catch {
  }
  const cookie = {
    name,
    value
  };
  for (const part of parts) {
    const sides = part.split("=");
    const partKey = (sides.shift() || "").trimStart().toLowerCase();
    const partValue = sides.join("=");
    switch (partKey) {
      case "expires": {
        cookie.expires = new Date(partValue);
        break;
      }
      case "max-age": {
        cookie.maxAge = Number.parseInt(partValue, 10);
        break;
      }
      case "secure": {
        cookie.secure = true;
        break;
      }
      case "httponly": {
        cookie.httpOnly = true;
        break;
      }
      case "samesite": {
        cookie.sameSite = partValue;
        break;
      }
      default: {
        cookie[partKey] = partValue;
      }
    }
  }
  return cookie;
}
function _parseNameValuePair(nameValuePairStr) {
  let name = "";
  let value = "";
  const nameValueArr = nameValuePairStr.split("=");
  if (nameValueArr.length > 1) {
    name = nameValueArr.shift();
    value = nameValueArr.join("=");
  } else {
    value = nameValuePairStr;
  }
  return { name, value };
}
var M = ((i2) => (i2[i2.AggregateError = 1] = "AggregateError", i2[i2.ArrowFunction = 2] = "ArrowFunction", i2[i2.ErrorPrototypeStack = 4] = "ErrorPrototypeStack", i2[i2.ObjectAssign = 8] = "ObjectAssign", i2[i2.BigIntTypedArray = 16] = "BigIntTypedArray", i2[i2.RegExp = 32] = "RegExp", i2))(M || {});
var v$1 = Symbol.asyncIterator, pr = Symbol.hasInstance, R = Symbol.isConcatSpreadable, C = Symbol.iterator, dr = Symbol.match, gr = Symbol.matchAll, yr = Symbol.replace, Nr = Symbol.search, br = Symbol.species, vr = Symbol.split, Cr = Symbol.toPrimitive, P$1 = Symbol.toStringTag, Ar = Symbol.unscopables;
var tt = { 0: "Symbol.asyncIterator", 1: "Symbol.hasInstance", 2: "Symbol.isConcatSpreadable", 3: "Symbol.iterator", 4: "Symbol.match", 5: "Symbol.matchAll", 6: "Symbol.replace", 7: "Symbol.search", 8: "Symbol.species", 9: "Symbol.split", 10: "Symbol.toPrimitive", 11: "Symbol.toStringTag", 12: "Symbol.unscopables" }, ve = { [v$1]: 0, [pr]: 1, [R]: 2, [C]: 3, [dr]: 4, [gr]: 5, [yr]: 6, [Nr]: 7, [br]: 8, [vr]: 9, [Cr]: 10, [P$1]: 11, [Ar]: 12 }, nt = { 0: v$1, 1: pr, 2: R, 3: C, 4: dr, 5: gr, 6: yr, 7: Nr, 8: br, 9: vr, 10: Cr, 11: P$1, 12: Ar }, ot = { 2: "!0", 3: "!1", 1: "void 0", 0: "null", 4: "-0", 5: "1/0", 6: "-1/0", 7: "0/0" }, o$1 = void 0, at = { 2: true, 3: false, 1: o$1, 0: null, 4: -0, 5: Number.POSITIVE_INFINITY, 6: Number.NEGATIVE_INFINITY, 7: Number.NaN };
var Ce = { 0: "Error", 1: "EvalError", 2: "RangeError", 3: "ReferenceError", 4: "SyntaxError", 5: "TypeError", 6: "URIError" }, st = { 0: Error, 1: EvalError, 2: RangeError, 3: ReferenceError, 4: SyntaxError, 5: TypeError, 6: URIError };
function c$1(e, r, t, n2, a, s, i2, u2, l2, g2, S, d2) {
  return { t: e, i: r, s: t, c: n2, m: a, p: s, e: i2, a: u2, f: l2, b: g2, o: S, l: d2 };
}
function B(e) {
  return c$1(2, o$1, e, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
var H = B(2), J$1 = B(3), Ae = B(1), Ee = B(0), it = B(4), ut = B(5), lt = B(6), ct = B(7);
function mn(e) {
  switch (e) {
    case '"':
      return '\\"';
    case "\\":
      return "\\\\";
    case `
`:
      return "\\n";
    case "\r":
      return "\\r";
    case "\b":
      return "\\b";
    case "	":
      return "\\t";
    case "\f":
      return "\\f";
    case "<":
      return "\\x3C";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return o$1;
  }
}
function y$1(e) {
  let r = "", t = 0, n2;
  for (let a = 0, s = e.length; a < s; a++) n2 = mn(e[a]), n2 && (r += e.slice(t, a) + n2, t = a + 1);
  return t === 0 ? r = e : r += e.slice(t), r;
}
function pn(e) {
  switch (e) {
    case "\\\\":
      return "\\";
    case '\\"':
      return '"';
    case "\\n":
      return `
`;
    case "\\r":
      return "\r";
    case "\\b":
      return "\b";
    case "\\t":
      return "	";
    case "\\f":
      return "\f";
    case "\\x3C":
      return "<";
    case "\\u2028":
      return "\u2028";
    case "\\u2029":
      return "\u2029";
    default:
      return e;
  }
}
function D$1(e) {
  return e.replace(/(\\\\|\\"|\\n|\\r|\\b|\\t|\\f|\\u2028|\\u2029|\\x3C)/g, pn);
}
var L$1 = "__SEROVAL_REFS__", le$1 = "$R", Ie = `self.${le$1}`;
function dn(e) {
  return e == null ? `${Ie}=${Ie}||[]` : `(${Ie}=${Ie}||{})["${y$1(e)}"]=[]`;
}
var Er = /* @__PURE__ */ new Map(), U$1 = /* @__PURE__ */ new Map();
function Ir(e) {
  return Er.has(e);
}
function yn(e) {
  return U$1.has(e);
}
function ft(e) {
  if (Ir(e)) return Er.get(e);
  throw new Re(e);
}
function St(e) {
  if (yn(e)) return U$1.get(e);
  throw new Pe(e);
}
typeof globalThis != "undefined" ? Object.defineProperty(globalThis, L$1, { value: U$1, configurable: true, writable: false, enumerable: false }) : typeof window != "undefined" ? Object.defineProperty(window, L$1, { value: U$1, configurable: true, writable: false, enumerable: false }) : typeof self != "undefined" ? Object.defineProperty(self, L$1, { value: U$1, configurable: true, writable: false, enumerable: false }) : typeof global != "undefined" && Object.defineProperty(global, L$1, { value: U$1, configurable: true, writable: false, enumerable: false });
function xe(e) {
  return e instanceof EvalError ? 1 : e instanceof RangeError ? 2 : e instanceof ReferenceError ? 3 : e instanceof SyntaxError ? 4 : e instanceof TypeError ? 5 : e instanceof URIError ? 6 : 0;
}
function Nn(e) {
  let r = Ce[xe(e)];
  return e.name !== r ? { name: e.name } : e.constructor.name !== r ? { name: e.constructor.name } : {};
}
function Z(e, r) {
  let t = Nn(e), n2 = Object.getOwnPropertyNames(e);
  for (let a = 0, s = n2.length, i2; a < s; a++) i2 = n2[a], i2 !== "name" && i2 !== "message" && (i2 === "stack" ? r & 4 && (t = t || {}, t[i2] = e[i2]) : (t = t || {}, t[i2] = e[i2]));
  return t;
}
function Te(e) {
  return Object.isFrozen(e) ? 3 : Object.isSealed(e) ? 2 : Object.isExtensible(e) ? 0 : 1;
}
function Oe(e) {
  switch (e) {
    case Number.POSITIVE_INFINITY:
      return ut;
    case Number.NEGATIVE_INFINITY:
      return lt;
  }
  return e !== e ? ct : Object.is(e, -0) ? it : c$1(0, o$1, e, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function $(e) {
  return c$1(1, o$1, y$1(e), o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function we(e) {
  return c$1(3, o$1, "" + e, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function pt(e) {
  return c$1(4, e, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function he(e, r) {
  let t = r.valueOf();
  return c$1(5, e, t !== t ? "" : r.toISOString(), o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function ze(e, r) {
  return c$1(6, e, o$1, y$1(r.source), r.flags, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function dt(e, r) {
  return c$1(17, e, ve[r], o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function gt(e, r) {
  return c$1(18, e, y$1(ft(r)), o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function ce(e, r, t) {
  return c$1(25, e, t, y$1(r), o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function _e(e, r, t) {
  return c$1(9, e, o$1, o$1, o$1, o$1, o$1, t, o$1, o$1, Te(r), o$1);
}
function ke(e, r) {
  return c$1(21, e, o$1, o$1, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1);
}
function De(e, r, t) {
  return c$1(15, e, o$1, r.constructor.name, o$1, o$1, o$1, o$1, t, r.byteOffset, o$1, r.length);
}
function Fe(e, r, t) {
  return c$1(16, e, o$1, r.constructor.name, o$1, o$1, o$1, o$1, t, r.byteOffset, o$1, r.byteLength);
}
function Be(e, r, t) {
  return c$1(20, e, o$1, o$1, o$1, o$1, o$1, o$1, t, r.byteOffset, o$1, r.byteLength);
}
function Ve(e, r, t) {
  return c$1(13, e, xe(r), o$1, y$1(r.message), t, o$1, o$1, o$1, o$1, o$1, o$1);
}
function Me(e, r, t) {
  return c$1(14, e, xe(r), o$1, y$1(r.message), t, o$1, o$1, o$1, o$1, o$1, o$1);
}
function Le(e, r) {
  return c$1(7, e, o$1, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1, o$1);
}
function Ue(e, r) {
  return c$1(28, o$1, o$1, o$1, o$1, o$1, o$1, [e, r], o$1, o$1, o$1, o$1);
}
function je(e, r) {
  return c$1(30, o$1, o$1, o$1, o$1, o$1, o$1, [e, r], o$1, o$1, o$1, o$1);
}
function Ye(e, r, t) {
  return c$1(31, e, o$1, o$1, o$1, o$1, o$1, t, r, o$1, o$1, o$1);
}
function qe(e, r) {
  return c$1(32, e, o$1, o$1, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1);
}
function We(e, r) {
  return c$1(33, e, o$1, o$1, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1);
}
function Ge(e, r) {
  return c$1(34, e, o$1, o$1, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1);
}
function Ke(e, r, t, n2) {
  return c$1(35, e, t, o$1, o$1, o$1, o$1, r, o$1, o$1, o$1, n2);
}
var bn = { parsing: 1, serialization: 2, deserialization: 3 };
function vn(e) {
  return `Seroval Error (step: ${bn[e]})`;
}
var Cn = (e, r) => vn(e), fe$1 = class fe extends Error {
  constructor(t, n2) {
    super(Cn(t));
    this.cause = n2;
  }
}, z = class extends fe$1 {
  constructor(r) {
    super("parsing", r);
  }
}, He = class extends fe$1 {
  constructor(r) {
    super("deserialization", r);
  }
};
function _$1(e) {
  return `Seroval Error (specific: ${e})`;
}
var x$1 = class x extends Error {
  constructor(t) {
    super(_$1(1));
    this.value = t;
  }
}, h$1 = class h extends Error {
  constructor(r) {
    super(_$1(2));
  }
}, X = class extends Error {
  constructor(r) {
    super(_$1(3));
  }
}, V$1 = class V extends Error {
  constructor(r) {
    super(_$1(4));
  }
}, Re = class extends Error {
  constructor(t) {
    super(_$1(5));
    this.value = t;
  }
}, Pe = class extends Error {
  constructor(r) {
    super(_$1(6));
  }
}, Je = class extends Error {
  constructor(r) {
    super(_$1(7));
  }
}, O$1 = class O extends Error {
  constructor(r) {
    super(_$1(8));
  }
}, Q = class extends Error {
  constructor(r) {
    super(_$1(9));
  }
};
var j = class {
  constructor(r, t) {
    this.value = r;
    this.replacement = t;
  }
};
var ee$1 = () => {
  let e = { p: 0, s: 0, f: 0 };
  return e.p = new Promise((r, t) => {
    e.s = r, e.f = t;
  }), e;
}, An = (e, r) => {
  e.s(r), e.p.s = 1, e.p.v = r;
}, En = (e, r) => {
  e.f(r), e.p.s = 2, e.p.v = r;
}, Nt = ee$1.toString(), bt = An.toString(), vt = En.toString(), Pr = () => {
  let e = [], r = [], t = true, n2 = false, a = 0, s = (l2, g2, S) => {
    for (S = 0; S < a; S++) r[S] && r[S][g2](l2);
  }, i2 = (l2, g2, S, d2) => {
    for (g2 = 0, S = e.length; g2 < S; g2++) d2 = e[g2], !t && g2 === S - 1 ? l2[n2 ? "return" : "throw"](d2) : l2.next(d2);
  }, u2 = (l2, g2) => (t && (g2 = a++, r[g2] = l2), i2(l2), () => {
    t && (r[g2] = r[a], r[a--] = void 0);
  });
  return { __SEROVAL_STREAM__: true, on: (l2) => u2(l2), next: (l2) => {
    t && (e.push(l2), s(l2, "next"));
  }, throw: (l2) => {
    t && (e.push(l2), s(l2, "throw"), t = false, n2 = false, r.length = 0);
  }, return: (l2) => {
    t && (e.push(l2), s(l2, "return"), t = false, n2 = true, r.length = 0);
  } };
}, Ct = Pr.toString(), xr = (e) => (r) => () => {
  let t = 0, n2 = { [e]: () => n2, next: () => {
    if (t > r.d) return { done: true, value: void 0 };
    let a = t++, s = r.v[a];
    if (a === r.t) throw s;
    return { done: a === r.d, value: s };
  } };
  return n2;
}, At = xr.toString(), Tr = (e, r) => (t) => () => {
  let n2 = 0, a = -1, s = false, i2 = [], u2 = [], l2 = (S = 0, d2 = u2.length) => {
    for (; S < d2; S++) u2[S].s({ done: true, value: void 0 });
  };
  t.on({ next: (S) => {
    let d2 = u2.shift();
    d2 && d2.s({ done: false, value: S }), i2.push(S);
  }, throw: (S) => {
    let d2 = u2.shift();
    d2 && d2.f(S), l2(), a = i2.length, s = true, i2.push(S);
  }, return: (S) => {
    let d2 = u2.shift();
    d2 && d2.s({ done: true, value: S }), l2(), a = i2.length, i2.push(S);
  } });
  let g2 = { [e]: () => g2, next: () => {
    if (a === -1) {
      let G2 = n2++;
      if (G2 >= i2.length) {
        let rt = r();
        return u2.push(rt), rt.p;
      }
      return { done: false, value: i2[G2] };
    }
    if (n2 > a) return { done: true, value: void 0 };
    let S = n2++, d2 = i2[S];
    if (S !== a) return { done: false, value: d2 };
    if (s) throw d2;
    return { done: true, value: d2 };
  } };
  return g2;
}, Et = Tr.toString(), Or = (e) => {
  let r = atob(e), t = r.length, n2 = new Uint8Array(t);
  for (let a = 0; a < t; a++) n2[a] = r.charCodeAt(a);
  return n2.buffer;
}, It = Or.toString();
function Ze(e) {
  return "__SEROVAL_SEQUENCE__" in e;
}
function wr(e, r, t) {
  return { __SEROVAL_SEQUENCE__: true, v: e, t: r, d: t };
}
function $e(e) {
  let r = [], t = -1, n2 = -1, a = e[C]();
  for (; ; ) try {
    let s = a.next();
    if (r.push(s.value), s.done) {
      n2 = r.length - 1;
      break;
    }
  } catch (s) {
    t = r.length, r.push(s);
  }
  return wr(r, t, n2);
}
var In = xr(C);
function Rt(e) {
  return In(e);
}
var Pt = {}, xt = {};
var Tt = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }, Ot = { 0: "[]", 1: Nt, 2: bt, 3: vt, 4: Ct, 5: It };
function Xe(e) {
  return "__SEROVAL_STREAM__" in e;
}
function re() {
  return Pr();
}
function Qe(e) {
  let r = re(), t = e[v$1]();
  async function n2() {
    try {
      let a = await t.next();
      a.done ? r.return(a.value) : (r.next(a.value), await n2());
    } catch (a) {
      r.throw(a);
    }
  }
  return n2().catch(() => {
  }), r;
}
var Rn = Tr(v$1, ee$1);
function wt(e) {
  return Rn(e);
}
function me(e, r) {
  return { plugins: r.plugins, mode: e, marked: /* @__PURE__ */ new Set(), features: 63 ^ (r.disabledFeatures || 0), refs: r.refs || /* @__PURE__ */ new Map(), depthLimit: r.depthLimit || 1e3 };
}
function pe$1(e, r) {
  e.marked.add(r);
}
function zr(e, r) {
  let t = e.refs.size;
  return e.refs.set(r, t), t;
}
function er(e, r) {
  let t = e.refs.get(r);
  return t != null ? (pe$1(e, t), { type: 1, value: pt(t) }) : { type: 0, value: zr(e, r) };
}
function Y$1(e, r) {
  let t = er(e, r);
  return t.type === 1 ? t : Ir(r) ? { type: 2, value: gt(t.value, r) } : t;
}
function I(e, r) {
  let t = Y$1(e, r);
  if (t.type !== 0) return t.value;
  if (r in ve) return dt(t.value, r);
  throw new x$1(r);
}
function k$1(e, r) {
  let t = er(e, Tt[r]);
  return t.type === 1 ? t.value : c$1(26, t.value, r, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1, o$1);
}
function rr(e) {
  let r = er(e, Pt);
  return r.type === 1 ? r.value : c$1(27, r.value, o$1, o$1, o$1, o$1, o$1, o$1, I(e, C), o$1, o$1, o$1);
}
function tr(e) {
  let r = er(e, xt);
  return r.type === 1 ? r.value : c$1(29, r.value, o$1, o$1, o$1, o$1, o$1, [k$1(e, 1), I(e, v$1)], o$1, o$1, o$1, o$1);
}
function nr(e, r, t, n2) {
  return c$1(t ? 11 : 10, e, o$1, o$1, o$1, n2, o$1, o$1, o$1, o$1, Te(r), o$1);
}
function or(e, r, t, n2) {
  return c$1(8, r, o$1, o$1, o$1, o$1, { k: t, v: n2 }, o$1, k$1(e, 0), o$1, o$1, o$1);
}
function zt(e, r, t) {
  return c$1(22, r, t, o$1, o$1, o$1, o$1, o$1, k$1(e, 1), o$1, o$1, o$1);
}
function ar(e, r, t) {
  let n2 = new Uint8Array(t), a = "";
  for (let s = 0, i2 = n2.length; s < i2; s++) a += String.fromCharCode(n2[s]);
  return c$1(19, r, y$1(btoa(a)), o$1, o$1, o$1, o$1, o$1, k$1(e, 5), o$1, o$1, o$1);
}
var oe$1 = ((t) => (t[t.Vanilla = 1] = "Vanilla", t[t.Cross = 2] = "Cross", t))(oe$1 || {});
function ai(e) {
  return e;
}
function Dt(e, r) {
  for (let t = 0, n2 = r.length; t < n2; t++) {
    let a = r[t];
    e.has(a) || (e.add(a), a.extends && Dt(e, a.extends));
  }
}
function A$1(e) {
  if (e) {
    let r = /* @__PURE__ */ new Set();
    return Dt(r, e), [...r];
  }
}
function Ft(e) {
  switch (e) {
    case "Int8Array":
      return Int8Array;
    case "Int16Array":
      return Int16Array;
    case "Int32Array":
      return Int32Array;
    case "Uint8Array":
      return Uint8Array;
    case "Uint16Array":
      return Uint16Array;
    case "Uint32Array":
      return Uint32Array;
    case "Uint8ClampedArray":
      return Uint8ClampedArray;
    case "Float32Array":
      return Float32Array;
    case "Float64Array":
      return Float64Array;
    case "BigInt64Array":
      return BigInt64Array;
    case "BigUint64Array":
      return BigUint64Array;
    default:
      throw new Je(e);
  }
}
var jn = 1e6, Yn = 1e4, qn = 2e4;
function Vt(e, r) {
  switch (r) {
    case 3:
      return Object.freeze(e);
    case 1:
      return Object.preventExtensions(e);
    case 2:
      return Object.seal(e);
    default:
      return e;
  }
}
var Wn = 1e3;
function Mt(e, r) {
  var n2;
  let t = r.refs || /* @__PURE__ */ new Map();
  return "types" in t || Object.assign(t, { types: /* @__PURE__ */ new Map() }), { mode: e, plugins: r.plugins, refs: t, features: (n2 = r.features) != null ? n2 : 63 ^ (r.disabledFeatures || 0), depthLimit: r.depthLimit || Wn };
}
function Ut(e) {
  return { mode: 2, base: Mt(2, e), child: o$1 };
}
var Fr = class {
  constructor(r, t) {
    this._p = r;
    this.depth = t;
  }
  deserialize(r) {
    return p$1(this._p, this.depth, r);
  }
};
function jt(e, r) {
  if (r < 0 || !Number.isFinite(r) || !Number.isInteger(r)) throw new O$1({ t: 4, i: r });
  if (e.refs.has(r)) throw new Error("Conflicted ref id: " + r);
}
function Gn(e, r, t) {
  return jt(e.base, r), e.state.marked.has(r) && e.base.refs.set(r, t), t;
}
function Kn(e, r, t) {
  return jt(e.base, r), e.base.refs.set(r, t), t;
}
function b(e, r, t) {
  return e.mode === 1 ? Gn(e, r, t) : Kn(e, r, t);
}
function Br(e, r, t) {
  if (Object.hasOwn(r, t)) return r[t];
  throw new O$1(e);
}
function Hn(e, r) {
  return b(e, r.i, St(D$1(r.s)));
}
function Jn(e, r, t) {
  let n2 = t.a, a = n2.length, s = b(e, t.i, new Array(a));
  for (let i2 = 0, u2; i2 < a; i2++) u2 = n2[i2], u2 && (s[i2] = p$1(e, r, u2));
  return Vt(s, t.o), s;
}
function Zn(e) {
  switch (e) {
    case "constructor":
    case "__proto__":
    case "prototype":
    case "__defineGetter__":
    case "__defineSetter__":
    case "__lookupGetter__":
    case "__lookupSetter__":
      return false;
    default:
      return true;
  }
}
function $n(e) {
  switch (e) {
    case v$1:
    case R:
    case P$1:
    case C:
      return true;
    default:
      return false;
  }
}
function Bt(e, r, t) {
  Zn(r) ? e[r] = t : Object.defineProperty(e, r, { value: t, configurable: true, enumerable: true, writable: true });
}
function Xn(e, r, t, n2, a) {
  if (typeof n2 == "string") Bt(t, D$1(n2), p$1(e, r, a));
  else {
    let s = p$1(e, r, n2);
    switch (typeof s) {
      case "string":
        Bt(t, s, p$1(e, r, a));
        break;
      case "symbol":
        $n(s) && (t[s] = p$1(e, r, a));
        break;
      default:
        throw new O$1(n2);
    }
  }
}
function Yt(e, r, t) {
  e.base.refs.types.set(r, t);
}
function de$1(e, r, t, n2) {
  if (e.base.refs.types.get(t) !== n2) throw new O$1(r);
}
function qt(e, r, t, n2) {
  let a = t.k;
  if (a.length > 0) for (let i2 = 0, u2 = t.v, l2 = a.length; i2 < l2; i2++) Xn(e, r, n2, a[i2], u2[i2]);
  return n2;
}
function Qn(e, r, t) {
  let n2 = b(e, t.i, t.t === 10 ? {} : /* @__PURE__ */ Object.create(null));
  return qt(e, r, t.p, n2), Vt(n2, t.o), n2;
}
function eo(e, r) {
  return b(e, r.i, new Date(r.s));
}
function ro(e, r) {
  if (e.base.features & 32) {
    let t = D$1(r.c);
    if (t.length > qn) throw new O$1(r);
    return b(e, r.i, new RegExp(t, r.m));
  }
  throw new h$1(r);
}
function to(e, r, t) {
  let n2 = b(e, t.i, /* @__PURE__ */ new Set());
  for (let a = 0, s = t.a, i2 = s.length; a < i2; a++) n2.add(p$1(e, r, s[a]));
  return n2;
}
function no(e, r, t) {
  let n2 = b(e, t.i, /* @__PURE__ */ new Map());
  for (let a = 0, s = t.e.k, i2 = t.e.v, u2 = s.length; a < u2; a++) n2.set(p$1(e, r, s[a]), p$1(e, r, i2[a]));
  return n2;
}
function oo(e, r) {
  if (r.s.length > jn) throw new O$1(r);
  return b(e, r.i, Or(D$1(r.s)));
}
function ao(e, r, t) {
  var u2;
  let n2 = Ft(t.c), a = p$1(e, r, t.f), s = (u2 = t.b) != null ? u2 : 0;
  if (s < 0 || s > a.byteLength) throw new O$1(t);
  return b(e, t.i, new n2(a, s, t.l));
}
function so(e, r, t) {
  var i2;
  let n2 = p$1(e, r, t.f), a = (i2 = t.b) != null ? i2 : 0;
  if (a < 0 || a > n2.byteLength) throw new O$1(t);
  return b(e, t.i, new DataView(n2, a, t.l));
}
function Wt(e, r, t, n2) {
  if (t.p) {
    let a = qt(e, r, t.p, {});
    Object.defineProperties(n2, Object.getOwnPropertyDescriptors(a));
  }
  return n2;
}
function io(e, r, t) {
  let n2 = b(e, t.i, new AggregateError([], D$1(t.m)));
  return Wt(e, r, t, n2);
}
function uo(e, r, t) {
  let n2 = Br(t, st, t.s), a = b(e, t.i, new n2(D$1(t.m)));
  return Wt(e, r, t, a);
}
function lo(e, r, t) {
  let n2 = ee$1(), a = b(e, t.i, n2.p), s = p$1(e, r, t.f);
  return t.s ? n2.s(s) : n2.f(s), a;
}
function co(e, r, t) {
  return b(e, t.i, Object(p$1(e, r, t.f)));
}
function fo(e, r, t) {
  let n2 = e.base.plugins;
  if (n2) {
    let a = D$1(t.c);
    for (let s = 0, i2 = n2.length; s < i2; s++) {
      let u2 = n2[s];
      if (u2.tag === a) return b(e, t.i, u2.deserialize(t.s, new Fr(e, r), { id: t.i }));
    }
  }
  throw new X(t.c);
}
function So(e, r) {
  let t = b(e, r.i, b(e, r.s, ee$1()).p);
  return Yt(e, r.s, 22), t;
}
function mo(e, r, t) {
  let n2 = e.base.refs.get(t.i);
  if (n2) return de$1(e, t, t.i, 22), n2.s(p$1(e, r, t.a[1])), o$1;
  throw new V$1("Promise");
}
function po(e, r, t) {
  let n2 = e.base.refs.get(t.i);
  if (n2) return de$1(e, t, t.i, 22), n2.f(p$1(e, r, t.a[1])), o$1;
  throw new V$1("Promise");
}
function go(e, r, t) {
  p$1(e, r, t.a[0]);
  let n2 = p$1(e, r, t.a[1]);
  return Rt(n2);
}
function yo(e, r, t) {
  p$1(e, r, t.a[0]);
  let n2 = p$1(e, r, t.a[1]);
  return wt(n2);
}
function No(e, r, t) {
  let n2 = b(e, t.i, re());
  Yt(e, t.i, 31);
  let a = t.a, s = a.length;
  if (s) for (let i2 = 0; i2 < s; i2++) p$1(e, r, a[i2]);
  return n2;
}
function bo(e, r, t) {
  let n2 = e.base.refs.get(t.i);
  if (n2) return de$1(e, t, t.i, 31), n2.next(p$1(e, r, t.f)), o$1;
  throw new V$1("Stream");
}
function vo(e, r, t) {
  let n2 = e.base.refs.get(t.i);
  if (n2) return de$1(e, t, t.i, 31), n2.throw(p$1(e, r, t.f)), o$1;
  throw new V$1("Stream");
}
function Co(e, r, t) {
  let n2 = e.base.refs.get(t.i);
  if (n2) return de$1(e, t, t.i, 31), n2.return(p$1(e, r, t.f)), o$1;
  throw new V$1("Stream");
}
function Ao(e, r, t) {
  return p$1(e, r, t.f), o$1;
}
function Eo(e, r, t) {
  return p$1(e, r, t.a[1]), o$1;
}
function Io(e, r, t) {
  let n2 = b(e, t.i, wr([], t.s, t.l));
  for (let a = 0, s = t.a.length; a < s; a++) n2.v[a] = p$1(e, r, t.a[a]);
  return n2;
}
function p$1(e, r, t) {
  if (r > e.base.depthLimit) throw new Q(e.base.depthLimit);
  switch (r += 1, t.t) {
    case 2:
      return Br(t, at, t.s);
    case 0:
      return Number(t.s);
    case 1:
      return D$1(String(t.s));
    case 3:
      if (String(t.s).length > Yn) throw new O$1(t);
      return BigInt(t.s);
    case 4:
      return e.base.refs.get(t.i);
    case 18:
      return Hn(e, t);
    case 9:
      return Jn(e, r, t);
    case 10:
    case 11:
      return Qn(e, r, t);
    case 5:
      return eo(e, t);
    case 6:
      return ro(e, t);
    case 7:
      return to(e, r, t);
    case 8:
      return no(e, r, t);
    case 19:
      return oo(e, t);
    case 16:
    case 15:
      return ao(e, r, t);
    case 20:
      return so(e, r, t);
    case 14:
      return io(e, r, t);
    case 13:
      return uo(e, r, t);
    case 12:
      return lo(e, r, t);
    case 17:
      return Br(t, nt, t.s);
    case 21:
      return co(e, r, t);
    case 25:
      return fo(e, r, t);
    case 22:
      return So(e, t);
    case 23:
      return mo(e, r, t);
    case 24:
      return po(e, r, t);
    case 28:
      return go(e, r, t);
    case 30:
      return yo(e, r, t);
    case 31:
      return No(e, r, t);
    case 32:
      return bo(e, r, t);
    case 33:
      return vo(e, r, t);
    case 34:
      return Co(e, r, t);
    case 27:
      return Ao(e, r, t);
    case 29:
      return Eo(e, r, t);
    case 35:
      return Io(e, r, t);
    default:
      throw new h$1(t);
  }
}
function sr(e, r) {
  try {
    return p$1(e, 0, r);
  } catch (t) {
    throw new He(t);
  }
}
var Ro = () => T, Po = Ro.toString(), Gt = /=>/.test(Po);
function ir(e, r) {
  return Gt ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>" + (r.startsWith("{") ? "(" + r + ")" : r) : "function(" + e.join(",") + "){return " + r + "}";
}
function Kt(e, r) {
  return Gt ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>{" + r + "}" : "function(" + e.join(",") + "){" + r + "}";
}
var Zt = "hjkmoquxzABCDEFGHIJKLNPQRTUVWXYZ$_", Ht = Zt.length, $t = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$_", Jt = $t.length;
function Vr(e) {
  let r = e % Ht, t = Zt[r];
  for (e = (e - r) / Ht; e > 0; ) r = e % Jt, t += $t[r], e = (e - r) / Jt;
  return t;
}
var xo = /^[$A-Z_][0-9A-Z_$]*$/i;
function Mr(e) {
  let r = e[0];
  return (r === "$" || r === "_" || r >= "A" && r <= "Z" || r >= "a" && r <= "z") && xo.test(e);
}
function ye(e) {
  switch (e.t) {
    case 0:
      return e.s + "=" + e.v;
    case 2:
      return e.s + ".set(" + e.k + "," + e.v + ")";
    case 1:
      return e.s + ".add(" + e.v + ")";
    case 3:
      return e.s + ".delete(" + e.k + ")";
  }
}
function To(e) {
  let r = [], t = e[0];
  for (let n2 = 1, a = e.length, s, i2 = t; n2 < a; n2++) s = e[n2], s.t === 0 && s.v === i2.v ? t = { t: 0, s: s.s, k: o$1, v: ye(t) } : s.t === 2 && s.s === i2.s ? t = { t: 2, s: ye(t), k: s.k, v: s.v } : s.t === 1 && s.s === i2.s ? t = { t: 1, s: ye(t), k: o$1, v: s.v } : s.t === 3 && s.s === i2.s ? t = { t: 3, s: ye(t), k: s.k, v: o$1 } : (r.push(t), t = s), i2 = s;
  return r.push(t), r;
}
function on(e) {
  if (e.length) {
    let r = "", t = To(e);
    for (let n2 = 0, a = t.length; n2 < a; n2++) r += ye(t[n2]) + ",";
    return r;
  }
  return o$1;
}
var Oo = "Object.create(null)", wo = "new Set", ho = "new Map", zo = "Promise.resolve", _o = "Promise.reject", ko = { 3: "Object.freeze", 2: "Object.seal", 1: "Object.preventExtensions", 0: o$1 };
function an(e, r) {
  return { mode: e, plugins: r.plugins, features: r.features, marked: new Set(r.markedRefs), stack: [], flags: [], assignments: [] };
}
function lr(e) {
  return { mode: 2, base: an(2, e), state: e, child: o$1 };
}
var Lr = class {
  constructor(r) {
    this._p = r;
  }
  serialize(r) {
    return f$1(this._p, r);
  }
};
function Fo(e, r) {
  let t = e.valid.get(r);
  t == null && (t = e.valid.size, e.valid.set(r, t));
  let n2 = e.vars[t];
  return n2 == null && (n2 = Vr(t), e.vars[t] = n2), n2;
}
function Bo(e) {
  return le$1 + "[" + e + "]";
}
function m$1(e, r) {
  return e.mode === 1 ? Fo(e.state, r) : Bo(r);
}
function w$1(e, r) {
  e.marked.add(r);
}
function Ur(e, r) {
  return e.marked.has(r);
}
function Yr(e, r, t) {
  r !== 0 && (w$1(e.base, t), e.base.flags.push({ type: r, value: m$1(e, t) }));
}
function Vo(e) {
  let r = "";
  for (let t = 0, n2 = e.flags, a = n2.length; t < a; t++) {
    let s = n2[t];
    r += ko[s.type] + "(" + s.value + "),";
  }
  return r;
}
function sn(e) {
  let r = on(e.assignments), t = Vo(e);
  return r ? t ? r + t : r : t;
}
function qr(e, r, t) {
  e.assignments.push({ t: 0, s: r, k: o$1, v: t });
}
function Mo(e, r, t) {
  e.base.assignments.push({ t: 1, s: m$1(e, r), k: o$1, v: t });
}
function ge(e, r, t, n2) {
  e.base.assignments.push({ t: 2, s: m$1(e, r), k: t, v: n2 });
}
function Xt(e, r, t) {
  e.base.assignments.push({ t: 3, s: m$1(e, r), k: t, v: o$1 });
}
function Ne(e, r, t, n2) {
  qr(e.base, m$1(e, r) + "[" + t + "]", n2);
}
function jr(e, r, t, n2) {
  qr(e.base, m$1(e, r) + "." + t, n2);
}
function Lo(e, r, t, n2) {
  qr(e.base, m$1(e, r) + ".v[" + t + "]", n2);
}
function F$1(e, r) {
  return r.t === 4 && e.stack.includes(r.i);
}
function ae$1(e, r, t) {
  return e.mode === 1 && !Ur(e.base, r) ? t : m$1(e, r) + "=" + t;
}
function Uo(e) {
  return L$1 + '.get("' + e.s + '")';
}
function Qt(e, r, t, n2) {
  return t ? F$1(e.base, t) ? (w$1(e.base, r), Ne(e, r, n2, m$1(e, t.i)), "") : f$1(e, t) : "";
}
function jo(e, r) {
  let t = r.i, n2 = r.a, a = n2.length;
  if (a > 0) {
    e.base.stack.push(t);
    let s = Qt(e, t, n2[0], 0), i2 = s === "";
    for (let u2 = 1, l2; u2 < a; u2++) l2 = Qt(e, t, n2[u2], u2), s += "," + l2, i2 = l2 === "";
    return e.base.stack.pop(), Yr(e, r.o, r.i), "[" + s + (i2 ? ",]" : "]");
  }
  return "[]";
}
function en(e, r, t, n2) {
  if (typeof t == "string") {
    let a = Number(t), s = a >= 0 && a.toString() === t || Mr(t);
    if (F$1(e.base, n2)) {
      let i2 = m$1(e, n2.i);
      return w$1(e.base, r.i), s && a !== a ? jr(e, r.i, t, i2) : Ne(e, r.i, s ? t : '"' + t + '"', i2), "";
    }
    return (s ? t : '"' + t + '"') + ":" + f$1(e, n2);
  }
  return "[" + f$1(e, t) + "]:" + f$1(e, n2);
}
function un(e, r, t) {
  let n2 = t.k, a = n2.length;
  if (a > 0) {
    let s = t.v;
    e.base.stack.push(r.i);
    let i2 = en(e, r, n2[0], s[0]);
    for (let u2 = 1, l2 = i2; u2 < a; u2++) l2 = en(e, r, n2[u2], s[u2]), i2 += (l2 && i2 && ",") + l2;
    return e.base.stack.pop(), "{" + i2 + "}";
  }
  return "{}";
}
function Yo(e, r) {
  return Yr(e, r.o, r.i), un(e, r, r.p);
}
function qo(e, r, t, n2) {
  let a = un(e, r, t);
  return a !== "{}" ? "Object.assign(" + n2 + "," + a + ")" : n2;
}
function Wo(e, r, t, n2, a) {
  let s = e.base, i2 = f$1(e, a), u2 = Number(n2), l2 = u2 >= 0 && u2.toString() === n2 || Mr(n2);
  if (F$1(s, a)) l2 && u2 !== u2 ? jr(e, r.i, n2, i2) : Ne(e, r.i, l2 ? n2 : '"' + n2 + '"', i2);
  else {
    let g2 = s.assignments;
    s.assignments = t, l2 && u2 !== u2 ? jr(e, r.i, n2, i2) : Ne(e, r.i, l2 ? n2 : '"' + n2 + '"', i2), s.assignments = g2;
  }
}
function Go(e, r, t, n2, a) {
  if (typeof n2 == "string") Wo(e, r, t, n2, a);
  else {
    let s = e.base, i2 = s.stack;
    s.stack = [];
    let u2 = f$1(e, a);
    s.stack = i2;
    let l2 = s.assignments;
    s.assignments = t, Ne(e, r.i, f$1(e, n2), u2), s.assignments = l2;
  }
}
function Ko(e, r, t) {
  let n2 = t.k, a = n2.length;
  if (a > 0) {
    let s = [], i2 = t.v;
    e.base.stack.push(r.i);
    for (let u2 = 0; u2 < a; u2++) Go(e, r, s, n2[u2], i2[u2]);
    return e.base.stack.pop(), on(s);
  }
  return o$1;
}
function Wr(e, r, t) {
  if (r.p) {
    let n2 = e.base;
    if (n2.features & 8) t = qo(e, r, r.p, t);
    else {
      w$1(n2, r.i);
      let a = Ko(e, r, r.p);
      if (a) return "(" + ae$1(e, r.i, t) + "," + a + m$1(e, r.i) + ")";
    }
  }
  return t;
}
function Ho(e, r) {
  return Yr(e, r.o, r.i), Wr(e, r, Oo);
}
function Jo(e) {
  return 'new Date("' + e.s + '")';
}
function Zo(e, r) {
  if (e.base.features & 32) return "/" + r.c + "/" + r.m;
  throw new h$1(r);
}
function rn(e, r, t) {
  let n2 = e.base;
  return F$1(n2, t) ? (w$1(n2, r), Mo(e, r, m$1(e, t.i)), "") : f$1(e, t);
}
function $o(e, r) {
  let t = wo, n2 = r.a, a = n2.length, s = r.i;
  if (a > 0) {
    e.base.stack.push(s);
    let i2 = rn(e, s, n2[0]);
    for (let u2 = 1, l2 = i2; u2 < a; u2++) l2 = rn(e, s, n2[u2]), i2 += (l2 && i2 && ",") + l2;
    e.base.stack.pop(), i2 && (t += "([" + i2 + "])");
  }
  return t;
}
function tn(e, r, t, n2, a) {
  let s = e.base;
  if (F$1(s, t)) {
    let i2 = m$1(e, t.i);
    if (w$1(s, r), F$1(s, n2)) {
      let l2 = m$1(e, n2.i);
      return ge(e, r, i2, l2), "";
    }
    if (n2.t !== 4 && n2.i != null && Ur(s, n2.i)) {
      let l2 = "(" + f$1(e, n2) + ",[" + a + "," + a + "])";
      return ge(e, r, i2, m$1(e, n2.i)), Xt(e, r, a), l2;
    }
    let u2 = s.stack;
    return s.stack = [], ge(e, r, i2, f$1(e, n2)), s.stack = u2, "";
  }
  if (F$1(s, n2)) {
    let i2 = m$1(e, n2.i);
    if (w$1(s, r), t.t !== 4 && t.i != null && Ur(s, t.i)) {
      let l2 = "(" + f$1(e, t) + ",[" + a + "," + a + "])";
      return ge(e, r, m$1(e, t.i), i2), Xt(e, r, a), l2;
    }
    let u2 = s.stack;
    return s.stack = [], ge(e, r, f$1(e, t), i2), s.stack = u2, "";
  }
  return "[" + f$1(e, t) + "," + f$1(e, n2) + "]";
}
function Xo(e, r) {
  let t = ho, n2 = r.e.k, a = n2.length, s = r.i, i2 = r.f, u2 = m$1(e, i2.i), l2 = e.base;
  if (a > 0) {
    let g2 = r.e.v;
    l2.stack.push(s);
    let S = tn(e, s, n2[0], g2[0], u2);
    for (let d2 = 1, G2 = S; d2 < a; d2++) G2 = tn(e, s, n2[d2], g2[d2], u2), S += (G2 && S && ",") + G2;
    l2.stack.pop(), S && (t += "([" + S + "])");
  }
  return i2.t === 26 && (w$1(l2, i2.i), t = "(" + f$1(e, i2) + "," + t + ")"), t;
}
function Qo(e, r) {
  return q$1(e, r.f) + '("' + r.s + '")';
}
function ea(e, r) {
  return "new " + r.c + "(" + f$1(e, r.f) + "," + r.b + "," + r.l + ")";
}
function ra(e, r) {
  return "new DataView(" + f$1(e, r.f) + "," + r.b + "," + r.l + ")";
}
function ta(e, r) {
  let t = r.i;
  e.base.stack.push(t);
  let n2 = Wr(e, r, 'new AggregateError([],"' + r.m + '")');
  return e.base.stack.pop(), n2;
}
function na(e, r) {
  return Wr(e, r, "new " + Ce[r.s] + '("' + r.m + '")');
}
function oa(e, r) {
  let t, n2 = r.f, a = r.i, s = r.s ? zo : _o, i2 = e.base;
  if (F$1(i2, n2)) {
    let u2 = m$1(e, n2.i);
    t = s + (r.s ? "().then(" + ir([], u2) + ")" : "().catch(" + Kt([], "throw " + u2) + ")");
  } else {
    i2.stack.push(a);
    let u2 = f$1(e, n2);
    i2.stack.pop(), t = s + "(" + u2 + ")";
  }
  return t;
}
function aa(e, r) {
  return "Object(" + f$1(e, r.f) + ")";
}
function q$1(e, r) {
  let t = f$1(e, r);
  return r.t === 4 ? t : "(" + t + ")";
}
function sa(e, r) {
  if (e.mode === 1) throw new h$1(r);
  return "(" + ae$1(e, r.s, q$1(e, r.f) + "()") + ").p";
}
function ia(e, r) {
  if (e.mode === 1) throw new h$1(r);
  return q$1(e, r.a[0]) + "(" + m$1(e, r.i) + "," + f$1(e, r.a[1]) + ")";
}
function ua(e, r) {
  if (e.mode === 1) throw new h$1(r);
  return q$1(e, r.a[0]) + "(" + m$1(e, r.i) + "," + f$1(e, r.a[1]) + ")";
}
function la(e, r) {
  let t = e.base.plugins;
  if (t) for (let n2 = 0, a = t.length; n2 < a; n2++) {
    let s = t[n2];
    if (s.tag === r.c) return e.child == null && (e.child = new Lr(e)), s.serialize(r.s, e.child, { id: r.i });
  }
  throw new X(r.c);
}
function ca(e, r) {
  let t = "", n2 = false;
  return r.f.t !== 4 && (w$1(e.base, r.f.i), t = "(" + f$1(e, r.f) + ",", n2 = true), t += ae$1(e, r.i, "(" + At + ")(" + m$1(e, r.f.i) + ")"), n2 && (t += ")"), t;
}
function fa(e, r) {
  return q$1(e, r.a[0]) + "(" + f$1(e, r.a[1]) + ")";
}
function Sa(e, r) {
  let t = r.a[0], n2 = r.a[1], a = e.base, s = "";
  t.t !== 4 && (w$1(a, t.i), s += "(" + f$1(e, t)), n2.t !== 4 && (w$1(a, n2.i), s += (s ? "," : "(") + f$1(e, n2)), s && (s += ",");
  let i2 = ae$1(e, r.i, "(" + Et + ")(" + m$1(e, n2.i) + "," + m$1(e, t.i) + ")");
  return s ? s + i2 + ")" : i2;
}
function ma(e, r) {
  return q$1(e, r.a[0]) + "(" + f$1(e, r.a[1]) + ")";
}
function pa(e, r) {
  let t = ae$1(e, r.i, q$1(e, r.f) + "()"), n2 = r.a.length;
  if (n2) {
    let a = f$1(e, r.a[0]);
    for (let s = 1; s < n2; s++) a += "," + f$1(e, r.a[s]);
    return "(" + t + "," + a + "," + m$1(e, r.i) + ")";
  }
  return t;
}
function da(e, r) {
  return m$1(e, r.i) + ".next(" + f$1(e, r.f) + ")";
}
function ga(e, r) {
  return m$1(e, r.i) + ".throw(" + f$1(e, r.f) + ")";
}
function ya(e, r) {
  return m$1(e, r.i) + ".return(" + f$1(e, r.f) + ")";
}
function nn(e, r, t, n2) {
  let a = e.base;
  return F$1(a, n2) ? (w$1(a, r), Lo(e, r, t, m$1(e, n2.i)), "") : f$1(e, n2);
}
function Na(e, r) {
  let t = r.a, n2 = t.length, a = r.i;
  if (n2 > 0) {
    e.base.stack.push(a);
    let s = nn(e, a, 0, t[0]);
    for (let i2 = 1, u2 = s; i2 < n2; i2++) u2 = nn(e, a, i2, t[i2]), s += (u2 && s && ",") + u2;
    if (e.base.stack.pop(), s) return "{__SEROVAL_SEQUENCE__:!0,v:[" + s + "],t:" + r.s + ",d:" + r.l + "}";
  }
  return "{__SEROVAL_SEQUENCE__:!0,v:[],t:-1,d:0}";
}
function ba(e, r) {
  switch (r.t) {
    case 17:
      return tt[r.s];
    case 18:
      return Uo(r);
    case 9:
      return jo(e, r);
    case 10:
      return Yo(e, r);
    case 11:
      return Ho(e, r);
    case 5:
      return Jo(r);
    case 6:
      return Zo(e, r);
    case 7:
      return $o(e, r);
    case 8:
      return Xo(e, r);
    case 19:
      return Qo(e, r);
    case 16:
    case 15:
      return ea(e, r);
    case 20:
      return ra(e, r);
    case 14:
      return ta(e, r);
    case 13:
      return na(e, r);
    case 12:
      return oa(e, r);
    case 21:
      return aa(e, r);
    case 22:
      return sa(e, r);
    case 25:
      return la(e, r);
    case 26:
      return Ot[r.s];
    case 35:
      return Na(e, r);
    default:
      throw new h$1(r);
  }
}
function f$1(e, r) {
  switch (r.t) {
    case 2:
      return ot[r.s];
    case 0:
      return "" + r.s;
    case 1:
      return '"' + r.s + '"';
    case 3:
      return r.s + "n";
    case 4:
      return m$1(e, r.i);
    case 23:
      return ia(e, r);
    case 24:
      return ua(e, r);
    case 27:
      return ca(e, r);
    case 28:
      return fa(e, r);
    case 29:
      return Sa(e, r);
    case 30:
      return ma(e, r);
    case 31:
      return pa(e, r);
    case 32:
      return da(e, r);
    case 33:
      return ga(e, r);
    case 34:
      return ya(e, r);
    default:
      return ae$1(e, r.i, ba(e, r));
  }
}
function fr(e, r) {
  let t = f$1(e, r), n2 = r.i;
  if (n2 == null) return t;
  let a = sn(e.base), s = m$1(e, n2), i2 = e.state.scopeId, u2 = i2 == null ? "" : le$1, l2 = a ? "(" + t + "," + a + s + ")" : t;
  if (u2 === "") return r.t === 10 && !a ? "(" + l2 + ")" : l2;
  let g2 = i2 == null ? "()" : "(" + le$1 + '["' + y$1(i2) + '"])';
  return "(" + ir([u2], l2) + ")" + g2;
}
var Kr = class {
  constructor(r, t) {
    this._p = r;
    this.depth = t;
  }
  parse(r) {
    return E$1(this._p, this.depth, r);
  }
}, Hr = class {
  constructor(r, t) {
    this._p = r;
    this.depth = t;
  }
  parse(r) {
    return E$1(this._p, this.depth, r);
  }
  parseWithError(r) {
    return W$1(this._p, this.depth, r);
  }
  isAlive() {
    return this._p.state.alive;
  }
  pushPendingState() {
    Qr(this._p);
  }
  popPendingState() {
    be(this._p);
  }
  onParse(r) {
    se(this._p, r);
  }
  onError(r) {
    $r(this._p, r);
  }
};
function va(e) {
  return { alive: true, pending: 0, initial: true, buffer: [], onParse: e.onParse, onError: e.onError, onDone: e.onDone };
}
function Jr(e) {
  return { type: 2, base: me(2, e), state: va(e) };
}
function Ca(e, r, t) {
  let n2 = [];
  for (let a = 0, s = t.length; a < s; a++) a in t ? n2[a] = E$1(e, r, t[a]) : n2[a] = 0;
  return n2;
}
function Aa(e, r, t, n2) {
  return _e(t, n2, Ca(e, r, n2));
}
function Zr(e, r, t) {
  let n2 = Object.entries(t), a = [], s = [];
  for (let i2 = 0, u2 = n2.length; i2 < u2; i2++) a.push(y$1(n2[i2][0])), s.push(E$1(e, r, n2[i2][1]));
  return C in t && (a.push(I(e.base, C)), s.push(Ue(rr(e.base), E$1(e, r, $e(t))))), v$1 in t && (a.push(I(e.base, v$1)), s.push(je(tr(e.base), E$1(e, r, e.type === 1 ? re() : Qe(t))))), P$1 in t && (a.push(I(e.base, P$1)), s.push($(t[P$1]))), R in t && (a.push(I(e.base, R)), s.push(t[R] ? H : J$1)), { k: a, v: s };
}
function Gr(e, r, t, n2, a) {
  return nr(t, n2, a, Zr(e, r, n2));
}
function Ea(e, r, t, n2) {
  return ke(t, E$1(e, r, n2.valueOf()));
}
function Ia(e, r, t, n2) {
  return De(t, n2, E$1(e, r, n2.buffer));
}
function Ra(e, r, t, n2) {
  return Fe(t, n2, E$1(e, r, n2.buffer));
}
function Pa(e, r, t, n2) {
  return Be(t, n2, E$1(e, r, n2.buffer));
}
function ln(e, r, t, n2) {
  let a = Z(n2, e.base.features);
  return Ve(t, n2, a ? Zr(e, r, a) : o$1);
}
function xa(e, r, t, n2) {
  let a = Z(n2, e.base.features);
  return Me(t, n2, a ? Zr(e, r, a) : o$1);
}
function Ta(e, r, t, n2) {
  let a = [], s = [];
  for (let [i2, u2] of n2.entries()) a.push(E$1(e, r, i2)), s.push(E$1(e, r, u2));
  return or(e.base, t, a, s);
}
function Oa(e, r, t, n2) {
  let a = [];
  for (let s of n2.keys()) a.push(E$1(e, r, s));
  return Le(t, a);
}
function wa(e, r, t, n2) {
  let a = Ye(t, k$1(e.base, 4), []);
  return e.type === 1 || (Qr(e), n2.on({ next: (s) => {
    if (e.state.alive) {
      let i2 = W$1(e, r, s);
      i2 && se(e, qe(t, i2));
    }
  }, throw: (s) => {
    if (e.state.alive) {
      let i2 = W$1(e, r, s);
      i2 && se(e, We(t, i2));
    }
    be(e);
  }, return: (s) => {
    if (e.state.alive) {
      let i2 = W$1(e, r, s);
      i2 && se(e, Ge(t, i2));
    }
    be(e);
  } })), a;
}
function ha(e, r, t) {
  if (this.state.alive) {
    let n2 = W$1(this, r, t);
    n2 && se(this, c$1(23, e, o$1, o$1, o$1, o$1, o$1, [k$1(this.base, 2), n2], o$1, o$1, o$1, o$1)), be(this);
  }
}
function za(e, r, t) {
  if (this.state.alive) {
    let n2 = W$1(this, r, t);
    n2 && se(this, c$1(24, e, o$1, o$1, o$1, o$1, o$1, [k$1(this.base, 3), n2], o$1, o$1, o$1, o$1));
  }
  be(this);
}
function _a(e, r, t, n2) {
  let a = zr(e.base, {});
  return e.type === 2 && (Qr(e), n2.then(ha.bind(e, a, r), za.bind(e, a, r))), zt(e.base, t, a);
}
function ka(e, r, t, n2, a) {
  for (let s = 0, i2 = a.length; s < i2; s++) {
    let u2 = a[s];
    if (u2.parse.sync && u2.test(n2)) return ce(t, u2.tag, u2.parse.sync(n2, new Kr(e, r), { id: t }));
  }
  return o$1;
}
function Da(e, r, t, n2, a) {
  for (let s = 0, i2 = a.length; s < i2; s++) {
    let u2 = a[s];
    if (u2.parse.stream && u2.test(n2)) return ce(t, u2.tag, u2.parse.stream(n2, new Hr(e, r), { id: t }));
  }
  return o$1;
}
function cn(e, r, t, n2) {
  let a = e.base.plugins;
  return a ? e.type === 1 ? ka(e, r, t, n2, a) : Da(e, r, t, n2, a) : o$1;
}
function Fa(e, r, t, n2) {
  let a = [];
  for (let s = 0, i2 = n2.v.length; s < i2; s++) a[s] = E$1(e, r, n2.v[s]);
  return Ke(t, a, n2.t, n2.d);
}
function Ba(e, r, t, n2, a) {
  switch (a) {
    case Object:
      return Gr(e, r, t, n2, false);
    case o$1:
      return Gr(e, r, t, n2, true);
    case Date:
      return he(t, n2);
    case Error:
    case EvalError:
    case RangeError:
    case ReferenceError:
    case SyntaxError:
    case TypeError:
    case URIError:
      return ln(e, r, t, n2);
    case Number:
    case Boolean:
    case String:
    case BigInt:
      return Ea(e, r, t, n2);
    case ArrayBuffer:
      return ar(e.base, t, n2);
    case Int8Array:
    case Int16Array:
    case Int32Array:
    case Uint8Array:
    case Uint16Array:
    case Uint32Array:
    case Uint8ClampedArray:
    case Float32Array:
    case Float64Array:
      return Ia(e, r, t, n2);
    case DataView:
      return Pa(e, r, t, n2);
    case Map:
      return Ta(e, r, t, n2);
    case Set:
      return Oa(e, r, t, n2);
  }
  if (a === Promise || n2 instanceof Promise) return _a(e, r, t, n2);
  let s = e.base.features;
  if (s & 32 && a === RegExp) return ze(t, n2);
  if (s & 16) switch (a) {
    case BigInt64Array:
    case BigUint64Array:
      return Ra(e, r, t, n2);
  }
  if (s & 1 && typeof AggregateError != "undefined" && (a === AggregateError || n2 instanceof AggregateError)) return xa(e, r, t, n2);
  if (n2 instanceof Error) return ln(e, r, t, n2);
  if (C in n2 || v$1 in n2) return Gr(e, r, t, n2, !!a);
  throw new x$1(n2);
}
function Va(e, r, t, n2) {
  if (Array.isArray(n2)) return Aa(e, r, t, n2);
  if (Xe(n2)) return wa(e, r, t, n2);
  if (Ze(n2)) return Fa(e, r, t, n2);
  let a = n2.constructor;
  if (a === j) return E$1(e, r, n2.replacement);
  let s = cn(e, r, t, n2);
  return s || Ba(e, r, t, n2, a);
}
function Ma(e, r, t) {
  let n2 = Y$1(e.base, t);
  if (n2.type !== 0) return n2.value;
  let a = cn(e, r, n2.value, t);
  if (a) return a;
  throw new x$1(t);
}
function E$1(e, r, t) {
  if (r >= e.base.depthLimit) throw new Q(e.base.depthLimit);
  switch (typeof t) {
    case "boolean":
      return t ? H : J$1;
    case "undefined":
      return Ae;
    case "string":
      return $(t);
    case "number":
      return Oe(t);
    case "bigint":
      return we(t);
    case "object": {
      if (t) {
        let n2 = Y$1(e.base, t);
        return n2.type === 0 ? Va(e, r + 1, n2.value, t) : n2.value;
      }
      return Ee;
    }
    case "symbol":
      return I(e.base, t);
    case "function":
      return Ma(e, r, t);
    default:
      throw new x$1(t);
  }
}
function se(e, r) {
  e.state.initial ? e.state.buffer.push(r) : Xr(e, r, false);
}
function $r(e, r) {
  if (e.state.onError) e.state.onError(r);
  else throw r instanceof z ? r : new z(r);
}
function fn(e) {
  e.state.onDone && e.state.onDone();
}
function Xr(e, r, t) {
  try {
    e.state.onParse(r, t);
  } catch (n2) {
    $r(e, n2);
  }
}
function Qr(e) {
  e.state.pending++;
}
function be(e) {
  --e.state.pending <= 0 && fn(e);
}
function W$1(e, r, t) {
  try {
    return E$1(e, r, t);
  } catch (n2) {
    return $r(e, n2), o$1;
  }
}
function et(e, r) {
  let t = W$1(e, 0, r);
  t && (Xr(e, t, true), e.state.initial = false, La(e, e.state), e.state.pending <= 0 && Sr(e));
}
function La(e, r) {
  for (let t = 0, n2 = r.buffer.length; t < n2; t++) Xr(e, r.buffer[t], false);
}
function Sr(e) {
  e.state.alive && (fn(e), e.state.alive = false);
}
function Sn(e, r) {
  let t = A$1(r.plugins), n2 = Jr({ plugins: t, refs: r.refs, disabledFeatures: r.disabledFeatures, onParse(a, s) {
    let i2 = lr({ plugins: t, features: n2.base.features, scopeId: r.scopeId, markedRefs: n2.base.marked }), u2;
    try {
      u2 = fr(i2, a);
    } catch (l2) {
      r.onError && r.onError(l2);
      return;
    }
    r.onSerialize(u2, s);
  }, onError: r.onError, onDone: r.onDone });
  return et(n2, e), Sr.bind(null, n2);
}
function iu(e, r) {
  let t = A$1(r.plugins), n2 = Jr({ plugins: t, refs: r.refs, disabledFeatures: r.disabledFeatures, depthLimit: r.depthLimit, onParse: r.onParse, onError: r.onError, onDone: r.onDone });
  return et(n2, e), Sr.bind(null, n2);
}
function uu(e, r) {
  let t = A$1(r.plugins), n2 = Ut({ plugins: t, refs: r.refs, features: r.features, disabledFeatures: r.disabledFeatures, depthLimit: r.depthLimit });
  return sr(n2, e);
}
var u = (e) => {
  let r = new AbortController(), a = r.abort.bind(r);
  return e.then(a, a), r;
};
function E(e) {
  e(this.reason);
}
function D(e) {
  this.addEventListener("abort", E.bind(this, e), { once: true });
}
function c(e) {
  return new Promise(D.bind(e));
}
var i = {}, F = ai({ tag: "seroval-plugins/web/AbortControllerFactoryPlugin", test(e) {
  return e === i;
}, parse: { sync() {
  return i;
}, async async() {
  return await Promise.resolve(i);
}, stream() {
  return i;
} }, serialize() {
  return u.toString();
}, deserialize() {
  return u;
} }), A = ai({ tag: "seroval-plugins/web/AbortSignal", extends: [F], test(e) {
  return typeof AbortSignal == "undefined" ? false : e instanceof AbortSignal;
}, parse: { sync(e, r) {
  return e.aborted ? { reason: r.parse(e.reason) } : {};
}, async async(e, r) {
  if (e.aborted) return { reason: await r.parse(e.reason) };
  let a = await c(e);
  return { reason: await r.parse(a) };
}, stream(e, r) {
  if (e.aborted) return { reason: r.parse(e.reason) };
  let a = c(e);
  return { factory: r.parse(i), controller: r.parse(a) };
} }, serialize(e, r) {
  return e.reason ? "AbortSignal.abort(" + r.serialize(e.reason) + ")" : e.controller && e.factory ? "(" + r.serialize(e.factory) + ")(" + r.serialize(e.controller) + ").signal" : "(new AbortController).signal";
}, deserialize(e, r) {
  return e.reason ? AbortSignal.abort(r.deserialize(e.reason)) : e.controller ? u(r.deserialize(e.controller)).signal : new AbortController().signal;
} }), O2 = A;
function d(e) {
  return { detail: e.detail, bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed };
}
var U = ai({ tag: "seroval-plugins/web/CustomEvent", test(e) {
  return typeof CustomEvent == "undefined" ? false : e instanceof CustomEvent;
}, parse: { sync(e, r) {
  return { type: r.parse(e.type), options: r.parse(d(e)) };
}, async async(e, r) {
  return { type: await r.parse(e.type), options: await r.parse(d(e)) };
}, stream(e, r) {
  return { type: r.parse(e.type), options: r.parse(d(e)) };
} }, serialize(e, r) {
  return "new CustomEvent(" + r.serialize(e.type) + "," + r.serialize(e.options) + ")";
}, deserialize(e, r) {
  return new CustomEvent(r.deserialize(e.type), r.deserialize(e.options));
} }), L = U;
var _ = ai({ tag: "seroval-plugins/web/DOMException", test(e) {
  return typeof DOMException == "undefined" ? false : e instanceof DOMException;
}, parse: { sync(e, r) {
  return { name: r.parse(e.name), message: r.parse(e.message) };
}, async async(e, r) {
  return { name: await r.parse(e.name), message: await r.parse(e.message) };
}, stream(e, r) {
  return { name: r.parse(e.name), message: r.parse(e.message) };
} }, serialize(e, r) {
  return "new DOMException(" + r.serialize(e.message) + "," + r.serialize(e.name) + ")";
}, deserialize(e, r) {
  return new DOMException(r.deserialize(e.message), r.deserialize(e.name));
} }), q = _;
function f(e) {
  return { bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed };
}
var k = ai({ tag: "seroval-plugins/web/Event", test(e) {
  return typeof Event == "undefined" ? false : e instanceof Event;
}, parse: { sync(e, r) {
  return { type: r.parse(e.type), options: r.parse(f(e)) };
}, async async(e, r) {
  return { type: await r.parse(e.type), options: await r.parse(f(e)) };
}, stream(e, r) {
  return { type: r.parse(e.type), options: r.parse(f(e)) };
} }, serialize(e, r) {
  return "new Event(" + r.serialize(e.type) + "," + r.serialize(e.options) + ")";
}, deserialize(e, r) {
  return new Event(r.deserialize(e.type), r.deserialize(e.options));
} }), Y = k;
var V2 = ai({ tag: "seroval-plugins/web/File", test(e) {
  return typeof File == "undefined" ? false : e instanceof File;
}, parse: { async async(e, r) {
  return { name: await r.parse(e.name), options: await r.parse({ type: e.type, lastModified: e.lastModified }), buffer: await r.parse(await e.arrayBuffer()) };
} }, serialize(e, r) {
  return "new File([" + r.serialize(e.buffer) + "]," + r.serialize(e.name) + "," + r.serialize(e.options) + ")";
}, deserialize(e, r) {
  return new File([r.deserialize(e.buffer)], r.deserialize(e.name), r.deserialize(e.options));
} }), m = V2;
function y(e) {
  let r = [];
  return e.forEach((a, t) => {
    r.push([t, a]);
  }), r;
}
var o = {}, v = (e, r = new FormData(), a = 0, t = e.length, s) => {
  for (; a < t; a++) s = e[a], r.append(s[0], s[1]);
  return r;
}, G = ai({ tag: "seroval-plugins/web/FormDataFactory", test(e) {
  return e === o;
}, parse: { sync() {
  return o;
}, async async() {
  return await Promise.resolve(o);
}, stream() {
  return o;
} }, serialize() {
  return v.toString();
}, deserialize() {
  return o;
} }), J = ai({ tag: "seroval-plugins/web/FormData", extends: [m, G], test(e) {
  return typeof FormData == "undefined" ? false : e instanceof FormData;
}, parse: { sync(e, r) {
  return { factory: r.parse(o), entries: r.parse(y(e)) };
}, async async(e, r) {
  return { factory: await r.parse(o), entries: await r.parse(y(e)) };
}, stream(e, r) {
  return { factory: r.parse(o), entries: r.parse(y(e)) };
} }, serialize(e, r) {
  return "(" + r.serialize(e.factory) + ")(" + r.serialize(e.entries) + ")";
}, deserialize(e, r) {
  return v(r.deserialize(e.entries));
} }), K = J;
function g(e) {
  let r = [];
  return e.forEach((a, t) => {
    r.push([t, a]);
  }), r;
}
var W = ai({ tag: "seroval-plugins/web/Headers", test(e) {
  return typeof Headers == "undefined" ? false : e instanceof Headers;
}, parse: { sync(e, r) {
  return { value: r.parse(g(e)) };
}, async async(e, r) {
  return { value: await r.parse(g(e)) };
}, stream(e, r) {
  return { value: r.parse(g(e)) };
} }, serialize(e, r) {
  return "new Headers(" + r.serialize(e.value) + ")";
}, deserialize(e, r) {
  return new Headers(r.deserialize(e.value));
} }), l = W;
var n = {}, P = (e) => new ReadableStream({ start: (r) => {
  e.on({ next: (a) => {
    try {
      r.enqueue(a);
    } catch (t) {
    }
  }, throw: (a) => {
    r.error(a);
  }, return: () => {
    try {
      r.close();
    } catch (a) {
    }
  } });
} }), x2 = ai({ tag: "seroval-plugins/web/ReadableStreamFactory", test(e) {
  return e === n;
}, parse: { sync() {
  return n;
}, async async() {
  return await Promise.resolve(n);
}, stream() {
  return n;
} }, serialize() {
  return P.toString();
}, deserialize() {
  return n;
} });
function w(e) {
  let r = re(), a = e.getReader();
  async function t() {
    try {
      let s = await a.read();
      s.done ? r.return(s.value) : (r.next(s.value), await t());
    } catch (s) {
      r.throw(s);
    }
  }
  return t().catch(() => {
  }), r;
}
var ee = ai({ tag: "seroval/plugins/web/ReadableStream", extends: [x2], test(e) {
  return typeof ReadableStream == "undefined" ? false : e instanceof ReadableStream;
}, parse: { sync(e, r) {
  return { factory: r.parse(n), stream: r.parse(re()) };
}, async async(e, r) {
  return { factory: await r.parse(n), stream: await r.parse(w(e)) };
}, stream(e, r) {
  return { factory: r.parse(n), stream: r.parse(w(e)) };
} }, serialize(e, r) {
  return "(" + r.serialize(e.factory) + ")(" + r.serialize(e.stream) + ")";
}, deserialize(e, r) {
  let a = r.deserialize(e.stream);
  return P(a);
} }), p = ee;
function N(e, r) {
  return { body: r, cache: e.cache, credentials: e.credentials, headers: e.headers, integrity: e.integrity, keepalive: e.keepalive, method: e.method, mode: e.mode, redirect: e.redirect, referrer: e.referrer, referrerPolicy: e.referrerPolicy };
}
var ae = ai({ tag: "seroval-plugins/web/Request", extends: [p, l], test(e) {
  return typeof Request == "undefined" ? false : e instanceof Request;
}, parse: { async async(e, r) {
  return { url: await r.parse(e.url), options: await r.parse(N(e, e.body && !e.bodyUsed ? await e.clone().arrayBuffer() : null)) };
}, stream(e, r) {
  return { url: r.parse(e.url), options: r.parse(N(e, e.body && !e.bodyUsed ? e.clone().body : null)) };
} }, serialize(e, r) {
  return "new Request(" + r.serialize(e.url) + "," + r.serialize(e.options) + ")";
}, deserialize(e, r) {
  return new Request(r.deserialize(e.url), r.deserialize(e.options));
} }), te = ae;
function h2(e) {
  return { headers: e.headers, status: e.status, statusText: e.statusText };
}
var oe = ai({ tag: "seroval-plugins/web/Response", extends: [p, l], test(e) {
  return typeof Response == "undefined" ? false : e instanceof Response;
}, parse: { async async(e, r) {
  return { body: await r.parse(e.body && !e.bodyUsed ? await e.clone().arrayBuffer() : null), options: await r.parse(h2(e)) };
}, stream(e, r) {
  return { body: r.parse(e.body && !e.bodyUsed ? e.clone().body : null), options: r.parse(h2(e)) };
} }, serialize(e, r) {
  return "new Response(" + r.serialize(e.body) + "," + r.serialize(e.options) + ")";
}, deserialize(e, r) {
  return new Response(r.deserialize(e.body), r.deserialize(e.options));
} }), ne = oe;
var le = ai({ tag: "seroval-plugins/web/URL", test(e) {
  return typeof URL == "undefined" ? false : e instanceof URL;
}, parse: { sync(e, r) {
  return { value: r.parse(e.href) };
}, async async(e, r) {
  return { value: await r.parse(e.href) };
}, stream(e, r) {
  return { value: r.parse(e.href) };
} }, serialize(e, r) {
  return "new URL(" + r.serialize(e.value) + ")";
}, deserialize(e, r) {
  return new URL(r.deserialize(e.value));
} }), pe = le;
var de = ai({ tag: "seroval-plugins/web/URLSearchParams", test(e) {
  return typeof URLSearchParams == "undefined" ? false : e instanceof URLSearchParams;
}, parse: { sync(e, r) {
  return { value: r.parse(e.toString()) };
}, async async(e, r) {
  return { value: await r.parse(e.toString()) };
}, stream(e, r) {
  return { value: r.parse(e.toString()) };
} }, serialize(e, r) {
  return "new URLSearchParams(" + r.serialize(e.value) + ")";
}, deserialize(e, r) {
  return new URLSearchParams(r.deserialize(e.value));
} }), fe2 = de;
const DEFAULT_PLUGINS = [O2, L, q, Y, K, l, p, te, ne, fe2, pe];
const MAX_SERIALIZATION_DEPTH_LIMIT = 64;
const DISABLED_FEATURES = M.RegExp;
function createChunk(data) {
  const encodeData = new TextEncoder().encode(data);
  const bytes = encodeData.length;
  const baseHex = bytes.toString(16);
  const totalHex = "00000000".substring(0, 8 - baseHex.length) + baseHex;
  const head = new TextEncoder().encode(`;0x${totalHex};`);
  const chunk = new Uint8Array(12 + bytes);
  chunk.set(head);
  chunk.set(encodeData, 12);
  return chunk;
}
function serializeToJSStream(id, value) {
  return new ReadableStream({
    start(controller) {
      Sn(value, {
        scopeId: id,
        plugins: DEFAULT_PLUGINS,
        onSerialize(data, initial) {
          controller.enqueue(createChunk(initial ? `(${dn(id)},${data})` : data));
        },
        onDone() {
          controller.close();
        },
        onError(error) {
          controller.error(error);
        }
      });
    }
  });
}
function serializeToJSONStream(value) {
  return new ReadableStream({
    start(controller) {
      iu(value, {
        disabledFeatures: DISABLED_FEATURES,
        depthLimit: MAX_SERIALIZATION_DEPTH_LIMIT,
        plugins: DEFAULT_PLUGINS,
        onParse(node) {
          controller.enqueue(createChunk(JSON.stringify(node)));
        },
        onDone() {
          controller.close();
        },
        onError(error) {
          controller.error(error);
        }
      });
    }
  });
}
class SerovalChunkReader {
  reader;
  buffer;
  done;
  constructor(stream) {
    this.reader = stream.getReader();
    this.buffer = new Uint8Array(0);
    this.done = false;
  }
  async readChunk() {
    const chunk = await this.reader.read();
    if (!chunk.done) {
      const newBuffer = new Uint8Array(this.buffer.length + chunk.value.length);
      newBuffer.set(this.buffer);
      newBuffer.set(chunk.value, this.buffer.length);
      this.buffer = newBuffer;
    } else {
      this.done = true;
    }
  }
  async next() {
    if (this.buffer.length === 0) {
      if (this.done) {
        return {
          done: true,
          value: void 0
        };
      }
      await this.readChunk();
      return await this.next();
    }
    const head = new TextDecoder().decode(this.buffer.subarray(1, 11));
    const bytes = Number.parseInt(head, 16);
    if (Number.isNaN(bytes)) {
      throw new Error("Malformed server function stream.");
    }
    while (bytes > this.buffer.length - 12) {
      if (this.done) {
        throw new Error("Malformed server function stream.");
      }
      await this.readChunk();
    }
    const partial = new TextDecoder().decode(this.buffer.subarray(12, 12 + bytes));
    this.buffer = this.buffer.subarray(12 + bytes);
    return {
      done: false,
      value: partial
    };
  }
  async drain(interpret) {
    while (true) {
      const result = await this.next();
      if (result.done) {
        break;
      } else {
        interpret(result.value);
      }
    }
  }
}
async function deserializeFromJSONString(json) {
  const blob = new Response(json);
  return await deserializeJSONStream(blob);
}
async function deserializeJSONStream(response) {
  if (!response.body) {
    throw new Error("missing body");
  }
  const reader = new SerovalChunkReader(response.body);
  const result = await reader.next();
  if (!result.done) {
    let interpretChunk = function(chunk) {
      const value = uu(JSON.parse(chunk), {
        refs,
        disabledFeatures: DISABLED_FEATURES,
        depthLimit: MAX_SERIALIZATION_DEPTH_LIMIT,
        plugins: DEFAULT_PLUGINS
      });
      return value;
    };
    const refs = /* @__PURE__ */ new Map();
    void reader.drain(interpretChunk);
    return interpretChunk(result.value);
  }
  return void 0;
}
const BODY_FORMAT_KEY = "X-Start-Type";
const BODY_FORMAL_FILE = "__START__";
var BodyFormat;
(function(BodyFormat2) {
  BodyFormat2["Seroval"] = "0";
  BodyFormat2["String"] = "1";
  BodyFormat2["FormData"] = "2";
  BodyFormat2["URLSearchParams"] = "3";
  BodyFormat2["Blob"] = "4";
  BodyFormat2["File"] = "5";
  BodyFormat2["ArrayBuffer"] = "6";
  BodyFormat2["Uint8Array"] = "7";
})(BodyFormat || (BodyFormat = {}));
function getHeadersAndBody(body) {
  switch (true) {
    case typeof body === "string":
      return {
        headers: {
          "Content-Type": "text/plain",
          [BODY_FORMAT_KEY]: BodyFormat.String
        },
        body
      };
    case body instanceof FormData:
      return {
        headers: {
          [BODY_FORMAT_KEY]: BodyFormat.FormData
        },
        body
      };
    case body instanceof URLSearchParams:
      return {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          [BODY_FORMAT_KEY]: BodyFormat.URLSearchParams
        },
        body
      };
    case body instanceof File: {
      const formData = new FormData();
      formData.append(BODY_FORMAL_FILE, body, body.name);
      return {
        headers: {
          [BODY_FORMAT_KEY]: BodyFormat.File
        },
        body: formData
      };
    }
    case body instanceof Blob:
      return {
        headers: {
          [BODY_FORMAT_KEY]: BodyFormat.Blob
        },
        body
      };
    case body instanceof ArrayBuffer:
      return {
        headers: {
          [BODY_FORMAT_KEY]: BodyFormat.ArrayBuffer
        },
        body
      };
    case body instanceof Uint8Array:
      return {
        headers: {
          [BODY_FORMAT_KEY]: BodyFormat.Uint8Array
        },
        body: new Uint8Array(body)
      };
    default:
      return void 0;
  }
}
async function extractBody(instance, client, source) {
  const contentType = source.headers.get("content-type");
  const startType = source.headers.get(BODY_FORMAT_KEY);
  const clone = source.clone();
  switch (true) {
    case startType === BodyFormat.Seroval:
      return await deserializeJSONStream(clone);
    case startType === BodyFormat.String:
      return await clone.text();
    case startType === BodyFormat.File: {
      const formData = await clone.formData();
      return formData.get(BODY_FORMAL_FILE);
    }
    case startType === BodyFormat.FormData:
    case contentType?.startsWith("multipart/form-data"):
      return await clone.formData();
    case startType === BodyFormat.URLSearchParams:
    case contentType?.startsWith("application/x-www-form-urlencoded"):
      return new URLSearchParams(await clone.text());
    case startType === BodyFormat.Blob:
      return await clone.blob();
    case startType === BodyFormat.ArrayBuffer:
      return await clone.arrayBuffer();
    case startType === BodyFormat.Uint8Array:
      return new Uint8Array(await clone.arrayBuffer());
  }
  return void 0;
}
const REGISTRATIONS = /* @__PURE__ */ new Map();
function getServerFunction(id) {
  const fn2 = REGISTRATIONS.get(id);
  if (fn2) {
    return fn2;
  }
  throw new Error("invalid server function: " + id);
}
const validRedirectStatuses = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]);
function getExpectedRedirectStatus(response) {
  if (response.status && validRedirectStatuses.has(response.status)) {
    return response.status;
  }
  return 302;
}
async function handleServerFunction(h3Event) {
  const event = getFetchEvent(h3Event);
  const request = event.request;
  const serverReference = request.headers.get("X-Server-Id");
  const instance = request.headers.get("X-Server-Instance");
  const singleFlight = request.headers.has("X-Single-Flight");
  const url = new URL(request.url);
  let functionId;
  if (serverReference) {
    [functionId] = serverReference.split("#");
  } else {
    functionId = url.searchParams.get("id");
    if (!functionId) {
      return process.env.NODE_ENV === "development" ? new Response("Server function not found", {
        status: 404
      }) : new Response(null, {
        status: 404
      });
    }
  }
  const serverFunction = getServerFunction(functionId);
  let parsed = [];
  if (!instance || request.method === "GET") {
    const args = url.searchParams.get("args");
    if (args) {
      const result = await deserializeFromJSONString(args);
      for (const arg of result) {
        parsed.push(arg);
      }
    }
  }
  if (request.method === "POST" && request.body !== null) {
    const bodyFormat = request.headers.get(BODY_FORMAT_KEY);
    const decoded = await extractBody("", false, request.clone());
    if (bodyFormat === BodyFormat.Seroval) {
      parsed = decoded;
    } else {
      parsed.push(decoded);
    }
  }
  try {
    let result = await provideRequestEvent(event, async () => {
      sharedConfig.context = {
        event
      };
      event.locals.serverFunctionMeta = {
        id: functionId
      };
      return serverFunction(...parsed);
    });
    if (singleFlight && instance) {
      result = await handleSingleFlight(event, result);
    }
    if (result instanceof Response) {
      if (result.headers && result.headers.has("X-Content-Raw")) return result;
      if (instance) {
        if (result.headers) mergeResponseHeaders(h3Event, result.headers);
        if (result.status && (result.status < 300 || result.status >= 400)) h3Event.res.status = result.status;
        if (result.customBody) {
          result = await result.customBody();
        } else if (result.body == null) result = null;
      }
    }
    if (!instance) return handleNoJS(result, request, parsed);
    const body = getHeadersAndBody(result);
    if (body) {
      return new Response(body.body, {
        headers: body.headers
      });
    }
    h3Event.res.headers.set(BODY_FORMAT_KEY, BodyFormat.Seroval);
    if (false) ;
    h3Event.res.headers.set("content-type", "text/plain");
    return serializeToJSONStream(result);
  } catch (x3) {
    if (x3 instanceof Response) {
      if (singleFlight && instance) {
        x3 = await handleSingleFlight(event, x3);
      }
      if (x3.headers) mergeResponseHeaders(h3Event, x3.headers);
      if (x3.status && (!instance || x3.status < 300 || x3.status >= 400)) h3Event.res.status = x3.status;
      if (x3.customBody) {
        x3 = await x3.customBody();
      } else if (x3.body == null) x3 = null;
      h3Event.res.headers.set("X-Error", "true");
    } else if (instance) {
      const error = x3 instanceof Error ? x3.message : typeof x3 === "string" ? x3 : "true";
      h3Event.res.headers.set("X-Error", error.replace(/[\r\n]+/g, ""));
    } else {
      x3 = handleNoJS(x3, request, parsed, true);
    }
    if (instance) {
      const body = getHeadersAndBody(x3);
      if (body) {
        const headers = new Headers(body.headers);
        const errorHeader = h3Event.res.headers.get("X-Error");
        if (errorHeader !== null) {
          headers.set("X-Error", errorHeader);
        }
        return new Response(body.body, {
          headers: body.headers
        });
      }
      h3Event.res.headers.set(BODY_FORMAT_KEY, BodyFormat.Seroval);
      h3Event.res.headers.set("content-type", "text/plain");
      return serializeToJSONStream(x3);
    }
    return x3;
  }
}
function handleNoJS(result, request, parsed, thrown) {
  const url = new URL(request.url);
  const isError = result instanceof Error;
  let statusCode = 302;
  let headers;
  if (result instanceof Response) {
    headers = new Headers(result.headers);
    if (result.headers.has("Location")) {
      headers.set(`Location`, new URL(result.headers.get("Location"), url.origin + "/").toString());
      statusCode = getExpectedRedirectStatus(result);
    }
  } else headers = new Headers({
    Location: new URL(request.headers.get("referer")).toString()
  });
  if (result) {
    headers.append("Set-Cookie", `flash=${encodeURIComponent(JSON.stringify({
      url: url.pathname + url.search,
      result: isError ? result.message : result,
      thrown,
      error: isError,
      input: [...parsed.slice(0, -1), [...parsed[parsed.length - 1].entries()]]
    }))}; Secure; HttpOnly;`);
  }
  return new Response(null, {
    status: statusCode,
    headers
  });
}
let App;
function createSingleFlightHeaders(sourceEvent) {
  const headers = new Headers(sourceEvent.request.headers);
  const cookies = parseCookies(sourceEvent.nativeEvent);
  const SetCookies = sourceEvent.response.headers.getSetCookie();
  headers.delete("cookie");
  SetCookies.forEach((cookie) => {
    if (!cookie) return;
    const {
      maxAge,
      expires,
      name,
      value
    } = parseSetCookie(cookie);
    if (maxAge != null && maxAge <= 0) {
      delete cookies[name];
      return;
    }
    if (expires != null && expires.getTime() <= Date.now()) {
      delete cookies[name];
      return;
    }
    cookies[name] = value;
  });
  Object.entries(cookies).forEach(([key, value]) => {
    headers.append("cookie", `${key}=${value}`);
  });
  return headers;
}
async function handleSingleFlight(sourceEvent, result) {
  let revalidate;
  let url = new URL(sourceEvent.request.headers.get("referer")).toString();
  if (result instanceof Response) {
    if (result.headers.has("X-Revalidate")) revalidate = result.headers.get("X-Revalidate").split(",");
    if (result.headers.has("Location")) url = new URL(result.headers.get("Location"), new URL(sourceEvent.request.url).origin + "/").toString();
  }
  const event = {
    ...sourceEvent
  };
  event.request = new Request(url, {
    headers: createSingleFlightHeaders(sourceEvent)
  });
  return await provideRequestEvent(event, async () => {
    await createPageEvent(event);
    App || (App = (await Promise.resolve().then(() => app)).default);
    event.router.dataOnly = revalidate || true;
    event.router.previousUrl = sourceEvent.request.headers.get("referer");
    try {
      renderToString(() => {
        sharedConfig.context.event = event;
        App();
      });
    } catch (e) {
      console.log(e);
    }
    const body = event.router.data;
    if (!body) return result;
    let containsKey = false;
    for (const key in body) {
      if (body[key] === void 0) delete body[key];
      else containsKey = true;
    }
    if (!containsKey) return result;
    if (!(result instanceof Response)) {
      body["_$value"] = result;
      result = new Response(null, {
        status: 200
      });
    } else if (result.customBody) {
      body["_$value"] = result.customBody();
    }
    result.customBody = () => body;
    result.headers.set("X-Single-Flight", "true");
    return result;
  });
}
const SERVER_FN_BASE = "/_server";
function createBaseHandler(createPageEvent2, fn2, options = {}) {
  const handler = defineHandler({
    middleware: middleware.length ? middleware.map(decorateMiddleware) : void 0,
    handler: decorateHandler(async (e) => {
      const event = getRequestEvent();
      const url = new URL(event.request.url);
      const pathname = stripBaseUrl(url.pathname);
      if (pathname.startsWith(SERVER_FN_BASE)) {
        const serverFnResponse = await handleServerFunction(e);
        if (serverFnResponse instanceof Response) return produceResponseWithEventHeaders(serverFnResponse);
        return new Response(serverFnResponse, {
          headers: e.res.headers
        });
      }
      const match = matchAPIRoute(pathname, event.request.method);
      if (match) {
        const mod = await match.handler.import();
        const fn22 = event.request.method === "HEAD" ? mod["HEAD"] || mod["GET"] : mod[event.request.method];
        if (typeof fn22 === "function") {
          event.params = match.params || {};
          sharedConfig.context = {
            event
          };
          const res = await fn22(event);
          if (res !== void 0) {
            if (res instanceof Response) return produceResponseWithEventHeaders(res);
            return res;
          }
          if (event.request.method !== "GET") {
            throw new Error(`API handler for ${event.request.method} "${event.request.url}" did not return a response.`);
          }
          if (!match.isPage) return;
        }
      }
      const context = await createPageEvent2(event);
      const resolvedOptions = typeof options === "function" ? await options(context) : {
        ...options
      };
      const mode = resolvedOptions.mode || "stream";
      if (resolvedOptions.nonce) context.nonce = resolvedOptions.nonce;
      if (mode === "sync" || false) {
        const html = renderToString(() => {
          sharedConfig.context.event = context;
          return fn2(context);
        }, resolvedOptions);
        context.complete = true;
        if (context.response && context.response.headers.get("Location")) {
          const status = getExpectedRedirectStatus(context.response);
          return redirect(context.response.headers.get("Location"), status);
        }
        event.response.headers.set("content-type", "text/html");
        return html;
      }
      if (resolvedOptions.onCompleteAll) {
        const og = resolvedOptions.onCompleteAll;
        resolvedOptions.onCompleteAll = (options2) => {
          handleStreamCompleteRedirect(context)(options2);
          og(options2);
        };
      } else resolvedOptions.onCompleteAll = handleStreamCompleteRedirect(context);
      if (resolvedOptions.onCompleteShell) {
        const og = resolvedOptions.onCompleteShell;
        resolvedOptions.onCompleteShell = (options2) => {
          handleShellCompleteRedirect(context, e)();
          og(options2);
        };
      } else resolvedOptions.onCompleteShell = handleShellCompleteRedirect(context, e);
      const _stream = renderToStream(() => {
        sharedConfig.context.event = context;
        return fn2(context);
      }, resolvedOptions);
      const stream = _stream;
      if (context.response && context.response.headers.get("Location")) {
        const status = getExpectedRedirectStatus(context.response);
        return redirect(context.response.headers.get("Location"), status);
      }
      if (mode === "async") return await stream;
      delete stream.then;
      if (globalThis.USING_SOLID_START_DEV_SERVER) return stream;
      const {
        writable,
        readable
      } = new TransformStream();
      stream.pipeTo(writable);
      return readable;
    })
  });
  const app2 = new H3();
  app2.use(handler);
  return app2;
}
function createHandler(fn2, options = {}) {
  return createBaseHandler(createPageEvent, fn2, options);
}
async function createPageEvent(ctx) {
  ctx.response.headers.set("Content-Type", "text/html");
  const manifest = getSsrManifest();
  const mergedCSS = await manifest.getAssets("style.css");
  const assets = [
    ...mergedCSS,
    ...await manifest.getAssets("./src/entry-client.tsx"),
    ...await manifest.getAssets("/Users/electric/Documents/areas_of_focus/arrow-agent-workspace/opentxt/server/src/app.tsx")
    // ...(import.meta.env.START_ISLANDS
    //   ? (await serverManifest.inputs[serverManifest.handler]!.assets()).filter(
    //       s => (s as any).attrs.rel !== "modulepreload"
    //     )
    //   : [])
  ];
  const pageEvent = Object.assign(ctx, {
    assets,
    router: {
      submission: initFromFlash(ctx)
    },
    routes: createRoutes(),
    // prevUrl: prevPath || "",
    // mutation: mutation,
    // $type: FETCH_EVENT,
    complete: false,
    $islands: /* @__PURE__ */ new Set()
  });
  return pageEvent;
}
function initFromFlash(ctx) {
  const flash = getCookie(ctx.nativeEvent, "flash");
  if (!flash) return;
  try {
    const param = JSON.parse(flash);
    if (!param || !param.result) return;
    const input = [...param.input.slice(0, -1), new Map(param.input[param.input.length - 1])];
    const result = param.error ? new Error(param.result) : param.result;
    return {
      input,
      url: param.url,
      pending: false,
      result: param.thrown ? void 0 : result,
      error: param.thrown ? result : void 0
    };
  } catch (e) {
    console.error(e);
  } finally {
    setCookie(ctx.nativeEvent, "flash", "", {
      maxAge: 0
    });
  }
}
function handleShellCompleteRedirect(context, e) {
  return () => {
    if (context.response && context.response.headers.get("Location")) {
      const status = getExpectedRedirectStatus(context.response);
      e.res.status = status;
      e.res.headers.set("Location", context.response.headers.get("Location"));
    }
  };
}
function handleStreamCompleteRedirect(context) {
  return ({
    write
  }) => {
    context.complete = true;
    const to2 = context.response && context.response.headers.get("Location");
    to2 && write(`<script>window.location=${JSON.stringify(to2).replace(/</g, "\\u003c")}<\/script>`);
  };
}
function produceResponseWithEventHeaders(res) {
  const event = getRequestEvent();
  let ret = res;
  if (300 <= res.status && res.status < 400) {
    const cookies = res.headers.getSetCookie?.() ?? [];
    const headers = new Headers();
    res.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "set-cookie") {
        headers.set(key, value);
      }
    });
    for (const cookie of cookies) {
      headers.append("Set-Cookie", cookie);
    }
    ret = new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers
    });
  }
  const eventCookies = event.response.headers.getSetCookie?.() ?? [];
  for (const cookie of eventCookies) {
    ret.headers.append("Set-Cookie", cookie);
  }
  for (const [name, value] of event.response.headers) {
    if (name.toLowerCase() !== "set-cookie") {
      ret.headers.set(name, value);
    }
  }
  return ret;
}
function stripBaseUrl(path) {
  return path;
}
var _tmpl$ = ['<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>opentxt</title>', "</head>"], _tmpl$2 = ["<html", ' lang="en">', '<body><div id="app">', "</div><!--$-->", "<!--/--></body></html>"];
const id$$ = "src/entry-server.tsx";
const entryServer = createHandler(() => createComponent$1(StartServer, {
  document: ({
    assets,
    children: children2,
    scripts
  }) => ssr(_tmpl$2, ssrHydrationKey(), createComponent$1(NoHydration, {
    get children() {
      return ssr(_tmpl$, escape(assets));
    }
  }), escape(children2), escape(scripts))
}));
export {
  entryServer as default,
  id$$
};
//# sourceMappingURL=entry-server.js.map
