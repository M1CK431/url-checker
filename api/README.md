# <img alt="logo" src="../webapp/public/url-checker.png" align="left" height="38" /> URL Checker

API for URL Checker, a tool to easily check URLs in a sitemap.

## Setup

### Prerequisites

* At least [Node.js](https://nodejs.org/) v22.7 is required (but always use the latest LTS if possible)
* Only Linux-based systems are officially supported
* The API is using [curl](https://curl.se/) for URL checking, at least v7.70 must be installed

### Install dependencies for Production

From the `api` directory:

```sh
pnpm i -P
```

### Generate Prisma Client

This project uses [Prisma ORM](https://www.prisma.io) which requires a "client generation" step.
As per [the official documentation](https://www.prisma.io/docs/orm/prisma-schema/overview/generators#3-exclude-the-generated-directory-from-version-control):
> The new generator includes both the TypeScript client code and the query engine. Including the query engine in version control can cause compatibility issues on different machines. To avoid this, add the generated directory to `.gitignore`.

Before starting the service for the first time, run the preconfigured script to generate the client code:
```sh
pnpm prisma generate
```

### Installation

For obvious security reasons, create a dedicated system user/group:

```sh
useradd --system -s /usr/bin/nologin -U url-checker
```

⚠️ If you use a different user/group name, don't forget to update the systemd service `User` and `Group` directives (see below).

The API only needs write access to its sqlite db (check [Customize configuration](#customize-configuration) if you want to change you `db.sqlite` location):

```sh
chown url-checker: ./db.sqlite
chmod 644 ./db.sqlite
```

⚠️ Other files should be owned by another user/group (e.g. `root`)\
⚠️ Other files should be read-only for all users (`644` permissions).

Then copy **and adapt** the provided systemd service:

```sh
cp -a ./url-checker.service /etc/systemd/system/
vi /etc/systemd/system/url-checker.service # or nano, vim, ed...

chown root: /etc/systemd/system/url-checker.service
chmod 644 /etc/systemd/system/url-checker.service
```

⚠️ Don't forget to update at least the `WorkingDirectory` in your copied `url-checker.service`.
Once adapted to your setup, enable and start the `url-checker` service:
```sh
systemctl daemon-reload
systemctl enable --now url-checker
```

🎉️ That's it! The API should now be up and running on the default [http://localhost:3000/graphql](http://localhost:3000/graphql).

ℹ️ By default, nothing is exposed publicly. See [Setup with Apache web server](../webapp/README.md#setup-with-apache-web-server) for a reverse proxy configuration example.

### Customize configuration

There are some settings you can change as environment variables:

| Name                | Default            | Description                                                    |
| ------------------- | ------------------ | -------------------------------------------------------------- |
| `HOST`              | `localhost`        | Host to listen on                                              |
| `PORT`              | `3000`             | Port to listen on                                              |
| `ALLOWED_DOMAINS`   | `[]`               | Array of allowed **domains hostname** to check                 |
| `RATE_LIMIT_MS`     | `1000`             | Single URL check rate limit (in ms)                            |
| `REDIRECT_LIMIT`    | `10`               | Max internal cascading redirections to follow                  |
| `CURL`              | `curl`             | `curl` binary to use (see [troubleshooting](#troubleshooting)) |
| `SQLITE_URL`        | `file:./db.sqlite` | SQLite db file URL                                             |

A sample [environment file](./.env.development) is provided with default values as an example for the development environnement.\
Example `ALLOWED_DOMAINS` valid value: `["toto.com", "titi.fr"]`.

⚠️ Don't forget to run `pnpm prisma generate` if you change `SQLITE_URL`.

## Upgrade

The simplest way to upgrade the API is by using the following `git` commands in the monorepo directory (where `.git` is located):

```sh
git fetch
git reset --hard origin/master
```

Then repeat the [Install dependencies for Production](#install-dependencies-for-production) step and restart the API systemd service:

```sh
systemctl restart url-checker
```

⚠️ Please ensure that no changes were made to the systemd service file in the updated version or you may need to update your copied one accordingly.

ℹ️ Note that this will upgrade both the API and the Webapp so don't forget to also follow the [Webapp upgrade instructions](../webapp/README.md#upgrade).

## Troubleshooting

If you see the following error when checking a single URL:

```
ApolloError: Response not successful: Received status code 503
```

You are likely affected by [this curl bug](https://github.com/curl/curl/issues/6905).
Good news: a simple workaround is available!

Copy `.env.development` to `.env.production` and update the `CURL` environment variable:

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

Everything should now work properly.

## Migration from v1

### ORM migration

Due to ORM migration (Sequelize -> Prisma), the DB schema is sligtly different.
Run the following script to overwrite your existing database with the new schema:
```sh
pnpm prisma reset
```

⚠️ Previous data will be lost during that operation! Make sure to backup your database before running this command if needed.
Although technically possible, no data migration instructions or script are provided for now.
Feel free to open an issue if you need help to migrate your data.

### GraphQL schema change

The GraphQL schema is mostly the same, except for a slightly stronger typing for `URL` and more granular filtering capabilities.
If you have automations using the API, please check the updated schema to adapt them if necessary.

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

### Generate Prisma Client

```sh
pnpm prisma generate
```

### Reset database

```sh
pnpm prisma reset
```
