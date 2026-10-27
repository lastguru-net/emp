// Keep the site's loading/error UI visible while fetching the main CMS module.
const openEditor = async () => {
    await new Promise((resolve, reject) => {
        const preload = document.createElement("link");
        preload.rel = "modulepreload";
        preload.href = adminVendorUrl;
        preload.onload = resolve;
        preload.onerror = () => reject(new Error("The content manager could not be downloaded."));
        document.head.append(preload);
    });
    location.replace(editorUrl + location.hash);
};
