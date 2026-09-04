import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("app.services.email")


class EmailService:
    @staticmethod
    def send_otp_email_sync(to_email: str, otp_code: str) -> bool:
        smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
        smtp_port = settings.SMTP_PORT or 587
        smtp_user = settings.SMTP_USER
        smtp_pass = settings.SMTP_PASSWORD
        smtp_from = settings.SMTP_FROM or smtp_user or "noreply@meeracrackersworld.com"

        if not smtp_user or not smtp_pass:
            logger.warning(
                f"[SMTP NOT CONFIGURED] Cannot send real email to {to_email}. "
                f"Generated OTP is: {otp_code}. To receive real emails in user inbox, "
                f"set SMTP_USER and SMTP_PASSWORD in Render Environment / .env"
            )
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"Your Meera Crackers Email Verification Code: {otp_code}"
            msg["From"] = f"Meera Crackers World <{smtp_from}>"
            msg["To"] = to_email

            html_content = f"""
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background-color: #D32F2F; padding: 24px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">Meera Crackers World</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 24px;">
                      <h2 style="color: #222; font-size: 20px; margin-top: 0;">Email Verification Required</h2>
                      <p style="font-size: 15px; line-height: 1.5; color: #555;">Hello,</p>
                      <p style="font-size: 15px; line-height: 1.5; color: #555;">Thank you for registering with <strong>Meera Crackers World</strong>. Please use the 6-digit OTP code below to verify your email address and complete registration:</p>
                      
                      <div style="background-color: #FFF3E0; border: 2px dashed #E65100; border-radius: 10px; padding: 18px; text-align: center; margin: 25px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D32F2F; font-family: monospace;">{otp_code}</span>
                      </div>
                      
                      <p style="font-size: 13px; color: #777; line-height: 1.4;">This verification code is valid for <strong>10 minutes</strong>. If you did not initiate this registration request, please ignore this email.</p>
                      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;" />
                      <p style="font-size: 12px; color: #999999; text-align: center; margin: 0;">&copy; 2026 Meera Crackers World. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """
            msg.attach(MIMEText(html_content, "html"))

            if int(smtp_port) == 465:
                with smtplib.SMTP_SSL(smtp_host, 465, timeout=12) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, [to_email], msg.as_string())
            else:
                try:
                    with smtplib.SMTP(smtp_host, int(smtp_port), timeout=12) as server:
                        server.starttls()
                        server.login(smtp_user, smtp_pass)
                        server.sendmail(smtp_from, [to_email], msg.as_string())
                except Exception as port_err:
                    logger.warning(f"Port {smtp_port} STARTTLS failed ({port_err}). Trying SSL Port 465 fallback...")
                    with smtplib.SMTP_SSL(smtp_host, 465, timeout=12) as server:
                        server.login(smtp_user, smtp_pass)
                        server.sendmail(smtp_from, [to_email], msg.as_string())

            logger.info(f"REAL OTP EMAIL SENT SUCCESSFULLY TO {to_email}")
            return True
        except Exception as e:
            logger.error(f"FAILED TO SEND REAL SMTP EMAIL TO {to_email}: {str(e)}")
            return False

    @classmethod
    async def send_otp_email(cls, to_email: str, otp_code: str) -> bool:
        return await asyncio.to_thread(cls.send_otp_email_sync, to_email, otp_code)
