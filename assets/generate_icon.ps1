# Generate Japanese Windows Synthetic Sphere Icon
# Step 1: Create a circle mask
& magick -size 256x256 canvas:none -fill white -draw "circle 128,128 128,8" assets/mask.png

# Step 2: Create a glossy sphere gradient (neon colors: magenta, cyan, blue, deep indigo)
& magick -size 256x256 -define radial-gradient:center=96,96 radial-gradient:#ffffff-#ff00aa-#00b4ff-#080018 assets/sphere_grad.png
& magick assets/sphere_grad.png assets/mask.png -compose DstIn -composite assets/sphere_base.png

# Step 3: Create grid lines (custom drawn for maximum compatibility) and warp them to the sphere
& magick -size 256x256 canvas:none -stroke white -strokewidth 1 -draw "line 32,0 32,256 line 64,0 64,256 line 96,0 96,256 line 128,0 128,256 line 160,0 160,256 line 192,0 192,256 line 224,0 224,256 line 0,32 256,32 line 0,64 256,64 line 0,96 256,96 line 0,128 256,128 line 0,160 256,160 line 0,192 256,192 line 0,224 256,224" assets/grid.png
& magick assets/grid.png -distort Barrel "0.0,0.0,-0.6,1.6" assets/grid_sphere.png
& magick assets/grid_sphere.png assets/mask.png -compose DstIn -composite assets/grid_masked.png

# Combine grid with sphere body (subtle screen composition)
& magick assets/sphere_base.png '(' assets/grid_masked.png -alpha set -channel A -evaluate multiply 0.4 ')' -compose Screen -composite assets/sphere_grid.png

# Step 4: Create Japanese Windows style text with neon glow
# Text: "アニメスフィア" (AnimeSphere) in Yu Gothic Bold
& magick -background none -fill "#00ffff" -font "Yu-Gothic-Bold-&-Yu-Gothic-UI-Semibold-&-Yu-Gothic-UI-Bold" -pointsize 26 -gravity center label:"アニメスフィア" -trim -bordercolor none -border 10 assets/text_base.png
& magick assets/text_base.png -background "#ff007f" -shadow 100x3+0+0 assets/text_glow.png
& magick assets/text_glow.png assets/text_base.png -compose Over -composite assets/text_final.png

# Composite the text onto the sphere
& magick assets/sphere_grid.png assets/text_final.png -gravity center -geometry +0+40 -compose Over -composite assets/icon_256.png

# Create a glossy shine overlay (top-left glare)
& magick -size 256x256 canvas:none -fill white -draw "ellipse 96,80 60,30 0,360" -blur 0x15 assets/glare.png
& magick assets/glare.png assets/mask.png -compose DstIn -composite assets/glare_masked.png
& magick assets/icon_256.png assets/glare_masked.png -compose Screen -composite assets/icon_final.png

# Clean up temp files
Remove-Item assets/mask.png, assets/sphere_grad.png, assets/sphere_base.png, assets/grid.png, assets/grid_sphere.png, assets/grid_masked.png, assets/sphere_grid.png, assets/text_base.png, assets/text_glow.png, assets/text_final.png, assets/glare.png, assets/glare_masked.png, assets/icon_256.png -ErrorAction SilentlyContinue

# Convert to various sizes
& magick assets/icon_final.png -resize 128x128 assets/icon_128.png
& magick assets/icon_final.png -resize 64x64 assets/icon_64.png
& magick assets/icon_final.png -resize 48x48 assets/icon_48.png
& magick assets/icon_final.png -resize 32x32 assets/icon_32.png
& magick assets/icon_final.png -resize 16x16 assets/icon_16.png

# Create .ico file containing all sizes for Windows support
& magick assets/icon_16.png assets/icon_32.png assets/icon_48.png assets/icon_64.png assets/icon_128.png assets/icon_final.png assets/icon.ico

# Create raw RGBA bytes file (width=256, height=256, 4 bytes per pixel) for Tao/Wry window icon
& magick assets/icon_final.png -depth 8 rgba:assets/icon.rgba

Write-Output "Assets generated successfully!"
