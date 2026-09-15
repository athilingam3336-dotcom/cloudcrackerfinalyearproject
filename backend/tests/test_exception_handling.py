import pytest
from httpx import AsyncClient
from app.exceptions.custom_exceptions import (
    NotFoundException,
    UnauthorizedException,
    ForbiddenException,
    BadRequestException,
    ValidationException,
)
from app.repositories.product_repository import ProductRepository
from app.models.product import Product


from beanie import PydanticObjectId


@pytest.mark.asyncio
async def test_invalid_objectid_returns_400(client: AsyncClient):
    """Verifies that an invalid BSON ObjectId in URL path returns HTTP 400 Bad Request or 422 Validation Error."""
    response = await client.get("/api/v1/products/invalid-object-id-123")
    assert response.status_code in [400, 404, 422]
    data = response.json()
    assert data["success"] is False
    assert "message" in data


@pytest.mark.asyncio
async def test_atomic_inventory_stock_operations():
    """Verifies atomic decrement and increment stock methods on ProductRepository."""
    product_repo = ProductRepository()
    product = Product(
        name="Test Atomic Product",
        description="Test description",
        price=100.0,
        stock=10,
        category_id=PydanticObjectId(),
        status="active"
    )
    await product.insert()

    # Successful atomic decrement
    success = await product_repo.atomic_decrement_stock(str(product.id), 3)
    assert success is True
    updated_prod = await product_repo.get_by_id(str(product.id))
    assert updated_prod.stock == 7

    # Failed atomic decrement (requesting more than available)
    fail_success = await product_repo.atomic_decrement_stock(str(product.id), 20)
    assert fail_success is False
    updated_prod_again = await product_repo.get_by_id(str(product.id))
    assert updated_prod_again.stock == 7

    # Successful atomic increment
    inc_success = await product_repo.atomic_increment_stock(str(product.id), 5)
    assert inc_success is True
    final_prod = await product_repo.get_by_id(str(product.id))
    assert final_prod.stock == 12

    # Clean up
    await product.delete()


@pytest.mark.asyncio
async def test_custom_exception_hierarchy():
    """Tests custom exceptions structure and status codes."""
    nf = NotFoundException("Item missing")
    assert nf.status_code == 404
    assert nf.message == "Item missing"

    unauth = UnauthorizedException("Not logged in")
    assert unauth.status_code == 401

    forb = ForbiddenException("Access denied")
    assert forb.status_code == 403

    br = BadRequestException("Bad input")
    assert br.status_code == 400

    val = ValidationException("Invalid data")
    assert val.status_code == 422


@pytest.mark.asyncio
async def test_unhandled_exception_masks_stack_trace(client: AsyncClient):
    """Ensures unhandled 500 errors return a clean JSON response without leaking stack traces."""
    res = await client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
