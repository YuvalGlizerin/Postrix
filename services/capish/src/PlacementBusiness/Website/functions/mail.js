var nodemailer = require('nodemailer')
const headers = {
    "Access-Control-Allow-Origin" : "*",
    "Access-Control-Allow-Headers": "Content-Type"
}

exports.handler = (event, context, callback) => {

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
        user: 'manpowerinfoIL@gmail.com',
        pass: 'lagranz01'
        }
    })

    var message = ''
    if(event.body) {
        var json = JSON.parse(event.body)
        var keys = Object.keys(json)
        for (var index in keys) {
            message += '<div style="direction: rtl; text-align: right;"><b>' + keys[index] + '</b><br>' + json[keys[index]] + '</div><br><br>'
        }
    }

    var mailOptions = {
        from: 'manpowerinfoIL@gmail.com',
        to: 'manpowerinfoIL@gmail.com',
        subject: 'NEW APPLICANT!!!',
        html: message
    }

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            callback(null, {
                statusCode: 403,
                headers,
                body: "ERROR: " + error
            })
        } 
        else {
            callback(null, {
                statusCode: 200,
                headers,
                body: "SUCCESS: " + info.response
            })
        }
    })
}
