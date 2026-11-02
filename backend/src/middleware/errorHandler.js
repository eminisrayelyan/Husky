function errorHandler(error, req, res, next) {
    const status = error.status || 500;

    if (status >= 500) {
        console.error(error);
    }

    res.status(status).json({
        message: status >= 500
            ? "Something went wrong. Please try again later."
            : error.message,
    });
}

export default errorHandler;