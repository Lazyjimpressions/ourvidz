
# Plan: Match PortraitTile to MobileCharacterCard

## Problem
The same image displays correctly on the Roleplay page (MobileCharacterCard) but appears "zoomed in" on the Character Studio portrait grid (PortraitTile) on mobile.

## Root Cause
PortraitTile has extra CSS that conflicts on mobile:
- Duplicate inline `style={{ objectFit: 'cover', objectPosition: 'center' }}`
- Extra `object-center` class
- `onError` handler that may trigger re-renders

MobileCharacterCard uses simple, minimal styling that works.

## Solution
Make PortraitTile's `<img>` element match MobileCharacterCard exactly.

## Changes

### File: `src/components/shared/PortraitTile.tsx`

**Current (lines 82-89):**
```tsx
<img
  src={displayUrl}
  alt={alt}
  className="w-full h-full object-cover object-center"
  style={{ objectFit: 'cover', objectPosition: 'center' }}
  loading="lazy"
  onError={() => setHasError(true)}
/>
```

**Change to:**
```tsx
<img 
  src={displayUrl} 
  alt={alt}
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

This removes:
- The `object-center` class
- The inline `style` override
- The `onError` handler (keep error state but rely on natural image failure)

Also remove the `hasError` state since we're removing the error handler:
- Remove `const [hasError, setHasError] = useState(false);`
- Remove `setHasError(false);` in useEffect
- Simplify conditional from `displayUrl && !hasError` to just `displayUrl`

## Summary
One file change to make the image rendering identical to what works on Roleplay.
