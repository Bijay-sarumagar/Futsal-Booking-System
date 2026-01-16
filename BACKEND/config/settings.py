import os
from pathlib import Path
from decouple import config

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-this-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = config('DEBUG', default=True, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    
    # Local apps
    'apps.users',
    'apps.futsals',
    'apps.bookings',
    'apps.payments',
    'apps.reviews',
    'apps.notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# Database
# PostgreSQL is required for all environments. Set credentials in .env.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DATABASE_NAME', default='futsalhub'),
        'USER': config('DATABASE_USER', default='postgres'),
        'PASSWORD': config('DATABASE_PASSWORD', default=''),
        'HOST': config('DATABASE_HOST', default='localhost'),
        'PORT': config('DATABASE_PORT', default='5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = config('TIME_ZONE', default='Asia/Kathmandu')
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'apps.users.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}

# CORS Configuration
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost:5173,http://localhost:3000').split(',')
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^http://localhost:\\d+$",
    r"^http://127\\.0\\.0\\.1:\\d+$",
]

# Auth cookie configuration
AUTH_COOKIE_SECURE = config('AUTH_COOKIE_SECURE', default=False, cast=bool)
AUTH_COOKIE_SAMESITE = config('AUTH_COOKIE_SAMESITE', default='Lax')
AUTH_COOKIE_DOMAIN = config('AUTH_COOKIE_DOMAIN', default=None)

# Simple JWT Configuration
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': config('JWT_SECRET', default=SECRET_KEY),
}

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}

# Payment gateway configuration
FRONTEND_BASE_URL = config('FRONTEND_BASE_URL', default='http://localhost:5173')
ESEWA_BASE_URL = config('ESEWA_BASE_URL', default='https://rc-epay.esewa.com.np')
ESEWA_PRODUCT_CODE = config('ESEWA_PRODUCT_CODE', default='EPAYTEST')
ESEWA_SECRET_KEY = config('ESEWA_SECRET_KEY', default='8gBm/:&EnhH.1/q')
ESEWA_TEST_FIXED_AMOUNT = config('ESEWA_TEST_FIXED_AMOUNT', default='10.00')
PENDING_BOOKING_EXPIRY_MINUTES = config('PENDING_BOOKING_EXPIRY_MINUTES', default=5, cast=int)

# LLM configuration
LLM_API_KEY = config('LLM_API_KEY', default='')
_llm_api_url = config('LLM_API_URL', default='https://api.openai.com/v1/chat/completions').strip()
if _llm_api_url.rstrip('/').endswith('/api'):
    _llm_api_url = f"{_llm_api_url.rstrip('/')}/v1/chat/completions"
LLM_API_URL = _llm_api_url
LLM_MODEL = config('LLM_MODEL', default='gpt-4o-mini')
LLM_TEMPERATURE = config('LLM_TEMPERATURE', default=0.4, cast=float)
LLM_MAX_TOKENS = config('LLM_MAX_TOKENS', default=320, cast=int)
LLM_REQUEST_TIMEOUT = config('LLM_REQUEST_TIMEOUT', default=10, cast=int)
LLM_FALLBACK_MODELS = [
    model.strip()
    for model in config('LLM_FALLBACK_MODELS', default='').split(',')
    if model.strip()
]
