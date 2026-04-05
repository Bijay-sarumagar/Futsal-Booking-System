from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Promote an existing user to platform admin role"

    def add_arguments(self, parser):
        parser.add_argument("username", type=str, help="Username to promote")
        parser.add_argument(
            "--superuser",
            action="store_true",
            help="Also set Django is_superuser and is_staff flags",
        )

    def handle(self, *args, **options):
        username = options["username"]
        make_superuser = options["superuser"]

        User = get_user_model()

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist as exc:
            raise CommandError(f"User '{username}' not found") from exc

        user.role = "admin"
        user.status = "active"
        user.is_staff = True

        if make_superuser:
            user.is_superuser = True

        user.save(update_fields=["role", "status", "is_staff", "is_superuser", "updated_at"])

        if make_superuser:
            self.stdout.write(self.style.SUCCESS(f"User '{username}' promoted to admin + superuser"))
        else:
            self.stdout.write(self.style.SUCCESS(f"User '{username}' promoted to admin"))
