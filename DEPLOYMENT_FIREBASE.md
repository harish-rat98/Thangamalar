# Firebase Deployment Guide

## Prerequisites

1. **Firebase CLI**: Install globally
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project**: Create a new project at [Firebase Console](https://console.firebase.google.com)

## Setup Steps

### 1. Initialize Firebase

```bash
# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init
```

Select the following services:
- ✅ Firestore
- ✅ Functions
- ✅ Hosting

### 2. Configure Environment Variables

Create `client/.env` file:
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Get these values from Firebase Console > Project Settings > General > Your apps

### 3. Install Dependencies

```bash
# Root project dependencies
npm install

# Functions dependencies
cd functions
npm install
cd ..
```

### 4. Build and Deploy

```bash
# Build the client
npm run build

# Deploy everything
firebase deploy
```

Or deploy individually:
```bash
# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# Deploy only firestore rules
firebase deploy --only firestore
```

### 5. Enable Authentication

In Firebase Console:
1. Go to Authentication > Sign-in method
2. Enable Email/Password provider
3. Add your domain to authorized domains

### 6. Set up Firestore Security Rules

The rules are automatically deployed from `firestore.rules`. They ensure:
- Users can only access their own data
- All business data requires authentication

## Development

### Local Development with Emulators

```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, start the dev server
npm run dev
```

This runs:
- Firestore Emulator on port 8080
- Functions Emulator on port 5001
- Auth Emulator on port 9099

### Environment Variables for Development

Create `client/.env.local` for local development:
```env
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=demo-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=demo-project
VITE_FIREBASE_STORAGE_BUCKET=demo-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Deployment Options

### Option 1: Firebase Hosting (Recommended)
- **Cost**: Free tier includes 10GB storage, 1GB transfer/month
- **Features**: CDN, SSL, custom domains
- **Command**: `firebase deploy --only hosting`

### Option 2: Netlify (Alternative)
1. Build the project: `npm run build`
2. Deploy `dist/public` folder to Netlify
3. Set environment variables in Netlify dashboard
4. Configure redirects for SPA routing

### Option 3: Vercel (Alternative)
1. Connect GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `dist/public`
4. Configure environment variables

## Firebase Functions

Functions handle the backend API and are deployed to:
`https://your-region-your-project-id.cloudfunctions.net/api`

### Function Costs
- **Free tier**: 2M invocations/month, 400K GB-seconds/month
- **Paid**: $0.40 per million invocations

### Function Regions
Default region is `us-central1`. To change:
```javascript
// In functions/src/index.ts
export const api = onRequest({ region: 'asia-south1' }, app);
```

## Firestore Database

### Data Structure
```
/users/{userId}
/inventoryItems/{itemId}
/customers/{customerId}
/sales/{saleId}
/saleItems/{itemId}
/creditTransactions/{transactionId}
/expenses/{expenseId}
```

### Costs
- **Free tier**: 1GB storage, 50K reads, 20K writes, 20K deletes per day
- **Paid**: $0.18 per 100K reads, $0.18 per 100K writes

## Monitoring and Maintenance

### View Logs
```bash
# Function logs
firebase functions:log

# Real-time logs
firebase functions:log --only api
```

### Performance Monitoring
Enable in Firebase Console > Performance

### Analytics
Enable in Firebase Console > Analytics

## Security Best Practices

1. **Firestore Rules**: Never allow public read/write
2. **Environment Variables**: Never commit API keys
3. **Authentication**: Always verify tokens in functions
4. **CORS**: Configure properly for your domain
5. **Rate Limiting**: Implement in functions if needed

## Troubleshooting

### Common Issues

1. **CORS Errors**: Check Firebase Hosting configuration
2. **Auth Errors**: Verify environment variables
3. **Function Timeouts**: Increase timeout in firebase.json
4. **Build Errors**: Check TypeScript configuration

### Debug Commands
```bash
# Check Firebase project
firebase projects:list

# Test functions locally
firebase emulators:start --only functions

# Validate firestore rules
firebase firestore:rules:get
```

## Cost Optimization

1. **Use Firestore efficiently**: Minimize reads/writes
2. **Optimize functions**: Reduce execution time
3. **Cache data**: Use React Query for client-side caching
4. **Batch operations**: Group multiple writes
5. **Monitor usage**: Set up billing alerts

## Backup Strategy

1. **Firestore Export**: Schedule regular exports
2. **Code Repository**: Keep in version control
3. **Environment Config**: Document all settings
4. **Function Code**: Backup function source

This setup provides a scalable, cost-effective solution for your jewelry management system with Firebase's generous free tiers.