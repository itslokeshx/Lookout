import sys
import time
import threading
import shutil


EMBER = "\033[38;5;166m"
SAND = "\033[38;5;180m"
SAGE = "\033[38;5;108m"
RUST = "\033[38;5;131m"
WHITE = "\033[38;5;253m"
MUTE = "\033[38;5;242m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"


def width():
    return min(shutil.get_terminal_size().columns, 72)


def rule():
    print(f"  {MUTE}{'·' * (width() - 4)}{RESET}")


def banner():
    print()
    print(f"  {BOLD}{EMBER}L O O K O U T{RESET}")
    print(f"  {MUTE}campaign dispatch engine{RESET}")
    print()


def spinner(message, stop_event):
    frames = ["◜", "◠", "◝", "◞", "◡", "◟"]
    i = 0
    while not stop_event.is_set():
        sys.stdout.write(f"\r  {EMBER}{frames[i % len(frames)]}{RESET} {MUTE}{message}{RESET}")
        sys.stdout.flush()
        i += 1
        time.sleep(0.1)
    sys.stdout.write(f"\r{' ' * (len(message) + 10)}\r")
    sys.stdout.flush()


class Spinner:
    def __init__(self, message):
        self.message = message
        self.stop_event = threading.Event()
        self.thread = None

    def __enter__(self):
        self.thread = threading.Thread(target=spinner, args=(self.message, self.stop_event), daemon=True)
        self.thread.start()
        return self

    def __exit__(self, *_):
        self.stop_event.set()
        self.thread.join()


def show_template(preview):
    print(f"  {SAND}subject{RESET}  {WHITE}{preview.subject}{RESET}")
    print()
    for body_line in preview.body.split("\n"):
        if body_line.strip():
            print(f"  {WHITE}{body_line}{RESET}")
        else:
            print()
    print()
    rule()


def show_recipients(matched_users):
    count = len(matched_users)
    print()
    print(f"  {SAGE}{count}{RESET} {WHITE}recipient{'s' if count != 1 else ''}{RESET}")
    print()

    for user in matched_users:
        rank = str(user["rank"]).rjust(2)
        tag = f"  {SAND}preview{RESET}" if user["rank"] == 1 else ""
        print(f"  {MUTE}{rank}{RESET}  {WHITE}{user['name']}{RESET}  {MUTE}{user['email']}{RESET}{tag}")

    print()


def ask_approval():
    rule()
    choice = input(f"  {EMBER}dispatch?{RESET} {MUTE}y/n{RESET} ").strip().lower()
    print()
    return choice == "y"


def show_send_result(receiver, success, detail=""):
    mark = f"{SAGE}→{RESET}" if success else f"{RUST}×{RESET}"
    print(f"  {mark}  {WHITE}{receiver}{RESET}  {MUTE}{detail}{RESET}")


def show_aborted():
    print(f"  {RUST}cancelled{RESET}\n")


def show_no_match():
    print(f"\n  {RUST}no users matched{RESET}\n")


def show_summary(result):
    print()
    rule()
    print()
    parts = []
    if result.sent:
        parts.append(f"{SAGE}{result.sent} sent{RESET}")
    if result.failed:
        parts.append(f"{RUST}{result.failed} failed{RESET}")
    if result.rejected:
        parts.append(f"{SAND}{result.rejected} rejected{RESET}")
    parts.append(f"{MUTE}{result.duration}s{RESET}")

    print(f"  {'  ·  '.join(parts)}")
    print()


def prompt_input():
    return input(f"  {EMBER}›{RESET} ").strip()
