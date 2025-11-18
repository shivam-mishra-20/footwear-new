# User Creation Script - Setup Guide

## Overview

This script allows you to create new admin users for the Noble Footwear Management System from the command line.

## Prerequisites

### 1. Install Firebase Admin SDK

```bash
npm install firebase-admin --save-dev
```

### 2. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **footwear-fossip**
3. Click the gear icon (⚙️) → **Project Settings**
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Save the downloaded JSON file as `serviceAccountKey.json` in the `scripts/` folder

**⚠️ IMPORTANT:** Add `serviceAccountKey.json` to your `.gitignore` to keep credentials secure!

## File Structure

```
scripts/
├── create-admin.js
├── serviceAccountKey.json  ← Place your Firebase key here
└── README.md
```

## Usage

### Interactive Mode (Recommended)

Run the script without arguments for a guided experience:

```bash
node scripts/create-admin.js
```

You'll be prompted to enter:

- Email address
- Password (min 6 characters)
- Role (admin/manager/staff)

### Command Line Mode

Provide all details as arguments:

```bash
node scripts/create-admin.js <email> <password> <role>
```

**Examples:**

```bash
# Create admin user
node scripts/create-admin.js admin@example.com SecurePass123 admin

# Create manager user
node scripts/create-admin.js manager@example.com Pass1234 manager

# Create staff user
node scripts/create-admin.js staff@example.com MyPass456 staff
```

## User Roles

- **admin**: Full access to all features
- **manager**: Can manage inventory and view reports
- **staff**: Basic access to sales and inventory

## Security Notes

1. **Service Account Key**: Never commit `serviceAccountKey.json` to version control
2. **Strong Passwords**: Use passwords with at least 6 characters (Firebase minimum)
3. **Email Verification**: Users are created with `emailVerified: false` - they can verify later
4. **Production Use**: Consider using environment variables for production deployments

## Troubleshooting

### Error: Cannot find module 'firebase-admin'

```bash
npm install firebase-admin --save-dev
```

### Error: Cannot find module './serviceAccountKey.json'

- Ensure you've downloaded the service account key from Firebase Console
- Place it in the `scripts/` folder
- Verify the filename is exactly `serviceAccountKey.json`

### Error: Invalid email address

- Email must be properly formatted (e.g., user@example.com)

### Error: Password must be at least 6 characters

- Firebase requires minimum 6 characters for passwords

### Error: Role must be one of: admin, manager, staff

- Only these three roles are supported
- Role names are case-insensitive

## What the Script Does

1. ✅ Creates user in Firebase Authentication
2. ✅ Adds user document to Firestore `Users` collection
3. ✅ Sets user role (admin/manager/staff)
4. ✅ Adds creation timestamp
5. ✅ Displays success confirmation with user details

## Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Noble Footwear - User Creation Script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📧 Enter email address: admin@example.com
🔐 Enter password (min 6 characters): SecurePass123
👤 Enter role (admin/manager/staff) [default: admin]: admin

⚠️  Create user with email "admin@example.com" and role "admin"? (yes/no): yes

🔄 Creating user account...
✅ User created in Authentication: abc123xyz456
✅ User added to Firestore with role: admin

✨ User created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email: admin@example.com
🔐 Password: SecurePass123
👤 Role: admin
🆔 UID: abc123xyz456
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Next Steps

After creating a user:

1. User can log in at your application's login page
2. Their role determines which features they can access
3. You can manage users further through Firebase Console if needed
