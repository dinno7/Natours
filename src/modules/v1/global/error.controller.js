const AppError = require('../../../utils/appError');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    handleDevError(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = JSON.parse(JSON.stringify(err));
    if (error.name?.toLowerCase() === 'casterror')
      error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name?.toLowerCase() === 'validationerror')
      error = handleValidationErrorDB(error);
    handleProdError(error, res);
  }
};

function handleDevError(err, res) {
  return res.status(err.statusCode).send({
    ok: false,
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack
  });
}

function handleProdError(err, res) {
  // >> Operational, trusted error: send msg to client
  if (err.isOperational) {
    return res.status(err.statusCode).send({
      ok: false,
      status: err.status,
      message: err.message
    });

    // >> Programming or other unknown error: don't leak error details
  } else {
    // >> 1) Log error:
    console.error(
      '⭕️ ~ ERROR  ~ in natours: src/utils/errorController.js ~> ❗',
      err
    );

    // >> 2) Send generic message
    return res.status(500).send({
      ok: false,
      status: 'error',
      message: 'Something went wrong on server'
    });
  }
}

function handleCastErrorDB(err) {
  const msg = `Invalid ${err.path}: ${err.value}`;
  return new AppError(msg, 400);
}

function handleDuplicateFieldsDB(err) {
  const fields = Object.keys(err.keyValue).join(', ');
  const msg = `Duplicate field(s): ${fields.toUpperCase()}. Please use another one!`;
  return new AppError(msg, 400);
}

function handleValidationErrorDB(err) {
  const errors = err?.errors;
  const msg = Object.keys(errors)
    ?.map(el => errors[el].message)
    ?.join(', ');
  return new AppError(msg, 400);
}