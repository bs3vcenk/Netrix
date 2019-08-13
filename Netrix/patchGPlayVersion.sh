#!/bin/bash
set -e

# Patches incorrect Play services version set by AdMobFree

if [ ! -f 'platforms/android/project.properties' ]; then
    printf "=! platforms/android/project.properties does not exist\n   Run `ionic cordova platform add android` to create the android platform.\n"
    exit 1
fi
printf "=> Patching play-services-base version\n"
sed -i 's/com.google.android.gms:play-services-base:11.0.4/com.google.android.gms:play-services-base:17.0.0/' platforms/android/project.properties
printf "=> Patching play-services-ads version\n"
sed -i 's/com.google.android.gms:play-services-ads:11.0.4/com.google.android.gms:play-services-ads:17.0.0/' platforms/android/project.properties