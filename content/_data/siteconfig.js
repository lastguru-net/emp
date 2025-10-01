export default {
    // Main website title (displayed in the sidebar and page title)
    title: "Eleventy Markdown Prime",

    // Base site URL for generating absolute URLs (used throughout the site)
    url: process.env.URL || "https://emp-starter.lastguru.dev",

    // Sidebar profile image (relative path from the site root)
    image: "/images/logo.png",
    // Alt text for the sidebar profile image (for accessibility)
    imageAlt: "",

    // Header image for the landing page (relative path from the site root)
    header: "/images/header.jpeg",
    // Alt text for the header image (for accessibility)
    headerAlt: "",

    // Author name (used in meta tags and JSON-LD structured data)
    author: "lastguru",
    // Author type ("Person" or "Organization", used in JSON-LD)
    authorType: "Person",

    // Short site description (displayed below the sidebar image and used in meta tags)
    description: "A minimalistic text-focused Eleventy theme",

    // OpenGraph locale (used for social sharing metadata)
    locale: "en_US",
    // Default language for HTML lang and post properties
    lang: "en",
 
    // Google Fonts configuration for typography
    // - 'swap': controls 'font-display: swap' behavior
    //   - false by default to avoid flash unstyled text (FOUT)
    //   - if flash of invisible text (FOIT) is more disturbing, enable it
    // - 'body' and 'header': specify font families and weights
    // 
    // Every weight and style used anywhere must be defined here:
    // - weights starting with "0," are non-italic
    // - weights starting with "1," are italic
    fonts: {
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

    // Analytics and tracking IDs (optional)
    pixels: {
        // Facebook App ID
//        fbApp: "",
        // Facebook Pixel ID
//        fbPixel: "",
        // Google Analytics Tag ID
//        googleTag: "",
    },

    // Feature toggles and layout options
    features: {
        // Display post properties (e.g., author, date) on posts
        postproperties: true,
        // Include description in OpenGraph and Twitter meta tags
        og_description: true,
        // Generate and include JSON-LD structured data
        json_ld: true,
        // Generate a sitemap.xml file
        sitemap: true,
        // Include local JavaScript bundle
        js: true,
        // Enable social sharing buttons on posts/pages
        sharer: true,
        // Enable previous/next post navigation
        prevnext: true,
        // Base layout: 'regular' (with sidebar) or 'primitive' (minimal layout)
        base: "regular",
        // Index page type: 'postlist' (list of posts) or 'singlepost' (single post)
        index: "postlist",
        // Top bar behavior: false (none), 'static' (always visible), or 'dynamic' (shows/hides on scroll)
        topbar: "dynamic",
        // Location of the Privacy Policy link: 'footer', 'sidebar', or false (none)
        privacyPolicy: "sidebar",
        // Display footer information (e.g., copyright, author)
        footer: true,
        // Location of the site social block relative to the sidebar main menu: false, 'below', or 'above'
        sitesocial: "below",
        // Postlist thumbnail: false | 'left' | 'right'
        postlistThumbnail: "right",
        // Show author business card on author listing pages
        authorCard: true,
        // Toggle for showing "Powered by" text/link in the footer
        poweredBy: true,
    }
};