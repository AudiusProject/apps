// Keep this minimal. Promo content, images and tracking push security emails to spam.
const getOtpEmail = ({ otp, copyrightYear }) => {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<title>Your Audius Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f2f2f4;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f2f2f4;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;">
<tr>
<td align="center" style="padding:32px 32px 8px;">
<img src="https://download.audius.co/otp-email/qIQFWyjCV3zgmD1szUv72xc3ksmpzo.jpeg" width="160" alt="Audius" style="display:block;width:160px;max-width:160px;height:auto;border:0;">
</td>
</tr>
<tr>
<td align="center" style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;color:#2c2c34;">
<h1 style="margin:0;font-size:22px;line-height:28px;font-weight:bold;">Your verification code</h1>
<p style="margin:12px 0 0;font-size:15px;line-height:22px;color:#55535f;">Enter this code in Audius to continue:</p>
<p style="margin:16px 0 0;font-size:36px;line-height:44px;font-weight:bold;letter-spacing:4px;color:#7e1bcc;">${otp}</p>
<p style="margin:16px 0 0;font-size:14px;line-height:20px;color:#55535f;">This code expires in 10 minutes. If you didn't request it, change your password.</p>
</td>
</tr>
<tr>
<td align="center" style="padding:24px 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:20px;color:#55535f;">
Questions? <a href="https://help.audius.co" style="color:#7e1bcc;">Contact Audius Support</a>
</td>
</tr>
</table>
<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:16px;color:#858199;">&copy; ${copyrightYear} Audius, Inc. All rights reserved.</p>
</td>
</tr>
</table>
</body>
</html>`
}

const getOtpEmailText = ({ otp, copyrightYear }) => {
  return `Your Audius verification code is ${otp}

This code expires in 10 minutes. If you didn't request it, change your password.

Questions? Contact Audius Support: https://help.audius.co

© ${copyrightYear} Audius, Inc. All rights reserved.
`
}

module.exports = { getOtpEmail, getOtpEmailText }
