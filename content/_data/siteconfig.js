export default {
    // Main website title (displayed in the sidebar and page title)
    title: "Eleventy Markdown Prime",

    // Complete public site URL, including any deployment subpath
    // (used throughout the site to generate absolute and root-relative URLs)
    url: "https://emp-starter.lastguru.dev",
    // Alternative/internal URLs that should not be treated as external
    internalUrls: [
    ],

    // Prefix for client postlist and metrics/actions JSON requests
    jsonReadPrefix: "",

    // Sidebar profile image (relative path from the site root)
    image: "/images/logo.png",
    // Alt text for the sidebar profile image (for accessibility)
    imageAlt: "",

    // Author name (used in meta tags and JSON-LD structured data)
    author: "lastguru",
    // Author type ("Person" or "Organization", used in JSON-LD)
    authorType: "Person",

    // Short site description (displayed below the sidebar image and used in meta tags)
    description: "A minimalistic text-focused Eleventy theme",

    // OpenGraph locale (used for social sharing metadata)
    locale: "en_US",
    // Default language for HTML lang and post properties and site strings
    lang: "en",

    // Default OpenGraph image (used if no image is specified in page frontmatter)
    openGraphDefaultImage: "/images/logo.png",

    // Favicon and icon configuration
    // - 'favicon': main favicon path
    // - 'faviconSizes': sizes for PNG favicons
    // - 'appleiconSizes': sizes for Apple Touch icons
    // - 'webmanifestSizes': sizes for Webmanifest icons
    favicon: "/images/favicon.png",
    faviconSizes: [16, 32, 64],
    appleiconSizes: [180],
    webmanifestSizes: [192, 512],

    // Optional plugins
    plugins: {
        // Google Fonts configuration for typography
        // - 'local': specify local font loading behavior
        //   - "none": load CSS and font files from Google in the browser
        //   - "css": include Google's @font-face CSS in the site stylesheet; font files are fetched from Google
        //   - "full": download CSS and font files at build time and serve them from the site
        // - 'swap': controls 'font-display: swap' behavior
        //   - false (default): use Google's default font-display behavior
        //   - true: show a fallback font while loading; this can cause a flash of unstyled text (FOUT)
        //   - enable swap if a flash of invisible text (FOIT) is more disturbing
        // - 'body' and 'header': specify font families and weights
        //
        // Every weight and style used anywhere must be defined here:
        // - weights starting with "0," are non-italic
        // - weights starting with "1," are italic
        "google-fonts": {
            local: "css",
            swap: false,
            body: {
                family: "Montserrat",
                weights: "0,400;0,700;1,400;1,700"
            },
            header: {
                family: "Titillium+Web",
                weights: "0,400;0,500;0,600;0,700"
            }
        },
        // Toggle syntax highlighting and its CSS
        "syntax-highlighting": true,
        google: {
            tagId: "",
        },
        meta: {
            appId: "",
            pixelId: "",
        },
    },

    // Optional browser authentication; null disables the authentication bundle
    authentication: {
        method: null,
        options: {},
    },

    // Pagination configuration
    // - 'postsPerPage': number of posts per paginated page
    // - 'authorLinkPrefix': permalink prefix for author paginated listings
    // - 'tagLinkPrefix': permalink prefix for tag paginated listings
    pagination: {
        postsPerPage: 10,
        authorLinkPrefix: "/author/",
        tagLinkPrefix: "/"
    }
};