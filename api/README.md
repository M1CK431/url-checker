# <img alt="logo" src="../webapp/public/url-checker.png" align="left" height="38" /> URL Checker

API for URL Checker, a tool to easily check URLs in a sitemap.

## Setup

### Prerequisites

* At least [Node.js](https://nodejs.org/) v18.12 is required (but always use latest LTS if possible)
* Only Linux based systems are officially supported
* API is using [curl](https://curl.se/) for URL checking, at least v7.70 must be installed

### Install dependencies for Production

Once placed in the `api` directory:

```sh
pnpm i -P
```

### Installation

For obvious security reason, create a dedicated system user/group:

```sh
useradd --system -s /usr/bin/nologin -U url-checker
```

⚠️ If you use another user/group name, don't forget to update the systemd service `User` and `Group` directives (see below).

The API only need write access to its sqlite db:

```sh
chown url-checker: ./db.sqlite
chmod 644 ./db.sqlite
```

⚠️ Other files should be owned by another user/group (`root` for example)\
⚠️ Other files should be read-only for anyone (`644` permissions).

Then copy (or symlink) the provided systemd service and enable/start it:

```sh
ln -sn /etc/systemd/system/url-checker.service ./url-checker.service
# OR, if you need to adapt it for your setup
cp -a ./url-checker.service /etc/systemd/system/

chown root: /etc/systemd/system/url-checker.service
chmod 644 /etc/systemd/system/url-checker.service

systemctl daemon-reload
systemctl enable --now url-checker
```

🎉️ That's it! The API should now be up and running on default [http://localhost:3000/graphql](http://localhost:3000/graphql)

ℹ️ By default, nothing is publicly exposed. See [Setup with Apache web server](../webapp/README.md#setup-with-apache-web-server) for a reverse proxy configuration example.

### Customize configuration

There are some settings you can change as environment variables:

| Name                | Default       | Description                                                   |
| ------------------- | ------------- | ------------------------------------------------------------- |
| `HOST`            | `localhost` | Host to listen on                                             |
| `PORT`            | `3000`      | Port to listen on                                             |
| `ALLOWED_DOMAINS` | `[]`        | Array of allowed**domains hostname** to check           |
| `RATE_LIMIT_MS`   | `1000`      | Single URL check rate limit (in ms)                           |
| `REDIRECT_LIMIT`  | `10`        | Max internal cascading redirections to follow                 |
| `CURL`            | `curl`      | `curl` binary to use (see [troubleshooting](#troubleshooting)) |

A sample [environment file](./.env.development) is provided with default values for the development environnement.\
Example `ALLOWED_DOMAINS` valid value: `["toto.com", "titi.fr"]`.

## Upgrade

The simplest way to upgrade the API is using the following `git` commands in the monorepo directory (where `.git` stands):

```sh
git fetch
git reset --hard origin/master
```

Then redo the [Install dependencies for Production](#install-dependencies-for-production) step and restart the API systemd service:

```sh
systemctl restart url-checker
```

⚠️ If you have copied the systemd service (for example to use a user/group different from the default),
please ensure that nothing was changed in this file in the upgraded version.

ℹ️ Notice that this will upgrade both API and Webapp so don't forget to also follow [Webapp upgrade instructions](../webapp/README.md#upgrade).

## Troubleshooting

In case you see this error message while trying to check a single URL:

```
ApolloError: Response not successful: Received status code 503
```

You are probably affected by [this curl bug](https://github.com/curl/curl/issues/6905).
No worries, I have a good news for you: a simple workaround is available!

Copy `.env.development` to `.env.production` and change `CURL` env variable with:

```ini
CURL=./curl_7.76.1_workaround_wrapper
```

⚠️ `curl_7.76.1_workaround_wrapper` must be set as executable:

```sh
chmod 755 ./curl_7.76.1_workaround_wrapper
```

Then restart the API systemd service:

```sh
systemctl restart url-checker
```

Everything should now works properly.


## For developers

Following this instructions is needed **only if you want to contribute** to the code of the API.

## Install dependencies

```sh
pnpm i
```

### Hot-Reload for Development

```sh
pnpm dev
```

### Start for Production

```sh
pnpm start
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```
