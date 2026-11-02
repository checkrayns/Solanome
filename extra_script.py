import os
import re
import gzip
import hashlib
import shutil
Import("env")

SOURCECODE = "./MaxPV3/maxpv_defines.h"
WEB_DIR    = "./MaxPV3/data"
WEB_HEADER = "./MaxPV3/web_files.h"

# Fichiers du répertoire data non intégrés au firmware
# versionweb.txt : la version du site est intégrée sous forme de chaîne (WEB_VERSION)
WEB_EXCLUDED = { "versionweb.txt" }

MIME_TYPES = {
    ".html": "text/html",
    ".css":  "text/css",
    ".js":   "application/javascript",
    ".ico":  "image/png",
    ".png":  "image/png",
    ".svg":  "image/svg+xml",
    ".txt":  "text/plain",
}

# Search Version
version = ""
file1 = open(SOURCECODE, 'r')
Lines = file1.readlines()

count = 0
# Strips the newline character
for line in Lines:
    match = re.search(r"^#define\s+MAXPV_VERSION\s+.(.*).\s*$", line)
    if match:
        version = match.group(1)
        file1.close
        break

if version == "":
    raise Exception(f"No version found in {SOURCECODE}")

# Rename binary according to environnement/board
env.Replace(ESP8266_FS_IMAGE_NAME=f"Solanome{version}_filesystem")
env.Replace(PROGNAME=f"Solanome{version}_firmware")


# Après chaque compilation du firmware, le fichier .elf (programme avec ses symboles) est copié
# dans le répertoire des binaires : il permet de retrouver avec addr2line la fonction en cause
# dans un plantage, à partir des adresses publiées sur maxpv/SYS/lastCrash (README, Analyser un plantage)
BINARIES_DIR = "Binaires Solanome"

def copy_elf(source, target, env):
    elf = env.subst("$BUILD_DIR/${PROGNAME}.elf")
    binaries = os.path.join(env.subst("$PROJECT_DIR"), BINARIES_DIR)
    if os.path.isfile(elf) and os.path.isdir(binaries):
        destination = os.path.join(binaries, f"Solanome{version}_firmware.elf")
        shutil.copyfile(elf, destination)
        print(f"{BINARIES_DIR}/Solanome{version}_firmware.elf copié")

env.AddPostAction("$BUILD_DIR/${PROGNAME}.bin", copy_elf)


# Génération de web_files.h : les fichiers du site Web sont intégrés au firmware,
# compressés en gzip, pour que la mise à jour ne nécessite que le binaire du firmware
# et ne touche pas au filesystem qui contient la configuration
def generate_web_files():
    with open(os.path.join(WEB_DIR, "versionweb.txt"), "r", encoding="utf-8") as f:
        web_version = f.read().strip()

    names = sorted(n for n in os.listdir(WEB_DIR)
                   if os.path.isfile(os.path.join(WEB_DIR, n)) and n not in WEB_EXCLUDED)

    # Empreinte des fichiers partagés (css, js...) : les pages les appellent par app.css?v=__ASSETS__,
    # le navigateur les conserve en cache et l'empreinte change dès que l'un d'eux est modifié,
    # même sans changement du numéro de version
    assets = hashlib.sha1()
    for name in names:
        if not name.endswith(".html"):
            with open(os.path.join(WEB_DIR, name), "rb") as f:
                assets.update(name.encode() + b"\0" + f.read())
    assets_token = assets.hexdigest()[:10].encode()

    out = []
    out.append("// Fichier généré automatiquement par extra_script.py à partir de MaxPV3/data")
    out.append("// NE PAS MODIFIER : modifier les fichiers de MaxPV3/data puis recompiler")
    out.append("")
    out.append("#pragma once")
    out.append("")
    out.append(f"#define WEB_VERSION \"{web_version}\"")
    out.append("")
    out.append("// Fichier du site Web compressé en gzip")
    out.append("struct webFile")
    out.append("{")
    out.append("  const char*    path;   // URL du fichier")
    out.append("  const char*    mime;   // type MIME")
    out.append("  const uint8_t* data;   // contenu compressé en PROGMEM")
    out.append("  size_t         len;    // taille du contenu compressé")
    out.append("};")
    out.append("")

    table = []
    for name in names:
        ext = os.path.splitext(name)[1].lower()
        if ext not in MIME_TYPES:
            raise Exception(f"Type MIME inconnu pour {name}")
        with open(os.path.join(WEB_DIR, name), "rb") as f:
            raw = f.read()
        if ext == ".html":
            raw = raw.replace(b"__ASSETS__", assets_token)
        # mtime=0 pour que le fichier généré ne change que si le contenu change
        data = gzip.compress(raw, compresslevel=9, mtime=0)
        var = "WEB_" + re.sub(r"[^A-Za-z0-9]", "_", name)
        out.append(f"static const uint8_t {var}[] PROGMEM = {{")
        for i in range(0, len(data), 20):
            out.append("  " + ",".join(f"0x{b:02x}" for b in data[i:i + 20]) + ",")
        out.append("};")
        out.append("")
        table.append(f"  {{ \"/{name}\", \"{MIME_TYPES[ext]}\", {var}, sizeof({var}) }},")

    out.append("static const webFile webFiles[] = {")
    out.extend(table)
    out.append("};")
    out.append("")
    out.append("#define WEB_FILES_COUNT (sizeof(webFiles) / sizeof(webFiles[0]))")
    out.append("")
    content = "\n".join(out)

    # Réécriture uniquement si le contenu a changé, pour éviter une recompilation inutile
    if os.path.exists(WEB_HEADER):
        with open(WEB_HEADER, "r", encoding="utf-8") as f:
            if f.read() == content:
                return
    with open(WEB_HEADER, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print(f"{WEB_HEADER} généré ({len(names)} fichiers)")


generate_web_files()
