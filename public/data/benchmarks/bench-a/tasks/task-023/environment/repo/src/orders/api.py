from fastapi import APIRouter, Depends

from orders.auth import require_session
from orders.repository import repo

router = APIRouter()


@router.get("/orders/{item_id}", dependencies=[Depends(require_session)])
def get_item(item_id: int):
    return repo.get(item_id)
