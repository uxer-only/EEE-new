"""Seed a sample paid invoice and a sample enquiry for Sophia (provider1@lumiere.com).
Idempotent — safe to re-run; skips if a sample already exists."""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load backend .env
load_dotenv("/app/backend/.env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

SAMPLE_SESSION_ID = "cs_sample_only_elite_escorts_demo"
SAMPLE_ENQ_ID = "enq_sample_demo_marcus"


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    # 1. Find Sophia's provider profile
    user = await db.users.find_one({"email": "provider1@lumiere.com"})
    if not user:
        print("Sophia user not found — aborting.")
        sys.exit(1)
    profile = await db.provider_profiles.find_one({"user_id": user["user_id"]})
    if not profile:
        print("Sophia profile not found — aborting.")
        sys.exit(1)

    provider_id = profile["provider_id"]
    user_id = user["user_id"]

    # 2. Seed a paid invoice (payment_transactions)
    existing_tx = await db.payment_transactions.find_one({"session_id": SAMPLE_SESSION_ID})
    if existing_tx:
        print(f"Sample invoice already exists ({SAMPLE_SESSION_ID}) — skipping insert.")
    else:
        now = datetime.now(timezone.utc)
        featured_id = f"feat_sample_{uuid.uuid4().hex[:8]}"
        vip_id = f"vip_sample_{uuid.uuid4().hex[:8]}"
        tx_doc = {
            "session_id": SAMPLE_SESSION_ID,
            "transaction_id": SAMPLE_SESSION_ID,
            "user_id": user_id,
            "provider_id": provider_id,
            "amount": 149.00,
            "amount_total": 149.00,
            "currency": "eur",
            "featured_plan": "featured_30d",
            "vip_plan": "vip_7d",
            "auto_renew": True,
            "metadata": {
                "plan_id": "featured_30d + vip_7d",
                "featured_id": featured_id,
                "vip_id": vip_id,
                "auto_renew": "1",
                "kind": "subscription_purchase",
            },
            "payment_status": "paid",
            "status": "complete",
            "created_at": now,
            "completed_at": now,
        }
        await db.payment_transactions.insert_one(tx_doc)
        print(f"Inserted sample invoice {SAMPLE_SESSION_ID} for provider {provider_id}")

    # 3. Seed a sample enquiry (received message)
    existing_enq = await db.enquiries.find_one({"enquiry_id": SAMPLE_ENQ_ID})
    if existing_enq:
        print(f"Sample enquiry already exists ({SAMPLE_ENQ_ID}) — skipping insert.")
    else:
        enq_doc = {
            "enquiry_id": SAMPLE_ENQ_ID,
            "provider_id": provider_id,
            "user_id_provider": user_id,
            "name": "Marcus H.",
            "email": "marcus.demo@example.com",
            "message": (
                "Hi Sophia, I loved your profile. I'll be in New York next weekend for a "
                "business trip and would love to arrange a dinner date on Saturday evening. "
                "Could you let me know your availability and rates for a 3-hour outcall? "
                "Looking forward to hearing from you."
            ),
            "read": False,
            "created_at": datetime.now(timezone.utc),
        }
        await db.enquiries.insert_one(enq_doc)
        print(f"Inserted sample enquiry {SAMPLE_ENQ_ID} for provider {provider_id}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())
