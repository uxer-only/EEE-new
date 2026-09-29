"""One-off: geocode existing provider cities and store location.lat/lng on each profile."""
import asyncio
import os
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

HEADERS = {"User-Agent": "EliteEscortsEurope/1.0 (info@eliteescortseurope.eu)"}


async def geocode(city, country):
    q = f"{city}, {country}" if country else city
    async with httpx.AsyncClient(timeout=8.0, headers=HEADERS) as c:
        r = await c.get("https://nominatim.openstreetmap.org/search",
                        params={"q": q, "format": "json", "limit": 1})
    if r.status_code == 200 and r.json():
        d = r.json()[0]
        return float(d["lat"]), float(d["lon"])
    return None


async def main():
    cache = {}
    profiles = await db.provider_profiles.find({}, {"provider_id": 1, "location": 1}).to_list(1000)
    for p in profiles:
        loc = p.get("location") or {}
        city, country = loc.get("city", ""), loc.get("country", "")
        if not city or (loc.get("lat") is not None and loc.get("lng") is not None):
            continue
        key = f"{city.lower()}|{country.lower()}"
        if key not in cache:
            coords = await geocode(city, country)
            cache[key] = coords
            await db.geocode_cache.replace_one(
                {"_id": key},
                {"_id": key, "lat": coords[0] if coords else None, "lng": coords[1] if coords else None},
                upsert=True,
            )
            await asyncio.sleep(1.1)  # respect Nominatim 1 req/s policy
        coords = cache[key]
        if coords:
            await db.provider_profiles.update_one(
                {"provider_id": p["provider_id"]},
                {"$set": {"location.lat": coords[0], "location.lng": coords[1]}},
            )
            print(f"{city}, {country} -> {coords}")
        else:
            print(f"{city}, {country} -> FAILED")
    print("Backfill complete.")


if __name__ == "__main__":
    asyncio.run(main())
