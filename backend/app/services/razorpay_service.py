import hashlib
import hmac
import logging
from typing import Any, Dict, Optional

import razorpay

from app.core.config import settings
from app.exceptions import BaseAppException, ValidationException

logger = logging.getLogger(__name__)


class RazorpayService:
    """Service for interacting with Razorpay Payment Gateway (Test Mode)."""

    def __init__(self) -> None:
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET

    def _get_client(self) -> razorpay.Client:
        """Initializes and returns the Razorpay Client."""
        if not self.key_id or not self.key_secret:
            raise BaseAppException(
                status_code=500,
                message="Razorpay credentials are not configured on the server.",
            )
        client = razorpay.Client(auth=(self.key_id, self.key_secret))
        return client

    def create_razorpay_order(
        self,
        amount: float,
        currency: str = "INR",
        receipt: Optional[str] = None,
        notes: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Creates a Razorpay Order.
        Amount must be converted to the smallest currency unit (paise for INR).
        """
        if amount <= 0:
            raise ValidationException(message="Order amount must be greater than 0.")

        client = self._get_client()
        amount_paise = int(round(amount * 100))

        order_payload: Dict[str, Any] = {
            "amount": amount_paise,
            "currency": currency,
            "payment_capture": 1,  # Auto-capture payment upon authorization
        }
        if receipt:
            order_payload["receipt"] = receipt
        if notes:
            order_payload["notes"] = notes

        try:
            razorpay_order = client.order.create(data=order_payload)
            return razorpay_order
        except Exception as e:
            logger.error("Razorpay order creation failed: %s", str(e))
            raise BaseAppException(
                status_code=502,
                message=f"Failed to create Razorpay payment order: {str(e)}",
            )

    def verify_payment_signature(
        self,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> bool:
        """
        Verifies the payment signature using HMAC SHA256.
        Formula: HMAC-SHA256(order_id + "|" + payment_id, secret) == signature
        """
        if not self.key_secret:
            raise BaseAppException(
                status_code=500,
                message="Razorpay secret key is not configured.",
            )
        if not razorpay_order_id or not razorpay_payment_id or not razorpay_signature:
            return False

        message = f"{razorpay_order_id}|{razorpay_payment_id}".encode("utf-8")
        secret = self.key_secret.encode("utf-8")
        generated_signature = hmac.new(secret, message, hashlib.sha256).hexdigest()

        return hmac.compare_digest(generated_signature, razorpay_signature)

    def verify_webhook_signature(
        self,
        body: bytes,
        signature: str,
    ) -> bool:
        """Verifies Razorpay webhook payload signature."""
        secret_to_use = self.webhook_secret or self.key_secret
        if not secret_to_use:
            raise BaseAppException(
                status_code=500,
                message="Razorpay webhook secret is not configured.",
            )
        if not body or not signature:
            return False

        generated_signature = hmac.new(
            secret_to_use.encode("utf-8"), body, hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(generated_signature, signature)
