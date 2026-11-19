/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // Stockfish loads its .wasm from its own folder at runtime, so it must not be bundled.
  serverExternalPackages: ["stockfish"],
};
