#!/usr/bin/env bash
# Build every MHO-C401/C401N target and report the delta against the stashed
# baseline (which is upstream master, i.e. what pvvx ships).
#
# Four targets: two boards x two build variants.
#   z  -> bin/     USE_ZB=0, Zigbee only, the "-z" firmware most people flash
#   zb -> bin_zb/  USE_ZB=1, dual mode Zigbee + BLE
# Both matter: the linker runs --gc-sections, so a function only reachable from
# the BLE code (show_ble_ota(), for one) is stripped entirely from the z build
# and a change to it shows no size delta there.
#
# `make clean` between targets is mandatory: the build reuses object files and
# does not track the -DBOARD define or USE_ZB, so back-to-back builds silently
# produce the previous target's firmware under the new name (visible in the
# device id of the .zigbee filename: 0201 = MHO-C401, 0208 = MHO-C401N).
#
# Usage: ./build-verify.sh [tag]        tag defaults to "wip"
#        ./build-verify.sh --baseline   rebuild the baselines from the current tree
set -euo pipefail
cd "$(dirname "$0")"

BASE_DIR=.baseline
MODE=verify
TAG="${1:-wip}"          # keep the default: /bin*/*_wip.bin is git-excluded
if [[ ${1:-} == --baseline ]]; then MODE=baseline; TAG=_base; fi

mkdir -p "$BASE_DIR"
rc=0

if [[ $MODE == verify ]]; then
    printf '%-11s %-3s %10s %10s %8s  %s\n' BOARD VAR BASELINE NEW DELTA STATUS
    printf '%s\n' "---------------------------------------------------------------------------"
fi

while read -r name board zname; do
  for usezb in 0 1; do
    if [[ $usezb == 0 ]]; then var=z; outdir=bin; else var=zb; outdir=bin_zb; fi

    # USE_ZB must be passed to clean as well as to the build: the clean target
    # expands $(OBJS), which comes from make_z/ or make_zb/ depending on it, so
    # a bare `make clean` removes only the z objects and leaves stale zb ones.
    # That silently produced a zb image carrying the previous board's id.
    # </dev/null: make would otherwise read the target list off this loop's stdin
    make -s clean USE_ZB=$usezb >/dev/null 2>&1 </dev/null
    log=/tmp/zbtlc-$name-$var.log
    if ! make -s -j8 VERSION_BIN="_$TAG" PROJECT_NAME="$name" USE_ZB=$usezb \
            POJECT_DEF="-DBOARD=$board" ZNAME="$zname" >"$log" 2>&1 </dev/null; then
        printf '%-11s %-3s %10s %10s %8s  BUILD FAILED (%s)\n' "$name" "$var" - - - "$log"
        tail -15 "$log" | sed 's/^/    /'
        rc=1
        continue
    fi

    new="$outdir/${name}_${TAG}.bin"
    base="$BASE_DIR/${name}_${var}_base.bin"

    if [[ $MODE == baseline ]]; then
        cp "$new" "$base"
        printf 'baseline %-11s %-3s %8d bytes  %s\n' "$name" "$var" \
               "$(stat -c%s "$base")" "$(sha256sum "$base" | cut -c1-16)"
        continue
    fi

    nsz=$(stat -c%s "$new")
    if [[ -f $base ]]; then
        bsz=$(stat -c%s "$base")
        if cmp -s "$base" "$new"; then
            status="identical to baseline"
        elif [[ $nsz -ne $bsz ]]; then
            # A size change shifts everything downstream, so a byte-diff count
            # says nothing useful. The size delta is the signal.
            status="changed (size differs, code shifts)"
        else
            # cmp -l exits 1 on difference; pipefail would abort the script.
            status="$( { cmp -l "$base" "$new" || true; } 2>/dev/null | wc -l) bytes differ, same size"
        fi
        printf '%-11s %-3s %10d %10d %+8d  %s\n' "$name" "$var" "$bsz" "$nsz" "$((nsz - bsz))" "$status"
    else
        printf '%-11s %-3s %10s %10d %8s  no baseline\n' "$name" "$var" - "$nsz" -
    fi
  done
done <<'TARGETS'
ZMHOC401 BOARD_MHO_C401 MiaoMiaoCe:MHO-C401-z
ZMHOC401N BOARD_MHO_C401N MiaoMiaoCe:MHO-C401N-z
TARGETS

# The build rewrites tracked bin/ and bin_zb/ files; keep the tree to source changes.
git checkout -- bin/ bin_zb/ 2>/dev/null || true
exit $rc
