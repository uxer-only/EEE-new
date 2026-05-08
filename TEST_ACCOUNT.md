# Test Account - Provider Profile

## Login Credentials

```
📧 Email:    test@provider.com
🔑 Password: test1234
```

## Account Details

**Provider Information:**
- **Name:** Angelina Stone
- **Age:** 26 years old
- **Gender:** Female
- **Location:** New York, USA
- **Role:** Provider (Verified ✓)

**Profile Status:**
- ✅ Verified & Approved
- ✅ Active & Available
- ✅ Complete profile with all sections

## Profile Content

### Bio (My essence...)
```
Welcome to my world of elegance and sophistication. 
I am a refined companion who values meaningful connections 
and memorable experiences. With a passion for art, fine dining, 
and stimulating conversation, I bring warmth and charm to 
every encounter. Discreet, intelligent, and attentive to your needs.
```

### Services (What we can share together...)
7 Services:
1. A-Level
2. Body to Body
3. Erotic Massage
4. Escort Service
5. Full Service
6. GFE
7. Jacuzzi

### Rates (Time & investment)
- **Hourly:** $500

### Photos
- **Total:** 12 professional photos
- **Quality:** High-resolution Unsplash images
- **Format:** Portrait orientation (3:4 aspect)
- **Display:** Main carousel + thumbnail gallery

### Schedule (My schedule)
- Monday: 10:00 - 00:00
- Tuesday: 10:00 - 00:00
- Wednesday: 10:00 - 00:00
- Thursday: 10:00 - 00:00
- Friday: 10:00 - 01:00
- Saturday: 10:00 - 01:00
- Sunday: 10:00 - 00:00

## What You Can Test

### Provider Features
✅ **Login:** Use credentials to access provider dashboard
✅ **Dashboard:** View provider stats, bookings, messages
✅ **Profile:** View your public profile as clients see it
✅ **Edit Profile:** Update profile information
✅ **Bookings:** View and manage incoming bookings
✅ **Messages:** Chat with clients
✅ **Earnings:** Track completed bookings and earnings

### Public Profile
✅ **Browse Page:** Profile appears in provider listings
✅ **Search:** Can be found via city filter (New York)
✅ **Gender Filter:** Shows in "Female" filter
✅ **Detail Page:** Full profile with all sections
✅ **Photos:** 12-image thumbnail gallery
✅ **Verified Badge:** Gold checkmark displayed
✅ **All Sections:** Bio, Services, Rates, Schedule visible

### Client Interactions
✅ **Book Now:** Clients can create bookings
✅ **Message:** Clients can start conversations
✅ **Reviews:** Clients can leave reviews (after completed bookings)

## Testing Login Flow

### Web Browser
1. Navigate to: `https://your-app-url/login`
2. Enter email: `test@provider.com`
3. Enter password: `test1234`
4. Click "Sign In"
5. Redirects to Provider Dashboard

### API Testing
```bash
curl -X POST "https://your-app-url/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@provider.com","password":"test1234"}'
```

**Expected Response:**
```json
{
  "user_id": "user_test_xxxxxxxx",
  "email": "test@provider.com",
  "name": "Angelina Stone",
  "role": "provider"
}
```

## Profile URLs

### Provider Dashboard
```
/dashboard
```
Shows provider-specific dashboard with:
- Pending bookings count
- Completed bookings count
- Total earnings
- Unread messages count
- Profile preview

### Public Profile
```
/providers/provider_test_xxxxxxxx
```
Shows public-facing profile with:
- Photo carousel
- 12 thumbnail images
- My essence (bio)
- What we can share together (services)
- Time & investment (rates)
- My schedule (availability)
- Book Now & Message buttons

### Provider in Browse
```
/browse
```
- Profile visible in main grid
- Click "Female" filter to narrow down
- Search "New York" to find specifically

## Features to Test

### Authentication
- [x] Email/password login
- [ ] Google OAuth login
- [x] Provider role assigned
- [x] Session created
- [x] Dashboard access

### Provider Dashboard
- [x] View profile preview
- [ ] See booking statistics
- [ ] Check earnings
- [ ] View messages
- [ ] Update profile

### Public Profile View
- [x] 12 photos displayed
- [x] Thumbnail gallery with hover
- [x] All sections visible
- [x] Verified badge shown
- [x] Book Now button
- [x] Message button

### Client Interactions
- [ ] Create test client account
- [ ] Browse and find Angelina Stone
- [ ] View profile detail page
- [ ] Create booking
- [ ] Send message
- [ ] Leave review (after booking)

## Database Information

**Collections Updated:**
- `users` - Test user document
- `provider_profiles` - Complete provider profile

**User ID:** Generated with prefix `user_test_`
**Provider ID:** Generated with prefix `provider_test_`

**Verification Status:**
- verification_status: "approved"
- verified: true
- available: true

## Password Information

**Plain Text:** test1234
**Hashed:** bcrypt with salt
**Min Length:** 8 characters
**Requirements:** No special requirements for test

## Quick Test Checklist

### As Provider (Logged In)
- [ ] Login successful
- [ ] Dashboard loads
- [ ] Can view own profile
- [ ] Can edit profile
- [ ] Can view bookings
- [ ] Can access messages

### As Public Visitor
- [ ] Profile visible in browse
- [ ] Can view detail page
- [ ] All 12 photos load
- [ ] Thumbnail hover works
- [ ] All sections display correctly

### As Client
- [ ] Can book Angelina Stone
- [ ] Can send messages
- [ ] Booking flow works
- [ ] Payment integration works

## Troubleshooting

### Can't Login
- Verify email: `test@provider.com`
- Verify password: `test1234` (case-sensitive)
- Check backend logs for errors
- Ensure session cookies enabled

### Profile Not Showing
- Check verified status in database
- Ensure available: true
- Clear browser cache
- Check API response

### Missing Photos
- Verify photos array has 12 items
- Check Unsplash URLs accessible
- Test image loading in browser

## Recreating Account

If you need to recreate the test account, run:
```bash
cd /app/scripts
python3 seed_providers.py  # This will reset all providers
# Or create specific test account again
```

## Security Note

⚠️ **Test Account Only**
- Use only for testing and development
- Do not use in production
- Simple password for ease of testing
- Can be deleted anytime

## Next Steps

1. **Login** to test provider dashboard
2. **Browse** to see profile in listings
3. **View Detail** to see complete profile
4. **Create Client** account to test booking flow
5. **Test Messaging** between client and provider
6. **Test Payment** flow with Stripe

---

**Created:** 2026-02-18
**Status:** Active & Ready for Testing
**Access:** Available immediately
