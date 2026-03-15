import { ApiError } from "../utils/ApiError.js";
import { t } from "../i18n/index.js";

export const unmatchedRouteHandler = (req, res, next) => {
  const lang = req.lang || "en";
  next(
    new ApiError(
      `${t("common.ROUTE_NOT_FOUND", lang)}: ${req.originalUrl}`,
      400,
    ),
  );
};

const handelJwtInvalidSignature = (lang) =>
  new ApiError(t("common.INVALID_TOKEN_LOGIN_AGAIN", lang), 401);

const handelJwtExpire = (lang) =>
  new ApiError(t("common.EXPIRED_TOKEN_LOGIN_AGAIN", lang), 401);

const handleDuplicateFieldsDB = (err, lang) => {
  if (err.keyValue && typeof err.keyValue === "object") {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists. Please use another ${field}!`;
    return new ApiError(message, 400);
  }

  const match = err.message?.match(/index:\s+(?:\w+\.)*?(\w+)_/);
  if (match) {
    const field = match[1];
    return new ApiError(
      `${field} already exists. Please use another ${field}!`,
      400,
    );
  }

  return new ApiError(t("common.DUPLICATE_VALUE", lang), 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data: ${errors.join(". ")}`;
  return new ApiError(message, 400);
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ApiError(message, 400);
};

const handleMulterError = (err, lang) => {
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return new ApiError(`Unexpected file field: ${err.field}`, 400);
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return new ApiError(t("common.FILE_TOO_LARGE", lang), 400);
  }

  return new ApiError(t("common.INVALID_FILE_UPLOAD", lang), 400);
};

const sendErrorForDev = (err, res) => {
  console.log(err);
  return res.status(err.statusCode).json({
    status: err.status,
    error: err.errors || [],
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorForProd = (err, res, lang) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errors: err.errors || [],
    });
  } else {
    console.error("ERROR 💥", err);
    res.status(500).json({
      status: "error",
      message: t("common.SOMETHING_WENT_WRONG", lang),
    });
  }
};

export const globalError = async (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  console.log("error", err);

  const lang = req.lang || "en";

  let error = { ...err };
  error.message = err.message;
  error.name = err.name;
  error.code = err.code;
  error.keyValue = err.keyValue;

  if (error.code === 11000) error = handleDuplicateFieldsDB(error, lang);
  if (error.name === "ValidationError") error = handleValidationErrorDB(error);
  if (error.name === "CastError") error = handleCastErrorDB(error);
  if (error.name === "MulterError") error = handleMulterError(error, lang);
  if (error.name === "JsonWebTokenError")
    error = handelJwtInvalidSignature(lang);
  if (error.name === "TokenExpiredError") error = handelJwtExpire(lang);

  if (process.env.NODE_ENV === "development") {
    sendErrorForDev(error, res);
  } else {
    sendErrorForProd(error, res, lang);
  }
};
