# Browse Page - Updated with Gender Filters

## Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                         Header (Floating)                        │
│  Lumière                    Browse | Dashboard | Messages       │
└─────────────────────────────────────────────────────────────────┘

                    Discover Excellence
                  (5xl, Playfair Display)

        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ FEMALE   │  │   MALE   │  │  TRANS   │  ← New Gender Filters
        └──────────┘  └──────────┘  └──────────┘
          (Toggleable, champagne gold when active)

┌────────────────────────────────────────┐ ┌────┐ ┌─────────┐
│ 🔍  Search by city...                  │ │ ⚙️  │ │ Search  │
└────────────────────────────────────────┘ └────┘ └─────────┘
  ↑ Fixed alignment: icon + 8px padding

[If filters expanded]
┌─────────────────────────────────────────────────────────────────┐
│  Service Type    |    Min Rate ($/hr)    |    Max Rate ($/hr)   │
│  ____________       _______________          _______________     │
└─────────────────────────────────────────────────────────────────┘

         [Grid of 30 Provider Cards - 6 columns]
┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│ 1  │ │ 2  │ │ 3  │ │ 4  │ │ 5  │ │ 6  │
└────┘ └────┘ └────┘ └────┘ └────┘ └────┘
   ...continuing for 30 profiles...
```

## Changes Made

### 1. Gender Filter Buttons (NEW)
**Location:** Between page title and search bar

**Design:**
- 3 buttons: Female, Male, Trans
- Default state: Transparent with gray border (#3F3F46)
- Active state: Champagne gold border (#C6A87C) with 10% opacity background
- Hover state: Border turns gold, text brightens
- Uppercase tracking with medium font weight
- Padding: 8px horizontal, 3px vertical

**Behavior:**
- Toggle on/off (clicking same button deselects)
- Only one can be active at a time
- Filters will be ready for backend integration when gender field is added to profiles

### 2. Search Icon Alignment (FIXED)
**Before:** 
```css
position: absolute
left: 0
top: 50%
translate: -50%
size: 24px
```

**After:**
```css
position: absolute
left: 0
size: 20px
/* Vertically centered via flex on parent */
```

**Parent container:**
- Now uses `flex items-center` for proper vertical alignment
- Icon no longer needs transform translate
- Input padding reduced from `pl-12` to `pl-8` for better spacing

## Visual Hierarchy

1. **Page Title** - Largest, centered, Playfair Display
2. **Gender Filters** - Medium prominence, interactive buttons
3. **Search Bar** - Full width with icon, prominent but subtle
4. **Profile Grid** - Main content, 6-column responsive layout

## Interaction States

### Gender Filters:
- **Default:** Gray border, muted text
- **Hover:** Gold border, brighter text
- **Active:** Gold border, gold text, light gold background
- **Transition:** 300ms ease for smooth state changes

### Search Input:
- **Icon:** Fixed 20px, positioned at left edge
- **Input:** 8px left padding for icon clearance
- **Focus:** Gold bottom border (via input-premium class)

## Responsive Behavior

Gender filter buttons remain in a single row on all screen sizes with appropriate spacing maintained through gap-4 (16px).

## Technical Implementation

**State Management:**
```javascript
const [filters, setFilters] = useState({
  city: '',
  service: '',
  min_rate: '',
  max_rate: '',
  gender: ''  // New field
});
```

**Gender Toggle Logic:**
```javascript
onClick={() => setFilters({ 
  ...filters, 
  gender: filters.gender === 'female' ? '' : 'female' 
})}
```

## Future Backend Integration

To make gender filters functional:
1. Add `gender` field to ProviderProfile model (enum: 'female', 'male', 'trans')
2. Update seed script to assign genders
3. Update `/api/providers` endpoint to filter by gender when query param present
4. Current UI is ready - no frontend changes needed

## Color Palette Used

- **Primary Gold:** #C6A87C (borders, active text)
- **Dark Background:** #0A0A0C
- **Card Background:** #141416
- **Border Default:** #3F3F46
- **Text Muted:** #A1A1AA
- **Text Primary:** #F2F0ED
