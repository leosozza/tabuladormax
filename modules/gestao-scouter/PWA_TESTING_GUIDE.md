# PWA Quick Testing Guide

## 🚀 Quick Start Testing

### 1. Build and Preview Locally

```bash
# Build the PWA
npm run build

# Preview locally
npm run preview
```

The app will be available at `http://localhost:4173`

### 2. Test Service Worker Registration

1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Check **Service Workers** section
4. You should see the service worker registered for `http://localhost:4173`
5. Status should show "activated and running"

### 3. Test Offline Mode

1. In Chrome DevTools → Application → Service Workers
2. Check the **Offline** checkbox
3. Navigate between pages - they should still work!
4. Open a new page you haven't visited - you'll see the offline fallback

### 4. Test Cache

1. In Chrome DevTools → Application → Cache Storage
2. You should see multiple caches:
   - `workbox-precache-*` - Static assets
   - `google-fonts-cache` - Fonts
   - `supabase-api-cache` - API responses
   - `google-storage-cache` - External images
   - `images-cache` - Image assets

### 5. Test Installation

#### Desktop (Chrome/Edge)
- Look for install icon (⊕) in address bar
- Click to install
- App opens in standalone window

#### Mobile
- **Android**: Menu → "Add to Home screen"
- **iOS**: Share → "Add to Home Screen"

### 6. Test Update Mechanism

1. Make a small change to the app
2. Run `npm run build` again
3. Reload the app in browser
4. You should see a toast notification about update
5. Click "Update" to apply new version

## 📊 Lighthouse PWA Audit

### Run Audit

1. Open Chrome DevTools (F12)
2. Go to **Lighthouse** tab
3. Select categories:
   - ✅ Performance
   - ✅ Progressive Web App
   - ✅ Best Practices
   - ✅ Accessibility
   - ✅ SEO
4. Click **Analyze page load**

### Expected PWA Checklist Results

✅ Installable
- ✅ Registers a service worker
- ✅ Web app manifest meets installability requirements
- ✅ Has a maskable icon
- ✅ Provides a valid apple-touch-icon

✅ PWA Optimized
- ✅ Service worker caches assets
- ✅ Offline page available
- ✅ Uses HTTPS (in production)
- ✅ Configured for a custom splash screen
- ✅ Sets an address-bar theme color
- ✅ Content is sized correctly for viewport
- ✅ Has a viewport meta tag

### Target Scores

- **PWA**: 100/100
- **Performance**: 90+ (depends on content/API speed)
- **Best Practices**: 95+
- **Accessibility**: 90+
- **SEO**: 95+

## 🔍 Common Issues & Quick Fixes

### Service Worker Not Registering

**Check:**
```bash
# Is build up to date?
npm run build

# Is preview server running?
npm run preview
```

**Fix:**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear cache in DevTools → Application → Clear storage

### Offline Mode Not Working

**Check in DevTools:**
1. Application → Service Workers → Status should be "activated"
2. Application → Cache Storage → Should have precache entries
3. Network tab → Verify requests are served from Service Worker

### Install Prompt Not Showing

**Requirements:**
- Must be on HTTPS (localhost is OK)
- Service worker must be registered
- Manifest must be valid
- User engagement required (some browsers)

**Quick Fix:**
- Open DevTools → Application → Manifest
- Check for any validation errors
- Try using "Add to Home screen" from browser menu

### Update Not Detected

**Force Update:**
1. DevTools → Application → Service Workers
2. Click "Unregister" on old service worker
3. Hard refresh the page
4. New service worker will register

## 📱 Device Testing Checklist

### Android (Chrome/Edge)
- [ ] Install app from browser
- [ ] App icon appears on home screen
- [ ] App opens in standalone mode
- [ ] Splash screen shows pink theme
- [ ] Offline mode works
- [ ] Cache works on subsequent visits

### iOS (Safari)
- [ ] Add to home screen works
- [ ] App icon appears on home screen
- [ ] Opens with correct theme
- [ ] Note: Limited PWA support on iOS
  - Service worker has restrictions
  - No background sync
  - Limited push notifications

### Desktop (Chrome/Edge)
- [ ] Install from address bar
- [ ] App opens in standalone window
- [ ] App shortcuts work (if implemented)
- [ ] Offline mode works
- [ ] Updates work

## 🎯 Performance Tips

### Monitoring Cache Size

```javascript
// In browser console:
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.open(name).then(cache => {
        cache.keys().then(keys => {
          console.log(`${name}: ${keys.length} entries`);
        });
      });
    });
  });
}
```

### Clear Caches (Testing)

```javascript
// In browser console:
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => caches.delete(name));
    console.log('All caches cleared');
  });
}
```

### Check Service Worker Status

```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(reg => {
    console.log('Service Worker:', reg.active?.state);
  });
});
```

## 📝 Quick Commands Reference

```bash
# Install dependencies
npm install

# Development (PWA disabled for faster iteration)
npm run dev

# Production build with PWA
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Check build size
npm run build && ls -lh dist/
```

## 🌐 Deploy & Test in Production

### Test Production URL

Once deployed:
1. Visit your production URL (must be HTTPS)
2. Open Chrome DevTools → Lighthouse
3. Run PWA audit
4. Install on mobile device
5. Test offline functionality

### Verify Deployment

Check these URLs work:
- `https://yourdomain.com/` - App loads
- `https://yourdomain.com/manifest.json` - Manifest loads
- `https://yourdomain.com/sw.js` - Service worker loads
- `https://yourdomain.com/offline.html` - Offline page loads

## ✅ Final Testing Checklist

Before declaring PWA complete:
- [ ] Lighthouse PWA score is 100/100
- [ ] Install works on desktop (Chrome/Edge)
- [ ] Install works on Android
- [ ] Add to home screen works on iOS
- [ ] Offline mode works (try disconnecting WiFi)
- [ ] Caching works (check DevTools)
- [ ] Updates work (deploy new version, see notification)
- [ ] Splash screen shows correct brand colors
- [ ] Theme color matches brand (#ec4899 pink)
- [ ] Icons are crisp on all devices
- [ ] App opens in standalone mode (no browser UI)

## 🎉 Success Criteria

Your PWA is ready when:
1. ✅ Lighthouse PWA audit shows green
2. ✅ App installs on all platforms
3. ✅ Works offline with good UX
4. ✅ Updates automatically with user notification
5. ✅ Icons and splash screens look professional
6. ✅ Loads fast (good Performance score)

---

**Pro Tip**: Test on real devices! Emulators don't always match real device behavior, especially for iOS.
