# Resort Dynamic Pricing System - Pages Documentation

## Complete List of Pages and Functions

---

## 1. Dashboard
**Purpose:** Main analytics and forecasting overview

### Functions:
- **Monthly Forecast**: Displays projected revenue, profit, and occupancy for the current month
- **Revenue by Room Type**: Shows revenue breakdown by each room type
- **Season Mix Analysis**: Visualizes distribution of bookings across LOW/MID/HIGH seasons
- **Average Package Profit by Month**: Tracks profit trends over time
- **Daily Occupancy**: Shows occupancy rates day by day
- **Export to CSV**: Download all dashboard data
- **Auto-refresh**: Updates data automatically when resort changes

### Key Metrics Displayed:
- Total projected revenue
- Total projected profit
- Occupancy percentage
- Revenue per room type
- Seasonal distribution

---

## 2. Overhead
**Purpose:** Manage monthly overhead costs and allocation methods

### Functions:
- **View Overhead by Month**: Browse and edit overhead costs for any month
- **Monthly Overhead Entry**: Input total monthly overhead costs
- **Automatic Daily Calculation**: Calculates daily overhead from monthly total
- **Allocation Mode Settings**:
  - Per Room Day: Distribute overhead across room-nights
  - Fixed Per Package: Apply fixed amount to each package
- **Per Room Day Calculation**: Set how much overhead to allocate per room per night
- **Fixed Per Package Amount**: Set flat overhead amount per booking
- **Notes Field**: Add custom notes for each month
- **Historical View**: See past overhead entries

### Data Tracked:
- `overhead_monthly`: Total monthly overhead
- `overhead_daily`: Daily overhead amount
- `overhead_per_room_day`: Overhead per room per night
- `allocation_mode`: How overhead is distributed
- `fixed_per_package`: Fixed amount per package

---

## 3. Expenses
**Purpose:** Track and manage all resort expenses with receipt storage

### Functions:
- **Add New Expense**: Create expense records with details
- **Month Filter**: View expenses by specific month
- **Category Filter**: Filter by expense categories
- **Upload Receipts**: Attach bill/receipt images to expenses
- **View Receipts**: Display attached receipt images
- **Monthly Summary**: Calculate totals by category
- **Expense Categories**:
  - Utilities
  - Salary
  - Maintenance
  - Fuel
  - Boat Vendor
  - Supplies
  - Marketing
  - Tax
  - Rent
  - Insurance
  - Miscellaneous
- **Payment Tracking**: Track payment method and status
- **Edit/Delete Expenses**: Modify or remove expense records
- **Export to CSV**: Download expense report

### Data Tracked:
- Date, vendor, category
- Subtotal, tax, total amount
- Payment method and status
- Reference number
- Attached receipt files

---

## 4. Cost & Price
**Purpose:** Set base costs and prices for rooms, meals, and activities

### Functions:
- **Year Selection**: Manage rates for specific years
- **Room Base Rates**:
  - Set cost per night for each room type
  - Set base price per night for each room type
- **Meal Plans Configuration**:
  - Breakfast (BO): Cost and price per person
  - Lunch (LO): Cost and price per person
  - Dinner (DO): Cost and price per person
- **Activities Configuration**:
  - 3 Islands Tour: Cost per trip + cost per person, price per person
- **Boat Transfer Settings**:
  - Return trip cost
  - Price per adult
  - Price per child
- **Quick Paste**: Bulk update rates from clipboard
- **CSV Import/Export**: Import and export rate sheets
- **Composite Calculation**: Shows how individual items combine into packages
- **Change Tracking**: Highlights unsaved changes
- **Undo Changes**: Revert to last saved state
- **Backup/Restore**: Save meal plan configurations

### Pricing Config:
- `boat_cost_return_trip`: Boat transfer cost
- `price_boat_adult`: Boat price per adult
- `price_boat_child`: Boat price per child
- `cost_activities_3i`: Activities cost per person
- `activities_3i_cost_trip`: Fixed trip cost for activities
- `price_activities_3i`: Activities price per person

---

## 5. Seasons
**Purpose:** Define seasonal periods and pricing multipliers

### Functions:
- **Year Selection**: Manage seasons for specific years
- **Season Calendar View**: Visual 12-month calendar showing season assignments
- **Create Season Ranges**: Define date ranges for LOW/MID/HIGH seasons
- **Season Settings**:
  - LOW Season: Percentage adjustment (e.g., -10%)
  - MID Season: Percentage adjustment (e.g., 0%)
  - HIGH Season: Percentage adjustment (e.g., +30%)
- **Round to RM5**: Toggle rounding prices to nearest RM5
- **Season Range Management**:
  - Add new season ranges
  - Delete season ranges
  - View all ranges in table
- **Visual Calendar**: Color-coded calendar showing season assignments
- **Description Notes**: Add notes for each season range
- **Automatic Price Calculation**: Multipliers automatically adjust package prices

### Season Types:
- **LOW**: Typically 10% discount
- **MID**: Base price (no adjustment)
- **HIGH**: Typically 30% premium

---

## 6. Rates Calendar
**Purpose:** View calculated daily rates across room types and seasons

### Functions:
- **Date Range Views**: Switch between 7, 14, or 31 day views
- **Room Type Filter**: View all rooms or specific room type
- **Date Navigation**:
  - Previous/Next day
  - Previous/Next week
  - Jump to today
- **Daily Rate Display**: Shows price for each room type per day
- **Season Color Coding**: Visual indication of LOW/MID/HIGH seasons
- **Adjust Prices**: Click any cell to manually adjust specific date prices
- **Price Override**: Override system-calculated prices for specific dates
- **Bulk Price Adjustment**: Adjust multiple dates at once
- **Rate Comparison**: Compare rates across room types

### Display Information:
- Daily rates by room type
- Season classification
- Base price vs. adjusted price
- Manual overrides

---

## 7. Promos & Surcharges
**Purpose:** Create promotional discounts and additional charges

### Functions:

#### Promotions Tab:
- **Create Promotions**: Define discount campaigns
- **Promotion Settings**:
  - Name and description
  - Date range (start/end)
  - Target season (any, LOW, MID, HIGH)
  - Discount type: Percentage off OR fixed amount per pax
  - Minimum days in advance booking required
  - Applies to: All packages, specific package, or room type
  - Weekday restrictions (e.g., only Mon-Thu)
- **Toggle Active/Inactive**: Enable/disable promotions
- **Edit Promotions**: Modify existing promotions
- **Delete Promotions**: Remove promotions

#### Surcharges Tab:
- **Create Surcharges**: Add extra charges
- **Surcharge Settings**:
  - Same configuration as promotions but adds cost instead
  - Peak period surcharges
  - Holiday surcharges
  - Special event pricing
- **Preview Pricing**: Test how promos/surcharges affect specific bookings

### Conditions Supported:
- Date ranges
- Advance booking requirements
- Season targeting
- Package/room type targeting
- Weekday restrictions

---

## 8. Package Setup
**Purpose:** Configure which packages are available

### Functions:
- **View All Packages**: See all configured package types
- **Create Custom Packages**: Define new package combinations
- **Package Configuration**:
  - Package code (e.g., RB, FB, RB3I)
  - Package name (display name)
  - Includes room: Yes/No
  - Includes breakfast: Yes/No
  - Includes lunch: Yes/No
  - Includes dinner: Yes/No
  - Includes boat transfer: Yes/No
  - Includes activities (3 Islands): Yes/No
- **Toggle Active/Inactive**: Enable/disable packages
- **Sort Order**: Arrange package display order
- **Delete Packages**: Remove package configurations

### Standard Packages:
- **RB**: Room & Breakfast
- **RBB**: Room + Breakfast + Boat
- **RB3I**: Room + Breakfast + 3 Islands
- **FB**: Fullboard (B,L,D) + Boat
- **FB3I**: Fullboard + Boat + 3 Islands

---

## 9. Packages (Package Pricing Matrix)
**Purpose:** View calculated package prices across all combinations

### Functions:
- **Year Selection**: View prices for specific year
- **Nights Selector**: Choose 1, 2, 3, or 4 nights (NEW!)
  - Simulates 2D1N, 3D2N, 4D3N, 5D4N packages
  - Room and meals multiply by nights
  - Boat and activities remain one-time charges
- **Pax Options**: Select which pax counts to display (1-6 people)
- **Package Display**: Shows all package types with variants
- **Price Matrix**: Grid showing prices by room type and season
- **Expandable Sections**: Click to expand/collapse each package type
- **Cell Details**: Click any cell to see detailed breakdown
- **Detailed Breakdown Shows**:
  - Room cost and price
  - Meal cost and price
  - Boat cost and price
  - Activities cost and price
  - Total cost
  - Selling price
  - Profit per person
  - Profit margin percentage
- **Export to CSV**: Download complete pricing matrix
- **Refresh**: Recalculate all prices
- **Dynamic Calculation**: Prices update with nights selection

### Price Calculations:
- Combines base rates + season multiplier + meals + boat + activities
- Divides room cost among pax
- Applies overhead allocation
- Includes promos and surcharges
- Multiplies room and meals by nights
- Boat and activities charged once

---

## 10. Bookings
**Purpose:** Manage reservations and occupancy calendar

### Functions:
- **Calendar View**: Visual booking grid by room type and date
- **View Period**: Switch between 7, 14, or 31 day views
- **Date Navigation**: Browse forward/backward through dates
- **Create New Booking**: Click empty cell to add booking
- **View Booking Details**: Click booking to see full details
- **Booking Form**:
  - Guest information (name, email, phone)
  - Check-in and check-out dates
  - Number of nights
  - Adults and children count
  - Room type selection
  - Package selection
  - Special requests
- **Price Calculation**: Automatic price calculation based on dates and package
- **Booking Status**: Confirmed, Pending, Cancelled
- **Payment Status**: Paid, Partial, Unpaid
- **Edit Bookings**: Modify existing reservations
- **Cancel Bookings**: Mark bookings as cancelled
- **Occupancy View**: See which rooms are occupied
- **Color-Coded Status**: Visual indication of booking and payment status

### Booking Information Tracked:
- Guest details
- Dates and nights
- Room type and package
- Pricing breakdown
- Payment status
- Special requests
- Booking source

---

## 11. Guests
**Purpose:** Customer relationship management and guest history

### Functions:
- **Guest Database**: Complete list of all guests
- **Search Guests**: Search by name, email, phone, or nationality
- **Guest Profile View**: Click guest to see detailed profile
- **Guest Statistics**:
  - Total stays
  - Total amount spent
  - Last check-in date
  - Nationality
- **Booking History**: View all past bookings for each guest
- **Guest Details**:
  - Contact information
  - Stay history
  - Total revenue generated
  - Average spend per stay
- **Export Guest List**: Download guest database to CSV
- **Auto-Sync**: Automatically creates guest profiles from bookings
- **Guest Ranking**: Sorted by total spent (VIP guests first)

### Guest Data:
- Name, email, phone
- Nationality
- Total stays count
- Total revenue generated
- Last visit date
- Complete booking history

---

## 12. Notifications
**Purpose:** Track automated guest communications

### Functions:
- **Notification Log**: View all sent notifications (last 30 days)
- **Filter by Status**:
  - All notifications
  - Sent successfully
  - Queued (pending)
  - Failed
- **Notification Details**:
  - Guest name
  - Sent to (email/phone)
  - Method (email, SMS, WhatsApp)
  - Subject and body
  - Sent timestamp
  - Status
- **Resend Failed Notifications**: Retry sending failed messages
- **Method Icons**: Visual indicators for email/SMS/WhatsApp
- **Status Color Coding**: Green (sent), Yellow (queued), Red (failed)
- **Linked to Bookings**: See which booking triggered each notification
- **Auto-Refresh**: Update list periodically

### Notification Types:
- Booking confirmation
- Check-in reminders
- Payment reminders
- Booking modifications
- Cancellation notices

---

## 13. User Management
**Purpose:** Control user access and roles (Admin only)

### Functions:
- **View All Users**: See all users with resort access
- **Add New User**:
  - Search by email (user must be registered first)
  - Assign role: Admin or Account
  - Set resort access
- **User Roles**:
  - **Admin**: Full access to all features
  - **Account**: Limited to accounting/reporting features
- **Change User Roles**: Update user permissions
- **Remove Users**: Revoke resort access
- **Self-Protection**: Cannot remove yourself or change your own role
- **Role Indicators**: Visual icons (Shield for Admin, Dollar for Account)
- **User Info Display**:
  - Email address
  - Current role
  - Date added
- **Permission Control**: Only admins can access this page

### Security Features:
- Row Level Security (RLS) enforced
- Admin-only access
- Cannot modify own role
- Audit trail (created_by tracking)

---

## Summary of All Pages

| # | Page Name | Main Purpose | Key Actions |
|---|-----------|--------------|-------------|
| 1 | Dashboard | Analytics & Forecasting | View metrics, export reports |
| 2 | Overhead | Monthly Cost Allocation | Set overhead, allocation modes |
| 3 | Expenses | Expense Tracking | Add expenses, upload receipts |
| 4 | Cost & Price | Base Rates Setup | Set room/meal/activity rates |
| 5 | Seasons | Seasonal Pricing | Define seasons, set multipliers |
| 6 | Rates Calendar | Daily Rate Viewing | View rates, adjust prices |
| 7 | Promos & Surcharges | Discounts & Fees | Create promos, add surcharges |
| 8 | Package Setup | Package Configuration | Enable/disable packages |
| 9 | Packages | Pricing Matrix | View prices, export matrix |
| 10 | Bookings | Reservation Management | Create/edit bookings |
| 11 | Guests | Guest Database | Search guests, view history |
| 12 | Notifications | Communication Log | View sent messages |
| 13 | User Management | Access Control | Manage users and roles |

---

## Data Flow Between Pages

1. **Cost & Price** sets base rates
2. **Seasons** applies multipliers to base rates
3. **Promos & Surcharges** adds adjustments
4. **Overhead** allocates fixed costs
5. **Package Setup** defines what's included
6. **Packages** calculates final prices
7. **Rates Calendar** shows daily rates
8. **Bookings** creates reservations using calculated prices
9. **Guests** tracks customer relationships
10. **Notifications** communicates with guests
11. **Expenses** tracks costs
12. **Dashboard** analyzes performance
13. **User Management** controls who can access what

---

## User Roles & Permissions

### Admin Role:
- Full access to all 13 pages
- Can modify pricing and costs
- Can create and edit bookings
- Can manage users
- Can configure packages and seasons

### Account Role:
- Limited access (typically):
  - Dashboard (view only)
  - Expenses (full access)
  - Guests (view only)
  - Bookings (view/edit)
  - Notifications (view only)
- Cannot modify pricing structure
- Cannot manage users
- Cannot configure packages

---

## System Features Across All Pages

### Common Features:
- **Auto-save**: Changes save automatically
- **Export**: Most pages support CSV export
- **Responsive**: Works on desktop and tablet
- **Real-time**: Updates reflect immediately
- **Search/Filter**: Easy data finding
- **Date Selection**: Consistent date pickers
- **Resort Selection**: Switch between resorts
- **Loading States**: Visual feedback during operations

### Security:
- Row Level Security on all tables
- User authentication required
- Role-based access control
- Audit trails for changes
- Secure file uploads

### Performance:
- Optimized database queries
- Efficient data caching
- Fast price calculations
- Responsive UI updates
