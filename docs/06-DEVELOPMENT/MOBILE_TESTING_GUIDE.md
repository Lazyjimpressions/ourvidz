# Mobile Testing Guide

## Testing on Actual Phone

### Prerequisites
1. **Development server running**: `npm run dev` (runs on port 8080)
2. **Phone and computer on same WiFi network**
3. **Local IP address**: Your computer's local network IP

### Step 1: Find Your Computer's IP Address

**On macOS:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
```

**On Linux:**
```bash
hostname -I | awk '{print $1}'
```

**On Windows:**
```cmd
ipconfig | findstr IPv4
```

**Current IP (from last check):** `192.168.0.216`

### Step 2: Access Dev Server from Phone

1. **Ensure dev server is running:**
   ```bash
   npm run dev
   ```

2. **On your phone's browser**, navigate to:
   ```
   http://192.168.0.216:8080
   ```
   (Replace `192.168.0.216` with your actual IP)

3. **If connection fails:**
   - Check firewall settings (allow port 8080)
   - Verify phone and computer are on same WiFi network
   - Try accessing from another device on the network first

### Step 3: Open Browser Console on Phone

#### Method 1: Remote Debugging (Recommended - Full Console Access)

##### iOS (Safari) - Requires Mac + USB Cable
1. **On iPhone:**
   - Settings → Safari → Advanced → **Web Inspector** (toggle ON)

2. **Connect iPhone to Mac via USB cable**

3. **On Mac:**
   - Open Safari (not Chrome)
   - Safari menu → Preferences → Advanced → Check "Show Develop menu"
   - Safari menu → Develop → [Your iPhone Name] → [Page URL]
   - Console will open in Safari on Mac, showing logs from your iPhone

##### Android (Chrome) - Requires USB Cable
1. **On Android Phone:**
   - Settings → About Phone → Tap "Build Number" 7 times (enables Developer Options)
   - Settings → Developer Options → **USB Debugging** (toggle ON)

2. **Connect phone to computer via USB**

3. **On Computer:**
   - Open Chrome browser
   - Navigate to: `chrome://inspect`
   - Under "Remote Target", find your phone
   - Click **"Inspect"** next to the page you want to debug
   - Console opens in Chrome DevTools on computer

#### Method 2: On-Device Console (Limited - No USB Required)

##### iOS (Safari) - JavaScript Console
**Note:** iOS Safari doesn't have a built-in console, but you can:
1. Use **Eruda** (console emulator):
   - Add this bookmarklet to Safari:
   ```javascript
   javascript:(function(){var script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/eruda';document.body.appendChild(script);script.onload=function(){eruda.init()}})();
   ```
   - Tap the bookmark when on your dev site
   - Console panel appears on screen

2. **Or use Safari Web Inspector** (requires Mac + USB)

##### Android (Chrome) - JavaScript Console
**Note:** Chrome on Android doesn't show console by default, but you can:
1. Use **Eruda** (same as iOS):
   - Add bookmarklet or inject via address bar:
   ```javascript
   javascript:(function(){var script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/eruda';document.body.appendChild(script);script.onload=function(){eruda.init()}})();
   ```

2. **Or use Chrome Remote Debugging** (requires USB)

#### Method 3: Quick Log Viewing (Simplest - No Setup)

##### View Logs in Real-Time
1. **Add console viewer to your dev site:**
   Create a simple log viewer component that displays console messages on screen

2. **Or use a service like:**
   - **vConsole** (lightweight mobile console)
   - **Eruda** (full-featured mobile console)

##### Quick Setup with Eruda (No USB Required)
Add this to your `index.html` or a dev-only component:

```html
<!-- Add to index.html for development only -->
<script>
  if (window.location.hostname === '192.168.0.216' || window.location.hostname === 'localhost') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/eruda';
    document.body.appendChild(script);
    script.onload = () => eruda.init();
  }
</script>
```

This automatically shows a console on your phone when accessing via local network!

#### Method 4: WiFi Debugging (Android Only - No USB After Initial Setup)
1. **Initial setup requires USB:**
   - Enable USB Debugging (see Method 1)
   - Connect via USB once
   - In Chrome `chrome://inspect`, enable "Discover USB devices"

2. **Enable WiFi debugging:**
   - On Android: Settings → Developer Options → **Wireless debugging** (Android 11+)
   - Or use ADB: `adb tcpip 5555` then `adb connect [phone-ip]:5555`

3. **Disconnect USB** - debugging now works over WiFi

### Step 4: Test Upload Functionality

#### Reference Image Upload (Workspace)
1. Navigate to `/workspace` on mobile
2. Tap the camera/upload button
3. Select an image from phone gallery
4. Check browser console for errors:
   - Look for `📱 MOBILE: File selected` log
   - Check for `❌ MOBILE:` error messages
   - Verify `✅ MOBILE: File persisted` appears

#### Scene Image Generation (Roleplay)
1. Navigate to `/roleplay/chat/[characterId]`
2. Send a message that triggers scene generation
3. Wait for scene image to appear
4. Check console for:
   - `🎬 Scene generation requested`
   - `✅ Scene image signed via WorkspaceAssetService`
   - Any image loading errors

### Common Mobile Upload Issues

#### Issue 1: File Input Not Triggering
**Symptoms:** Tap does nothing, no file picker opens

**Solutions:**
- Check if `fileInputRef.current?.click()` is being called
- Verify file input is not disabled
- On iOS: Ensure user interaction directly triggers the click (not from async callback)

#### Issue 2: File Type Detection Fails
**Symptoms:** "Selected file is not a supported image" error

**Solutions:**
- iOS Safari often returns empty `file.type` - code uses magic byte detection
- Check console for `🔍 MOBILE: Magic byte detection` logs
- Verify `detectImageType()` function is working

#### Issue 3: HEIC Images Not Converting
**Symptoms:** HEIC images fail to upload

**Solutions:**
- Verify `heic2any` library is loaded
- Check for `🔄 MOBILE: Converting HEIC/HEIF` log
- Try converting to JPEG on device before upload

#### Issue 4: Image Fails to Load After Upload
**Symptoms:** Upload succeeds but image doesn't display

**Solutions:**
- Check signed URL generation: `✅ Scene image signed via WorkspaceAssetService`
- Verify storage bucket permissions
- Check network tab for 403/404 errors on image URLs

### Debugging Steps

1. **Enable Console Logging:**
   ```javascript
   // Already enabled in code with emoji prefixes:
   // 📱 MOBILE: - Mobile-specific logs
   // 🎬 - Scene generation logs
   // ✅ - Success logs
   // ❌ - Error logs
   ```

2. **Check Network Tab:**
   - Look for failed requests
   - Check CORS errors
   - Verify image URLs are accessible

3. **Test File Selection:**
   ```javascript
   // In browser console on phone:
   document.querySelector('input[type="file"]')?.click()
   ```

4. **Check Storage Permissions:**
   - Verify Supabase storage bucket policies
   - Check RLS policies for `workspace-temp` bucket
   - Ensure user is authenticated

### Network Configuration

**Vite Dev Server Config:**
```typescript
// vite.config.ts
server: {
  host: "::",  // Allows all network interfaces
  port: 8080,
}
```

**Firewall Rules (macOS):**
```bash
# Allow incoming connections on port 8080
sudo pfctl -f /etc/pf.conf
```

**Firewall Rules (Linux):**
```bash
# Allow port 8080
sudo ufw allow 8080/tcp
```

### Testing Checklist

- [ ] Dev server accessible from phone browser
- [ ] File picker opens when upload button tapped
- [ ] Image selection works (gallery/camera)
- [ ] File type detection works (magic bytes)
- [ ] HEIC conversion works (if applicable)
- [ ] Image uploads to Supabase storage
- [ ] Signed URLs generate correctly
- [ ] Images display after upload
- [ ] Console shows no errors
- [ ] Network requests succeed

### Alternative Testing Methods

#### 1. Browser DevTools Mobile Emulation
- Chrome DevTools → Device Toolbar
- Not as accurate as real device, but faster for initial testing

#### 2. ngrok (Public URL)
```bash
# Install ngrok
brew install ngrok  # macOS
# or download from ngrok.com

# Create tunnel
ngrok http 8080

# Use the public URL on your phone
```

#### 3. Local Network Tools
- **Fing** (mobile app): Scans network, finds devices
- **Network Analyzer**: Shows connected devices and IPs

### Troubleshooting

**Can't connect to dev server:**
1. Check IP address is correct
2. Verify both devices on same network
3. Check firewall isn't blocking port 8080
4. Try restarting dev server

**Upload button doesn't work:**
1. Check browser console for JavaScript errors
2. Verify file input element exists in DOM
3. Test with different browser (Chrome, Safari, Firefox)
4. Check if ad blockers are interfering

**Images don't display:**
1. Check Supabase storage bucket permissions
2. Verify signed URLs are generating
3. Check CORS settings
4. Test image URL directly in browser

### Next Steps

If upload still doesn't work after following this guide:
1. Check browser console logs on phone
2. Share specific error messages
3. Note which browser/OS version
4. Test with different image formats (JPEG, PNG)
5. Try smaller image files (< 1MB)

