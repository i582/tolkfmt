# tolkfmt

A code formatter for the Tolk programming language.

## Installation

```bash
# Install from npm
npm i -g tolkfmt

# Or build locally
git clone https://github.com/ton-blockchain/tolkfmt
cd tolkfmt
yarn install
yarn build
yarn link
```

## Usage

### Basic Commands

```bash
# Format and output to stdout
tolkfmt file.tolk

# Format and rewrite file
tolkfmt --write file.tolk
tolkfmt -w file.tolk

# Check file formatting
tolkfmt --check file.tolk
tolkfmt -c file.tolk

# Format all .tolk files in directory
tolkfmt -w ./src

# Show version
tolkfmt --version

# Show help
tolkfmt --help
```

### Options

- `-w, --write` - Write result to the same file
- `-c, --check` - Check file formatting (exit code 1 if issues found)
- `-v, --version` - Show formatter version
- `-h, --help` - Show help

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup
- Building and testing
- Submitting changes
- Publishing releases

## License

MIT
