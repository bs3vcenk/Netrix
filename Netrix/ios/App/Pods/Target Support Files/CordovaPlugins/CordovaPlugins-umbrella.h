#ifdef __OBJC__
#import <UIKit/UIKit.h>
#else
#ifndef FOUNDATION_EXPORT
#if defined(__cplusplus)
#define FOUNDATION_EXPORT extern "C"
#else
#define FOUNDATION_EXPORT extern
#endif
#endif
#endif

#import "AFHTTPSessionManager.h"
#import "AFNetworking.h"
#import "AFNetworkReachabilityManager.h"
#import "AFSecurityPolicy.h"
#import "AFURLRequestSerialization.h"
#import "AFURLResponseSerialization.h"
#import "AFURLSessionManager.h"
#import "BinaryResponseSerializer.h"
#import "CordovaHttpPlugin.h"
#import "SDNetworkActivityIndicator.h"
#import "TextRequestSerializer.h"
#import "TextResponseSerializer.h"
#import "APPBadge.h"
#import "CDVDevice.h"
#import "CDVAssetLibraryFilesystem.h"
#import "CDVFile.h"
#import "CDVLocalFilesystem.h"
#import "APPLocalNotification.h"
#import "APPNotificationContent.h"
#import "APPNotificationOptions.h"
#import "UNNotificationRequest+APPLocalNotification.h"
#import "UNUserNotificationCenter+APPLocalNotification.h"
#import "sqlite3.h"
#import "SQLitePlugin.h"

FOUNDATION_EXPORT double CordovaPluginsVersionNumber;
FOUNDATION_EXPORT const unsigned char CordovaPluginsVersionString[];

