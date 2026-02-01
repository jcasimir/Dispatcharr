class Plugin:
    name = "Nav Test Plugin"
    version = "1.0.0"
    description = "A plugin with navigation and view content"

    navigation = {
        "label": "Test Nav",
        "icon": "star",
    }

    view_content = "<h1>Test View Content</h1>"

    fields = []
    actions = []

    def run(self, action_id, params, context):
        return {"status": "ok"}
