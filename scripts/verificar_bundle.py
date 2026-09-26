#!/usr/bin/env python3
"""Reconstroi partes Base64 e valida o SHA-256 de referência da UI aprovada.

Se uma parte tiver um único caractere extra, recupera a representação
canônica somente quando o arquivo resultante corresponde exatamente
ao checksum registrado no README original.
"""
from pathlib import Path
import base64
import hashlib
import sys

BUNDLE = Path("approved-ui/bundle")
PARTS = sorted(BUNDLE.glob("PD_UI_FONTES_MIN.tar.bz2.part-*.b64"))
EXPECTED = "58036ab81b2203c6bc79253c60a344c48f7de803a83cb3551b6b7ef34fde9cc2"

if len(PARTS) != 11:
    sys.exit(f"ERRO: esperadas 11 partes, encontradas {len(PARTS)}")

chunks = [p.read_text(encoding="ascii").replace("\n", "").replace("\r", "") for p in PARTS]
def checksum(pieces):
    try:
        encoded = "".join(pieces)
        decoded = base64.b64decode(encoded, validate=True)
    except (ValueError, base64.binascii.Error):
        return None
    return hashlib.sha256(decoded).hexdigest()

if checksum(chunks) == EXPECTED:
    print("Bundle intacto e checksum SHA-256 validado.")
    sys.exit(0)

candidates = [(i, part) for i, part in enumerate(chunks[:-1]) if len(part) == 8001]
if len(candidates) != 1:
    sys.exit("ERRO: pacote não corresponde ao checksum; correção automática não segura.")

part_index, fragment = candidates[0]
prefix = "".join(chunks[:part_index])
suffix = "".join(chunks[part_index + 1:])
for pos in range(len(fragment)):
    if pos > 0 and fragment[pos] == fragment[pos - 1]:
        continue
    candidate = fragment[:pos] + fragment[pos + 1:]
    try:
        archive = base64.b64decode(prefix + candidate + suffix, validate=True)
    except (ValueError, base64.binascii.Error):
        continue
    if hashlib.sha256(archive).hexdigest() == EXPECTED:
        PARTS[part_index].write_text(candidate, encoding="ascii")
        print(f"Parte {PARTS[part_index].name} restaurada na posição {pos}.")
        print("Arquivo restaurado corresponde exatamente ao SHA-256 oficial.")
        sys.exit(0)

sys.exit("ERRO: não foi possível reconstruir o pacote aprovado sem divergência.")
