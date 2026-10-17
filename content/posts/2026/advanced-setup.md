---
title: "Advanced Setup"
date: "2026-09-24"
tags: article
author: "lastguru"
excerpt: "Configure EMP's user menu, JSON postlists and live metrics/actions, including external data sources."
---

These optional setups extend a working Eleventy Markdown Prime (EMP) site. For repository creation, basic configuration, content authoring and deployment, start with [Getting Started](/getting-started/).

## Table of Contents

1. [Sidebar user menu](#sidebar-user-menu)
2. [Local providers](#local-providers)
3. [JSON postlists](#json-postlists)
4. [JSON read sources](#json-read-sources)
5. [JSON metrics and actions](#json-metrics-and-actions)

## Sidebar user menu

Set `features.userMenu: true` with `features.js: true` to show a **User** button at the bottom of the regular sidebar. Its modal contains **Sign in** or **Sign out** and, when `features.privacyPolicy` is `"sidebar"`, the configured policy link. The option is off by default. A method can set `authentication.error` to show the normal error status without discarding a restored identity.

Select the browser-only test method in `content/_data/siteconfig.js`:

```js
authentication: { method: "test", options: {} },
```

The test method uses the existing `localStorage.user` value, restores stored names with the stable id `test-user`, signs in as `Test Username`, and removes only that key on sign out. Set `method: null` to disable authentication output; if the user menu is enabled at the same time, its sign-in control remains visible but inactive until a method is selected.

The selected method is loaded from `extensions/authentication/<method>/index.js`; no registration list is needed. Its browser code defines an `authentication` object with asynchronous `restore()`, `signIn()` and `signOut()` functions, returning `{ id, name }` or `null`. The menu uses that result after every action. The bundled providers expose public settings from `authentication.options` as `authenticationOptions`; the test method needs none. GitLab and GitHub derive their callback URL from `siteconfig.url`, so no separate redirect setting is needed.
### GitLab sign-in

Register a GitLab OAuth application under **User Settings > Applications** and leave **Confidential** unchecked. Register your ordinary homepage as the redirect URL, including the deployment prefix and trailing slash, for example `https://example.com/blog/`. Enable the user menu and JavaScript as described above. No separate callback page, Worker or client secret is needed.

Enable `features.userMenu` and `features.js` in `content/_data/siteelements.json5`, then set the public options in `content/_data/siteconfig.js`:

```js
authentication: {
    method: "gitlab",
    options: {
        clientId: "YOUR_APPLICATION_ID",
        scopes: ["read_user"],
        origin: "https://gitlab.com",
    },
},
```

`clientId` is the public Application ID. The callback URL comes from `siteconfig.url`; register that homepage URL, including any deployment prefix and trailing slash, without a query or fragment. GitLab does not accept arbitrary post URLs as redirects: the homepage processes its response, then returns to the URL where sign-in started, preserving its query and fragment, whether sign-in succeeds, fails or is cancelled. Failures use the menu's normal error status on the starting page; the message is cleared on reload or retry. A missing or unsafe saved starting URL falls back to the homepage without changing the authentication result. `origin` defaults to `https://gitlab.com`; use your instance's origin without an API path or trailing slash. `scopes` defaults to `read_user` for identity lookup. Repository editing requires the appropriate additional GitLab API permissions; signing in alone does not grant them.

The browser signs in directly with GitLab, validates the callback and obtains the displayed identity from GitLab's user API. It uses the [public-client authorization flow](https://docs.gitlab.com/api/oauth2/#authorization-code-with-proof-key-for-code-exchange-pkce), with random state and a challenge/verifier. Tokens stay in local storage and refresh when near expiry; Web Locks coordinates refresh across tabs. Use HTTPS and a current browser with Web Locks support. Scripts on this site's origin can access its stored tokens.

Sign-out clears EMP's GitLab session, not the GitLab website session. A failed or cancelled sign-in leaves any existing session untouched. When restoring a session, network failures retain it for retry, while rejected credentials require signing in again. GitLab must allow browser token and user-API requests from your origin. Automated checks use mocked responses; verify real consent, reload, refresh and sign-out with your registered application before relying on the integration.

### GitHub sign-in

The `github` method uses a GitHub OAuth app and a code-exchange handler deployed with the existing Cloudflare Workers Static Assets site. No separate Worker application, hostname or domain route is needed.

1. [Register a GitHub OAuth app](https://github.com/settings/applications/new). Set both Homepage URL and Authorization callback URL to your ordinary HTTPS homepage, including any deployment prefix and trailing slash, for example `https://example.com/blog/`. No separate callback page is needed.
2. Enable the user menu and JavaScript, then set the public options in `content/_data/siteconfig.js`:

```js
authentication: {
    method: "github",
    options: {
        clientId: "YOUR_GITHUB_OAUTH_CLIENT_ID",
        scopes: [],
    },
},
```

3. Set `CLIENT_SECRET` on the existing site Worker: **Workers & Pages > your Worker > Settings > Variables and Secrets > Add**, choose **Secret**, enter the GitHub app secret, then **Deploy**. This must be a runtime secret, not a build secret. CLI users can instead run `npx wrangler secret put CLIENT_SECRET` from the repository root. Configure it once and update it when rotating the app secret; never put it in public options, Wrangler `vars` or source control.

Use your normal Git-connected or CLI deployment workflow. The site build automatically includes the exchange handler when `github` is selected and derives its same-origin URL beneath the configured homepage. No separate `exchangeUrl` is needed. The root `wrangler.json` must identify the Worker holding the secret; generated Wrangler configuration stays untracked. Disabling GitHub removes this integration's generated configuration and returns Wrangler to the base configuration. Custom Worker handlers or Wrangler `env` blocks require explicit integration only when GitHub authentication is enabled.

`clientId` must match the OAuth app. The callback URL comes from `siteconfig.url`; register that HTTPS homepage URL, including any deployment prefix and trailing slash, without credentials, query or fragment. Empty `scopes` is sufficient for the public profile; add only permissions your application needs. Sign-in alone does not provide server-side authorization or CMS access.

The homepage handles GitHub's response and returns to the initiating URL, including query and fragment, on success, failure or cancellation. Errors appear once in the user menu; an existing session survives a failed new attempt. Missing or unsafe saved URLs fall back to the homepage.

Tokens stay in local storage, accessible to scripts on the site's origin. Sign-out clears EMP's session, not the GitHub website session or app authorization. Expired or revoked tokens require sign-in again; token refresh is not implemented.

## Local providers

Provider implementations live under `extensions/`; `_11ty/` contains the shared build adapters. Providers are selected by their names in `siteconfig.js`, not by an import list. Add their files and configuration in your site's branch; shared EMP code needs no changes. Names use letters, digits, hyphens or underscores. Provider entry files and browser sources are watched; restart `npm run dev` after changing statically imported provider helpers.

### Plugins

An entry such as `plugins: { example: { label: "Example" } }` loads `extensions/plugins/example/index.js`. Its default export may provide:

- `setup(eleventyConfig, options)` to register an Eleventy plugin, filter or other build behavior during configuration.
- `opengraph(options)`, `head(options)` and `bodyStart(options)` to return HTML.
- `css(options)` to return CSS for the site's stylesheet. Its returned CSS also participates in the stylesheet's cache hash; return the CSS itself, not an import of an untracked file.

All hooks may be asynchronous. Omitted hooks do nothing. Plugins run in configuration order. Use `true` to enable a plugin with default options, an object to enable it with custom options, or `false` to disable it. Omitted or `null` entries are also disabled. Hooks receive an empty options object for `true`.

The templates call `{% raw %}{% pluginsOpengraph %}`, `{% pluginsHead %}`, `{% pluginsBodyStart %}` and `{% pluginsCss %}{% endraw %}` without arguments. The adapter imports `siteconfig.js` and reads `plugins`. Restart `npm run dev` after changing plugin settings or setup code.

```js
// extensions/plugins/example/index.js
export default {
    head(options) {
        return `<meta name="application-name" content="${options.label}">`;
    },
};
```

### Google Fonts

Configure `plugins["google-fonts"]` in `siteconfig.js` with the body/header families and weights used by your theme. `local: "none"` loads CSS and fonts from Google in the browser; `"css"` includes Google's CSS in the site stylesheet while keeping fonts remote; `"full"` downloads both during the build and serves fonts from `assets/fonts/`. Set the plugin to `false` or remove its entry to disable loading. Select the corresponding font families and fallbacks in `assets/css/theme.css`.

### Syntax highlighting

The default `plugins: { "syntax-highlighting": true }` enables Prism highlighting and the Okaidia token colors. Set it to `false` to disable both the engine and its colors, or supply an options object for `@11ty/eleventy-plugin-syntaxhighlight`. Plain code blocks retain their layout, language/title headers and copy controls.

### Authentication

Setting `authentication.method: "example"` loads `extensions/authentication/example/index.js`. Its default export supplies `browser(options, siteUrl)`, returning the JavaScript to include in the external bundle. For example:

```js
import { readFileSync } from "node:fs";

export default {
    browser(options, siteUrl) {
        return `const authenticationOptions = ${JSON.stringify(options)};\n${readFileSync(new URL("./browser.js", import.meta.url), "utf8")}`;
    },
};
```

The adjacent `browser.js` implements the `authentication` interface described above. Derive provider-specific options or endpoints in the renderer when needed. Only the selected provider's returned browser code is bundled and included in its cache hash.

A provider needing a Worker can also supply `cloudflare(base, siteconfig, output)`, returning the complete Wrangler configuration. The shared build hook reads `wrangler.json`, calls this function and writes the generated configuration and deployment redirect. Without that hook, it leaves normal deployments alone and removes any previous EMP-generated redirect. Both build hooks may be asynchronous. GitHub's provider is a working example; its Worker-specific setup stays inside its provider folder.

## JSON postlists

Set `features.index: "json"` and `features.js: true` to load post lists from JSON in the browser. This applies to the homepage and tag and author archives. Use `features.index: "postlist"` (the default) to render post lists during the build.

The build exports Markdown posts to JSON files in a `postlist/` directory beneath each list's first page. For example, `/postlist/1.json` contains the first page of the homepage list, and `/events/postlist/2.json` contains the second page of the events list. Your static host serves these files.

For a custom list, use `layout: base.njk`, a directory permalink such as `/events/`, and include `postlist.njk` in a Nunjucks page with JSON mode enabled. Supply local items through `posts`. An empty local list still generates `/events/postlist/1.json` and fetches its read URL, allowing that endpoint to supply posts.

Each JSON response contains the cards for one page and pagination metadata:

```json
{
  "items": [{ "url": "/workshop/", "title": "Workshop", "excerpt": "A practical introduction." }],
  "pagination": { "page": 1, "totalPages": 8 }
}
```

`page` is a one-based page number and `totalPages` is the number of pages in the list. For an empty list, `1.json` returns `items: []` and `pagination: { "page": null, "totalPages": 0 }`.

Each item requires a `url` and a `title`. Optional fields are `excerpt`, `pinned`, `thumbnail` and `properties`. Supply text without HTML or HTML escaping. For links and images, use site-root paths that include the deployment prefix, or absolute URLs. Site-root paths refer to the website, not the JSON host.

A `thumbnail` contains `src` and optional `srcset`, `sizes`, `width` and `height`. Its optional `sources` array contains objects with `type` and `srcset` for alternative image formats. The optional numeric `lqip` field supplies the blur placeholder.

The `properties` object accepts:

- `date`: formatted date text.
- `author`: an object with `name` and `url`.
- `place`: an object with `name` and optional `address`.
- `tags`: an array of objects with `name`, `url` and optional `icon`.
- `readingTime`: an object with `label` and `wordsLabel`.
- `decorations`: the [post decoration fields](/getting-started/#post-decorations).

Icon names refer to entries in `inlinesvg.json5`. Markdown exports supply formatted text, image variants and links; use an exported JSON file as a reference when creating your own source.

Pagination links use `?page=N`; JSON requests use `N.json`. Reload, new tabs and browser Back/Forward select the page in the URL. Without a valid `page` query, an HTML page loads its corresponding JSON page. Use one list per HTML page.

If a request fails, the displayed cards and pagination links stay available. Click the link again to repeat the request, or reload if the initial load failed. Configure empty-list and error messages in `sitestrings.json5`.

## JSON read sources

By default, [JSON postlists](#json-postlists) and [JSON metrics/actions](#json-metrics-and-actions) read the files generated by EMP from your static host. Configure a read prefix when another path or service should supply those responses.

Set `jsonReadPrefix` in `content/_data/siteconfig.js` to change where browsers read postlist and metrics/actions JSON. The default `""` reads generated files at their normal URLs. With `"/api"`, the homepage still generates `postlist/1.json`, while the browser requests `/api/postlist/1.json`. Generated files and links inside responses keep their canonical paths.

The read prefix goes before the deployment-prefixed path: with `/blog/`, the request is `/api/blog/postlist/1.json`. A trailing slash is optional. An absolute HTTP(S) prefix such as `https://data.example/api` supports another origin, which must allow cross-origin requests (CORS). The host at the read URL supplies the responses.

## JSON metrics and actions

Set `features.liveMetricsActions: true` in `content/_data/siteelements.json5` to load metrics/actions for full posts and static list cards. The default `false` renders their authored values directly. JSON lists render metrics/actions from each item in the list response, alongside the rest of the card data.

Eleventy generates `metrics-actions.json` beneath each displayed post's URL from the prepared front matter used for static rendering and JSON lists. For example, `/sample-2023-pinned-event/` and its static list cards load `/sample-2023-pinned-event/metrics-actions.json`. The [JSON read source](#json-read-sources) configured through `jsonReadPrefix` applies to these requests and explicit refreshes.

The sample event's existing Markdown decorations produce metrics/actions in this format:

```json
{
  "metrics": [
    { "label": "Participants", "value": 24, "max": 30, "progress": true }
  ],
  "actions": [
    { "label": "Past event", "icon": "calendar", "variant": "neutral", "disabled": true }
  ]
}
```

When enabled, metrics/actions on full posts and static list cards start empty and load silently from the generated JSON. Posts without metrics or actions export empty arrays. Both `features.js` and `features.postproperties` must be enabled. Without JavaScript, full posts and static lists keep their content and badges readable.

In JSON list mode, each list response supplies the cards' metrics/actions, including on pagination. External list publishers supply these fields in each item's `properties.decorations`. Full posts continue to use `metrics-actions.json`. The default page layout does not display post properties. Cross-origin requests require CORS. Action URLs in responses must include any deployment prefix.

Every response must contain both `metrics` and `actions` arrays, with a string `label` for each item. The shared renderer handles the [post decoration fields](/getting-started/#post-decorations). Each array replaces its whole group; `[]` clears it. Numbers must be JSON numbers, not strings. Omit an unknown `value` or set it to `null`; it is not zero. A failed request or invalid response structure leaves the last valid presentation intact, or the initial region empty.

For full posts and static list cards, EMP fetches once on initialization. Custom JavaScript can refresh a region through the same loader:

```js
const region = document.querySelector("[data-metrics-actions-url]");
region?.dispatchEvent(new Event("metricsactions:refresh"));
```

An update affects only that region; responses for removed regions or superseded refreshes are ignored. Action links navigate normally; action buttons require application-provided handlers.
