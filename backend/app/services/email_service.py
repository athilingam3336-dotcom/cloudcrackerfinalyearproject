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

            # Try SSL (Port 465) first for instant connection on cloud servers, then fallback to 587 STARTTLS
            sent = False
            try:
                with smtplib.SMTP_SSL(smtp_host, 465, timeout=8) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, [to_email], msg.as_string())
                sent = True
            except Exception as ssl_err:
                logger.warning(f"SMTP SSL Port 465 failed ({ssl_err}), trying Port {smtp_port} STARTTLS...")
                with smtplib.SMTP(smtp_host, int(smtp_port), timeout=8) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, [to_email], msg.as_string())
                sent = True

            logger.info(f"REAL OTP EMAIL SENT SUCCESSFULLY TO {to_email}")
            return True
        except Exception as e:
            logger.error(f"FAILED TO SEND REAL SMTP EMAIL TO {to_email}: {str(e)}")
            return False

    @classmethod
    async def send_otp_email(cls, to_email: str, otp_code: str) -> bool:
        return await asyncio.to_thread(cls.send_otp_email_sync, to_email, otp_code)

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
                with smtplib.SMTP_SSL(smtp_host, 465, timeout=10) as server:
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(smtp_from, admin_emails, msg.as_string())
            except Exception as ssl_err:
                logger.warning(f"Admin report email SSL 465 failed ({ssl_err}), trying 587 STARTTLS...")
                with smtplib.SMTP(smtp_host, int(smtp_port), timeout=10) as server:
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
