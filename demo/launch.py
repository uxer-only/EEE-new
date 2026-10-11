"""Run the EEE backend + built frontend on one port with an in-memory MongoDB and demo data.
Local preview only. Not for production. Start with demo/run_demo.sh, then open http://localhost:8001 (all demo passwords: demo1234)."""
import os, sys, asyncio, uuid
from datetime import datetime, timedelta

os.environ.update({
    "MONGO_URL": "mongodb://localhost:27017", "DB_NAME": "eee_demo",
    "JWT_SECRET": "local-preview-only", "CORS_ORIGINS": "http://localhost:8001",
    "APP_URL": "http://localhost:8001",
})
import motor.motor_asyncio as mm
import mongomock_motor
mm.AsyncIOMotorClient = mongomock_motor.AsyncMongoMockClient
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); import mm_patch  # noqa: E402,F401  ($convert/$type for the mock db)

BACKEND = os.path.join(HERE, "..", "backend")
sys.path.insert(0, BACKEND)
os.chdir(BACKEND)
import server  # noqa: E402
import seed_admin_demo as seed  # noqa: E402
import bcrypt  # noqa: E402

PHOTOS = [f"http://localhost:8001/demo/p{i}.jpg" for i in range(8)]
seed.PHOTOS[:] = PHOTOS
PW = "demo1234"

from fastapi.staticfiles import StaticFiles  # noqa: E402
from starlette.responses import FileResponse  # noqa: E402

BUILD = os.path.join(HERE, "..", "frontend", "build")
app = server.app
app.mount("/demo", StaticFiles(directory=os.path.join(HERE, "assets")), name="demo")
app.mount("/static", StaticFiles(directory=f"{BUILD}/static"), name="static")


@app.get("/{full_path:path}", include_in_schema=False)
async def spa(full_path: str):
    p = os.path.join(BUILD, full_path)
    if full_path and os.path.isfile(p):
        return FileResponse(p)
    return FileResponse(os.path.join(BUILD, "index.html"))


async def _user(email, name, role, account_type=None):
    uid = f"user_{uuid.uuid4().hex[:12]}"
    await server.db.users.insert_one({
        "user_id": uid, "email": email, "name": name, "picture": None, "role": role,
        "account_type": account_type,
        "password_hash": bcrypt.hashpw(PW.encode(), bcrypt.gensalt()).decode(),
        "email_verified": True, "created_at": datetime.utcnow(),
    })
    return uid


@app.on_event("startup")
async def seed_demo():
    seed.db = server.db
    seed.client.close = lambda: None
    await seed.main()
    db = server.db
    await _user("admin@demo.com", "Admin", "admin")
    await _user("client@demo.com", "Marcus", "client")
    await _user("new.indep@demo.com", "Mila", "provider", "independent")
    await _user("new.agency@demo.com", "New Agency", "provider", "agency")
    # give the agency 'Rose Noire' a richer roster: one expired, one draft
    ag = await db.users.find_one({"email": "rosenoire.agency@demo.com"})
    now = datetime.utcnow()
    profs = await db.provider_profiles.find({"user_id": ag["user_id"]}).to_list(10)
    if len(profs) >= 3:
        await db.provider_profiles.update_one({"provider_id": profs[2]["provider_id"]},
                                              {"$set": {"featured_until": now - timedelta(days=2), "vip_until": None}})
    await db.provider_profiles.insert_one({
        "provider_id": f"provider_{uuid.uuid4().hex[:12]}", "user_id": ag["user_id"],
        "display_name": "Noor", "age": 23, "gender": "female",
        "location": {"city": "Paris", "country": "France"}, "bio": "", "photos": [],
        "companionshipType": "Agency", "verified": False, "verification_status": "pending",
        "created_at": now,
    })
    # one approved video + extra photos, schedule and options on the first VIP profile (profile page demo)
    first = await db.provider_profiles.find_one({"display_name": "Chloé Laurent"})
    if first:
        await db.provider_media.insert_one({"media_id": "media_demo_v1", "provider_id": first["provider_id"], "url": "http://localhost:8001/demo/v1.mp4",
                                            "media_type": "video", "status": "approved", "uploaded_at": now})
        await db.provider_profiles.update_one({"provider_id": first["provider_id"]}, {"$set": {
            "photos": [f"http://localhost:8001/demo/p{i}.jpg" for i in (1, 2, 4, 5, 6)],
            "booking_advance": True, "worldwide_travel": True, "availability_type": "both",
            "schedule": {d: ({"available": True, "start": "18:00", "end": "02:00"} if d != "sunday" else {"available": False}) for d in
                         ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]},
            "contact.hasSms": True, "contact.hasTelegram": True, "contact.telegram": "@chloe", "contact.hasSignal": True, "contact.hasViber": True,
            "rates.outcall.taxi": 40,
        }})
    # demo inbox for the independent Isabella
    iu = await db.users.find_one({"email": "isabella.indep@demo.com"})
    ip = await db.provider_profiles.find_one({"user_id": iu["user_id"]}) if iu else None
    if ip:
        demo_msgs = [
            ("Marcus", "marcus.v@gmail.com", 0.05, False, None, "Hello,\n\nI found your profile on Elite Escorts Europe. Are you available for a dinner date next Thursday around 8 pm? I would book a restaurant in the city centre.\n\nKind regards,\nMarcus"),
            ("Thomas", "thomas.l@outlook.com", 1, False, None, "Hi, I will be in town from 17 to 19 October. Would a weekend booking be possible? Let me know your rate for two nights."),
            ("David", "d.peeters@telenet.be", 4, True, "Good morning David, yes, I regularly accompany clients to business events. Could you tell me the location and the times?", "Good morning, I am looking for a companion for a business reception on 24 October. Dress code is formal. Is this something you do?"),
            ("Anna", "anna.k@proton.me", 12, True, None, "Hello, do you also offer outcall? And is there a travel fee?"),
        ]
        for name, mail, days, read, reply, text in demo_msgs:
            doc = {"enquiry_id": f"enq_{uuid.uuid4().hex[:12]}", "provider_id": ip["provider_id"], "user_id_provider": ip["user_id"],
                   "name": name, "email": mail, "message": text, "read": read, "created_at": now - timedelta(days=days)}
            if reply:
                doc["replies"] = [{"message": reply, "sent_by": "isabella.indep@demo.com", "sent_at": (now - timedelta(days=days - 0.1)).isoformat() + "+00:00", "delivered": True}]
            await db.enquiries.insert_one(doc)
    # admin demo: a verification queue, media to review and some traffic
    import random
    D = "http://localhost:8001/demo/"
    mia = await db.provider_profiles.find_one({"display_name": "Mia König"})
    noor = await db.provider_profiles.find_one({"display_name": "Noor"})
    for prof, n_docs, mins in ((mia, 3, 60 * 30), (noor, 2, 60 * 6)):
        if not prof:
            continue
        await db.provider_profiles.update_one({"provider_id": prof["provider_id"]}, {"$set": {"verified": False, "verification_status": "submitted"}})
        for k, t in enumerate(["id_front", "id_selfie", "secondary_doc"][:n_docs]):
            await db.verification_documents.insert_one({"doc_id": f"doc_{uuid.uuid4().hex[:12]}", "provider_id": prof["provider_id"],
                "document_type": t, "document_url": f"{D}p{k + 3}.jpg", "status": "pending",
                "submitted_at": now - timedelta(minutes=mins), "reviewed_at": None})
    if mia:
        for k, (typ, url, st, ago) in enumerate([("photo", f"{D}p6.jpg", "pending", 0.1), ("photo", f"{D}p7.jpg", "pending", 0.2),
                                               ("video", f"{D}v1.mp4", "pending", 0.6), ("photo", f"{D}p0.jpg", "rejected", 4)]):
            doc = {"media_id": f"media_admin_{k}", "provider_id": mia["provider_id"], "url": url, "media_type": typ, "status": st,
                   "uploaded_at": now - timedelta(days=ago), "file_name": url.rsplit('/', 1)[-1]}
            if st == "rejected":
                doc.update({"rejection_reason": "Face is fully visible — please crop or blur and upload again.", "reviewed_at": now - timedelta(days=3)})
            await db.provider_media.insert_one(doc)
        for k, u in enumerate(mia.get("photos") or []):
            await db.provider_media.insert_one({"media_id": f"media_ok_{k}", "provider_id": mia["provider_id"], "url": u, "media_type": "photo", "status": "approved", "uploaded_at": now - timedelta(days=10)})
    rnd = random.Random(7)
    pages = ["/", "/browse", "/browse?city=Paris", "/advertising-prices", "/contact", "/terms"]
    logs = []
    for day in range(30):
        for _ in range(rnd.randint(25, 60)):
            logs.append({"log_id": uuid.uuid4().hex[:12], "page": rnd.choices(pages, [30, 25, 12, 8, 4, 3])[0],
                         "ip_address": f"10.0.{rnd.randint(0, 3)}.{rnd.randint(1, 40)}", "timestamp": now - timedelta(days=day, minutes=rnd.randint(0, 1400))})
    await db.traffic_logs.insert_many(logs)
    await db.users.update_many({}, {"$set": {"email_verified": True}})
    print("DEMO SEEDED")
