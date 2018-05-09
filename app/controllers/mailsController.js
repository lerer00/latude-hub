const Error = require('../models/error');
const sendgrid = require('../services/mail/sendgrid');

exports.post_mail = function (req, res) {
    var type = req.query.type;

    var message = '';
    if (type === 'help') {
        message = {
            to: 'boilyfrank28@gmail.com',
            from: 'info@latude.com',
            subject: 'Interested to help.',
            text: req.body.to + ' is interested to help',
            html: req.body.to + ' is interested to help',
        };
    } else if (type === 'subscribe') {
        message = {
            to: 'boilyfrank28@gmail.com',
            from: 'info@latude.com',
            subject: 'Want to subscribe.',
            text: req.body.to + ' want to subscribe.',
            html: req.body.to + ' want to subscribe.',
        };
    } else {
        res.status(400).json({ id: 400, message: 'Bad request unknown type.' });
        return;
    }

    sendgrid.send(message)
        .then((result, error) => {
            res.status(200).json({ id: 200, message: 'Message successfully sent.' });
        })
        .catch((error) => {
            res.status(500).json(new Error(500, 'Error sending mail.'));
        });
};