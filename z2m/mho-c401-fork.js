// Zigbee2MQTT external converter for the MHO-C401 / MHO-C401N running this
// fork of ZigbeeTLc.
//
// Why a fingerprint and not just zigbeeModel:
//   Z2M already ships a built-in definition for these devices, matched on
//   zigbeeModel (src/devices/zigbeetlc.ts, model "MHO-C401"). A definition with
//   a `fingerprint` takes precedence over one matched by `zigbeeModel`, so this
//   file adds the extra controls ONLY for devices whose softwareBuildID says
//   they run this firmware. A device still on pvvx's build keeps the built-in
//   definition and shows none of them.
//
//   The marker is set in src/app_cfg.h as ZCL_BASIC_SW_BUILD_ID and reported as
//   ZCL Basic attribute 0x4000. It is deliberately a fixed string: Z2M compares
//   softwareBuildID exactly, so encoding the version in it would break the
//   fingerprint on every build.
//
// Install: copy to the Zigbee2MQTT data directory and add to configuration.yaml
//
//   external_converters:
//     - mho-c401-fork.js
//
// then restart Z2M. If the device was interviewed before the fork was flashed,
// re-interview it so Z2M re-reads softwareBuildID, otherwise the fingerprint
// will not match and you will keep the built-in definition.

const {Zcl} = require('zigbee-herdsman');
const m = require('zigbee-herdsman-converters/lib/modernExtend');

const SW_BUILD_ID = 'c401fork-0001';

// Everything the built-in definition exposes, reproduced so that this
// definition is a superset rather than a replacement that loses features.
const base = {
    enableDisplay: m.binary({
        name: 'enable_display',
        valueOn: [true, 0],
        valueOff: [false, 1],
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0106, type: Zcl.DataType.ENUM8},
        description: 'Whether to enable the device display.',
    }),
    temperatureDisplayMode: m.enumLookup({
        name: 'temperature_display_mode',
        lookup: {celsius: 0, fahrenheit: 1},
        cluster: 'hvacUserInterfaceCfg',
        attribute: 'tempDisplayMode',
        description: 'The unit of the temperature displayed on the device screen.',
    }),
    comfortSmiley: m.binary({
        name: 'comfort_smiley',
        valueOn: [true, 0],
        valueOff: [false, 1],
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0002, type: Zcl.DataType.ENUM8},
        description: 'Whether to show a comfort indicator on the device screen.',
    }),
    comfortTemperatureMin: m.numeric({
        name: 'comfort_temperature_min',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0102, type: Zcl.DataType.INT16},
        description: 'Minimum temperature that is considered comfortable (default 20.00°C).',
        unit: '°C',
        valueMin: -50.0,
        valueMax: 120.0,
        valueStep: 0.01,
        scale: 100,
    }),
    comfortTemperatureMax: m.numeric({
        name: 'comfort_temperature_max',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0103, type: Zcl.DataType.INT16},
        description: 'Maximum temperature that is considered comfortable (default 25.00°C).',
        unit: '°C',
        valueMin: -50.0,
        valueMax: 120.0,
        valueStep: 0.01,
        scale: 100,
    }),
    comfortHumidityMin: m.numeric({
        name: 'comfort_humidity_min',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0104, type: Zcl.DataType.UINT16},
        description: 'Minimum relative humidity that is considered comfortable (default 40.00%).',
        unit: '%',
        valueMin: 0,
        valueMax: 100,
        scale: 100,
    }),
    comfortHumidityMax: m.numeric({
        name: 'comfort_humidity_max',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0105, type: Zcl.DataType.UINT16},
        description: 'Maximum relative humidity that is considered comfortable (default 60.00%).',
        unit: '%',
        valueMin: 0,
        valueMax: 100,
        scale: 100,
    }),
    temperatureCalibration: m.numeric({
        name: 'temperature_calibration',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0100, type: Zcl.DataType.INT16},
        description: 'Offset to add/subtract to the reported temperature (default 0°C).',
        unit: '°C',
        valueMin: -50.0,
        valueMax: 50.0,
        valueStep: 0.01,
        scale: 100,
    }),
    humidityCalibration: m.numeric({
        name: 'humidity_calibration',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0101, type: Zcl.DataType.INT16},
        description: 'Offset to add/subtract to the reported relative humidity (default 0%).',
        unit: '%',
        valueMin: -50.0,
        valueMax: 50.0,
        valueStep: 0.01,
        scale: 100,
    }),
    measurementInterval: m.numeric({
        name: 'measurement_interval',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0107, type: Zcl.DataType.UINT8},
        description: 'Sensor measurement interval (default 20 seconds).',
        unit: 's',
        valueMin: 3,
        // READ_SENSOR_TIMER_MAX_SEC; the firmware replaces anything above it with 20 s
        valueMax: 60,
    }),
};

// Added by this fork.
const fork = {
    // 0 off, 1 clear, 2 reset + clear. See EPD_REFRESH_* in src/lcd.h.
    epdRefreshMode: m.enumLookup({
        name: 'epd_refresh_mode',
        lookup: {off: 0, clear: 1, reset_and_clear: 2},
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0120, type: Zcl.DataType.ENUM8},
        description:
            'Anti-ghosting refresh. "clear" blanks the panel and redraws, which is what clears ' +
            'accumulated ghosting. "reset_and_clear" also resets the display controller first. ' +
            'On the older MHO-C401 the two are identical, because its init sequence always ' +
            'resets the controller.',
    }),
    epdRefreshCount: m.numeric({
        name: 'epd_refresh_count',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0121, type: Zcl.DataType.UINT16},
        description:
            'Display updates between anti-ghosting refreshes. 0 also disables it. Defaults are ' +
            '32 on the MHO-C401, matching the original Xiaomi firmware, and 1024 on the ' +
            'MHO-C401N. Lower values clear ghosting sooner at the cost of battery.',
        valueMin: 0,
        valueMax: 4096,
        valueStep: 1,
    }),
    // Read-only. Lets you run with epd_refresh_mode "off", watch for ghosting,
    // and read off how many updates it actually took before choosing a count.
    epdUpdatesSinceRefresh: m.numeric({
        name: 'epd_updates_since_refresh',
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0122, type: Zcl.DataType.UINT16},
        description:
            'Display updates since the last refresh. Saturates at 65535. Reset by a refresh, ' +
            'manual or automatic, and by a reboot.',
        access: 'STATE_GET',
    }),
    // Write-only trigger. The firmware clears it once the refresh has run, and
    // it is never written to flash.
    epdRefreshNow: m.enumLookup({
        name: 'epd_refresh_now',
        lookup: {refresh: 1},
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0123, type: Zcl.DataType.UINT8},
        description: 'Run an anti-ghosting refresh now, whatever the mode and count are set to.',
        access: 'SET',
    }),
    // Write-only trigger, firmware attribute ota_query_now. The firmware has no
    // periodic OTA query; this opens a window in which it queries, so a
    // scheduled update starts. A short press of the device button does the same.
    otaCheckNow: m.enumLookup({
        name: 'ota_check_now',
        lookup: {check: 1},
        cluster: 'hvacUserInterfaceCfg',
        attribute: {ID: 0x0124, type: Zcl.DataType.UINT8},
        description:
            'Ask the device to look for a firmware update: delivered at its next check-in ' +
            '(within 15 min), it then queries now and every 15 min for up to 6 h, or until an ' +
            'update completes. Schedule the update in Zigbee2MQTT, before or after.',
        access: 'SET',
    }),
};

const definition = {
    fingerprint: [
        {modelID: 'MHO-C401-z', softwareBuildID: SW_BUILD_ID},
        {modelID: 'MHO-C401-bz', softwareBuildID: SW_BUILD_ID},
        {modelID: 'MHO-C401N-z', softwareBuildID: SW_BUILD_ID},
        {modelID: 'MHO-C401N-bz', softwareBuildID: SW_BUILD_ID},
    ],
    // Must match Z2M's built-in model string. The frontend derives the device
    // image from it, so a distinctive name here ("MHO-C401 (c401fork)") matched
    // no known image and the device showed the generic Zigbee logo instead.
    // Nothing is lost by sharing the name: softwareBuildID, the epd_* controls,
    // and Z2M's own external-converter marker all identify which definition
    // matched.
    model: 'MHO-C401',
    vendor: 'MiaoMiaoCe',
    description: 'Temperature and Humidity Monitor (pvxx/ZigbeeTLc, csutcliff fork)',
    extend: [
        m.temperature({reporting: {min: '10_SECONDS', max: '1_HOUR', change: 10}}),
        m.humidity(),
        base.enableDisplay,
        base.temperatureDisplayMode,
        base.comfortSmiley,
        base.comfortTemperatureMin,
        base.comfortTemperatureMax,
        base.comfortHumidityMin,
        base.comfortHumidityMax,
        base.temperatureCalibration,
        base.humidityCalibration,
        base.measurementInterval,
        fork.epdRefreshMode,
        fork.epdRefreshCount,
        fork.epdUpdatesSinceRefresh,
        fork.epdRefreshNow,
        fork.otaCheckNow,
        m.battery({voltage: true}),
        // Check in every 15 min rather than the firmware's former 1 h default.
        // Z2M queues writes to these sleepy devices and delivers them when the
        // device checks in (it answers the check-in with fast poll), so the
        // check-in interval is the longest a settings change waits. The
        // firmware does not keep a written value across a reboot; configure
        // runs again after every OTA.
        {
            isModernExtend: true,
            configure: [
                async (device) => {
                    await device.getEndpoint(1).write('genPollCtrl', {checkinInterval: 15 * 60 * 4});
                },
            ],
        },
    ],
    ota: true,
};

module.exports = definition;
