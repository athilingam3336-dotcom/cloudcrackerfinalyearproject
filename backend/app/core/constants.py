class UserRoles:
    ADMIN = "ADMIN"
    CUSTOMER = "CUSTOMER"
    ALL = [ADMIN, CUSTOMER]


class Collections:
    USERS = "Users"
    CATEGORIES = "Categories"
    PRODUCTS = "Products"
    WISHLIST = "Wishlist"
    CART = "Cart"
    ORDERS = "Orders"
    ORDER_ITEMS = "OrderItems"
    PAYMENTS = "Payments"
    NOTIFICATIONS = "Notifications"
    AUDIT_LOGS = "AuditLogs"
    REFRESH_TOKENS = "RefreshTokens"
    ADDRESSES = "Addresses"
    COUPONS = "Coupons"
    INVENTORY = "Inventory"
    REVIEWS = "Reviews"
    IMAGES = "Images"
    ABOUT = "About"


class ResponseMessages:
    HEALTH_OK = "Application health is optimal."
    SUCCESS = "Operation completed successfully."
    UNAUTHORIZED = "Unauthorized access."
    FORBIDDEN = "Permission denied."
    NOT_FOUND = "Requested resource not found."
    VALIDATION_ERROR = "Validation failed for the request data."
    SERVER_ERROR = "An unexpected error occurred. Please try again later."
