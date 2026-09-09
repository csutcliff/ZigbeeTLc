
#ifndef _ZCL_THERMOSTAT_UI_CFG_H
#define _ZCL_THERMOSTAT_UI_CFG_H

/*********************************************************************
 * CONSTANTS
 */
/**
 *  @brief	thermostatu UI configuration cluster Attribute IDs
 */
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_TEMPERATUREDISPLAYMODE         0x0000
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_KEYPADLOCKOUT                  0x0001
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_SCHEDULEPROGRAMMINGVISIBILITY  0x0002

#define ZCL_THERMOSTAT_UI_CFG_ATTRID_OFFSET_TEMP		0x0100
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_OFFSET_HUMI		0x0101
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_COMFORT_MIN_T		0x0102
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_COMFORT_MAX_T		0x0103
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_COMFORT_MIN_H		0x0104
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_COMFORT_MAX_H		0x0105
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_DISPLAY_OFF		0x0106

#define ZCL_THERMOSTAT_UI_CFG_ATTRID_MEASURE_INTERVAL	0x0107

#define ZCL_THERMOSTAT_UI_CFG_ATTRID_TRIGGER_TRH_T		0x0110
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_TRIGGER_HST_T		0x0111
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_TRIGGER_TRH_H		0x0112
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_TRIGGER_HST_H		0x0113

/* E-paper anti-ghosting refresh, MHO-C401 and MHO-C401N.
 * MODE selects what a refresh does, CNT how many display updates apart they
 * are. CNT 0 also disables it. Both are persisted with the rest of this
 * cluster's config. */
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_EPD_REFRESH_MODE	0x0120
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_EPD_REFRESH_CNT	0x0121
/* Read-only: display updates since the last refresh, so the interval can be
 * chosen from what the panel actually does rather than guessed. */
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_EPD_UPDATES		0x0122
/* Write non-zero to force a refresh now. Self-clearing, never persisted. */
#define ZCL_THERMOSTAT_UI_CFG_ATTRID_EPD_REFRESH_NOW	0x0123
/* The EPD_REFRESH_* mode values live in lcd.h, next to the display state, so
 * that the drivers can see them without pulling in the ZCL headers. */


status_t zcl_thermostat_ui_cfg_register(u8 endpoint, u16 manuCode, u8 attrNum, const zclAttrInfo_t attrTbl[], cluster_forAppCb_t cb);
nv_sts_t zcl_thermostatConfig_save(int init);
//nv_sts_t zcl_thermostatConfig_restore(void);

#endif	/* _ZCL_THERMOSTAT_UI_CFG_H */

