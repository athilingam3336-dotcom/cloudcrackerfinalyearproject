from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.auth.auth import router as auth_router
from app.api.v1.categories.categories import router as categories_router
from app.api.v1.products.products import router as products_router
from app.api.v1.cart.cart import router as cart_router
from app.api.v1.wishlist.wishlist import router as wishlist_router
from app.api.v1.orders.orders import router as orders_router, admin_router as admin_orders_router
from app.api.v1.payment.payment import router as payment_router, payments_router
from app.api.v1.address.address import router as address_router
from app.api.v1.coupons.coupons import router as coupons_router
from app.api.v1.inventory.inventory import router as inventory_router
from app.api.v1.admin.dashboard import router as dashboard_router
from app.api.v1.admin.users import router as admin_users_router
from app.api.v1.admin.reports import router as reports_router
from app.api.v1.reviews.reviews import router as reviews_router, admin_router as admin_reviews_router
from app.api.v1.upload.upload import router as upload_router
from app.api.v1.notifications.notifications import router as notifications_router, admin_router as admin_notifications_router
from app.api.v1.audit_logs.audit_logs import router as audit_logs_router
from app.api.v1.tokens.tokens import router as tokens_router, admin_router as admin_tokens_router
from app.api.v1.about.about import router as about_router

api_v1_router = APIRouter()

api_v1_router.include_router(health_router, tags=["Health"])
api_v1_router.include_router(auth_router)
api_v1_router.include_router(categories_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(cart_router)
api_v1_router.include_router(wishlist_router)
api_v1_router.include_router(orders_router)
api_v1_router.include_router(admin_orders_router)
api_v1_router.include_router(payment_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(address_router)
api_v1_router.include_router(coupons_router)
api_v1_router.include_router(inventory_router)
api_v1_router.include_router(dashboard_router)
api_v1_router.include_router(admin_users_router)
api_v1_router.include_router(reports_router)
api_v1_router.include_router(reviews_router)
api_v1_router.include_router(admin_reviews_router)
api_v1_router.include_router(upload_router)
api_v1_router.include_router(notifications_router)
api_v1_router.include_router(admin_notifications_router)
api_v1_router.include_router(audit_logs_router)
api_v1_router.include_router(tokens_router)
api_v1_router.include_router(admin_tokens_router)
api_v1_router.include_router(about_router)
