"""
Overrides Django's built-in createsuperuser so that superusers
are always created with role=HR. Admin must be HR.
"""
from django.contrib.auth.management.commands.createsuperuser import Command as Base
from users.models import User


class Command(Base):
    help = 'Create a superuser. Role is automatically set to HR.'

    def handle(self, *args, **options):
        super().handle(*args, **options)
        # Ensure role=HR on the created superuser.
        # model.save() already enforces this, but be explicit.
        email = options.get('email')
        if email:
            User.objects.filter(email__iexact=email, is_superuser=True).update(
                role=User.Role.HR
            )
            self.stdout.write(self.style.SUCCESS(
                'Superuser created with role=HR. '
                'They can access /admin and /hr/dashboard.'
            ))