module.exports = error => error.status || (error.code === 11000 ? 409 : ['ValidationError','CastError','MulterError'].includes(error.name) ? 400 : 500);
