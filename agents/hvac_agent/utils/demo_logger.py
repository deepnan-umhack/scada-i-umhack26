DEMO_MODE = True
DEBUG_MODE = False


def title(text: str) -> None:
    if DEMO_MODE:
        print(f"\n{'=' * 50}")
        print(text)
        print(f"{'=' * 50}")


def step(icon: str, text: str) -> None:
    if DEMO_MODE:
        print(f"{icon} {text}")


def final_block(title_text: str, body: str) -> None:
    if DEMO_MODE:
        print(f"\n{'━' * 30}")
        print(title_text)
        print(f"{'━' * 30}")
        print(body)
        print(f"{'━' * 30}")


def debug(tag: str, text: str) -> None:
    if DEBUG_MODE:
        print(f"[{tag}] {text}")


def error(tag: str, text: str) -> None:
    print(f"[{tag}] {text}")