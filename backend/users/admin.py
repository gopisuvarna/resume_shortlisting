from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib import messages
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display   = ['email', 'get_full_name', 'role', 'hr_department', 'is_active', 'is_staff', 'created_at']
    list_filter    = ['role', 'is_active', 'is_staff', 'is_superuser']
    search_fields  = ['email', 'first_name', 'last_name']
    ordering       = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        (None,            {'fields': ('email', 'password')}),
        ('Personal',      {'fields': ('first_name', 'last_name', 'phone')}),
        ('Role',          {'fields': ('role', 'hr_department')}),
        ('Permissions',   {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'description': (
                'Rules: (1) Applicants cannot be staff/superuser. '
                '(2) Staff/superuser is automatically promoted to HR. '
                'Use: python manage.py createadmin to create the first admin.'
            ),
        }),
        ('Timestamps',    {'fields': ('created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': (
            'email', 'username', 'first_name', 'last_name',
            'role', 'hr_department', 'phone', 'password1', 'password2',
        )}),
    )

    def save_model(self, request, obj, form, change):
        if obj.role == User.Role.APPLICANT and (obj.is_superuser or obj.is_staff):
            obj.is_superuser = False
            obj.is_staff = False
            self.message_user(request,
                'Applicants cannot be staff/superuser. Flags cleared automatically.',
                messages.WARNING)
        if (obj.is_superuser or obj.is_staff) and obj.role != User.Role.HR:
            obj.role = User.Role.HR
            self.message_user(request,
                f'{obj.email} was promoted to HR role (admin must be HR).',
                messages.INFO)
        super().save_model(request, obj, form, change)