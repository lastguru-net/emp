const isProduction = process.env.NODE_ENV === "production";
import cssnano from "cssnano";

// We want optimization only in production
if (isProduction) {
    cssnano({ preset: 'cssnano-preset-default' });
}

const plugins = {
    "@tailwindcss/postcss": {},
    cssnano: isProduction ? {} : false
};

export default {
    plugins
};