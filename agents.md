# Project Agent Context

## About This File
This is the entry point for AI agents working on this project. 
Read this file first, then load additional context as needed based on the task at hand.

## Project
This is a configuration management service with an admin UI.
It allows applications to store and retrieve named configuration values. See @memory/about.md for full project description.

## Architecture
This project has two components:
- A Python REST API backend (*config-service*)
- A TypeScript Web Components admin UI (*ui*)

See @memory/architecture.md for architectural patterns and decisions.

## Implementation
See @memory/technical.md for language versions, dependencies, and implementation specifics.

## Working in This Project
- If you find a README in a subfolder, read it for localised context
- After any successful mutation, re-fetch from the API rather than patching local state
- All destructive actions require confirmation before executing
- New repository functions must follow the existing async cursor pattern in config-service
- See @.clinerules/coding.md for coding standards and anti-patterns
