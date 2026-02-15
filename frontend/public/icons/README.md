# App Icons Instructions

## You need to create app icons from your logo

Your Radio Ajay logo needs to be converted to different sizes for PWA.

### Required Icon Sizes:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

### Option 1: Use Online Tool (EASIEST)
1. Go to: https://www.pwabuilder.com/imageGenerator
2. Upload your logo (the ajayradio-logo-new10022026.png file)
3. It will generate all sizes automatically
4. Download the zip file
5. Extract and place all icons in this `/icons/` folder
6. Name them: icon-72x72.png, icon-96x96.png, etc.

### Option 2: Use ImageMagick (if you have it)
```bash
# From your logo, create all sizes:
convert logo.png -resize 72x72 icons/icon-72x72.png
convert logo.png -resize 96x96 icons/icon-96x96.png
convert logo.png -resize 128x128 icons/icon-128x128.png
convert logo.png -resize 144x144 icons/icon-144x144.png
convert logo.png -resize 152x152 icons/icon-152x152.png
convert logo.png -resize 192x192 icons/icon-192x192.png
convert logo.png -resize 384x384 icons/icon-384x384.png
convert logo.png -resize 512x512 icons/icon-512x512.png
```

### Option 3: Manual (Photoshop/GIMP)
1. Open your logo in Photoshop or GIMP
2. Resize to each size listed above
3. Export as PNG
4. Name appropriately and save in this folder

## Icon Requirements:
- Format: PNG
- Square (equal width and height)
- White or transparent background works best
- Should look good when scaled down

Once you've added the icons, the PWA will be fully functional!
