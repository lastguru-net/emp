# Changelog

Release history based on the [published GitHub release notes](https://github.com/lastguru-net/emp/releases). Dates are publication dates in UTC.

## [6.3.0](https://github.com/lastguru-net/emp/releases/tag/v6.3.0) - 2026-09-05

### Changed

- Upgraded Eleventy (Build Awesome) to version 4.

## [6.2.13](https://github.com/lastguru-net/emp/releases/tag/v6.2.13) - 2026-09-03

### Fixed

- Fixed accessibility issues.

## [6.2.12](https://github.com/lastguru-net/emp/releases/tag/v6.2.12) - 2026-08-31

### Added

- Added copy controls to code blocks.

### Fixed

- Corrected feed dates to reflect the last modification date.

## [6.2.11](https://github.com/lastguru-net/emp/releases/tag/v6.2.11) - 2026-08-30

### Fixed

- Fixed styling inconsistencies.
- Fixed the share button.

## [6.2.10](https://github.com/lastguru-net/emp/releases/tag/v6.2.10) - 2026-08-29

### Added

- Added code block headers.

## [6.2.9](https://github.com/lastguru-net/emp/releases/tag/v6.2.9) - 2026-08-26

### Added

- Added deterministic tests.

### Changed

- Updated dependencies.
- Required Node.js 24 or newer.
- Replaced direct Luxon usage with compatible native APIs and `Intl` localization.
- Improved search accessibility.
- Standardized URL generation.

## [6.2.8](https://github.com/lastguru-net/emp/releases/tag/v6.2.8) - 2026-06-11

### Changed

- Updated dependencies.
- Cleaned up Unicode punctuation.

### Fixed

- Corrected the Pages CMS schema.

## [6.2.7](https://github.com/lastguru-net/emp/releases/tag/v6.2.7) - 2026-05-24

### Changed

- Updated dependencies.

## [6.2.6](https://github.com/lastguru-net/emp/releases/tag/v6.2.6) - 2026-04-25

### Changed

- Updated dependencies.

## [6.2.5](https://github.com/lastguru-net/emp/releases/tag/v6.2.5) - 2026-03-01

### Added

- Added an option to download Google Fonts at build time and serve them locally.

### Changed

- Optimized the code and improved collection generation.
- Slugified tag links.

## [6.2.4](https://github.com/lastguru-net/emp/releases/tag/v6.2.4) - 2026-02-25

### Fixed

- Fixed mobile scrolling so the dynamic viewport works correctly.
- Fixed minor CSS issues.

## [6.2.3](https://github.com/lastguru-net/emp/releases/tag/v6.2.3) - 2026-02-25

### Changed

- Improved search index generation.

### Fixed

- Fixed excerpt generation.

## [6.2.2](https://github.com/lastguru-net/emp/releases/tag/v6.2.2) - 2026-02-24

### Changed

- Added and revised comments for clarity.
- Refactored templates and JavaScript for clarity.

## [6.2.1](https://github.com/lastguru-net/emp/releases/tag/v6.2.1) - 2026-02-24

### Changed

- Standardized spacing, indentation, syntax and code style.

## [6.2.0](https://github.com/lastguru-net/emp/releases/tag/v6.2.0) - 2026-02-24

### Added

- Added full-text, in-memory search using MiniSearch.

## [6.1.4](https://github.com/lastguru-net/emp/releases/tag/v6.1.4) - 2026-02-10

### Changed

- Removed synchronous file access.

## [6.1.3](https://github.com/lastguru-net/emp/releases/tag/v6.1.3) - 2026-02-09

### Added

- Added an option to place the RSS icon in the footer.
- Added support for overriding post thumbnails in post lists.

### Changed

- Improved low-quality image placeholder (LQIP) generation.

## [6.1.2](https://github.com/lastguru-net/emp/releases/tag/v6.1.2) - 2026-02-08

### Changed

- Integrated Tailwind CSS generation directly into Eleventy, eliminating the separate CLI module.

## [6.1.1](https://github.com/lastguru-net/emp/releases/tag/v6.1.1) - 2026-02-07

### Changed

- Renamed CSS build files.

## [6.1.0](https://github.com/lastguru-net/emp/releases/tag/v6.1.0) - 2026-02-07

### Added

- Added a swipe-left gesture to close the sidebar on mobile devices.
- Added optional initial-letter styling for the first paragraph.

### Changed

- Split CSS and JavaScript by feature and bundled them through Eleventy, excluding styles and scripts for disabled features.

### Removed

- Removed esbuild; Eleventy now handles JavaScript bundling.

## [6.0.3](https://github.com/lastguru-net/emp/releases/tag/v6.0.3) - 2025-12-28

### Changed

- Switched CSS minification to Lightning CSS, included with Tailwind CSS 4.

### Removed

- Removed PostCSS and cssnano, eliminating more than 80 dependencies.

## [6.0.2](https://github.com/lastguru-net/emp/releases/tag/v6.0.2) - 2025-12-28

### Changed

- Refined HTML minification.
- Reworked HTML transforms to use Eleventy's internal PostHTML processing.

## [6.0.1](https://github.com/lastguru-net/emp/releases/tag/v6.0.1) - 2025-12-25

### Fixed

- Replaced the HTML minification library to address WhatsApp and Signal link preview issues.

## [6.0.0](https://github.com/lastguru-net/emp/releases/tag/v6.0.0) - 2025-12-23

### Fixed

- Fixed miscellaneous styling issues.

## [5.5.4](https://github.com/lastguru-net/emp/releases/tag/v5.5.4) - 2025-12-23

### Fixed

- Fixed dark-mode styling on the 404 page.

## [5.5.3](https://github.com/lastguru-net/emp/releases/tag/v5.5.3) - 2025-12-22

### Fixed

- Fixed styling issues, primarily in pagination.

## [5.5.2](https://github.com/lastguru-net/emp/releases/tag/v5.5.2) - 2025-12-21

### Added

- Added optional low-quality image placeholder (LQIP) generation.
- Added support for hiding posts from indexes before publication.
- Added initial Pages CMS configuration for creating and editing content in a browser.

### Changed

- Improved pagination and its configuration.

## [5.5.1](https://github.com/lastguru-net/emp/releases/tag/v5.5.1) - 2025-12-08

### Changed

- Adjusted CSS colors.

## [5.5.0](https://github.com/lastguru-net/emp/releases/tag/v5.5.0) - 2025-12-08

### Added

- Added dark mode and an optional light/dark mode toggle.
- Added localized site strings, with the language selected in configuration.

## [5.4.3](https://github.com/lastguru-net/emp/releases/tag/v5.4.3) - 2025-12-05

### Changed

- Moved color definitions from the main stylesheet to the theme file and made all colors semantic.

## [5.4.2](https://github.com/lastguru-net/emp/releases/tag/v5.4.2) - 2025-12-05

### Added

- Added support for pinning posts at the top of post lists.
- Added customizable tag icons.

## [5.4.1](https://github.com/lastguru-net/emp/releases/tag/v5.4.1) - 2025-12-04

### Added

- Added an option to round the sidebar image.

### Changed

- Improved image compression.

## [5.4.0](https://github.com/lastguru-net/emp/releases/tag/v5.4.0) - 2025-11-04

### Changed

- Improved embedded Google Fonts `@font-face` CSS.
- Improved responsiveness of thumbnails and the site logo.

### Fixed

- Fixed responsiveness of larger images.
- Corrected the minification configuration.

## [5.3.1](https://github.com/lastguru-net/emp/releases/tag/v5.3.1) - 2025-10-22

### Changed

- Embedded Google Fonts `@font-face` CSS for faster loading.
- Reduced the size of some icons.
- Applied PageSpeed optimizations.

## [5.3.0](https://github.com/lastguru-net/emp/releases/tag/v5.3.0) - 2025-10-08

### Added

- Added RSS, Atom and JSON feeds.

### Changed

- Reworked minification to cover all generated output.
- Changed and reduced dependencies for faster builds.

## [5.2.0](https://github.com/lastguru-net/emp/releases/tag/v5.2.0) - 2025-10-05

### Added

- Added a "Powered by" link to the footer.

### Changed

- Converted configuration files to JSON5 for readability.
- Moved some settings from `siteconfig.js` to `siteelements.json5`.
- Improved documentation.

## [5.1.1](https://github.com/lastguru-net/emp/releases/tag/v5.1.1) - 2025-10-01

### Added

- Added a "Powered by" link to the footer.

### Changed

- Updated the header and sample images.
- Updated dependencies.

## [5.1.0](https://github.com/lastguru-net/emp/releases/tag/v5.1.0) - 2025-09-12

### Added

- Added a new 404 page.

### Changed

- Migrated from Rollup to esbuild.
- Updated dependencies.

### Removed

- Removed accidentally included content.

## [5.0.0](https://github.com/lastguru-net/emp/releases/tag/v5.0.0) - 2025-08-20

### Added

- Initial public release.
