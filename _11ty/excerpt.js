const excerpt = (article) => {
    const content = article.templateContent.replace(/<[^>]*>/g, '');
    const firstLine = content.indexOf("\n") > 0 ? content.indexOf("\n") : content.length; // Cap at first line
    const wordCap = content.lastIndexOf(' ', 250); // Cap at full words before 250 character cap

    let excerpt = content.slice(0, Math.min(firstLine, wordCap)).trim();
    if (excerpt.length < content.length) {
        excerpt += "…";
    }

    return excerpt;
};

export default eleventyConfig => {
    eleventyConfig.addShortcode("excerpt", excerpt); 
};