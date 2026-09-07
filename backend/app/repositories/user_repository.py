from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from beanie import PydanticObjectId

from app.models.user import User


class UserRepository:
    async def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by their email address (case-insensitive)."""
        import re
        clean_email = email.strip()
        escaped = re.escape(clean_email)
        return await User.find_one({"email": {"$regex": f"^{escaped}$", "$options": "i"}})

    async def get_by_phone(self, phone: str) -> Optional[User]:
        """Fetch a user by their phone number."""
        return await User.find_one(User.phone == phone)

    async def get_by_id(self, user_id: str) -> Optional[User]:
        """Fetch a user by their unique database ID."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return None
        return await User.get(uid)

    async def create(self, user_data: Dict[str, Any]) -> User:
        """Create and insert a new user document."""
        user = User(**user_data)
        await user.insert()
        return user

    async def update(self, user: User, update_data: Dict[str, Any]) -> User:
        """Update fields of an existing user document."""
        for key, value in update_data.items():
            setattr(user, key, value)
        user.updated_at = datetime.utcnow()
        await user.save()
        return user

    async def count_active_admins(self) -> int:
        """Counts how many active and unblocked ADMIN accounts exist in the database."""
        return await User.find(
            User.role == "ADMIN",
            User.is_active == True,
            User.status != "deleted",
            User.status != "blocked",
        ).count()

    async def list_users_admin(
        self,
        search: Optional[str] = None,
        role: Optional[str] = None,
        account_status: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
        skip: int = 0,
        limit: int = 10,
    ) -> Tuple[List[User], int, Dict[str, int]]:
        """Fetch paginated users for admin with search, filters, sorting, and aggregate summary metrics."""
        # 1. Calculate live summary metrics across all users
        all_users = await User.find(User.status != "deleted").to_list()

        total_users = len(all_users)
        active_users = sum(1 for u in all_users if u.is_active and u.status == "active")
        inactive_users = sum(1 for u in all_users if not u.is_active or u.status == "inactive")
        blocked_users = sum(1 for u in all_users if u.status == "blocked")
        customer_count = sum(1 for u in all_users if u.role == "CUSTOMER")
        admin_count = sum(1 for u in all_users if u.role == "ADMIN")

        metrics = {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": inactive_users,
            "blocked_users": blocked_users,
            "customer_count": customer_count,
            "admin_count": admin_count,
        }

        # 2. Build filter conditions
        query_conditions = [User.status != "deleted"]

        if role and role.upper() != "ALL":
            target_role = role.strip().upper()
            query_conditions.append({"$or": [{"role": target_role}, {"role": target_role.lower()}]})

        if account_status and account_status.lower() != "all":
            st = account_status.lower()
            if st == "active":
                query_conditions.append(User.status == "active")
                query_conditions.append(User.is_active == True)
            elif st == "inactive":
                query_conditions.append({"$or": [{"status": "inactive"}, {"is_active": False}]})
            elif st == "blocked":
                query_conditions.append(User.status == "blocked")

        if search and search.strip():
            s = search.strip()
            query_conditions.append(
                {
                    "$or": [
                        {"full_name": {"$regex": s, "$options": "i"}},
                        {"email": {"$regex": s, "$options": "i"}},
                        {"phone": {"$regex": s, "$options": "i"}},
                    ]
                }
            )

        from beanie.operators import And
        find_query = User.find(And(*query_conditions)) if query_conditions else User.find()

        total = await find_query.count()

        # Sorting
        sort_field = User.created_at
        if sort_by == "full_name":
            sort_field = User.full_name
        elif sort_by == "email":
            sort_field = User.email
        elif sort_by == "role":
            sort_field = User.role
        elif sort_by == "status":
            sort_field = User.status

        sort_expr = -sort_field if sort_order.lower() == "desc" else +sort_field

        users = await find_query.sort(sort_expr).skip(skip).limit(limit).to_list()
        return users, total, metrics
