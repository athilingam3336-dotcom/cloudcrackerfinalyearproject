import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("app.services.email")


class EmailService:
    @classmethod
    async def send_otp_email(cls, to_email: str, otp_code: str) -> bool:
        """Sends OTP verification email via high-speed Transactional API (Resend SDK/HTTP) or optimized SMTP background thread."""
        smtp_from = settings.SMTP_FROM or settings.SMTP_USER or "noreply@meeracrackersworld.com"
        subject = "CloudCrackers - Email Verification OTP"
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">CloudCrackers</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px 24px;">
                  <h2 style="color: #222; font-size: 20px; margin-top: 0;">Email Verification</h2>
                  <p style="font-size: 15px; line-height: 1.5; color: #555;">Hello,</p>
                  <p style="font-size: 15px; line-height: 1.5; color: #555;">Your verification OTP is:</p>
                  
                  <div style="background-color: #FFF3E0; border: 2px dashed #E65100; border-radius: 10px; padding: 18px; text-align: center; margin: 25px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #D32F2F; font-family: monospace;">{otp_code}</span>
                  </div>
                  
                  <p style="font-size: 13px; color: #777; line-height: 1.4;">This OTP will expire in <strong>5 minutes</strong>.</p>
                  <p style="font-size: 13px; color: #777; line-height: 1.4;">If you did not request this verification, please ignore this email.</p>
                  <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;" />
                  <p style="font-size: 12px; color: #999999; text-align: center; margin: 0;">&copy; 2026 CloudCrackers. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """

        # 1. High-speed Resend Python SDK / API
        if settings.RESEND_API_KEY:
            clean_api_key = settings.RESEND_API_KEY.strip().strip("'\"")
            resend_sender = settings.EMAIL_FROM or settings.RESEND_FROM or "onboarding@resend.dev"
            clean_sender = resend_sender.strip().strip("'\"")

            # First attempt with configured sender
            try:
                import resend
                resend.api_key = clean_api_key

                params = {
                    "from": clean_sender,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                }
                await resend.Emails.send_async(params)
                logger.info(f"OTP email sent via Resend SDK to {to_email}")
                return True
            except Exception as sdk_err:
                logger.warning(f"Resend SDK attempt warning for {to_email}: {sdk_err}.")
                
                # If custom sender failed or was rejected, fallback to default onboarding@resend.dev
                if clean_sender != "onboarding@resend.dev":
                    try:
                        logger.info("Attempting Resend retry with default onboarding@resend.dev sender...")
                        fallback_params = {
                            "from": "onboarding@resend.dev",
                            "to": [to_email],
                            "subject": subject,
                            "html": html_content,
                        }
                        await resend.Emails.send_async(fallback_params)
                        logger.info(f"OTP email sent via Resend SDK (onboarding@resend.dev fallback) to {to_email}")
                        return True
                    except Exception as fallback_err:
                        logger.warning(f"Resend SDK fallback error for {to_email}: {fallback_err}")
                
                # Try direct HTTP API call as secondary fallback
                try:
                    import httpx
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        res = await client.post(
                            "https://api.resend.com/emails",
                            headers={
                                "Authorization": f"Bearer {clean_api_key}",
                                "Content-Type": "application/json",
                            },
                            json={
                                "from": "onboarding@resend.dev",
                                "to": [to_email],
                                "subject": subject,
                                "html": html_content,
                            },
                        )
                        if res.status_code in (200, 201, 202):
                            logger.info(f"OTP email sent via Resend HTTP API to {to_email}")
                            return True
                        else:
                            logger.warning(f"Resend HTTP API error ({res.status_code}): {res.text}")
                except Exception as http_err:
                    logger.error(f"Resend HTTP API exception for {to_email}: {http_err}")



        # 2. SendGrid HTTP API (Secondary if configured)
        if settings.SENDGRID_API_KEY:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=5.0) as client:
                    res = await client.post(
                        "https://api.sendgrid.com/v3/mail/send",
                        headers={
                            "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "personalizations": [{"to": [{"email": to_email}]}],
                            "from": {"email": smtp_from, "name": "Meera Crackers World"},
                            "subject": subject,
                            "content": [{"type": "text/html", "value": html_content}],
                        },
                    )
                    if res.status_code in (200, 202):
                        logger.info(f"OTP email sent via SendGrid API to {to_email}")
                        return True
                    else:
                        logger.warning(f"SendGrid API error ({res.status_code}): {res.text}")
            except Exception as e:
                logger.error(f"SendGrid API exception for {to_email}: {e}")

        # 3. Optimized SMTP Fallback
        return await asyncio.to_thread(cls.send_otp_email_sync, to_email, otp_code, html_content)

    @staticmethod
    def send_otp_email_sync(to_email: str, otp_code: str, html_content: str = None) -> bool:
        smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
        smtp_port = settings.SMTP_PORT or 587
        smtp_user = settings.SMTP_USER
        smtp_pass = settings.SMTP_PASSWORD
        smtp_from = settings.SMTP_FROM or smtp_user or "noreply@meeracrackersworld.com"

        if not smtp_user or not smtp_pass:
            logger.warning(
                f"[SMTP NOT CONFIGURED] Cannot send real email to {to_email}. "
                f"Set SMTP_USER / SMTP_PASSWORD or RESEND_API_KEY in environment."
            )
            if settings.is_test or settings.ENVIRONMENT in ("test", "development"):
                logger.info(f"[TEST/DEV MODE] Simulating successful OTP email delivery to {to_email}")
                return True
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = "Your Meera Crackers Email Verification Code"
            msg["From"] = f"Meera Crackers World <{smtp_from}>"
            msg["To"] = to_email

            if not html_content:
                html_content = f"<p>Your OTP code is: <strong>{otp_code}</strong></p>"

            msg.attach(MIMEText(html_content, "html"))

            # Optimized fast timeout (15s) for SMTP TLS handshakes
            try:
                with smtplib.SMTP_SSL(smtp_host, 465, timeout=15) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, [to_email], msg.as_string())
            except Exception as ssl_err:
                logger.warning(f"SMTP SSL 465 failed ({ssl_err}), trying Port {smtp_port} STARTTLS...")
                with smtplib.SMTP(smtp_host, int(smtp_port), timeout=15) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, [to_email], msg.as_string())

            logger.info(f"OTP email sent via SMTP to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMTP email to {to_email}: {str(e)}")
            return False

    @staticmethod
    def generate_admin_report_pdf(report_data: dict, today_date: str) -> bytes:
        """Generates a professional PDF report in memory using ReportLab."""
        import io
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Title"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#D32F2F"),
            alignment=1
        )

        sub_style = ParagraphStyle(
            "SubTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#555555"),
            alignment=1
        )

        h2_style = ParagraphStyle(
            "SectionHeader",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#222222"),
            spaceBefore=12,
            spaceAfter=6
        )

        cell_style = ParagraphStyle(
            "CellText",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#333333")
        )

        cell_bold = ParagraphStyle(
            "CellBoldText",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#111111")
        )

        elements = [
            Paragraph("MEERA CRACKERS WORLD", title_style),
            Paragraph(f"Daily Operations & Inventory Outflow Report — {today_date}", sub_style),
            Spacer(1, 10),
            HRFlowable(width="100%", thickness=1, color=colors.HexColor("#D32F2F"), spaceBefore=0, spaceAfter=12),
        ]

        # 1. Executive Summary Cards Table
        summary_headers = ["TODAY'S REVENUE", "TODAY'S ORDERS", "ITEMS OUTFLOW", "REMAINING STOCK"]
        summary_values = [
            f"Rs. {report_data.get('today_revenue', 0):,.2f}",
            f"{report_data.get('today_orders', 0)} Orders",
            f"{report_data.get('today_items_sold', 0)} Items",
            f"{report_data.get('remaining_stock', 0)} Items"
        ]

        summary_table = Table(
            [[Paragraph(h, ParagraphStyle("H", parent=cell_bold, alignment=1, textColor=colors.whitesmoke)) for h in summary_headers],
             [Paragraph(v, ParagraphStyle("V", parent=cell_bold, alignment=1, fontSize=11, leading=13, textColor=colors.HexColor("#D32F2F"))) for v in summary_values]],
            colWidths=[135, 135, 135, 135]
        )
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#D32F2F")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#FFF8E1")),
            ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#E0E0E0")),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 14))

        # 2. Today's Orders Breakdown
        elements.append(Paragraph("Today's Orders Breakdown", h2_style))
        orders_list = report_data.get("today_orders_list", [])

        if not orders_list:
            elements.append(Paragraph("No orders recorded yet today.", cell_style))
        else:
            order_table_data = [
                [Paragraph("Order #", cell_bold), Paragraph("Customer", cell_bold), Paragraph("Total Amount", cell_bold), Paragraph("Status", cell_bold), Paragraph("Items Summary", cell_bold)]
            ]
            for ord_item in orders_list[:15]:
                order_table_data.append([
                    Paragraph(str(ord_item.get("order_number", "-")), cell_style),
                    Paragraph(str(ord_item.get("customer_name", "-")), cell_style),
                    Paragraph(f"Rs. {ord_item.get('total', 0):,.2f}", cell_bold),
                    Paragraph(str(ord_item.get("order_status", "-")).upper(), cell_style),
                    Paragraph(str(ord_item.get("items_summary", "-")), cell_style),
                ])

            ord_table = Table(order_table_data, colWidths=[80, 100, 80, 75, 205])
            ord_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5F5F5")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E0E0")),
            ]))
            elements.append(ord_table)

        elements.append(Spacer(1, 14))

        # 3. Itemized Stock & Inventory Status
        elements.append(Paragraph("Itemized Stock & Warehouse Status", h2_style))
        stock_list = report_data.get("stock_inventory_list", [])

        if not stock_list:
            elements.append(Paragraph("No stock items registered.", cell_style))
        else:
            stock_table_data = [
                [Paragraph("Product Name", cell_bold), Paragraph("Category", cell_bold), Paragraph("Stock Left", cell_bold), Paragraph("Sold Today", cell_bold), Paragraph("Status", cell_bold)]
            ]
            for stk in stock_list[:30]:
                stock_table_data.append([
                    Paragraph(str(stk.get("name", "-")), cell_style),
                    Paragraph(str(stk.get("category_name", "-")), cell_style),
                    Paragraph(str(stk.get("stock_left", 0)), cell_bold),
                    Paragraph(str(stk.get("sold_today", 0)), cell_style),
                    Paragraph(str(stk.get("status", "-")), cell_style),
                ])

            stk_table = Table(stock_table_data, colWidths=[155, 115, 80, 80, 90])
            stk_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5F5F5")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E0E0E0")),
            ]))
            elements.append(stk_table)

        elements.append(Spacer(1, 15))
        elements.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceBefore=0, spaceAfter=8))
        elements.append(Paragraph("© 2026 Meera Crackers World. Automated Admin Report System.", ParagraphStyle("F", parent=sub_style, fontSize=8)))

        doc.build(elements)
        return buffer.getvalue()

    @staticmethod
    def send_admin_report_email_sync(admin_emails: list, report_data: dict, requested_by_email: str) -> bool:
        """Generates PDF report attachment and sends email to all admin accounts."""
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.application import MIMEApplication
        from datetime import datetime

        smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
        smtp_port = settings.SMTP_PORT or 587
        smtp_user = settings.SMTP_USER
        smtp_pass = settings.SMTP_PASSWORD
        smtp_from = settings.SMTP_FROM or smtp_user or "noreply@meeracrackersworld.com"

        if not smtp_user or not smtp_pass:
            logger.warning(
                f"[SMTP NOT CONFIGURED] Cannot send admin report email. "
                f"Configure SMTP_USER and SMTP_PASSWORD in environment."
            )
            return False

        today_date = datetime.utcnow().strftime("%d %B %Y")
        subject = f"🔥 Daily Pyrotechnics Report - {today_date} | Meera Crackers"

        try:
            # 1. Generate PDF file bytes
            pdf_bytes = EmailService.generate_admin_report_pdf(report_data, today_date)

            # 2. Build email message container
            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = f"Meera Crackers World <{smtp_from}>"
            msg["To"] = ", ".join(admin_emails)

            # 3. Create HTML body text
            html_body = f"""
            <!DOCTYPE html>
            <html>
              <head><meta charset="utf-8"></head>
              <body style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 20px; color: #333;">
                <table width="100%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background-color: #D32F2F; padding: 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">Meera Crackers World</h1>
                      <p style="color: #ffebee; margin: 5px 0 0 0; font-size: 13px;">Daily Sales & Stock Report — {today_date}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px;">
                      <p style="font-size: 14px; color: #555;">Hello Admin,</p>
                      <p style="font-size: 14px; color: #555;">The real-time sales & stock report has been generated. The <strong>PDF Report is attached to this email</strong>.</p>
                      
                      <div style="background-color: #FFF3E0; border-left: 4px solid #E65100; padding: 15px; border-radius: 6px; margin: 20px 0;">
                        <h3 style="margin: 0 0 10px 0; color: #D32F2F; font-size: 15px;">📊 Executive Summary</h3>
                        <p style="margin: 4px 0; font-size: 14px;">• <strong>Today's Revenue:</strong> ₹{report_data.get('today_revenue', 0):,.2f}</p>
                        <p style="margin: 4px 0; font-size: 14px;">• <strong>Today's Orders:</strong> {report_data.get('today_orders', 0)} Orders</p>
                        <p style="margin: 4px 0; font-size: 14px;">• <strong>Items Sold:</strong> {report_data.get('today_items_sold', 0)} Units</p>
                        <p style="margin: 4px 0; font-size: 14px;">• <strong>Warehouse Stock Left:</strong> {report_data.get('remaining_stock', 0)} Units</p>
                      </div>

                      <p style="font-size: 13px; color: #777;">📎 Please find the detailed PDF attachment <strong>Today_Sales_and_Stock_Report.pdf</strong> for complete itemized breakdown.</p>
                      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
                      <p style="font-size: 12px; color: #999; text-align: center;">Triggered By: {requested_by_email}<br/>&copy; 2026 Meera Crackers World</p>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
            """
            msg.attach(MIMEText(html_body, "html"))

            # 4. Attach PDF document
            pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
            pdf_attachment.add_header("Content-Disposition", "attachment", filename=f"Today_Sales_and_Stock_Report_{today_date.replace(' ', '_')}.pdf")
            msg.attach(pdf_attachment)

            # 5. Send Email via SMTP
            try:
                with smtplib.SMTP_SSL(smtp_host, 465, timeout=15) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, admin_emails, msg.as_string())
            except Exception as ssl_err:
                logger.warning(f"Admin report email SSL 465 failed ({ssl_err}), trying 587 STARTTLS...")
                with smtplib.SMTP(smtp_host, int(smtp_port), timeout=15) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, admin_emails, msg.as_string())

            logger.info(f"ADMIN REPORT EMAIL WITH PDF ATTACHMENT SENT TO: {admin_emails}")
            return True
        except Exception as e:
            logger.error(f"FAILED TO SEND ADMIN REPORT EMAIL: {str(e)}")
            return False

    @classmethod
    async def send_admin_report_email(cls, admin_emails: list, report_data: dict, requested_by_email: str) -> bool:
        return await asyncio.to_thread(cls.send_admin_report_email_sync, admin_emails, report_data, requested_by_email)

    @staticmethod
    def _format_order_email_items(items: list) -> tuple[str, str]:
        """Generates HTML table and plain text summary for ordered items."""
        if not items:
            return "", ""
        
        rows_html = []
        text_lines = []
        
        for item in items:
            name = "Item"
            qty = 1
            price = 0.0
            
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                prod, qty = item[0], item[1]
                if hasattr(prod, "name"):
                    name = prod.name
                elif isinstance(prod, dict):
                    name = prod.get("name", "Item")
                
                p_val = getattr(prod, "discount_price", None) or getattr(prod, "price", 0) if hasattr(prod, "price") else (prod.get("discount_price") or prod.get("price", 0) if isinstance(prod, dict) else 0)
                price = float(p_val or 0)
            elif isinstance(item, dict):
                name = item.get("name") or item.get("product_name") or "Item"
                qty = int(item.get("quantity") or 1)
                price = float(item.get("price") or item.get("unit_price") or 0)
            elif hasattr(item, "quantity"):
                qty = int(getattr(item, "quantity", 1))
                name = getattr(item, "product_name", None) or getattr(item, "name", "Item")
                price = float(getattr(item, "price", 0))
                
            line_total = price * qty
            rows_html.append(f"""
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; color: #333;">{name}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; color: #555; text-align: center;">{qty}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; color: #555; text-align: right;">₹{price:.2f}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; color: #333; font-weight: bold; text-align: right;">₹{line_total:.2f}</td>
            </tr>
            """)
            text_lines.append(f"• {name} x {qty} @ ₹{price:.2f} = ₹{line_total:.2f}")
            
        table_html = f"""
        <table width="100%" cellspacing="0" cellpadding="0" style="margin: 15px 0; border-collapse: collapse; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #f8f9fa; text-align: left;">
              <th style="padding: 10px; font-size: 12px; color: #666; font-weight: 600; border-bottom: 2px solid #eee;">Item Name</th>
              <th style="padding: 10px; font-size: 12px; color: #666; font-weight: 600; text-align: center; border-bottom: 2px solid #eee;">Qty</th>
              <th style="padding: 10px; font-size: 12px; color: #666; font-weight: 600; text-align: right; border-bottom: 2px solid #eee;">Price</th>
              <th style="padding: 10px; font-size: 12px; color: #666; font-weight: 600; text-align: right; border-bottom: 2px solid #eee;">Total</th>
            </tr>
          </thead>
          <tbody>
            {''.join(rows_html)}
          </tbody>
        </table>
        """
        return table_html, "\n".join(text_lines)

    @staticmethod
    def send_upi_payment_email_sync(
        to_email: str,
        customer_name: str,
        order_number: str,
        order_id: str,
        amount: str,
        upi_payee_name: str,
        qr_base64: str,
        items: list,
        shipping: float,
        tax: float,
        subtotal: float
    ) -> bool:
        smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
        smtp_port = settings.SMTP_PORT or 587
        smtp_user = settings.SMTP_USER
        smtp_pass = settings.SMTP_PASSWORD
        
        # FIX FOR GMAIL SPAM: When using Gmail SMTP, From MUST match SMTP_USER to pass SPF & DKIM checks
        if smtp_user and "gmail.com" in smtp_host.lower():
            smtp_from = smtp_user
        else:
            smtp_from = settings.SMTP_FROM or smtp_user or "noreply@meeracrackersworld.com"

        if not smtp_user or not smtp_pass:
            logger.warning(f"[SMTP NOT CONFIGURED] Cannot send UPI QR email to {to_email}.")
            return False

        subject = f"Order Confirmation & Payment — {order_number} — Meera Crackers"
        
        items_html, items_text = EmailService._format_order_email_items(items)
        shipping_str = "FREE" if shipping <= 0 else f"₹{shipping:.2f}"
        
        plain_text = f"""Hello {customer_name},

Thank you for placing your order with Meera Crackers!

ORDER DETAILS:
Order Number: {order_number}
Payment Method: UPI QR Payment
Payment Status: Pending Verification

ORDERED ITEMS:
{items_text if items_text else f'Total Amount: ₹{amount}'}

Subtotal: ₹{subtotal:.2f}
Shipping Fee: {shipping_str}
Total Amount to Pay: ₹{amount}

PAYMENT INSTRUCTIONS:
Please complete payment of exact amount ₹{amount} via UPI to: {upi_payee_name}

After completing payment, please keep your transaction reference / UTR number safe.
Our team will verify your payment and process your order promptly.

Thank you,
Meera Crackers
Sivakasi Pyrotechnics Store
"""

        html_body = f"""
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
              <tr>
                <td style="background-color: #D32F2F; padding: 24px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px; font-weight: 700;">MEERA CRACKERS</h1>
                  <p style="color: #ffebee; margin: 4px 0 0 0; font-size: 13px;">Sivakasi Pyrotechnics Store</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px;">
                  <p style="font-size: 15px; color: #333; margin-top: 0;">Hello <strong>{customer_name}</strong>,</p>
                  <p style="font-size: 14px; color: #555; line-height: 1.5;">Thank you for your order! Your order has been successfully created and is currently awaiting payment verification.</p>
                  
                  <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e9ecef;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 13px; color: #666;">Order Number:</td>
                        <td style="font-size: 14px; color: #D32F2F; font-weight: bold; text-align: right;">{order_number}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #666; padding-top: 6px;">Payment Method:</td>
                        <td style="font-size: 13px; color: #333; font-weight: 500; text-align: right; padding-top: 6px;">UPI QR Code</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #666; padding-top: 6px;">Payment Status:</td>
                        <td style="font-size: 13px; color: #E65100; font-weight: bold; text-align: right; padding-top: 6px;">Pending Verification</td>
                      </tr>
                    </table>
                  </div>

                  {"<h3 style='font-size: 15px; color: #222; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #f1f3f5; padding-bottom: 8px;'>ORDERED ITEMS</h3>" + items_html if items_html else ""}

                  <div style="background-color: #fafafa; border-radius: 8px; padding: 14px; margin: 15px 0;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 13px; color: #666;">Subtotal:</td>
                        <td style="font-size: 13px; color: #333; text-align: right;">₹{subtotal:.2f}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #666; padding-top: 4px;">Shipping Fee:</td>
                        <td style="font-size: 13px; color: #333; text-align: right; padding-top: 4px;">{shipping_str}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 15px; color: #222; font-weight: bold; padding-top: 10px; border-top: 1px solid #eee;">Total Amount to Pay:</td>
                        <td style="font-size: 18px; color: #D32F2F; font-weight: bold; text-align: right; padding-top: 10px; border-top: 1px solid #eee;">₹{amount}</td>
                      </tr>
                    </table>
                  </div>

                  <h3 style="font-size: 15px; color: #222; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #f1f3f5; padding-bottom: 8px;">SCAN & PAY VIA UPI</h3>
                  <p style="font-size: 13px; color: #555; margin-bottom: 15px;">Please scan the QR code below using GPay, PhonePe, Paytm, or any UPI application to complete payment:</p>
                  
                  <div style="background-color: #FFF3E0; border: 1px solid #FFE0B2; border-radius: 10px; padding: 20px; text-align: center; margin: 15px 0;">
                    <img src="cid:qrcode_img" alt="UPI QR Code" style="width: 200px; height: 200px; border-radius: 8px; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                    <p style="margin: 12px 0 4px 0; font-size: 16px; color: #D32F2F; font-weight: bold;">Amount: ₹{amount}</p>
                    <p style="margin: 0; font-size: 13px; color: #555;">Payee: <strong>{upi_payee_name}</strong></p>
                  </div>

                  <div style="background-color: #FFEBEE; border-left: 4px solid #D32F2F; padding: 12px; border-radius: 4px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 13px; color: #C62828; font-weight: bold;">IMPORTANT:</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #424242;">Please pay the exact amount ₹{amount} and keep your UTR / Reference Number safe for payment verification.</p>
                  </div>

                  <p style="font-size: 13px; color: #666; margin-top: 25px;">Thank you for shopping with us!<br/><strong>Meera Crackers Team</strong></p>
                  <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;" />
                  <p style="font-size: 11px; color: #aaa; text-align: center; margin: 0;">&copy; 2026 Meera Crackers World. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """

        try:
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            from email.mime.image import MIMEImage
            import base64

            msg = MIMEMultipart("related")
            msg["Subject"] = subject
            msg["From"] = f"Meera Crackers <{smtp_from}>"
            msg["To"] = to_email
            msg["Auto-Submitted"] = "auto-generated"

            msg_alternative = MIMEMultipart("alternative")
            msg.attach(msg_alternative)
            msg_alternative.attach(MIMEText(plain_text, "plain"))
            msg_alternative.attach(MIMEText(html_body, "html"))

            # Attach QR inline
            qr_bytes = base64.b64decode(qr_base64)
            img = MIMEImage(qr_bytes, name=f"payment-qr-{order_number}.png")
            img.add_header('Content-ID', '<qrcode_img>')
            img.add_header('Content-Disposition', 'inline', filename=f"payment-qr-{order_number}.png")
            msg.attach(img)

            with smtplib.SMTP_SSL(smtp_host, 465, timeout=15) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_from, [to_email], msg.as_string())

            logger.info(f"UPI QR email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send UPI QR email to {to_email}: {str(e)}")
            return False

    @classmethod
    async def send_upi_payment_email(cls, to_email: str, customer_name: str, order_number: str, order_id: str, amount: str, upi_payee_name: str, qr_base64: str, items: list, shipping: float, tax: float, subtotal: float) -> bool:
        """Sends UPI payment QR code email via Resend API (fastest) or fallback to SMTP."""
        if settings.RESEND_API_KEY:
            try:
                import httpx
                clean_api_key = settings.RESEND_API_KEY.strip().strip("'\"")
                resend_from = settings.RESEND_FROM or settings.SMTP_FROM or "onboarding@resend.dev"
                formatted_from = resend_from if "<" in resend_from else f"Meera Crackers <{resend_from}>"
                subject = f"Order Confirmation & Payment — {order_number} — Meera Crackers"

                items_html, items_text = EmailService._format_order_email_items(items)
                shipping_str = "FREE" if shipping <= 0 else f"₹{shipping:.2f}"

                plain_text = f"""Hello {customer_name},

Thank you for placing your order with Meera Crackers!

ORDER DETAILS:
Order Number: {order_number}
Payment Method: UPI QR Payment
Payment Status: Pending Verification

ORDERED ITEMS:
{items_text if items_text else f'Total Amount: ₹{amount}'}

Subtotal: ₹{subtotal:.2f}
Shipping Fee: {shipping_str}
Total Amount to Pay: ₹{amount}

PAYMENT INSTRUCTIONS:
Please complete payment of exact amount ₹{amount} via UPI to: {upi_payee_name}

After completing payment, please keep your transaction reference / UTR number safe.
Our team will verify your payment and process your order promptly.

Thank you,
Meera Crackers
Sivakasi Pyrotechnics Store
"""

                html_resend = f"""
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  </head>
                  <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
                      <tr>
                        <td style="background-color: #D32F2F; padding: 24px; text-align: center;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: 1px; font-weight: 700;">MEERA CRACKERS</h1>
                          <p style="color: #ffebee; margin: 4px 0 0 0; font-size: 13px;">Sivakasi Pyrotechnics Store</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 24px;">
                          <p style="font-size: 15px; color: #333; margin-top: 0;">Hello <strong>{customer_name}</strong>,</p>
                          <p style="font-size: 14px; color: #555; line-height: 1.5;">Thank you for your order! Your order has been successfully created and is currently awaiting payment verification.</p>
                          
                          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e9ecef;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="font-size: 13px; color: #666;">Order Number:</td>
                                <td style="font-size: 14px; color: #D32F2F; font-weight: bold; text-align: right;">{order_number}</td>
                              </tr>
                              <tr>
                                <td style="font-size: 13px; color: #666; padding-top: 6px;">Payment Method:</td>
                                <td style="font-size: 13px; color: #333; font-weight: 500; text-align: right; padding-top: 6px;">UPI QR Code</td>
                              </tr>
                              <tr>
                                <td style="font-size: 13px; color: #666; padding-top: 6px;">Payment Status:</td>
                                <td style="font-size: 13px; color: #E65100; font-weight: bold; text-align: right; padding-top: 6px;">Pending Verification</td>
                              </tr>
                            </table>
                          </div>

                          {"<h3 style='font-size: 15px; color: #222; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #f1f3f5; padding-bottom: 8px;'>ORDERED ITEMS</h3>" + items_html if items_html else ""}

                          <div style="background-color: #fafafa; border-radius: 8px; padding: 14px; margin: 15px 0;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="font-size: 13px; color: #666;">Subtotal:</td>
                                <td style="font-size: 13px; color: #333; text-align: right;">₹{subtotal:.2f}</td>
                              </tr>
                              <tr>
                                <td style="font-size: 13px; color: #666; padding-top: 4px;">Shipping Fee:</td>
                                <td style="font-size: 13px; color: #333; text-align: right; padding-top: 4px;">{shipping_str}</td>
                              </tr>
                              <tr>
                                <td style="font-size: 15px; color: #222; font-weight: bold; padding-top: 10px; border-top: 1px solid #eee;">Total Amount to Pay:</td>
                                <td style="font-size: 18px; color: #D32F2F; font-weight: bold; text-align: right; padding-top: 10px; border-top: 1px solid #eee;">₹{amount}</td>
                              </tr>
                            </table>
                          </div>

                          <h3 style="font-size: 15px; color: #222; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #f1f3f5; padding-bottom: 8px;">SCAN & PAY VIA UPI</h3>
                          <p style="font-size: 13px; color: #555; margin-bottom: 15px;">Please scan the QR code below using GPay, PhonePe, Paytm, or any UPI application to complete payment:</p>
                          
                          <div style="background-color: #FFF3E0; border: 1px solid #FFE0B2; border-radius: 10px; padding: 20px; text-align: center; margin: 15px 0;">
                            <img src="data:image/png;base64,{qr_base64}" alt="UPI QR Code" style="width: 200px; height: 200px; border-radius: 8px; border: 3px solid #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
                            <p style="margin: 12px 0 4px 0; font-size: 16px; color: #D32F2F; font-weight: bold;">Amount: ₹{amount}</p>
                            <p style="margin: 0; font-size: 13px; color: #555;">Payee: <strong>{upi_payee_name}</strong></p>
                          </div>

                          <div style="background-color: #FFEBEE; border-left: 4px solid #D32F2F; padding: 12px; border-radius: 4px; margin: 20px 0;">
                            <p style="margin: 0; font-size: 13px; color: #C62828; font-weight: bold;">IMPORTANT:</p>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #424242;">Please pay the exact amount ₹{amount} and keep your UTR / Reference Number safe for payment verification.</p>
                          </div>

                          <p style="font-size: 13px; color: #666; margin-top: 25px;">Thank you for shopping with us!<br/><strong>Meera Crackers Team</strong></p>
                          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 25px 0;" />
                          <p style="font-size: 11px; color: #aaa; text-align: center; margin: 0;">&copy; 2026 Meera Crackers World. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """

                async with httpx.AsyncClient(timeout=8.0) as client:
                    res = await client.post(
                        "https://api.resend.com/emails",
                        headers={
                            "Authorization": f"Bearer {clean_api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "from": formatted_from,
                            "to": [to_email],
                            "subject": subject,
                            "html": html_resend,
                            "text": plain_text,
                            "attachments": [
                                {
                                    "content": qr_base64,
                                    "filename": f"payment-qr-{order_number}.png",
                                }
                            ]
                        },
                    )
                    if res.status_code in (200, 201, 202):
                        logger.info(f"UPI QR email sent via Resend API to {to_email}")
                        return True
                    else:
                        logger.warning(f"Resend API error sending QR ({res.status_code}): {res.text}")
                        if resend_from != "onboarding@resend.dev" and res.status_code in (400, 403, 422):
                            logger.info("Retrying UPI QR email via Resend onboarding domain...")
                            fallback_res = await client.post(
                                "https://api.resend.com/emails",
                                headers={
                                    "Authorization": f"Bearer {clean_api_key}",
                                    "Content-Type": "application/json",
                                },
                                json={
                                    "from": "Meera Crackers <onboarding@resend.dev>",
                                    "to": [to_email],
                                    "subject": subject,
                                    "html": html_resend,
                                    "text": plain_text,
                                },
                            )
                            if fallback_res.status_code in (200, 201, 202):
                                logger.info(f"UPI QR email sent via Resend API (onboarding fallback) to {to_email}")
                                return True
            except Exception as e:
                logger.error(f"Resend API exception for UPI QR email {to_email}: {e}")

        # Fallback to SMTP thread
        return await asyncio.to_thread(
            cls.send_upi_payment_email_sync,
            to_email, customer_name, order_number, order_id, amount, upi_payee_name, qr_base64, items, shipping, tax, subtotal
        )
