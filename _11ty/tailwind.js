import path from "node:path";
import { compile, optimize } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";

const tailwindTransform = async (content, outputPath) => {
    if (!outputPath?.endsWith("min.css")) return content;

    const base = path.resolve(process.cwd());

    const compiler = await compile(String(content), {
        base: base,
        onDependency: () => {},
    });

    const scanner = new Scanner({
        sources: [
            ...compiler.sources,
            { base, pattern: "content/**/*.njk", negated: false },
        ],
    });

    const candidates = scanner.scan();
    content = await compiler.build(candidates);
    content = optimize(content, { minify: true }).code;
    return content;
};

export default eleventyConfig => {
    eleventyConfig.addTransform("tailwind", tailwindTransform);
};