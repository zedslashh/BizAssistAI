from models.org import Org
from .mongo import get_collection
from typing import Optional

orgs_coll = get_collection("orgs")

async def create_org(org: Org) -> Org:
    await orgs_coll.insert_one(org.dict())
    return org

async def get_org(org_id: str) -> Optional[Org]:
    doc = await orgs_coll.find_one({"id": org_id})
    return Org(**doc) if doc else None

async def list_orgs():
    cursor = orgs_coll.find({})
    return [Org(**doc) async for doc in cursor]
