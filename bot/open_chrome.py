from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.webdriver.edge.service import Service as EdgeService
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import base64
import json
import os
import time
import webbrowser
from pathlib import Path
from dotenv import load_dotenv
import requests
from datetime import datetime

# Load credentials from bot/.env regardless of cwd
load_dotenv(Path(__file__).resolve().parent / ".env")

EMAIL = os.getenv("EMAIL")
PASSWORD = os.getenv("PASSWORD")

LOGIN_URL = (
    "https://sso.miraflores.gob.pe/realms/ciudadanos/protocol/openid-connect/auth"
    "?client_id=mi-perfil&redirect_uri=https%3A%2F%2Fapps.miraflores.gob.pe%2F"
    "&state=72c38e66-5dd3-4f05-b367-9b2fcdcf2814&response_mode=fragment"
    "&response_type=code&scope=openid&nonce=840a34b2-50fe-4703-b887-7eb174e7468f"
    "&code_challenge=xbUZnPss_J5WYiD_FZWSrl8RqAoDSPz3vOuQPprqEX4"
    "&code_challenge_method=S256"
)
TARGET_URL = "https://apps.miraflores.gob.pe/alquiler-de-cancha/reserva-tu-cancha"
DISPONIBILIDAD_URL = (
    "https://api.miraflores.gob.pe/alquiler-de-cancha/public/api/v1/canchas/disponibilidad"
)


def _decode_body(body_payload: dict) -> str:
    body = body_payload.get("body", "")
    if body_payload.get("base64Encoded"):
        return base64.b64decode(body).decode("utf-8", errors="replace")
    return body


def _build_fecha_map(payload: list[dict]) -> dict[str, dict]:
    fecha_map: dict[str, dict] = {}
    allowed = {str(i) for i in range(30, 42)}
    for item in payload:
        fecha = item.get("fecha")
        horas_disponibles = item.get("horas_disponibles")
        if not fecha or not horas_disponibles:
            continue
        try:
            horas_data = json.loads(horas_disponibles)
        except json.JSONDecodeError:
            horas_data = {}
        filtered: dict[str, list[str]] = {}
        for hora, canchas in horas_data.items():
            if not isinstance(canchas, list):
                continue
            allowed_canchas = [c for c in canchas if str(c) in allowed]
            if allowed_canchas:
                filtered[hora] = allowed_canchas
        if filtered:
            fecha_map[str(fecha)] = filtered
    return fecha_map


def _print_calendar(fecha_map: dict[str, dict]) -> None:
    print("Fecha map (calendar):")
    if not fecha_map:
        print("(no availability)")
        return
    dates = sorted(fecha_map.keys())
    all_times = sorted({t for times in fecha_map.values() for t in times.keys()})
    time_width = 10
    date_width = 22
    special_times = {"06:00:00", "07:00:00", "08:00:00", "17:00:00", "18:00:00", "19:00:00", "20:00:00"}
    green = "\033[32m"
    reset = "\033[0m"
    header = "Time".ljust(time_width)
    for fecha in dates:
        weekday = datetime.strptime(fecha, "%Y-%m-%d").strftime("%a")
        header += f"{fecha} ({weekday})".center(date_width)
    print(header)
    print("-" * len(header))
    for t in all_times:
        row = t.ljust(time_width)
        for fecha in dates:
            courts = fecha_map[fecha].get(t)
            cell = ",".join(courts) if courts else "-"
            row += cell.center(date_width)
        if t in special_times:
            print(f"{green}{row}{reset}")
        else:
            print(row)


def _render_html_table(fecha_map: dict[str, dict]) -> str:
    dates = sorted(fecha_map.keys())
    all_times = sorted({t for times in fecha_map.values() for t in times.keys()})
    special_times = {"07:00:00", "08:00:00", "17:00:00", "18:00:00", "19:00:00", "20:00:00"}

    header_cells = ["<th>Time</th>"]
    for fecha in dates:
        weekday = datetime.strptime(fecha, "%Y-%m-%d").strftime("%a")
        header_cells.append(f"<th>{fecha} ({weekday})</th>")

    body_rows = []
    for t in all_times:
        row_class = " class=\"special\"" if t in special_times else ""
        cells = [f"<td class=\"time\">{t}</td>"]
        for fecha in dates:
            courts = fecha_map[fecha].get(t)
            cell = ", ".join(courts) if courts else "-"
            cells.append(f"<td>{cell}</td>")
        body_rows.append(f"<tr{row_class}>" + "".join(cells) + "</tr>")

    return f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Tenis Availability</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 24px; }}
      table {{ border-collapse: collapse; width: 100%; }}
      th, td {{ border: 1px solid #ccc; padding: 8px; text-align: center; }}
      th {{ background: #f4f4f4; }}
      td.time {{ font-weight: bold; background: #fafafa; }}
      tr.special td {{ background: #e8f7e8; }}
    </style>
  </head>
  <body>
    <h2>Tenis Availability</h2>
    <table>
      <thead>
        <tr>{''.join(header_cells)}</tr>
      </thead>
      <tbody>
        {''.join(body_rows)}
      </tbody>
    </table>
  </body>
</html>
"""


def _write_and_open_html(fecha_map: dict[str, dict]) -> None:
    html = _render_html_table(fecha_map)
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(parents=True, exist_ok=True)
    html_path = output_dir / "tenis_availability.html"
    html_path.write_text(html, encoding="utf-8")
    webbrowser.open(html_path.as_uri())


def _sync_to_rally(fecha_map: dict[str, dict]) -> None:
    """Push availability to the Next.js app (Neon via /api/availability/sync)."""
    api_url = (os.getenv("RALLY_API_URL") or "").rstrip("/")
    secret = os.getenv("RALLY_CRON_SECRET") or ""
    if not api_url or not secret:
        print(
            "Skipping Rally sync (set RALLY_API_URL and RALLY_CRON_SECRET in bot/.env)."
        )
        return

    endpoint = f"{api_url}/api/availability/sync"
    try:
        res = requests.post(
            endpoint,
            json={"slots": fecha_map},
            headers={
                "Authorization": f"Bearer {secret}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            timeout=30,
        )
        res.raise_for_status()
        print(f"Synced to Rally: {res.json()}")
    except Exception as exc:
        print(f"Rally sync failed: {exc}")


def _publish_availability(fecha_map: dict[str, dict]) -> None:
    _print_calendar(fecha_map)
    _write_and_open_html(fecha_map)
    _sync_to_rally(fecha_map)


def _find_disponibilidad_request(
    driver: webdriver.Chrome, timeout: int = 30
) -> tuple[dict | None, dict | None]:
    end_time = time.time() + timeout
    seen_ids: set[str] = set()
    seen_urls: set[str] = set()
    seen_disponibilidad: set[str] = set()
    while time.time() < end_time:
        for entry in driver.get_log("performance"):
            message = json.loads(entry["message"]).get("message", {})
            method = message.get("method")
            if method == "Network.requestWillBeSent":
                params = message.get("params", {})
                request = params.get("request", {})
                url = request.get("url", "")
                if "/alquiler-de-cancha/public/api/v1/canchas/disponibilidad" in url:
                    if url not in seen_disponibilidad:
                        seen_disponibilidad.add(url)
                        print("Disponibilidad request:")
                        print(f"  URL: {url}")
                        if request.get("postData"):
                            print(f"  postData: {request['postData']}")
                        headers = request.get("headers", {})
                        return headers, request
                continue
            if method != "Network.responseReceived":
                continue
            params = message.get("params", {})
            response = params.get("response", {})
            url = response.get("url", "")
            if "/alquiler-de-cancha/public/api/v1/canchas/disponibilidad" not in url:
                if "api.miraflores.gob.pe/alquiler-de-cancha" in url:
                    seen_urls.add(url)
                continue
            request_id = params.get("requestId")
            if not request_id or request_id in seen_ids:
                continue
            seen_ids.add(request_id)
            try:
                body_payload = driver.execute_cdp_cmd(
                    "Network.getResponseBody", {"requestId": request_id}
                )
            except Exception:
                continue
            body_text = _decode_body(body_payload).strip()
            if not body_text:
                continue
            try:
                parsed = json.loads(body_text)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
                if "fecha" in parsed[0]:
                    print(f"Matched URL: {url}")
                    return None, {"response_json": parsed}
        time.sleep(0.5)
    if seen_urls:
        print("Saw related URLs (no matching payload yet):")
        for url in sorted(seen_urls):
            print(url)
    if not seen_disponibilidad:
        print("No disponibilidad request observed.")
    return None, None


def main() -> None:
    browser = (os.getenv("BROWSER") or "chrome").strip().lower()
    if browser == "edge":
        options = EdgeOptions()
        options.add_argument("--headless=new")
        options.add_experimental_option("detach", True)
        options.set_capability("goog:loggingPrefs", {"performance": "ALL"})
        edge_driver_path = os.getenv("EDGEDRIVER_PATH")
        service = (
            EdgeService(executable_path=edge_driver_path) if edge_driver_path else None
        )
        driver = webdriver.Edge(service=service, options=options)
    else:
        options = Options()
        options.add_argument("--headless=new")
        options.add_experimental_option("detach", True)
        options.set_capability("goog:loggingPrefs", {"performance": "ALL"})
        chrome_driver_path = os.getenv("CHROMEDRIVER_PATH")
        service = (
            Service(executable_path=chrome_driver_path) if chrome_driver_path else None
        )
        driver = webdriver.Chrome(service=service, options=options)
    driver.execute_cdp_cmd("Network.enable", {})
    driver.get(LOGIN_URL)
    wait = WebDriverWait(driver, 20)
    email_input = wait.until(EC.visibility_of_element_located((By.ID, "username")))
    email_input.clear()
    email_input.send_keys(EMAIL)

    password_input = wait.until(EC.visibility_of_element_located((By.ID, "password")))
    password_input.clear()
    password_input.send_keys(PASSWORD)

    #now we need to click the login button, look for it by its name property called name="login"
    login_button = wait.until(EC.visibility_of_element_located((By.NAME, "login")))
    login_button.click()

    # now we are loggen in so we can navigate to the target page
    driver.get(TARGET_URL)
    time.sleep(5)
    driver.refresh()

    # now we need to click the part where says "Elige una fecha..." to open the calendar days, we need to look for that string as placeholder text in the input field
    # date_input = wait.until(EC.visibility_of_element_located((By.XPATH, "//input[@placeholder='Elige una fecha...']")))
    # date_input.click()

    headers, request_info = _find_disponibilidad_request(driver, timeout=60)
    if request_info and "response_json" in request_info:
        print("Reserva payload:")
        print(json.dumps(request_info["response_json"], indent=2, ensure_ascii=False))
        fecha_map = _build_fecha_map(request_info["response_json"])
        _publish_availability(fecha_map)
        return

    if headers is None or request_info is None:
        print("No disponibilidad request captured.")
        return

    # Build a direct API call using the captured Authorization + postData
    auth_header = headers.get("authorization") or headers.get("Authorization")
    if not auth_header:
        print("No Authorization header found on disponibilidad request.")
        return

    post_data = request_info.get("postData") or "{}"
    try:
        payload = json.loads(post_data)
    except json.JSONDecodeError:
        print("Could not parse disponibilidad postData as JSON.")
        return

    response = requests.post(
        DISPONIBILIDAD_URL,
        json=payload,
        headers={"Authorization": auth_header, "Accept": "application/json"},
        timeout=30,
    )
    response.raise_for_status()
    reserva_payload = response.json()
    fecha_map = _build_fecha_map(reserva_payload)
    _publish_availability(fecha_map)


if __name__ == "__main__":
    main()
