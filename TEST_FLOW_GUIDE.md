# Test Accounts & Flow Testing Guide

## Test Accounts Created

### 🔷 Provider Account
```
📧 Email:    test@provider.com
🔑 Password: test1234
👤 Name:     Angelina Stone
📍 Location: New York, USA
💰 Rate:     $500/hour
✅ Status:   Verified & Active
```

### 🔷 Client Account
```
📧 Email:    client@test.com
🔑 Password: client123
👤 Name:     John Smith
👥 Role:     Client
```

## Complete Flow Testing Guide

### 1️⃣ Client Journey

#### Step 1: Register/Login as Client
- Navigate to `/login`
- Email: `client@test.com`
- Password: `client123`
- Should redirect to **Client Dashboard**

#### Step 2: Browse Providers
- Click "Browse" in navigation
- Should see 30+ verified providers
- Try gender filters: All, Female, Male, Trans
- Search by city: "New York"
- Should see Angelina Stone in results

#### Step 3: View Provider Profile
- Click on Angelina Stone's card
- Should see:
  - 12 photos in carousel
  - Thumbnail gallery with hover effects
  - My essence (bio section)
  - What we can share together (7 services)
  - Time & investment (rates)
  - My schedule (weekly availability)
  - Book Now button
  - Message button

#### Step 4: Create Booking
- Click "Book Now" button
- Modal should open
- Fill out booking form:
  - Service: Select from dropdown
  - Date: Pick future date
  - Time: Select time
  - Duration: Enter hours (e.g., 2)
- Should show estimated total
- Click "Confirm Booking"
- Should create booking and show in dashboard

#### Step 5: Process Payment
- After booking created, click "Pay Now"
- Should redirect to Stripe checkout
- **Use Stripe test card:**
  - Card: `4242 4242 4242 4242`
  - Expiry: Any future date
  - CVC: Any 3 digits
  - ZIP: Any 5 digits
- Complete payment
- Should redirect to `/booking-success`

#### Step 6: Send Message to Provider
- Go back to Angelina Stone's profile
- Click "Message" button
- Should create conversation
- Navigate to `/messages`
- Type message and send
- Should appear in conversation

#### Step 7: View Bookings
- Navigate to `/bookings`
- Should see created booking
- Check status (pending/confirmed)
- Check payment status

### 2️⃣ Provider Journey

#### Step 1: Login as Provider
- Navigate to `/login`
- Email: `test@provider.com`
- Password: `test1234`
- Should redirect to **Provider Dashboard**

#### Step 2: View Dashboard Stats
Should see:
- Pending bookings count
- Completed bookings count
- Total earnings
- Unread messages count
- Profile preview

#### Step 3: View Profile
- Click "View Public Profile"
- Should show full profile as clients see it
- Verify all sections visible:
  - 12 photos with thumbnails
  - My essence
  - What we can share together
  - Time & investment
  - My schedule

#### Step 4: Manage Bookings
- Navigate to `/bookings`
- Should see incoming booking from John Smith
- Status should be "pending"
- Actions available:
  - Confirm booking
  - Reject booking
- Click "Confirm" to accept
- Status should change to "confirmed"

#### Step 5: Respond to Messages
- Navigate to `/messages`
- Should see conversation with John Smith
- Unread message badge if present
- Click conversation to open
- Read message
- Type response and send
- Should appear in chat

#### Step 6: Complete Booking
- After booking date passes (or for testing)
- Go to `/bookings`
- Click "Mark Complete" on confirmed booking
- Status should change to "completed"
- Earnings should update in dashboard

### 3️⃣ Back to Client

#### Step 8: Leave Review
- Login as client (`client@test.com`)
- Navigate to `/bookings`
- Find completed booking
- Click to leave review
- Rate 1-5 stars
- Add comment
- Submit review
- Review should appear on provider's profile

### 4️⃣ Admin Journey (Future)

To test admin features, you'll need to:
1. Update client account role to "admin" in database
2. Login and navigate to `/admin`
3. View pending verifications
4. Approve/reject provider profiles

## Testing Checklist

### Authentication
- [ ] Client registration
- [ ] Provider registration
- [ ] Email/password login (both roles)
- [ ] Google OAuth login
- [ ] Session persistence
- [ ] Logout functionality

### Browse & Search
- [ ] View all providers grid (6 columns)
- [ ] Gender filters (All, Female, Male, Trans)
- [ ] City search filter
- [ ] Service type filter
- [ ] Rate range filter
- [ ] Provider cards display correctly
- [ ] Verified badges shown

### Provider Profile
- [ ] Main image carousel
- [ ] 12 thumbnail gallery
- [ ] Thumbnail hover effects
- [ ] All sections visible (essence, services, rates, schedule)
- [ ] Book Now button works
- [ ] Message button works
- [ ] Verified badge displayed

### Booking Flow
- [ ] Create booking modal opens
- [ ] Form validation works
- [ ] Estimated total calculates
- [ ] Booking saved to database
- [ ] Payment button appears
- [ ] Stripe checkout loads
- [ ] Payment processes successfully
- [ ] Booking status updates after payment
- [ ] Success page shows correct info

### Messaging
- [ ] Start new conversation
- [ ] Send messages
- [ ] Receive messages (both sides)
- [ ] Mark messages as read
- [ ] Unread count updates
- [ ] Real-time message display
- [ ] Conversation list sorted by recent

### Dashboard
- [ ] Client dashboard shows bookings
- [ ] Provider dashboard shows stats
- [ ] Earnings calculate correctly
- [ ] Pending bookings count accurate
- [ ] Profile preview displays

### Provider Management
- [ ] Confirm bookings
- [ ] Reject bookings
- [ ] Mark bookings complete
- [ ] View booking details
- [ ] Earnings track correctly

### Reviews
- [ ] Create review after completed booking
- [ ] Rating 1-5 stars
- [ ] Comment text
- [ ] Review appears on profile
- [ ] Average rating calculates
- [ ] Review count updates

## API Endpoints to Test

### Authentication
```bash
POST /api/auth/register
POST /api/auth/login
POST /api/auth/session (Google OAuth)
GET  /api/auth/me
POST /api/auth/logout
```

### Providers
```bash
GET  /api/providers (with filters)
GET  /api/providers/:id
POST /api/providers/profile
PUT  /api/providers/profile
```

### Bookings
```bash
POST /api/bookings
GET  /api/bookings
PUT  /api/bookings/:id
```

### Messages
```bash
GET  /api/conversations
POST /api/conversations
GET  /api/conversations/:id/messages
POST /api/messages
```

### Payments
```bash
POST /api/payments/checkout
GET  /api/payments/status/:session_id
```

### Reviews
```bash
POST /api/reviews
GET  /api/providers/:id/reviews
```

## Stripe Test Cards

### Success
- **Card:** 4242 4242 4242 4242
- **Expiry:** Any future date
- **CVC:** Any 3 digits

### Declined
- **Card:** 4000 0000 0000 0002

### Requires Authentication
- **Card:** 4000 0025 0000 3155

## Common Issues & Solutions

### Issue: Can't login
**Solution:** 
- Verify exact email and password
- Passwords are case-sensitive
- Check browser console for errors

### Issue: Booking doesn't appear
**Solution:**
- Check user role matches action
- Verify booking was created in database
- Refresh the page

### Issue: Payment fails
**Solution:**
- Use Stripe test cards
- Ensure Stripe test key is configured
- Check webhook configuration

### Issue: Messages don't appear
**Solution:**
- Verify conversation was created
- Check real-time polling interval
- Refresh messages page

### Issue: Profile not visible in browse
**Solution:**
- Verify provider profile is verified: true
- Check available: true
- Clear browser cache

## Database Queries for Debugging

### Check bookings
```bash
mongosh --eval "db.bookings.find({}).pretty()"
```

### Check messages
```bash
mongosh --eval "db.messages.find({}).pretty()"
```

### Check conversations
```bash
mongosh --eval "db.conversations.find({}).pretty()"
```

### Update booking status
```bash
mongosh --eval "db.bookings.updateOne({booking_id: 'BOOKING_ID'}, {\$set: {status: 'completed'}})"
```

## Next Steps After Testing

Based on your testing, you can:

1. **Identify bugs** - Note any issues you encounter
2. **Request features** - Suggest improvements
3. **Test edge cases** - Try unusual workflows
4. **Verify design** - Check visual consistency
5. **Test responsive** - Try on different devices
6. **Check performance** - Note any slow operations

## Quick Test Script

```bash
# Test both logins
curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"client@test.com","password":"client123"}'

curl -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@provider.com","password":"test1234"}'

# Browse providers
curl "$API_URL/api/providers"

# Get specific provider
curl "$API_URL/api/providers/PROVIDER_ID"
```

## Support

If you encounter any issues during testing:
1. Check browser console for errors
2. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
3. Verify database state with mongosh
4. Check API responses with curl
5. Clear browser cache and cookies

---

**Ready to test!** Start with the client journey to experience the full booking flow, then switch to provider account to manage incoming bookings.
