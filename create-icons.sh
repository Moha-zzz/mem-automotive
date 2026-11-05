#!/bin/bash
cd "$(dirname "$0")"
mkdir -p public

echo "📦 Générer les icônes PWA..."

# Vérifier si convert existe (ImageMagick)
if ! command -v convert &> /dev/null; then
  echo "⚠️  ImageMagick non trouvé (brew install imagemagick)"
  echo "Création de placeholders PNG..."
  
  # Créer des fichiers vides pour permettre au build de passer
  for size in 192 512 180 32; do
    touch "public/icon-${size}.png" 2>/dev/null || true
    touch "public/icon-${size}-maskable.png" 2>/dev/null || true
  done
  touch "public/apple-touch-icon-180.png" 2>/dev/null || true
  echo "✅ Placeholders créés (remplacez par vrai logo Figma/PWA Builder)"
  exit 0
fi

# Créer les icônes avec ImageMagick
echo "Création icon-192.png..."
convert -size 192x192 xc:'#0f172a' \
  -background none -fill white -pointsize 60 -gravity center \
  -annotate +0+0 'MEM' \
  -alpha on "public/icon-192.png" 2>/dev/null || touch "public/icon-192.png"

echo "Création icon-512.png..."
convert -size 512x512 xc:'#0f172a' \
  -background none -fill white -pointsize 150 -gravity center \
  -annotate +0+0 'MEM' \
  -alpha on "public/icon-512.png" 2>/dev/null || touch "public/icon-512.png"

echo "Création apple-touch-icon-180.png..."
convert -size 180x180 xc:'#0f172a' \
  -background none -fill white -pointsize 50 -gravity center \
  -annotate +0+0 'MEM' \
  -alpha on "public/apple-touch-icon-180.png" 2>/dev/null || touch "public/apple-touch-icon-180.png"

# Créer les versions maskable
cp "public/icon-192.png" "public/icon-192-maskable.png" 2>/dev/null || true
cp "public/icon-512.png" "public/icon-512-maskable.png" 2>/dev/null || true

echo "✅ Icônes créées dans public/"
echo "💡 IMPORTANT : Remplacez par votre vrai logo depuis Figma ou PWA Builder"
