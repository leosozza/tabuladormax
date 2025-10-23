# GitHub Configuration

This directory contains configuration files for GitHub-specific features and integrations.

## Files

### `copilot-instructions.md`
Comprehensive instructions for GitHub Copilot and AI coding assistants. These instructions provide:

- **Project Overview**: Description of the Gestão Scouter system and its features
- **Technology Stack**: Detailed list of all technologies, frameworks, and tools used
- **Project Structure**: Complete directory structure with explanations
- **Coding Standards**: TypeScript, React, and code organization guidelines
- **Development Workflow**: Build, lint, and development processes
- **Integration Guidelines**: Instructions for external services (Supabase, Bitrix, Google Sheets)
- **Common Patterns**: Code examples and best practices
- **Troubleshooting**: Solutions for common issues
- **AI Assistant Guidelines**: Specific guidance for AI tools like Copilot

## Current Status

The project has comprehensive Copilot instructions set up according to GitHub best practices. The instructions are regularly updated to reflect:

- Current technical debt (89 linting issues, mainly TypeScript `any` types)
- Project structure changes
- New dependencies or tools
- Performance metrics and optimization opportunities

## For Developers

When using GitHub Copilot or other AI assistants:
1. The instructions are automatically loaded for context
2. Follow the patterns and guidelines specified
3. Pay attention to the current issues listed (type safety improvements needed)
4. Update these instructions when making significant architectural changes

## Maintenance

These instructions should be reviewed and updated when:
- Major dependencies are upgraded
- New features or integrations are added
- Project structure changes significantly
- Technical debt is resolved (especially TypeScript strict mode enablement)