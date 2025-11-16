# <img alt="logo" src="../webapp/public/url-checker.png" align="left" height="38" /> URL Checker

API for URL Checker, a tool to easily check URLs in a sitemap.

## Setup

### Prerequisites

* At least [Node.js](https://nodejs.org/) v22.17 is required (but always use the latest LTS if possible)
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

| Name                | Default                 | Description                                                                                     |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `HOST`              | `localhost`             | Host to listen on                                                                               |
| `PORT`              | `3000`                  | Port to listen on                                                                               |
| `ALLOWED_DOMAINS`   | `[]`                    | Array of allowed **domains hostname** to check                                                  |
| `RATE_LIMIT_MS`     | `1000`                  | Single URL check rate limit (in ms)                                                             |
| `REDIRECT_LIMIT`    | `10`                    | Max internal cascading redirections to follow                                                   |
| `CURL`              | `curl`                  | `curl` binary to use (see [troubleshooting](#troubleshooting))                                  |
| `DB_PROVIDER`       | `sqlite`                | Supported providers: `sqlite`, `mysql` or `postgresql`                                          |
| `DB_URL`            | `file:./db.sqlite`      | DB connexion URL (see [Prisma documentation](https://www.prisma.io/docs/orm/overview/databases) for format details)                              |
| `JWT_SECRET`        | `find_me_if_you_can_;)` | Secret key for JWT token signing                                                                |
| `JWT_EXPIRES_IN`    | `7d`                    | JWT token expiration time (see [vercel/ms](https://github.com/vercel/ms) for supported formats) |
| `PASSWORD_POLICY`   | See below               | JSON object defining password complexity requirements                                           |

A sample [environment file](./.env.development) is provided as an example for the development environnement.\
Example `ALLOWED_DOMAINS` valid value: `["toto.com", "titi.fr"]`.

⚠️ Don't forget to run `pnpm prisma generate` if you change `DB_PROVIDER` and/or `DB_URL`.

⚠️ **Security Warning**: You MUST change the default `JWT_SECRET` value in production to prevent unauthorized access. Using the default value is a serious security risk.

You can generate a secure secret using OpenSSL:
```sh
openssl rand -base64 32
```

#### Password policy
By default, all password constraints are enabled with a minimum length of 8 characters.

⚠️ **Note about password length**: bcrypt has a limit of 72 bytes. Since UTF-8 characters can be 1-4 bytes each, passwords are limited to 18 characters to ensure no truncation occurs (72/4 = 18).

You can customize the password policy by setting the `PASSWORD_POLICY` environment variable to a JSON object with the following properties:
- `length`: Minimum password length (default: 8, maximum: 18)
- `upper`: Require uppercase letters (default: true)
- `lower`: Require lowercase letters (default: true)
- `number`: Require numbers (default: true)
- `symbol`: Require special characters (default: true)

To disable specific constraints, set them to `false` (for boolean constraints) or `0` (for numeric constraints).

Example to disable special character requirement and set minimum length to 6 characters:
```json
{"length": 6, "symbol": false}
```

Example to disable all constraints except minimum length of 8 characters:
```json
{"upper": false, "lower": false, "number": false, "symbol": false}
```

### First User Creation

The first time you use the API, you'll need to create an initial user account. This is done automatically through the `login` mutation:

1. When no users exist in the database, calling the `login` mutation with any valid login/password combination will create that user as the first administrator
2. The password must meet the complexity requirements defined by `PASSWORD_POLICY`
3. Once created, this user can be used for subsequent authentications
4. Additional users can be created using the `upsertUser` mutation by an authenticated administrator

This one-time setup simplifies the initial configuration without requiring a separate initialization process.

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

### Authentication system

Version 2 introduces a complete authentication system with user management. The API is now protected and requires authentication for all operations except the initial user creation.

Key changes:
- All GraphQL queries, mutations, and subscriptions (except `login`) now require a valid JWT token
- Tokens must be passed in the `Authorization` header as `Bearer <token>`
- A first user must be created using the `login` mutation with any valid login/password combination when no users exist in the database
- Passwords must meet complexity requirements defined by the `PASSWORD_POLICY` environment variable

### GraphQL schema change

The GraphQL schema remains largely the same with its existing operations, featuring slightly stronger typing for `URL` and more granular filtering capabilities. The main difference is that all operations now require JWT authentication, except for the initial user creation.

If you have automations using the API, please check the updated schema to adapt them.

#### Breaking changes

1. All operations now require authentication (except initial user creation)
2. New users management operations: `upsertUser`, `deleteUsers`, `login`, `logout`, `me`, `user` and `users`
3. All existing operations require a valid JWT token in the `Authorization` header

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