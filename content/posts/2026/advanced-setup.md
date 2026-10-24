---
title: "Advanced Setup"
date: "2026-09-24"
updated: "2026-10-23"
tags: article
author: "lastguru"
excerpt: "Configure sign-in, plugins and browser-loaded content, or add your own EMP extensions."
---

These optional setups extend a working Eleventy Markdown Prime (EMP) site. For repository creation, basic configuration, content authoring and deployment, start with [Getting Started](/getting-started/).

Settings below belong in `content/_data/siteconfig.js` unless stated otherwise. Add them to the existing configuration rather than replacing unrelated settings. Restart `npm run dev` after changing configuration, and rebuild/redeploy to publish it.

## Table of Contents

1. [Sidebar user menu](#sidebar-user-menu)
   - [GitLab sign-in](#gitlab-sign-in)
   - [GitHub sign-in](#github-sign-in)
2. [Built-in plugins](#built-in-plugins)
3. [JSON postlists](#json-postlists)
4. [JSON metrics and actions](#json-metrics-and-actions)
5. [JSON read sources](#json-read-sources)
6. [Local providers](#local-providers)

## Sidebar user menu

EMP can display a signed-in identity through GitLab or GitHub. Authentication is disabled by default. It does not by itself protect pages, grant repository access or provide server-side authorization.

### Common setup

1. In `content/_data/siteelements.json5`, use `features.base: "regular"` and enable `features.userMenu` and `features.js`. The **User** button appears at the bottom of the sidebar.
2. Set `siteconfig.url` to the complete public HTTPS homepage, including any deployment prefix and a trailing slash, for example `https://example.com/blog/`. Do not include a query or fragment.
3. Configure one provider below. Both use that homepage as their OAuth callback; no separate callback page or redirect setting is needed.

The menu offers **Sign in** or **Sign out** and the privacy-policy link when `features.privacyPolicy` is `"sidebar"`. Keep the homepage's sidebar and JavaScript enabled so it can process the callback.

### GitLab sign-in

GitLab sign-in works directly in the browser, including on static hosts. It needs no Worker or client secret.

1. [Register a GitLab OAuth application](https://docs.gitlab.com/integration/oauth_provider/#create-a-user-owned-application). Set the redirect URI to your `siteconfig.url`, leave **Confidential** unchecked, and select `read_user`.
2. Copy its public Application ID into `siteconfig.js`:

   ```js
   authentication: {
       method: "gitlab",
       options: {
           clientId: "YOUR_GITLAB_APPLICATION_ID",
       },
   },
   ```

3. Build and deploy the site, then open the user menu and sign in.

**Optional settings** inside `options`:

- `origin` defaults to `"https://gitlab.com"`. For self-managed GitLab, use its HTTPS origin without an API path or trailing slash, and register the application on that instance. It must allow browser token and user-API requests from your site.
- `scopes` defaults to `"read_user"` for identity lookup. Omit it to use the default, or supply a space-separated string or an array of scope names. The registered application must allow the requested scopes.

### GitHub sign-in

GitHub sign-in uses an OAuth app and a code-exchange handler in the site's existing Cloudflare Workers Static Assets deployment. It needs a runtime secret, but no separate Worker, hostname or route setup.

1. [Register a GitHub OAuth app](https://github.com/settings/applications/new). Set both **Homepage URL** and **Authorization callback URL** to your `siteconfig.url`.
2. Copy its public Client ID into `siteconfig.js`:

   ```js
   authentication: {
       method: "github",
       options: {
           clientId: "YOUR_GITHUB_OAUTH_CLIENT_ID",
       },
   },
   ```

3. Store the app's client secret on the existing site Worker as a runtime **Secret** named `CLIENT_SECRET`. In Cloudflare, open **Workers & Pages > your Worker > Settings > Variables and Secrets > Add**, choose **Secret**, then save/deploy it. Alternatively, run `npx wrangler secret put CLIENT_SECRET` from the repository root. Do not use a build-only secret, public configuration or Wrangler `vars`.
4. Build and deploy the site, then open the user menu and sign in. The root `wrangler.json` must name the Worker holding the secret.

**Optional settings** inside `options`:

- `scopes` defaults to `[]`: no additional permissions, sufficient for the public profile. Omit it to use the default, or supply an array or a space-separated string of scope names. Request the permissions needed by any additional integration.

The build adds the exchange handler and derives its same-origin URL from `siteconfig.url`; do not configure a separate `exchangeUrl`. Generated Wrangler configuration is untracked. Disabling GitHub removes EMP's generated deployment configuration. Sites with a custom Worker handler or Wrangler `env` blocks must integrate those with the GitHub provider before enabling it.

### Sessions and permissions

Both providers return to the page where sign-in started, preserving its query and fragment, after success, cancellation or failure. A missing or unsafe return address falls back to the homepage. Failed attempts show the menu's error status without replacing an existing session.

Tokens are stored in the browser and can be accessed by scripts on the same origin. Sign-out clears the local EMP login, not the provider's website session or the application's authorization. GitLab refreshes tokens and requires a current browser with Web Locks support; GitHub requires a new sign-in when its token expires or is revoked.

The menu shows the last known ID/name immediately while checking identity in the background. A successful check updates that display cache; a failed check clears it without discarding otherwise usable credentials. The next page load can try again. The cache is display data, not proof that a session is currently valid. Background checks leave the controls usable, recheck pages restored with Back/Forward, and reflect session changes from other tabs. Requests and GitLab lock acquisition have a ten-second deadline; that bounds waiting, not the login lifetime.

Changing requested scopes requires signing in again. Scopes do not grant repository membership or override branch protection. Before relying on a deployment, check sign-in, reload and sign-out with the registered application.

### Test sign-in

For UI development without an OAuth application:

```js
authentication: { method: "test", options: {} },
```

This browser-only method signs in as `Test Username` and stores the name in `localStorage.user`. It is not real authentication. Set `method: null` to disable authentication; an enabled user menu then has an inactive sign-in control.

## Built-in plugins

Configure plugins in the existing `plugins` object in `siteconfig.js`. An options object enables a plugin with those settings; `true` enables its defaults where supported. Use `false`, `null`, or remove its entry to disable it.

### Google Fonts

Configure `plugins["google-fonts"]` in `siteconfig.js` with the body/header families and weights used by your theme. `local: "none"` loads CSS and fonts from Google in the browser; `"css"` includes Google's CSS in the site stylesheet while keeping fonts remote; `"full"` downloads both during the build and serves fonts from `assets/fonts/`. Set the plugin to `false` or remove its entry to disable loading. Select the corresponding font families and fallbacks in `assets/css/theme.css`.

### Syntax highlighting

The default `plugins: { "syntax-highlighting": true }` enables Prism highlighting and the Okaidia token colors. Set it to `false` to disable both the engine and its colors, or supply an options object for `@11ty/eleventy-plugin-syntaxhighlight`. Plain code blocks retain their layout, language/title headers and copy controls.

### Google and Meta integrations

- `plugins.google.tagId` loads Google's tag script for the supplied ID.
- `plugins.meta.appId` adds the Facebook app ID to OpenGraph metadata.
- `plugins.meta.pixelId` loads Meta Pixel and sends a page-view event, followed by a content-view event after three seconds.

Empty IDs produce no corresponding output. Set the plugin to `false` or remove its entry to disable it entirely.

## JSON postlists

Set `pagination.postlist: "dynamic"` in `content/_data/siteconfig.js` and `features.js: true` in `content/_data/siteelements.json5` to load post lists from JSON in the browser. Use `pagination.postlist: "static"` (the default) to render lists during the build. The selected extension handles homepage, tag, author and custom lists. `features.index` separately selects a list or full-post homepage; a full-post homepage can coexist with dynamic archives.

A list homepage is generated even when there are no local posts. Static mode shows an empty list; dynamic mode can load posts from its JSON read source.

In dynamic mode, the build exports list items to JSON files in a `postlist/` directory beneath each list's first page. For example, `/postlist/1.json` contains the first page of the homepage list, and `/events/postlist/2.json` contains the second page of the events list. Your static host serves these files.

For a custom list, use `layout: base.njk`, a directory permalink such as `/events/`, and include `postlist.njk` in a Nunjucks page with the dynamic postlist selected. Supply local items through `posts`. An empty local list still generates `/events/postlist/1.json` and fetches its read URL, allowing that endpoint to supply posts.

### Response format

Each JSON response contains the cards for one page and pagination metadata:

```json
{
  "items": [{ "url": "/workshop/", "title": "Workshop", "excerpt": "A practical introduction." }],
  "pagination": { "page": 1, "totalPages": 8 }
}
```

`page` is a one-based page number and `totalPages` is the number of pages in the list. For an empty list, `1.json` returns `items: []` and `pagination: { "page": null, "totalPages": 0 }`.

Each item requires a `url` and a `title`. Optional fields are `excerpt`, `pinned`, `thumbnail` and `properties`. Supply text without HTML or HTML escaping. For links and images, supply valid site-root paths that include the deployment prefix, or absolute HTTP(S) URLs. Site-root paths refer to the website, not the JSON host. JSON publishers prepare and validate these URLs and image attributes before sending them; the renderer escapes their HTML representation without parsing them.

A `thumbnail` contains `src` and optional `srcset`, `sizes`, `width` and `height`. Its optional `sources` array contains objects with `type` and `srcset` for alternative image formats. The optional numeric `lqip` field supplies the blur placeholder.

The `properties` object accepts:

- `date`: formatted date text.
- `author`: an object with `name` and `url`.
- `place`: an object with `name` and optional `address`.
- `tags`: an array of objects with `name`, `url` and optional `icon`.
- `readingTime`: an object with `label` and `wordsLabel`.
- `decorations`: the [post decoration fields](/getting-started/#post-decorations).

Icon names refer to entries in `inlinesvg.json5`. Actions additionally accept `external: true` to open a link in a new tab with `rel="noopener"`; omit it or set it to `false` for internal links and email actions. Other card links navigate normally. Markdown exports prepare this flag using the site's internal-URL configuration. Use an exported JSON file as a reference when creating your own source.

### Navigation and errors

Pagination links use `?page=N`; JSON requests use `N.json`. Reload, new tabs and browser Back/Forward select the page in the URL. Without a valid `page` query, an HTML page loads its corresponding JSON page. Use one list per HTML page.

If a request fails, the displayed cards and pagination links stay available. Click the link again to repeat the request, or reload if the initial load failed. Configure empty-list and error messages in `sitestrings.json5`.

## JSON metrics and actions

Set `features.liveMetricsActions: true` in `content/_data/siteelements.json5` to load metrics/actions for full posts. The default `false` renders their authored values directly. Postlists always render the metrics/actions supplied in their card data: authored values for static lists, or values from each JSON response for dynamic lists.

Eleventy generates `metrics-actions.json` beneath each full post's URL from its prepared front matter. For example, `/sample-2023-pinned-event/` loads `/sample-2023-pinned-event/metrics-actions.json`. The [JSON read source](#json-read-sources) configured through `jsonReadPrefix` applies to these requests and explicit refreshes.

### Response format

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

When enabled, metrics/actions on full posts start empty and load silently from the generated JSON. Posts without metrics or actions export empty arrays. Both `features.js` and `features.postproperties` must be enabled. Without JavaScript, full posts keep their content and badges readable.

In JSON list mode, each list response supplies the cards' metrics/actions, including on pagination. External list publishers supply these fields in each item's `properties.decorations`. Full posts continue to use `metrics-actions.json`. The default page layout does not display post properties. Cross-origin requests require CORS. Action URLs in responses must be validated by the publisher and include any deployment prefix. Set `external: true` for external action links; email actions can use `mailto:`. This is the same prepared action format as in postlists.

Every response must contain both `metrics` and `actions` arrays, with a string `label` for each item. The shared renderer handles the [post decoration fields](/getting-started/#post-decorations). Each array replaces its whole group; `[]` clears it. Numbers must be JSON numbers, not strings. Omit an unknown `value` or set it to `null`; it is not zero. A failed request or invalid response structure leaves the last valid presentation intact, or the initial region empty.

### Refreshing values

EMP fetches once on full-post initialization. Custom JavaScript can refresh a region through the same loader:

```js
const region = document.querySelector("[data-metrics-actions-url]");
region?.dispatchEvent(new Event("metricsactions:refresh"));
```

An update affects only that region; responses for removed regions or superseded refreshes are ignored. Action links navigate normally; action buttons require application-provided handlers.

## JSON read sources

By default, [JSON postlists](#json-postlists) and [JSON metrics/actions](#json-metrics-and-actions) read the files generated by EMP from your static host. Configure a read prefix when another path or service should supply those responses.

Set `jsonReadPrefix` in `content/_data/siteconfig.js` to change where browsers read postlist and metrics/actions JSON. The default `""` reads generated files at their normal URLs. With `"/api"`, the homepage still generates `postlist/1.json`, while the browser requests `/api/postlist/1.json`. Generated files and links inside responses keep their canonical paths.

The read prefix goes before the deployment-prefixed path: with `/blog/`, the request is `/api/blog/postlist/1.json`. A trailing slash is optional. An absolute HTTP(S) prefix such as `https://data.example/api` supports another origin, which must allow cross-origin requests (CORS). The host at the read URL supplies the responses.

## Local providers

Provider implementations live under `extensions/`; `_11ty/` contains the shared build adapters. Providers are selected by their names in `siteconfig.js`, not by an import list. Add their files and configuration in your site's branch; shared EMP code needs no changes. Names use letters, digits, hyphens or underscores. Provider entry files and browser sources are watched; restart `npm run dev` after changing statically imported provider helpers.

### Plugins

An entry such as `plugins: { example: { label: "Example" } }` loads `extensions/plugins/example/index.js`. Its default export may provide:

- `setup(eleventyConfig, options)` to register an Eleventy plugin, filter or other build behavior during configuration.
- `opengraph(options)`, `head(options)` and `bodyStart(options)` to return HTML.
- `css(options)` to return CSS for the site's stylesheet. Its returned CSS also participates in the stylesheet's cache hash; return the CSS itself, not an import of an untracked file.
- `js(options)` to return JavaScript for `content/utils/js.njk`. Return JavaScript source, without `<script>` tags. Its output and extension source files participate in the JavaScript cache hash.

All hooks may be asynchronous. Omitted hooks do nothing. Plugins run in configuration order. Use `true` to enable a plugin with default options, an object to enable it with custom options, or `false` to disable it. Omitted or `null` entries are also disabled. Hooks receive an empty options object for `true`.

The templates call `{% raw %}{% pluginsOpengraph %}`, `{% pluginsHead %}`, `{% pluginsBodyStart %}`, `{% pluginsCss %}` and `{% pluginsJs %}{% endraw %}` without arguments. The adapter imports `siteconfig.js` and reads `plugins`. Restart `npm run dev` after changing plugin settings or setup code.

```js
// extensions/plugins/example/index.js
export default {
    head(options) {
        return `<meta name="application-name" content="${options.label}">`;
    },
};
```

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

The adjacent `browser.js` defines an `authentication` object with asynchronous `restore()`, `signIn()` and `signOut()` methods. Each returns `{ id, name }` or `null`. Set `authentication.error` to show the menu's login/callback error status. The bundled providers expose public options as `authenticationOptions`. Derive provider-specific options or endpoints in the renderer when needed. Only the selected provider's returned browser code is bundled and included in its cache hash.

Providers may also expose synchronous `cached()`, returning the current session's cached `{ id, name }` or `null`, and `storageKey`, naming its localStorage record. The menu renders this cache before background `restore()` and reads it again after completion, so a late response cannot overwrite a newer session's display. Providers own cache updates, clearing and session binding: successful verification replaces the cache, failed verification removes it, and logout clears it with credentials. Cache-only changes must not count as credential replacement. Storage events repaint the cache without launching another request. Custom providers without these optional members continue to use the asynchronous result.

A provider needing a Worker can also supply `cloudflare(base, siteconfig, output)`, returning the complete Wrangler configuration. The shared build hook reads `wrangler.json`, calls this function and writes the generated configuration and deployment redirect. Without that hook, it leaves normal deployments alone and removes any previous EMP-generated redirect. Both build hooks may be asynchronous. GitHub's provider is a working example; its Worker-specific setup stays inside its provider folder.

### Custom postlist extensions

Create `extensions/postlist/<name>/index.js` and select its name in `siteconfig.pagination.postlist`. Export a default object with a `template` path relative to the project root and, if needed, a `setup(eleventyConfig)` function. An optional `js` template supplies JavaScript to `content/utils/js.njk`, without `<script>` tags. Use normal Nunjucks includes for source fragments. The parent supplies shared HTML and post-property helpers; the dynamic extension includes its card renderer, pagination renderer and controller in the same script. Both built-in providers reuse the renderers in `extensions/postlist/`. Only the selected extension is loaded. The static and dynamic extensions provide working examples.

The template receives `list`: prepared `items`, the first page's unprefixed `url`, `pagination` and a selected rendering `context`. Pagination contains one-based `page` (null when empty), `totalPages` and deployment-prefixed HTML `hrefs`. Card data and rendering context are shared between implementations; the core handles collections, ordering, page routes and preparation. The common `postlist.njk` renders the header directly inside the `.postlist` container, then includes the selected extension's template for the cards and pagination. Extensions own this rendering and any JSON exports or browser assets. Full-post properties and live metrics/actions remain independent.
