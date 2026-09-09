import asyncio
import httpx
from bson import ObjectId

BASE_URL = "http://localhost:8000/api/v1"

async def test_e2e_upi_flow():
    async with httpx.AsyncClient(timeout=30.0) as client:
        print("2. Logging in as admin (acting as customer)...")
        email = "admin@cloudcrackers.com"
        password = "admin"
        res = await client.post(f"{BASE_URL}/auth/login", data={
            "username": email,
            "password": password
        })
        token = res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        print("3. Creating an order with UPI payment method...")
        res = await client.get(f"{BASE_URL}/product/list?limit=1")
        products = res.json()["data"]["products"]
        if not products:
            print("No products found to order.")
            return
        product_id = products[0]["id"]
        initial_stock = products[0]["stock"]
        print(f"Initial stock for product {product_id}: {initial_stock}")
        
        # Add to cart
        await client.post(f"{BASE_URL}/cart/add", json={"product_id": product_id, "quantity": 1}, headers=headers)
        
        # Checkout (which should generate UPI QR and send email)
        res = await client.post(f"{BASE_URL}/order/checkout", json={
            "shipping_address": "123 Test St",
            "payment_method": "upi",
            "delivery_method": "standard"
        }, headers=headers)
        
        if res.status_code != 200:
            print(f"Checkout failed: {res.text}")
            return
            
        checkout_data = res.json()["data"]
        order_id = checkout_data["order"]["id"]
        payment_data = checkout_data["payment"]
        
        print(f"Order created! ID: {order_id}")
        print(f"Payment Status: {payment_data.get('payment_status')}")
        print(f"QR generated? {'Yes' if checkout_data.get('qr_code_base64') else 'No'}")
        
        # Check stock immediately after creation (should NOT be deducted)
        res = await client.get(f"{BASE_URL}/product/{product_id}")
        current_stock = res.json()["data"]["stock"]
        print(f"Stock after order creation (Expected {initial_stock}): {current_stock}")
        if current_stock != initial_stock:
            print("ERROR: Stock was deducted prematurely!")
        else:
            print("SUCCESS: Stock was NOT deducted.")
            
        print("4. Customer submits UTR...")
        res = await client.post(f"{BASE_URL}/payment/upi/submit-reference/{order_id}", json={
            "transaction_reference": "UTR123456789"
        }, headers=headers)
        print(f"Submit UTR status: {res.status_code}")
        
        print("5. Customer polls status...")
        res = await client.get(f"{BASE_URL}/payment/upi/status/{order_id}", headers=headers)
        print(f"Current Status: {res.json()['data']['payment_status']}")
        
        print("6. Admin logs in...")
        admin_email = "admin@cloudcrackers.com"
        admin_password = "admin" # assumption, usually set in DB seed
        res = await client.post(f"{BASE_URL}/auth/login", data={
            "username": admin_email,
            "password": admin_password
        })
        if res.status_code == 200:
            admin_token = res.json()["access_token"]
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            
            print("7. Admin verifies the payment...")
            res = await client.post(f"{BASE_URL}/payment/admin/upi/verify/order/{order_id}", json={
                "transaction_reference": "UTR123456789"
            }, headers=admin_headers)
            print(f"Admin verify status: {res.status_code}")
            
            # Check stock after verification
            res = await client.get(f"{BASE_URL}/product/{product_id}")
            final_stock = res.json()["data"]["stock"]
            print(f"Stock after admin verify (Expected {initial_stock - 1}): {final_stock}")
            
            if final_stock == initial_stock - 1:
                print("SUCCESS: Stock was deducted EXACTLY ONCE upon verification.")
            else:
                print("ERROR: Stock deduction mismatch.")
                
            # Verify Idempotency
            print("8. Admin tries to verify again (Idempotency check)...")
            res = await client.post(f"{BASE_URL}/payment/admin/upi/verify/order/{order_id}", json={
                "transaction_reference": "UTR123456789"
            }, headers=admin_headers)
            print(f"Repeat verify status (Expected 400): {res.status_code}")
            print(res.text)
            
            res = await client.get(f"{BASE_URL}/product/{product_id}")
            idempotent_stock = res.json()["data"]["stock"]
            print(f"Stock after repeat verify (Expected {initial_stock - 1}): {idempotent_stock}")
            
        else:
            print("Could not login as admin. Skipping admin verification steps.")
            print(res.text)

if __name__ == "__main__":
    asyncio.run(test_e2e_upi_flow())
