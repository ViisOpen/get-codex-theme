#!/usr/bin/env python3
"""Inspect PNG, JPEG, or WebP dimensions without third-party packages."""

from __future__ import annotations

import argparse
import struct
from pathlib import Path


def image_size(path: Path) -> tuple[int, int, str]:
    data = path.read_bytes()
    if data.startswith(b"\x89PNG\r\n\x1a\n") and len(data) >= 24:
        width, height = struct.unpack(">II", data[16:24])
        return width, height, "PNG"
    if data.startswith(b"\xff\xd8"):
        index = 2
        while index + 9 < len(data):
            if data[index] != 0xFF:
                index += 1
                continue
            marker = data[index + 1]
            index += 2
            if marker in {0xD8, 0xD9}:
                continue
            if index + 2 > len(data):
                break
            length = struct.unpack(">H", data[index:index + 2])[0]
            if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF} and index + 7 <= len(data):
                height, width = struct.unpack(">HH", data[index + 3:index + 7])
                return width, height, "JPEG"
            index += max(length, 2)
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        kind = data[12:16]
        if kind == b"VP8X" and len(data) >= 30:
            width = 1 + int.from_bytes(data[24:27], "little")
            height = 1 + int.from_bytes(data[27:30], "little")
            return width, height, "WebP"
        if kind == b"VP8L" and len(data) >= 25:
            bits = int.from_bytes(data[21:25], "little")
            return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1, "WebP"
        if kind == b"VP8 " and len(data) >= 30 and data[23:26] == b"\x9d\x01\x2a":
            width, height = struct.unpack("<HH", data[26:30])
            return width & 0x3FFF, height & 0x3FFF, "WebP"
    raise ValueError("unsupported or corrupt image; expected PNG, JPEG, or WebP")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("image", type=Path)
    args = parser.parse_args()
    width, height, image_type = image_size(args.image)
    ratio = width / height
    print(f"type={image_type} width={width} height={height} aspect={ratio:.4f}")
    if width < 2560 or width <= height:
        print("status=REJECT reason=source should be landscape and at least 2560px wide")
        return 1
    if abs(ratio - 1.6) > 0.08:
        print("status=REVIEW reason=source is not close to 16:10; confirm alternate crops")
        return 2
    print("status=PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
