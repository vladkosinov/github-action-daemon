module.exports = {
  branches: ["main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        changelogFile: "docs/CHANGELOG.md",
      },
    ],
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],
    "@semantic-release/github",
    [
      "@semantic-release/git",
      {
        assets: [
          "dist/index.js",
          "dist/licenses.txt",
          "docs/CHANGELOG.md",
          "package.json",
          "package-lock.json",
        ],
        message:
          "chore(release): ${nextRelease.version} 🤖\n\n${nextRelease.notes}",
      },
    ],
  ],
};
