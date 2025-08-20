export default {
    // Main website title (displayed in the sidebar and page title)
    title: "Domnīca Profectus",

    // Base site URL for generating absolute URLs (used throughout the site)
    url: process.env.URL || "https://profectus.lv",

    // Sidebar profile image (relative path from the site root)
    image: "/images/profectus-logo-wt.png",
    // Alt text for the sidebar profile image (for accessibility)
    imageAlt: "Domnīca Profectus",

    // Header image for the landing page (relative path from the site root)
    header: "",
    // Alt text for the header image (for accessibility)
    headerAlt: "",

    // Author name (used in meta tags and JSON-LD structured data)
    author: "Domnīca Profectus",
    // Author type ("Person" or "Organization", used in JSON-LD)
    authorType: "Organization",

    // Short site description (displayed below the sidebar image and used in meta tags)
    description: "Stiprinām demokrātiju un pilsonisko sabiedrību Latvijā un veicinām tās ilgtspēju",

    // OpenGraph locale (used for social sharing metadata)
    locale: "lv_LV",

    // Default language for HTML lang and post properties
    lang: "lv",
 
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
    openGraphDefaultImage: "/images/profectus-logo-wt.png",

    // Favicon and icon configuration
    // - 'favicon': main favicon path
    // - 'faviconSizes': sizes for PNG favicons
    // - 'appleiconSizes': sizes for Apple Touch icons
    // - 'webmanifestSizes': sizes for Webmanifest icons
    favicon: "images/profectus-favicon.png",
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
        googleTag: "UA-16574330-6",
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
        privacyPolicy: false,
        // Display footer information (e.g., copyright, author)
        footer: true,
        // Location of the site social block relative to the sidebar main menu: false, 'below', or 'above'
        sitesocial: "below",
        // Postlist thumbnail: false | 'left' | 'right'
        postlistThumbnail: "right",
        // Show author business card on author listing pages
        authorCard: true,
    }
};