from typing import List, Optional
from beanie import PydanticObjectId

from app.exceptions import BaseAppException, NotFoundException, ValidationException
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.review import Review
from app.repositories.product_repository import ProductRepository
from app.repositories.review_repository import ReviewRepository
from app.schemas.review import (
    CreateReviewRequest,
    RatingStatisticsResponse,
    UpdateReviewRequest,
)


class ReviewService:
    def __init__(self) -> None:
        self.review_repo = ReviewRepository()
        self.product_repo = ProductRepository()

    async def create_review(self, user_id: str, data: CreateReviewRequest) -> Review:
        """Customers can write exactly one review for products they have purchased and completed."""
        product = await self.product_repo.get_by_id(data.product_id)
        if not product or product.status == "deleted":
            raise NotFoundException(message="Product not found.")

        # 1. Verify purchase
        orders = await Order.find(
            Order.user_id == PydanticObjectId(user_id),
            {"order_status": {"$in": ["Paid", "Confirmed", "Shipped", "Delivered"]}},
        ).to_list()

        if not orders:
            raise ValidationException(
                message="You can only review products that you have purchased."
            )

        order_ids = [o.id for o in orders]

        purchased = await OrderItem.find_one(
            OrderItem.product_id == PydanticObjectId(data.product_id),
            {"order_id": {"$in": order_ids}},
        )

        if not purchased:
            raise ValidationException(
                message="You can only review products that you have purchased."
            )

        # 2. Check for duplicate review
        existing = await self.review_repo.get_by_user_and_product(user_id, data.product_id)
        if existing:
            raise ValidationException(
                message="You have already submitted a review for this product."
            )

        # 3. Create review record
        review_data = {
            "user_id": PydanticObjectId(user_id),
            "product_id": PydanticObjectId(data.product_id),
            "order_id": purchased.order_id,
            "rating": data.rating,
            "title": data.title,
            "review": data.review,
            "images": data.images,
            "is_verified_purchase": True,
            "status": "ACTIVE",
            "likes": 0,
        }

        review = await self.review_repo.create(review_data)

        # 4. Synchronize aggregate statistics on product document
        await self.sync_product_ratings(data.product_id)

        return review

    async def update_review(
        self, user_id: str, review_id: str, data: UpdateReviewRequest
    ) -> Review:
        """Customer updates their review description or rating."""
        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise NotFoundException(message="Review not found.")

        if str(review.user_id) != user_id:
            raise BaseAppException(
                status_code=403,
                message="You do not have permission to update this review.",
            )

        update_dict = data.model_dump(exclude_unset=True)
        updated = await self.review_repo.update(review, update_dict)

        # Synchronize updates on product
        await self.sync_product_ratings(str(review.product_id))

        return updated

    async def delete_review(self, user_id: str, review_id: str) -> Review:
        """Customer soft deletes their review."""
        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise NotFoundException(message="Review not found.")

        if str(review.user_id) != user_id:
            raise BaseAppException(
                status_code=403,
                message="You do not have permission to delete this review.",
            )

        deleted = await self.review_repo.delete(review)

        # Synchronize updates on product
        await self.sync_product_ratings(str(review.product_id))

        return deleted

    async def hide_review(self, review_id: str) -> Review:
        """Admin hides a review from display (status = HIDDEN)."""
        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise NotFoundException(message="Review not found.")

        hidden = await self.review_repo.update(review, {"status": "HIDDEN"})

        # Synchronize updates on product
        await self.sync_product_ratings(str(review.product_id))

        return hidden

    async def restore_review(self, review_id: str) -> Review:
        """Admin restores a hidden review (status = ACTIVE)."""
        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise NotFoundException(message="Review not found.")

        restored = await self.review_repo.update(review, {"status": "ACTIVE"})

        # Synchronize updates on product
        await self.sync_product_ratings(str(review.product_id))

        return restored

    async def delete_review_admin(self, review_id: str) -> Review:
        """Admin soft deletes a review."""
        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise NotFoundException(message="Review not found.")

        deleted = await self.review_repo.delete(review)

        # Synchronize updates on product
        await self.sync_product_ratings(str(review.product_id))

        return deleted

    async def get_review_details(self, review_id: str) -> Review:
        """Get details for a single review."""
        review = await self.review_repo.get_by_id(review_id)
        if not review:
            raise NotFoundException(message="Review not found.")
        return review

    async def get_product_reviews(
        self, product_id: str, skip: int = 0, limit: int = 10, sort_by: str = "newest"
    ) -> List[Review]:
        """Fetch all active reviews for a product."""
        return await self.review_repo.list_reviews_by_product(
            product_id, skip=skip, limit=limit, sort_by=sort_by
        )

    async def get_user_reviews(
        self, user_id: str, skip: int = 0, limit: int = 10
    ) -> List[Review]:
        """Fetch all active reviews written by a specific user."""
        return await self.review_repo.list_reviews_by_user(user_id, skip=skip, limit=limit)

    async def get_all_reviews_admin(
        self, status_filter: Optional[str] = None, skip: int = 0, limit: int = 20
    ) -> List[Review]:
        """Administrative review lists."""
        return await self.review_repo.list_all_reviews_admin(
            status_filter=status_filter, skip=skip, limit=limit
        )

    async def get_product_rating_stats(self, product_id: str) -> RatingStatisticsResponse:
        """Retrieve aggregated rating statistics for a product."""
        stats = await self.review_repo.get_rating_statistics(product_id)
        return RatingStatisticsResponse(**stats)

    async def sync_product_ratings(self, product_id: str) -> None:
        """Recalculates active reviews statistics and syncs back to the Product document."""
        stats = await self.review_repo.get_rating_statistics(product_id)
        product = await self.product_repo.get_by_id(product_id)
        if product:
            update_data = {
                "average_rating": stats["average_rating"],
                "total_reviews": stats["total_reviews"],
                "rating_breakdown": stats["rating_breakdown"],
                "rating": stats["average_rating"],
                "reviews_count": stats["total_reviews"],
            }
            await self.product_repo.update(product, update_data)
