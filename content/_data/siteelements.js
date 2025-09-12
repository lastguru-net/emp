export default {
    // Label for the home menu link (mandatory)
    menuHome: "Home",
    // Additional menu items (key: label, value: URL)
    menuItems: {
        "Events": "/events/",
        "About us": "/about-us/",
    },

    // Social media profiles for the site (the object must be present, but profiles are optional)
    social: {
        // GitHub username
        github: "lastguru-net",
        // LinkedIn username
        linkedin: "lastguru",
        // Twitter/X username
        twitter_x: "lastguru_net",
        // YouTube channel/user
//        youtube: "-",
        // Facebook page name
//        fbPage: "-",
        // Facebook username
//        fbProfile: "-",
        // Mastodon profile URL
        mastodon: "https://toot.lv/@lastguru",
        // Bluesky profile URL
        bluesky: "https://bsky.app/profile/lastguru.net",
        // Instagram username
//        instagram: "-",
        // Threads username
        threads: "lastguru_net",
    },

    // Privacy Policy link configuration (displayed in the footer or sidebar)
    // Set features.privacyPolicy to 'none' if not used (can be removed then)
    privacyPolicy: {
        name: "Privacy Policy",
        url: "/privacy-policy/",
    },

    // Copyright configuration (used in the footer)
    copyright: {
        // Copyright year (default is current year)
        year: "",
        // Copyright link (optional)
        link: "https://emp-starter.lastguru.dev",
        // Copyright text (optional)
        text: "test",
    },
};