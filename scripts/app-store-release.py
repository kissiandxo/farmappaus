"""Prepare Farm Direct 1.0 in App Store Connect using the repository's signing key."""
import base64
import hashlib
import os
from pathlib import Path
import re
import sys
import time

import jwt
import requests

ROOT = Path(__file__).resolve().parents[1]
API = "https://api.appstoreconnect.apple.com"
COPY = (ROOT / "docs/APP_STORE.md").read_text()
PUBLIC = "https://github.com/kissiandxo/farmappaus/blob/18b7cbd46098a557975c15d5e7bab5fe7a4f7699/docs/"
KEY = os.environ["ASC_KEY_P8"].strip()
if "BEGIN PRIVATE KEY" not in KEY:
    KEY = base64.b64decode(KEY)


def api(method, path, *, params=None, body=None, optional=False):
    token = jwt.encode({"iss": os.environ["ASC_ISSUER_ID"], "exp": int(time.time()) + 600,
                        "aud": "appstoreconnect-v1"}, KEY, algorithm="ES256",
                       headers={"kid": os.environ["ASC_KEY_ID"]})
    response = requests.request(method, API + path, params=params, json=body, timeout=60,
                                headers={"Authorization": "Bearer " + token})
    if optional and response.status_code == 404:
        return None
    if not response.ok:
        errors = response.json().get("errors", [])
        raise RuntimeError(f"{method} {path}: " + "; ".join(
            f"{e.get('code')}: {e.get('detail', '')}" for e in errors))
    return response.json().get("data") if response.content else None


def ref(kind, id):
    return {"type": kind, "id": id}


def rel(kind, id):
    return {"data": ref(kind, id)}


def write(kind, attrs=None, relations=None, *, id=None, included=None, version="v1"):
    data = {"type": kind}
    if attrs:
        data["attributes"] = attrs
    if relations:
        data["relationships"] = relations
    body = {"data": data}
    if included:
        body["included"] = included
    if id:
        data["id"] = id
        return api("PATCH", f"/{version}/{kind}/{id}", body=body)
    return api("POST", f"/{version}/{kind}", body=body)


def app(bundle):
    return api("GET", "/v1/apps", params={"filter[bundleId]": bundle})[0]


def child(parent, name, **kwargs):
    return api("GET", f"/v1/{parent['type']}/{parent['id']}/{name}", **kwargs)


def section(title):
    return re.split(r"^## ", COPY.split(f"## {title}", 1)[1], flags=re.M)[0].split("\n", 1)[1].strip()


def localization(parent, kind, locale):
    rows = child(parent, kind)
    return next((r for r in rows if r["attributes"]["locale"] == locale), None)


def review_details(version):
    detail = child(version, "appStoreReviewDetail", optional=True)
    fields = ["contactFirstName", "contactLastName", "contactPhone", "contactEmail"]
    attrs = (detail or {}).get("attributes", {})
    if not all(attrs.get(k) for k in fields):
        versions = child(app("com.visera.Visera"), "appStoreVersions", params={"filter[platform]": "IOS"})
        for row in versions:
            saved = child(row, "appStoreReviewDetail", optional=True)
            attrs = (saved or {}).get("attributes", {})
            if all(attrs.get(k) for k in fields):
                break
        else:
            raise RuntimeError("Visera has no complete saved App Review contact accessible to this key")
    notes = section("Notes for App Review").split("> **Contact:**")[0]
    notes = re.sub(r"^> ?", "", notes, flags=re.M).replace("**", "").strip()
    values = {k: attrs[k] for k in fields}
    values.update(notes=notes, demoAccountRequired=False)
    if detail:
        write(detail["type"], values, id=detail["id"])
    else:
        write("appStoreReviewDetails", values, {"appStoreVersion": rel(version["type"], version["id"])})


def screenshots(loc):
    kind = "APP_IPHONE_67"
    sets = child(loc, "appScreenshotSets")
    group = next((x for x in sets if x["attributes"]["screenshotDisplayType"] == kind), None)
    if not group:
        group = write("appScreenshotSets", {"screenshotDisplayType": kind},
                      {"appStoreVersionLocalization": rel(loc["type"], loc["id"])})
    existing = {x["attributes"]["fileName"]: x for x in child(group, "appScreenshots")}
    for name in ("03-place-farm-shop.png", "04-place-market.png", "05-saved.png"):
        image = (ROOT / "marketing/app-store-screenshots" / name).read_bytes()
        row = existing.get(name)
        if not row:
            row = write("appScreenshots", {"fileName": name, "fileSize": len(image)},
                        {"appScreenshotSet": rel(group["type"], group["id"])})
        attrs = row["attributes"]
        if attrs["assetDeliveryState"]["state"] == "AWAITING_UPLOAD":
            for part in attrs["uploadOperations"]:
                start = part["offset"]
                resp = requests.put(part["url"], data=image[start:start + part["length"]],
                                    headers={h["name"]: h["value"] for h in part["requestHeaders"]}, timeout=60)
                if not resp.ok:
                    raise RuntimeError(f"Screenshot transfer failed for {name}: HTTP {resp.status_code}")
            write(row["type"], {"uploaded": True, "sourceFileChecksum": hashlib.md5(image).hexdigest()}, id=row["id"])
        elif attrs["assetDeliveryState"]["state"] == "FAILED":
            raise RuntimeError("Apple rejected the screenshot " + name)


def pricing(target):
    schedule = child(target, "appPriceSchedule", optional=True)
    if schedule:
        manual = child(schedule, "manualPrices", params={"include": "appPricePoint"})
        for price in manual:
            point = child(price, "appPricePoint") if price["type"] != "appPrices" else api(
                "GET", "/v3/appPricePoints/" + price["relationships"]["appPricePoint"]["data"]["id"])
            if float(point["attributes"]["customerPrice"]) != 0:
                raise RuntimeError("Existing paid schedule requires reconciliation for free launch")
        if manual:
            return
    prices = child(target, "appPricePoints", params={"filter[territory]": "AUS", "limit": 200})
    free = next(x for x in prices if float(x["attributes"]["customerPrice"]) == 0)
    local = ref("appPrices", "${free}")
    write("appPriceSchedules", relations={"app": rel("apps", target["id"]), "baseTerritory": rel("territories", "AUS"),
          "manualPrices": {"data": [local]}}, included=[{**local, "attributes": {"startDate": None},
          "relationships": {"appPricePoint": rel("appPricePoints", free["id"])}}])


def availability(target):
    current = child(target, "appAvailabilityV2", optional=True)
    if current:
        rows = api("GET", f"/v2/appAvailabilities/{current['id']}/territoryAvailabilities",
                   params={"include": "territory", "limit": 200})
        au = next((r for r in rows if r["relationships"]["territory"]["data"]["id"] == "AUS"), None)
        if au and au["attributes"]["available"]:
            return
        if au:
            write("territoryAvailabilities", {"available": True}, id=au["id"])
            return
    local = ref("territoryAvailabilities", "${australia}")
    write("appAvailabilities", {"availableInNewTerritories": False}, {"app": rel("apps", target["id"]),
          "territoryAvailabilities": {"data": [local]}}, included=[{**local, "attributes": {"available": True},
          "relationships": {"territory": rel("territories", "AUS")}}], version="v2")


def main():
    target = app("au.farmdirect.app")
    locale = target["attributes"]["primaryLocale"]
    if locale not in ("en-AU", "en-US", "en-GB"):
        raise RuntimeError("Unexpected primary language " + locale)
    print("App Store Connect app", target["id"], "primary language", locale, flush=True)
    versions = child(target, "appStoreVersions", params={"filter[platform]": "IOS"})
    version = next((v for v in versions if v["attributes"]["versionString"] in ("1.0.0", "1.0")), None)
    if not version:
        version = write("appStoreVersions", {"versionString": "1.0.0", "platform": "IOS"}, {"app": rel("apps", target["id"])})
    info = next(x for x in child(target, "appInfos") if x["attributes"]["appStoreState"] in
                ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED"))
    info_loc = localization(info, "appInfoLocalizations", locale)
    loc = localization(version, "appStoreVersionLocalizations", locale)
    write(info_loc["type"], {"subtitle": "Local farms, stalls & markets", "privacyPolicyUrl": PUBLIC + "PRIVACY-1.0.md"}, id=info_loc["id"])
    write(info["type"], relations={"primaryCategory": rel("appCategories", "FOOD_AND_DRINK"),
          "secondaryCategory": rel("appCategories", "LIFESTYLE")}, id=info["id"])
    write(version["type"], {"copyright": "2026 Phoenix Jennings", "releaseType": "AFTER_APPROVAL"}, id=version["id"])
    write(loc["type"], {"description": section("Description").split('\nThe "Report')[0].strip(),
          "keywords": section("Keywords").splitlines()[0].strip("`"), "promotionalText": section("Promotional text"),
          "supportUrl": PUBLIC + "SUPPORT.md"}, id=loc["id"])
    rating = child(info, "ageRatingDeclaration")
    answers = {k: False for k in ("advertising ageAssurance datingAndRelationships gambling healthOrWellnessTopics lootBox messagingAndChat parentalControls sharedLocation socialMedia socialMediaAgeRestricted unrestrictedWebAccess userGeneratedContent").split()}
    answers.update({k: "NONE" for k in ("contests gamblingSimulated gunsOrOtherWeapons medicalOrTreatmentInformation profanityOrCrudeHumor sexualContentGraphicAndNudity sexualContentOrNudity horrorOrFearThemes matureOrSuggestiveThemes violenceCartoonOrFantasy violenceRealisticProlongedGraphicOrSadistic violenceRealistic").split()})
    answers["alcoholTobaccoOrDrugUseOrReferences"] = "INFREQUENT"
    tasks = [("Age rating", lambda: write(rating["type"], answers, id=rating["id"])),
             ("Reviewer contact", lambda: review_details(version)), ("Screenshots", lambda: screenshots(loc)),
             ("Free price", lambda: pricing(target)), ("Australian availability", lambda: availability(target))]
    failed = False
    for label, task in tasks:
        try:
            task()
            print(label, "saved", flush=True)
        except Exception as exc:
            print(label, "failed:", exc, flush=True)
            failed = True
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
