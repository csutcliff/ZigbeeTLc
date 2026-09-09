#!/usr/bin/env python3
"""Generate Zigbee2MQTT OTA index entries for this fork's builds.

Reads the ZCL OTA header out of the .zigbee files that `make` produces and emits
the entries for Z2M's `ota.zigbee_ota_override_index_location` file.

Python rather than the usual C#/Rust here because the repo already generates
these files with Python (make_z/zigbee_ota.py) and this only unpacks the same
header it wrote.

Usage:
    ./z2m/make-ota-index.py                 # entries as JSON, to stdout
    ./z2m/make-ota-index.py --merge FILE    # merge into an existing Z2M index
"""
import argparse
import glob
import hashlib
import json
import os
import struct
import sys

# Zigbee OTA header, ZCL spec 11.4.2. Offsets from the start of the file.
OTA_MAGIC = 0x0BEEF11E
HDR = struct.Struct("<IHHHHHIH")  # magic, hdrver, hdrlen, fieldctl, manuf, imgtype, filever, stackver

# The three boards this fork exists for.
WANTED = {
    0x0201: ("MHO-C401", ["MiaoMiaoCe"]),
    0x0208: ("MHO-C401N", ["MiaoMiaoCe"]),
    0x020a: ("LYWSD03MMC", ["Xiaomi"]),
}


def parse(path):
    with open(path, "rb") as fh:
        blob = fh.read()
    magic, _hdrver, _hdrlen, _fieldctl, manuf, imgtype, filever, _stackver = HDR.unpack_from(blob, 0)
    if magic != OTA_MAGIC:
        raise ValueError(f"{path}: not a Zigbee OTA file (magic {magic:#x})")
    return {
        "path": path,
        "manufacturerCode": manuf,
        "imageType": imgtype,
        "fileVersion": filever,
        "fileSize": len(blob),
        "sha512": hashlib.sha512(blob).hexdigest(),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bin-dir", default="bin", help="directory holding the .zigbee files")
    ap.add_argument("--merge", metavar="FILE",
                    help="existing Z2M index to merge into; entries for our imageTypes are replaced")
    ap.add_argument("--force", action="store_true",
                    help='add "force": true so Z2M offers the image even if not strictly newer')
    args = ap.parse_args()

    found = {}
    for path in sorted(glob.glob(os.path.join(args.bin_dir, "*.zigbee"))):
        try:
            info = parse(path)
        except (ValueError, struct.error) as exc:
            print(f"skipping: {exc}", file=sys.stderr)
            continue
        if info["imageType"] not in WANTED:
            continue
        # Keep only the highest fileVersion per image type; the bin directory
        # accumulates older builds.
        prev = found.get(info["imageType"])
        if prev is None or info["fileVersion"] > prev["fileVersion"]:
            found[info["imageType"]] = info

    if not found:
        sys.exit(f"no matching .zigbee files found in {args.bin_dir}/")

    entries = []
    for imgtype in sorted(found):
        info = found[imgtype]
        entry = {
            # Bare filename: Z2M resolves it relative to its data directory.
            "url": os.path.basename(info["path"]),
            "imageType": info["imageType"],
            "manufacturerCode": info["manufacturerCode"],
            "fileVersion": info["fileVersion"],
            "fileSize": info["fileSize"],
            "sha512": info["sha512"],
            "manufacturerName": WANTED[imgtype][1],
        }
        if args.force:
            entry["force"] = True
        entries.append(entry)
        v = info["fileVersion"]
        print(
            f"{WANTED[imgtype][0]:<11} imageType={imgtype} (0x{imgtype:04x})  "
            f"fileVersion={v} (0x{v:08x})  {info['fileSize']} bytes  {os.path.basename(info['path'])}",
            file=sys.stderr,
        )

    if args.merge:
        with open(args.merge) as fh:
            index = json.load(fh)
        ours = {e["imageType"] for e in entries}
        index = [e for e in index if e.get("imageType") not in ours]
        index.extend(entries)
        print(json.dumps(index, indent=4))
    else:
        print(json.dumps(entries, indent=4))


if __name__ == "__main__":
    main()
