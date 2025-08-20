import terser from "@rollup/plugin-terser";
import siteconfig from "./content/_data/siteconfig.js";

const isProduction = process.env.NODE_ENV === "production";

export default {
    input: "assets/js/index.js",
    treeshake: false,
    output: [
        {
            file: "assets/js/min.js",
            sourcemap: !isProduction,
            format: "cjs"
        }
    ],
    plugins: [
        // Minify JS in production mode
        isProduction && terser(),
    ]
};