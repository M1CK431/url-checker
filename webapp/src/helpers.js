import { t, tc } from "@/plugins/i18n.js";
import { notification } from "@/plugins/naiveUI.js";
import { allowedDomains } from "@/plugins/allowedDomains.js";

const notificationOptions = { duration: 4500, keepAliveOnHover: true };
const renderContent = content => () => h("span", { innerHTML: content });

export const error = ({ title = tc("ERROR"), content, ...rest }) =>
  notification.error({
    title,
    ...(content && { content: renderContent(content) }),
    ...notificationOptions,
    ...rest
  });

export const requestErrorHandler = err => error({ content: err.toString() });

export const success = ({ title = t("SUCCESS"), content, ...rest } = {}) =>
  notification.success({
    title,
    ...(content && { content: renderContent(content) }),
    ...notificationOptions,
    ...rest
  });

export const sizeFormatter = new Intl.NumberFormat(undefined, {
  style: "unit",
  unit: "byte",
  maximumFractionDigits: 2,
  notation: "compact",
  unitDisplay: "narrow"
}).format;

export const secondFormatter = new Intl.NumberFormat(undefined, {
  style: "unit",
  unit: "second",
  maximumFractionDigits: 2,
  notation: "compact",
  unitDisplay: "narrow"
}).format;

const dateParts = [
  { suffix: "h", fn: "getHours" },
  { suffix: "m", fn: "getMinutes" },
  { suffix: "s", fn: "getSeconds" }
];

export const elapsedTimeFormatter = duration => {
  const d = new Date(0, 0, 0);
  d.setSeconds(duration);

  return dateParts.reduce(
    (acc, { suffix, fn }) =>
      d[fn]() ? `${acc ? `${acc} ` : ""}${d[fn]()}${suffix}` : acc,
    ""
  );
};

export const percentFormatter = (percent, maximumFractionDigits = 2) =>
  (() =>
    new Intl.NumberFormat(undefined, {
      style: "percent",
      maximumFractionDigits
    }).format(percent))();

export const getRoundedPercent = (a, b, round = 2) =>
  percentFormatter(b ? +(Math.round(a / b + `e+${round}`) + `e-${round}`) : 0);

const urlRe =
  /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
export const isUrl = url => urlRe.test(url);

export const debounce = (fn, delay) => {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(fn.bind(this), delay, ...args);
  };
};

export const isAllowedDomain = url =>
  !allowedDomains[0] ||
  (isUrl(url) &&
    allowedDomains.some(domain => new URL(url).hostname.includes(domain)));

export const getPathname = url => new URL(url).pathname;

export const deepCopy = obj => JSON.parse(JSON.stringify(obj));

export const uniqBy = (arr, predicate) => {
  const cb = typeof predicate === "function" ? predicate : o => o[predicate];

  return [
    ...arr
      .reduce((map, item) => {
        const key = item === null || item === undefined ? item : cb(item);

        map.has(key) || map.set(key, item);

        return map;
      }, new Map())
      .values()
  ];
};
