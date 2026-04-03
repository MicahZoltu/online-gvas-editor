# GVAS Editor

Simple single page app that lets you read and modify GVAS files.  These are configuration files used by Unreal Engine for user configuration, saves, etc.


## Usage

Serve `./app` with any dumb file server.

For local use you can do `bun ./dev-server.mjs` or `node ./dev-server.mjs`.
**WARNING**: The local dev server is trivially exploitable by an attacker and will happily read files anywhere off your disk, so do not use it for any public deployment.
