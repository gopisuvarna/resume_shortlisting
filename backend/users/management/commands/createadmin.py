"""
Convenience command: create an HR superuser in one shot.

Usage:
    python manage.py createadmin
    python manage.py createadmin --email admin@acme.com --password secret123
"""
import getpass, uuid
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError
from users.models import User


class Command(BaseCommand):
    help = 'Create an HR superuser (admin) account. Admin is always HR role.'

    def add_arguments(self, parser):
        parser.add_argument('--email',      type=str, help='Admin email address')
        parser.add_argument('--password',   type=str, help='Admin password (min 8 chars)')
        parser.add_argument('--first-name', type=str, default='Admin',         dest='first_name')
        parser.add_argument('--last-name',  type=str, default='User',          dest='last_name')
        parser.add_argument('--department', type=str, default='Administration', dest='hr_department')

    def handle(self, *args, **options):
        email = options['email']
        if not email:
            email = input('Email address: ').strip()
        if not email:
            raise CommandError('Email is required.')

        password = options['password']
        if not password:
            password = getpass.getpass('Password: ')
            confirm  = getpass.getpass('Password (again): ')
            if password != confirm:
                raise CommandError('Passwords do not match.')
        if len(password) < 8:
            raise CommandError('Password must be at least 8 characters.')

        email = email.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise CommandError(f'A user with email "{email}" already exists.')

        base     = email.split('@')[0][:20].replace('.', '_')
        username = f"{base}_{uuid.uuid4().hex[:6]}"

        try:
            user = User(
                email         = email,
                username      = username,
                first_name    = options['first_name'],
                last_name     = options['last_name'],
                role          = User.Role.HR,
                is_staff      = True,
                is_superuser  = True,
                is_active     = True,
                hr_department = options['hr_department'],
            )
            user.set_password(password)
            user.save()
        except IntegrityError as e:
            raise CommandError(f'Could not create admin: {e}')

        self.stdout.write(self.style.SUCCESS(
            f'\nAdmin HR account created!\n'
            f'  Email:     {email}\n'
            f'  Role:      HR (superuser + staff)\n'
            f'  Django Admin: http://localhost:8000/admin/\n'
            f'  HR Portal:    http://localhost:3000/hr/dashboard\n'
        ))