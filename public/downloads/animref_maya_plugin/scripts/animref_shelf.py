"""
AnimationReference.org - Maya Shelf Button Installer
Adds an 'AnimRef' button to the active Maya shelf.
"""

try:
    import maya.cmds as cmds
    import maya.mel as mel
    MAYA_AVAILABLE = True
except ImportError:
    MAYA_AVAILABLE = False

SHELF_BUTTON_LABEL = "AnimRef"

def create_shelf_button():
    if not MAYA_AVAILABLE:
        print("[AnimRef] Shelf creation only supported inside Autodesk Maya.")
        return

    top_shelf = mel.eval("$gShelfTopLevel = $gShelfTopLevel")
    current_shelf = cmds.tabLayout(top_shelf, query=True, selectTab=True)
    if not current_shelf:
        current_shelf = "Custom"

    # Remove previous button if it exists
    existing_buttons = cmds.shelfLayout(current_shelf, query=True, childArray=True) or []
    for btn in existing_buttons:
        if cmds.objectTypeUI(btn, isType="shelfButton"):
            if cmds.shelfButton(btn, query=True, label=True) == SHELF_BUTTON_LABEL:
                cmds.deleteUI(btn)

    command_str = (
        "import animref_ui\n"
        "animref_ui.show_window()"
    )

    cmds.shelfButton(
        parent=current_shelf,
        label=SHELF_BUTTON_LABEL,
        annotation="Launch AnimationReference.org Studio Bridge",
        imageOverlayLabel="REF",
        image="camera.png",
        command=command_str,
        sourceType="python"
    )
    print(f"[AnimRef] Created shelf button '{SHELF_BUTTON_LABEL}' on shelf '{current_shelf}'!")
