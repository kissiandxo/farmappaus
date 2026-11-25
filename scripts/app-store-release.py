"""Prepare Farm Direct 1.0 in App Store Connect using the repository's signing key."""
import base64
import hashlib
import html
import json
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
PUBLIC = "https://github.com/kissiandxo/farmappaus/blob/ca0247902258d29a3e4212989eaf16d145a86c0a/docs/"
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
        if path == "/v1/reviewSubmissionItems" or path.startswith("/v1/reviewSubmissions/"):
            for error in errors:
                for group in error.get("meta", {}).get("associatedErrors", {}).values():
                    for item in group:
                        print("Apple review requirement:", item.get("code"), item.get("detail"), flush=True)
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
        visera = app("com.visera.Visera")
        versions = child(visera, "appStoreVersions", params={"filter[platform]": "IOS", "limit": 200})
        for row in versions:
            saved = child(row, "appStoreReviewDetail", optional=True)
            attrs = (saved or {}).get("attributes", {})
            if all(attrs.get(k) for k in fields):
                break
        else:
            beta = child(visera, "betaAppReviewDetail", optional=True)
            attrs = (beta or {}).get("attributes", {})
            if not all(attrs.get(k) for k in fields):
                # The seller also publishes their business contact on Apple's EU storefront.
                page = requests.get("https://apps.apple.com/ie/app/visera-wall-paint-visualiser/id6791178782", timeout=30)
                page.raise_for_status()
                text = " ".join(html.unescape(re.sub("<[^>]+>", " ", page.text)).split())
                trader = re.search(r"Phoenix Jennings has identified itself as a trader.{0,900}?Phone Number ([+0-9() -]+) Email ([^ ]+@[^ ]+)", text)
                if not trader:
                    raise RuntimeError("Unable to verify Visera's published trader contact on Apple's listing")
                phone = re.sub(r"[^+0-9]", "", trader[1])
                if not re.fullmatch(r"\+61[0-9]{9}", phone):
                    raise RuntimeError("Unexpected format for Visera's trader phone")
                attrs = dict(zip(fields, ("Phoenix", "Jennings", phone, trader[2])))
    notes = section("Notes for App Review").split("> **Contact:**")[0]
    notes = re.sub(r"^> ?", "", notes, flags=re.M).replace("**", "").strip()
    values = {k: attrs[k] for k in fields}
    values.update(notes=notes, demoAccountRequired=False)
    if detail:
        write(detail["type"], values, id=detail["id"])
    else:
        write("appStoreReviewDetails", values, {"appStoreVersion": rel(version["type"], version["id"])})


def transfer_asset(row, payload):
    attrs = row["attributes"]
    state = attrs["assetDeliveryState"]["state"]
    if state == "FAILED":
        raise RuntimeError("Apple rejected " + attrs["fileName"] + ": " + str(attrs["assetDeliveryState"].get("errors")))
    if state != "AWAITING_UPLOAD":
        return
    for part in attrs["uploadOperations"]:
        start = part["offset"]
        response = requests.request(part["method"], part["url"], data=payload[start:start + part["length"]],
                                    headers={h["name"]: h["value"] for h in part["requestHeaders"]}, timeout=120)
        if not response.ok:
            raise RuntimeError(f"Asset transfer failed for {attrs['fileName']}: HTTP {response.status_code}")
    write(row["type"], {"uploaded": True, "sourceFileChecksum": hashlib.md5(payload).hexdigest()}, id=row["id"])


def app_preview(loc):
    asset = ROOT / "marketing/launch-film/farm-direct-hero.mp4"
    payload = asset.read_bytes()
    preview_sets = child(loc, "appPreviewSets")
    group = next((item for item in preview_sets if item["attributes"]["previewType"] == "IPHONE_67"), None)
    if not group:
        group = write("appPreviewSets", {"previewType": "IPHONE_67"},
                      {"appStoreVersionLocalization": rel(loc["type"], loc["id"])})
    previews = child(group, "appPreviews")
    preview = next((item for item in previews if item["attributes"]["fileName"] == asset.name), None)
    if not preview:
        preview = write("appPreviews", {"fileName": asset.name, "fileSize": len(payload), "mimeType": "video/mp4",
                        "previewFrameTimeCode": "00:00:02:00"}, {"appPreviewSet": rel(group["type"], group["id"])})
    transfer_asset(preview, payload)
    for _ in range(120):
        attrs = api("GET", "/v1/appPreviews/" + preview["id"])["attributes"]
        delivery = attrs["assetDeliveryState"]
        video = attrs.get("videoDeliveryState") or {}
        if "FAILED" in (delivery["state"], video.get("state")):
            raise RuntimeError("Preview processing failed: " + str(delivery.get("errors") or video.get("errors")))
        if video.get("state") == "COMPLETE":
            return
        time.sleep(10)
    raise RuntimeError("The uploaded app preview is still processing at Apple")


def screenshots(loc):
    kind = "APP_IPHONE_67"
    sets = child(loc, "appScreenshotSets")
    group = next((x for x in sets if x["attributes"]["screenshotDisplayType"] == kind), None)
    if not group:
        group = write("appScreenshotSets", {"screenshotDisplayType": kind},
                      {"appStoreVersionLocalization": rel(loc["type"], loc["id"])})
    existing = {x["attributes"]["fileName"]: x for x in child(group, "appScreenshots")}
    names = (
        "store-01-explore.png", "store-02-butcher.png", "store-03-market.png",
        "03-place-farm-shop.png", "05-saved.png", "09-welcome.png", "10-tour.png",
    )
    for name in names:
        image = (ROOT / "marketing/app-store-screenshots" / name).read_bytes()
        row = existing.get(name)
        if not row:
            row = write("appScreenshots", {"fileName": name, "fileSize": len(image)},
                        {"appScreenshotSet": rel(group["type"], group["id"])})
        transfer_asset(row, image)

    # Apple displays these in relationship order, independently of their file names.
    for _ in range(30):
        rows = child(group, "appScreenshots")
        by_name = {row["attributes"]["fileName"]: row for row in rows}
        if all(name in by_name and by_name[name]["attributes"]["assetDeliveryState"]["state"] == "COMPLETE"
               for name in names):
            break
        time.sleep(5)
    else:
        raise RuntimeError("Apple has yet to finish processing the requested screenshots")
    # Each cover preserves the same native frame. Retire only our exact, backed-up
    # originals once Apple has processed every replacement, preserving other artwork.
    originals = ("01-explore.png", "08-place-butcher.png", "04-place-market.png")
    for name in originals:
        row = by_name.get(name)
        if not row:
            continue
        local = (ROOT / "marketing/app-store-screenshots" / name).read_bytes()
        if row["attributes"].get("sourceFileChecksum") == hashlib.md5(local).hexdigest():
            api("DELETE", "/v1/appScreenshots/" + row["id"])
    rows = child(group, "appScreenshots")
    ordered = [by_name[name] for name in names]
    ordered.extend(row for row in rows if row["attributes"]["fileName"] not in names)
    if [row["id"] for row in ordered] != [row["id"] for row in rows]:
        api("PATCH", f"/v1/appScreenshotSets/{group['id']}/relationships/appScreenshots",
            body={"data": [ref("appScreenshots", row["id"]) for row in ordered]})
    observed = child(group, "appScreenshots")
    if [row["id"] for row in observed] != [row["id"] for row in ordered]:
        raise RuntimeError("Apple did not confirm the requested screenshot order")


def pricing(target):
    schedule = child(target, "appPriceSchedule", optional=True)
    if schedule:
        manual = child(schedule, "manualPrices", params={"include": "appPricePoint"}, optional=True) or []
        for price in manual:
            point = api(
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
    territories = api("GET", "/v1/territories", params={"limit": 200})
    rows = []
    for territory in territories:
        code = territory["id"]
        rows.append({**ref("territoryAvailabilities", "${" + code + "}"),
                     "attributes": {"available": code == "AUS"},
                     "relationships": {"territory": rel("territories", code)}})
    write("appAvailabilities", {"availableInNewTerritories": False}, {"app": rel("apps", target["id"]),
          "territoryAvailabilities": {"data": [ref(row["type"], row["id"]) for row in rows]}},
          included=rows, version="v2")


def submit(target, version, number):
    criteria = {"filter[app]": target["id"], "filter[version]": number,
                "filter[preReleaseVersion.version]": "1.0.0", "filter[preReleaseVersion.platform]": "IOS"}
    for _ in range(90):
        rows = api("GET", "/v1/builds", params=criteria)
        if rows:
            state = rows[0]["attributes"]["processingState"]
            if state == "VALID":
                break
            if state != "PROCESSING":
                raise RuntimeError("Build " + number + " has state " + state)
        time.sleep(30)
    else:
        raise RuntimeError("Apple has yet to process build " + number)
    write(version["type"], relations={"build": rel("builds", rows[0]["id"])}, id=version["id"])
    print("Selected processed build", number, flush=True)
    pending = child(target, "reviewSubmissions", params={"filter[platform]": "IOS"})
    draft = None
    for row in pending:
        if row["attributes"]["state"] != "READY_FOR_REVIEW":
            continue
        items = child(row, "items", params={"include": "appStoreVersion"})
        linked = [x["relationships"].get("appStoreVersion", {}).get("data") for x in items]
        if linked == [ref(version["type"], version["id"])]:
            draft = row
            break
        if not items:
            draft = row
    if not draft:
        draft = write("reviewSubmissions", {"platform": "IOS"}, {"app": rel("apps", target["id"])})
    if not child(draft, "items"):
        write("reviewSubmissionItems", relations={"reviewSubmission": rel(draft["type"], draft["id"]),
              "appStoreVersion": rel(version["type"], version["id"])})
    result = write(draft["type"], {"submitted": True}, id=draft["id"])
    print("Apple review submission state:", result["attributes"]["state"], flush=True)


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
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    event = json.loads(Path(event_path).read_text()) if event_path else {}
    match = re.search(r"\[submit-(\d+)\]", event.get("head_commit", {}).get("message", ""))
    state = version["attributes"].get("appVersionState") or version["attributes"]["appStoreState"]
    print("Apple version state:", state, flush=True)
    after_submission = {"WAITING_FOR_REVIEW", "IN_REVIEW", "ACCEPTED", "PENDING_APPLE_RELEASE",
                        "PENDING_DEVELOPER_RELEASE", "PROCESSING_FOR_DISTRIBUTION", "READY_FOR_DISTRIBUTION",
                        "PROCESSING_FOR_APP_STORE", "READY_FOR_SALE"}
    if state in after_submission:
        build = child(version, "build", optional=True)
        current = (build or {}).get("attributes", {}).get("version")
        if match and current != match.group(1):
            raise RuntimeError(f"Apple already has build {current} in state {state}")
        print("Apple already has build", current, "in state", state, flush=True)
        return
    write("apps", {"contentRightsDeclaration": "USES_THIRD_PARTY_CONTENT"}, id=target["id"])
    info = next(x for x in child(target, "appInfos") if x["attributes"]["appStoreState"] in
                ("PREPARE_FOR_SUBMISSION", "READY_FOR_REVIEW", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED"))
    info_loc = localization(info, "appInfoLocalizations", locale)
    loc = localization(version, "appStoreVersionLocalizations", locale)
    write(info_loc["type"], {"subtitle": "Farm shops, markets & butchers", "privacyPolicyUrl": PUBLIC + "PRIVACY-1.0.md"}, id=info_loc["id"])
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
             ("App preview", lambda: app_preview(loc)), ("Free price", lambda: pricing(target)), ("Australian availability", lambda: availability(target))]
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
    if match:
        submit(target, version, match.group(1))


if __name__ == "__main__":
    main()
