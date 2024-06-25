export const email = ({
  name,
  handle,
  profilePicture,
  profileLink,
  amount
}: {
  name: string
  handle: string
  profilePicture: string
  profileLink: string
  amount: string
}) => {
  const copyrightYear = new Date().getFullYear().toString()
  return `
  <!doctype html>
  <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
  
  <head>
  <meta charset="utf-8" />
  <meta content="width=device-width" name="viewport" />
  <meta content="IE=edge" http-equiv="X-UA-Compatible" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
  <title>Your USDC Transfer is Complete!</title>
  <!--[if mso]>
			  <style>
				  * {
					  font-family: sans-serif !important;
				  }
			  </style>
		  <![endif]-->
  <!--[if !mso]><!-->
  <!-- <![endif]-->
  <link href="https://fonts.googleapis.com/css?family=Inter:700" rel="stylesheet" type="text/css">
  <link href="https://fonts.googleapis.com/css?family=Inter:400" rel="stylesheet" type="text/css">
  <link href="https://fonts.googleapis.com/css?family=Inter:500" rel="stylesheet" type="text/css">
  <style>
  html {
	  margin: 0 !important;
	  padding: 0 !important;
  }
  
  * {
	  -ms-text-size-adjust: 100%;
	  -webkit-text-size-adjust: 100%;
  }
  td {
	  vertical-align: top;
	  mso-table-lspace: 0pt !important;
	  mso-table-rspace: 0pt !important;
  }
  a {
	  text-decoration: none;
  }
  img {
	  -ms-interpolation-mode:bicubic;
  }
  @media only screen and (min-device-width: 320px) and (max-device-width: 374px) {
	  u ~ div .email-container {
		  min-width: 320px !important;
	  }
  }
  @media only screen and (min-device-width: 375px) and (max-device-width: 413px) {
	  u ~ div .email-container {
		  min-width: 375px !important;
	  }
  }
  @media only screen and (min-device-width: 414px) {
	  u ~ div .email-container {
		  min-width: 414px !important;
	  }
  }
  
  </style>
  <!--[if gte mso 9]>
		  <xml>
			  <o:OfficeDocumentSettings>
				  <o:AllowPNG/>
				  <o:PixelsPerInch>96</o:PixelsPerInch>
			  </o:OfficeDocumentSettings>
		  </xml>
		  <![endif]-->
  <style>
  @media only screen and (max-device-width: 599px), only screen and (max-width: 599px) {
  
	  .eh {
		  height:auto !important;
	  }
	  .desktop {
		  display: none !important;
		  height: 0 !important;
		  margin: 0 !important;
		  max-height: 0 !important;
		  overflow: hidden !important;
		  padding: 0 !important;
		  visibility: hidden !important;
		  width: 0 !important;
	  }
	  .mobile {
		  display: block !important;
		  width: auto !important;
		  height: auto !important;
		  float: none !important;
	  }
	  .email-container {
		  width: 100% !important;
		  margin: auto !important;
	  }
	  .stack-column,
	  .stack-column-center {
		  display: block !important;
		  width: 100% !important;
		  max-width: 100% !important;
		  direction: ltr !important;
	  }
	  .wid-auto {
		  width:auto !important;
	  }
  
	  .table-w-full-mobile {
		  width: 100%;
	  }
  
	  
	  
  
	  .mobile-center {
		  text-align: center;
	  }
  
	  .mobile-center > table {
		  display: inline-block;
		  vertical-align: inherit;
	  }
  
	  .mobile-left {
		  text-align: left;
	  }
  
	  .mobile-left > table {
		  display: inline-block;
		  vertical-align: inherit;
	  }
  
	  .mobile-right {
		  text-align: right;
	  }
  
	  .mobile-right > table {
		  display: inline-block;
		  vertical-align: inherit;
	  }
  
  }
  
  </style>
  </head>
  
  <body width="100%" style="background-color:#e9e9eb;margin:0;padding:0!important;mso-line-height-rule:exactly;">
  <div style="background-color:#e9e9eb">
  <!--[if gte mso 9]>
											  <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
											  <v:fill type="tile" color="#e9e9eb"/>
											  </v:background>
											  <![endif]-->
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td valign="top" align="center">
  <table bgcolor="#ffffff" style="margin:0 auto;" align="center" id="brick_container" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container">
  <tr>
  <td width="600">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="600" style="background-color:#ffffff;  " bgcolor="#ffffff">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td width="600">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="584" align="center" style="vertical-align: middle; background-color:#ffffff;   padding-left:8px; padding-right:8px;" bgcolor="#ffffff">
  <table border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="8" style="height:8px; min-height:8px; line-height:8px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;" width="492">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="492" style="vertical-align: middle;  ">
  <table border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td style="vertical-align: middle;" width="60"><img src="${profilePicture}" width="60" border="0" style="min-width:60px; width:60px;
		  border-radius:64px; height: auto; display: block;"></td>
  <td style="width:16px; min-width:16px;" width="16"></td>
  <td style="vertical-align: middle;">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td style="vertical-align: middle;  ">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td style="vertical-align: middle;">
  <div style="line-height:24px;text-align:left;"><a target="_blank" href="${profileLink}"><span style="color:#52505f;font-weight:700;font-family:Inter,Arial,sans-serif;font-size:16px;letter-spacing:-0.02em;line-height:24px;text-align:left;">${name}</span></a></div>
  </td>
  </tr>
  <tr>
  <td height="4" style="height:4px; min-height:4px; line-height:4px;"></td>
  </tr>
  <tr>
  <td>
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td style="vertical-align: middle;">
  <div style="line-height:24px;text-align:left;"><a target="_blank" href="${profileLink}"><span style="color:#52505f;font-family:Inter,Arial,sans-serif;font-size:16px;line-height:24px;text-align:left;">@${handle}</span></a></div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  <td style="width:8px; min-width:8px;" width="8"></td>
  <td style="vertical-align: middle;" width="72" align="center"><img src="https://download.audius.co/emails/withdrawal/BSO6Pwu0dZGFQVFQQKZ8VtvWxBUw5S.jpeg" width="72" border="0" style="min-width:72px; width:72px;
		   height: auto; display: block;"></td>
  </tr>
  <tr>
  <td height="8" style="height:8px; min-height:8px; line-height:8px;"></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td width="600">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="600">
  <table cellpadding="0" cellspacing="0" bgcolor="#ffffff" height="16" width="100%" style="line-height:16px;height:16px!important;background-color:#ffffff;  border-collapse:separate !important;margin:0 auto;text-align:center;">
  <tr>
  <td> </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td width="600">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="552" style="vertical-align: middle; background-color:#ffffff;   padding-left:24px; padding-right:24px;" bgcolor="#ffffff">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="12" style="height:12px; min-height:12px; line-height:12px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;">
  <div style="line-height:36px;text-align:left;"><span style="color:#3a3843;font-weight:700;font-family:Inter,Arial,sans-serif;font-size:27px;letter-spacing:-0.02em;line-height:36px;text-align:left;">Funds Transfer Confirmation</span></div>
  </td>
  </tr>
  <tr>
  <td height="8" style="height:8px; min-height:8px; line-height:8px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;">
  <div style="line-height:24px;text-align:left;"><span style="color:#52505f;font-family:Inter,Arial,sans-serif;font-size:16px;line-height:24px;text-align:left;">We have successfully processed your Solana USD (USDC) transfer.</span></div>
  </td>
  </tr>
  <tr>
  <td height="12" style="height:12px; min-height:12px; line-height:12px;"></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td width="600">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="552" style="background-color:#ffffff;   padding-left:24px; padding-right:24px;" bgcolor="#ffffff">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="24" style="height:24px; min-height:24px; line-height:24px;"></td>
  </tr>
  <tr>
  <td width="100%">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td>
  <div style="line-height:24px;text-align:left;"><span style="color:#3a3843;font-weight:700;font-family:Inter,Arial,sans-serif;font-size:16px;letter-spacing:-0.02em;line-height:24px;text-align:left;">Transfer Details</span></div>
  </td>
  </tr>
  <tr>
  <td height="8" style="height:8px; min-height:8px; line-height:8px;"></td>
  </tr>
  <tr>
  <td>
  <div style="line-height:24px;text-align:left;"><span style="color:#52505f;font-family:Inter,Arial,sans-serif;font-size:16px;line-height:24px;text-align:left;">Transfer Amount: ${amount} USDC</span></div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="24" style="height:24px; min-height:24px; line-height:24px;"></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td width="100%">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="100%" align="center" style="background-color:#ffffff;   padding-left:24px; padding-right:24px;" bgcolor="#ffffff">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="24" style="height:24px; min-height:24px; line-height:24px;"></td>
  </tr>
  <tr>
  <td width="100%" align="center" class="2DsnnC4ovok27ac7AXLqfMQEbhtxLo invert-bg" style="vertical-align: middle; background-repeat:no-repeat !important; background-position: center center !important; background-size: cover !important;border-radius:12px; border-collapse:separate !important; padding-left:24px; padding-right:24px;" background="https://download.audius.co/emails/withdrawal/2DsnnC4ovok27ac7AXLqfMQEbhtxLo.png">
  <!--[if gte mso 9]>
				  <v:image xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style=" border: 0;display: inline-block; width: 552px; height:182px;"
				  src="https://download.audius.co/emails/withdrawal/2DsnnC4ovok27ac7AXLqfMQEbhtxLo.png"
				  />
				  <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style=" border: 0;display: inline-block;position: absolute; width: 552px; height:182px;">
				  <v:fill opacity="0%" color="#000" />
				  <v:textbox inset="0,0,0,0">
				  <![endif]-->
  <div>
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="36" style="height:36px; min-height:36px; line-height:36px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;" width="100%">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="100%" align="center" style="vertical-align: middle;  ">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td style="vertical-align: middle;" align="center">
  <div style="line-height:36px;text-align:center;"><span style="color:#3a3843;font-weight:700;font-family:Inter,Arial,sans-serif;font-size:27px;letter-spacing:-0.02em;line-height:36px;text-align:center;">Download The App!</span></div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="24" style="height:24px; min-height:24px; line-height:24px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;" width="100%">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="100%" align="center">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td width="504" align="center" style="vertical-align: middle;  ">
  <table class="table-w-full-mobile" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td style="vertical-align: middle;" class="stack-column-center" align="center"><a target="_blank" href="https://apps.apple.com/us/app/audius-music/id1491270519"><img src="https://download.audius.co/emails/withdrawal/oxyCkIsHBvNleiZLGnyXvV7j9yM9KE.png" width="142" border="0" style="min-width:142px; width:142px;
		   height: auto; display: block;"></a></td>
  <td class="stack-column-center" height="12" style="width:12px; min-width:12px; height:12px; min-height:12px;" width="12"></td>
  <td style="vertical-align: middle;" class="stack-column-center" align="center"><a target="_blank" href="https://play.google.com/store/apps/details?id=co.audius.app&hl=en_US&gl=US"><img src="https://download.audius.co/emails/withdrawal/q1evAW5GIFOanhNG9Tf8GGyFeQE4AX.png" width="166" border="0" style="min-width:166px; width:166px;
		   height: auto; display: block;"></a></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="36" style="height:36px; min-height:36px; line-height:36px;"></td>
  </tr>
  </table>
  </div>
  <!--[if gte mso 9]>
				  </v:textbox>
				  </v:fill>
				  </v:rect>
				  </v:image>
				  <![endif]-->
  </td>
  </tr>
  <tr>
  <td height="24" style="height:24px; min-height:24px; line-height:24px;"></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td width="600">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="552" align="center" style="vertical-align: middle; background-color:#f9f9f9;  border-width: 1px 0px 0px 0px; border-color:#e9e9eb; border-style:solid; padding-left:24px; padding-right:24px;" bgcolor="#f9f9f9">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="48" style="height:48px; min-height:48px; line-height:48px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;" width="100%">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="100%" align="center" style="vertical-align: middle; border-radius:8px; ">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="24" style="height:24px; min-height:24px; line-height:24px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;" width="100%">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="100%" style="  padding-left:12px; padding-right:12px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="12" style="height:12px; min-height:12px; line-height:12px;"></td>
  </tr>
  <tr>
  <td width="528" align="center" style="vertical-align: middle;  ">
  <table class="table-w-full-mobile" width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td style="vertical-align: middle;" class="stack-column-center" align="center"><a target="_blank" href="https://www.audius.co"><img src="https://download.audius.co/emails/withdrawal/NQYOVr4BMjSzOkhCNPtzsCUxMFeq1w.png" width="168" border="0" style="min-width:168px; width:168px;
		  border-radius:2px; height: auto; display: block;"></a></td>
  <td class="stack-column-center" height="12" style="width:12px; min-width:12px; height:12px; min-height:12px;" width="12"></td>
  <td class="stack-column-center" style="width:168px;"></td>
  <td class="stack-column-center" height="12" style="width:12px; min-width:12px; height:12px; min-height:12px;" width="12"></td>
  <td style="vertical-align: middle;" align="center" class="stack-column-center">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td align="center" style="vertical-align: middle; border-radius:2px;  padding-left:4px; padding-right:4px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="4" style="height:4px; min-height:4px; line-height:4px;"></td>
  </tr>
  <tr>
  <td align="center">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td style="vertical-align: middle;">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td align="right" style="vertical-align: middle; height:32px; border-radius:2px;  padding-left:4px; padding-right:4px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="4" style="height:4px; min-height:4px; line-height:4px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;" width="144">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="144" style="vertical-align: middle;  ">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td style="vertical-align: middle;"><a target="_blank" href="https://twitter.com/audius"><img src="https://download.audius.co/emails/withdrawal/90NyRomVtFDITFNfgY3QmVpY7Xvzvv.png" width="24" border="0" style="min-width:24px; width:24px;
		   height: auto; display: block;"></a></td>
  <td style="width:16px; min-width:16px;" width="16"></td>
  <td style="vertical-align: middle;"><a target="_blank" href="https://www.instagram.com/audius/"><img src="https://download.audius.co/emails/withdrawal/UVUMcCdSVSWrgQAce3eaW4rDG6E6mI.png" width="24" border="0" style="min-width:24px; width:24px;
		   height: auto; display: block;"></a></td>
  <td style="width:16px; min-width:16px;" width="16"></td>
  <td style="vertical-align: middle;"><a target="_blank" href="https://tiktok.com/@audius"><img src="https://download.audius.co/emails/withdrawal/Ck8b7F53y061dHkJghL8EXiX0SaCLy.png" width="24" border="0" style="min-width:24px; width:24px;
		   height: auto; display: block;"></a></td>
  <td style="width:16px; min-width:16px;" width="16"></td>
  <td style="vertical-align: middle;"><a target="_blank" href="https://www.youtube.com/@AudiusMusic"><img src="https://download.audius.co/emails/withdrawal/Z5Qtu3Hg8UearT1uQMk58SvvfoQhhe.png" width="24" border="0" style="min-width:24px; width:24px;
		   height: auto; display: block;"></a></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="4" style="height:4px; min-height:4px; line-height:4px;"></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="4" style="height:4px; min-height:4px; line-height:4px;"></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="12" style="height:12px; min-height:12px; line-height:12px;"></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="16" style="height:16px; min-height:16px; line-height:16px;"></td>
  </tr>
  <tr>
  <td align="center">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td style="vertical-align: middle;" width="528">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="528" align="center" style="vertical-align: middle;  ">
  <table class="table-w-full-mobile" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td height="16" style="height:16px; min-height:16px; line-height:16px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;" align="center" width="32.32%" class="stack-column-center">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td align="center" style="vertical-align: middle; border-radius:2px;  padding-left:16px; padding-right:16px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td align="center">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td style="vertical-align: middle;" align="center">
  <div style="line-height:14px;text-align:center;"><a target="_blank" href="https://www.audius.co"><span style="color:#6a677a;font-weight:500;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:14px;text-align:center;">Audius Music</span></a></div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="8" style="height:8px; min-height:8px; line-height:8px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;" align="center">
  <div style="line-height:14px;text-align:center;"><a target="_blank" href="https://help.audius.co"><span style="color:#6a677a;font-weight:500;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:14px;text-align:center;">Help & Support</span></a></div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  <td class="stack-column-center" height="8" style="width:8px; min-width:8px; height:8px; min-height:8px;" width="8"></td>
  <td style="vertical-align: middle;" align="center" width="32.32%" class="stack-column-center">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td align="center" style="vertical-align: middle; border-radius:2px;  padding-left:16px; padding-right:16px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td align="center">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td style="vertical-align: middle;" align="center">
  <div style="line-height:14px;text-align:center;"><a target="_blank" href="https://blog.audius.co"><span style="color:#6a677a;font-weight:500;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:14px;text-align:center;">The Blog</span></a></div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="8" style="height:8px; min-height:8px; line-height:8px;"></td>
  </tr>
  <tr>
  <td align="center">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td style="vertical-align: middle;" align="center">
  <div style="line-height:14px;text-align:center;"><a target="_blank" href="https://www.audius.events"><span style="color:#6a677a;font-weight:500;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:14px;text-align:center;">Events</span></a></div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  <td class="stack-column-center" height="8" style="width:8px; min-width:8px; height:8px; min-height:8px;" width="8"></td>
  <td style="vertical-align: middle;" align="center" width="32.32%" class="stack-column-center">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td align="center" style="vertical-align: middle; border-radius:2px;  padding-left:16px; padding-right:16px;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td align="center">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td style="vertical-align: middle;" align="center">
  <div style="line-height:14px;text-align:center;"><a target="_blank" href="https://brand.audius.co"><span style="color:#6a677a;font-weight:500;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:14px;text-align:center;">Brand / Press</span></a></div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="8" style="height:8px; min-height:8px; line-height:8px;"></td>
  </tr>
  <tr>
  <td align="center">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td style="vertical-align: middle;" align="center">
  <div style="line-height:14px;text-align:center;"><a target="_blank" href="https://merch.audius.co"><span style="color:#6a677a;font-weight:500;font-family:Inter,Arial,sans-serif;font-size:14px;line-height:14px;text-align:center;">Merch Store</span></a></div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="16" style="height:16px; min-height:16px; line-height:16px;"></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="16" style="height:16px; min-height:16px; line-height:16px;"></td>
  </tr>
  <tr>
  <td style="vertical-align: middle;" width="100%">
  <table width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td width="100%" align="center" style="vertical-align: middle;  ">
  <table width="100%" border="0" cellpadding="0" cellspacing="0">
  <tr>
  <td align="center">
  <table cellspacing="0" cellpadding="0" border="0">
  <tr>
  <td style="vertical-align: middle;" align="center">
  <div style="line-height:14px;text-align:center;"><span style="color:#6a677a;font-family:Inter,Arial,sans-serif;font-size:12px;line-height:14px;text-align:center;">© ${copyrightYear} Audius, Inc. All Rights Reserved.</span></div>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="24" style="height:24px; min-height:24px; line-height:24px;"></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  <tr>
  <td height="48" style="height:48px; min-height:48px; line-height:48px;"></td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </td>
  </tr>
  </table>
  </div>
  </body>
  </html>
  `
}
