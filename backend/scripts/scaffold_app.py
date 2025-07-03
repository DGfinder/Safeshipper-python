import os

apps = [
    "audits", "dangerous_goods", "documents", "emergency_procedures", "epg",
    "hazard_assessments", "load_plans", "locations", "manifests", "sds",
    "shipments", "tracking", "users", "vehicles"
]

filenames_with_templates = {
    "views.py": "from django.shortcuts import render\nfrom rest_framework import viewsets\n\n# ViewSet for {app}\nclass {AppName}ViewSet(viewsets.ViewSet):\n    def list(self, request):\n        pass\n",
    "serializers.py": "from rest_framework import serializers\n\n# Serializer for {app}\nclass {AppName}Serializer(serializers.Serializer):\n    pass\n",
    "urls.py": "from django.urls import path, include\nfrom rest_framework.routers import DefaultRouter\nfrom .views import {AppName}ViewSet\n\nrouter = DefaultRouter()\n# router.register(r'{app}', {AppName}ViewSet)\n\nurlpatterns = [\n    path('', include(router.urls)),\n]\n",
    "permissions.py": "from rest_framework import permissions\n\n# Custom permissions for {app}\nclass Is{AppName}Owner(permissions.BasePermission):\n    def has_object_permission(self, request, view, obj):\n        return obj.owner == request.user\n",
    "admin.py": "from django.contrib import admin\n# from .models import YourModel\n\n# admin.site.register(YourModel)\n",
    "forms.py": "from django import forms\n\n# Forms for {app}\nclass {AppName}Form(forms.Form):\n    pass\n",
    "__init__.py": "# {app} package initializer\n"
}

project_root = "C:/Users/Hayden/Desktop/Safeshipper Home"

for app in apps:
    app_path = os.path.join(project_root, app)
    os.makedirs(app_path, exist_ok=True)
    for fname, template in filenames_with_templates.items():
        fpath = os.path.join(app_path, fname)
        if not os.path.exists(fpath):
            with open(fpath, "w") as f:
                content = template.replace("{app}", app).replace("{AppName}", app.title().replace("_", ""))
                f.write(content)
            print(f"Created: {fpath}")
        else:
            print(f"Already exists: {fpath}")
