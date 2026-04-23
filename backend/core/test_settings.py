from . import settings


for name in dir(settings):
    if name.isupper():
        globals()[name] = getattr(settings, name)


BASE_DIR = settings.BASE_DIR
SECRET_KEY = settings.SECRET_KEY or "test-secret-key"
INSTALLED_APPS = settings.INSTALLED_APPS
MIDDLEWARE = settings.MIDDLEWARE
ROOT_URLCONF = settings.ROOT_URLCONF
TEMPLATES = settings.TEMPLATES
WSGI_APPLICATION = settings.WSGI_APPLICATION
AUTH_USER_MODEL = settings.AUTH_USER_MODEL
REST_FRAMEWORK = settings.REST_FRAMEWORK
SIMPLE_JWT = settings.SIMPLE_JWT
LANGUAGE_CODE = settings.LANGUAGE_CODE
TIME_ZONE = settings.TIME_ZONE
USE_I18N = settings.USE_I18N
USE_TZ = settings.USE_TZ
DEFAULT_AUTO_FIELD = settings.DEFAULT_AUTO_FIELD

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

MEDIA_ROOT = BASE_DIR / "test_media"
