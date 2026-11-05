#!/bin/bash

# 🚀 Script déploiement Vercel pour MEM AUTOMOTIVE

echo "📦 MEM AUTOMOTIVE — Ordinateur de Bord"
echo "🚀 Déploiement Vercel"
echo ""

# 1. Vérifications
if ! command -v git &> /dev/null; then
    echo "❌ Git n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

# 2. Build local
echo "🔨 Build local..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build échoué"
    exit 1
fi

# 3. Git
echo "📝 Commit et push..."
git add -A
git commit -m "Deploy v1.0.0 to Vercel"
git push origin main

echo ""
echo "✅ Prêt pour Vercel !"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Aller sur https://vercel.com"
echo "2. Importer ce repo depuis GitHub"
echo "3. Ajouter les env vars :"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "4. Deploy"
echo ""
echo "🎉 Done !"
