from django.urls import path
from .api_views import (
    PluginsListAPIView,
    PluginReloadAPIView,
    PluginSettingsAPIView,
    PluginRunAPIView,
    PluginEnabledAPIView,
    PluginImportAPIView,
    PluginDeleteAPIView,
)

app_name = "plugins"

urlpatterns = [
    path("", PluginsListAPIView.as_view(), name="list"),
    path("reload/", PluginReloadAPIView.as_view(), name="reload"),
    path("import/", PluginImportAPIView.as_view(), name="import"),
    path("<str:key>/delete/", PluginDeleteAPIView.as_view(), name="delete"),
    path("<str:key>/settings/", PluginSettingsAPIView.as_view(), name="settings"),
    path("<str:key>/run/", PluginRunAPIView.as_view(), name="run"),
    path("<str:key>/enabled/", PluginEnabledAPIView.as_view(), name="enabled"),
]
