import { createDiscreteApi } from "naive-ui";

export const { message, notification, dialog, loadingBar } = createDiscreteApi(
  ["message", "dialog", "notification", "loadingBar"],
  {
    messageProviderProps: {
      closable: true,
      duration: 4500,
      keepAliveOnHover: true,
      placement: "top-right"
    }
  }
);

export default ({ config: { globalProperties } }) =>
  Object.assign(globalProperties, {
    $message: message,
    $notification: notification,
    $dialog: dialog,
    $loadingBar: loadingBar
  });
