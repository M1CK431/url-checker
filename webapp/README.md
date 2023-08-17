# <img alt="logo" src="./public/url-checker.png" align="left" height="38" /> URL Checker

Webapp for URL Checker, a tool to easily check URLs in a sitemap.

## Configuration

There is a `.env` file per environnement which is used only to define API URL.
So just copy `.env.development` to `.env.production` and set `VITE_API_*` according to your setup.

For example:

```env
VITE_API_HTTP=http://url-checker.example.com/graphql
VITE_API_WS=ws://url-checker.example.com/graphql
```

## Install dependencies for Production

Once placed in the `webapp` directory:
```sh
pnpm i -P
```

## Compile and Minify for Production

```sh
pnpm build
```

This will produce a "build" in the `dist` folder.
⚠️ Use this `dist` folder as the `DocumentRoot` for the next step.

## Setup with Apache web server

This is a configuration example using a single vhost for API & Webapp:

```apache
<VirtualHost *:80>
    DocumentRoot "/srv/http/url-checker.example.com/www"
    ServerName url-checker.example.com

    <Directory "/srv/http/url-checker.example.com/www">
        AllowOverride none
        Require all granted

        RewriteEngine On
        RewriteBase /

        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    <IfModule dir_module>
        DirectoryIndex index.html
    </IfModule>

    ProxyPass /graphql http://localhost:3000/graphql
    ProxyPassReverse /graphql http:/localhost:3000/graphql

    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/graphql "ws://localhost:3000/graphql" [P,L]

    ErrorLog "/srv/http/url-checker.example.com/log/httpd-error.log"
    CustomLog "/srv/http/url-checker.example.com/log/httpd-access.log" common
</VirtualHost>
```

ℹ️ Basically, it's a [regular SPA webapp](https://developer.mozilla.org/en-US/docs/Glossary/SPA) using [Vite bundler](https://vitejs.dev) so you can serve it with any web server of your choice ([Apache](https://httpd.apache.org), [Nginx](https://www.nginx.com)...). Also, you are not forced to use a `vhost` if only URL Checker is served by your web server.

## Upgrade

The simplest way to upgrade the webapp is using the following `git` commands in the monorepo directory (where `.git` stands):

```sh
git fetch
git reset --hard origin/master
```

Then redo the [Install dependencies for Production](#install-dependencies-for-production) and [Compile and Minify for Production](#compile-and-minify-for-production) steps.

ℹ️ Notice that this will upgrade both API and Webapp so don't forget to also follow [API upgrade instructions](../api/README.md#upgrade).

## Special thanks

The awesome design of this webapp was done gracefully by **Jade Mlynarz**, many thanks to her! 😘

## For developers

Following this instructions is needed **only if you want to contribute** to the code of the webapp.

### Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

### Install dependencies

```sh
pnpm i
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```
