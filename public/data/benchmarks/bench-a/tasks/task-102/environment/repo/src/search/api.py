from fastapi import APIRouter, Depends

from search.auth import require_session
from search.repository import repo

router = APIRouter()


@router.get("/search/{item_id}", dependencies=[Depends(require_session)])
def get_item(item_id: int):
    return repo.get(item_id)
