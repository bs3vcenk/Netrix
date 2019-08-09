#!/bin/bash
set -e

# Patches @ionic-native/firebase-x to allow logError() to be passed stacktraces

printf "=> Patching index.d.ts\n"
sed -i 's/logError(error: string/logError(error: string, stackTrace: any/' "node_modules/@ionic-native/firebase-x/ngx/index.d.ts"
printf "=> Patching index.js\n"
sed -i 's/FirebaseX.prototype.logError = function (error/FirebaseX.prototype.logError = function (error, stackTrace' "node_modules/@ionic-native/firebase-x/ngx/index.js"