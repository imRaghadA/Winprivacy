
import pandas as pd
import json
import re

# ==============================
# LOAD DATASET
# ==============================
df = pd.read_csv(r"E:\WinPrivacyDownloader\analysis_results_edited\apps_analysis_edited.csv") 


# ==============================
# HELPER FUNCTIONS
# ==============================

def normalize(api):
    return api.lower().strip()


def collect_all_apis(row):
    all_apis = []

    for col in row.index:
        if col.endswith("_list") and pd.notna(row[col]):
            try:
                all_apis.extend(json.loads(row[col]))
            except:
                pass

    return list(set(all_apis))  # remove duplicates


# ==============================
# IMPROVED API PATTERNS
# ==============================

API_PATTERNS = {
    "network": [
        r"wsa", r"socket", r"http", r"internet", r"dns", r"url",
        r"winhttp", r"wininet"
    ],

    "file_system": [
        r"file", r"directory", r"path", r"findfirst", r"findnext",
        r"getfile", r"setfile", r"createfile", r"readfile", r"writefile"
    ],

    "registry": [
        r"reg"
    ],

    "process": [
        r"process", r"thread", r"createprocess", r"openprocess",
        r"createthread", r"terminatethread"
    ],

    "memory": [
        r"virtual", r"heap", r"alloc", r"free", r"memory",
        r"mapview", r"unmap"
    ],

    "crypto": [
        r"crypt", r"bcrypt", r"ncrypt", r"ssl", r"cert"
    ],

    "ui": [
        r"window", r"dialog", r"messagebox", r"cursor", r"menu",
        r"paint", r"draw", r"textout"
    ],

    "audio": [
        r"wave", r"audio", r"midi", r"sound"
    ],

    "camera_video": [
        r"video", r"capture", r"media", r"mfcreate", r"directshow"
    ],

    "clipboard": [
        r"clipboard"
    ],

    "system_info": [
        r"system", r"locale", r"time", r"version",
        r"tick", r"startup", r"environment",
        r"getsystem", r"getcomputer", r"getuser",
        r"gettick", r"getlocaltime"
    ],

    "security": [
        r"token", r"privilege", r"logon", r"lsa",
        r"security", r"access", r"dpapi"
    ],

    "storage": [
        r"volume", r"device", r"drive", r"disk"
    ],

    "ipc_sync": [
        r"pipe", r"rpc", r"console", r"namedpipe",
        r"coinitialize", r"cocreateinstance"
    ],

    # NEW categories
    "runtime": [
        r"^_", r"crt", r"purecall", r"initterm",
        r"exit", r"atexit"
    ],

    "graphics": [
        r"d3d", r"dxgi", r"gdi", r"bitblt", r"stretchblt",
        r"createdc", r"getdc"
    ]
}


# ==============================
# CLASSIFICATION FUNCTIONS
# ==============================

def fallback_classify(api):
    if api.startswith("get") or api.startswith("set"):
        return "system_info"
    if api.startswith("create") or api.startswith("open"):
        return "process"
    if api.startswith("read") or api.startswith("write"):
        return "file_system"
    return "other"


def classify(api):
    api = normalize(api)

    for category in API_PATTERNS:
        for pattern in API_PATTERNS[category]:
            if re.search(pattern, api):
                return category

    return fallback_classify(api)


# ==============================
# MAIN PROCESSING
# ==============================

for index, row in df.iterrows():

    # 🔥 Merge ALL APIs
    apis = collect_all_apis(row)

    # Prepare categories
    categorized = {k: [] for k in API_PATTERNS.keys()}
    categorized["other"] = []

    # Classify APIs
    for api in apis:
        cat = classify(api)
        categorized[cat].append(api)

    # Update counts and lists
    for cat in categorized:
        df.at[index, f"api_{cat}_count"] = len(categorized[cat])
        df.at[index, f"api_{cat}_list"] = json.dumps(categorized[cat])

    # 🔥 IMPORTANT: fix total count
    df.at[index, "api_total_count"] = len(apis)


# ==============================
# SAVE CLEAN DATASET
# ==============================

df.to_csv("fixed_dataset_v2.csv", index=False)

print("✅ Dataset cleaned successfully → fixed_dataset_v2.csv")
