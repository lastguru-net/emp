---
title: "Getting Started"
date: "2025-05-23"
updated: "2025-08-17"
tags: article
author: "lastguru"
excerpt: "Learn how to configure and use the Eleventy Markdown Prime starter repository to create your first EMP-based website with this comprehensive guide."
---

Get started with the Eleventy Markdown Prime (EMP) starter repository using this concise guide. Whether you are a beginner or an experienced developer, this guide will walk you through the steps to set up your own website using EMP. You will learn how to create your site repository, run it locally, and deploy it online. EMP is designed to be simple yet powerful, making it an excellent choice for text-based blogs and content-driven websites.

## Table of Contents

1. [Create Your Site Repository](#create-your-site-repository)
2. [Run the Template Locally (Optional)](#run-the-template-locally-optional)
3. [Site Structure](#site-structure)
4. [File Structure](#file-structure)
5. [Configuration Files](#configuration-files)
6. [Posts and Pages](#posts-and-pages)
7. [Deploying to Cloudflare Pages](#deploying-to-cloudflare-pages)
8. [Other Deployment Environments](#other-deployment-environments)

## Create Your Site Repository

To build your website, you need your own copy of the EMP starter repository. This allows you to customize the site, save your changes, and deploy it online. The EMP starter repository is available here: [EMP Starter Repository](https://github.com/lastguru-net/emp).

### Steps to Create Your Repository

1. Go to the [EMP Starter Repository](https://github.com/lastguru-net/emp).
2. Click **Use this template** or **Fork** (see the next section for guidance on which to choose).
3. Name your repository and choose public or private.
4. If you want to edit files locally on your computer, clone your repository:
   ```
   git clone <your-repo-url>
   cd <your-repo>
   ```
5. Alternatively, you can edit files directly in your repository using GitHub's web interface. Simply navigate to the file you want to edit, click the pencil icon, make your changes, and commit them.

### Fork vs Template: Which Should You Choose?

- **Use this template**: Creates a new repository in your GitHub account with no connection to the original. Best if you want a clean start and don’t plan to sync updates from the EMP repository.
- **Fork**: Creates a copy of the repository in your GitHub account, keeping the full history and a link to the original (upstream). Ideal if you want to pull future updates from EMP or contribute back.

> **Note**: Choosing “Use this template” gives you a one‑time snapshot with no upstream link or shared commit history. Clean, independent, lightweight: only your future commits. You will not see later fixes, features, security tweaks, or structural changes added to EMP, however; adopting them later means comparing files manually and selective copying. A “Fork” keeps full history plus a live upstream reference, so new changes remain visible and can be merged or rebased. The more you alter core layouts, config files, build scripts, data structures, or directory organization, the harder upstream changes become to apply. Past a certain depth of customization, meaningful syncing can turn fragile, extremely time‑consuming, or effectively impossible. To mitigate it, significant structural changes that may benefit others should be pushed upstream. Template favors ownership and independence; fork favors ongoing co-evolution and traceability.

### Keeping Your Repository Updated

The EMP template will continue to receive new features and improvements. Keeping your repository updated ensures you benefit from these changes. However, the difficulty of updating depends on how much you have customized your repository:

- **Minimal changes**: Updates are straightforward and involve merging or rebasing changes from upstream.
- **Significant customizations**: Updates may require manual conflict resolution, especially if you have modified the same files as the upstream repository.

- **If you forked**:
  1. Open your fork on GitHub.
  2. Click **Sync fork** (or **Fetch upstream**) to pull updates from the EMP repository.
  3. Alternatively, use the command line (assuming the repository is correctly cloned and set up locally):
     ```
     git fetch upstream
     git merge upstream/main   # or: git rebase upstream/main
     git push
     ```

- **If you used the template**:  
  Your repository is not linked to the original EMP repository, so syncing updates is not supported. If you need updates, you can manually copy changes from the EMP repository.

## Run the Template Locally (Optional)

Running the site locally is optional. If you prefer, you can skip this step and deploy your site directly from the repository. See the [Deploying to Cloudflare Pages](#deploying-to-cloudflare-pages) section for details.

If you want to preview and edit your site locally, follow these steps.

### Prerequisites

1. Install **Git**: [Download Git](https://git-scm.com/downloads).
2. Install **Node.js** ("Current" version) and npm:
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
- [Beginner's Guide to Node.js](https://nodejs.dev/en/learn/)
- [Installing Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## Site Structure

The EMP theme has a modular design. At first glance, you’ll notice the distinctive sidebar and main content area, each containing configurable elements. Let’s break down the screen structure:

1. **Sidebar**: Always visible on larger screens and hidden on mobile devices. The sidebar is defined in the configuration files and includes:
   - Site logo or profile image
   - Site title and description
   - Main menu (manually defined for full control)
   - Social links (GitHub, LinkedIn, Mastodon, etc.)
2. **Top Bar**: Displayed only on mobile devices. It shows the site title and provides a hamburger icon to show the sidebar.
3. **Content Area**: Always visible on all screens, this is where your site content is displayed. Depending on the location, it serves the following purposes:
   - **Index Page (Landing Page)**: The first page visitors usually see.
     - Features an optional header image on top.
     - Lists all posts sorted by date. Each post includes a title, description (or excerpt), and optional properties like date, location, author, tags, and reading time.
     - Optional thumbnails can be enabled and placed on the left or right; they are responsive and clickable.
     - If there are more than 10 posts, pagination appears (10 posts per page) with navigation controls at the bottom.
   - **Tag Page**: Similar to the landing page but without a header image. Lists posts with a specific tag (e.g., "events").
     - Supports pagination and is generated automatically for each tag.
   - **Author Page**: Similar to the landing page but without a header image. Lists posts by a specific author (e.g., "lastguru").
     - Supports pagination and is generated automatically for each author.
     - When enabled, an author business card (photo, bio, website/email, socials) is displayed above the list.
   - **Post**: The most common content type — a blog post.
     - Includes a title, date, and optional image. Additional properties like location, author, and tags can be added.
     - Below each post, share buttons and navigation buttons for newer/older posts are available.
   - **Page**: Special content like "About Us." Pages are not listed among blog posts and do not include dates, post properties, or navigation buttons. They are typically linked directly in the main menu or from other posts or pages.
4. **Footer**: Optional footer with copyright information, privacy policy link and "Powered by" link.

## File Structure

Now that we understand the site’s main components, let’s explore the file structure. Static site generators like Eleventy do not have admin panels (unlike platforms like WordPress), so everything is managed through files. Knowing the file structure helps locate settings, templates, and where to add new content.

- Utility configuration files are located in the root folder (e.g., `/package.json`, `/eleventy.config.mjs`). Avoid modifying these unless necessary.
- **/_11ty**: Contains custom components that enhance Eleventy. Scripts for tasks like image transformation, link transformation, and excerpt generation are located here. Modifications are rarely needed.
- **/assets**: Stores shared files for your site. You can modify or add files here. Visitors can access these files via direct links.
  - **css**: Contains CSS files. The `site.css` file is processed by Tailwind CSS to generate `site-build.css`.
  - **js**: Contains JavaScript files. The `index.js` file is processed by esbuild to generate `min.js`.
- **/content**: Contains all site content.
  - **_data**: Stores site configuration (see below).
  - **_includes**: Contains template files for HTML output.
  - **images**: Stores image files. Linked images are automatically optimized and converted to various formats and sizes. Special images like the favicon are also stored here.
  - **pages**: Contains page files.
    - **pages.json**: Defines default variables for pages.
  - **posts**: Contains post files. For better organization, posts are subdivided into year-based subfolders (e.g., `/2025/`). Subfolder names do not appear in URLs, so you can name them freely. For smaller sites, this organization is optional.
    - **posts.json**: Defines default variables for posts.
  - **utils**: Contains additional templates like the "Error 404" page and `robots.txt`.
  - **index.njk**: Template for the landing page.
  - **author.njk**: Template for author pages.
  - **tag.njk**: Template for tag pages.

## Configuration Files

In addition to the file structure described earlier, the following configuration files play a crucial role in customizing and managing your site:

### `/content/_data/siteconfig.js`

This file contains the essential configuration settings for your site. It defines global properties such as the site title, URL and main images. There are comments for every setting in the file itself. Key sections include:

- **Site Metadata**: Title, description, author, and locale settings.
- **Images**: Paths for the sidebar profile image, favicon, and OpenGraph default image.
- **Pixels**: Analytics and tracking pixels.

This file is the starting point for setting up your site.

### `/content/_data/siteelements.json5`

This file contains configuration for site-specific elements such as menu items, fonts, social media links, header and footer settings. Key sections include:

- **Features**: Toggles for enabling/disabling features like post properties, JSON-LD structured data, sitemap generation, and social sharing buttons.
- **Fonts**: Google Fonts configuration for body and header typography that can be later used in `theme.css`.
- **Menu**: Labels and URLs for the home link and additional menu items.
- **Header**: Header image for the landing page.
- **Social Links**: Links to social media profiles (e.g., GitHub, LinkedIn, Mastodon). Also used for share attribution (e.g., X “via”).
- **Privacy Policy**: Configuration for the privacy policy link.
- **Powered by**: Powered by text and link.
- **Copyright**: Settings for copyright year, link, and text.

Modify this file to customize visible elements, navigation and site identity.

### `/content/_data/sitestrings.json5`

This file defines text strings used throughout the site. It allows you to customize or translate common UI elements such as:

- **Labels**: Words like "Share," "Older," "Newer," and "Events."
- **Tooltips**: Text for actions like "Copy page link to clipboard" and "Copied."

You can add your own keys and reference them in templates. Use it to adapt the site’s language and tone.

### `/content/_data/sitetags.json5`

This file manages tag-related configurations for posts. It includes:

- **notime**: Tags that hide post reading time in post properties (e.g., "events").
- **notag**: Tags that are hidden in post properties (e.g., "article," "posts").
- **events**: Tags that trigger Event JSON‑LD instead of BlogPosting.

This file helps control how tags are presented and used across the site.

### `/content/_data/siteauthors.json5`

This file defines per‑author metadata used to render the author business card on author pages. Each top‑level key is the author identifier used in your post header variables (`author: "name"`). If an author has no entry here, the business card is not displayed. The card can show the author’s name, profile image, bio, and links to a website and social media.

### `/assets/css/theme.css`

This file defines the core theme styles for your site, including fonts, colors, and layout spacing. It uses CSS custom properties (variables) to ensure flexibility and consistency across the site. Key sections include:

- **Fonts**: Defines the primary fonts for the body and headers using the `--font-body` and `--font-header` variables.
- **Colors**: Sets the sidebar background color (`--color-sidebar`), the accent color (`--color-accent`) used for highlights and links, and the content background (`--color-rightarea`).
- **Spacing**: Configures the maximum width for content (`--spacing-content`) and the width of the sidebar (`--spacing-sidebar`).

Notes:

- Any font used here **must** exist in visitors' browsers. Unless browser default built-in fonts are used (usually a bad idea, as it is impossible to guarantee consistency across devices), the fonts must be included in the `head.njk`. EMP supports loading Google Fonts, and it is the recommended option in most cases. The names of the fonts specified in both places must match exactly.
- The mobile top bar and the right content area use `--color-rightarea` by default.
- The site footer uses the sidebar background color (`--color-sidebar`), so it will follow changes you make to the sidebar background.

This file is processed by Tailwind CSS to generate the final `site-build.css` file, which is used to style the site. You can extend or override these variables to customize the theme further.

## Posts and Pages

Posts and pages are written in Markdown, a simple and widely-used markup language. You can learn more about Markdown’s features on the [Text and Typography](/text-and-typography) page. Each Markdown file has a `.md` extension and consists of two parts: a header and a content body.

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

### Header Variables

The header contains metadata for the post or page. Supported variables (all optional except **title** and **date** for posts):

- **title** (*required*): The title of the post or page. The URL is based on the title unless overriden in the header.
- **date** (*required for posts*): The date in `YYYY-MM-DD` format or with time in `YYYY-MM-DD HH:MM:SS` or `YYYY-MM-DD HH:MM:SS +/-TTTT` format.
- **updated**: Optional last modification date in the same formats as **date**. When present, it is used in JSON-LD and in the sitemap.
- **permalink**: Overrides the default URL for the post/page.
- **image**: Path to the title image, relative to the `content` folder.
- **excerpt**: A description used in post lists. If defined, it has no length limit. If omitted, an excerpt is auto-generated from the content (capped at full words, first paragraph, up to 250 characters).
- **tags**: One or more tags for the post. Depending on the configuration, some (or all) of the tags are displayed in the post lists.
- **author**: The author’s name. Used to generate author pages and displayed in post lists.
- **place**: The location of the post. Displayed in post lists, commonly used for events.
- **address**: The location address of the event. Displayed as a tooltip for **place** and in the Event JSON-LD structured data.
- **profilePage**: When set to `true` on a page (not posts), generates ProfilePage JSON‑LD and a corresponding Person/Organization node describing the site publisher. Commonly used for pages like “About Us.”

The `posts.json` and `pages.json` files contain the default header variables. The most important setting there is **permalink**, which defines, how URL is generated for the pages and posts. You can customize the default URL there. Note that the system depends on the **layout** and **tags** variables as they are set there, so it is not recommended to change them.

## Deploying to Cloudflare Pages

Once you have set up your repository and made changes to your site (either locally or directly on GitHub), the next step is to make your website accessible to others on the internet. Deployment is the process of taking your website files and hosting them on a server so they can be accessed via a web address (URL).

Cloudflare Pages is a beginner-friendly platform that automates this process, allowing you to deploy your site directly from your GitHub repository. It is free for most sites, so you don’t need to worry about hosting costs. Additionally, Cloudflare Pages offers several benefits:

- **Automatic Builds and Continuous Deployment**: Your site is rebuilt and redeployed automatically whenever you push changes to your repository. This ensures your site is always up-to-date without any manual intervention.
- **Global CDN**: Your site is served from Cloudflare’s global content delivery network, ensuring fast load times for visitors worldwide.
- **Free HTTPS**: Cloudflare Pages provides free HTTPS for your site, ensuring secure connections for your visitors.

This means you don’t need to manually upload files or configure servers — Cloudflare Pages handles everything for you.

### Steps to Deploy

1. Ensure you have a Cloudflare account. If not, create one at [Cloudflare](https://www.cloudflare.com/). It is free.
2. Push your project to a Git repository (GitHub or GitLab).
3. **Create a new project**:
   - Log in to your Cloudflare account and navigate to the **Workers and Pages** section.
   - Click **Create**, select **Pages**, and connect your Git repository.
4. **Configure build settings**:
   - In the **Build settings** section, set:
     - **Framework preset**: Eleventy
     - **Build command**: `npm run build`
     - **Output directory**: `_site`
   - Add an environment variable:
     - **NODE_ENV**: `production` (enables features, such as minification and caching)
5. **Start Deployment**:
   - Click **Save and Deploy**. Cloudflare Pages will build and deploy your site.
   - Once the deployment is complete, you will receive a unique URL for your site.

### Custom Domain (Optional)

To use a custom domain:

1. Open your Cloudflare Pages project you just created.
2. Go to the **Custom domains** section.
3. Add your domain and follow the instructions to configure DNS settings.

## Other Deployment Environments

While Cloudflare Pages is a great option, other platforms like **Netlify**, **Vercel**, and **GitHub Pages** also offer comparable features. These include automatic builds, continuous deployment, global CDNs, and free HTTPS. You can choose the platform that best fits your preferences or existing workflows. For all environments, ensure that the `NODE_ENV` variable is set to `production` during production deployments to enable all optimizations.
