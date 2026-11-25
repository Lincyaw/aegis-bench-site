from sqlalchemy.orm import Session


class Repository:
    def __init__(self, session: Session):
        self.session = session

    def get(self, item_id: int):
        ...
