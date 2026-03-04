<template>
  <iframe :srcdoc />
</template>

<script>
/* eslint-disable no-useless-escape */
const getSrcDoc = config => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Altair</title>
  <base href="https://cdn.jsdelivr.net/npm/altair-static/build/dist/" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" type="image/x-icon" href="favicon.ico" />
  <link rel="stylesheet" href="styles.css" />
  <style>
    .main-container {
      background: white;
    }
  </style>
</head>
<body>
  <app-root>
    <style>
      .loading-screen {
        /*Prevents the loading screen from showing until CSS is downloaded*/
        display: none;
      }
    </style>
    <div class="loading-screen styled">
      <div class="loading-screen-inner">
        <div class="loading-screen-logo-container">
          <img src="assets/img/logo_350.svg" alt="Altair" />
        </div>
        <div class="loading-screen-loading-indicator">
          <span class="loading-indicator-dot"></span>
          <span class="loading-indicator-dot"></span>
          <span class="loading-indicator-dot"></span>
        </div>
      </div>
    </div>
  </app-root>
  <script type="module" src="polyfills.js"><\/script>
  <script type="module" src="main.js"><\/script>
  <script type="module">
    document.addEventListener("DOMContentLoaded", () => {
      AltairGraphQL.init(${JSON.stringify(config)})
    });
  <\/script>
</body>
</html>`;
/* eslint-enable */

const environments = [
  {
    id: "localhost",
    title: "localhost",
    variables: {
      url: "http://localhost:3000/graphql",
      accentColor: "DodgerBlue"
    }
  }
];

export default {
  computed: {
    srcdoc: ({ $i18n }) =>
      getSrcDoc({
        ga: "",
        disableAccount: true,
        endpointURL: "{{url}}",
        initialSettings: { "banners.disable": true },
        persistedSettings: {
          language: $i18n.locale,
          "script.allowedLocalStorageKeys": ["auth"],
          "schema.reloadOnStart": true,
          "schema.reload.onEnvChange": true,
          theme: "light"
        },
        initialPreRequestScript: `
          const { token } = JSON.parse(await altair.storage.get('auth'));
          altair.helpers.setEnvironment('headers', { Authorization: 'Bearer ' + token });
        `,
        initialEnvironments: {
          activeSubEnvironment: "localhost",
          subEnvironments: environments
        }
      })
  }
};
</script>
