# Contributing to Bedrock AI Web Client

First off, thank you for considering contributing to Bedrock AI! It's people like you that make Bedrock AI such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

* Use a clear and descriptive title
* Describe the exact steps which reproduce the problem
* Provide specific examples to demonstrate the steps
* Describe the behavior you observed after following the steps
* Explain which behavior you expected to see instead and why
* Include screenshots and animated GIFs if possible
* Include your environment details

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

* Use a clear and descriptive title
* Provide a step-by-step description of the suggested enhancement
* Provide specific examples to demonstrate the steps
* Describe the current behavior and explain which behavior you expected to see instead
* Explain why this enhancement would be useful
* List some other applications where this enhancement exists

### Pull Requests

* Fill in the required template
* Do not include issue numbers in the PR title
* Include screenshots and animated GIFs in your pull request whenever possible
* Follow the JavaScript/TypeScript styleguides
* Include thoughtfully-worded, well-structured tests
* Document new code
* End all files with a newline

## Development Process

1. Fork the repo
2. Create a new branch from `main`
3. Make your changes
4. Run the tests
5. Push your changes
6. Create a Pull Request

### Setup Development Environment

```bash
# Clone your fork
git clone https://github.com/your-username/bedrock-ai.git

# Navigate to web client
cd bedrock-ai/web-client

# Install dependencies
make install

# Start development environment
make dev
```

### Code Style

* Use TypeScript
* Follow the existing code style
* Use meaningful variable names
* Write comments for complex logic
* Keep functions small and focused
* Use functional programming patterns where appropriate

### Testing

* Write unit tests for new features
* Ensure all tests pass before submitting PR
* Include integration tests where necessary
* Test edge cases
* Mock external services

### Documentation

* Update the README.md with details of changes to the interface
* Update the API documentation
* Add JSDoc comments for new functions
* Update the changelog

### Commit Messages

* Use the present tense ("Add feature" not "Added feature")
* Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
* Limit the first line to 72 characters or less
* Reference issues and pull requests liberally after the first line
* Consider starting the commit message with an applicable emoji:
    * 🎨 `:art:` when improving the format/structure of the code
    * 🐎 `:racehorse:` when improving performance
    * 🚱 `:non-potable_water:` when plugging memory leaks
    * 📝 `:memo:` when writing docs
    * 🐛 `:bug:` when fixing a bug
    * 🔥 `:fire:` when removing code or files
    * 💚 `:green_heart:` when fixing the CI build
    * ✅ `:white_check_mark:` when adding tests
    * 🔒 `:lock:` when dealing with security
    * ⬆️ `:arrow_up:` when upgrading dependencies
    * ⬇️ `:arrow_down:` when downgrading dependencies

## Project Structure

```
web-client/
├── public/              # Static files
├── src/                 # Source code
│   ├── components/      # React components
│   ├── contexts/        # React contexts
│   ├── hooks/          # Custom hooks
│   ├── services/       # API and utility services
│   ├── styles/         # Global styles
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Root component
│   └── index.tsx       # Entry point
├── tests/              # Test files
└── ...                 # Config files
```

## Getting Help

* Join our Slack channel
* Check the documentation
* Ask in GitHub Issues
* Email the maintainers

## Recognition

Contributors will be recognized in:

* The project's README
* The contributors page
* Release notes
* Our public communications

Thank you for contributing to Bedrock AI! 