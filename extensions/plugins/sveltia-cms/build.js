import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Download once during plugin setup; watch builds reuse these exact bytes.
export const downloadCms = async (version = "latest") => {
    const url = `https://unpkg.com/@sveltia/cms@${encodeURIComponent(version)}/dist/sveltia-cms.mjs`;
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`[sveltia-cms] Download failed: HTTP ${response.status} for ${url}`);
    const contents = Buffer.from(await response.arrayBuffer());
    return {
        contents,
        revision: createHash("sha256").update(contents).digest("hex").slice(0, 16),
    };
};

export const buildCmsAssets = async (outputDir, contents) => {
    await mkdir(outputDir, { recursive: true });
    await writeFile(`${outputDir}/cms.js`, contents);
};
