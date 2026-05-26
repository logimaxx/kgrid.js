# Security policy

KGrid is proprietary software maintained by **Logimaxx System SRL** (Sergiu Voicu). We take security issues seriously.

## Supported versions

| Version | Supported |
|---------|-----------|
| Latest release on the default branch | Yes |
| Older tags | Best effort; upgrade recommended |

## Reporting a vulnerability

**Do not** open a public issue for security vulnerabilities.

Report privately:

- **Email:** [sergiu@logimaxx.ro](mailto:sergiu@logimaxx.ro) (Logimaxx System SRL — KGrid maintainer)
- **Internal:** your usual Logimaxx security or support channel, if you already have one
- **GitHub:** If this repository is hosted on GitHub with private security advisories enabled, use [Report a vulnerability](https://github.com/logimaxx/kgrid/security/advisories/new) on the repository Security tab.

Include:

- Description of the issue and impact
- Steps to reproduce (minimal example if possible)
- Affected version or commit
- Any suggested fix (optional)

We aim to acknowledge reports within a few business days and will coordinate disclosure and fixes with reporters who need credit or embargo.

## Scope

In scope:

- This repository (`@logimaxx/kgrid`): `src/`, `dist/`, demo server, build scripts
- XSS or unsafe HTML/Handlebars usage introduced by KGrid when used as documented

Out of scope (report to the respective project or your app team):

- Vulnerabilities in peer dependencies (jQuery, KViews, Select2, etc.) unless KGrid bundles a vulnerable default integration
- Misconfiguration in host applications (exposed APIs, missing auth on endpoints behind the grid)

## Secure use

- Serve `dist/kgrid.js` only from trusted origins; use Subresource Integrity when loading from CDNs you control.
- Do not pass untrusted HTML into column templates without sanitization in the host app.
- Run the demo server (`npm run demo`) only on localhost; it is for development, not production.
