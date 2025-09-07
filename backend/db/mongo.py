import motor.motor_asyncio
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "myapp")

client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def get_collection(name: str):
    return db[name]

async def init_indexes():
    """Create indexes and schema validation rules for collections."""

    # 🔹 Users collection
    users = get_collection("users")
    await users.create_index("id", unique=True)
    await users.create_index("email", unique=True, sparse=True)  # optional field
    await users.create_index("phone", unique=True, sparse=True)

    # 🔹 Orgs collection
    orgs = get_collection("orgs")
    await orgs.create_index("id", unique=True)
    await orgs.create_index("email", unique=True)
    await orgs.create_index("vertical")

    # 🔹 Chats collection
    chats = get_collection("chats")
    await chats.create_index("orgId")
    await chats.create_index("userId")
    await chats.create_index([("orgId", 1), ("userId", 1)])  # compound index
    await chats.create_index("createdAt")

    # 🔹 (Optional) schema validation — lightweight Pydantic-style constraints
    await db.command({
        "collMod": "users",
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["id", "role"],
                "properties": {
                    "id": {"bsonType": "string"},
                    "email": {"bsonType": ["string", "null"]},
                    "phone": {"bsonType": ["string", "null"]},
                    "role": {"enum": ["admin", "user", "both"]},
                },
            }
        },
        "validationLevel": "moderate",
    })

    await db.command({
        "collMod": "orgs",
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["id", "name", "email", "vertical", "integration", "languages"],
                "properties": {
                    "id": {"bsonType": "string"},
                    "email": {"bsonType": "string"},
                    "vertical": {"enum": [
                        "health", "fitness", "supermarket", "beauty parlour",
                        "finance", "education", "restaurant", "travel"
                    ]},
                    "integration": {"enum": ["widget", "landing", "whatsapp"]},
                    "languages": {"enum": ["english", "tamil", "both"]},
                },
            }
        },
        "validationLevel": "moderate",
    })

    await db.command({
        "collMod": "chats",
        "validator": {
            "$jsonSchema": {
                "bsonType": "object",
                "required": ["orgId", "userId", "message", "answer"],
                "properties": {
                    "orgId": {"bsonType": "string"},
                    "userId": {"bsonType": "string"},
                    "message": {"bsonType": "string"},
                    "answer": {"bsonType": "string"},
                    "confidence": {"bsonType": ["double", "int", "null"]},
                },
            }
        },
        "validationLevel": "moderate",
    })
