/*
 * The SDK's stack/zigbee/ota/ota.c, built in its place with a larger image
 * block. See src/patch_z_sdk/ota.c for why and for the size limit.
 */
#include "zb_common.h"
#include "zcl_include.h"
#include "ota.h"

#undef OTA_IMAGE_MAX_DATA_SIZE
#define OTA_IMAGE_MAX_DATA_SIZE		64

#include "stack/zigbee/ota/ota.c"
