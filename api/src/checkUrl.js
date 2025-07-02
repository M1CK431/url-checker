import { exec } from "node:child_process";
import { ReportDbModel } from "./models/report/report.js";
import { CheckResultDbModel } from "./models/checkResult/checkResult.js";
import pubSub from "./pubSub.js";

const { CURL = "curl" } = process.env;

// Si t'as pas d'ami...
const curly = (url, cb) =>
  exec(
    `${CURL} -s -w '%{json}' -o /dev/null '${url.replace(/'/g, "'\"'\"'")}'`,
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

      resolve({
        url,
        createdAt,
        updatedAt: createdAt,
        ...err
          ? {
              responseCode: 0,
              size: 0,
              duration: 0,
              status: "ERROR",
              errorReason: errormsg || err.toString()
            }
          : {
              responseCode: response_code,
              ...redirect_url && { redirectUrl: redirect_url },
              size: size_download,
              duration: time_total,
              status: "DONE"
            }
      });
    });
  });

const { REDIRECT_LIMIT = 10 } = process.env;
const redirectLimiter = (limit = REDIRECT_LIMIT) => {
  let cnt = 0;
  return () => ++cnt > limit;
};

const updateReportDbModel = (id, data) => ReportDbModel
  .update({ data, where: { id } })
  .then(() =>
    pubSub.publish("report", { operation: "UPDATE", primaryKey: id }));

export const checkUrl = (
  { id, url, reportId },
  checkRedirectLimit = redirectLimiter()
) => new Promise(resolve =>
  curly(url, async (err, stdout) => {
    const {
      errormsg,
      response_code,
      redirect_url,
      size_download,
      time_total
    } = JSON.parse(stdout || "{}");

    if (err) {
      const checkResult = CheckResultDbModel.update({
        data: { status: "ERROR", errorReason: errormsg || err.toString() },
        where: { id }
      });

      await updateReportDbModel(reportId, { processedCount: { increment: 1 } });

      return resolve(checkResult);
    }

    const checkResult = CheckResultDbModel.update({
      data: {
        responseCode: response_code,
        ...redirect_url && { redirectUrl: redirect_url },
        size: size_download,
        duration: time_total,
        status: "DONE"
      },
      where: { id }
    });

    await updateReportDbModel(reportId, {
      processedCount: { increment: 1 },
      [`http${`${response_code}`[0]}xxCount`]: { increment: 1 }
    });

    if (!redirect_url) return resolve(checkResult);

    if (
      await CheckResultDbModel.count({ where: { url: redirect_url, reportId } })
    )
      return resolve(checkResult);

    await updateReportDbModel(reportId, { totalCount: { increment: 1 } });

    if (checkRedirectLimit()) {
      await updateReportDbModel(reportId, { processedCount: { increment: 1 } });

      return resolve(
        CheckResultDbModel.create({
          data: {
            url: redirect_url,
            reportId,
            status: "ERROR",
            errorReason: "Redirection limit reached"
          }
        })
      );
    }

    if (new URL(url).host !== new URL(redirect_url).host) {
      await updateReportDbModel(reportId, { processedCount: { increment: 1 } });

      return resolve(
        CheckResultDbModel.create({
          data: {
            url: redirect_url,
            reportId,
            status: "ERROR",
            errorReason: "Redirect URL is not on the same host"
          }
        })
      );
    }

    const redirectCheckResult = CheckResultDbModel.create({
      data: { url: redirect_url, reportId }
    }).then(checkResult => checkUrl(checkResult, checkRedirectLimit));

    resolve(redirectCheckResult);
  }));
