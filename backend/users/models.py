from django.contrib.auth.models import AbstractUser 
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        HR        = 'HR',        'HR Manager'
        APPLICANT = 'APPLICANT', 'Applicant'

    email = models.EmailField(unique=True)
    role  = models.CharField(max_length=20, choices=Role.choices, default=Role.APPLICANT)
    phone = models.CharField(max_length=20, blank=True)

    # HR-specific
    hr_department = models.CharField(max_length=200, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    @property
    def is_hr(self):
        return self.role == self.Role.HR

    @property
    def is_applicant(self):
        return self.role == self.Role.APPLICANT

    def save(self, *args, **kwargs):
        # Rule 1: Applicants can NEVER be staff or superuser
        if self.role == self.Role.APPLICANT:
            self.is_staff     = False
            self.is_superuser = False

        # Rule 2: HR users always get staff access (two-way enforcement)
        if self.role == self.Role.HR:
            self.is_staff = True

        # Rule 3: Superusers/staff are always HR (admin must be HR)
        if self.is_superuser or self.is_staff:
            self.role = self.Role.HR

        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.get_full_name()} <{self.email}> [{self.role}]'

    class Meta:
        ordering = ['-created_at']