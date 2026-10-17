export default {
    head(config) {
        if (!config.tagId) return "";
        return `<link rel="preconnect" href="https://www.googletagmanager.com">
<!-- Google tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${config.tagId}"></script>
<script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${config.tagId}');
</script>
<!-- End Google tag -->`;
    },
};
