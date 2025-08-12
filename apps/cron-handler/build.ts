import { Glob } from "bun";

const sourceDir = "./src/";
const outputDir = "./dist/";

// Find all TypeScript files
const glob = new Glob("**/*.{ts,tsx}");
const tsFiles = [...glob.scanSync(sourceDir)].map(file => sourceDir + file);

console.log(`Compiling ${tsFiles.length} TypeScript files...`);

const result = await Bun.build({
    entrypoints: tsFiles,
    outdir: outputDir,
    target: "node",
    format: "esm",
    sourcemap: "external",

    // Key options to preserve file structure
    splitting: false,
    packages: "external", // Keep node_modules external

    // Preserve directory structure
    root: "./src",
    naming: "[dir]/[name].[ext]",
});

if (!result.success) {
    console.error("Build failed:", result.logs);
    process.exit(1);
} else {
    console.log(`Compiled ${result.outputs.length} files successfully`);
}
