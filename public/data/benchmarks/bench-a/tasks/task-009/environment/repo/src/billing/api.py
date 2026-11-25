from fastapi import APIRouter, Depends

from billing.auth import require_session
from billing.repository import repo

router = APIRouter()


@router.get("/billing/{item_id}", dependencies=[Depends(require_session)])
def get_item(item_id: int):
    return repo.get(item_id)
