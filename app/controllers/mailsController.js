const Error = require('../models/error');
const sendgrid = require('../services/mail/sendgrid');

exports.post_mail = function (req, res) {
    const message = {
        to: 'boilyfrank28@gmail.com',
        from: 'info@latude.com',
        subject: 'Interested to help.',
        text: req.body.to + ' is interested to help',
        html: req.body.to + ' is interested to help',
    };

    sendgrid.send(message)
        .then((result, error) => {
            res.status(200).json({ id: 200, message: 'Message successfully sent.' });
        })
        .catch((error) => {
            res.status(500).json(new Error(500, 'Error sending mail.'));
        });
};