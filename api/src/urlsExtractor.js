import { exec } from "node:child_process";
import { promisify } from "node:util";
import { Parser, DomHandler } from "htmlparser2";
import { filter, textContent } from "domutils";
import { readFileSync } from "node:fs";

const pExec = promisify(exec);
const { CURL = "curl" } = process.env;

// Si t'as pas d'ami...
const curly = (url, out) =>
  pExec(`${CURL} -sL -w '%{json}' -o '${out.replace(/'/g, `'"'"'`)}' '${url}'`);

export const extractUrls = async url => {
  const { host } = new URL(url);
  let { stdout: tmpFile } = await pExec(
    `mktemp /dev/shm/url-checker-${host}-XXX.html`
  );
  tmpFile = tmpFile.trim();

  const { stdout: curlOut } = await curly(url, tmpFile);
  const { response_code } = JSON.parse(curlOut);
  if (response_code !== 200) throw new Error(`${url} is unreachable`);

  const dom = await new Promise((resolve, reject) => {
    const parser = new Parser(
      new DomHandler((err, dom) => (err ? reject(err) : resolve(dom)))
    );
    parser.write(readFileSync(tmpFile, { encoding: "utf8" }));
    parser.end();
  }).catch(err => {
    throw new Error(`Parsing error: ${err}`);
  });

  pExec(`rm ${tmpFile}`);

  return [
    ...new Set(
      filter(({ name }) => ["loc", "image:loc"].includes(name), dom).map(
        ({ children: [url] }) => textContent(url).replace(/\s+/g, "")
      )
    )
  ];
};

export const getFaviconUrl = async url => {
  const { host, origin } = new URL(url);
  let favicon = `${origin}/favicon.ico`;

  const { stdout } = await curly(favicon, "/dev/null");
  const { response_code: faviconResCode, content_type: faviconContentType } =
    JSON.parse(stdout);
  if (faviconResCode === 200 && faviconContentType.startsWith("image/"))
    return favicon;

  let { stdout: tmpFile } = await pExec(
    `mktemp /dev/shm/url-checker-${host}-XXX.html`
  );
  tmpFile = tmpFile.trim();

  const { stdout: curlOut } = await curly(origin, tmpFile);
  const { response_code } = JSON.parse(curlOut);
  if (response_code !== 200)
    throw new Error(`Webpage at ${url} is unreachable`);

  favicon = null;
  await new Promise(resolve => {
    const faviconParser = new Parser({
      onopentag: (name, { rel = "", href }) => {
        if (name !== "link" || !/^(shortcut )?icon$/.test(rel) || !href) return;
        favicon = new URL(href, origin).href;
      },
      onend: resolve
    });
    faviconParser.write(readFileSync(tmpFile, { encoding: "utf8" }));
    faviconParser.end();
  });

  pExec(`rm ${tmpFile}`);
  return favicon;
};
