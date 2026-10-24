---
title: "Getting Started"
date: "2025-05-23"
updated: "2026-10-23"
tags: article
author: "lastguru"
excerpt: "Create, configure and deploy a website with Eleventy Markdown Prime."
---

This guide covers creating an Eleventy Markdown Prime (EMP) repository, configuring the site, adding content and deploying it.

For optional authentication, user-menu and JSON data setups, see [Advanced Setup](/advanced-setup/).

## Table of Contents

1. [Create Your Site Repository](#create-your-site-repository)
2. [Run the Template Locally (Optional)](#run-the-template-locally-%28optional%29)
3. [Site Structure](#site-structure)
4. [File Structure](#file-structure)
5. [Configuration Files](#configuration-files)
6. [Posts and Pages](#posts-and-pages)
7. [Deploying to Cloudflare Workers](#deploying-to-cloudflare-workers)
8. [Other Deployment Environments](#other-deployment-environments)

## Create Your Site Repository

To build your website, you need your own copy of the EMP starter repository. This allows you to customize the site, save your changes, and deploy it online. The EMP starter repository is available here: [EMP Starter Repository](https://github.com/lastguru-net/emp).

### Steps to Create Your Repository

1. Go to the [EMP Starter Repository](https://github.com/lastguru-net/emp).
2. Click **Use this template** or **Fork** (see the next section for guidance on which to choose).
3. Name your repository. With **Use this template**, choose public or private; a fork of the public EMP repository is public.
4. If you want to edit files locally on your computer, clone your repository:
   ```
   git clone <your-repo-url>
   cd <your-repo>
   ```
5. Alternatively, you can edit files directly in your repository using GitHub's web interface. Simply navigate to the file you want to edit, click the pencil icon, make your changes, and commit them.

### Fork vs Template: Which Should You Choose?

- **Use this template**: Creates a new repository in your GitHub account with no connection to the original. Best if you want a clean start and don't plan to sync updates from the EMP repository.
- **Fork**: Creates a copy of the repository in your GitHub account, keeping the full history and a link to the original (upstream). Ideal if you want to pull future updates from EMP or contribute back.

> **Note**: Changes to layouts, configuration or build scripts may need manual adaptation when merging upstream updates, especially if your directory structure differs from EMP.

### Keeping Your Repository Updated

- **If you forked**:
  1. Open your fork on GitHub.
  2. Click **Sync fork** (or **Fetch upstream**) to pull updates from the EMP repository.
  3. Alternatively, use the command line after adding the original repository as an `upstream` remote (once per clone):
     ```
     git remote add upstream https://github.com/lastguru-net/emp.git
     ```
     Then fetch and merge updates:
     ```
     git fetch upstream
     git merge upstream/main   # or: git rebase upstream/main
     git push
     ```

- **If you used the template**:  
  Your repository has no shared commit history with EMP, so GitHub's **Sync fork** option is not available. If you need updates, you can manually copy changes from the EMP repository.

## Run the Template Locally (Optional)

Running the site locally is optional. If you prefer, you can skip this step and deploy your site directly from the repository. See the [Deploying to Cloudflare Workers](#deploying-to-cloudflare-workers) section for details.

If you want to preview and edit your site locally, follow these steps.

### Prerequisites

1. Install **Git**: [Download Git](https://git-scm.com/downloads).
2. Install **Node.js 24 or newer** and npm:
   - Visit the [Node.js Download Page](https://nodejs.org/en/download/), which provides both prebuilt packages and instructions for setting up a version manager (e.g., nvm).
   - Using a version manager is recommended as it makes it easier to update Node.js in the future.
3. Verify installation:
   ```
   node -v
   npm -v
   ```

### Running the Site Locally

1. Go to the repository folder.
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open the URL shown in the terminal (usually `http://localhost:8080`) to preview your site.

For more detailed guides on setting up Node.js and npm, check:

- [Beginner's Guide to Node.js](https://nodejs.org/en/learn/)
- [Installing Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Site Structure

The regular layout has four areas:

1. **Sidebar**: Always visible on larger screens and opened with the menu button on mobile devices. The sidebar is defined in the configuration files and includes:
   - Site logo or profile image
   - Site title and description
   - Main menu (manually defined for full control)
   - Search button (opens a search modal window)
   - Social links (GitHub, LinkedIn, Mastodon, etc.), shown in the sidebar or footer
2. **Top Bar**: Displayed only on mobile devices. It shows the site title and provides a hamburger icon to show the sidebar.
3. **Content Area**: Always visible on all screens, this is where your site content is displayed. Depending on the location, it serves the following purposes:
   - **Index Page (Landing Page)**: The first page visitors usually see.
     - Features an optional header image on top.
     - Lists non-hidden posts newest first, with pinned posts at the top. Each post includes a title, description (or excerpt), and optional properties like date, location, author, tags, and reading time.
     - Optional thumbnails can be enabled and placed on the left or right; they are responsive and clickable.
     - If there are more than a configured number of posts (10 by default), pagination with navigation controls appears at the bottom.
   - **Tag Page**: Similar to the landing page but without a header image. Lists non-hidden content with a specific tag (e.g., "events").
     - Supports pagination and is generated automatically for each tag.
   - **Author Page**: Similar to the landing page but without a header image. Lists non-hidden content with a specific author (e.g., "lastguru").
     - Supports pagination and is generated automatically for each author.
     - When enabled, an author business card (photo, bio, website/email, socials) is displayed above the list.
   - **Post**: The most common content type - a blog post.
     - Includes a title, date, and optional image. Additional properties like location, author, and tags can be added.
     - Below each post, share buttons and navigation buttons for newer/older posts are available.
   - **Page**: Special content like "About Us." Pages are not included in the main blog post list or feeds, but can appear in tag or author listings when that metadata is set. Their layout omits dates, post properties and newer/older navigation buttons. They are typically linked directly in the main menu or from other posts or pages.
4. **Footer**: Optional footer with social links, copyright information, privacy policy link and "Powered by" link.

## File Structure

Site content, configuration and templates are stored in these files and directories:

- Utility configuration files are located in the root folder (e.g., `/package.json`, `/eleventy.config.mjs`). Avoid modifying these unless necessary.
- **/_11ty**: Contains custom components that enhance Eleventy. Scripts for tasks like image transformation, link transformation, and excerpt generation are located here. Modifications are rarely needed.
- **/extensions**: Contains the selectable authentication methods, postlist renderers and plugins. See [Advanced Setup](/advanced-setup/#local-providers) to add your own.
- **/assets**: Stores shared files for your site. You can modify or add files here. Visitors can access these files via direct links.
  - **css**: Contains CSS source files. Eleventy assembles them through `content/utils/css.njk`, and Tailwind CSS compiles and minifies the result into `_site/assets/css/min.css`. Add custom styles in `custom.css`.
  - **js**: Contains JavaScript files. The `min.js` file is generated by Eleventy (`content/utils/js.njk`) by inlining feature scripts.
- **/content**: Contains all site content.
  - **_data**: Stores site configuration (see below).
  - **_includes**: Contains template files for HTML output.
  - **images**: Stores image files. Images displayed in page content are automatically optimized and converted to various formats and sizes. Special images like the favicon are also stored here.
  - **pages**: Contains page files.
    - **pages.json**: Defines default variables for pages.
  - **posts**: Contains post files. For better organization, posts are subdivided into year-based subfolders (e.g., `/2025/`). Subfolder names do not appear in URLs, so you can name them freely. For smaller sites, this organization is optional.
    - **posts.json**: Defines default variables for posts.
  - **utils**: Contains additional templates like the "Error 404" page and `robots.txt`.
  - **index.njk**: Template for the landing page.
  - **index.11tydata.js**: Pagination size control for the landing page.
  - **author.njk**: Template for author pages.
  - **tag.njk**: Template for tag pages.

## Configuration Files

Edit the following files to configure the site:

### `/content/_data/siteconfig.js`

This file contains the essential configuration settings for your site. It defines global properties such as the site title, URL and main images. There are comments for every setting in the file itself. Key sections include:

- **Site Metadata**: Title, description, author, and locale settings.
- **Images**: Paths for the sidebar profile image, favicon, and OpenGraph default image.
- **Plugins**: Optional syntax highlighting, Google Fonts, Google tag and Meta app/pixel configuration.
- **Pagination**: number of posts per page, and the link prefixes for author/tag pages.

Start by setting `url` to your complete public site URL, including any deployment subpath, for example `https://example.com/blog/`. It controls generated links, metadata and feeds. If you do not yet know the final URL, update it after the first deployment. Restart the development server after changing these settings.

### `/content/_data/siteelements.json5`

This file contains configuration for site-specific elements such as menu items, social media links, header and footer settings. Key sections include:

- **Features**: Settings for post properties, JSON-LD structured data, the sitemap link, and social sharing buttons. The sitemap file is generated regardless of its link setting. Set `features.postproperties` to `"below"` (default) or `"above"` for placement relative to the full-post image, or `false` to hide properties everywhere. `true` also places properties below the image.
- **Feeds**: Full content or excerpts, RSS/Atom/JSON links in the HTML head, and the RSS link in the footer. Feed files are generated regardless of their link settings.
- **Menu**: Labels and URLs for the home link and additional menu items.
- **Header**: Header image for the landing page.
- **Social Links**: Links to social media profiles (e.g., GitHub, LinkedIn, Mastodon). Also used for share attribution (e.g., X "via").
- **Privacy Policy**: Configuration for the privacy policy link.
- **Powered by**: Powered by text and link.
- **Copyright**: Settings for copyright year, link, and text.

Modify this file to customize visible elements, navigation and site identity. For the optional user menu and browser-loaded post lists, see [Advanced Setup](/advanced-setup/).

### `/content/_data/sitestrings.json5`

This file defines text strings used throughout the site. It allows you to customize or translate common UI elements such as:

- **Labels**: Words like "Share," "Older," "Newer," and "Events."
- **Tooltips**: Text for actions like "Copy page link to clipboard" and "Copied."

You can add your own keys and reference them in templates. Use it to adapt the site's language and tone. Note that multiple languages can be defined there. The language is selected by the `lang` option in the `siteconfig.js`.

### `/content/_data/sitetags.json5`

This file manages tag-related configurations for posts. It includes:

- **notime**: Tags that hide post reading time in post properties (e.g., "events").
- **notag**: Tags that are hidden in post properties (e.g., "article," "posts").
- **events**: Tags that trigger Event JSON-LD instead of BlogPosting.
- **icons**: Overrides for the standard tag icon in post properties.
- **aliases**: Maps a tag to another canonical tag when linking from post properties.

This file helps control how tags are presented and used across the site.

### `/content/_data/siteauthors.json5`

This file defines per-author metadata used to render the author business card on author pages. Each top-level key is the author identifier used in your post header variables (`author: "name"`). If an author has no entry here, the business card is not displayed. The card can show the author's name, profile image, bio, and links to a website and social media.

### `/assets/css/theme.css`

This file defines the core theme styles for your site, including fonts, colors, and layout spacing. It uses CSS custom properties (variables) to ensure flexibility and consistency across the site. Key sections include:

- **Fonts**: Defines the primary fonts for the body and headers using the `--font-body` and `--font-header` variables.
- **Colors**: Defines the palette for backgrounds, text, and common UI states, plus the accent color (`--color-accent`) used on interactive highlights and hovers.
- **Spacing**: Configures the maximum width for content (`--spacing-content`) and the width of the sidebar (`--spacing-sidebar`).

Notes:

- Use fonts installed on visitors' devices or load web fonts. Configure Google Fonts in `plugins["google-fonts"]` in `/content/_data/siteconfig.js`; use the corresponding font family names in `theme.css`. The fallback fonts in each list are used when the preferred font is unavailable.
- The content area uses `--color-rightarea-bg` and `--color-rightarea-bg-dark` for its light and dark backgrounds. The mobile top bar uses `--color-topbar-bg` and `--color-topbar-bg-dark`, which default to the light content background and sidebar background respectively.
- The footer background (`--color-footer-bg`) defaults to the sidebar background (`--color-sidebar-bg`).

This file is processed by Tailwind CSS to generate the final `min.css` file, which is used to style the site. You can extend or override these variables to customize the theme further.

## Posts and Pages

Posts and pages are written in Markdown, a simple and widely-used markup language. You can learn more about Markdown's features on the [Text and Typography](/text-and-typography) page. Each Markdown file has a `.md` extension and consists of two parts: a header and a content body.

Example:

```markdown
---
title: "Sample 2023 Event"
date: "2023-06-09"
place: "Somewhere over the rainbow"
tags: events
excerpt: "Excerpt of the description for the sample event."
---

## What a Great Event

Sample event. Please visit us.
```

### Post updates

Add dated updates in a folder beside the main post with the same filename stem:

```text
content/posts/2023/sample-event.md
content/posts/2023/sample-event/places-filling.md
content/posts/2023/sample-event/workshop-recap.md
```

The same convention works directly under `posts/` and at any nesting depth. Markdown files in the matching folder belong to its sibling post. Each update has a required `date`, an optional `title`, and a Markdown body:

```markdown
---
date: "2023-06-10T17:30:00+03:00"
title: Thank you for joining
---
Thank you to everyone who joined the **workshop**.
```

The build renders updates beneath the main body, newest first, using the site's date/time formatting. Updates appear on post pages and the single-post homepage, but are excluded from feeds, search text and reading-time/word counts. The latest update date contributes to the parent's modification date; its publication date and authored excerpt remain as written.

Rebuild after adding, editing or removing an update. The [sample event](/sample-2023-pinned-event/) demonstrates the result. When current details such as the venue change, edit those details in the main post and use an update to explain the change.

### Editing with PagesCMS (Optional)

For browser-based editing, [Pages CMS](https://pagescms.org/) connects to your GitHub repository using the included `.pages.yml` configuration. Open [Pages CMS](https://app.pagescms.org/), sign in with GitHub, grant access to your repository, and select the repository and branch to edit. See its [documentation](https://pagescms.org/docs/) for more details.

Saved changes become Git commits. They trigger a rebuild when the edited branch is connected to your deployment workflow.

### Header Variables

The header contains metadata for the post or page. Set **title** for both posts and pages, and an explicit **date** for posts. Supported variables include:

- **title** (*required*): The title of the post or page. The URL is based on the title unless overridden in the header.
- **date** (*recommended for posts*): The publication date in `YYYY-MM-DD` or `YYYY-MM-DD HH:MM:SS` format. For an explicit timezone offset, use an ISO datetime such as `2026-10-19T12:00:00+03:00`. Dates and times without a timezone are interpreted as UTC; all date output uses UTC.
- **updated**: Optional last modification date in the same formats as **date**. When present, it is used in BlogPosting JSON-LD, the sitemap, and the Atom and JSON feeds.
- **permalink**: Overrides the default URL for the post/page.
- **image**: Path to the title image, relative to the `content` folder.
- **thumbnail**: Optional path for a thumbnail image to use in post lists instead of the title image. To hide the thumbnail completely instead, use `thumbnail: false`.
- **attachments**: Optional list of local site-file paths. An Attachments block displays filename-only links above any post updates; an omitted or empty list produces no block. Use site-root paths, such as the example below. General files can live under `assets/`, which is copied unchanged; existing images are available under `/images/`.
- **excerpt**: A description used in post lists. If defined, it has no length limit. If omitted, an excerpt is generated from the first nonempty line of rendered content after removing HTML tags, shortened to at most 250 characters at a word boundary where possible. An ellipsis is added when content is omitted.
- **tags**: One or more tags for the post. Depending on the configuration, some (or all) of the tags are displayed in the post lists.
- **author**: The author identifier, matching a key in `siteauthors.json5` when author metadata is provided. Used to generate author pages; the author's `fullName` is displayed when configured, otherwise the identifier is shown.
- **place**: The location of the post. Displayed in post lists, commonly used for events.
- **address**: The location address of the event. Displayed as a tooltip for **place** and in the Event JSON-LD structured data.
- **profilePage**: When set to `true` on a page (not a post), generates ProfilePage JSON-LD and a corresponding Person/Organization node describing the site publisher. Commonly used for pages like "About Us."
- **hidden**: When set to `true` on a post or page, excludes it from listings, search, the sitemap and feeds. Its HTML file is still generated and accessible by URL, so this does not make a draft private.
- **pinned**: When set to `true`, puts the post ahead of unpinned posts in landing and author/tag listings and feeds. Within each group, posts are sorted newest first.

For example, the [sample event](/sample-2023-pinned-event/) links to the existing image as `sample.png`:

```yaml
attachments:
  - /images/sample.png
```

Attachment paths are plain local paths, not external URLs. Like updates, the attachment block appears on post pages and the single-post homepage, but is excluded from feeds, search text and reading-time/word counts.

The `posts.json` and `pages.json` files contain the default header variables. The most important setting there is **permalink**, which defines how URLs are generated for pages and posts. You can customize the default URL there. Note that the system depends on the **layout** and **tags** variables as they are set there, so it is not recommended to change them.

### Post decorations

Posts can add optional `decorations` to their front matter. They appear with post properties in lists and on full posts; `siteelements.features.postproperties` controls both.

```yaml
decorations:
  badges:
    - label: "Workshop"
      variant: primary
  metrics:
    - label: "Participants"
      value: 18
      max: 30
      progress: true
    - label: "Capacity"
      max: 30
  actions:
    - label: "Sign up"
      href: "https://example.org/register"
      icon: calendar
      variant: primary
```

- Badges require a `label`. Badges and actions share the optional `variant`: `neutral` (default), `primary` (site accent), `success` or `warning`.
- Metrics take a `label` and a numeric `value`, `max`, or both. Zero is displayed; a maximum alone does not imply a current count. Optional `progress: true` adds a bar when a value and positive maximum exist. The text retains the actual numbers even beyond the maximum.
- Actions require a `label`. A supplied `href` produces a normal link; without it, the control is a button with no attached behavior. Optional `icon` names an entry in `inlinesvg.json5`; omit it for text-only controls.
- `disabled: true` produces a disabled, non-navigating button, even if `href` is present. For a closed event, you can use `label: "Closed"`, `variant: warning` and `disabled: true`. The [sample event](/sample-2023-pinned-event/) demonstrates a neutral "Past event" button with an icon. A text-only signup link simply omits `icon`.

Each decoration group is optional. Set labels, numbers and availability in front matter; they do not update automatically from the event date or capacity. Point signup links to your registration service. For browser-loaded metrics and actions, see [Advanced Setup](/advanced-setup/#json-metrics-and-actions).

## Deploying to Cloudflare Workers

Cloudflare Workers builds the site from your Git repository and serves the generated files over HTTPS. Pushes to the configured production branch trigger a build and deployment.

### Steps to Deploy

1. Ensure you have a Cloudflare account. If not, create one at [Cloudflare](https://www.cloudflare.com/). It is free.
2. Push your project to a Git repository (GitHub or GitLab).
3. **Create a new project**:
   - Log in to your Cloudflare account and navigate to the **Compute** section, **Workers & Pages** subsection.
   - Click **Create application**, and connect your Git repository.
4. **Configure build settings**:
   - In the **Create an app** step, set:
     - **Worker name**: the same value as `name` in the root `wrangler.json`. To use your own name, update that file and commit it before deploying.
     - **Production branch**: the branch to publish, usually `main`.
     - **Root directory**: the repository root.
     - **Build command**: set `npm run build`.
     - **Deploy command**: use `npx wrangler deploy`.
   - Click on the **Advanced settings** and add an environment variable (enables HTML, feed and JavaScript minification):
     - **Variable name**: `NODE_ENV`
     - **Variable value**: `production`
5. **Start Deployment**:
   - Click **Save and Deploy**. Cloudflare Workers will build and deploy your site.
   - Once the deployment is complete, you will receive a unique URL for your site. Set `siteconfig.url` to that public URL (or your custom domain below), then commit the change to rebuild with correct links and metadata.

For further build settings and troubleshooting, see [Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

### Custom Domain (Optional)

To use a custom domain:

1. Ensure the domain is an active Cloudflare zone.
2. Open your Worker and go to **Settings > Domains & Routes > Add > Custom Domain**.
3. Enter the hostname and select **Add Custom Domain**. Cloudflare creates its DNS record and certificate.
4. Set `siteconfig.url` to your final public URL and commit the change.

See [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/) for requirements and existing-DNS conflicts.

## Other Deployment Environments

EMP can also be deployed on Netlify, Vercel, GitHub Pages or another static host. Build with `NODE_ENV=production` and publish the contents of `_site`. Configure the host's build workflow according to its documentation.

### GitHub Pages Project Sites

For a site published at `https://username.github.io/repository/`, set the complete public URL in `siteconfig.url`:

```js
url: "https://username.github.io/repository/",
```

The normal production build derives the path prefix from this URL. Run `NODE_ENV=production npm run build` and publish the contents of `_site` at that path.

Use Markdown for internal links, such as `[Getting Started](/getting-started/)`. Write these paths relative to the site root, without the deployment prefix; the renderer adds it. In Nunjucks templates, use the `url` filter for internal URLs. Keep image source paths unchanged so the image generator can locate the original files. Literal URLs in raw HTML are not automatically prefixed.
