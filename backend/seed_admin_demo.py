"""Seed 5 independent providers + 2 agencies (with companions) for the admin dashboard demo.
Idempotent: everything tagged seed_tag='admin_demo' is wiped and recreated on each run.
"""
import asyncio
import os
import uuid
from datetime import datetime, timedelta

import bcrypt
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

SEED_TAG = "admin_demo"
PASSWORD = "demo1234"

PHOTOS = [
    "https://images.unsplash.com/photo-1618244965061-1d27b208d6e8?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    "https://images.unsplash.com/photo-1706292707816-3f0288eedaf2?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    "https://images.unsplash.com/photo-1612731486606-2614b4d74921?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    "https://images.unsplash.com/photo-1576003781339-ecb9f17b3e98?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    "https://images.unsplash.com/photo-1646589391794-566792b13cae?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    "https://images.unsplash.com/photo-1634510979979-4be6881d31bb?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    "https://images.unsplash.com/photo-1506863530036-1efeddceb993?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    "https://images.unsplash.com/photo-1581841064838-a470c740e8ee?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
]


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def rates(base_in: float, base_out: float):
    return {
        "incall": {"1hour": base_in, "2hours": base_in * 1.7, "3hours": base_in * 2.3,
                   "overnight": base_in * 6, "extras": []},
        "outcall": {"1hour": base_out, "2hours": base_out * 1.7, "3hours": base_out * 2.3,
                    "overnight": base_out * 6, "extras": []},
    }


def services():
    return {
        "Girlfriend Experience": {"type": "inclusive", "price": ""},
        "Dinner Date": {"type": "inclusive", "price": ""},
        "Erotic Massage": {"type": "inclusive", "price": ""},
        "Overnight Stay": {"type": "extra", "price": "1500"},
        "Travel Companion": {"type": "extra", "price": "2500"},
    }


def characteristics(nat, eth, hair, eyes, height, weight, langs):
    return {
        "nationality": nat, "ethnicity": eth, "orientation": "Bisexual",
        "height": str(height), "weight": str(weight),
        "eye_color": eyes, "hair_color": hair, "hair_length": "Long",
        "breast_size": "C", "breast_type": "Natural", "pubic_hair": "Trimmed",
        "tattoos": "None", "piercings": "Ears", "smoker": "No", "languages": langs,
    }


def base_profile(display_name, city, country, age, bio, photo_idxs, chars,
                 in_rate, out_rate, vip=False, days_left=20):
    now = datetime.utcnow()
    return {
        "provider_id": f"provider_{uuid.uuid4().hex[:12]}",
        "display_name": display_name,
        "age": age,
        "gender": "female",
        "location": {"city": city, "country": country},
        "bio": bio,
        "essence": bio,
        "companionshipType": "Independent",
        "services": services(),
        "rates": rates(in_rate, out_rate),
        "characteristics": chars,
        "photos": [PHOTOS[i] for i in photo_idxs],
        "availability_type": "flexible",
        "schedule": {},
        "contact": {
            "phone": "+3312345678",
            "email": f"{display_name.split()[0].lower()}@example.com",
            "whatsapp": "+3312345678",
            "telegram": "",
            "website": "",
        },
        "verified": True,
        "verification_status": "approved",
        "available": True,
        "suspended": False,
        "featured_until": now + timedelta(days=days_left),
        "vip_until": (now + timedelta(days=days_left)) if vip else None,
        "status": "active",
        "created_at": now,
        "seed_tag": SEED_TAG,
    }


async def make_user(email, name, account_type):
    uid = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": uid,
        "email": email,
        "name": name,
        "picture": None,
        "role": "provider",
        "account_type": account_type,
        "password_hash": hash_pw(PASSWORD),
        "created_at": datetime.utcnow(),
        "seed_tag": SEED_TAG,
    })
    return uid


async def wipe():
    # find seeded users to also clean their profiles by user_id
    seed_users = await db.users.find({"seed_tag": SEED_TAG}, {"_id": 0, "user_id": 1}).to_list(1000)
    uids = [u["user_id"] for u in seed_users]
    if uids:
        await db.provider_profiles.delete_many({"user_id": {"$in": uids}})
        await db.agency_profiles.delete_many({"user_id": {"$in": uids}})
    await db.provider_profiles.delete_many({"seed_tag": SEED_TAG})
    await db.agency_profiles.delete_many({"seed_tag": SEED_TAG})
    await db.users.delete_many({"seed_tag": SEED_TAG})


async def main():
    await wipe()

    # ---------- 5 INDEPENDENT PROVIDERS ----------
    independents = [
        ("Isabella Rose", "London", "United Kingdom", 26,
         "Sophisticated British companion for refined dinners and unforgettable evenings.",
         [0, 1], characteristics("British", "European", "Brunette", "Green", 172, 57, ["English", "French"]), 300, 400, True),
        ("Chloé Laurent", "Paris", "France", 24,
         "Elegant Parisian model, fluent in the art of conversation and seduction.",
         [1, 2], characteristics("French", "European", "Brunette", "Brown", 168, 54, ["French", "English"]), 350, 450, True),
        ("Mia König", "Berlin", "Germany", 28,
         "Warm, playful and cultured — the perfect companion for the discerning gentleman.",
         [2, 3], characteristics("German", "European", "Blonde", "Blue", 175, 60, ["German", "English"]), 250, 350, False),
        ("Aria van Dijk", "Amsterdam", "Netherlands", 25,
         "Adventurous Dutch beauty who loves travel, fine wine and genuine connection.",
         [4, 5], characteristics("Dutch", "European", "Brunette", "Hazel", 170, 56, ["Dutch", "English", "German"]), 280, 380, False),
        ("Valentina Cruz", "Barcelona", "Spain", 27,
         "Passionate Spanish companion with Mediterranean charm and impeccable style.",
         [5, 7], characteristics("Spanish", "Latina", "Black", "Brown", 166, 55, ["Spanish", "English"]), 300, 400, True),
    ]
    for name, city, country, age, bio, idxs, chars, ir, orr, vip in independents:
        first = name.split()[0].lower()
        uid = await make_user(f"{first}.indep@demo.com", name, "independent")
        prof = base_profile(name, city, country, age, bio, idxs, chars, ir, orr, vip)
        prof["user_id"] = uid
        await db.provider_profiles.insert_one(prof)

    # ---------- 2 AGENCIES ----------
    agencies = [
        {
            "email": "rosenoire.agency@demo.com", "name": "Rose Noire",
            "agency_name": "Rose Noire", "city": "Paris", "country": "France",
            "description": "Paris' premier boutique agency representing a curated selection of elite companions.",
            "companions": [
                ("Camille", 24, [3], "French", "Brunette", "Brown", 168, 54, 350, 450, True),
                ("Elena", 26, [4], "Russian", "Blonde", "Blue", 174, 58, 400, 500, True),
                ("Nadia", 29, [6], "Italian", "Brunette", "Green", 170, 57, 320, 420, False),
            ],
        },
        {
            "email": "viennaelite.agency@demo.com", "name": "Vienna Elite",
            "agency_name": "Vienna Elite", "city": "Vienna", "country": "Austria",
            "description": "An exclusive Viennese agency offering discretion and sophistication for distinguished clients.",
            "companions": [
                ("Lena", 25, [7], "Austrian", "Brunette", "Hazel", 172, 56, 300, 400, True),
                ("Victoria", 27, [0], "British", "Brunette", "Green", 173, 58, 350, 450, False),
            ],
        },
    ]

    for ag in agencies:
        uid = await make_user(ag["email"], ag["name"], "agency")
        default_services = services()
        default_rates = rates(300, 400)
        await db.agency_profiles.insert_one({
            "user_id": uid,
            "agency_id": f"agency_{uuid.uuid4().hex[:12]}",
            "agency_name": ag["agency_name"],
            "location": {"city": ag["city"], "country": ag["country"]},
            "description": ag["description"],
            "languages": ["English", "French"],
            "contact": {"phone": "+3312349999", "email": ag["email"], "whatsapp": "+3312349999", "telegram": "", "website": ""},
            "default_services": default_services,
            "apply_services_to_all": True,
            "default_rates": default_rates,
            "default_availability": {"availability_type": "flexible", "schedule": {}},
            "apply_rates_to_all": True,
            "onboarded": True,
            "suspended": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "seed_tag": SEED_TAG,
        })
        for (cname, age, idxs, nat, hair, eyes, h, w, ir, orr, vip) in ag["companions"]:
            chars = characteristics(nat, "European", hair, eyes, h, w, ["English", "French"])
            prof = base_profile(cname, ag["city"], ag["country"], age,
                                f"{cname} — a signature companion of {ag['agency_name']}.",
                                idxs if isinstance(idxs, list) else [idxs], chars, ir, orr, vip)
            prof["user_id"] = uid
            prof["companionshipType"] = "Agency"
            await db.provider_profiles.insert_one(prof)

    # report
    users = await db.users.count_documents({"seed_tag": SEED_TAG})
    profs = await db.provider_profiles.count_documents({"seed_tag": SEED_TAG})
    ags = await db.agency_profiles.count_documents({"seed_tag": SEED_TAG})
    print(f"Seeded users={users} profiles={profs} agencies={ags} (password for all: {PASSWORD})")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
