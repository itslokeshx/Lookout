import sys
import time
import threading
import shutil


PURPLE = "\033[38;5;141m"
CYAN = "\033[38;5;117m"
GREEN = "\033[38;5;114m"
RED = "\033[38;5;204m"
YELLOW = "\033[38;5;222m"
WHITE = "\033[38;5;255m"
DIM = "\033[38;5;245m"
BOLD = "\033[1m"
RESET = "\033[0m"


def width():
    return min(shutil.get_terminal_size().columns, 72)


def line(char="─", color=DIM):
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
        print(f"  {PURPLE}{row}{RESET}")
    print(f"  {DIM}{'Campaign Dispatch Engine':^62}{RESET}")
    print()


def spinner(message, stop_event):
    frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
    i = 0
    while not stop_event.is_set():
        sys.stdout.write(f"\r  {CYAN}{frames[i % len(frames)]}{RESET} {DIM}{message}{RESET}")
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
    print(f"  {BOLD}{PURPLE}╭{'─' * (w - 4)}╮{RESET}")
    print(f"  {PURPLE}│{RESET} {YELLOW}EXAMPLE PREVIEW{' ' * (w - 21)}{PURPLE}│{RESET}")
    print(f"  {PURPLE}├{'─' * (w - 4)}┤{RESET}")

    print(f"  {PURPLE}│{RESET} {DIM}Subject:{RESET} {WHITE}{preview.subject}{RESET}")
    print(f"  {PURPLE}│{RESET}")

    for body_line in preview.body.split("\n"):
        print(f"  {PURPLE}│{RESET}  {WHITE}{body_line}{RESET}")

    print(f"  {PURPLE}╰{'─' * (w - 4)}╯{RESET}")
    print()


def show_recipients(matched_users):
    count = len(matched_users)
    print(f"  {CYAN}◆{RESET} {BOLD}{WHITE}{count} recipient{'s' if count != 1 else ''} matched{RESET}\n")

    for user in matched_users:
        rank = str(user["rank"]).rjust(2)
        tag = f"  {CYAN}← preview{RESET}" if user["rank"] == 1 else ""
        print(f"    {DIM}{rank}.{RESET} {WHITE}{user['name']}{RESET}  {DIM}‹{user['email']}›{RESET}{tag}")

    print()


def ask_approval():
    line(color=DIM)
    choice = input(f"  {YELLOW}{BOLD}↳ Approve dispatch? {RESET}{DIM}[y/n]{RESET} ").strip().lower()
    print()
    return choice == "y"


def show_send_result(receiver, success, detail=""):
    if success:
        print(f"    {GREEN}✓{RESET} {WHITE}{receiver}{RESET}  {DIM}{detail}{RESET}")
    else:
        print(f"    {RED}✗{RESET} {WHITE}{receiver}{RESET}  {DIM}{detail}{RESET}")


def show_aborted():
    print(f"  {RED}■{RESET} {DIM}Dispatch cancelled.{RESET}\n")


def show_no_match():
    print(f"\n  {RED}■{RESET} {DIM}No users matched the query.{RESET}\n")


def show_summary(result):
    line(color=DIM)
    print()
    parts = []
    if result.sent:
        parts.append(f"{GREEN}▲ {result.sent} sent{RESET}")
    if result.failed:
        parts.append(f"{RED}▼ {result.failed} failed{RESET}")
    if result.rejected:
        parts.append(f"{YELLOW}● {result.rejected} rejected{RESET}")
    parts.append(f"{DIM}⏱ {result.duration}s{RESET}")

    print(f"  {('  │  '.join(parts))}")
    print()


def prompt_input():
    line(color=DIM)
    return input(f"  {PURPLE}▸{RESET} {BOLD}{WHITE}Describe who to email:{RESET} ").strip()
