export default {
    // Main website title (displayed in the sidebar and page title)
    title: "Eleventy Markdown Prime",

    // Base site URL for generating absolute URLs (used throughout the site)
    url: "https://emp-starter.lastguru.dev",

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

    // Analytics and tracking IDs (optional)
    pixels: {
        // Facebook App ID
//        fbApp: "",
        // Facebook Pixel ID
//        fbPixel: "",
        // Google Analytics Tag ID
//        googleTag: "",
    }
}