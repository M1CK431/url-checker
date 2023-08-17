import { exec } from "node:child_process";
import { db } from "./db.js";

const { CURL = "curl" } = process.env;

// Si t'as pas d'ami...
const curly = (url, cb) =>
  exec(
    `${CURL} -s -w '%{json}' -o /dev/null '${url.replace(/'/g, `'"'"'`)}'`,
    cb
  );

export const checkURLSync = url =>
  new Promise(resolve => {
    const createdAt = new Date();

    curly(url, (err, stdout) => {
      const {
        errormsg,
        response_code,
        redirect_url,
        size_download,
        time_total
      } = JSON.parse(stdout || "{}");

      if (err)
        return resolve({
          url,
          createdAt,
          updatedAt: createdAt,
          responseCode: 0,
          size: 0,
          duration: 0,
          status: "ERROR",
          errorReason: errormsg || err.toString()
        });

      resolve({
        url,
        createdAt,
        updatedAt: createdAt,
        responseCode: response_code,
        ...(redirect_url && { redirectUrl: redirect_url }),
        size: size_download,
        duration: time_total,
        status: "DONE"
      });
    });
  });

const { REDIRECT_LIMIT = 10 } = process.env;
const redirectLimiter = (limit = REDIRECT_LIMIT) => {
  let cnt = 0;
  return () => ++cnt > limit;
};

export const checkUrl = (
  checkUrlDb,
  checkRedirectLimit = redirectLimiter()
) => {
  const { url, ReportId } = checkUrlDb;
  const { CheckResult: CheckResultDbModel, Report: ReportDbModel } = db.models;

  return new Promise(resolve =>
    curly(url, async (err, stdout) => {
      const {
        errormsg,
        response_code,
        redirect_url,
        size_download,
        time_total
      } = JSON.parse(stdout || "{}");

      if (err) {
        checkUrlDb.update({
          status: "ERROR",
          errorReason: errormsg || err.toString()
        });
        ReportDbModel.increment("processedCount", { where: { id: ReportId } });
        return resolve(checkUrlDb);
      }

      checkUrlDb.update({
        responseCode: response_code,
        ...(redirect_url && { redirectUrl: redirect_url }),
        size: size_download,
        duration: time_total,
        status: "DONE"
      });
      ReportDbModel.increment(
        ["processedCount", `http${`${response_code}`[0]}xxCount`],
        { where: { id: ReportId } }
      );

      if (!redirect_url) return resolve(checkUrlDb);

      if (
        await CheckResultDbModel.count({
          where: { url: redirect_url, ReportId }
        })
      )
        return resolve(checkUrlDb);

      ReportDbModel.increment("totalCount", { where: { id: ReportId } });

      if (checkRedirectLimit()) {
        ReportDbModel.increment("processedCount", { where: { id: ReportId } });

        return resolve(
          CheckResultDbModel.create({
            url: redirect_url,
            ReportId,
            status: "ERROR",
            errorReason: "Redirection limit reached"
          })
        );
      }

      if (new URL(url).host !== new URL(redirect_url).host) {
        ReportDbModel.increment("processedCount", { where: { id: ReportId } });

        return resolve(
          CheckResultDbModel.create({
            url: redirect_url,
            ReportId,
            status: "ERROR",
            errorReason: "Redirect URL is not on the same host"
          })
        );
      }

      const redirectCheckResult = CheckResultDbModel.create({
        url: redirect_url,
        ReportId
      }).then(checkUrlDb => checkUrl(checkUrlDb, checkRedirectLimit));

      resolve(redirectCheckResult);
    })
  );
};
