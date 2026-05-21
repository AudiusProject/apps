const getEmailVerificationEmail = ({ verificationLink, copyrightYear }) => {
  return `
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta content="width=device-width" name="viewport" />
      <meta content="IE=edge" http-equiv="X-UA-Compatible" />
      <title>Verify your Audius email address</title>
      <link href="https://fonts.googleapis.com/css?family=Inter:400,500,600,700" rel="stylesheet" type="text/css">
    </head>
    <body style="background-color:#e9e9eb;margin:0;padding:0;font-family:Inter,Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <table bgcolor="#ffffff" width="600" cellspacing="0" cellpadding="0" border="0" style="margin:48px auto;border-radius:8px;">
              <tr>
                <td align="center" style="padding:32px 24px 16px 24px;">
                  <img src="https://download.audius.co/otp-email/qIQFWyjCV3zgmD1szUv72xc3ksmpzo.jpeg" width="224" border="0" style="max-width:224px;width:100%;height:auto;display:block;" alt="Audius">
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:0 24px 8px 24px;">
                  <div style="color:#3a3843;font-weight:700;font-family:Inter,Arial,sans-serif;font-size:27px;letter-spacing:-0.02em;line-height:36px;">Verify your email</div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:0 24px 24px 24px;">
                  <div style="color:#52505f;font-family:Inter,Arial,sans-serif;font-size:16px;line-height:24px;">Confirm this email address to finish setting up your Audius account.</div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:0 24px 24px 24px;">
                  <a href="${verificationLink}" style="background-color:#7e1bcc;color:#ffffff;text-decoration:none;font-family:Inter,Arial,sans-serif;font-weight:600;font-size:16px;line-height:20px;padding:14px 28px;border-radius:8px;display:inline-block;">Verify email</a>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:0 24px 24px 24px;">
                  <div style="color:#52505f;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:18px;word-break:break-all;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${verificationLink}" style="color:#cc0fe0;">${verificationLink}</a></div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:0 24px 32px 24px;">
                  <div style="color:#6a677a;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:16px;">This link will expire in 24 hours. If you didn't create an Audius account, you can safely ignore this email.</div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:24px;border-top:1px solid #e9e9eb;background-color:#f9f9f9;border-radius:0 0 8px 8px;">
                  <div style="color:#6a677a;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:16px;">&copy; ${copyrightYear} Audius, Inc. All Rights Reserved.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `
}

module.exports = { getEmailVerificationEmail }
