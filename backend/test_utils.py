from itertools import count

from users.models import User


DEFAULT_TEST_SECRET = "TestPass!234"
DEFAULT_TEST_PHONE = "9000000000"

_user_counter = count(1)


def unique_email(prefix: str = "user") -> str:
    return f"{prefix}-{next(_user_counter)}@test.local"


def create_test_user(
    *,
    username: str,
    role: str,
    email: str | None = None,
    secret: str = DEFAULT_TEST_SECRET,
    first_name: str = "Test",
    last_name: str = "User",
    phone: str = DEFAULT_TEST_PHONE,
    **extra,
) -> User:
    return User.objects.create_user(
        username,
        email or unique_email(username),
        secret,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        role=role,
        **extra,
    )
