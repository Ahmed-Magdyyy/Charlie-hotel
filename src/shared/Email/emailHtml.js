const CLIENT_URL = process.env.CLIENT_URL || "https://charles-hotel.netlify.app";

export const forgetPasswordEmailHTML = (name, resetCode) => {
  return `<!DOCTYPE html>
  <html lang="en-US">
    <head>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
      <title>Reset Password Email</title>
      <meta name="description" content="Reset Password Email" />
      <style type="text/css">
        a:hover {
          text-decoration: underline !important;
        }
      </style>
    </head>
  
    <body
      marginheight="0"
      topmargin="0"
      marginwidth="0"
      style="margin: 0px; background-color: #f2f3f8"
      leftmargin="0"
    >
      <!--100% body table-->
      <table
        cellspacing="0"
        border="0"
        cellpadding="0"
        width="100%"
        bgcolor="#f2f3f8"
        style="
          @import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700);
          font-family: 'Open Sans', sans-serif;
        "
      >
        <tr>
          <td>
            <table
              style="background-color: #f2f3f8; max-width: 670px; margin: 0 auto"
              width="100%"
              border="0"
              align="center"
              cellpadding="0"
              cellspacing="0"
            >
              <tr>
                <td style="height: 80px">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center">
                  <a href="${CLIENT_URL}" title="Charlie Hotel" target="_blank">
                    <h2 style="color: #781919; font-family: 'Rubik', sans-serif; font-size: 28px; margin: 0;">Charlie Hotel</h2>
                  </a>
                </td>
              </tr>
              <tr>
                <td style="height: 20px">&nbsp;</td>
              </tr>
              <tr>
                <td>
                  <table
                    width="95%"
                    border="0"
                    align="center"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                      max-width: 670px;
                      background: #fff;
                      border-radius: 3px;
                      text-align: center;
                      -webkit-box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                      -moz-box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                      box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);
                    "
                  >
                    <tr>
                      <td style="height: 40px">&nbsp;</td>
                    </tr>
                    <tr>
                      <td style="padding: 0 35px">
                        <h1
                          style="
                            color: #1e1e2d;
                            font-weight: 500;
                            margin: 0;
                            font-size: 30px;
                            font-family: 'Rubik', sans-serif;
                          "
                        >
                          You have requested to reset your password
                        </h1>
                        <span
                          style="
                            display: inline-block;
                            vertical-align: middle;
                            margin: 29px 0 26px;
                            border-bottom: 1px solid #cecece;
                            width: 100px;
                          "
                        ></span>
                        <p
                          style="
                            color: #455056;
                            font-size: 17px;
                            line-height: 24px;
                            margin: 0;
                          "
                        >
                          Hello ${name}, <br/>
                          We received a request to reset the password on your Charlie Hotel account.
                        </p>
                        <p
                          
                          style="
                            color:rgb(155, 44, 16)!important;
                            font-weight: 500;
                            font-size: 25px;
                          "
                          >${resetCode}</p
                        >
                        <p
                          style="
                            color: #455056;
                            font-size: 17px;
                            line-height: 24px;
                            margin: 0;
                          "
                        >
                          Enter this code to complete the reset password process. Please note that this code is only valid for 20 min.
                          
                          Thanks for helping us keep your account secure.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="height: 40px">&nbsp;</td>
                    </tr>
                  </table>
                </td>
              </tr>
  
              <tr>
                <td style="height: 20px">&nbsp;</td>
              </tr>
              <tr>
                <td style="text-align: center">
                  <p
                    style="
                      font-size: 14px;
                      color: rgba(69, 80, 86, 0.7411764705882353);
                      line-height: 18px;
                      margin: 0 0 0;
                    "
                  >
                    &copy; <strong><a href="${CLIENT_URL}" style="text-decoration: none; color: inherit;">Charlie Hotel</a></strong>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="height: 80px">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!--/100% body table-->
    </body>
  </html>
  `;
};

export const otpEmailHTML = (name, otpCode) => {
  return `<!DOCTYPE html>
  <html lang="en-US">
    <head>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
      <title>Email Verification</title>
      <style type="text/css">
        a:hover { text-decoration: underline !important; }
      </style>
    </head>
    <body style="margin: 0px; background-color: #f2f3f8;" marginheight="0" topmargin="0" marginwidth="0" leftmargin="0">
      <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8" style="font-family: 'Open Sans', sans-serif;">
        <tr>
          <td>
            <table style="background-color: #f2f3f8; max-width: 670px; margin: 0 auto;" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
              <tr>
                <td style="height: 80px">&nbsp;</td>
              </tr>
              <tr>
                <td>
                  <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0" style="max-width: 670px; background: #fff; border-radius: 3px; text-align: center; box-shadow: 0 6px 18px 0 rgba(0, 0, 0, 0.06);">
                    <tr><td style="height: 40px">&nbsp;</td></tr>
                    <tr>
                      <td style="padding: 0 35px">
                        <h1 style="color: #1e1e2d; font-weight: 500; margin: 0; font-size: 30px;">Verify your email address</h1>
                        <span style="display: inline-block; vertical-align: middle; margin: 29px 0 26px; border-bottom: 1px solid #cecece; width: 100px;"></span>
                        <p style="color: #455056; font-size: 17px; line-height: 24px; margin: 0;">
                          Hello ${name}, <br/>
                          We received a request to verify your email address. Here is your code:
                        </p>
                        <p style="color:rgb(155, 44, 16)!important; font-weight: 500; font-size: 35px; letter-spacing: 5px; margin: 20px 0;">${otpCode}</p>
                        <p style="color: #455056; font-size: 17px; line-height: 24px; margin: 0;">
                          This code will expire in 20 minutes.
                        </p>
                      </td>
                    </tr>
                    <tr><td style="height: 40px">&nbsp;</td></tr>
                  </table>
                </td>
              </tr>
              <tr><td style="height: 80px">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// ─── Shared email wrapper ──────────────────────────────────────
// Keeps all booking templates visually consistent with the OTP/reset templates.

function emailWrapper(title, bodyContent) {
  return `<!DOCTYPE html>
  <html lang="en-US">
    <head>
      <meta content="text/html; charset=utf-8" http-equiv="Content-Type" />
      <title>${title}</title>
      <style type="text/css">
        a:hover { text-decoration: underline !important; }
      </style>
    </head>
    <body style="margin: 0px; background-color: #f2f3f8;" marginheight="0" topmargin="0" marginwidth="0" leftmargin="0">
      <table cellspacing="0" border="0" cellpadding="0" width="100%" bgcolor="#f2f3f8"
        style="@import url(https://fonts.googleapis.com/css?family=Rubik:300,400,500,700|Open+Sans:300,400,600,700); font-family: 'Open Sans', sans-serif;">
        <tr>
          <td>
            <table style="background-color: #f2f3f8; max-width: 670px; margin: 0 auto;" width="100%" border="0" align="center" cellpadding="0" cellspacing="0">
              <tr><td style="height: 80px">&nbsp;</td></tr>
              <tr>
                <td style="text-align: center">
                  <a href="${CLIENT_URL}" title="Charlie Hotel" target="_blank">
                    <h2 style="color: #781919; font-family: 'Rubik', sans-serif; font-size: 28px; margin: 0;">Charlie Hotel</h2>
                  </a>
                </td>
              </tr>
              <tr><td style="height: 20px">&nbsp;</td></tr>
              <tr>
                <td>
                  <table width="95%" border="0" align="center" cellpadding="0" cellspacing="0"
                    style="max-width: 670px; background: #fff; border-radius: 3px; text-align: left; box-shadow: 0 6px 18px 0 rgba(0,0,0,0.06);">
                    <tr><td style="height: 40px">&nbsp;</td></tr>
                    <tr>
                      <td style="padding: 0 35px">
                        ${bodyContent}
                      </td>
                    </tr>
                    <tr><td style="height: 40px">&nbsp;</td></tr>
                  </table>
                </td>
              </tr>
              <tr><td style="height: 20px">&nbsp;</td></tr>
              <tr>
                <td style="text-align: center">
                  <p style="font-size: 14px; color: rgba(69,80,86,0.74); line-height: 18px; margin: 0;">
                    &copy; <strong><a href="${CLIENT_URL}" style="text-decoration: none; color: inherit;">Charlie Hotel</a></strong>
                  </p>
                </td>
              </tr>
              <tr><td style="height: 80px">&nbsp;</td></tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

// ─── Shared styles ─────────────────────────────────────────────

const styles = {
  heading: "color: #1e1e2d; font-weight: 500; margin: 0 0 20px; font-size: 26px; font-family: 'Rubik', sans-serif;",
  text: "color: #455056; font-size: 15px; line-height: 24px; margin: 0 0 12px;",
  divider: "display: block; margin: 20px 0; border-bottom: 1px solid #eee;",
  tableRow: "border-bottom: 1px solid #f0f0f0;",
  tableLabel: "padding: 8px 12px 8px 0; color: #888; font-size: 14px; white-space: nowrap; vertical-align: top;",
  tableValue: "padding: 8px 0; color: #1e1e2d; font-size: 14px; font-weight: 500; vertical-align: top;",
  highlight: "color: #781919; font-weight: 600; font-size: 22px;",
  badge: "display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;",
};

// ─── Booking Confirmation (Guest) ──────────────────────────────

/**
 * @param {Object} data
 * @param {string} data.guestName
 * @param {string} data.bookingNumber
 * @param {string} data.roomTypeName
 * @param {string} data.checkIn        - YYYY-MM-DD
 * @param {string} data.checkOut       - YYYY-MM-DD
 * @param {number} data.nights
 * @param {number} data.guests
 * @param {string} data.reservationOption
 * @param {string} data.cancellationPolicy
 * @param {number} data.subtotal
 * @param {number} data.taxes
 * @param {number} data.loyaltyDiscount
 * @param {number} data.tierDiscount
 * @param {number} data.grandTotal
 * @param {string} [data.specialRequests]
 */
export const bookingConfirmationEmailHTML = (data) => {
  const discountRows = [];
  if (data.loyaltyDiscount > 0) {
    discountRows.push(`
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Loyalty Discount</td>
        <td style="${styles.tableValue}; color: #27ae60;">-${data.loyaltyDiscount} SAR</td>
      </tr>`);
  }
  if (data.tierDiscount > 0) {
    discountRows.push(`
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Tier Discount</td>
        <td style="${styles.tableValue}; color: #27ae60;">-${data.tierDiscount} SAR</td>
      </tr>`);
  }

  const body = `
    <h1 style="${styles.heading}">Booking Confirmed ✓</h1>
    <p style="${styles.text}">
      Hello ${data.guestName},<br/>
      Your booking has been confirmed. Here are your details:
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 15px 0;">
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Booking #</td>
        <td style="${styles.tableValue}">${data.bookingNumber}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Room</td>
        <td style="${styles.tableValue}">${data.roomTypeName}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Check-in</td>
        <td style="${styles.tableValue}">${data.checkIn}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Check-out</td>
        <td style="${styles.tableValue}">${data.checkOut}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Nights</td>
        <td style="${styles.tableValue}">${data.nights}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Guests</td>
        <td style="${styles.tableValue}">${data.guests}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Plan</td>
        <td style="${styles.tableValue}">${data.reservationOption}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Cancellation</td>
        <td style="${styles.tableValue}">${data.cancellationPolicy}</td>
      </tr>
    </table>

    <span style="${styles.divider}"></span>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 15px 0;">
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Subtotal</td>
        <td style="${styles.tableValue}">${data.subtotal} SAR</td>
      </tr>
      ${discountRows.join("")}
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Taxes</td>
        <td style="${styles.tableValue}">${data.taxes} SAR</td>
      </tr>
      <tr>
        <td style="${styles.tableLabel}; font-weight: 600; color: #1e1e2d;">Total</td>
        <td style="${styles.tableValue}"><span style="${styles.highlight}">${data.grandTotal} SAR</span></td>
      </tr>
    </table>

    ${data.specialRequests ? `
    <span style="${styles.divider}"></span>
    <p style="${styles.text}"><strong>Special Requests:</strong><br/>${data.specialRequests}</p>
    ` : ""}

    <p style="${styles.text}; margin-top: 20px;">
      Thank you for choosing Charlie Hotel. We look forward to welcoming you!
    </p>`;

  return emailWrapper("Booking Confirmation — Charlie Hotel", body);
};

// ─── New Booking Alert (Staff / Admin) ─────────────────────────

/**
 * @param {Object} data
 * @param {string} data.bookingNumber
 * @param {string} data.guestName
 * @param {string} data.guestEmail
 * @param {string} data.roomTypeName
 * @param {string} data.checkIn
 * @param {string} data.checkOut
 * @param {number} data.nights
 * @param {number} data.grandTotal
 * @param {string} data.paymentOption
 * @param {boolean} data.isManual
 */
export const newBookingAlertEmailHTML = (data) => {
  const body = `
    <h1 style="${styles.heading}">New Booking Received</h1>
    <p style="${styles.text}">
      A new booking has been ${data.isManual ? "created manually" : "placed"}.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 15px 0;">
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Booking #</td>
        <td style="${styles.tableValue}">${data.bookingNumber}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Guest</td>
        <td style="${styles.tableValue}">${data.guestName} (${data.guestEmail})</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Room</td>
        <td style="${styles.tableValue}">${data.roomTypeName}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Check-in</td>
        <td style="${styles.tableValue}">${data.checkIn}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Check-out</td>
        <td style="${styles.tableValue}">${data.checkOut}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Nights</td>
        <td style="${styles.tableValue}">${data.nights}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Payment</td>
        <td style="${styles.tableValue}">${data.paymentOption}</td>
      </tr>
      <tr>
        <td style="${styles.tableLabel}; font-weight: 600;">Total</td>
        <td style="${styles.tableValue}"><span style="${styles.highlight}">${data.grandTotal} SAR</span></td>
      </tr>
    </table>`;

  return emailWrapper("New Booking Alert — Charlie Hotel", body);
};

// ─── Booking Status Update (Guest) ─────────────────────────────

const statusColors = {
  confirmed: "#27ae60",
  checked_in: "#2980b9",
  checked_out: "#8e44ad",
  cancelled: "#e74c3c",
  expired: "#95a5a6",
  no_show: "#e67e22",
  pending: "#f39c12",
};

const statusLabels = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
  expired: "Expired",
  no_show: "No Show",
};

/**
 * @param {Object} data
 * @param {string} data.guestName
 * @param {string} data.bookingNumber
 * @param {string} data.roomTypeName
 * @param {string} data.checkIn
 * @param {string} data.checkOut
 * @param {string} data.oldStatus
 * @param {string} data.newStatus
 * @param {string} [data.note]
 */
export const bookingStatusUpdateEmailHTML = (data) => {
  const color = statusColors[data.newStatus] || "#455056";
  const label = statusLabels[data.newStatus] || data.newStatus;

  const body = `
    <h1 style="${styles.heading}">Booking Status Updated</h1>
    <p style="${styles.text}">
      Hello ${data.guestName},<br/>
      The status of your booking has been updated.
    </p>

    <div style="text-align: center; margin: 25px 0;">
      <span style="${styles.badge} background-color: ${color}; color: #fff;">${label}</span>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 15px 0;">
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Booking #</td>
        <td style="${styles.tableValue}">${data.bookingNumber}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Room</td>
        <td style="${styles.tableValue}">${data.roomTypeName}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Check-in</td>
        <td style="${styles.tableValue}">${data.checkIn}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Check-out</td>
        <td style="${styles.tableValue}">${data.checkOut}</td>
      </tr>
      <tr style="${styles.tableRow}">
        <td style="${styles.tableLabel}">Previous Status</td>
        <td style="${styles.tableValue}">${statusLabels[data.oldStatus] || data.oldStatus}</td>
      </tr>
      <tr>
        <td style="${styles.tableLabel}">New Status</td>
        <td style="${styles.tableValue}; color: ${color}; font-weight: 600;">${label}</td>
      </tr>
    </table>

    ${data.note ? `
    <span style="${styles.divider}"></span>
    <p style="${styles.text}"><strong>Note:</strong> ${data.note}</p>
    ` : ""}

    <p style="${styles.text}; margin-top: 20px;">
      If you have any questions, please don't hesitate to contact us.
    </p>`;

  return emailWrapper("Booking Update — Charlie Hotel", body);
};
