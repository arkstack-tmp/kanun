# Roadmap

The following features are planned to expand Kanun’s flexibility and production readiness.

## Plugin System

Introduce a first-class plugin architecture to extend Kanun without modifying core behavior.

The plugin system will allow developers to:

- Add custom validation rules and rule builders
- Integrate with third-party libraries for additional validation capabilities
- Provide hooks for custom error handling and message formatting

This will enable a vibrant ecosystem of plugins while keeping the core library lightweight and focused.

[x] Implemented

The initial plugin foundation now exists, including a separately installable file validation plugin.
