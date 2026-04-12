#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$PROJECT_ROOT/server"
DIST_DIR="$PROJECT_ROOT/dist"
BUILD_DIR="$DIST_DIR/lambda-build"

echo "── Cleaning previous build ──"
rm -rf "$BUILD_DIR" "$DIST_DIR/lambda.zip"
mkdir -p "$BUILD_DIR"

echo "── Copying server source ──"
cp "$SERVER_DIR/package.json" "$SERVER_DIR/package-lock.json" "$BUILD_DIR/"
cp -r "$SERVER_DIR/src" "$BUILD_DIR/src"
cp -r "$SERVER_DIR/routes" "$BUILD_DIR/routes"
cp -r "$SERVER_DIR/lib" "$BUILD_DIR/lib"
cp -r "$SERVER_DIR/middleware" "$BUILD_DIR/middleware"

echo "── Installing production dependencies ──"
cd "$BUILD_DIR"
npm ci --omit=dev

echo "── Pruning unnecessary Prisma packages ──"
rm -rf "$BUILD_DIR/node_modules/@prisma/engines"
rm -rf "$BUILD_DIR/node_modules/@prisma/studio-core"
rm -rf "$BUILD_DIR/node_modules/@prisma/fetch-engine"
rm -rf "$BUILD_DIR/node_modules/@prisma/get-platform"
rm -rf "$BUILD_DIR/node_modules/@prisma/dev"
rm -rf "$BUILD_DIR/node_modules/prisma"

echo "── Creating zip ──"
cd "$BUILD_DIR"
zip -qr "$DIST_DIR/lambda.zip" .

echo "── Done ──"
ZIP_SIZE=$(du -h "$DIST_DIR/lambda.zip" | cut -f1)
echo "Lambda zip: dist/lambda.zip ($ZIP_SIZE)"
