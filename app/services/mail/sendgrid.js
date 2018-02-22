const sendgridMail = require('@sendgrid/mail');

exports.init = function () {
  sendgridMail.setApiKey(process.env.SENDGRID_API_KEY);
};
exports.send = function (message) {
  return sendgridMail.send(message);
};