import asyncio
from app.services.email_service import EmailService

async def main():
    res = await EmailService.send_otp_email("itachiuchika77712@gmail.com", "123456")
    print("Result:", res)

asyncio.run(main())
