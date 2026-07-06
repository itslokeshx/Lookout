import sys
import time
import threading
import shutil


ICE = "\033[38;5;75m"
PEACH = "\033[38;5;216m"
MINT = "\033[38;5;84m"
ROSE = "\033[38;5;197m"
WHITE = "\033[38;5;255m"
STEEL = "\033[38;5;240m"
BOLD = "\033[1m"
RESET = "\033[0m"


def width():
    return min(shutil.get_terminal_size().columns, 72)


def line(char="─", color=STEEL):
    print(f"{color}{char * width()}{RESET}")


def banner():
    art = [
        "██╗      ██████╗  ██████╗ ██╗  ██╗ ██████╗ ██╗   ██╗████████╗",
        "██║     ██╔═══██╗██╔═══██╗██║ ██╔╝██╔═══██╗██║   ██║╚══██╔══╝",
        "██║     ██║   ██║██║   ██║█████╔╝ ██║   ██║██║   ██║   ██║   ",
        "██║     ██║   ██║██║   ██║██╔═██╗ ██║   ██║██║   ██║   ██║   ",
        "███████╗╚██████╔╝╚██████╔╝██║  ██╗╚██████╔╝╚██████╔╝   ██║   ",
        "╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝   ╚═╝   ",
    ]
    print()
    for row in art:
        print(f"  {ICE}{row}{RESET}")
    print(f"  {STEEL}{'Campaign Dispatch Engine':^62}{RESET}")
    print()


def spinner(message, stop_event):
    frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
    i = 0
    while not stop_event.is_set():
        sys.stdout.write(f"\r  {PEACH}{frames[i % len(frames)]}{RESET} {STEEL}{message}{RESET}")
        sys.stdout.flush()
        i += 1
        time.sleep(0.08)
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
    w = width()
    print(f"  {BOLD}{ICE}╭{'─' * (w - 4)}╮{RESET}")
    print(f"  {ICE}│{RESET} {PEACH}EXAMPLE PREVIEW{' ' * (w - 21)}{ICE}│{RESET}")
    print(f"  {ICE}├{'─' * (w - 4)}┤{RESET}")

    print(f"  {ICE}│{RESET} {STEEL}Subject:{RESET} {WHITE}{preview.subject}{RESET}")
    print(f"  {ICE}│{RESET}")

    for body_line in preview.body.split("\n"):
        print(f"  {ICE}│{RESET}  {WHITE}{body_line}{RESET}")

    print(f"  {ICE}╰{'─' * (w - 4)}╯{RESET}")
    print()


def show_recipients(matched_users):
    count = len(matched_users)
    print(f"  {ICE}◆{RESET} {BOLD}{WHITE}{count} recipient{'s' if count != 1 else ''} matched{RESET}\n")

    for user in matched_users:
        rank = str(user["rank"]).rjust(2)
        tag = f"  {PEACH}← preview{RESET}" if user["rank"] == 1 else ""
        print(f"    {STEEL}{rank}.{RESET} {WHITE}{user['name']}{RESET}  {STEEL}‹{user['email']}›{RESET}{tag}")

    print()


def ask_approval():
    line(color=STEEL)
    choice = input(f"  {PEACH}{BOLD}↳ Approve dispatch? {RESET}{STEEL}[y/n]{RESET} ").strip().lower()
    print()
    return choice == "y"


def show_send_result(receiver, success, detail=""):
    if success:
        print(f"    {MINT}✓{RESET} {WHITE}{receiver}{RESET}  {STEEL}{detail}{RESET}")
    else:
        print(f"    {ROSE}✗{RESET} {WHITE}{receiver}{RESET}  {STEEL}{detail}{RESET}")


def show_aborted():
    print(f"  {ROSE}■{RESET} {STEEL}Dispatch cancelled.{RESET}\n")


def show_no_match():
    print(f"\n  {ROSE}■{RESET} {STEEL}No users matched the query.{RESET}\n")


def show_summary(result):
    line(color=STEEL)
    print()
    parts = []
    if result.sent:
        parts.append(f"{MINT}▲ {result.sent} sent{RESET}")
    if result.failed:
        parts.append(f"{ROSE}▼ {result.failed} failed{RESET}")
    if result.rejected:
        parts.append(f"{PEACH}● {result.rejected} rejected{RESET}")
    parts.append(f"{STEEL}⏱ {result.duration}s{RESET}")

    print(f"  {('  │  '.join(parts))}")
    print()


def prompt_input():
    line(color=STEEL)
    return input(f"  {ICE}▸{RESET} {BOLD}{WHITE}Describe who to email:{RESET} ").strip()
