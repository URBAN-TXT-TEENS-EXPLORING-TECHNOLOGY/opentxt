import { ssr, ssrHydrationKey, ssrStyleProperty } from "solid-js/web";
var _tmpl$ = ["<main", ' style="', '"><h1>opentxt</h1><p>Effect-native chat + voice backend. The product surface is the Expo app (<code>opentxt/app</code>); this server exposes the API under <code>/api/*</code>.</p></main>'];
function Home() {
  return ssr(_tmpl$, ssrHydrationKey(), ssrStyleProperty("font-family:", "system-ui, sans-serif") + ssrStyleProperty(";padding:", "2rem"));
}
export {
  Home as default
};
//# sourceMappingURL=index-dhXWkRjL.js.map
