# 🎆 Cloud Crackers

An app and website for a crackers shop. Customers can browse and buy crackers. The shop owner can manage stock, check payments and see sales reports.

**[Live Demo](https://cloudcrackerfinalyearproject-1.onrender.com)** · **[API Docs](https://cloudcrackerfinalyearproject-1.onrender.com/docs)** · **[Download Android APK](https://expo.dev/artifacts/eas/8tzkaYqWxkZckAKj1a8Nx7FgUbqe247eDIvYaohop_c.apk)**

> The server runs on a free plan, so the first load can take 30 to 50 seconds. The demo uses sample data.

---

## Screenshots

| Home | Cart | Admin Dashboard |
| :---: | :---: | :---: |
| *add `screenshots/home.png`* | *add `screenshots/cart.png`* | *add `screenshots/admin.png`* |

---

## What it does

**For customers**
- Browse crackers with images, add to wishlist and cart
- Chatbot for quick help
- Pay with a UPI QR code, then enter the payment reference (UTR)
- Get a Diwali discount coupon by email after the first order

**For the shop owner (admin)**
- Add and edit products, and track stock
- See top 5 products and which areas sell the most
- Get a sales report by email every day at 12 AM
- Approve payments by checking the UTR
- Add or remove other admins, only after an email OTP check

---

## Smart features (data mining used for admin)

| Algorithm | What it is used for |
| :--- | :--- |
| Apriori | Shows "frequently bought together" products |
| K-Means | Groups customers by buying habits |
| IQR | Flags very large orders so the admin can check them first |
| Linear Regression | Predicts sales going into the Diwali season |

---

## Why UPI QR and UTR?

Payment gateways like Razorpay do not allow crackers shops. So I built my own flow:

1. The customer scans the shop's UPI QR and pays.
2. The customer enters the UTR number from their payment app.
3. The admin checks the UTR against the bank and confirms the order.

---

## Tech stack

- **App:** React Native (Expo), also runs on web
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Others:** JWT login, Email OTP, Cloudinary (images), Gemini API (chatbot)
- **DevOps:** Docker, GitHub Actions (CI/CD), Render (hosting)

How it fits together: `App → FastAPI → MongoDB` (plus Cloudinary, Gemini and Email)

---

## Run it on your computer

You need Python 3.11+, Node.js 18+ and MongoDB.

```bash
git clone https://github.com/athilingam3336-dotcom/cloudcrackerfinalyearproject.git
cd cloudcrackerfinalyearproject
```

**Backend**
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # fill in your own keys
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env
npx expo start                 # press "w" for web
```

Or with Docker: `docker compose up --build`

---

## Author

**M. Athi Lingam**
[LinkedIn](https://www.linkedin.com/in/athi-lingam-8abaa53a9) · [GitHub](https://github.com/athilingam3336-dotcom) · athilingam3336@gmail.com
