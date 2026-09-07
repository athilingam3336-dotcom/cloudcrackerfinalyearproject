from datetime import datetime
from typing import Any, Dict, List, Optional
from beanie import PydanticObjectId

from app.models.review import Review


class ReviewRepository:
    async def create(self, review_data: Dict[str, Any]) -> Review:
        """Insert a new Review document."""
        review = Review(**review_data)
        await review.insert()
        return review

    async def get_by_id(self, review_id: str) -> Optional[Review]:
        """Fetch review by ID, ignoring deleted ones."""
        try:
            rid = PydanticObjectId(review_id)
        except Exception:
            return None
        review = await Review.get(rid)
        if review and review.status != "DELETED":
            return review
        return None

    async def get_by_user_and_product(self, user_id: str, product_id: str) -> Optional[Review]:
        """Finds any active or hidden review written by a specific user for a product."""
        try:
            uid = PydanticObjectId(user_id)
            pid = PydanticObjectId(product_id)
        except Exception:
            return None
        return await Review.find_one(
            Review.user_id == uid,
            Review.product_id == pid,
            Review.status != "DELETED",
        )

    async def update(self, review: Review, update_data: Dict[str, Any]) -> Review:
        """Update review fields and save changes."""
        for key, value in update_data.items():
            setattr(review, key, value)
        review.updated_at = datetime.utcnow()
        await review.save()
        return review

    async def delete(self, review: Review) -> Review:
        """Soft delete review."""
        review.status = "DELETED"
        review.updated_at = datetime.utcnow()
        await review.save()
        return review

    async def list_reviews_by_product(
        self, product_id: str, skip: int = 0, limit: int = 10, sort_by: str = "newest"
    ) -> List[Review]:
        """List active reviews for a product with pagination and sorting options."""
        try:
            pid = PydanticObjectId(product_id)
        except Exception:
            return []

        query = Review.find(Review.product_id == pid, Review.status == "ACTIVE")

        # Handle sorting
        if sort_by == "highest_rating":
            query = query.sort(-Review.rating)
        elif sort_by == "lowest_rating":
            query = query.sort(Review.rating)
        elif sort_by == "most_liked":
            query = query.sort(-Review.likes)
        else:  # "newest"
            query = query.sort(-Review.created_at)

        return await query.skip(skip).limit(limit).to_list()

    async def list_reviews_by_user(
        self, user_id: str, skip: int = 0, limit: int = 10
    ) -> List[Review]:
        """List active reviews written by a user."""
        try:
            uid = PydanticObjectId(user_id)
        except Exception:
            return []
        return await Review.find(
            Review.user_id == uid, Review.status == "ACTIVE"
        ).sort(-Review.created_at).skip(skip).limit(limit).to_list()

    async def list_all_reviews_admin(
        self, status_filter: Optional[str] = None, skip: int = 0, limit: int = 20
    ) -> List[Review]:
        """Administrative review list filtering on status (ACTIVE/HIDDEN/DELETED)."""
        if status_filter:
            query = Review.find(Review.status == status_filter)
        else:
            query = Review.find(Review.status != "DELETED")
        return await query.sort(-Review.created_at).skip(skip).limit(limit).to_list()

    async def get_rating_statistics(self, product_id: str) -> Dict[str, Any]:
        """Calculates rating aggregates, counts, breakdowns, and verified purchase ratios in a single MongoDB aggregate query."""
        try:
            pid = PydanticObjectId(product_id)
        except Exception:
            return {
                "average_rating": 0.0,
                "total_reviews": 0,
                "rating_breakdown": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0},
                "verified_purchase_percentage": 0.0,
            }

        pipeline = [
            {"$match": {"product_id": pid, "status": "ACTIVE"}},
            {
                "$facet": {
                    "stats": [
                        {
                            "$group": {
                                "_id": None,
                                "average_rating": {"$avg": "$rating"},
                                "total_reviews": {"$sum": 1},
                                "verified_purchases": {
                                    "$sum": {"$cond": ["$is_verified_purchase", 1, 0]}
                                },
                            }
                        }
                    ],
                    "breakdown": [{"$group": {"_id": "$rating", "count": {"$sum": 1}}}],
                }
            },
        ]

        results = await Review.get_pymongo_collection().aggregate(pipeline).to_list(length=None)

        average_rating = 0.0
        total_reviews = 0
        verified_purchases = 0
        rating_breakdown = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}

        if results and results[0].get("stats"):
            stats = results[0]["stats"][0]
            total_reviews = stats.get("total_reviews", 0)
            average_rating = round(stats.get("average_rating", 0.0), 1)
            verified_purchases = stats.get("verified_purchases", 0)

        if results and results[0].get("breakdown"):
            for entry in results[0]["breakdown"]:
                rating_breakdown[str(entry["_id"])] = entry["count"]

        verified_purchase_percentage = 0.0
        if total_reviews > 0:
            verified_purchase_percentage = round(
                (verified_purchases / total_reviews) * 100.0, 1
            )

        return {
            "average_rating": average_rating,
            "total_reviews": total_reviews,
            "rating_breakdown": rating_breakdown,
            "verified_purchase_percentage": verified_purchase_percentage,
        }
