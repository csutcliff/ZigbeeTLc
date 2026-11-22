/*
 * The SDK's zigbee/ota/ota.c, built in its place with a larger image block.
 *
 * The SDK requests 48-byte blocks, so a ~136 KB image takes ~2800 block
 * round trips, each gated by the end device's poll interval. 64 bytes cuts
 * that by a quarter. A 64-byte block is an 81-byte ZCL frame, which fits an
 * unrelayed short-address frame but not every route (the SDK's worst case
 * APS_MAXPACKET_LENGTH is 57). A route that cannot carry it fails the block,
 * the client retries, then aborts and keeps running the current image. If
 * that happens in practice, lower the value here.
 *
 * ota.h has an include guard, so defining the size before including ota.c
 * overrides the SDK's value without editing the SDK.
 */
#include "zb_common.h"
#include "zcl_include.h"
#include "ota.h"

#undef OTA_IMAGE_MAX_DATA_SIZE
#define OTA_IMAGE_MAX_DATA_SIZE		64

/* Angle brackets: a quoted "ota.c" would find this file first. The z build
 * has $(SDK_PATH)/zigbee/ota on the include path but not $(SDK_PATH). */
#include <ota.c>
