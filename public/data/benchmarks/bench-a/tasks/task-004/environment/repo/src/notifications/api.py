from fastapi import APIRouter, Depends

from notifications.auth import require_session
from notifications.repository import repo

router = APIRouter()


@router.get("/notifications/{item_id}", dependencies=[Depends(require_session)])
def get_item(item_id: int):
    return repo.get(item_id)
