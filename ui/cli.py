import sys
import time
import threading
import shutil


C1 = "\033[38;5;33m"
C2 = "\033[38;5;39m"
C3 = "\033[38;5;44m"
C4 = "\033[38;5;49m"
C5 = "\033[38;5;48m"
C6 = "\033[38;5;83m"
ACCENT = "\033[38;5;39m"
HI = "\033[38;5;48m"
WARN = "\033[38;5;196m"
INFO = "\033[38;5;179m"
WHITE = "\033[38;5;255m"
GRAY = "\033[38;5;245m"
DARK = "\033[38;5;238m"
BOLD = "\033[1m"
RESET = "\033[0m"


def width():
    return min(shutil.get_terminal_size().columns, 72)


def rule(char="━"):
    print(f"  {DARK}{char * (width() - 4)}{RESET}")


def banner():
    lines = [
        " █     ████  ████  █  █ ████  █  █ █████",
        " █     █  █  █  █  █ █  █  █  █  █   █  ",
        " █     █  █  █  █  ██   █  █  █  █   █  ",
        " █     █  █  █  █  █ █  █  █  █  █   █  ",
        " ████  ████  ████  █  █ ████  ████   █  ",
    ]
    gradient = [C1, C2, C3, C4, C5]
    print()
    for i, row in enumerate(lines):
        print(f"  {gradient[i]}{BOLD}{row}{RESET}")
    print(f"  {GRAY}campaign dispatch engine{RESET}")
    print()


def spinner(message, stop_event):
    frames = ["▱▱▱", "▰▱▱", "▰▰▱", "▰▰▰", "▱▰▰", "▱▱▰"]
    i = 0
    while not stop_event.is_set():
        sys.stdout.write(f"\r  {ACCENT}{frames[i % len(frames)]}{RESET} {GRAY}{message}{RESET}")
        sys.stdout.flush()
        i += 1
        time.sleep(0.15)
    sys.stdout.write(f"\r{' ' * (len(message) + 16)}\r")
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
    rule()
    print(f"  {ACCENT}▎{RESET} {GRAY}PREVIEW{RESET}")
    rule()
    print()
    print(f"  {INFO}⦿{RESET} {WHITE}{preview.subject}{RESET}")
    print()
    for body_line in preview.body.split("\n"):
        if body_line.strip():
            print(f"    {WHITE}{body_line}{RESET}")
        else:
            print()
    print()


def show_recipients(matched_users):
    count = len(matched_users)
    rule()
    print(f"  {ACCENT}▎{RESET} {GRAY}TARGETS{RESET}  {HI}{count}{RESET}")
    rule()
    print()

    for user in matched_users:
        rank = str(user["rank"]).rjust(2)
        tag = f" {INFO}◂ preview{RESET}" if user["rank"] == 1 else ""
        print(f"  {DARK}{rank}{RESET}  {WHITE}{user['name']}{RESET}  {GRAY}{user['email']}{RESET}{tag}")

    print()


def ask_approval():
    rule("─")
    choice = input(f"  {HI}▸ dispatch?{RESET} {DARK}y/n{RESET} ").strip().lower()
    print()
    return choice == "y"


def show_send_result(receiver, success, detail=""):
    if success:
        print(f"  {HI}▸{RESET} {WHITE}{receiver}{RESET}  {GRAY}{detail}{RESET}")
    else:
        print(f"  {WARN}▸{RESET} {WHITE}{receiver}{RESET}  {GRAY}{detail}{RESET}")


def show_aborted():
    print(f"  {WARN}▪{RESET} {GRAY}cancelled{RESET}\n")


def show_no_match():
    print(f"\n  {WARN}▪{RESET} {GRAY}no users matched{RESET}\n")


def show_summary(result):
    rule()
    print()
    parts = []
    if result.sent:
        parts.append(f"{HI}{result.sent} sent{RESET}")
    if result.failed:
        parts.append(f"{WARN}{result.failed} failed{RESET}")
    if result.rejected:
        parts.append(f"{INFO}{result.rejected} rejected{RESET}")
    parts.append(f"{DARK}{result.duration}s{RESET}")

    print(f"  {'  ━  '.join(parts)}")
    print()


def prompt_input():
    rule()
    print(f"  {DARK}e.g. top 5 users by listening time · inactive users · newest signups{RESET}")
    print()
    return input(f"  {ACCENT}▸{RESET} {WHITE}target:{RESET} ").strip()
