const nodemailer = require('nodemailer');
var htmlToText = require('html-to-text');
var htmlToTextOptions = {
  wordwrap : false
}


exports.extend = function (app, options) {
  if (app.mailer) {
    throw new Error('Application already has been extended with Express-Mailer!');
  };

  let mailer = {};
  let passedOptions = options;
  let nodemailerTransporter = nodemailer.createTransport(options);

  /*** Send ***/

    /**
     * .sendMail
     *
     * Renders an enitre email using the given template and locals;
     *
     * @param {String|Object} template|sendOptions
     * @param {Object} locals (template local variables)
     * @param {Function} render (app.render or res.render)
     * @param {Function} callback
     * @api private
     */
    let sendMail = function (sendOptions, locals, render , callback) {
      var template;
      if (typeof sendOptions === "string") {
        template = sendOptions;
        sendOptions = {};
      } else {
        template = sendOptions.template;
      };

      render(template, locals, function (errRender, html) {
        if (errRender) {
          callback(errRender);
          return;
        };

          sendOptions.from = sendOptions.from || passedOptions.from;
        sendOptions.html = html;
            sendOptions.text = htmlToText.fromString( html , sendOptions.textOptions ? sendOptions.textOptions : htmlToTextOptions );

        // Taken from NodeMailer (libs/nodemailer.js v0.7.1 line 251)
        var acceptedFields = ['from', 'sender', 'to', 'subject', 'replyTo', 'debug',
            'reply_to', 'cc', 'bcc', 'body', 'text', 'html',
            'envelope', 'inReplyTo', 'references', 'attachments'];

        locals = locals || {};
        for(var i=0;i<acceptedFields.length;i++){
          var field = acceptedFields[i];
          sendOptions[field] = sendOptions[field] || locals[field];
        }

          // send mail with defined transport object
          nodemailerTransporter.sendMail(sendOptions, function (err, res) {
          if (err) {
            callback(err);
            return;
          } else {
                console.log('Message sent: %s', res.messageId);
                // Preview only available when sending through an Ethereal account
                // console.log('Preview URL: %s', nodemailer.getTestMessageUrl(res));
            callback(null, res.message);
          };
          });
      });
    };

    let createSend = function (render) {
      return function (sendOptions, locals, callback) {
        sendMail(sendOptions, locals, render, callback);
      };
    };

    /**
     * .send
     *
     * Sends an email using the given template and locals;
     *
     * @param {String|Object} template|sendOptions
     * @param {Object} locals (template local variables)
     * @param {Function} callback
     * @api public
     */
    mailer.send = createSend(app.render.bind(app));

  /*** Render ***/
  
    let createRender = function (render) {
      return function (sendOptions, locals, callback) {
        sendMail(sendOptions, locals, render, callback);
      };
    };

    /**
     * .render
     *
     * Renders an enitre email using the given template and locals;
     *
     * @param {String|Object} template|sendOptions
     * @param {Object} locals (template local variables)
     * @param {Function} callback
     * @api public
     */
    mailer.render = createRender(app.render.bind(app));

  /*** Update ***/

    /**
     * .update
     *
     * Updates the settings for mailer and callsback when ready;
     *
     * @param {Object} options
     * @param {Function} callback
     * @api public
     */
    mailer.update = function (options, callback) {
      nodemailerTransporter.close(function (err) {
        if (err) {
          callback(err);
          return;
        };
        passedOptions.from = options.from;
        nodemailerTransporter = nodemailer.createTransport(options);
        callback(null);
      });
    };

  // Add .mailer to res object
  app.use(function (req, res, next) {
    res.mailer = {
      send: createSend(res.render.bind(res)),
      render: createRender(res.render.bind(res)),
      update: mailer.update
    };
    next();
  });


  app.mailer = mailer;

  return app;

};