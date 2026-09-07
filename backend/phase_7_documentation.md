# CloudCrackers Backend - Phase 7 Documentation

This document explains the architectures, entity associations, database schemas, and calculation pipelines implemented in **Phase 7: Review & Rating Module**.

---

## 1. Folder Structure

The newly created files are structured as follows:

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── reviews/
│   │           └── reviews.py (CRUD Reviews public/admin APIs)
│   ├── models/
│   │   └── review.py (Review Beanie Document with indexed constraints)
│   ├── repositories/
│   │   └── review_repository.py
│   ├── schemas/
│   │   └── review.py (Pydantic models)
│   └── services/
│       └── review_service.py (Order purchase checking & ratings sync)
└── tests/
    └── test_review.py
```

---

## 2. Collection & ER Diagram (Mermaid)

Below is the database relationship diagram mapping the new collections `Reviews` alongside existing collections:

```mermaid
erDiagram
    Users ||--o{ Reviews : "writes"
    Products ||--o{ Reviews : "receives"
    Orders ||--o{ Reviews : "verifies"

    Reviews {
        ObjectId id PK
        ObjectId user_id FK
        ObjectId product_id FK
        ObjectId order_id FK
        int rating
        string title
        string review
        list images
        boolean is_verified_purchase
        string status
        int likes
        date created_at
        date updated_at
    }
```

---

## 3. Sequence Diagrams

### 3.1 Reviews Submission Flow
Verified purchase constraint check, duplicate checking, and auto-updating aggregates:

```mermaid
sequenceDiagram
    autonumber
    Customer->>Route: POST /reviews
    Route->>Service: create_review(user_id, create_payload)
    Note over Service: Fetch user's orders containing product
    Service->>DB: Query paid/confirmed orders
    DB-->>Service: Return order items details
    alt Not purchased
        Service-->>Route: Raise ValidationException (422)
    end
    Note over Service: Check duplicate review (User + Product)
    Service->>DB: Query existing active reviews
    DB-->>Service: Review record (if exists)
    alt Review already exists
        Service-->>Route: Raise ValidationException (422)
    end
    Service->>Repo: create(review_data)
    Repo->>DB: Insert Review document
    DB-->>Repo: Acknowledged
    Service->>Repo: sync_product_ratings(product_id)
    Repo->>DB: Aggregate active reviews metrics (Avg, Count, Breakdown)
    DB-->>Repo: Metrics aggregated
    Repo->>DB: Update Product collection with calculated metrics
    DB-->>Repo: Acknowledged
    Service-->>Route: Return saved ReviewResponse
    Route-->>Customer: ApiResponse
```

### 3.2 Review Moderation Flow
When an admin hides a review, it immediately recalculates and updates the Product rating aggregates to ensure hidden review ratings do not count towards the product average rating.

```mermaid
sequenceDiagram
    autonumber
    Admin->>Route: PUT /admin/reviews/{id}/hide
    Route->>Service: hide_review(review_id)
    Service->>Repo: update(review, {status: HIDDEN})
    Repo->>DB: Save status to Review
    DB-->>Repo: Acknowledged
    Service->>Repo: sync_product_ratings(product_id)
    Repo->>DB: Recalculate metrics (ACTIVE reviews only)
    DB-->>Repo: Return metrics
    Repo->>DB: Update Product aggregate statistics
    DB-->>Repo: Acknowledged
    Service-->>Route: Return AdminReviewResponse
    Route-->>Admin: ApiResponse
```

---

## 4. MongoDB Aggregator Statistics Calculations

The repository layer utilizes a single `$facet` aggregation pipeline to calculate statistics:

```python
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
```

---

## 5. Interview Questions & Study Guide

### 5.1 MongoDB Aggregations
* **Question 1**: What is the purpose of `$facet` in MongoDB aggregation pipelines?
  * *Answer*: `$facet` allows executing multiple aggregation pipelines in parallel within a single stage on the same input documents. This lets us calculate general summary metrics (average rating, review count) and rating distribution breakdowns (1-5 star counts) in a single database round-trip.

### 5.2 Python & Beanie Design
* **Question 2**: How does storing rating metrics directly on the `Product` document optimize catalog retrieval?
  * *Answer*: If we calculated ratings on-the-fly when listing products, MongoDB would have to perform index lookups and averages on the `Reviews` collection for every single product in the list, causing $O(N)$ query overhead. Storing pre-calculated aggregates directly on the product document simplifies list scans to $O(1)$ reads.

### 5.3 Best Practices & Performance Tips
1. **Match Filter Optimization**: Always place `$match` filters at the very beginning of aggregate pipelines. Filtering on index fields (`product_id`, `status = ACTIVE`) significantly limits the set of scanned records.
2. **Synchronized Updates**: Enforce statistics updates using transactional triggers inside the service layer whenever reviews are created, updated, hidden, restored, or deleted.
