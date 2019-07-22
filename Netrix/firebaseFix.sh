#!/bin/bash
set -e # Exit on fail

# Add support for cordova-plugin-firebasex
# Use this until PR#3106@ionic-team/ionic-native is merged

CURRDIR=$PWD

cd /tmp
printf "\n\n==> Fix for FirebaseX support through ionic-native/firebase\n    For more info check PR#3106@ionic-team/ionic-native\n"
printf "\n==> Cloning ionic-native forked repo from patryk-fuhrman\n\n"
git clone https://github.com/patryk-fuhrman/ionic-native
cd ionic-native
printf "\n==> Installing dependencies\n\n"
npm i
npm audit fix
printf "\n==> Building all packages\n\n"
npm run build
printf "\n==> Copying dist/@ionic-native/plugins/firebase-x -> $PWD/node_modules/@ionic-native/firebase-x"
cp -R "dist/@ionic-native/plugins/firebase-x" "$PWD/node_modules/@ionic-native/firebase-x"
printf "\n\n==> Support for FirebaseX added!\n\n"