## GitHub Copilot Chat

- Extension Version: 0.22.4 (prod)
- VS Code: vscode/1.95.3
- OS: Mac

## Network

User Settings:
```json
  "github.copilot.advanced": {
    "debug.useElectronFetcher": true,
    "debug.useNodeFetcher": false
  }
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 140.82.121.5 (104 ms)
- DNS ipv6 Lookup: ::ffff:140.82.121.5 (10 ms)
- Electron Fetcher (configured): HTTP 200 (163 ms)
- Node Fetcher: HTTP 200 (239 ms)
- Helix Fetcher: HTTP 200 (306 ms)

Connecting to https://api.individual.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.113.21 (64 ms)
- DNS ipv6 Lookup: ::ffff:140.82.113.21 (2 ms)
- Electron Fetcher (configured): HTTP 200 (479 ms)
- Node Fetcher: HTTP 200 (491 ms)
- Helix Fetcher: HTTP 200 (460 ms)

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).
