import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
import uuid

# Sample data
CITIES = [
    {"city": "New York", "country": "USA"},
    {"city": "Los Angeles", "country": "USA"},
    {"city": "Miami", "country": "USA"},
    {"city": "London", "country": "UK"},
    {"city": "Paris", "country": "France"},
    {"city": "Milan", "country": "Italy"},
    {"city": "Dubai", "country": "UAE"},
    {"city": "Tokyo", "country": "Japan"},
    {"city": "Singapore", "country": "Singapore"},
    {"city": "Barcelona", "country": "Spain"}
]

FIRST_NAMES = [
    "Sophia", "Isabella", "Olivia", "Emma", "Ava", "Mia", "Luna", "Harper",
    "Aria", "Scarlett", "Victoria", "Grace", "Chloe", "Madison", "Lily",
    "Zoe", "Penelope", "Riley", "Layla", "Nora", "Bella", "Aurora",
    "Ellie", "Stella", "Maya", "Lucy", "Elena", "Hazel", "Violet", "Savannah"
]

PHOTOS = [
    "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1504439904031-93ded9f93e4e?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1479936343636-73cdc5aae0c3?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1525875975471-999f65706a10?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1527203561188-dae1bc1a417f?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1485178575877-1a13bf489dfe?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1521146764736-56c929d59c83?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1505033575518-a36ea2ef75ae?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1496203695688-3b8985780d6a?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1513721032312-6a18a42c8763?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1516914943479-89db7d9ae7f2?w=400&h=600&fit=crop",
    "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=600&fit=crop"
]

SERVICES = [
    "Erotic Massage",
    "Relaxing Massage", 
    "Jacuzzi",
    "Role Game",
    "Overnight",
    "Full Service",
    "Body to Body",
    "GFE",
    "A-Level",
    "O-Level",
    "Escort Service"
]

BIOS = [
    "Elegant and sophisticated companion for discerning gentlemen. I bring warmth and charm to every encounter.",
    "Well-traveled and cultured, I enjoy meaningful conversations and creating memorable experiences.",
    "Your perfect companion for social events, business dinners, or private moments.",
    "I combine beauty, intelligence, and grace to provide an unforgettable experience.",
    "Discrete, elegant, and refined. I specialize in providing premium companionship."
]

async def seed_providers():
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("🌱 Seeding 30 provider profiles...")
    
    # Clear existing provider profiles (optional)
    await db.provider_profiles.delete_many({})
    print("✅ Cleared existing profiles")
    
    profiles_created = 0
    
    # Gender distribution: 10 female, 10 male, 10 trans
    genders = ['female'] * 10 + ['male'] * 10 + ['trans'] * 10
    
    for i in range(30):
        # Create user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": f"provider{i+1}@lumiere.com",
            "name": FIRST_NAMES[i],
            "picture": PHOTOS[i],
            "role": "provider",
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.users.insert_one(user_doc)
        
        # Create provider profile
        provider_id = f"provider_{uuid.uuid4().hex[:12]}"
        location = CITIES[i % len(CITIES)]
        
        # Assign 4-7 random services per provider
        import random
        random.seed(i)  # Consistent but varied per provider
        num_services = random.randint(4, 7)
        provider_services = random.sample(SERVICES, num_services)
        
        # Assign 12 photos (cycling through available photos)
        provider_photos = []
        for photo_idx in range(12):
            photo_index = (i * 12 + photo_idx) % len(PHOTOS)
            provider_photos.append(PHOTOS[photo_index])
        
        profile_doc = {
            "provider_id": provider_id,
            "user_id": user_id,
            "display_name": FIRST_NAMES[i],
            "age": 21 + (i % 15),  # Ages 21-35
            "gender": genders[i],  # Assign gender
            "location": location,
            "bio": BIOS[i % len(BIOS)],
            "services": sorted(provider_services),  # Sort alphabetically
            "rates": {
                "hourly": 300 + (i * 50) % 500  # $300-$800
            },
            "photos": provider_photos,  # 12 photos per provider
            "verified": True,  # All verified
            "verification_status": "approved",
            "available": True,
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.provider_profiles.insert_one(profile_doc)
        profiles_created += 1
        
        if (i + 1) % 10 == 0:
            print(f"✅ Created {i + 1} profiles...")
    
    print(f"\n🎉 Successfully created {profiles_created} provider profiles!")
    
    # Verify counts by gender
    female_count = await db.provider_profiles.count_documents({"gender": "female"})
    male_count = await db.provider_profiles.count_documents({"gender": "male"})
    trans_count = await db.provider_profiles.count_documents({"gender": "trans"})
    
    print(f"✅ Female profiles: {female_count}")
    print(f"✅ Male profiles: {male_count}")
    print(f"✅ Trans profiles: {trans_count}")
    print(f"✅ Total verified profiles: {female_count + male_count + trans_count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_providers())
